/**
 * MadrashaOS — Exams API
 *
 * Phase B5.3 — Examination API (marks + publish)
 *
 * GET  /api/v1/exams — list exams (perm: exams.view)
 * POST /api/v1/exams — create exam (perm: exams.enter-marks — teacher creates exams)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse, parsePagination } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createExamSchema = z.object({
  name: z.string().min(1).max(255),
  name_bn: z.string().optional(),
  class_id: z.string().uuid(),
  subject_id: z.string().uuid().optional(),
  academic_year: z.number().int().optional(),
  term: z.enum(["first", "second", "final", "test", "quiz"]).optional(),
  exam_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  full_marks: z.number().int().min(1).max(1000).optional(),
  pass_marks: z.number().int().min(0).max(500).optional(),
  description: z.string().optional(),
});

/** GET /api/v1/exams — list exams */
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const classId = url.searchParams.get("class_id");
  const subjectId = url.searchParams.get("subject_id");
  const status = url.searchParams.get("status"); // draft | active | published
  const academicYear = url.searchParams.get("academic_year")
    ? parseInt(url.searchParams.get("academic_year")!, 10)
    : undefined;
  const term = url.searchParams.get("term");

  const where = {
    organization_id: ctx.organization_id,
    ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}),
    deleted_at: null,
    ...(classId ? { class_id: classId } : {}),
    ...(subjectId ? { subject_id: subjectId } : {}),
    ...(status ? { status } : {}),
    ...(academicYear ? { academic_year: academicYear } : {}),
    ...(term ? { term } : {}),
  };

  const [exams, total] = await Promise.all([
    db.exam.findMany({
      where,
      orderBy: { exam_date: "desc" },
      skip,
      take,
      include: {
        class: { select: { id: true, name: true, name_bn: true } },
        subject: { select: { id: true, name: true, code: true } },
        _count: { select: { marks: { where: { deleted_at: null } } } },
      },
    }),
    db.exam.count({ where }),
  ]);

  return jsonResponse({
    data: exams.map((e) => ({
      id: e.id,
      name: e.name,
      name_bn: e.name_bn,
      class_id: e.class_id,
      class_name: e.class.name,
      subject_id: e.subject_id,
      subject_name: e.subject?.name ?? null,
      academic_year: e.academic_year,
      term: e.term,
      exam_date: e.exam_date,
      full_marks: e.full_marks,
      pass_marks: e.pass_marks,
      status: e.status,
      published_at: e.published_at,
      description: e.description,
      marks_count: e._count.marks,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

/** POST /api/v1/exams — create exam */
export const POST = withPermission("exams.enter-marks", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = createExamSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const data = parsed.data;
  const academicYear = data.academic_year ?? new Date().getFullYear();

  // Verify class exists
  const cls = await db.class.findFirst({
    where: { id: data.class_id, organization_id: ctx.organization_id, deleted_at: null },
  });
  if (!cls) return errorResponse("Class not found", 404);

  // Check uniqueness (org + academic_year + class_id + subject_id + term)
  const existing = await db.exam.findFirst({
    where: {
      organization_id: ctx.organization_id,
      academic_year: academicYear,
      class_id: data.class_id,
      subject_id: data.subject_id ?? null,
      term: data.term ?? "first",
      deleted_at: null,
    },
  });
  if (existing) return errorResponse("Exam already exists for this class/subject/term", 409);

  const exam = await db.exam.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      name: data.name,
      name_bn: data.name_bn ?? null,
      class_id: data.class_id,
      subject_id: data.subject_id ?? null,
      academic_year: academicYear,
      term: data.term ?? "first",
      exam_date: new Date(data.exam_date),
      full_marks: data.full_marks ?? 100,
      pass_marks: data.pass_marks ?? 33,
      status: "draft",
      description: data.description ?? null,
      created_by: ctx.user_id,
    } as never,
  });

  return successResponse(exam, "Exam created");
});
