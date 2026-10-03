/**
 * MadrashaOS — Check Email Endpoint (Phase 0 fix G1)
 *
 * GET /api/v1/auth/check-email?email=foo@bar.com
 *
 * Public endpoint (no auth required) used by the login UI to determine
 * whether the madrasha-code field should be shown:
 *   - 0 matches → { exists: false, multiOrg: false }
 *   - 1 match   → { exists: true,  multiOrg: false }
 *   - 2+ matches → { exists: true,  multiOrg: true }  → UI shows madrasha-code field
 *
 * This does NOT leak which orgs have the user — only the COUNT.
 * The org identity is only revealed after the user provides the code
 * + password (via the authorize callback).
 *
 * Rate limiting: simple in-memory throttle (max 10 requests per email
 * per 5 minutes). A production deployment should use a proper rate
 * limiter (e.g. Upstash Redis) — deferred to Phase 6.
 */

import { db } from "@/lib/db";
import { jsonResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

// Simple in-memory rate limiter (per email, 10 req / 5 min)
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email")?.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return jsonResponse(
      { error: "A valid email query parameter is required." },
      400,
    );
  }

  if (isRateLimited(email)) {
    return jsonResponse(
      { error: "Too many requests. Please try again later." },
      429,
    );
  }

  // Count how many active (non-deleted) users have this email across ALL orgs.
  // We do NOT return org names/codes — only the count.
  const count = await db.user.count({
    where: {
      email,
      deleted_at: null,
    },
  });

  return jsonResponse({
    exists: count > 0,
    multiOrg: count > 1,
  });
}
