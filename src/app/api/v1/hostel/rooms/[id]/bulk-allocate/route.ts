/**
 * MadrashaOS — Hostel Bulk Allocate API
 *
 * POST /api/v1/hostel/rooms/:id/bulk-allocate
 *   Assigns multiple students to a room at once. Automatically creates
 *   beds (if needed) up to the room's capacity, then allocates each
 *   student to a vacant bed.
 *
 *   Permission: hostel.allocate
 *
 *   Body:
 *     student_ids: string[]  — UUIDs of students to assign
 *     monthly_fee: number?   — monthly fee per student (default 0)
 *
 *   Validation:
 *     - Room exists + is active in current tenant
 *     - Number of students ≤ room capacity - current occupancy
 *     - Each student exists + is active
 *     - Each student is NOT already allocated to another bed
 *     - Gender match (if room has a gender restriction)
 */

import { db } from "@/lib/db";
import { getTenantContext, tenantWhere } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const bulkAllocateSchema = z.object({
  student_ids: z.array(z.string().uuid()).min(1, "At least one student is required"),
  monthly_fee: z.number().min(0).optional().default(0),
});

export const POST = withPermission(
  "hostel.allocate",
  async (req: Request, ctx: RouteContext) => {
    const tenantCtx = await getTenantContext();
    if (!tenantCtx) return errorResponse("Unauthorized", 401);
    const { id: roomId } = await ctx.params;

    let body: unknown;
    try { body = await req.json(); } catch {
      return errorResponse("Invalid JSON", 400);
    }

    const parsed = bulkAllocateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const { student_ids, monthly_fee } = parsed.data;

    // 1. Verify room exists + is active
    const room = await db.hostelRoom.findFirst({
      where: {
        id: roomId,
        ...tenantWhere(tenantCtx),
        deleted_at: null,
        is_active: true,
      },
      include: {
        beds: {
          where: { deleted_at: null },
          select: { id: true, status: true, student_id: true, bed_number: true },
        },
      },
    });
    if (!room) return errorResponse("Room not found", 404);

    // 2. Count vacant beds
    const vacantBeds = room.beds.filter((b) => b.status === "vacant");
    const occupiedCount = room.beds.filter((b) => b.status === "occupied").length;
    const availableSlots = room.capacity - occupiedCount;

    if (student_ids.length > availableSlots) {
      return errorResponse(
        `Room ${room.room_number} has ${availableSlots} available slot(s) but you selected ${student_ids.length} student(s). Room capacity: ${room.capacity}, currently occupied: ${occupiedCount}.`,
        409,
        { room_capacity: room.capacity, occupied: occupiedCount, available: availableSlots, requested: student_ids.length },
      );
    }

    // 3. Verify each student exists + is active + not already in a bed
    const students = await db.student.findMany({
      where: {
        id: { in: student_ids },
        ...tenantWhere(tenantCtx),
        deleted_at: null,
        status: "active",
      },
      select: { id: true, name: true, code: true, gender: true },
    });

    if (students.length !== student_ids.length) {
      const found = new Set(students.map((s) => s.id));
      const missing = student_ids.filter((sid) => !found.has(sid));
      return errorResponse(
        `Some students were not found or are not active: ${missing.join(", ")}`,
        404,
      );
    }

    // 4. Check if any student is already allocated to a bed
    const existingAllocations = await db.hostelBed.findMany({
      where: {
        student_id: { in: student_ids },
        status: "occupied",
        vacated_at: null,
        deleted_at: null,
      },
      select: { student_id: true, bed_number: true, room: { select: { room_number: true } } },
    });

    if (existingAllocations.length > 0) {
      const studentMap = new Map(students.map((s) => [s.id, s.name]));
      const alreadyAllocated = existingAllocations
        .map((a) => `${studentMap.get(a.student_id) ?? "Unknown"} (Bed ${a.bed_number}, Room ${a.room.room_number})`)
        .join(", ");
      return errorResponse(
        `Some students are already allocated to a bed: ${alreadyAllocated}. Deallocate them first.`,
        409,
      );
    }

    // 5. Gender check (if room has a gender restriction)
    if (room.gender) {
      const mismatched = students.filter((s) => s.gender !== room.gender);
      if (mismatched.length > 0) {
        return errorResponse(
          `Room ${room.room_number} is for ${room.gender} students only. These students don't match: ${mismatched.map((s) => s.name).join(", ")}.`,
          409,
        );
      }
    }

    // 6. Allocate — use existing vacant beds, create new beds if needed
    const result = await db.$transaction(async (tx) => {
      const allocated: Array<{ student_id: string; student_name: string; bed_id: string; bed_number: string }> = [];
      let bedIndex = vacantBeds.length; // next bed number if we need to create new ones

      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        let bed;

        if (i < vacantBeds.length) {
          // Use an existing vacant bed
          bed = vacantBeds[i];
          await tx.hostelBed.update({
            where: { id: bed.id },
            data: {
              student_id: student.id,
              status: "occupied",
              allocated_at: new Date(),
              vacated_at: null,
              monthly_fee: monthly_fee,
              updated_by: tenantCtx.user_id,
            } as never,
          });
        } else {
          // Create a new bed
          bedIndex++;
          const bedNumber = `${bedIndex}`;
          bed = await tx.hostelBed.create({
            data: {
              organization_id: tenantCtx.organization_id,
              branch_id: tenantCtx.branch_id ?? null,
              room_id: roomId,
              bed_number: bedNumber,
              student_id: student.id,
              status: "occupied",
              allocated_at: new Date(),
              monthly_fee: monthly_fee,
              created_by: tenantCtx.user_id,
            } as never,
          });
        }

        allocated.push({
          student_id: student.id,
          student_name: student.name,
          bed_id: bed.id,
          bed_number: bed.bed_number,
        });
      }

      return allocated;
    });

    return successResponse(
      {
        room_id: roomId,
        room_number: room.room_number,
        allocated_count: result.length,
        allocations: result,
      },
      `${result.length} student(s) allocated to Room ${room.room_number}.`,
    );
  },
);
