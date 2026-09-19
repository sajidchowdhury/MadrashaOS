/**
 * MadrashaOS — Inventory Receive Stock API
 *
 * Phase B7.1
 *
 * POST /api/v1/inventory/receive — receive stock (perm: inventory.receive)
 *   Body: { item_id, qty, unit_cost?, note? }
 *   Increases qty_in_stock + updates unit_cost if provided
 *   Audit logged
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const receiveSchema = z.object({
  item_id: z.string().uuid(),
  qty: z.number().min(0.01),
  unit_cost: z.number().min(0).optional(),
  note: z.string().max(500).optional(),
});

export const POST = withPermission("inventory.receive", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = receiveSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const item = await db.inventoryItem.findFirst({
    where: { id: parsed.data.item_id, organization_id: ctx.organization_id, deleted_at: null },
    select: { id: true, name: true, code: true, qty_in_stock: true, unit_cost: true },
  });
  if (!item) return errorResponse("Item not found", 404);

  const newQty = Number(item.qty_in_stock) + parsed.data.qty;
  const newUnitCost = parsed.data.unit_cost ?? Number(item.unit_cost);

  await db.inventoryItem.update({
    where: { id: parsed.data.item_id },
    data: {
      qty_in_stock: newQty,
      unit_cost: newUnitCost,
      updated_by: ctx.user_id,
    } as never,
  });

  await db.auditLog.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      entity_type: "inventory_items",
      entity_id: parsed.data.item_id,
      action: "receive_stock",
      old_values: { qty_in_stock: Number(item.qty_in_stock), unit_cost: Number(item.unit_cost) },
      new_values: { qty_in_stock: newQty, unit_cost: newUnitCost, received_qty: parsed.data.qty },
      actor_user_id: ctx.user_id,
    } as never,
  });

  return successResponse(
    { item_id: parsed.data.item_id, item_code: item.code, item_name: item.name, new_qty: newQty, unit_cost: newUnitCost },
    `Stock received — ${parsed.data.qty} ${item.code} added. New stock: ${newQty}.`,
  );
});
