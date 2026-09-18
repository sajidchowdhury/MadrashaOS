/**
 * MadrashaOS — Inventory Issue Stock API
 *
 * Phase B7.1
 *
 * POST /api/v1/inventory/issue — issue stock (perm: inventory.issue)
 *   Body: { item_id, qty, note?, issued_to? }
 *   Validates: qty ≤ qty_in_stock → 400 if exceeds
 *   Decreases qty_in_stock
 *   Audit logged
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const issueSchema = z.object({
  item_id: z.string().uuid(),
  qty: z.number().min(0.01),
  note: z.string().max(500).optional(),
  issued_to: z.string().max(255).optional(),
});

export const POST = withPermission("inventory.issue", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = issueSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const item = await db.inventoryItem.findFirst({
    where: { id: parsed.data.item_id, organization_id: ctx.organization_id, deleted_at: null },
    select: { id: true, name: true, code: true, qty_in_stock: true, unit: true },
  });
  if (!item) return errorResponse("Item not found", 404);

  const currentStock = Number(item.qty_in_stock);
  if (parsed.data.qty > currentStock) {
    return errorResponse(
      `Issue exceeds stock. Available: ${currentStock} ${item.unit}, Requested: ${parsed.data.qty} ${item.unit}`,
      400,
      { available: currentStock, requested: parsed.data.qty, unit: item.unit },
    );
  }

  const newQty = currentStock - parsed.data.qty;
  const isLowStock = newQty <= 0;

  await db.inventoryItem.update({
    where: { id: parsed.data.item_id },
    data: { qty_in_stock: newQty, updated_by: ctx.user_id } as never,
  });

  await db.auditLog.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      entity_type: "inventory_items",
      entity_id: parsed.data.item_id,
      action: "issue_stock",
      old_values: { qty_in_stock: currentStock },
      new_values: { qty_in_stock: newQty, issued_qty: parsed.data.qty, issued_to: parsed.data.issued_to ?? null },
      actor_id: ctx.user_id,
    } as never,
  });

  return successResponse(
    { item_id: parsed.data.item_id, item_code: item.code, item_name: item.name, new_qty: newQty, is_low_stock: isLowStock },
    `Stock issued — ${parsed.data.qty} ${item.unit} of ${item.code}. Remaining: ${newQty} ${item.unit}.${isLowStock ? " ⚠ Low stock alert!" : ""}`,
  );
});
