/**
 * MadrashaOS — Teacher Assignment API
 *
 * Phase B4.3 — Guardian + Teacher API
 *
 * POST /api/v1/teachers/assign
 *   Assigns a teacher to a class (+ optional section + subject) for a
 *   given academic year. Creates a TeacherAssignment row.
 *   Permission: teachers.assign
 *
 *   Body: { teacher_id, class_id, section_id?, subject_id, is_class_teacher?, academic_year?, notes? }
 *
 *   Risk R-DUP (matches the frontend duplicate-active-assignment inline
 *   rule): if the teacher is already assigned to the same class+section
 *   +subject for the same academic_year with is_active=true, the server
 *   returns 409 with a structured body so the frontend can render the
 *   "already assigned" inline AlertCard without re-fetching.
 *
 *   is_class_teacher:
 *     - When true AND section_id is provided → also set Section.teacher_id
 *       to this teacher (the "class teacher" of the section). This is the
 *       canonical way the SRS §8.x academic structure model designates
 *       class teachers (one teacher per section, stored on the Section
 *       row, not on the TeacherAssignment row).
 *     - When section_id is null → 422 (a class teacher requires a section).
 *
 *   academic_year:
 *     - Defaults to the current year (new Date().getFullYear()) so
 *       callers don't have to thread it through every form submission.
 */

import { db } from "@/lib/db";
import { getTenantContext, tenantWhere } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { assignTeacherSchema } from "@/lib/validation/schemas";
import { successResponse, errorResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/** POST /api/v1/teachers/assign */
export const POST = withPermission(
  "teachers.assign",
  async (req: Request) => {
    const ctx = await getTenantContext();
    if (!ctx) {
      return errorResponse("Unauthorized", 401);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = assignTeacherSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const data = parsed.data;
    const academicYear = data.academic_year ?? new Date().getFullYear();

    // Validate is_class_teacher requires a section_id.
    if (data.is_class_teacher && !data.section_id) {
      return errorResponse(
        "Cannot set class teacher without a section_id",
        422,
        {
          hint: "Provide section_id when is_class_teacher is true, or omit is_class_teacher.",
        },
      );
    }

    // Verify teacher + class + (optional) section + subject exist in
    // the current tenant scope. We do these as parallel findFirst calls
    // to keep latency low; the cost is N independent round-trips (4)
    // but each is fully indexed.
    const scope = tenantWhere(ctx);
    const [teacher, klass, section, subject] = await Promise.all([
      db.teacher.findFirst({
        where: { id: data.teacher_id, ...scope, deleted_at: null },
        select: {
          id: true,
          employee_code: true,
          user_id: true,
          user: { select: { name: true } },
        },
      }),
      db.class.findFirst({
        where: { id: data.class_id, ...scope, deleted_at: null },
        select: { id: true, name: true, level: true },
      }),
      data.section_id
        ? db.section.findFirst({
            where: {
              id: data.section_id,
              ...scope,
              class_id: data.class_id,
              deleted_at: null,
            },
            select: { id: true, name: true, teacher_id: true },
          })
        : Promise.resolve(null),
      db.subject.findFirst({
        where: { id: data.subject_id, ...scope, deleted_at: null },
        select: { id: true, code: true, name: true },
      }),
    ]);

    if (!teacher) {
      return errorResponse("Teacher not found in current tenant", 404);
    }
    if (!klass) {
      return errorResponse("Class not found in current tenant", 404);
    }
    if (data.section_id && !section) {
      return errorResponse(
        "Section not found in current tenant (or does not belong to the given class)",
        404,
      );
    }
    if (!subject) {
      return errorResponse("Subject not found in current tenant", 404);
    }

    // Risk R-DUP: block duplicate active assignment.
    // The unique constraint on TeacherAssignment is
    // [organization_id, academic_year, teacher_id, class_id, section_id,
    // subject_id] — we check against is_active=true explicitly so a
    // re-activation of a soft-deleted row doesn't conflict (the soft-
    // deleted row is left in place for audit history).
    const duplicate = await db.teacherAssignment.findFirst({
      where: {
        organization_id: ctx.organization_id,
        academic_year: academicYear,
        teacher_id: data.teacher_id,
        class_id: data.class_id,
        section_id: data.section_id ?? null,
        subject_id: data.subject_id,
        is_active: true,
        deleted_at: null,
      },
      select: { id: true, created_at: true },
    });
    if (duplicate) {
      return errorResponse(
        "Teacher is already assigned to this class+section+subject for the academic year",
        409,
        {
          existing_assignment_id: duplicate.id,
          existing_created_at: duplicate.created_at,
          teacher_id: data.teacher_id,
          class_id: data.class_id,
          section_id: data.section_id ?? null,
          subject_id: data.subject_id,
          academic_year: academicYear,
        },
      );
    }

    // Create the TeacherAssignment row + (optionally) set the section's
    // class teacher. Two writes — wrap in a transaction so a partial
    // failure (e.g. Section update constraint violation) doesn't leave
    // an orphan assignment row.
    const created = await db.$transaction(async (tx) => {
      const assignment = await tx.teacherAssignment.create({
        data: {
          organization_id: ctx.organization_id,
          branch_id: ctx.branch_id,
          teacher_id: data.teacher_id,
          class_id: data.class_id,
          section_id: data.section_id ?? null,
          subject_id: data.subject_id,
          academic_year: academicYear,
          is_active: true,
          notes: data.notes,
          created_by: ctx.user_id,
        },
        select: {
          id: true,
          teacher_id: true,
          class_id: true,
          section_id: true,
          subject_id: true,
          academic_year: true,
          is_active: true,
          notes: true,
          created_at: true,
        },
      });

      if (data.is_class_teacher && section && section.teacher_id !== teacher.id) {
        await tx.section.update({
          where: { id: section.id },
          data: { teacher_id: teacher.id, updated_by: ctx.user_id },
        });
      }

      return assignment;
    });

    return successResponse(
      {
        ...created,
        teacher: {
          id: teacher.id,
          employee_code: teacher.employee_code,
          name: teacher.user.name,
        },
        class: klass,
        section: section
          ? { id: section.id, name: section.name }
          : null,
        subject: subject,
        is_class_teacher: data.is_class_teacher === true,
      },
      "Teacher assigned",
    );
  },
);
