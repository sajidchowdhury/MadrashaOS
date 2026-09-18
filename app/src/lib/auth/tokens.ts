/**
 * MadrashaOS — JWT Token Management
 *
 * Task B2.1 — NextAuth.js Setup
 *
 * Standalone JWT helpers layered on top of the `jose` library (a transitive
 * dependency of NextAuth — see node_modules/jose). The NextAuth JWT itself
 * is opaque to the client (signed + encrypted by NextAuth), but we ALSO
 * issue explicit access + refresh tokens that the SPA + mini-services can
 * pass via the `Authorization: Bearer <token>` header.
 *
 * Token lifecycle (SRS §6.2.2):
 *   Access Token   — 15 min TTL  (R-A1 — short window limits replay damage)
 *   Refresh Token  — 7 day TTL, rotating (R-A2 — refresh-token rotation)
 *
 * The refresh token is itself a signed JWT carrying `kind: "refresh"` and a
 * `family_id` that lets us detect token theft in production (when a rotated
 * token is replayed, the family is invalidated). For now rotation is
 * stateless (no revocation list — see SRS §6.2.6 future work).
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";

/**
 * The shape of the JWT payload emitted by this module.
 * Distinct from the NextAuth Session/JWT shapes (which are richer).
 */
export interface JwtPayload extends JWTPayload {
  /** Token kind — gates which endpoints accept it. */
  kind: "access" | "refresh";
  /** Subject (user id). */
  sub: string;
  /** Refresh-token family id — used to detect theft / replay. */
  family_id?: string;
  /** Issued-at (seconds). */
  iat?: number;
  /** Expiry (seconds). */
  exp?: number;
}

/** Access-token TTL: 15 minutes (SRS §6.2.2 R-A1). */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

/** Refresh-token TTL: 7 days (SRS §6.2.2 R-A2). */
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

/** Issuer — constant across the platform. */
const ISSUER = "madrashaos";

/** Audience — distinguishes platform tokens from third-party tokens. */
const AUDIENCE = "madrashaos:api";

/** UTF-8 encoded secret used by `jose` for HMAC-SHA256 signing. */
function getSecret(): Uint8Array {
  const secret =
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET ||
    "madrashaos-dev-secret-change-in-production-32chars+";
  return new TextEncoder().encode(secret);
}

/**
 * Issues a 15-minute access token for the given user.
 *
 * The token is HMAC-SHA256 signed (not asymmetric — single-tenant HMAC is
 * simpler + faster; asymmetric RS256 is reserved for future cross-service
 * signing, per SRS §6.2.6).
 */
export async function generateAccessToken(userId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ kind: "access" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + ACCESS_TOKEN_TTL_SECONDS)
    .sign(getSecret());
}

/**
 * Issues a 7-day rotating refresh token bound to a `family_id`.
 *
 * Each call to `rotateRefreshToken` issues a new refresh token in the SAME
 * family (so the family chain can be audited). If a refresh token is ever
 * replayed after rotation, the family should be invalidated (future work).
 */
export async function generateRefreshToken(
  userId: string,
  familyId?: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const family = familyId || crypto.randomUUID();
  return new SignJWT({ kind: "refresh", family_id: family })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + REFRESH_TOKEN_TTL_SECONDS)
    .sign(getSecret());
}

/**
 * Verifies a JWT signature + expiration. Returns the typed payload or null
 * on any failure (expired, bad signature, malformed, wrong kind, …).
 *
 * NEVER throws — callers can use the truthy return as the only success
 * signal without a try/catch dance.
 */
export async function verifyToken(
  token: string,
): Promise<JwtPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return payload as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Rotates a refresh token: verifies the old one, then issues a fresh
 * access + refresh pair in the same family. The old refresh token should
 * be discarded by the client (stateless rotation).
 *
 * Returns null if the old token is invalid/expired — the client should
 * then prompt for re-login (HTTP 401 → /login redirect).
 */
export async function rotateRefreshToken(
  oldToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const payload = await verifyToken(oldToken);
  if (!payload || payload.kind !== "refresh" || !payload.sub) {
    return null;
  }
  const userId = payload.sub;
  const familyId = payload.family_id;
  const accessToken = await generateAccessToken(userId);
  const refreshToken = await generateRefreshToken(userId, familyId);
  return { accessToken, refreshToken };
}
