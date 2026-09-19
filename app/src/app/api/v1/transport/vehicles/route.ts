/**
 * MadrashaOS — Transport Vehicles API
 *
 * Phase B7.4 — Library + Transport API
 *
 * GET  /api/v1/transport/vehicles — list vehicles (perm: transport.view)
 * POST /api/v1/transport/vehicles — create vehicle (perm: transport.record-expense)
 * GET  /api/v1/transport/vehicles/:id — single with fuel log summary
 * PATCH /api/v1/transport/vehicles/:id — update
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse, parsePagination } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createVehicleSchema = z.object({
  registration_no: z.string().min(1).max(50),
  type: z.enum(["bus", "microbus", "car", "motorcycle", "van"]),
  model: z.string().max(255).optional(),
  capacity: z.number().int().min(0).optional(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  purchase_value: z.number().min(0).optional(),
  current_driver: z.string().max(255).optional(),
  insurance_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fitness_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** GET /api/v1/transport/vehicles */
export const GET = withPermission("transport.view", async (req: Request) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const type = url.searchParams.get("type");
  const status = url.searchParams.get("status");

  const where = {
    organization_id: ctx.organization_id,
    ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}),
    deleted_at: null,
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
  };

  const [vehicles, total] = await Promise.all([
    db.vehicle.findMany({
      where,
      orderBy: { registration_no: "asc" },
      skip, take,
      include: {
        _count: { select: { fuel_logs: { where: { deleted_at: null } } } },
      },
    }),
    db.vehicle.count({ where }),
  ]);

  // Fuel cost summary
  const fuelLogs = await db.fuelLog.findMany({
    where: { organization_id: ctx.organization_id, ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}), deleted_at: null, log_type: "fuel" },
    select: { amount: true },
  });
  const totalFuelCost = fuelLogs.reduce((sum, f) => sum + Number(f.amount), 0);

  return jsonResponse({
    data: vehicles.map((v) => ({
      id: v.id,
      registration_no: v.registration_no,
      type: v.type,
      model: v.model,
      capacity: v.capacity,
      purchase_date: v.purchase_date,
      purchase_value: Number(v.purchase_value),
      current_value: Number(v.current_value),
      current_driver: v.current_driver,
      status: v.status,
      insurance_expiry: v.insurance_expiry,
      fitness_expiry: v.fitness_expiry,
      fuel_log_count: v._count.fuel_logs,
      insurance_expired: v.insurance_expiry ? new Date(v.insurance_expiry) < new Date() : false,
      fitness_expired: v.fitness_expiry ? new Date(v.fitness_expiry) < new Date() : false,
    })),
    summary: { total_vehicles: total, total_fuel_cost: totalFuelCost },
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
});

/** POST /api/v1/transport/vehicles */
export const POST = withPermission("transport.record-expense", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = createVehicleSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const existing = await db.vehicle.findFirst({
    where: { organization_id: ctx.organization_id, registration_no: parsed.data.registration_no, deleted_at: null },
  });
  if (existing) return errorResponse("Vehicle with this registration already exists", 409);

  const vehicle = await db.vehicle.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      registration_no: parsed.data.registration_no,
      type: parsed.data.type,
      model: parsed.data.model ?? null,
      capacity: parsed.data.capacity ?? 0,
      purchase_date: parsed.data.purchase_date ? new Date(parsed.data.purchase_date) : null,
      purchase_value: parsed.data.purchase_value ?? 0,
      current_value: parsed.data.purchase_value ?? 0,
      current_driver: parsed.data.current_driver ?? null,
      status: "active",
      insurance_expiry: parsed.data.insurance_expiry ? new Date(parsed.data.insurance_expiry) : null,
      fitness_expiry: parsed.data.fitness_expiry ? new Date(parsed.data.fitness_expiry) : null,
      created_by: ctx.user_id,
    } as never,
  });

  return successResponse(vehicle, "Vehicle added");
});
