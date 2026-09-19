/**
 * MadrashaOS — Suppliers API
 *
 * Phase B7.1
 *
 * GET  /api/v1/suppliers — list (perm: suppliers.view)
 * POST /api/v1/suppliers — create (perm: suppliers.view)
 * GET  /api/v1/suppliers/:id — single with purchase stats
 * PATCH /api/v1/suppliers/:id — update
 * DELETE /api/v1/suppliers/:id — soft delete
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse, parsePagination } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSupplierSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  name_bn: z.string().optional(),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  tin: z.string().optional(),
  notes: z.string().optional(),
});

/** GET /api/v1/suppliers */
export const GET = withPermission("suppliers.view", async (req: Request) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const search = url.searchParams.get("search");

  const where = {
    organization_id: ctx.organization_id,
    ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}),
    deleted_at: null,
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [suppliers, total] = await Promise.all([
    db.supplier.findMany({
      where,
      orderBy: { name: "asc" },
      skip, take,
      include: { _count: { select: { purchases: { where: { deleted_at: null } } } } },
    }),
    db.supplier.count({ where }),
  ]);

  return jsonResponse({
    data: suppliers.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      name_bn: s.name_bn,
      contact_person: s.contact_person,
      phone: s.phone,
      email: s.email,
      address: s.address,
      tin: s.tin,
      outstanding_balance: Number(s.outstanding_balance),
      total_purchased: Number(s.total_purchased),
      total_paid: Number(s.total_paid),
      is_active: s.is_active,
      notes: s.notes,
      purchase_count: s._count.purchases,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
});

/** POST /api/v1/suppliers */
export const POST = withPermission("suppliers.view", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = createSupplierSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const existing = await db.supplier.findFirst({
    where: { organization_id: ctx.organization_id, code: parsed.data.code, deleted_at: null },
  });
  if (existing) return errorResponse("Supplier with this code already exists", 409);

  const supplier = await db.supplier.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      code: parsed.data.code,
      name: parsed.data.name,
      name_bn: parsed.data.name_bn ?? null,
      contact_person: parsed.data.contact_person ?? null,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
      address: parsed.data.address ?? null,
      tin: parsed.data.tin ?? null,
      notes: parsed.data.notes ?? null,
      is_active: true,
      created_by: ctx.user_id,
    } as never,
  });

  return successResponse(supplier, "Supplier created");
});
