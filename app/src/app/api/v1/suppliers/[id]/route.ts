/**
 * MadrashaOS — Single Supplier API
 *
 * Phase B7.1
 *
 * GET   /api/v1/suppliers/:id — single with purchase history
 * PATCH /api/v1/suppliers/:id — update
 * DELETE /api/v1/suppliers/:id — soft delete
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateSupplierSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  name_bn: z.string().optional(),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  tin: z.string().optional(),
  is_active: z.boolean().optional(),
  notes: z.string().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const supplier = await db.supplier.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
    include: {
      purchases: {
        where: { deleted_at: null },
        orderBy: { order_date: "desc" },
        take: 10,
        select: { id: true, po_number: true, order_date: true, total_amount: true, status: true, payment_status: true },
      },
      _count: { select: { purchases: { where: { deleted_at: null } } } },
    },
  });

  if (!supplier) return errorResponse("Supplier not found", 404);

  return jsonResponse({
    id: supplier.id,
    code: supplier.code,
    name: supplier.name,
    name_bn: supplier.name_bn,
    contact_person: supplier.contact_person,
    phone: supplier.phone,
    email: supplier.email,
    address: supplier.address,
    tin: supplier.tin,
    outstanding_balance: Number(supplier.outstanding_balance),
    total_purchased: Number(supplier.total_purchased),
    total_paid: Number(supplier.total_paid),
    is_active: supplier.is_active,
    notes: supplier.notes,
    purchase_count: supplier._count.purchases,
    recent_purchases: supplier.purchases.map((p) => ({
      id: p.id,
      po_number: p.po_number,
      order_date: p.order_date,
      total_amount: Number(p.total_amount),
      status: p.status,
      payment_status: p.payment_status,
    })),
  });
}

export const PATCH = withPermission("suppliers.view", async (req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = updateSupplierSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const existing = await db.supplier.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
  });
  if (!existing) return errorResponse("Supplier not found", 404);

  const updated = await db.supplier.update({
    where: { id },
    data: { ...parsed.data, updated_by: tenantCtx.user_id } as never,
  });

  return successResponse(updated, "Supplier updated");
});

export const DELETE = withPermission("suppliers.view", async (_req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const existing = await db.supplier.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
  });
  if (!existing) return errorResponse("Supplier not found", 404);

  if (Number(existing.outstanding_balance) > 0) {
    return errorResponse(`Cannot delete supplier with outstanding balance of ৳${Number(existing.outstanding_balance)}. Clear dues first.`, 409);
  }

  await db.supplier.update({
    where: { id },
    data: { deleted_at: new Date(), is_active: false, updated_by: tenantCtx.user_id } as never,
  });

  return successResponse(null, "Supplier deleted (soft)");
});
