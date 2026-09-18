/**
 * MadrashaOS — Marks Entry API
 *
 * Phase B5.3 — Examination API
 *
 * GET /api/v1/exams/:id/marks — list marks for an exam
 * PUT /api/v1/exams/:id/marks — enter/update marks (perm: exams.enter-marks)
 *   - Validates mark > full_marks → 400 "Mark exceeds full marks"
 *   - Blocked if exam is published (409)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const enterMarksSchema = z.object({
  marks: z.array(
    z.object({
      student_id: z.string().uuid(),
      subject_id: z.string().uuid(),
      marks_obtained: z.number().min(0),
      is_absent: z.boolean().optional(),
      remark: z.string().optional(),
    }),
  ).min(1, "At least one mark entry is required"),
});

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/v1/exams/:id/marks — list marks for an exam */
export async function GET(_req: Request, ctx: RouteContext) {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  // Verify exam exists
  const exam = await db.exam.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
    select: { id: true, full_marks: true, pass_marks: true, status: true, subject_id: true },
  });
  if (!exam) return errorResponse("Exam not found", 404);

  const marks = await db.mark.findMany({
    where: { exam_id: id, organization_id: tenantCtx.organization_id, deleted_at: null },
    include: {
      student: { select: { id: true, name: true, name_bn: true, code: true, roll: true } },
      subject: { select: { id: true, name: true, code: true } },
    },
    orderBy: { student: { roll: "asc" } },
  });

  return jsonResponse({
    exam: {
      id: exam.id,
      full_marks: exam.full_marks,
      pass_marks: exam.pass_marks,
      status: exam.status,
    },
    data: marks.map((m) => ({
      id: m.id,
      student_id: m.student_id,
      student_name: m.student.name,
      student_name_bn: m.student.name_bn,
      student_code: m.student.code,
      roll: m.student.roll,
      subject_id: m.subject_id,
      subject_name: m.subject.name,
      marks_obtained: Number(m.marks_obtained),
      grade: m.grade,
      gpa: m.gpa ? Number(m.gpa) : null,
      is_absent: m.is_absent,
      remark: m.remark,
      entered_at: m.entered_at,
    })),
    total: marks.length,
  });
}

/** PUT /api/v1/exams/:id/marks — enter/update marks (batch) */
export const PUT = withPermission("exams.enter-marks", async (req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  // Verify exam exists + not published
  const exam = await db.exam.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
    select: { id: true, full_marks: true, pass_marks: true, status: true, class_id: true, subject_id: true },
  });
  if (!exam) return errorResponse("Exam not found", 404);

  if (exam.status === "published") {
    return errorResponse("Cannot enter marks for a published exam", 409);
  }

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = enterMarksSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  // Validate: no mark exceeds full_marks
  for (const mark of parsed.data.marks) {
    if (!mark.is_absent && mark.marks_obtained > exam.full_marks) {
      return errorResponse(
        `Mark exceeds full marks (${exam.full_marks})`,
        400,
        { student_id: mark.student_id, marks_obtained: mark.marks_obtained, full_marks: exam.full_marks },
      );
    }
  }

  // Use the exam's subject_id if not provided per mark
  const subjectId = exam.subject_id;

  // Upsert each mark in a transaction
  const result = await db.$transaction(
    parsed.data.marks.map((mark) =>
      db.mark.upsert({
        where: {
          exam_id_student_id: {
            exam_id: id,
            student_id: mark.student_id,
          } as never,
        },
        update: {
          marks_obtained: mark.marks_obtained,
          is_absent: mark.is_absent ?? false,
          remark: mark.remark ?? null,
          subject_id: mark.subject_id || subjectId || mark.subject_id,
          entered_by: tenantCtx.user_id,
          updated_by: tenantCtx.user_id,
        } as never,
        create: {
          organization_id: tenantCtx.organization_id,
          branch_id: tenantCtx.branch_id ?? null,
          exam_id: id,
          student_id: mark.student_id,
          subject_id: mark.subject_id || subjectId || mark.subject_id,
          marks_obtained: mark.marks_obtained,
          is_absent: mark.is_absent ?? false,
          remark: mark.remark ?? null,
          entered_by: tenantCtx.user_id,
          created_by: tenantCtx.user_id,
        } as never,
      }),
    ),
  );

  return successResponse(
    { entered: result.length, exam_id: id },
    `${result.length} marks saved`,
  );
});
