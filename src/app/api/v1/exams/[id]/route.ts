/**
 * MadrashaOS — Single Exam API
 *
 * Phase B5.3
 *
 * GET   /api/v1/exams/:id — single exam with marks summary
 * PATCH /api/v1/exams/:id — update exam (blocked if published — 409)
 * DELETE /api/v1/exams/:id — soft delete (blocked if published — 409)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateExamSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  name_bn: z.string().optional(),
  exam_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  full_marks: z.number().int().min(1).max(1000).optional(),
  pass_marks: z.number().int().min(0).max(500).optional(),
  description: z.string().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/v1/exams/:id */
export async function GET(_req: Request, ctx: RouteContext) {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const exam = await db.exam.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
    include: {
      class: { select: { id: true, name: true, name_bn: true } },
      subject: { select: { id: true, name: true, code: true, full_marks: true, pass_marks: true } },
      publisher: { select: { id: true, name: true } },
      _count: { select: { marks: { where: { deleted_at: null } }, results: true } },
    },
  });

  if (!exam) return errorResponse("Exam not found", 404);

  // Calculate marks summary
  const marks = await db.mark.findMany({
    where: { exam_id: id, deleted_at: null },
    select: { marks_obtained: true, is_absent: true },
  });
  const presentMarks = marks.filter((m) => !m.is_absent);
  const totalMarks = presentMarks.reduce((sum, m) => sum + Number(m.marks_obtained), 0);
  const avgMark = presentMarks.length > 0 ? totalMarks / presentMarks.length : 0;
  const passCount = presentMarks.filter((m) => Number(m.marks_obtained) >= exam.pass_marks).length;
  const failCount = presentMarks.length - passCount;
  const passRate = presentMarks.length > 0 ? (passCount / presentMarks.length) * 100 : 0;

  return jsonResponse({
    id: exam.id,
    name: exam.name,
    name_bn: exam.name_bn,
    class_id: exam.class_id,
    class_name: exam.class.name,
    subject_id: exam.subject_id,
    subject_name: exam.subject?.name ?? null,
    academic_year: exam.academic_year,
    term: exam.term,
    exam_date: exam.exam_date,
    full_marks: exam.full_marks,
    pass_marks: exam.pass_marks,
    status: exam.status,
    published_by: exam.publisher?.name ?? null,
    published_at: exam.published_at,
    description: exam.description,
    summary: {
      total_students: marks.length,
      present: presentMarks.length,
      absent: marks.filter((m) => m.is_absent).length,
      average_mark: Math.round(avgMark * 100) / 100,
      pass_count: passCount,
      fail_count: failCount,
      pass_rate: Math.round(passRate * 100) / 100,
    },
  });
}

/** PATCH /api/v1/exams/:id — update (blocked if published) */
export const PATCH = withPermission("exams.enter-marks", async (req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const exam = await db.exam.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
  });
  if (!exam) return errorResponse("Exam not found", 404);

  if (exam.status === "published") {
    return errorResponse("Cannot modify a published exam. Create a new exam or unpublish first.", 409);
  }

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = updateExamSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const updated = await db.exam.update({
    where: { id },
    data: {
      ...(parsed.data.exam_date ? { exam_date: new Date(parsed.data.exam_date) } : {}),
      ...parsed.data,
      updated_by: tenantCtx.user_id,
    } as never,
  });

  return successResponse(updated, "Exam updated");
});

/** DELETE /api/v1/exams/:id — soft delete (blocked if published) */
export const DELETE = withPermission("exams.enter-marks", async (_req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const exam = await db.exam.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
  });
  if (!exam) return errorResponse("Exam not found", 404);

  if (exam.status === "published") {
    return errorResponse("Cannot delete a published exam", 409);
  }

  await db.exam.update({
    where: { id },
    data: { deleted_at: new Date(), updated_by: tenantCtx.user_id } as never,
  });

  return successResponse(null, "Exam deleted (soft)");
});
