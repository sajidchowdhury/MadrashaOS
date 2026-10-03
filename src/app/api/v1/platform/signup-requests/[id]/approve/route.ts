/**
 * MadrashaOS — Platform Admin: Approve Signup Request (Phase 1d)
 *
 * POST /api/v1/platform/signup-requests/[id]/approve
 *
 * Platform super-admin only. Approves a pending signup request and
 * triggers automated provisioning (creates org + roles + users + accounts).
 *
 * Returns the new org details + a temporary admin password that the
 * platform admin must relay to the contact person.
 */

import { db } from "@/lib/db";
import { getTenantContext, isPlatformAdmin } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse } from "@/lib/api/helpers";
import { provisionTenant } from "@/lib/tenant/provision";

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
  const requestId = segments[segments.length - 2]; // .../signup-requests/{id}/approve
  if (!requestId) return errorResponse("Signup request ID is required", 400);

  // Fetch the signup request
  const signupRequest = await db.tenantSignupRequest.findFirst({
    where: { id: requestId, deleted_at: null },
  });
  if (!signupRequest) return errorResponse("Signup request not found", 404);

  if (signupRequest.status !== "pending") {
    return errorResponse(
      `Signup request is already ${signupRequest.status} (only pending requests can be approved)`,
      400,
    );
  }

  // --- Parse optional review note from the request body ---
  let reviewNote: string | null = null;
  try {
    const body = await req.json();
    if (body && typeof body.review_note === "string") {
      reviewNote = body.review_note.trim().slice(0, 500) || null;
    }
  } catch {
    // Body is optional
  }

  // --- Mark as "approved" before provisioning (so a concurrent request
  //     can't double-provision) ---
  await db.tenantSignupRequest.update({
    where: { id: requestId },
    data: {
      status: "approved",
      reviewed_by: ctx.user_id,
      reviewed_at: new Date(),
      review_note: reviewNote,
      updated_by: ctx.user_id,
    },
  });

  // --- Provision the tenant (atomic transaction) ---
  try {
    const result = await provisionTenant({
      signupRequest: {
        id: signupRequest.id,
        org_name: signupRequest.org_name,
        org_name_bn: signupRequest.org_name_bn,
        org_slug: signupRequest.org_slug,
        org_code: signupRequest.org_code,
        contact_name: signupRequest.contact_name,
        contact_email: signupRequest.contact_email,
        contact_phone: signupRequest.contact_phone,
        address: signupRequest.address,
        estimated_branches: signupRequest.estimated_branches,
      },
      approvedBy: ctx.user_id,
    });

    // --- Audit log ---
    await db.auditLog.create({
      data: {
        organization_id: ctx.organization_id,
        branch_id: ctx.branch_id ?? null,
        entity_type: "tenant_signup_requests",
        entity_id: signupRequest.id,
        action: "approve_and_provision",
        old_values: { status: "pending" } as never,
        new_values: {
          status: "provisioned",
          provisioned_org_id: result.organization_id,
          provisioned_org_code: result.organization_code,
          admin_user_id: result.admin_user_id,
          branch_id: result.branch_id,
        } as never,
        actor_user_id: ctx.user_id,
      } as never,
    });

    return jsonResponse({
      success: true,
      message: "Tenant provisioned successfully",
      data: {
        ...result,
        message:
          `Tenant "${signupRequest.org_name}" has been provisioned. ` +
          `The admin (${result.admin_email}) can log in with their email + ` +
          `madrasha code ${result.organization_code}. ` +
          `IMPORTANT: Relay the temporary password to the contact person securely.`,
      },
    });
  } catch (err) {
    // Provisioning failed — mark the request as "failed"
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    await db.tenantSignupRequest.update({
      where: { id: requestId },
      data: {
        status: "failed",
        review_note: `Provisioning failed: ${errMsg}`.slice(0, 500),
        updated_by: ctx.user_id,
      },
    });

    await db.auditLog.create({
      data: {
        organization_id: ctx.organization_id,
        branch_id: ctx.branch_id ?? null,
        entity_type: "tenant_signup_requests",
        entity_id: signupRequest.id,
        action: "provision_failed",
        old_values: { status: "approved" } as never,
        new_values: { error: errMsg } as never,
        actor_user_id: ctx.user_id,
      } as never,
    });

    return errorResponse(
      `Provisioning failed: ${errMsg}. The request has been marked as "failed" — ` +
      `no partial tenant was created (transaction rolled back).`,
      500,
    );
  }
});
