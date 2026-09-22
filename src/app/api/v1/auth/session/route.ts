/**
 * MadrashaOS — Session Info Endpoint
 *
 * Task B2.1 — NextAuth.js Setup
 *
 * GET /api/v1/auth/session
 *
 * Returns the current authenticated session's user + permissions.
 *
 * Response 200 (authenticated):
 *   {
 *     "user": {
 *       "id": "uuid",
 *       "name": "Abdul Karim",
 *       "email": "abdul@madrasha.edu",
 *       "role": "administrator",
 *       "organization_id": "uuid",
 *       "branch_id": "uuid"
 *     },
 *     "permissions": ["students.view", "fees.create", ...],
 *     "mfa_pending": false
 *   }
 *
 * Response 401 (unauthenticated):
 *   { "error": "Unauthorized" }
 *
 * Response 403 (MFA pending):
 *   {
 *     "error": "MFA_REQUIRED",
 *     "message": "Multi-factor authentication is required to complete sign-in."
 *   }
 *
 * This route is intentionally NOT wrapped by `withPermission` — it's the
 * endpoint the SPA hits to determine IF the user is authenticated in the
 * first place. The middleware already enforces a valid session cookie;
 * we re-check `getServerSession()` here to also handle the MFA-pending
 * case (which the middleware ALLOWS through to this route — see the
 * `mfaSafePaths` list in middleware.ts).
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authConfig } from "@/lib/auth/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authConfig);

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized", message: "No authenticated session." },
      { status: 401 },
    );
  }

  // MFA-pending session: the cookie is valid but the user hasn't
  // completed the TOTP step yet. Return 403 so the client can render
  // the MFA verify UI.
  if (session.user.mfa_pending) {
    return NextResponse.json(
      {
        error: "MFA_REQUIRED",
        message:
          "Multi-factor authentication is required to complete sign-in.",
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
        },
      },
      { status: 403 },
    );
  }

  return NextResponse.json({
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      organization_id: session.user.organization_id,
      branch_id: session.user.branch_id,
    },
    permissions: session.user.permissions,
    mfa_pending: false,
    expires: session.expires,
  });
}
