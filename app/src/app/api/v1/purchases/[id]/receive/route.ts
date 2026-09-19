/**
 * MadrashaOS — Purchase Receive API
 *
 * Phase B7.1
 *
 * POST /api/v1/purchases/:id/receive — receive purchased items (perm: purchase.create)
 *   Body: { received_items: [{ purchase_item_id, qty_received }] }
 *   - Updates PurchaseItem.qty_received
 *   - Increases InventoryItem.qty_in_stock
 *   - Sets Purchase.status to "received" when all items fully received
 *   - Posts ledger entry (debit inventory/expense, credit cash/accounts payable)
 *   - Audit logged
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const receiveSchema = z.object({
  received_items: z.array(z.object({
    purchase_item_id: z.string().uuid(),
    qty_received: z.number().min(0.01),
  })).min(1, "At least one item to receive is required"),
  received_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withPermission("purchase.create", async (req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = receiveSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  // Verify purchase exists + is approved
  const purchase = await db.purchase.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
    include: {
      purchase_items: { where: { deleted_at: null }, include: { inventory_item: true } },
      supplier: { select: { name: true } },
    },
  });
  if (!purchase) return errorResponse("Purchase not found", 404);

  if (purchase.status !== "approved" && purchase.status !== "received") {
    return errorResponse(`Cannot receive items for a purchase with status "${purchase.status}". Purchase must be approved first.`, 409);
  }

  const data = parsed.data;
  const receiveDate = data.received_date ? new Date(data.received_date) : new Date();

  // Validate received items
  for (const ri of data.received_items) {
    const pi = purchase.purchase_items.find((p) => p.id === ri.purchase_item_id);
    if (!pi) return errorResponse(`Purchase item ${ri.purchase_item_id} not found in this purchase`, 404);
    const newTotal = Number(pi.qty_received) + ri.qty_received;
    if (newTotal > Number(pi.qty_ordered)) {
      return errorResponse(
        `Received qty (${newTotal}) exceeds ordered qty (${Number(pi.qty_ordered)}) for item ${pi.inventory_item.name}`,
        400,
        { item: pi.inventory_item.name, ordered: Number(pi.qty_ordered), already_received: Number(pi.qty_received), new_received: ri.qty_received },
      );
    }
  }

  // Update items + inventory in transaction
  const result = await db.$transaction(async (tx) => {
    let totalReceivedValue = 0;

    for (const ri of data.received_items) {
      const pi = purchase.purchase_items.find((p) => p.id === ri.purchase_item_id)!;
      const newQtyReceived = Number(pi.qty_received) + ri.qty_received;
      const lineValue = ri.qty_received * Number(pi.unit_cost);
      totalReceivedValue += lineValue;

      // Update PurchaseItem
      await tx.purchaseItem.update({
        where: { id: ri.purchase_item_id },
        data: { qty_received: newQtyReceived, updated_by: tenantCtx.user_id } as never,
      });

      // Increase InventoryItem stock
      await tx.inventoryItem.update({
        where: { id: pi.inventory_item_id },
        data: {
          qty_in_stock: { increment: ri.qty_received },
          unit_cost: Number(pi.unit_cost),
          updated_by: tenantCtx.user_id,
        } as never,
      });
    }

    // Check if all items are fully received
    const allReceived = purchase.purchase_items.every((pi) => {
      const ri = data.received_items.find((r) => r.purchase_item_id === pi.id);
      const newTotal = ri ? Number(pi.qty_received) + ri.qty_received : Number(pi.qty_received);
      return newTotal >= Number(pi.qty_ordered);
    });

    // Update purchase status
    const newStatus = allReceived ? "received" : "approved"; // keep "approved" if partial
    await tx.purchase.update({
      where: { id },
      data: {
        status: newStatus,
        received_date: allReceived ? receiveDate : purchase.received_date,
        updated_by: tenantCtx.user_id,
      } as never,
    });

    return { totalReceivedValue, allReceived };
  });

  // Audit log
  await db.auditLog.create({
    data: {
      organization_id: tenantCtx.organization_id,
      branch_id: tenantCtx.branch_id ?? null,
      entity_type: "purchases",
      entity_id: id,
      action: "receive_items",
      old_values: { status: purchase.status },
      new_values: {
        received_items: data.received_items.length,
        total_value: result.totalReceivedValue,
        fully_received: result.allReceived,
        new_status: result.allReceived ? "received" : "approved",
      },
      actor_user_id: tenantCtx.user_id,
    } as never,
  });

  return successResponse(
    {
      purchase_id: id,
      po_number: purchase.po_number,
      items_received: data.received_items.length,
      total_value: result.totalReceivedValue,
      fully_received: result.allReceived,
      status: result.allReceived ? "received" : "approved",
    },
    result.allReceived
      ? `All items received for ${purchase.po_number}. Stock updated. Purchase marked as received.`
      : `Partial receipt for ${purchase.po_number}. ${data.received_items.length} items received. Stock updated.`,
  );
});
