/**
 * MadrashaOS — Assets API
 *
 * Phase B7.2 — Supplier + Asset API
 *
 * GET  /api/v1/assets — list assets (perm: assets.view)
 * POST /api/v1/assets — create asset (perm: assets.view)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse, parsePagination } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createAssetSchema = z.object({
  asset_code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  name_bn: z.string().optional(),
  category: z.enum(["furniture", "equipment", "it", "vehicle", "building", "other"]),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  purchase_value: z.number().min(0),
  current_value: z.number().min(0).optional(),
  depreciation_rate: z.number().min(0).max(100).optional(),
  location: z.string().max(255).optional(),
  image_url: z.string().optional(),
});

/** GET /api/v1/assets */
export const GET = withPermission("assets.view", async (req: Request) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const search = url.searchParams.get("search");
  const category = url.searchParams.get("category");
  const status = url.searchParams.get("status");

  const where = {
    organization_id: ctx.organization_id,
    ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}),
    deleted_at: null,
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    ...(category ? { category } : {}),
    ...(status ? { status } : {}),
  };

  const [assets, total] = await Promise.all([
    db.asset.findMany({
      where,
      orderBy: { purchase_date: "desc" },
      skip, take,
      include: {
        branch: { select: { id: true, name: true, code: true } },
        transferred_to_branch: { select: { id: true, name: true, code: true } },
      },
    }),
    db.asset.count({ where }),
  ]);

  // Calculate totals
  const allAssets = await db.asset.findMany({
    where: { ...where, status: { not: "disposed" } },
    select: { current_value: true, purchase_value: true },
  });
  const totalCurrentValue = allAssets.reduce((sum, a) => sum + Number(a.current_value), 0);
  const totalPurchaseValue = allAssets.reduce((sum, a) => sum + Number(a.purchase_value), 0);

  return jsonResponse({
    data: assets.map((a) => ({
      id: a.id,
      asset_code: a.asset_code,
      name: a.name,
      name_bn: a.name_bn,
      category: a.category,
      purchase_date: a.purchase_date,
      purchase_value: Number(a.purchase_value),
      current_value: Number(a.current_value),
      depreciation_rate: Number(a.depreciation_rate),
      location: a.location,
      status: a.status,
      branch: a.branch ? { id: a.branch.id, name: a.branch.name, code: a.branch.code } : null,
      transferred_to_branch: a.transferred_to_branch
        ? { id: a.transferred_to_branch.id, name: a.transferred_to_branch.name, code: a.transferred_to_branch.code }
        : null,
      transferred_at: a.transferred_at,
      disposed_at: a.disposed_at,
      disposal_reason: a.disposal_reason,
      image_url: a.image_url,
    })),
    summary: {
      total_assets: total,
      active_assets: allAssets.length,
      total_current_value: totalCurrentValue,
      total_purchase_value: totalPurchaseValue,
      total_depreciation: totalPurchaseValue - totalCurrentValue,
    },
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
});

/** POST /api/v1/assets */
export const POST = withPermission("assets.view", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = createAssetSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const data = parsed.data;

  // Check code uniqueness
  const existing = await db.asset.findFirst({
    where: { organization_id: ctx.organization_id, asset_code: data.asset_code, deleted_at: null },
  });
  if (existing) return errorResponse("Asset with this code already exists", 409);

  const asset = await db.asset.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      asset_code: data.asset_code,
      name: data.name,
      name_bn: data.name_bn ?? null,
      category: data.category,
      purchase_date: new Date(data.purchase_date),
      purchase_value: data.purchase_value,
      current_value: data.current_value ?? data.purchase_value,
      depreciation_rate: data.depreciation_rate ?? 0,
      location: data.location ?? null,
      status: "in-use",
      image_url: data.image_url ?? null,
      created_by: ctx.user_id,
    } as never,
  });

  return successResponse(asset, "Asset created");
});
