/**
 * MadrashaOS — Purchases API (Pipeline)
 *
 * Phase B7.1
 *
 * GET  /api/v1/purchases — list purchases (perm: purchase.view)
 * POST /api/v1/purchases — create purchase order (perm: purchase.create)
 *   Body: { supplier_id, order_date, items: [{ inventory_item_id, qty_ordered, unit_cost }] }
 *   Auto-generates PO number + calculates total_amount
 *
 * GET  /api/v1/purchases/:id — single with items
 * PATCH /api/v1/purchases/:id — update (blocked if received/cancelled)
 * DELETE /api/v1/purchases/:id — soft delete (blocked if received)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse, parsePagination } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createPurchaseSchema = z.object({
  supplier_id: z.string().uuid(),
  order_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(500).optional(),
  items: z.array(z.object({
    inventory_item_id: z.string().uuid(),
    qty_ordered: z.number().min(0.01),
    unit_cost: z.number().min(0),
  })).min(1, "At least one item is required"),
});

/** GET /api/v1/purchases */
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const status = url.searchParams.get("status");
  const supplierId = url.searchParams.get("supplier_id");

  const where = {
    organization_id: ctx.organization_id,
    ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}),
    deleted_at: null,
    ...(status ? { status } : {}),
    ...(supplierId ? { supplier_id: supplierId } : {}),
  };

  const [purchases, total] = await Promise.all([
    db.purchase.findMany({
      where,
      orderBy: { order_date: "desc" },
      skip, take,
      include: {
        supplier: { select: { id: true, name: true, code: true } },
        requester: { select: { id: true, name: true } },
        purchase_items: {
          where: { deleted_at: null },
          include: { inventory_item: { select: { id: true, name: true, code: true, unit: true } } },
        },
      },
    }),
    db.purchase.count({ where }),
  ]);

  return jsonResponse({
    data: purchases.map((p) => ({
      id: p.id,
      po_number: p.po_number,
      supplier: p.supplier,
      order_date: p.order_date,
      received_date: p.received_date,
      total_amount: Number(p.total_amount),
      status: p.status,
      payment_status: p.payment_status,
      paid_amount: Number(p.paid_amount),
      requested_by: p.requester.name,
      approved_at: p.approved_at,
      note: p.note,
      items: p.purchase_items.map((pi) => ({
        id: pi.id,
        inventory_item: pi.inventory_item,
        qty_ordered: Number(pi.qty_ordered),
        qty_received: Number(pi.qty_received),
        unit_cost: Number(pi.unit_cost),
        line_total: Number(pi.line_total),
      })),
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

/** POST /api/v1/purchases */
export const POST = withPermission("purchase.create", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = createPurchaseSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const data = parsed.data;

  // Verify supplier exists
  const supplier = await db.supplier.findFirst({
    where: { id: data.supplier_id, organization_id: ctx.organization_id, deleted_at: null, is_active: true },
    select: { id: true, name: true },
  });
  if (!supplier) return errorResponse("Supplier not found", 404);

  // Verify all inventory items exist
  const itemIds = data.items.map((i) => i.inventory_item_id);
  const items = await db.inventoryItem.findMany({
    where: { id: { in: itemIds }, organization_id: ctx.organization_id, deleted_at: null },
    select: { id: true, name: true, code: true },
  });
  if (items.length !== itemIds.length) return errorResponse("One or more inventory items not found", 404);

  // Calculate total
  const totalAmount = data.items.reduce((sum, i) => sum + (i.qty_ordered * i.unit_cost), 0);

  // Generate PO number
  const year = new Date().getFullYear();
  const lastPO = await db.purchase.findFirst({
    where: { po_number: { startsWith: `PO-${year}-` } },
    orderBy: { po_number: "desc" },
    select: { po_number: true },
  });
  const seq = lastPO ? parseInt(lastPO.po_number.split("-").pop() || "0", 10) + 1 : 1;
  const poNumber = `PO-${year}-${seq.toString().padStart(4, "0")}`;

  // Create purchase + items in transaction
  const purchase = await db.$transaction(async (tx) => {
    const newPurchase = await tx.purchase.create({
      data: {
        organization_id: ctx.organization_id,
        branch_id: ctx.branch_id ?? null,
        po_number: poNumber,
        supplier_id: data.supplier_id,
        order_date: new Date(data.order_date),
        total_amount: totalAmount,
        status: "draft",
        payment_status: "unpaid",
        requested_by: ctx.user_id,
        note: data.note ?? null,
        created_by: ctx.user_id,
      } as never,
    });

    for (const item of data.items) {
      await tx.purchaseItem.create({
        data: {
          organization_id: ctx.organization_id,
          branch_id: ctx.branch_id ?? null,
          purchase_id: newPurchase.id,
          inventory_item_id: item.inventory_item_id,
          qty_ordered: item.qty_ordered,
          qty_received: 0,
          unit_cost: item.unit_cost,
          line_total: item.qty_ordered * item.unit_cost,
          created_by: ctx.user_id,
        } as never,
      });
    }

    return newPurchase;
  });

  return successResponse(
    { id: purchase.id, po_number: poNumber, total_amount: totalAmount, status: "draft", item_count: data.items.length },
    `Purchase order ${poNumber} created with ${data.items.length} items. Total: ৳${totalAmount}.`,
  );
});
