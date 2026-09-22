/**
 * MadrashaOS — Single Inventory Item API
 *
 * Phase B7.1
 *
 * GET   /api/v1/inventory/:id — single item
 * PATCH /api/v1/inventory/:id — update item (perm: inventory.receive)
 * DELETE /api/v1/inventory/:id — soft delete (perm: inventory.receive)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateItemSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  name_bn: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().optional(),
  reorder_level: z.number().min(0).optional(),
  unit_cost: z.number().min(0).optional(),
  storage_location: z.string().optional(),
  is_active: z.boolean().optional(),
  description: z.string().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const item = await db.inventoryItem.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
    include: {
      purchase_items: {
        where: { deleted_at: null },
        take: 10,
        orderBy: { created_at: "desc" },
        include: { purchase: { select: { po_number: true, order_date: true, status: true } } },
      },
    },
  });

  if (!item) return errorResponse("Item not found", 404);

  return jsonResponse({
    ...item,
    qty_in_stock: Number(item.qty_in_stock),
    reorder_level: Number(item.reorder_level),
    unit_cost: Number(item.unit_cost),
    is_low_stock: Number(item.qty_in_stock) <= Number(item.reorder_level),
    recent_purchases: item.purchase_items.map((pi) => ({
      po_number: pi.purchase.po_number,
      qty_ordered: Number(pi.qty_ordered),
      qty_received: Number(pi.qty_received),
      unit_cost: Number(pi.unit_cost),
      line_total: Number(pi.line_total),
      status: pi.purchase.status,
      order_date: pi.purchase.order_date,
    })),
  });
}

export const PATCH = withPermission("inventory.receive", async (req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = updateItemSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const existing = await db.inventoryItem.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
  });
  if (!existing) return errorResponse("Item not found", 404);

  const updated = await db.inventoryItem.update({
    where: { id },
    data: { ...parsed.data, updated_by: tenantCtx.user_id } as never,
  });

  return successResponse(updated, "Item updated");
});

export const DELETE = withPermission("inventory.receive", async (_req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const existing = await db.inventoryItem.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
  });
  if (!existing) return errorResponse("Item not found", 404);

  if (Number(existing.qty_in_stock) > 0) {
    return errorResponse(`Cannot delete item with stock (Qty: ${Number(existing.qty_in_stock)}). Issue or adjust stock first.`, 409);
  }

  await db.inventoryItem.update({
    where: { id },
    data: { deleted_at: new Date(), is_active: false, updated_by: tenantCtx.user_id } as never,
  });

  return successResponse(null, "Item deleted (soft)");
});
