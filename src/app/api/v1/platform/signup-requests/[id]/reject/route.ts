/**
 * MadrashaOS — Platform Admin: Reject Signup Request (Phase 1d)
 *
 * POST /api/v1/platform/signup-requests/[id]/reject
 *
 * Platform super-admin only. Rejects a pending signup request with
 * an optional review note explaining why.
 */

import { db } from "@/lib/db";
import { getTenantContext, isPlatformAdmin } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export const POST = withPermission("tenant.manage", async (req: Request) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const isPlatform = await isPlatformAdmin();
  if (!isPlatform) {
    return errorResponse("Forbidden — platform admin access required", 403);
  }

  // Extract the signup request ID from the URL
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  const requestId = segments[segments.length - 2]; // .../signup-requests/{id}/reject
  if (!requestId) return errorResponse("Signup request ID is required", 400);

  // Fetch the signup request
  const signupRequest = await db.tenantSignupRequest.findFirst({
    where: { id: requestId, deleted_at: null },
  });
  if (!signupRequest) return errorResponse("Signup request not found", 404);

  if (signupRequest.status !== "pending") {
    return errorResponse(
      `Signup request is already ${signupRequest.status} (only pending requests can be rejected)`,
      400,
    );
  }

  // --- Parse the rejection reason ---
  let reviewNote: string | null = null;
  try {
    const body = await req.json();
    if (body && typeof body.review_note === "string") {
      reviewNote = body.review_note.trim().slice(0, 500) || null;
    }
  } catch {
    // Body is optional
  }

  // --- Update the request status ---
  await db.tenantSignupRequest.update({
    where: { id: requestId },
    data: {
      status: "rejected",
      reviewed_by: ctx.user_id,
      reviewed_at: new Date(),
      review_note: reviewNote,
      updated_by: ctx.user_id,
    },
  });

  // --- Audit log ---
  await db.auditLog.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      entity_type: "tenant_signup_requests",
      entity_id: signupRequest.id,
      action: "reject",
      old_values: { status: "pending" } as never,
      new_values: { status: "rejected", review_note: reviewNote } as never,
      actor_user_id: ctx.user_id,
    } as never,
  });

  return jsonResponse({
    success: true,
    message: "Signup request rejected",
    data: {
      id: signupRequest.id,
      org_name: signupRequest.org_name,
      status: "rejected",
    },
  });
});
