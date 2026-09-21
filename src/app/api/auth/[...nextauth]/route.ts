/**
 * MadrashaOS — NextAuth.js Route Handler
 *
 * Task B2.1 — NextAuth.js Setup
 *
 * Mounts NextAuth at `/api/auth/*` — this is the canonical Next.js App
 * Router pattern for NextAuth v4 (see NextAuth v4 migration guide).
 *
 * Exposed endpoints (provided by NextAuth v4):
 *   POST /api/auth/signin          (initiate sign-in flow)
 *   POST /api/auth/callback/credentials
 *   POST /api/auth/signout
 *   GET  /api/auth/session
 *   GET  /api/auth/csrf
 *   GET  /api/auth/providers
 *
 * The handler runs in the Node.js runtime (not the edge runtime) because
 * the CredentialsProvider calls Prisma, which requires libquery_engine —
 * a native .node binary not compatible with the edge runtime.
 *
 * Per `src/middleware.ts`: `/api/auth/*` is EXCLUDED from the session
 * check so the sign-in endpoint itself is reachable without prior auth.
 */

import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

// Force Node.js runtime (Prisma requires the native libquery_engine).
export const runtime = "nodejs";
// Always dynamic — auth state cannot be statically cached.
export const dynamic = "force-dynamic";

const handler = NextAuth(authConfig);

export { handler as GET, handler as POST };
