/**
 * MadrashaOS — Meal Plans API
 *
 * Phase B7.3 — Hostel + Food/Meal API
 *
 * GET  /api/v1/food/meal-plans — list meal plans (perm: food.meal-plan)
 * POST /api/v1/food/meal-plans — create meal plan (perm: food.meal-plan)
 * GET  /api/v1/food/meal-plans/:id — single
 * PATCH /api/v1/food/meal-plans/:id — update
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse, parsePagination } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createMealPlanSchema = z.object({
  meal_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  menu: z.string().min(1).max(500),
  menu_bn: z.string().optional(),
  head_count: z.number().int().min(0),
  cost_per_head: z.number().min(0).optional(),
  notes: z.string().optional(),
});

/** GET /api/v1/food/meal-plans */
export const GET = withPermission("food.meal-plan", async (req: Request) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const mealDate = url.searchParams.get("meal_date");
  const mealType = url.searchParams.get("meal_type");
  const dateFrom = url.searchParams.get("date_from");
  const dateTo = url.searchParams.get("date_to");

  const where = {
    organization_id: ctx.organization_id,
    ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}),
    deleted_at: null,
    ...(mealDate ? { meal_date: new Date(mealDate) } : {}),
    ...(mealType ? { meal_type } : {}),
    ...(dateFrom || dateTo
      ? { meal_date: { ...(dateFrom ? { gte: new Date(dateFrom) } : {}), ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}) } }
      : {}),
  };

  const [plans, total] = await Promise.all([
    db.mealPlan.findMany({
      where,
      orderBy: [{ meal_date: "desc" }, { meal_type: "asc" }],
      skip, take,
      include: { preparer: { select: { id: true, name: true } } },
    }),
    db.mealPlan.count({ where }),
  ]);

  // Weekly cost summary
  const allPlans = await db.mealPlan.findMany({
    where: { ...where, deleted_at: null },
    select: { total_cost: true, meal_type: true },
  });
  const totalCost = allPlans.reduce((sum, p) => sum + Number(p.total_cost), 0);

  return jsonResponse({
    data: plans.map((p) => ({
      id: p.id,
      meal_date: p.meal_date,
      meal_type: p.meal_type,
      menu: p.menu,
      menu_bn: p.menu_bn,
      head_count: p.head_count,
      cost_per_head: Number(p.cost_per_head),
      total_cost: Number(p.total_cost),
      prepared_by: p.preparer?.name ?? null,
      notes: p.notes,
    })),
    summary: { total_meals: total, total_cost: totalCost },
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
});

/** POST /api/v1/food/meal-plans */
export const POST = withPermission("food.meal-plan", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = createMealPlanSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const data = parsed.data;
  const totalCost = data.head_count * (data.cost_per_head ?? 0);

  // Check uniqueness (org + branch + date + meal_type)
  const existing = await db.mealPlan.findFirst({
    where: {
      organization_id: ctx.organization_id,
      ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}),
      meal_date: new Date(data.meal_date),
      meal_type: data.meal_type,
      deleted_at: null,
    },
  });
  if (existing) return errorResponse("Meal plan already exists for this date and meal type", 409);

  const plan = await db.mealPlan.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      meal_date: new Date(data.meal_date),
      meal_type: data.meal_type,
      menu: data.menu,
      menu_bn: data.menu_bn ?? null,
      head_count: data.head_count,
      cost_per_head: data.cost_per_head ?? 0,
      total_cost: totalCost,
      prepared_by: ctx.user_id,
      notes: data.notes ?? null,
      created_by: ctx.user_id,
    } as never,
  });

  return successResponse(plan, "Meal plan created");
});
