/**
 * MadrashaOS — Platform Admin: Suspend Tenant (Phase 3)
 *
 * POST /api/v1/platform/tenants/[orgid]/suspend
 *
 * Sets the org status to "suspended" + records the reason + timestamp.
 * Suspended tenants cannot log in (enforced in Phase 4's login check).
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
  const orgId = segments[segments.length - 2]; // .../tenants/{orgid}/suspend

  // Parse optional reason
  let reason: string = "Suspended by platform admin";
  try {
    const body = await req.json();
    if (body && typeof body.reason === "string" && body.reason.trim()) {
      reason = body.reason.trim().slice(0, 500);
    }
  } catch { /* body optional */ }

  const org = await db.organization.findFirst({
    where: { id: orgId, deleted_at: null },
    select: { id: true, name: true, code: true, status: true },
  });
  if (!org) return errorResponse("Tenant not found", 404);
  if (org.code === "PLATFORM") return errorResponse("Cannot suspend the Platform org", 400);
  if (org.status === "suspended") return errorResponse("Tenant is already suspended", 400);

  const now = new Date();
  await db.organization.update({
    where: { id: orgId },
    data: {
      status: "suspended",
      suspended_at: now,
      suspended_reason: reason,
      updated_by: ctx.user_id,
    },
  });

  // Also suspend the subscription
  await db.subscription.updateMany({
    where: { organization_id: orgId, deleted_at: null },
    data: { status: "suspended" },
  });

  // Audit log
  await db.auditLog.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      entity_type: "organizations",
      entity_id: orgId,
      action: "suspend",
      old_values: { status: org.status } as never,
      new_values: { status: "suspended", reason, suspended_at: now.toISOString() } as never,
      actor_user_id: ctx.user_id,
    } as never,
  });

  return jsonResponse({
    data: { id: orgId, name: org.name, status: "suspended", reason },
    message: `Tenant "${org.name}" has been suspended. All users will be blocked from logging in.`,
  });
});
