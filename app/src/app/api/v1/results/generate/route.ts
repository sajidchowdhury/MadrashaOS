/**
 * MadrashaOS — Results Generation API
 *
 * Phase B5.4 — Results API
 *
 * POST /api/v1/results/generate — generate results for an exam
 *   - Permission: results.generate
 *   - Computes total_marks + GPA + grade + division + position for each student
 *   - Risk R7: position only assigned when ranking_enabled = true in request body
 *   - Only works on published exams (409 if exam not published)
 *   - Upserts results (re-generating replaces existing)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const generateResultsSchema = z.object({
  exam_id: z.string().uuid(),
  ranking_enabled: z.boolean().optional().default(false),
});

/** GPA calculation table (Bangladesh madrasha grading system) */
function calculateGpaAndGrade(marksPercentage: number): { gpa: number; grade: string } {
  if (marksPercentage >= 80) return { gpa: 5.0, grade: "a_plus" };
  if (marksPercentage >= 70) return { gpa: 4.0, grade: "a" };
  if (marksPercentage >= 60) return { gpa: 3.5, grade: "b" };
  if (marksPercentage >= 50) return { gpa: 3.0, grade: "c" };
  if (marksPercentage >= 40) return { gpa: 2.0, grade: "d" };
  return { gpa: 0.0, grade: "f" };
}

function calculateDivision(isPassed: boolean, gpa: number): string | null {
  if (!isPassed) return null;
  if (gpa >= 4.5) return "first";
  if (gpa >= 3.0) return "second";
  return "third";
}

/** POST /api/v1/results/generate — generate results for an exam */
export const POST = withPermission("results.generate", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = generateResultsSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const { exam_id, ranking_enabled } = parsed.data;

  // Verify exam exists + is published
  const exam = await db.exam.findFirst({
    where: { id: exam_id, organization_id: ctx.organization_id, deleted_at: null },
    select: {
      id: true,
      name: true,
      status: true,
      full_marks: true,
      pass_marks: true,
      class_id: true,
      subject_id: true,
    },
  });

  if (!exam) return errorResponse("Exam not found", 404);
  if (exam.status !== "published") {
    return errorResponse("Cannot generate results for an unpublished exam. Publish it first.", 409);
  }

  // Get all marks for this exam
  const marks = await db.mark.findMany({
    where: { exam_id, deleted_at: null },
    include: {
      student: { select: { id: true, name: true, code: true, roll: true } },
      subject: { select: { id: true, full_marks: true, pass_marks: true } },
    },
  });

  if (marks.length === 0) {
    return errorResponse("No marks found for this exam. Enter marks first.", 400);
  }

  // Group marks by student
  const studentMarks = marks.reduce((acc, m) => {
    if (!acc[m.student_id]) {
      acc[m.student_id] = {
        student_id: m.student_id,
        student_name: m.student.name,
        student_code: m.student.code,
        roll: m.student.roll,
        marks: [],
        total_obtained: 0,
        total_full: 0,
        is_absent_any: false,
      };
    }
    const entry = acc[m.student_id];
    if (!m.is_absent) {
      entry.marks.push(m);
      entry.total_obtained += Number(m.marks_obtained);
    } else {
      entry.is_absent_any = true;
    }
    entry.total_full += m.subject.full_marks;
    return acc;
  }, {} as Record<string, {
    student_id: string;
    student_name: string;
    student_code: string;
    roll: number;
    marks: typeof marks;
    total_obtained: number;
    total_full: number;
    is_absent_any: boolean;
  }>);

  // Calculate results for each student
  const resultsToCreate = Object.values(studentMarks).map((sm) => {
    const percentage = sm.total_full > 0 ? (sm.total_obtained / sm.total_full) * 100 : 0;
    const { gpa, grade } = calculateGpaAndGrade(percentage);
    const isPassed = !sm.is_absent_any && sm.marks.every(
      (m) => Number(m.marks_obtained) >= m.subject.pass_marks,
    );
    const division = calculateDivision(isPassed, gpa);

    return {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      exam_id,
      student_id: sm.student_id,
      total_marks: sm.total_obtained,
      gpa,
      grade,
      is_passed: isPassed,
      division,
      generated_by: ctx.user_id,
      remark: isPassed ? null : "Failed in one or more subjects",
      created_by: ctx.user_id,
    };
  });

  // Sort by total_marks DESC for position assignment (if ranking enabled)
  resultsToCreate.sort((a, b) => Number(b.total_marks) - Number(a.total_marks));

  // Assign positions if ranking is enabled (Risk R7)
  if (ranking_enabled) {
    let position = 1;
    let prevMarks: number | null = null;
    let sameRankCount = 0;

    for (const result of resultsToCreate) {
      const currentMarks = Number(result.total_marks);
      if (prevMarks !== null && currentMarks === prevMarks) {
        // Same marks = same position (tie)
        sameRankCount++;
      } else {
        position += sameRankCount;
        sameRankCount = 0;
        prevMarks = currentMarks;
      }
      // We'll set position via a separate update since Prisma createMany doesn't support
      // per-row conditional fields easily in a bulk operation.
      (result as Record<string, unknown>).position = position;
      position++;
    }
  }

  // Delete existing results for this exam (re-generation replaces)
  await db.result.deleteMany({
    where: { exam_id, organization_id: ctx.organization_id },
  });

  // Create new results in bulk
  const created = await db.result.createMany({
    data: resultsToCreate.map((r) => ({
      ...r,
      position: (r as Record<string, unknown>).position as number | null ?? null,
    })) as never,
  });

  // Audit log
  await db.auditLog.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      entity_type: "results",
      entity_id: exam_id,
      action: "generate",
      old_values: null,
      new_values: {
        exam_id,
        exam_name: exam.name,
        results_count: created.count,
        ranking_enabled,
      },
      actor_id: ctx.user_id,
    } as never,
  });

  // Build response summary
  const passedCount = resultsToCreate.filter((r) => r.is_passed).length;
  const failedCount = resultsToCreate.length - passedCount;
  const avgGpa = resultsToCreate.reduce((sum, r) => sum + r.gpa, 0) / resultsToCreate.length;

  return successResponse(
    {
      exam_id,
      exam_name: exam.name,
      results_generated: created.count,
      ranking_enabled,
      summary: {
        total_students: resultsToCreate.length,
        passed: passedCount,
        failed: failedCount,
        pass_rate: Math.round((passedCount / resultsToCreate.length) * 10000) / 100,
        average_gpa: Math.round(avgGpa * 100) / 100,
        top_position: ranking_enabled ? 1 : null,
      },
    },
    `Results generated for ${resultsToCreate.length} students. ${passedCount} passed, ${failedCount} failed.`,
  );
});
