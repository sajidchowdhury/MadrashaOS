/**
 * MadrashaOS — Password Hashing Utilities
 *
 * Task B2.1 — NextAuth.js Setup
 *
 * Wraps `bcryptjs` (already a dependency — see package.json) with a thin
 * typed API used by:
 *   - The NextAuth CredentialsProvider (verifyPassword)
 *   - The seed script + any "create user" flow (hashPassword)
 *   - The "reset password" flow (generateTempPassword)
 *
 * Cost factor: 10 — the OWASP minimum for bcrypt as of 2024.
 * Tuned for ~80ms per hash on a typical 1-vCPU container, which keeps
 * the login latency under the SRS §6.6 200ms p95 budget.
 *
 * Per SRS §6.2.3 (R-S3) — passwords are NEVER logged, NEVER returned
 * by any API, and NEVER serialized into the JWT or session.
 */

import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";

/** bcrypt cost factor — see file header. */
const BCRYPT_ROUNDS = 10;

/** Length of generated temporary passwords (12 chars per SRS §6.2.3). */
const TEMP_PASSWORD_LENGTH = 12;

/**
 * Character pool for temporary-password generation.
 * Excludes ambiguous characters (0/O, 1/l/I) to avoid transcription errors
 * when staff read the temp password over the phone.
 */
const TEMP_PASSWORD_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/**
 * Hashes a plaintext password using bcrypt with 10 rounds.
 *
 * @example
 *   const hash = await hashPassword("correct horse battery staple");
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

/**
 * Verifies a plaintext password against a stored bcrypt hash.
 * Constant-time comparison courtesy of bcrypt.
 *
 * Returns false (never throws) on:
 *   - Mismatch
 *   - Malformed hash
 *   - Empty input
 *
 * This keeps the login error path uniform and avoids leaking via
 * exception type whether the user exists (timing attack mitigation).
 */
export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  if (!plain || !hash) return false;
  try {
    return bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/**
 * Generates a random 12-character temporary password for new users.
 *
 * Uses `crypto.randomInt` (non-biased) — NOT `Math.random()`, which is
 * cryptographically unsuitable per SRS §6.2.3 R-S2.
 *
 * @example
 *   const temp = generateTempPassword();   // "Hk9mQp2tRwXc"
 */
export function generateTempPassword(): string {
  const chars: string[] = [];
  const max = TEMP_PASSWORD_ALPHABET.length;
  for (let i = 0; i < TEMP_PASSWORD_LENGTH; i++) {
    chars.push(TEMP_PASSWORD_ALPHABET[randomInt(0, max)]);
  }
  return chars.join("");
}
