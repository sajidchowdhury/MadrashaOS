/**
 * MadrashaOS — Results API
 *
 * Phase B5.4 — Results API (mark sheet + GPA)
 *
 * GET /api/v1/results — list results (perm: results.view)
 *
 * Supports filtering by exam_id, class_id (via exam join), student_id.
 * Risk R7: position column is conditional — only included when
 * `ranking_enabled` query param is true.
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { jsonResponse, errorResponse, parsePagination } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/** GET /api/v1/results — list results */
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const examId = url.searchParams.get("exam_id");
  const studentId = url.searchParams.get("student_id");
  const classId = url.searchParams.get("class_id");
  const rankingEnabled = url.searchParams.get("ranking_enabled") === "true";

  // Build where clause
  const where: Record<string, unknown> = {
    organization_id: ctx.organization_id,
    deleted_at: null,
    ...(examId ? { exam_id: examId } : {}),
    ...(studentId ? { student_id: studentId } : {}),
  };

  // Filter by class_id via exam relation
  if (classId) {
    where.exam = { class_id: classId, deleted_at: null };
  }

  const [results, total] = await Promise.all([
    db.result.findMany({
      where,
      orderBy: rankingEnabled
        ? [{ position: "asc" }, { total_marks: "desc" }]
        : [{ total_marks: "desc" }],
      skip,
      take,
      include: {
        student: {
          select: { id: true, name: true, name_bn: true, code: true, roll: true, class_id: true },
        },
        exam: {
          select: { id: true, name: true, term: true, academic_year: true, class_id: true },
        },
      },
    }),
    db.result.count({ where }),
  ]);

  return jsonResponse({
    data: results.map((r) => {
      // Risk R7: position column is conditional — omit when ranking disabled
      const base: Record<string, unknown> = {
        id: r.id,
        student_id: r.student_id,
        student_name: r.student.name,
        student_name_bn: r.student.name_bn,
        student_code: r.student.code,
        roll: r.student.roll,
        exam_id: r.exam_id,
        exam_name: r.exam.name,
        term: r.exam.term,
        academic_year: r.exam.academic_year,
        total_marks: Number(r.total_marks),
        gpa: Number(r.gpa),
        grade: r.grade,
        is_passed: r.is_passed,
        division: r.division,
        remark: r.remark,
        generated_at: r.generated_at,
      };
      // Only include position when ranking is enabled (Risk R7)
      if (rankingEnabled) {
        base.position = r.position;
      }
      return base;
    }),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}
