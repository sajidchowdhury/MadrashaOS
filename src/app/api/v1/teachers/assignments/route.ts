/**
 * MadrashaOS — All Teacher Assignments List API
 *
 * GET /api/v1/teachers/assignments
 *   Returns ALL active TeacherAssignment records across ALL teachers,
 *   joined with teacher (user name), class, and subject names.
 *   Used by the /teachers page to render the assignments table.
 *   Permission: teachers.view
 */

import { db } from "@/lib/db";
import { getTenantContext, tenantWhere } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, parsePagination } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export const GET = withPermission(
  "teachers.view",
  async (req: Request) => {
    const ctx = await getTenantContext();
    if (!ctx) return errorResponse("Unauthorized", 401);

    const url = new URL(req.url);
    const { page, pageSize, skip, take } = parsePagination(url);
    const status = url.searchParams.get("status")?.trim() || "active";

    const where: Record<string, unknown> = {
      ...tenantWhere(ctx),
      deleted_at: null,
    };

    if (status === "active") where.is_active = true;
    else if (status === "inactive") where.is_active = false;

    const [total, assignments] = await Promise.all([
      db.teacherAssignment.count({ where }),
      db.teacherAssignment.findMany({
        where,
        orderBy: [
          { academic_year: "desc" },
          { class: { level: "asc" } },
          { subject: { name: "asc" } },
        ],
        skip,
        take,
        select: {
          id: true,
          academic_year: true,
          is_active: true,
          notes: true,
          created_at: true,
          teacher: {
            select: {
              id: true,
              employee_code: true,
              designation: true,
              user: {
                select: { id: true, name: true, name_bn: true, email: true },
              },
            },
          },
          class: {
            select: { id: true, name: true, name_bn: true, level: true },
          },
          section: {
            select: { id: true, name: true },
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
      }),
    ]);

    const data = assignments.map((a) => ({
      id: a.id,
      teacher_id: a.teacher.id,
      teacher_name: a.teacher.user.name,
      teacher_name_bn: a.teacher.user.name_bn,
      teacher_email: a.teacher.user.email,
      employee_code: a.teacher.employee_code,
      designation: a.teacher.designation,
      class_id: a.class.id,
      class_name: a.class.name,
      class_name_bn: a.class.name_bn,
      section_id: a.section?.id ?? null,
      section_name: a.section?.name ?? null,
      subject_id: a.subject.id,
      subject_name: a.subject.name,
      subject_name_bn: a.subject.name_bn,
      subject_code: a.subject.code,
      is_quranic: a.subject.is_quranic,
      academic_year: a.academic_year,
      is_active: a.is_active,
      notes: a.notes,
    }));

    return jsonResponse({
      data,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  },
);
