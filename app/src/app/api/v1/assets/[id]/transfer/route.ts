/**
 * MadrashaOS — Asset Transfer API
 *
 * Phase B7.2
 *
 * POST /api/v1/assets/:id/transfer — transfer asset to another branch (perm: assets.transfer)
 *   Body: { to_branch_id, note? }
 *   Updates: status='transferred', transferred_to_branch_id, transferred_at
 *   Keeps the record in the original branch's register (SRS §2.5.4)
 *   Audit logged
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const transferSchema = z.object({
  to_branch_id: z.string().uuid(),
  note: z.string().max(500).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withPermission("assets.transfer", async (req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = transferSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const asset = await db.asset.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
    select: { id: true, asset_code: true, name: true, status: true, branch_id: true },
  });
  if (!asset) return errorResponse("Asset not found", 404);

  // Cannot transfer disposed assets
  if (asset.status === "disposed") {
    return errorResponse("Cannot transfer a disposed asset", 409);
  }

  // Verify target branch exists + belongs to same org
  const targetBranch = await db.branch.findFirst({
    where: {
      id: parsed.data.to_branch_id,
      organization_id: tenantCtx.organization_id,
      deleted_at: null,
      is_active: true,
    },
    select: { id: true, name: true, code: true },
  });
  if (!targetBranch) return errorResponse("Target branch not found or inactive", 404);

  // Cannot transfer to same branch
  if (asset.branch_id === parsed.data.to_branch_id) {
    return errorResponse("Asset is already in this branch", 400);
  }

  await db.asset.update({
    where: { id },
    data: {
      status: "transferred",
      transferred_to_branch_id: parsed.data.to_branch_id,
      transferred_at: new Date(),
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
      action: "transfer",
      old_values: { status: asset.status, branch_id: asset.branch_id },
      new_values: { status: "transferred", transferred_to_branch_id: parsed.data.to_branch_id, transferred_to: targetBranch.name },
      actor_user_id: tenantCtx.user_id,
    } as never,
  });

  return successResponse(
    {
      asset_id: id,
      asset_code: asset.asset_code,
      asset_name: asset.name,
      transferred_to: { id: targetBranch.id, name: targetBranch.name, code: targetBranch.code },
      status: "transferred",
    },
    `Asset ${asset.asset_code} transferred to ${targetBranch.name}. Record retained in original register.`,
  );
});
