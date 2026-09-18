/**
 * MadrashaOS — Teacher Assignments List API
 *
 * Phase B4.3 — Guardian + Teacher API
 *
 * GET /api/v1/teachers/:id/assignments
 *   Returns the array of TeacherAssignment records for the given
 *   teacher, joined with class + section + subject names so the
 *   frontend can render the assignments table without a second round
 *   trip.
 *   Permission: teachers.view
 *
 *   Query params:
 *     - status  → "active" | "inactive" | "all" (default: active)
 *     - year    → integer academic year filter
 */

import { db } from "@/lib/db";
import { getTenantContext, tenantWhere } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/** GET /api/v1/teachers/:id/assignments */
export const GET = withPermission(
  "teachers.view",
  async (
    req: Request,
    ctx: { params: Promise<{ id: string }> },
  ) => {
    const tenantCtx = await getTenantContext();
    if (!tenantCtx) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await ctx.params;

    // Verify the teacher belongs to the current tenant.
    const teacher = await db.teacher.findFirst({
      where: {
        id,
        ...tenantWhere(tenantCtx),
        deleted_at: null,
      },
      select: {
        id: true,
        employee_code: true,
        designation: true,
        specialization: true,
        user_id: true,
        user: { select: { name: true, name_bn: true } },
      },
    });
    if (!teacher) {
      return errorResponse("Teacher not found", 404);
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status")?.trim() || "active";
    const yearStr = url.searchParams.get("year")?.trim();
    const year = yearStr ? parseInt(yearStr, 10) : undefined;

    const where: Record<string, unknown> = {
      teacher_id: id,
      organization_id: tenantCtx.organization_id,
      deleted_at: null,
    };

    if (status === "active") where.is_active = true;
    else if (status === "inactive") where.is_active = false;
    // status === "all" → no is_active filter

    if (year !== undefined && !Number.isNaN(year)) {
      where.academic_year = year;
    }

    const assignments = await db.teacherAssignment.findMany({
      where,
      orderBy: [
        { academic_year: "desc" },
        { class: { level: "asc" } },
        { subject: { name: "asc" } },
      ],
      select: {
        id: true,
        academic_year: true,
        is_active: true,
        notes: true,
        created_at: true,
        updated_at: true,
        class: {
          select: { id: true, name: true, name_bn: true, level: true },
        },
        section: {
          select: { id: true, name: true, room: true, teacher_id: true },
        },
        subject: {
          select: {
            id: true,
            code: true,
            name: true,
            name_bn: true,
            is_quranic: true,
            category: true,
          },
        },
      },
    });

    const data = assignments.map((a) => ({
      id: a.id,
      academic_year: a.academic_year,
      is_active: a.is_active,
      notes: a.notes,
      created_at: a.created_at,
      updated_at: a.updated_at,
      class: a.class,
      section: a.section,
      subject: a.subject,
      is_class_teacher:
        a.section !== null && a.section.teacher_id === teacher.id,
    }));

    return jsonResponse({
      teacher: {
        id: teacher.id,
        employee_code: teacher.employee_code,
        name: teacher.user.name,
        name_bn: teacher.user.name_bn,
        designation: teacher.designation,
        specialization: teacher.specialization,
      },
      assignments: data,
      total: data.length,
      active_count: data.filter((a) => a.is_active).length,
    });
  },
);
