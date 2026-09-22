/**
 * MadrashaOS — Student Promotion API
 *
 * Task B4.1 — Student API (CRUD + promotion + history)
 *
 * POST /api/v1/students/:id/promote
 *   Promote / reassign a student to a new (class, section) starting on
 *   `effective_date`. The OLD assignment is preserved as an immutable
 *   row in StudentHistory (action="promoted") — Risk R4 lock-in:
 *   "Promotion wizard shows history timeline panel on right; old
 *   assignment rendered as past chip, not deleted."
 *
 *   Permission: students.promote
 *   Body (promoteStudentSchema):
 *     {
 *       to_class_id:    UUID,            // required
 *       to_section_id:  UUID?,           // optional (some classes have no sections)
 *       effective_date: ISO date string, // when the new assignment takes effect
 *       reason:         string           // 1..1000 chars (stored in StudentHistory.remark)
 *     }
 *
 *   Side effects:
 *     1. INSERT StudentHistory { action: "promoted",
 *                                from_class_id: <current class>,
 *                                from_section_id: <current section>,
 *                                to_class_id: <payload.to_class_id>,
 *                                to_section_id: <payload.to_section_id>,
 *                                effective_date, remark: reason }
 *     2. UPDATE Student SET class_id, section_id = payload.to_*  (also
 *        bumps updated_by + updated_at)
 *
 *   The two writes are wrapped in `db.$transaction` so a partial
 *   failure (e.g. constraint violation on the UPDATE) rolls back the
 *   history INSERT — guaranteeing the timeline never lies about the
 *   student's current assignment.
 *
 *   Idempotency: promoting to the SAME (class, section) as currently
 *   assigned is allowed (no-op UPDATE) but still logs a history row —
 *   the wizard may use this to record a "confirmed retention" event.
 */

import { db } from "@/lib/db";
import { getTenantContext, tenantWhere } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { promoteStudentSchema } from "@/lib/validation/schemas";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/** POST /api/v1/students/:id/promote — promote / reassign student. */
export const POST = withPermission(
  "students.promote",
  async (req, { params }) => {
    const ctx = await getTenantContext();
    if (!ctx) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await params;

    // Guard: invalid UUID → 404 (prevents Prisma 500)
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(id)) {
      return errorResponse("Student not found", 404);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = promoteStudentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const data = parsed.data;

    // Fetch the student (tenant-scoped) to capture the current assignment
    // BEFORE promoting — we need from_class_id + from_section_id for the
    // StudentHistory row, and we need to verify the student exists.
    const student = await db.student.findFirst({
      where: { id, ...tenantWhere(ctx), deleted_at: null },
      select: {
        id: true,
        code: true,
        name: true,
        roll: true,
        class_id: true,
        section_id: true,
      },
    });
    if (!student) {
      return errorResponse("Student not found", 404);
    }

    // Verify the destination class belongs to the org.
    const toClass = await db.class.findFirst({
      where: {
        id: data.to_class_id,
        organization_id: ctx.organization_id,
        deleted_at: null,
      },
      select: { id: true, name: true, name_bn: true },
    });
    if (!toClass) {
      return errorResponse(
        "Destination class not found in current organization",
        404,
      );
    }

    // Verify the destination section (if provided) belongs to the dest
    // class in the org.
    let toSection: { id: string; name: string } | null = null;
    if (data.to_section_id) {
      toSection = await db.section.findFirst({
        where: {
          id: data.to_section_id,
          organization_id: ctx.organization_id,
          class_id: data.to_class_id,
          deleted_at: null,
        },
        select: { id: true, name: true },
      });
      if (!toSection) {
        return errorResponse(
          "Destination section not found in current organization / class",
          404,
        );
      }
    }

    // Roll-number collision check on the destination section — the
    // `@@unique([section_id, roll])` index would otherwise throw a
    // raw P2002. The student keeps their existing `roll` after
    // promotion (reassigning rolls is a separate explicit operation
    // out of scope for B4.1), so if there's already another student in
    // the destination section with the same roll, we 409 here. We
    // only need to check when the destination section differs from
    // the student's current section.
    if (
      data.to_section_id &&
      data.to_section_id !== student.section_id
    ) {
      const clash = await db.student.findFirst({
        where: {
          section_id: data.to_section_id,
          roll: student.roll,
          id: { not: student.id },
          deleted_at: null,
        },
        select: { id: true, name: true },
      });
      if (clash) {
        return errorResponse(
          `Roll number ${student.roll} is already taken by another student (${clash.name}) in the destination section`,
          409,
        );
      }
    }

    const academicYear =
      data.effective_date instanceof Date
        ? data.effective_date.getFullYear()
        : new Date(data.effective_date).getFullYear();

    // Wrap history INSERT + student UPDATE in a transaction so the
    // timeline stays consistent with the live Student row.
    const [historyRow] = await db.$transaction([
      // 1. History record (the "past chip" in the wizard timeline).
      //    `from_*` is the OLD assignment; `to_*` is the NEW assignment.
      //    This row is never deleted (Risk R4 invariant).
      db.studentHistory.create({
        data: {
          organization_id: ctx.organization_id,
          branch_id: ctx.branch_id,
          student_id: student.id,
          academic_year: academicYear,
          from_class_id: student.class_id,
          from_section_id: student.section_id,
          to_class_id: data.to_class_id,
          to_section_id: data.to_section_id ?? null,
          action: "promoted",
          remark: data.reason,
          effective_date: data.effective_date,
          action_by: ctx.user_id,
          created_by: ctx.user_id,
        },
      }),
      // 2. Move the Student row to the new assignment.
      db.student.update({
        where: { id: student.id },
        data: {
          class_id: data.to_class_id,
          section_id: data.to_section_id ?? null,
          updated_by: ctx.user_id,
        },
        select: {
          id: true,
          code: true,
          name: true,
          class_id: true,
          section_id: true,
          status: true,
          updated_at: true,
        },
      }),
    ]);

    return successResponse(
      {
        student_id: student.id,
        student_code: student.code,
        student_name: student.name,
        from_class_id: student.class_id,
        from_section_id: student.section_id,
        to_class_id: data.to_class_id,
        to_section_id: data.to_section_id ?? null,
        effective_date: data.effective_date,
        reason: data.reason,
        history_id: historyRow.id,
      },
      "Student promoted",
    );
  },
);
