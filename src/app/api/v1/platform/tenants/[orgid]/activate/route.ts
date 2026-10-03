/**
 * MadrashaOS — Platform Admin: Activate Tenant (Phase 3)
 *
 * POST /api/v1/platform/tenants/[orgid]/activate
 *
 * Reactivates a suspended tenant (status → "active").
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
  if (!isPlatform) return errorResponse("Forbidden — platform admin access required", 403);

  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  const orgId = segments[segments.length - 2]; // .../tenants/{orgid}/activate

  const org = await db.organization.findFirst({
    where: { id: orgId, deleted_at: null },
    select: { id: true, name: true, code: true, status: true },
  });
  if (!org) return errorResponse("Tenant not found", 404);
  if (org.code === "PLATFORM") return errorResponse("Cannot modify the Platform org status", 400);
  if (org.status === "active") return errorResponse("Tenant is already active", 400);

  await db.organization.update({
    where: { id: orgId },
    data: {
      status: "active",
      suspended_at: null,
      suspended_reason: null,
      updated_by: ctx.user_id,
    },
  });

  // Also reactivate the subscription (set back to "active" or "trialing" based on trial)
  const sub = await db.subscription.findFirst({
    where: { organization_id: orgId, deleted_at: null },
    select: { id: true, trial_ends_at: true },
  });
  if (sub) {
    const now = new Date();
    const isTrialing = sub.trial_ends_at && sub.trial_ends_at > now;
    await db.subscription.update({
      where: { id: sub.id },
      data: { status: isTrialing ? "trialing" : "active" },
    });
  }

  // Audit log
  await db.auditLog.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      entity_type: "organizations",
      entity_id: orgId,
      action: "activate",
      old_values: { status: org.status } as never,
      new_values: { status: "active" } as never,
      actor_user_id: ctx.user_id,
    } as never,
  });

  return jsonResponse({
    data: { id: orgId, name: org.name, status: "active" },
    message: `Tenant "${org.name}" has been reactivated. Users can now log in.`,
  });
});
