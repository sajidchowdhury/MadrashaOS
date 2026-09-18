/**
 * MadrashaOS — Hostel Rooms API
 *
 * Phase B7.3 — Hostel + Food/Meal API
 *
 * GET  /api/v1/hostel/rooms — list rooms with occupancy (perm: hostel.view)
 * POST /api/v1/hostel/rooms — create room (perm: hostel.allocate)
 * GET  /api/v1/hostel/rooms/:id — single with beds + occupancy
 * PATCH /api/v1/hostel/rooms/:id — update
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse, parsePagination } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createRoomSchema = z.object({
  room_number: z.string().min(1).max(50),
  building: z.string().max(100).optional(),
  floor: z.number().int().min(0).max(50).optional(),
  capacity: z.number().int().min(1).max(20).optional(),
  gender: z.enum(["male", "female"]).optional(),
  notes: z.string().optional(),
  auto_create_beds: z.number().int().min(0).max(20).optional(), // auto-create N beds
});

/** GET /api/v1/hostel/rooms — list with occupancy */
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const building = url.searchParams.get("building");
  const floor = url.searchParams.get("floor");
  const gender = url.searchParams.get("gender");

  const where = {
    organization_id: ctx.organization_id,
    ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}),
    deleted_at: null,
    ...(building ? { building } : {}),
    ...(floor ? { floor: parseInt(floor, 10) } : {}),
    ...(gender ? { gender } : {}),
  };

  const [rooms, total] = await Promise.all([
    db.hostelRoom.findMany({
      where,
      orderBy: [{ floor: "asc" }, { room_number: "asc" }],
      skip, take,
      include: {
        beds: {
          where: { deleted_at: null },
          select: {
            id: true, bed_number: true, status: true,
            student: { select: { id: true, name: true, name_bn: true, code: true } },
            allocated_at: true, monthly_fee: true,
          },
        },
        _count: { select: { beds: { where: { deleted_at: null, status: "occupied" } } } },
      },
    }),
    db.hostelRoom.count({ where }),
  ]);

  // Summary
  const allBeds = await db.hostelBed.findMany({
    where: { organization_id: ctx.organization_id, ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}), deleted_at: null },
    select: { status: true },
  });
  const occupied = allBeds.filter((b) => b.status === "occupied").length;
  const vacant = allBeds.filter((b) => b.status === "vacant").length;
  const maintenance = allBeds.filter((b) => b.status === "maintenance").length;

  return jsonResponse({
    data: rooms.map((r) => ({
      id: r.id,
      room_number: r.room_number,
      building: r.building,
      floor: r.floor,
      capacity: r.capacity,
      gender: r.gender,
      is_active: r.is_active,
      notes: r.notes,
      occupied_count: r._count.beds,
      vacant_count: r.beds.filter((b) => b.status === "vacant").length,
      beds: r.beds.map((b) => ({
        id: b.id,
        bed_number: b.bed_number,
        status: b.status,
        student: b.student,
        allocated_at: b.allocated_at,
        monthly_fee: Number(b.monthly_fee),
      })),
    })),
    summary: {
      total_rooms: total,
      total_beds: allBeds.length,
      occupied,
      vacant,
      maintenance,
      occupancy_rate: allBeds.length > 0 ? Math.round((occupied / allBeds.length) * 100) : 0,
    },
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

/** POST /api/v1/hostel/rooms — create room (+ optional auto-create beds) */
export const POST = withPermission("hostel.allocate", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = createRoomSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const data = parsed.data;

  // Check room_number uniqueness
  const existing = await db.hostelRoom.findFirst({
    where: { organization_id: ctx.organization_id, ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}), room_number: data.room_number, deleted_at: null },
  });
  if (existing) return errorResponse("Room with this number already exists", 409);

  // Create room + auto-create beds in transaction
  const result = await db.$transaction(async (tx) => {
    const room = await tx.hostelRoom.create({
      data: {
        organization_id: ctx.organization_id,
        branch_id: ctx.branch_id ?? null,
        room_number: data.room_number,
        building: data.building ?? null,
        floor: data.floor ?? 1,
        capacity: data.capacity ?? 4,
        gender: data.gender ?? null,
        notes: data.notes ?? null,
        is_active: true,
        created_by: ctx.user_id,
      } as never,
    });

    // Auto-create beds if requested
    if (data.auto_create_beds && data.auto_create_beds > 0) {
      for (let i = 1; i <= data.auto_create_beds; i++) {
        await tx.hostelBed.create({
          data: {
            organization_id: ctx.organization_id,
            branch_id: ctx.branch_id ?? null,
            room_id: room.id,
            bed_number: `${data.room_number}-${i}`,
            status: "vacant",
            created_by: ctx.user_id,
          } as never,
        });
      }
    }

    return room;
  });

  return successResponse(result, `Room ${data.room_number} created${data.auto_create_beds ? ` with ${data.auto_create_beds} beds` : ""}`);
});
