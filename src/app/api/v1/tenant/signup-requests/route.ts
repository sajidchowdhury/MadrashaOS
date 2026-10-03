/**
 * MadrashaOS — Tenant Signup Request API (Phase 1)
 *
 * POST /api/v1/tenant/signup-requests — public, no auth required
 *
 * A new madrasha submits this form to request access to MadrashaOS.
 * The request goes into "pending" status and waits for a platform
 * super-admin to approve it (Phase 3).
 *
 * On approval, the platform admin triggers provisioning (Phase 1c)
 * which creates the org + roles + users + accounts.
 *
 * Fields:
 *   - org_name (required)
 *   - org_name_bn (optional)
 *   - contact_name (required)
 *   - contact_email (required)
 *   - contact_phone (required)
 *   - address (optional)
 *   - estimated_branches (default 1)
 *   - notes (optional)
 *
 * The madrasha code is AUTO-GENERATED (not user-chosen) to ensure
 * uniqueness and avoid collisions. The slug is derived from org_name.
 *
 * Rate limited: 3 requests per IP per hour (prevents spam).
 * Honeypot: if "website" field is filled → silently accepted (200) but
 * NOT saved (bot detection — same pattern as the donations route).
 */

import { db } from "@/lib/db";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";
import { generateUniqueMadrashaCode, normalizeMadrashaCode } from "@/lib/tenant/code-generator";

export const dynamic = "force-dynamic";

// --- Rate limiter (in-memory, per IP, 3 req / hour) ---
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

const signupSchema = z.object({
  org_name: z.string().min(2, "Madrasha name must be at least 2 characters").max(255),
  org_name_bn: z.string().max(255).optional(),
  contact_name: z.string().min(2, "Contact name is required").max(255),
  contact_email: z.string().email("A valid contact email is required").max(255),
  contact_phone: z.string().min(5, "A valid phone number is required").max(50),
  address: z.string().max(1000).optional(),
  estimated_branches: z.number().int().min(1).max(50).default(1),
  notes: z.string().max(2000).optional(),
  // Honeypot — bots fill this; humans don't see it
  website: z.string().optional(),
});

/** Generate a URL-safe slug from a name */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Get client IP from request (behind proxy if any) */
function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIP = req.headers.get("x-real-ip");
  if (realIP) return realIP;
  return "unknown";
}

export async function POST(req: Request) {
  // --- Rate limit ---
  const ip = getClientIP(req);
  if (isRateLimited(ip)) {
    return jsonResponse(
      { error: "Too many signup requests from this IP. Please try again later." },
      429,
    );
  }

  // --- Parse body ---
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parsed.error.flatten());
  }

  const data = parsed.data;

  // --- Honeypot check ---
  if (data.website && data.website.trim().length > 0) {
    // Silently return success WITHOUT saving (bot detected)
    console.warn("[Phase 1] Signup honeypot triggered — IP:", ip);
    return successResponse(
      { request_id: "FAKE-" + Date.now() },
      "Signup request received. We will review and contact you soon.",
    );
  }

  // --- Generate unique code + slug ---
  let code: string;
  try {
    code = await generateUniqueMadrashaCode();
  } catch {
    return errorResponse("Failed to generate a unique madrasha code. Please try again.", 500);
  }

  const slugBase = slugify(data.org_name);
  let slug = slugBase || "madrasha-" + code.toLowerCase();
  // Ensure slug is unique (append code suffix if collision)
  const existingSlug = await db.organization.findFirst({
    where: { slug },
    select: { id: true },
  });
  if (existingSlug) {
    slug = `${slug}-${code.toLowerCase()}`;
  }

  // Ensure slug is unique among pending requests too
  const existingRequestSlug = await db.tenantSignupRequest.findFirst({
    where: { org_slug: slug, status: { in: ["pending", "approved"] } },
    select: { id: true },
  });
  if (existingRequestSlug) {
    slug = `${slug}-${code.toLowerCase()}`;
  }

  // --- Check for duplicate pending requests (same email + org_name) ---
  const duplicate = await db.tenantSignupRequest.findFirst({
    where: {
      contact_email: data.contact_email,
      org_name: data.org_name,
      status: "pending",
      deleted_at: null,
    },
    select: { id: true },
  });
  if (duplicate) {
    return errorResponse(
      "You already have a pending signup request for this madrasha. We will contact you soon.",
      409,
    );
  }

  // --- Create the signup request ---
  const signupRequest = await db.tenantSignupRequest.create({
    data: {
      org_name: data.org_name,
      org_name_bn: data.org_name_bn ?? null,
      org_slug: slug,
      org_code: code,
      contact_name: data.contact_name,
      contact_email: data.contact_email,
      contact_phone: data.contact_phone,
      address: data.address ?? null,
      estimated_branches: data.estimated_branches,
      notes: data.notes ?? null,
      status: "pending",
    },
  });

  // TODO (Phase 3): send email notification to platform admins

  return jsonResponse(
    {
      success: true,
      message: "Signup request submitted successfully",
      data: {
        id: signupRequest.id,
        org_code: code,
        org_name: data.org_name,
        status: "pending",
        message: `Signup request received! Your madrasha code is ${code}. We will review your request and contact you at ${data.contact_email} within 1-2 business days.`,
      },
    },
    201,
  );
}
