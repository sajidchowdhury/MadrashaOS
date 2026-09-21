/**
 * MadrashaOS — Single Student Results API
 *
 * Phase B5.4 — Results API
 *
 * GET /api/v1/results/:studentId — all results for a student (mark sheet)
 *   - Permission: results.view OR results.view.own (student/guardian sees own/child only)
 *   - Returns full mark sheet with per-subject breakdown
 *   - Risk R7: position column conditional on ranking_enabled
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withAnyPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ studentId: string }> };

/** GET /api/v1/results/:studentId — student mark sheet */
export const GET = withAnyPermission(
  ["results.view", "results.view.own"],
  async (req: Request, ctx: RouteContext) => {
    const tenantCtx = await getTenantContext();
    if (!tenantCtx) return errorResponse("Unauthorized", 401);

    const { studentId } = await ctx.params;
    const url = new URL(req.url);
    const rankingEnabled = url.searchParams.get("ranking_enabled") === "true";

    // Verify student exists + belongs to tenant
    const student = await db.student.findFirst({
      where: {
        id: studentId,
        organization_id: tenantCtx.organization_id,
        deleted_at: null,
      },
      select: {
        id: true, name: true, name_bn: true, name_ar: true, code: true, roll: true,
        class_id: true, section_id: true, gender: true, dob: true,
        class: { select: { id: true, name: true, name_bn: true } },
        section: { select: { id: true, name: true } },
        // Guardian info via the student_guardians junction (the Student
        // model has no direct `guardian` field — it links through the
        // StudentGuardian junction table).
        student_guardians: {
          where: { is_primary: true, deleted_at: null },
          take: 1,
          select: {
            relation: true,
            guardian: { select: { id: true, name: true, name_bn: true, phone: true } },
          },
        },
      },
    });

    if (!student) return errorResponse("Student not found", 404);

    // Flatten the primary guardian for the response shape
    const primaryGuardian = student.student_guardians[0]?.guardian;

    // --- Session 5.5: Guardian/Student scope check (security fix) ---
    // If the user has results.view.own but NOT results.view, they can only
    // see results for students linked to their own Guardian row.
    // This prevents a guardian from passing any studentId UUID and viewing
    // another family's results — a data-leak security gap.
    const isOwnOnly =
      !tenantCtx.permissions.includes("results.view") &&
      tenantCtx.permissions.includes("results.view.own");

    if (isOwnOnly) {
      // Find the Guardian row linked to the current user, then check if
      // this student is one of their children via the student_guardians junction.
      const guardian = await db.guardian.findFirst({
        where: {
          user_id: tenantCtx.user_id,
          deleted_at: null,
        },
        select: {
          id: true,
          student_guardians: {
            where: { student_id: studentId, deleted_at: null },
            select: { id: true },
          },
        },
      });

      // If no guardian row exists for this user, OR the student is not
      // linked to this guardian's children → deny (404, not 403, so
      // attackers can't enumerate student IDs).
      if (!guardian || guardian.student_guardians.length === 0) {
        return errorResponse("Student not found", 404);
      }
    }

    // Get all results for this student
    const results = await db.result.findMany({
      where: {
        student_id: studentId,
        organization_id: tenantCtx.organization_id,
        deleted_at: null,
      },
      orderBy: { exam: { exam_date: "desc" } },
      include: {
        exam: {
          select: {
            id: true, name: true, name_bn: true, term: true, academic_year: true,
            exam_date: true, full_marks: true, status: true,
          },
        },
      },
    });

    // For each exam, get the per-subject marks breakdown
    const examIds = results.map((r) => r.exam_id);
    const marks = examIds.length > 0
      ? await db.mark.findMany({
          where: {
            student_id: studentId,
            exam_id: { in: examIds },
            deleted_at: null,
          },
          include: {
            subject: { select: { id: true, name: true, name_bn: true, code: true, full_marks: true, pass_marks: true } },
            exam: { select: { id: true, name: true } },
          },
        })
      : [];

    // Group marks by exam
    const marksByExam = marks.reduce((acc, m) => {
      const key = m.exam_id;
      if (!acc[key]) acc[key] = [];
      acc[key].push({
        subject_id: m.subject_id,
        subject_name: m.subject.name,
        subject_name_bn: m.subject.name_bn,
        subject_code: m.subject.code,
        marks_obtained: Number(m.marks_obtained),
        full_marks: m.subject.full_marks,
        pass_marks: m.subject.pass_marks,
        grade: m.grade,
        gpa: m.gpa ? Number(m.gpa) : null,
        is_absent: m.is_absent,
        remark: m.remark,
      });
      return acc;
    }, {} as Record<string, Array<Record<string, unknown>>>);

    return jsonResponse({
      student: {
        id: student.id,
        name: student.name,
        name_bn: student.name_bn,
        name_ar: student.name_ar,
        code: student.code,
        roll: student.roll,
        gender: student.gender,
        dob: student.dob,
        class_name: student.class.name,
        class_name_bn: student.class.name_bn,
        section_name: student.section?.name ?? null,
        guardian_name: primaryGuardian?.name ?? null,
      },
      results: results.map((r) => {
        const base: Record<string, unknown> = {
          exam_id: r.exam_id,
          exam_name: r.exam.name,
          exam_name_bn: r.exam.name_bn,
          term: r.exam.term,
          academic_year: r.exam.academic_year,
          exam_date: r.exam.exam_date,
          full_marks: r.exam.full_marks,
          exam_status: r.exam.status,
          total_marks: Number(r.total_marks),
          gpa: Number(r.gpa),
          grade: r.grade,
          is_passed: r.is_passed,
          division: r.division,
          remark: r.remark,
          generated_at: r.generated_at,
          subjects: marksByExam[r.exam_id] || [],
        };
        if (rankingEnabled) {
          base.position = r.position;
        }
        return base;
      }),
      ranking_enabled: rankingEnabled,
    });
  },
);
