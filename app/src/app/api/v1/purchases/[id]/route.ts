/**
 * MadrashaOS — Single Purchase API
 *
 * Phase B7.1
 *
 * GET /api/v1/purchases/:id — single purchase with items + supplier
 * PATCH /api/v1/purchases/:id — update (blocked if received/cancelled)
 * DELETE /api/v1/purchases/:id — soft delete (blocked if received)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updatePurchaseSchema = z.object({
  order_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note: z.string().max(500).optional(),
  payment_status: z.enum(["unpaid", "partial", "paid"]).optional(),
  paid_amount: z.number().min(0).optional(),
  status: z.string().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const purchase = await db.purchase.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
    include: {
      supplier: { select: { id: true, name: true, code: true, phone: true, email: true } },
      requester: { select: { id: true, name: true } },
      approver: { select: { id: true, name: true } },
      purchase_items: {
        where: { deleted_at: null },
        include: { inventory_item: { select: { id: true, name: true, code: true, unit: true, category: true } } },
      },
    },
  });

  if (!purchase) return errorResponse("Purchase not found", 404);

  return jsonResponse({
    id: purchase.id,
    po_number: purchase.po_number,
    supplier: purchase.supplier,
    order_date: purchase.order_date,
    received_date: purchase.received_date,
    total_amount: Number(purchase.total_amount),
    status: purchase.status,
    payment_status: purchase.payment_status,
    paid_amount: Number(purchase.paid_amount),
    requested_by: purchase.requester.name,
    approved_by: purchase.approver?.name ?? null,
    approved_at: purchase.approved_at,
    note: purchase.note,
    items: purchase.purchase_items.map((pi) => ({
      id: pi.id,
      inventory_item: pi.inventory_item,
      qty_ordered: Number(pi.qty_ordered),
      qty_received: Number(pi.qty_received),
      unit_cost: Number(pi.unit_cost),
      line_total: Number(pi.line_total),
      fully_received: Number(pi.qty_received) >= Number(pi.qty_ordered),
    })),
    all_received: purchase.purchase_items.every((pi) => Number(pi.qty_received) >= Number(pi.qty_ordered)),
  });
}

export const PATCH = withPermission("purchase.create", async (req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = updatePurchaseSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const existing = await db.purchase.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
  });
  if (!existing) return errorResponse("Purchase not found", 404);

  if (existing.status === "received" || existing.status === "cancelled") {
    return errorResponse(`Cannot modify a ${existing.status} purchase`, 409);
  }

  const updated = await db.purchase.update({
    where: { id },
    data: {
      ...(parsed.data.order_date ? { order_date: new Date(parsed.data.order_date) } : {}),
      ...parsed.data,
      updated_by: tenantCtx.user_id,
    } as never,
  });

  return successResponse(updated, "Purchase updated");
});

export const DELETE = withPermission("purchase.create", async (_req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const existing = await db.purchase.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
  });
  if (!existing) return errorResponse("Purchase not found", 404);

  if (existing.status === "received") {
    return errorResponse("Cannot delete a received purchase", 409);
  }

  await db.purchase.update({
    where: { id },
    data: { deleted_at: new Date(), status: "cancelled", updated_by: tenantCtx.user_id } as never,
  });

  return successResponse(null, "Purchase cancelled (soft)");
});
