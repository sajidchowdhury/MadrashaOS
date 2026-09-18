/**
 * MadrashaOS — Single Asset API
 *
 * Phase B7.2
 *
 * GET   /api/v1/assets/:id — single asset
 * PATCH /api/v1/assets/:id — update (perm: assets.view)
 * DELETE /api/v1/assets/:id — soft delete (perm: assets.view)
 *   Disposed assets: strikethrough + greyed but record remains (SRS §2.5.4)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateAssetSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  name_bn: z.string().optional(),
  category: z.enum(["furniture", "equipment", "it", "vehicle", "building", "other"]).optional(),
  current_value: z.number().min(0).optional(),
  depreciation_rate: z.number().min(0).max(100).optional(),
  location: z.string().max(255).optional(),
  status: z.enum(["in-use", "stored", "transferred", "disposed", "under-repair"]).optional(),
  image_url: z.string().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/v1/assets/:id */
export async function GET(_req: Request, ctx: RouteContext) {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const asset = await db.asset.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
    include: {
      branch: { select: { id: true, name: true, code: true } },
      transferred_to_branch: { select: { id: true, name: true, code: true } },
      disposer: { select: { id: true, name: true } },
    },
  });

  if (!asset) return errorResponse("Asset not found", 404);

  return jsonResponse({
    id: asset.id,
    asset_code: asset.asset_code,
    name: asset.name,
    name_bn: asset.name_bn,
    category: asset.category,
    purchase_date: asset.purchase_date,
    purchase_value: Number(asset.purchase_value),
    current_value: Number(asset.current_value),
    depreciation_amount: Number(asset.purchase_value) - Number(asset.current_value),
    depreciation_rate: Number(asset.depreciation_rate),
    location: asset.location,
    status: asset.status,
    branch: asset.branch,
    transferred_to_branch: asset.transferred_to_branch,
    transferred_at: asset.transferred_at,
    disposed_by: asset.disposer?.name ?? null,
    disposed_at: asset.disposed_at,
    disposal_reason: asset.disposal_reason,
    image_url: asset.image_url,
    // SRS §2.5.4: disposed assets keep their record (strikethrough in UI)
    is_disposed: asset.status === "disposed",
    record_retained: asset.disposed_at !== null, // record exists even after disposal
  });
}

/** PATCH /api/v1/assets/:id */
export const PATCH = withPermission("assets.view", async (req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = updateAssetSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const existing = await db.asset.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
  });
  if (!existing) return errorResponse("Asset not found", 404);

  // Block status changes via PATCH — use transfer/dispose endpoints
  if (parsed.data.status && parsed.data.status !== existing.status) {
    return errorResponse("Status cannot be changed via PATCH. Use /transfer or /dispose endpoints.", 400);
  }

  const updated = await db.asset.update({
    where: { id },
    data: { ...parsed.data, updated_by: tenantCtx.user_id } as never,
  });

  return successResponse(updated, "Asset updated");
});

/** DELETE /api/v1/assets/:id — soft delete (only for non-disposed assets) */
export const DELETE = withPermission("assets.view", async (_req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const existing = await db.asset.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
  });
  if (!existing) return errorResponse("Asset not found", 404);

  // Only allow delete if asset is not in use
  if (existing.status === "in-use" || existing.status === "under-repair") {
    return errorResponse(`Cannot delete an asset with status "${existing.status}". Transfer or dispose it first.`, 409);
  }

  await db.asset.update({
    where: { id },
    data: { deleted_at: new Date(), updated_by: tenantCtx.user_id } as never,
  });

  return successResponse(null, "Asset deleted (soft). Record retained in database.");
});
