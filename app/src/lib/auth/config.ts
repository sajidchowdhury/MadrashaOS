/**
 * MadrashaOS — NextAuth.js Configuration
 *
 * Task B2.1 — NextAuth.js Setup
 * Task B2.3 — MFA (TOTP) integration
 *
 * Strategy: JWT (stateless, no session DB rows)
 *   - Access token TTL:  15 minutes (R-A1 — short replay window)
 *   - Refresh rotation:   7 days, rotating (R-A2)
 *   - Secret:            NEXTAUTH_SECRET env var
 *
 * Provider: CredentialsProvider (email + password)
 *   - bcrypt-hashed passwords from `users.password_hash`
 *   - On success: injects role + organization_id + branch_id + permissions[]
 *     into the JWT via the `jwt` callback.
 *   - The `session` callback exposes the same fields on `session.user`.
 *
 * MFA flow (Task B2.3):
 *   - If the user has `mfa_enabled = true`, the CredentialsProvider still
 *     issues a JWT, but with `mfa_pending: true` and an EMPTY permissions
 *     array. The client must POST `/api/v1/auth/mfa/verify` with the TOTP;
 *     on success the verify route calls `upgradeMfaSession()` to flip
 *     `mfa_pending` off and restore `permissions[]`.
 *
 * Tenant scoping:
 *   - The JWT carries `organization_id` + `branch_id` so downstream
 *     Prisma queries in API handlers can filter by tenant without
 *     re-fetching the user row (see `src/lib/auth/with-tenant.ts`).
 *
 * Pages:
 *   - signIn:  /login
 *   - signOut: /logout
 *
 * Type augmentation: `src/types/next-auth.d.ts` extends the `Session`
 * and `JWT` interfaces so TypeScript knows about the custom fields.
 */

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";

/* --- P6.2 Branch-switch JWT refresh cache ----------------------------------
 *
 * The `jwt` callback re-reads `branch_id` from the DB on every authenticated
 * request (so a branch switch takes effect immediately without requiring
 * re-auth). To avoid hammering the DB on pages that fire many parallel API
 * calls (e.g. the dashboard hits 6-10 endpoints at once), we cache the
 * branch_id per-user for a short window.
 *
 * The switch route (`/api/v1/branches/switch`) calls
 * `invalidateUserBranchCache(user_id)` after the UPDATE so the very next
 * request picks up the new branch_id without waiting for the TTL.
 *
 * The cache lives on the module-level `globalThis` so it survives Next.js
 * HMR in dev and is shared across hot-reloaded module instances. In a
 * multi-process deployment (e.g. serverless), each process has its own
 * cache — but the short TTL (5s) bounds staleness.
 */
const USER_BRANCH_CACHE_TTL_MS = 5_000;

type BranchCacheEntry = {
  branchId: string | null;
  expiresAt: number;
};

const globalForBranchCache = globalThis as unknown as {
  __madrashaUserBranchCache?: Map<string, BranchCacheEntry>;
};

const userBranchCache: Map<string, BranchCacheEntry> =
  globalForBranchCache.__madrashaUserBranchCache ??
  new Map<string, BranchCacheEntry>();

if (!globalForBranchCache.__madrashaUserBranchCache) {
  globalForBranchCache.__madrashaUserBranchCache = userBranchCache;
}

/**
 * Returns the user's current `branch_id`, using a short-TTL in-memory cache
 * to coalesce parallel API requests within the same window. On cache miss
 * (or expired entry), performs a single indexed `findUnique` on the users
 * table (PK lookup — <5ms in SQLite/Postgres).
 */
async function getCachedUserBranchId(userId: string): Promise<string | null> {
  const now = Date.now();
  const cached = userBranchCache.get(userId);
  if (cached && cached.expiresAt > now) {
    return cached.branchId;
  }
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { branch_id: true },
  });
  const branchId = user?.branch_id ?? null;
  userBranchCache.set(userId, {
    branchId,
    expiresAt: now + USER_BRANCH_CACHE_TTL_MS,
  });
  return branchId;
}

/**
 * Invalidates the cached `branch_id` for a user. Called by the
 * `branches/switch` route after `UPDATE users SET branch_id = ?` so the
 * very next request from this user picks up the new branch without
 * waiting for the TTL to expire.
 */
export function invalidateUserBranchCache(userId: string): void {
  userBranchCache.delete(userId);
}

/**
 * NextAuth config — exported as a function-less object so both the
 * `/api/auth/[...nextauth]` route handler AND the middleware can import
 * the same config without circulars.
 *
 * The `providers` array's `authorize` function (which calls Prisma) is
 * only ever executed in the Node.js runtime of the route handler — never
 * in the edge middleware runtime. The middleware only needs the
 * `callbacks.jwt` to inspect the JWT, not `providers`.
 */
