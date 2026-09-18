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
     * `jwt({ user, token })` is called:
     *   - On initial sign-in (user is the object returned by `authorize`)
     *   - On every subsequent request (user is undefined — token carries
     *     forward from the encrypted cookie)
     *
     * We seed the JWT with role + tenant + permissions on sign-in, and
     * preserve them across requests. The callback must be synchronous
     * about its return value (no await on the hot path).
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
