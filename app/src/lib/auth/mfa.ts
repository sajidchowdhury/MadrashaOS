/**
 * MadrashaOS — MFA (TOTP) Utilities
 *
 * Task B2.3 — MFA (TOTP)
 *
 * Wraps `otplib` (RFC 6238 TOTP) and `qrcode` (PNG/URL QR generation)
 * with a typed API used by the `/api/v1/auth/mfa/{setup,verify,disable}`
 * endpoints.
 *
 * Flow (SRS §6.2.3 — MFA):
 *
 *   1. User calls POST /api/v1/auth/mfa/setup
 *      → Server generates a fresh `mfa_secret`, returns `{ secret, qrCodeUrl }`
 *      → The secret is NOT yet persisted (user must scan + verify first)
 *      → Client renders the QR + the manual-entry secret
 *
 *   2. User scans the QR with Google Authenticator (or any TOTP app)
 *      → App displays a 6-digit code that rotates every 30s
 *
 *   3. User calls POST /api/v1/auth/mfa/verify with `{ token }`
 *      → Server verifies the TOTP against the secret from step 1
 *      → If valid: persists `mfa_secret` + sets `mfa_enabled = true`
 *      → The session JWT is upgraded: `mfa_pending = false` + permissions restored
 *
 *   4. To disable: POST /api/v1/auth/mfa/disable with `{ token }`
 *      → Server verifies the current TOTP (defends against session hijack
 *        by an attacker who lacks the authenticator)
 *      → If valid: clears `mfa_secret`, sets `mfa_enabled = false`
 *
 * Security:
 *   - The secret is 32 bytes base32 — strong entropy
 *   - TOTP window = 1 (allows 1 step drift = 30s clock skew)
 *   - The QR URL is `otpauth://totp/...?secret=...` — scannable by any RFC 6238 app
 *   - Secrets are stored in the `users.mfa_secret` column (nullable varchar)
 *
 * Note: otplib is a Node.js library — these helpers are server-only.
 */

import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";

/** Issuer string shown in the authenticator app (e.g. "MadrashaOS (abdul@…)"). */
const ISSUER = "MadrashaOS";

/**
 * Generates a new TOTP secret + the corresponding `otpauth://` URL
 * for QR-code generation.
 *
 * @param userId  The user's UUID (used as the JWT subject + cache key)
 * @param email   The user's email — shown in the authenticator app label
 *
 * Returns:
 *   {
 *     secret:     "JBSWY3DPEHPK3PXP",     // 32-char base32 secret
 *     qrCodeUrl:  "otpauth://totp/..."    // otpauth URL for QR generation
 *     qrDataUrl:  "data:image/png;base64,..."  // base64 PNG image data URL
 *   }
 *
 * The `qrDataUrl` is suitable for an <img src="…"> tag in the client.
 */
export async function generateMfaSecret(
  userId: string,
  email: string,
): Promise<{
  secret: string;
  qrCodeUrl: string;
  qrDataUrl: string;
}> {
  // Generate a fresh 32-byte base32 secret on each call.
  const secret = generateSecret();

  // Build the otpauth:// URL — this is what the QR encoder needs.
  // Format: otpauth://totp/<issuer>:<label>?secret=<secret>&issuer=<issuer>&algorithm=SHA1&digits=6&period=30
  const otpauthUrl = await generateURI({
    secret,
    accountName: email,
    issuer: ISSUER,
  });

  // Encode as a base64 PNG so the client can drop it straight into <img>.
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
    margin: 2,
    width: 240,
    color: {
      dark: "#041818", // neutral-900 — primary-900
      light: "#FFFFFF",
    },
  });

  // userId is included for future server-side pending-secret cache keying
  // (we don't persist until verify — see the mfa/setup route).
  void userId;

  return {
    secret,
    qrCodeUrl: otpauthUrl,
    qrDataUrl,
  };
}

/**
 * Verifies a 6-digit TOTP against a stored secret.
 *
 * Returns true if the token matches (within the ±1-step window = ±30s).
 * Returns false on any error (so callers don't need a try/catch).
 *
 * @param secret  Base32-encoded secret stored on the user row
 * @param token   6-digit code from the user's authenticator app
 */
export async function verifyMfaToken(secret: string, token: string): Promise<boolean> {
  if (!secret || !token) return false;
  try {
    const result = await verify({ token, secret });
    return result.valid;
  } catch {
    return false;
  }
}

/**
 * Builds the `otpauth://` URL for a previously-generated secret.
 *
 * Useful when the client wants to render a fresh QR (e.g. for re-scan
 * after the user misplaced the original).
 */
export async function generateQrCodeUrl(secret: string, email: string): Promise<string> {
  return generateURI({ secret, accountName: email, issuer: ISSUER });
}

/**
 * Pending-MFA secret cache.
 *
 * When the user calls /api/v1/auth/mfa/setup, we generate a fresh secret
 * but DON'T persist it to the user row yet — the user must first scan the
 * QR + verify a TOTP. The secret lives in this transient cache keyed by
 * the user id, with a 5-minute TTL.
 *
 * On /api/v1/auth/mfa/verify we read the secret from this cache, verify
 * the TOTP, and only then persist it to `users.mfa_secret`.
 *
 * In production, swap to Redis (single-flight across multiple instances).
 */
interface PendingSecret {
  secret: string;
  email: string;
  expiresAt: number;
}

const PENDING_TTL_MS = 5 * 60 * 1000;
const pendingSecrets = new Map<string, PendingSecret>();

/** Stores a pending MFA secret for the given user id (5-min TTL). */
export function setPendingSecret(userId: string, secret: string, email: string): void {
  pendingSecrets.set(userId, {
    secret,
    email,
    expiresAt: Date.now() + PENDING_TTL_MS,
  });
}

/**
 * Retrieves + consumes the pending MFA secret for the given user id.
 * Returns null if no pending secret exists or the TTL has expired.
 *
 * "Consumes" = removes from the cache — a verify attempt can only succeed
 * once per setup call (defense against replays).
 */
export function consumePendingSecret(userId: string): PendingSecret | null {
  const entry = pendingSecrets.get(userId);
  if (!entry) return null;
  pendingSecrets.delete(userId);
  if (entry.expiresAt < Date.now()) return null;
  return entry;
}

/**
 * Peeks at the pending MFA secret (does NOT consume it).
 * Used by the setup endpoint to return the cached QR if the user hits
 * /setup twice within the TTL window.
 */
export function peekPendingSecret(userId: string): PendingSecret | null {
  const entry = pendingSecrets.get(userId);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    pendingSecrets.delete(userId);
    return null;
  }
  return entry;
}

/**
 * Generates a backup-recovery code (8 hex chars).
 *
 * Per SRS §6.2.3 R-S5 — if a user loses access to their authenticator,
 * they should be able to use a recovery code (stored hashed on the user
 * row). For the MVP we generate one on enable and return it once.
 *
 * Future work: store 10 single-use codes (hashed), invalidate on use.
 */
export function generateBackupCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}
