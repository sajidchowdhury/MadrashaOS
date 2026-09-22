/**
 * MadrashaOS — Purchase Approve API
 *
 * Phase B7.1
 *
 * POST /api/v1/purchases/:id/approve — approve a purchase (perm: purchase.approve)
 *   Body: { action: "approve" | "reject" }
 *   Only draft/pending purchases can be approved/rejected
 *   Audit logged
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const approveSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withPermission("purchase.approve", async (req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = approveSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const purchase = await db.purchase.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
    include: { supplier: { select: { name: true } } },
  });
  if (!purchase) return errorResponse("Purchase not found", 404);

  if (purchase.status !== "draft" && purchase.status !== "pending") {
    return errorResponse(`Cannot ${parsed.data.action} a purchase with status "${purchase.status}". Only draft/pending purchases can be approved/rejected.`, 409);
  }

  const newStatus = parsed.data.action === "approve" ? "approved" : "cancelled";

  await db.purchase.update({
    where: { id },
    data: {
      status: newStatus,
      approved_by: tenantCtx.user_id,
      approved_at: new Date(),
      note: parsed.data.note ?? purchase.note,
      updated_by: tenantCtx.user_id,
    } as never,
  });

  await db.auditLog.create({
    data: {
      organization_id: tenantCtx.organization_id,
      branch_id: tenantCtx.branch_id ?? null,
      entity_type: "purchases",
      entity_id: id,
      action: parsed.data.action,
      old_values: { status: purchase.status },
      new_values: { status: newStatus, approved_by: tenantCtx.user_id },
      actor_user_id: tenantCtx.user_id,
    } as never,
  });

  return successResponse(
    { id, po_number: purchase.po_number, status: newStatus },
    parsed.data.action === "approve"
      ? `Purchase ${purchase.po_number} approved. Items can now be received.`
      : `Purchase ${purchase.po_number} cancelled.`,
  );
});
