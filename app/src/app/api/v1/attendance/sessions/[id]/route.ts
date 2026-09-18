/**
 * MadrashaOS — Single Attendance Session API
 *
 * Phase B5.2 — Attendance API
 *
 * GET   /api/v1/attendance/sessions/:id — single session with all records
 * PATCH /api/v1/attendance/sessions/:id — update records (perm: attendance.take; blocked if locked)
 * DELETE /api/v1/attendance/sessions/:id — soft delete (perm: attendance.take)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateRecordsSchema = z.object({
  records: z.array(
    z.object({
      student_id: z.string().uuid(),
      status: z.enum(["present", "absent", "late", "leave"]),
      note: z.string().optional(),
    }),
  ).min(1),
});

const updateSessionSchema = z.object({
  is_locked: z.boolean().optional(),
  sync_status: z.string().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/v1/attendance/sessions/:id — single session with records */
export async function GET(_req: Request, ctx: RouteContext) {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);

  const { id } = await ctx.params;

  const session = await db.attendanceSession.findFirst({
    where: {
      id,
      organization_id: tenantCtx.organization_id,
      deleted_at: null,
    },
    include: {
      class: { select: { id: true, name: true, name_bn: true } },
      section: { select: { id: true, name: true } },
      taken_by_user: { select: { id: true, name: true, name_bn: true } },
      attendance_records: {
        include: {
          student: {
            select: { id: true, name: true, name_bn: true, code: true, roll: true },
          },
        },
        orderBy: { student: { roll: "asc" } },
      },
    },
  });

  if (!session) return errorResponse("Attendance session not found", 404);

  return jsonResponse({
    id: session.id,
    class_id: session.class_id,
    class_name: session.class.name,
    section_id: session.section_id,
    section_name: session.section?.name ?? null,
    date: session.date,
    academic_year: session.academic_year,
    period: session.period,
    taken_by: session.taken_by,
    taken_by_name: session.taken_by_user.name,
    submitted_at: session.submitted_at,
    is_locked: session.is_locked,
    device_id: session.device_id,
    sync_status: session.sync_status,
    total_present: session.total_present,
    total_absent: session.total_absent,
    records: session.attendance_records.map((r) => ({
      id: r.id,
      student_id: r.student_id,
      student_name: r.student.name,
      student_name_bn: r.student.name_bn,
      student_code: r.student.code,
      roll: r.student.roll,
      status: r.status,
      note: r.note,
      recorded_at: r.recorded_at,
    })),
    record_count: session.attendance_records.length,
  });
}

/** PATCH /api/v1/attendance/sessions/:id — update records or lock status */
export const PATCH = withPermission("attendance.take", async (req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);

  const { id } = await ctx.params;

  // Verify session exists + belongs to tenant
  const session = await db.attendanceSession.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
  });
  if (!session) return errorResponse("Attendance session not found", 404);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  // Check if this is a records update or a session-level update
  if (typeof body === "object" && body !== null && "records" in body) {
    // --- Update individual attendance records ---
    if (session.is_locked) {
      return errorResponse("Cannot modify a locked attendance session", 409);
    }

    const parsed = updateRecordsSchema.safeParse(body);
    if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

    // Update each record
    await db.$transaction(
      parsed.data.records.map((r) =>
        db.attendanceRecord.updateMany({
          where: {
            session_id: id,
            student_id: r.student_id,
            organization_id: tenantCtx.organization_id,
            deleted_at: null,
          },
          data: {
            status: r.status,
            note: r.note ?? null,
            updated_by: tenantCtx.user_id,
          } as never,
        }),
      ),
    );

    // Recalculate totals
    const records = await db.attendanceRecord.findMany({
      where: { session_id: id, deleted_at: null },
      select: { status: true },
    });
    const present = records.filter((r) => r.status === "present").length;
    const absent = records.filter((r) => r.status === "absent").length;

    await db.attendanceSession.update({
      where: { id },
      data: {
        total_present: present,
        total_absent: absent,
        updated_by: tenantCtx.user_id,
      } as never,
    });

    return successResponse(
      { total_present: present, total_absent: absent, updated: parsed.data.records.length },
      "Attendance records updated",
    );
  }

  // --- Session-level update (lock/sync_status) ---
  const parsed = updateSessionSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const updated = await db.attendanceSession.update({
    where: { id },
    data: {
      ...parsed.data,
      updated_by: tenantCtx.user_id,
    } as never,
  });

  return successResponse(updated, "Attendance session updated");
});

/** DELETE /api/v1/attendance/sessions/:id — soft delete */
export const DELETE = withPermission("attendance.take", async (_req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);

  const { id } = await ctx.params;

  const session = await db.attendanceSession.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
  });
  if (!session) return errorResponse("Attendance session not found", 404);

  if (session.is_locked) {
    return errorResponse("Cannot delete a locked attendance session", 409);
  }

  // Soft delete session + all records
  await db.$transaction([
    db.attendanceSession.update({
      where: { id },
      data: { deleted_at: new Date(), updated_by: tenantCtx.user_id } as never,
    }),
    db.attendanceRecord.updateMany({
      where: { session_id: id, deleted_at: null },
      data: { deleted_at: new Date() } as never,
    }),
  ]);

  return successResponse(null, "Attendance session deleted (soft)");
});
