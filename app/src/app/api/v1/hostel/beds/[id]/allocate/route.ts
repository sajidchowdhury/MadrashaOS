/**
 * MadrashaOS — Hostel Bed Allocate/Deallocate API
 *
 * Phase B7.3
 *
 * POST   /api/v1/hostel/beds/:id/allocate — allocate bed to student (perm: hostel.allocate)
 *   Validates: bed is vacant → 409 if occupied; student exists; gender match
 * DELETE /api/v1/hostel/beds/:id/deallocate — vacate bed (perm: hostel.allocate)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const allocateSchema = z.object({
  student_id: z.string().uuid(),
  monthly_fee: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/v1/hostel/beds/:id/allocate */
export const POST = withPermission("hostel.allocate", async (req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id: bedId } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = allocateSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  // Get bed with room info
  const bed = await db.hostelBed.findFirst({
    where: { id: bedId, organization_id: tenantCtx.organization_id, deleted_at: null },
    include: {
      room: { select: { id: true, room_number: true, gender: true, capacity: true } },
    },
  });
  if (!bed) return errorResponse("Bed not found", 404);

  // Validate bed is vacant
  if (bed.status !== "vacant") {
    return errorResponse(
      `Bed is already ${bed.status}. Cannot allocate to a new student.`,
      409,
      { bed_status: bed.status, current_student: bed.student_id },
    );
  }

  // Verify student exists
  const student = await db.student.findFirst({
    where: { id: parsed.data.student_id, organization_id: tenantCtx.organization_id, deleted_at: null },
    select: { id: true, name: true, code: true, gender: true },
  });
  if (!student) return errorResponse("Student not found", 404);

  // Gender check (if room has a gender restriction)
  if (bed.room.gender && student.gender !== bed.room.gender) {
    return errorResponse(
      `Gender mismatch: room is ${bed.room.gender}-only but student is ${student.gender}`,
      400,
      { room_gender: bed.room.gender, student_gender: student.gender },
    );
  }

  // Allocate
  await db.hostelBed.update({
    where: { id: bedId },
    data: {
      student_id: parsed.data.student_id,
      status: "occupied",
      allocated_at: new Date(),
      monthly_fee: parsed.data.monthly_fee ?? 0,
      notes: parsed.data.notes ?? null,
      updated_by: tenantCtx.user_id,
    } as never,
  });

  // Audit log
  await db.auditLog.create({
    data: {
      organization_id: tenantCtx.organization_id,
      branch_id: tenantCtx.branch_id ?? null,
      entity_type: "hostel_beds",
      entity_id: bedId,
      action: "allocate",
      old_values: { status: "vacant", student_id: null },
      new_values: { status: "occupied", student_id: parsed.data.student_id, student_name: student.name, room: bed.room.room_number },
      actor_user_id: tenantCtx.user_id,
    } as never,
  });

  return successResponse(
    {
      bed_id: bedId,
      bed_number: bed.bed_number,
      room_number: bed.room.room_number,
      student: { id: student.id, name: student.name, code: student.code },
      status: "occupied",
      allocated_at: new Date().toISOString(),
    },
    `Bed ${bed.bed_number} in room ${bed.room.room_number} allocated to ${student.name}.`,
  );
});
