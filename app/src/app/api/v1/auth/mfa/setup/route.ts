/**
 * MadrashaOS — MFA Setup Endpoint
 *
 * Task B2.3 — MFA (TOTP)
 *
 * POST /api/v1/auth/mfa/setup
 *
 * Requires an authenticated session (the user is logged in via password
 * but has NOT yet enabled MFA, OR has it disabled and wants to re-enable).
 *
 * Generates a fresh TOTP secret, caches it server-side keyed by user id
 * (5-min TTL — see `setPendingSecret`), and returns the secret + QR URL
 * so the client can render a scannable QR for Google Authenticator.
 *
 * The secret is NOT persisted to the user row yet — that happens on
 * /verify. If the user calls /setup twice within 5 min, they get the
 * same cached secret (so they don't have to re-scan if they reload).
 *
 * Response 200:
 *   {
 *     "secret": "JBSWY3DPEHPK3PXP",
 *     "qrCodeUrl": "otpauth://totp/MadrashaOS:abdul@...?secret=...",
 *     "qrDataUrl": "data:image/png;base64,..."
 *   }
 *
 * Response 401: no session
 * Response 409: MFA already enabled (must call /disable first)
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authConfig } from "@/lib/auth/config";
import {
  generateMfaSecret,
  peekPendingSecret,
  setPendingSecret,
} from "@/lib/auth/mfa";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Authentication required." },
      { status: 401 },
    );
  }

  // If MFA is already enabled, refuse — user must call /disable first.
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { mfa_enabled: true, email: true },
  });
  if (user?.mfa_enabled) {
    return NextResponse.json(
      {
        error: "Conflict",
        message:
          "MFA is already enabled. Disable it first to set up a new secret.",
      },
      { status: 409 },
    );
  }

  // Reuse pending secret if the user hit /setup twice within 5 min.
  const existing = peekPendingSecret(session.user.id);
  if (existing) {
    return NextResponse.json({
      secret: existing.secret,
      qrCodeUrl: `otpauth://totp/MadrashaOS:${existing.email}?secret=${existing.secret}&issuer=MadrashaOS`,
      qrDataUrl: "", // omitted on the cached path — client should re-render from secret
      cached: true,
    });
  }

  // Generate a fresh secret + QR.
  const email = user?.email ?? session.user.email ?? session.user.id;
  const { secret, qrCodeUrl, qrDataUrl } = await generateMfaSecret(
    session.user.id,
    email,
  );
  setPendingSecret(session.user.id, secret, email);

  return NextResponse.json({
    secret,
    qrCodeUrl,
    qrDataUrl,
    cached: false,
  });
}
