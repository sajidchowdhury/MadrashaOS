/**
 * MadrashaOS — Madrasha Code Generator
 *
 * Generates a unique 6-character login code for each madrasha.
 * Format: uppercase alphanumeric, excluding ambiguous characters:
 *   - No O, 0 (look identical)
 *   - No I, 1, L (look identical)
 *
 * The code is what users type at login to resolve their madrasha.
 * It must be globally unique across all organizations.
 *
 * Generation strategy:
 *   1. Generate a random 6-char code from the safe alphabet
 *   2. Check against existing org codes + pending signup requests
 *   3. If collision, retry (up to 10 times, then throw)
 *
 * The safe alphabet has 32 chars → 32^6 = ~1 billion combinations.
 * With <10,000 tenants this is effectively collision-free after a few
 * retries at most.
 */

import { db } from "@/lib/db";

/** Safe alphabet — no O, 0, I, 1, L */
const SAFE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const MAX_RETRIES = 10;

/** Generate a single random 6-char code (no DB check). */
export function generateMadrashaCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += SAFE_ALPHABET[Math.floor(Math.random() * SAFE_ALPHABET.length)];
  }
  return code;
}

/**
 * Generate a unique 6-char madrasha code, checking the DB for collisions.
 * Checks both `organizations.code` and `tenant_signup_requests.org_code`.
 *
 * @param excludeCode — optional code to exclude (e.g. if the requester
 *   suggested a code and we want to check it, pass it here to validate)
 * @returns a unique code that doesn't exist in the DB
 * @throws if MAX_RETRIES exceeded (astronomically unlikely)
 */
export async function generateUniqueMadrashaCode(
  excludeCode?: string,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const code = excludeCode && attempt === 0
      ? excludeCode.toUpperCase()
      : generateMadrashaCode();

    // Check if this code is already used by an organization
    const existingOrg = await db.organization.findFirst({
      where: { code, deleted_at: null },
      select: { id: true },
    });
    if (existingOrg) continue;

    // Check if this code is already requested in a pending signup
    const existingRequest = await db.tenantSignupRequest.findFirst({
      where: { org_code: code, status: { in: ["pending", "approved"] }, deleted_at: null },
      select: { id: true },
    });
    if (existingRequest) continue;

    // Validate format (in case excludeCode was user-provided)
    if (!isValidMadrashaCode(code)) continue;

    return code;
  }
  throw new Error(
    "Failed to generate a unique madrasha code after " + MAX_RETRIES + " attempts. Please try again.",
  );
}

/**
 * Validate that a code matches the format:
 *   - Exactly 6 characters
 *   - Uppercase alphanumeric only
 *   - No ambiguous characters (O, 0, I, 1, L)
 */
export function isValidMadrashaCode(code: string): boolean {
  if (code.length !== CODE_LENGTH) return false;
  for (const ch of code) {
    if (!SAFE_ALPHABET.includes(ch)) return false;
  }
  return true;
}

/**
 * Normalize a user-provided code: uppercase + strip whitespace + remove
 * ambiguous characters (replace O→Q, 0→Q, I→T, 1→T, L→N).
 * If the requester insists on a code with ambiguous chars, we silently
 * replace them rather than rejecting the request.
 */
export function normalizeMadrashaCode(input: string): string {
  const cleaned = input.trim().toUpperCase().slice(0, CODE_LENGTH);
  return cleaned
    .replace(/O/g, "Q")
    .replace(/0/g, "Q")
    .replace(/I/g, "T")
    .replace(/1/g, "T")
    .replace(/L/g, "N");
}