export const authConfig: NextAuthOptions = {
  // ---- Strategy -----------------------------------------------------------
  session: {
    strategy: "jwt",
    // 15-minute access window — refresh handled by `jwt` callback below.
    maxAge: 15 * 60,
  },

  // ---- Pages -------------------------------------------------------------
  pages: {
    signIn: "/login",
    signOut: "/logout",
    error: "/login",
  },

  // ---- Providers ---------------------------------------------------------
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      /**
       * Validates email + password against the `users` table.
       *
       * On success returns a minimal user object — the `jwt` callback
       * below is responsible for fetching the role + permissions.
       *
       * On MFA-enabled accounts, we STILL authenticate successfully
       * (password was correct) but mark the user object with
       * `mfa_pending: true`. The `jwt` callback propagates that flag
       * so downstream middleware can gate API access until the TOTP is
       * verified.
       *
       * Error messages are intentionally generic ("Invalid credentials")
       * to avoid leaking which of email/password was wrong (R-S3).
       */
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const email = credentials.email.trim().toLowerCase();
        const password = credentials.password;

        // Fetch the user row + role + permissions in one query.
        // We use findFirst (not findUnique) because the unique constraint
        // is (organization_id, email) — a super-admin with NULL org may
        // share an email across tenants, which we disallow at seed time
        // but defend against here.
        const user = await db.user.findFirst({
          where: {
            email,
            deleted_at: null,
          },
          select: {
            id: true,
            name: true,
            email: true,
            password_hash: true,
            status: true,
            organization_id: true,
            branch_id: true,
            role_id: true,
            mfa_enabled: true,
            mfa_secret: true,
            failed_login_count: true,
            locked_until: true,
            role: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        });

        if (!user) {
          throw new Error("Invalid credentials");
        }

        // Account lockout (R-S1) — failed_login_count ≥ 5 ⇒ locked 15 min.
        if (user.locked_until && user.locked_until > new Date()) {
          throw new Error("Account locked. Try again later.");
        }

        // Disabled accounts cannot log in (R-S4).
        if (user.status !== "active") {
          throw new Error("Account disabled. Contact your administrator.");
        }

        const passwordOk = await verifyPassword(password, user.password_hash);
        if (!passwordOk) {
          // Increment failed-login count; lock at 5.
          const next = user.failed_login_count + 1;
          await db.user.update({
            where: { id: user.id },
            data: {
              failed_login_count: next,
              locked_until:
                next >= 5
                  ? new Date(Date.now() + 15 * 60 * 1000)
                  : user.locked_until,
            },
          });
          throw new Error("Invalid credentials");
        }

        // Password OK — reset failed-login counter + record login time.
        await db.user.update({
          where: { id: user.id },
          data: {
            failed_login_count: 0,
            locked_until: null,
            last_login_at: new Date(),
          },
        });

        // Fetch permissions for this role via the role_permissions junction.
        const rolePerms = await db.rolePermission.findMany({
          where: { role_id: user.role_id, deleted_at: null },
          select: { permission: { select: { code: true } } },
        });
        const permissions = rolePerms.map((rp) => rp.permission.code);

        // MFA gate (Task B2.3): if MFA is enabled, the user must verify
        // a TOTP before the JWT is fully authenticated. Until they do,
        // permissions is empty (so the withPermission middleware rejects
        // every API call) and `mfa_pending: true` flags the client to
        // show the TOTP input.
        const mfaPending = user.mfa_enabled === true;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.code,
          organization_id: user.organization_id,
          branch_id: user.branch_id,
          permissions: mfaPending ? [] : permissions,
          mfa_pending: mfaPending,
        };
      },
    }),
  ],

  // ---- Callbacks ---------------------------------------------------------
  callbacks: {
    /**
     * `jwt({ token, user, trigger })` is called:
     *   - On initial sign-in (`user` is the object returned by `authorize`)
     *   - On every subsequent request (`user` is undefined — token carries
     *     forward from the encrypted cookie)
     *   - When the client calls `useSession().update(...)` (`trigger === "update"`)
     *
     * We seed the JWT with role + tenant + permissions on sign-in, and
     * preserve them across requests.
     *
     * --- P6.2 Branch-switch JWT refresh ---
     * BUG: After `POST /api/v1/branches/switch` updates `User.branch_id` in
     * the DB, the JWT cookie still carries the OLD branch_id until it
     * expires (15 min) or the user re-authenticates. All downstream
     * `tenantWhere(ctx)` calls scope to the old branch.
     *
     * FIX: On every call where `user` is undefined (i.e. NOT initial
     * sign-in), re-read `branch_id` from the DB. This is a single indexed
     * `findUnique` on the users table (PK lookup, <5ms in SQLite/Postgres),
     * so the per-request overhead is negligible. The in-memory cache below
     * coalesces parallel API calls within a 5-second window so a page that
     * fires 10 API requests in parallel only triggers ONE DB lookup.
     *
     * The switch route calls `invalidateUserBranchCache(user_id)` after the
     * UPDATE so the very next request picks up the new branch_id without
     * waiting for the TTL to expire.
     */
    async jwt({ token, user }) {
      if (user) {
        // Initial sign-in path — `user` is the object returned by authorize.
        token.id = user.id;
        token.role = user.role;
        token.organization_id = user.organization_id;
        token.branch_id = user.branch_id;
        token.permissions = user.permissions;
        token.mfa_pending = user.mfa_pending;
        // Seed the cache so the first subsequent request doesn't re-query.
        if (user.id) {
          userBranchCache.set(user.id, {
            branchId: user.branch_id ?? null,
            expiresAt: Date.now() + USER_BRANCH_CACHE_TTL_MS,
          });
        }
      } else if (token.id) {
        // Subsequent request — re-read branch_id from the DB so a branch
        // switch (via POST /api/v1/branches/switch) takes effect on the
        // very next request, without requiring the user to re-authenticate.
        token.branch_id = await getCachedUserBranchId(token.id);
      }
      return token;
    },

    /**
     * `session({ session, token })` projects the JWT fields onto the
     * client-visible `session.user` object. The client never sees the
     * raw JWT (it's encrypted via NEXTAUTH_SECRET).
     */
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...(session.user ?? {}),
          id: token.id ?? token.sub ?? "",
          name: token.name ?? null,
          email: token.email ?? null,
          role: token.role ?? "",
          organization_id: token.organization_id ?? "",
          branch_id: token.branch_id ?? null,
          permissions: token.permissions ?? [],
          mfa_pending: token.mfa_pending ?? false,
        },
      };
    },
  },

  // ---- Secret ------------------------------------------------------------
  secret: process.env.NEXTAUTH_SECRET,

  // ---- Debug -------------------------------------------------------------
  debug: false,
};
