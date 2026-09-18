/**
 * MadrashaOS — NextAuth Type Augmentation
 *
 * Task B2.1 — NextAuth.js Setup
 *
 * Augments the default `next-auth` `Session` and `JWT` types so the
 * custom fields we inject in `src/lib/auth/config.ts` callbacks
 * (role, organization_id, branch_id, permissions[], mfa_pending)
 * are visible to all consumers of `useSession()` / `getSession()`.
 *
 * Per NextAuth v4 docs:
 *   https://next-auth.js.org/getting-started/typescript
 */

import "next-auth";
import type { DefaultSession } from "next-auth";

/**
 * The shape of `session.user` exposed to the client.
 * Augmented with role + tenant + permissions + MFA state.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string | null;
      email: string | null;
      role: string;
      organization_id: string;
      branch_id: string | null;
      permissions: string[];
      mfa_pending: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    organization_id: string;
    branch_id: string | null;
    permissions: string[];
    mfa_pending: boolean;
  }
}

/**
 * The shape of the JWT stored in the encrypted cookie.
 * Mirrors the `User` fields so the `jwt` callback can copy them
 * on initial sign-in and read them on subsequent requests.
 */
declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    sub?: string;
    name?: string | null;
    email?: string | null;
    role?: string;
    organization_id?: string;
    branch_id?: string | null;
    permissions?: string[];
    mfa_pending?: boolean;
  }
}
