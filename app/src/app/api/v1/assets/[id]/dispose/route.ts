/**
 * MadrashaOS — Asset Dispose API
 *
 * Phase B7.2
 *
 * POST /api/v1/assets/:id/dispose — dispose asset (perm: assets.dispose)
 *   Body: { disposal_reason, note? }
 *   Updates: status='disposed', disposed_by, disposed_at, disposal_reason
 *   SRS §2.5.4: disposed asset leaves active register BUT record is kept
 *   (soft-deleted from active list, but queryable via GET with status filter)
 *   Audit logged
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const disposeSchema = z.object({
  disposal_reason: z.string().min(1).max(500),
  note: z.string().max(500).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withPermission("assets.dispose", async (req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = disposeSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const asset = await db.asset.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
    select: { id: true, asset_code: true, name: true, status: true, current_value: true, purchase_value: true },
  });
  if (!asset) return errorResponse("Asset not found", 404);

  // Already disposed
  if (asset.status === "disposed") {
    return errorResponse("Asset is already disposed", 409);
  }

  // Dispose: set status + disposed_by + disposed_at + reason
  // SRS §2.5.4: record is KEPT (not hard-deleted) — just marked as disposed
  await db.asset.update({
    where: { id },
    data: {
      status: "disposed",
      disposed_by: tenantCtx.user_id,
      disposed_at: new Date(),
      disposal_reason: parsed.data.disposal_reason,
      updated_by: tenantCtx.user_id,
    } as never,
  });

  // Audit log
  await db.auditLog.create({
    data: {
      organization_id: tenantCtx.organization_id,
      branch_id: tenantCtx.branch_id ?? null,
      entity_type: "assets",
      entity_id: id,
      action: "dispose",
      old_values: { status: asset.status, current_value: Number(asset.current_value) },
      new_values: {
        status: "disposed",
        disposal_reason: parsed.data.disposal_reason,
        disposed_by: tenantCtx.user_id,
        record_retained: true, // SRS §2.5.4: record kept
      },
      actor_id: tenantCtx.user_id,
    } as never,
  });

  return successResponse(
    {
      asset_id: id,
      asset_code: asset.asset_code,
      asset_name: asset.name,
      status: "disposed",
      disposed_at: new Date().toISOString(),
      disposal_reason: parsed.data.disposal_reason,
      record_retained: true, // Frontend can show strikethrough + greyed but visible
    },
    `Asset ${asset.asset_code} disposed. Reason: ${parsed.data.disposal_reason}. Record retained in database per SRS §2.5.4.`,
  );
});
