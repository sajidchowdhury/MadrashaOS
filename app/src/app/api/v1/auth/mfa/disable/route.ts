/**
 * MadrashaOS — MFA Disable Endpoint
 *
 * Task B2.3 — MFA (TOTP)
 *
 * POST /api/v1/auth/mfa/disable
 *
 * Body:
 *   { "token": "123456" }
 *
 * Disables MFA on the current user's account. Requires the user to
 * provide a current valid TOTP — this defends against an attacker who
 * has hijacked the session cookie but lacks the authenticator device.
 *
 * Response 200:
 *   { "success": true, "enabled": false }
 *
 * Response 400: missing/invalid token
 * Response 401: no session
 * Response 409: MFA is not enabled (nothing to disable)
 *
 * After disabling, the user's session JWT is unaffected (mfa_pending
 * is already false). The next time they sign in, they'll skip the MFA
 * step entirely.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authConfig } from "@/lib/auth/config";
import { verifyMfaToken } from "@/lib/auth/mfa";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DisableBody {
  token?: string;
}

export async function POST(req: Request) {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Authentication required." },
      { status: 401 },
    );
  }

  let body: DisableBody;
  try {
    body = (await req.json()) as DisableBody;
  } catch {
    return NextResponse.json(
      { error: "Bad Request", message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const token = (body.token ?? "").trim();
  if (!/^\d{6}$/.test(token)) {
    return NextResponse.json(
      {
        error: "Bad Request",
        message: "Token must be a 6-digit number.",
      },
      { status: 400 },
    );
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { mfa_enabled: true, mfa_secret: true },
  });

  if (!user?.mfa_enabled || !user.mfa_secret) {
    return NextResponse.json(
      {
        error: "Conflict",
        message: "MFA is not enabled on your account.",
      },
      { status: 409 },
    );
  }

  if (!verifyMfaToken(user.mfa_secret, token)) {
    return NextResponse.json(
      { error: "Invalid token", message: "The 6-digit code did not match." },
      { status: 400 },
    );
  }

  // Clear the secret + disable the flag.
  await db.user.update({
    where: { id: session.user.id },
    data: {
      mfa_secret: null,
      mfa_enabled: false,
    },
  });

  return NextResponse.json({
    success: true,
    enabled: false,
    message: "MFA has been disabled for your account.",
  });
}
