/**
 * MadrashaOS — MFA Verify Endpoint
 *
 * Task B2.3 — MFA (TOTP)
 *
 * POST /api/v1/auth/mfa/verify
 *
 * Body:
 *   { "token": "123456" }
 *
 * Two flows share this endpoint:
 *
 *   Flow A — Enable MFA (user just called /setup):
 *     1. Reads the pending secret from the in-memory cache (set by /setup).
 *     2. Verifies the TOTP against the pending secret.
 *     3. If valid: persists `mfa_secret` + `mfa_enabled = true` to the user row.
 *     4. Returns `{ success: true, enabled: true }`.
 *
 *   Flow B — Complete MFA-gated login (user has mfa_enabled=true but
 *            session.mfa_pending=true):
 *     1. Reads `mfa_secret` from the user row (the cache is empty for
 *        a fresh login).
 *     2. Verifies the TOTP.
 *     3. If valid: the session JWT is "upgraded" by re-issuing it with
 *        `mfa_pending = false` + `permissions` restored. NextAuth v4
 *        doesn't expose a public "rewrite session" API; we accomplish
 *        this by signing the user out and back in via a server-side
 *        signIn() call, OR by returning a 200 + letting the client
 *        trigger a re-signIn via the NextAuth client.
 *
 * The simplest reliable upgrade in NextAuth v4 is to have the client
 * re-call signIn() after a successful MFA verify. To make that seamless,
 * this endpoint returns:
 *
 *   { "success": true, "mfa_pending": false }
 *
 * And the client (login page) on receiving this response automatically
 * calls signIn("credentials", { email, password }) using cached creds
 * (since the password was just verified <5 min ago, the CredentialsProvider
 * will issue a clean JWT with permissions[] populated and mfa_pending=false).
 *
 * For Flow A, the response is:
 *   { "success": true, "enabled": true }
 *
 * Response 401: no session
 * Response 400: missing/invalid token
 * Response 409: no pending secret AND MFA already enabled + verified (no-op)
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authConfig } from "@/lib/auth/config";
import {
  consumePendingSecret,
  verifyMfaToken,
} from "@/lib/auth/mfa";
import { db } from "@/lib/db";
import { ROLE_PERMISSIONS } from "@/lib/auth/role-permissions";
import type { Role } from "@/stores/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface VerifyBody {
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

  // Parse the request body.
  let body: VerifyBody;
  try {
    body = (await req.json()) as VerifyBody;
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

  // ---- Flow A: enable MFA (pending secret in cache) ------------------
  const pending = consumePendingSecret(session.user.id);
  if (pending) {
    if (!verifyMfaToken(pending.secret, token)) {
      return NextResponse.json(
        { error: "Invalid token", message: "The 6-digit code did not match." },
        { status: 400 },
      );
    }
    // Persist the secret + enable MFA.
    await db.user.update({
      where: { id: session.user.id },
      data: {
        mfa_secret: pending.secret,
        mfa_enabled: true,
      },
    });
    return NextResponse.json({
      success: true,
      enabled: true,
      message: "MFA has been enabled for your account.",
    });
  }

  // ---- Flow B: complete MFA-gated login -------------------------------
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      mfa_enabled: true,
      mfa_secret: true,
      role: { select: { code: true } },
      organization_id: true,
      branch_id: true,
    },
  });
  if (!user?.mfa_enabled || !user.mfa_secret) {
    return NextResponse.json(
      {
        error: "Conflict",
        message: "No pending MFA setup. Call /setup first.",
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

  // MFA verified — the JWT must now be upgraded to "fully authenticated".
  // NextAuth v4 doesn't expose a server-side JWT rewrite API; the client
  // must re-issue signIn(). We hand back enough info for the client to
  // do this cleanly. To preserve the user's role→permissions mapping we
  // look it up here (the JWT had permissions=[] during mfa_pending).
  const roleCode = user.role.code as Role;
  const permissions =
    ROLE_PERMISSIONS[roleCode] ??
    (await db.rolePermission
      .findMany({
        where: { role_id: { equals: session.user.id } },
        select: { permission: { select: { code: true } } },
      })
      .then((rows) => rows.map((r) => r.permission.code)));

  void user.organization_id;
  void user.branch_id;

  return NextResponse.json({
    success: true,
    mfa_pending: false,
    role: roleCode,
    permissions,
    message:
      "MFA verified. Re-authenticate via signIn() to complete your session.",
  });
}
