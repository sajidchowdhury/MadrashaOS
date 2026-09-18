/**
 * MadrashaOS — Routine API (class schedule)
 *
 * Phase B5.1 — Academic Structure API
 *
 * GET  /api/v1/classes/:id/routine — list routine entries for a class
 * POST /api/v1/classes/:id/routine — create routine entry (perm: academic.structure.edit)
 *   Risk: double-booked teacher slot rejected inline (409)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

const createRoutineSchema = z.object({
  section_id: z.string().uuid().optional(),
  subject_id: z.string().uuid(),
  teacher_id: z.string().uuid(),
  academic_year: z.number().int().optional(),
  day_of_week: z.enum(DAYS),
  period_number: z.number().int().min(1).max(12),
  start_time: z.string(), // "08:00"
  end_time: z.string(),   // "08:45"
  room: z.string().max(100).optional(),
  is_break: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/v1/classes/:id/routine — list entries */
export async function GET(req: Request, ctx: RouteContext) {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id: classId } = await ctx.params;

  const url = new URL(req.url);
  const sectionId = url.searchParams.get("section_id");
  const academicYear = parseInt(url.searchParams.get("academic_year") || String(new Date().getFullYear()), 10);

  const routines = await db.routine.findMany({
    where: {
      class_id: classId,
      organization_id: tenantCtx.organization_id,
      academic_year: academicYear,
      ...(sectionId ? { section_id: sectionId } : {}),
      deleted_at: null,
    },
    orderBy: [{ day_of_week: "asc" }, { period_number: "asc" }],
    include: {
      subject: { select: { id: true, name: true, name_bn: true, code: true } },
      teacher: {
        select: {
          id: true,
          user: { select: { id: true, name: true, name_bn: true } },
        },
      },
      section: { select: { id: true, name: true } },
    },
  });

  return jsonResponse({
    data: routines.map((r) => ({
      id: r.id,
      day_of_week: r.day_of_week,
      period_number: r.period_number,
      start_time: r.start_time,
      end_time: r.end_time,
      room: r.room,
      is_break: r.is_break,
      subject: r.subject,
      teacher: r.teacher.user,
      section: r.section,
    })),
    total: routines.length,
  });
}

/** POST /api/v1/classes/:id/routine — create entry (blocks double-booked teacher) */
export const POST = withPermission("academic.structure.edit", async (req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id: classId } = await ctx.params;

  // Verify class exists
  const cls = await db.class.findFirst({
    where: { id: classId, organization_id: tenantCtx.organization_id, deleted_at: null },
  });
  if (!cls) return errorResponse("Class not found", 404);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = createRoutineSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const data = parsed.data;
  const academicYear = data.academic_year ?? new Date().getFullYear();

  // Check for double-booked teacher: same teacher, same day, same period, same academic year
  const conflict = await db.routine.findFirst({
    where: {
      teacher_id: data.teacher_id,
      academic_year: academicYear,
      day_of_week: data.day_of_week,
      period_number: data.period_number,
      organization_id: tenantCtx.organization_id,
      deleted_at: null,
    },
  });

  if (conflict) {
    return errorResponse(
      "Teacher is already assigned to another class/section at this time slot",
      409,
      {
        conflict: {
          routine_id: conflict.id,
          class_id: conflict.class_id,
          section_id: conflict.section_id,
          day: conflict.day_of_week,
          period: conflict.period_number,
        },
      },
    );
  }

  // Parse time strings into Date objects for Time columns
  const baseDate = new Date("1970-01-01");
  const startTime = new Date(`${baseDate.toISOString().split("T")[0]}T${data.start_time}:00`);
  const endTime = new Date(`${baseDate.toISOString().split("T")[0]}T${data.end_time}:00`);

  const routine = await db.routine.create({
    data: {
      organization_id: tenantCtx.organization_id,
      branch_id: cls.branch_id ?? null,
      class_id: classId,
      section_id: data.section_id ?? null,
      subject_id: data.subject_id,
      teacher_id: data.teacher_id,
      academic_year: academicYear,
      day_of_week: data.day_of_week,
      period_number: data.period_number,
      start_time: startTime,
      end_time: endTime,
      room: data.room ?? null,
      is_break: data.is_break ?? false,
      created_by: tenantCtx.user_id,
    } as never,
  });

  return successResponse(routine, "Routine entry created");
});
