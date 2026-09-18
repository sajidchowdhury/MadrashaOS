/**
 * MadrashaOS — Inventory API
 *
 * Phase B7.1 — Inventory + Purchase API
 *
 * GET  /api/v1/inventory — list items (perm: inventory.view)
 * POST /api/v1/inventory — create item (perm: inventory.receive)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse, parsePagination } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createItemSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  name_bn: z.string().optional(),
  category: z.string().min(1),
  unit: z.string().default("piece"),
  qty_in_stock: z.number().min(0).optional(),
  reorder_level: z.number().min(0).optional(),
  unit_cost: z.number().min(0).optional(),
  storage_location: z.string().optional(),
  description: z.string().optional(),
});

/** GET /api/v1/inventory */
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const search = url.searchParams.get("search");
  const category = url.searchParams.get("category");
  const lowStock = url.searchParams.get("low_stock") === "true";

  const where = {
    organization_id: ctx.organization_id,
    ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}),
    deleted_at: null,
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    ...(category ? { category } : {}),
  };

  const [items, total] = await Promise.all([
    db.inventoryItem.findMany({
      where: lowStock ? { ...where, qty_in_stock: { lte: db.inventoryItem.fields.reorder_level } } as never : where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
      skip, take,
    }),
    db.inventoryItem.count({ where }),
  ]);

  // For low_stock filter, filter in JS (Prisma can't do cross-field comparison in where)
  const filtered = lowStock
    ? items.filter((i) => Number(i.qty_in_stock) <= Number(i.reorder_level))
    : items;

  return jsonResponse({
    data: filtered.map((i) => ({
      id: i.id,
      code: i.code,
      name: i.name,
      name_bn: i.name_bn,
      category: i.category,
      unit: i.unit,
      qty_in_stock: Number(i.qty_in_stock),
      reorder_level: Number(i.reorder_level),
      unit_cost: Number(i.unit_cost),
      storage_location: i.storage_location,
      is_active: i.is_active,
      description: i.description,
      is_low_stock: Number(i.qty_in_stock) <= Number(i.reorder_level),
    })),
    pagination: { page, pageSize, total: filtered.length, totalPages: Math.ceil(filtered.length / pageSize) },
  });
}

/** POST /api/v1/inventory */
export const POST = withPermission("inventory.receive", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = createItemSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const existing = await db.inventoryItem.findFirst({
    where: { organization_id: ctx.organization_id, code: parsed.data.code, deleted_at: null },
  });
  if (existing) return errorResponse("Item with this code already exists", 409);

  const item = await db.inventoryItem.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      code: parsed.data.code,
      name: parsed.data.name,
      name_bn: parsed.data.name_bn ?? null,
      category: parsed.data.category,
      unit: parsed.data.unit,
      qty_in_stock: parsed.data.qty_in_stock ?? 0,
      reorder_level: parsed.data.reorder_level ?? 0,
      unit_cost: parsed.data.unit_cost ?? 0,
      storage_location: parsed.data.storage_location ?? null,
      description: parsed.data.description ?? null,
      is_active: true,
      created_by: ctx.user_id,
    } as never,
  });

  return successResponse(item, "Inventory item created");
});
