/**
 * MadrashaOS — Fee Plans API
 *
 * Phase B6.1 — Fees API
 *
 * GET  /api/v1/fees/plans — list fee plans (perm: fees.view)
 * POST /api/v1/fees/plans — create fee plan (perm: fees.plan.edit)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse, parsePagination } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createFeePlanSchema = z.object({
  student_id: z.string().uuid(),
  academic_year: z.number().int(),
  total_amount: z.number().min(0),
  scholarship_amount: z.number().min(0).optional(),
  installment_count: z.number().int().min(1).max(12).optional(),
  notes: z.string().optional(),
  installments: z.array(
    z.object({
      label: z.string(),
      amount: z.number().min(0),
      due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  ).optional(),
});

/** GET /api/v1/fees/plans — list fee plans (perm: fees.view) */
export const GET = withPermission("fees.view", async (req: Request) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const studentId = url.searchParams.get("student_id");
  const academicYear = url.searchParams.get("academic_year")
    ? parseInt(url.searchParams.get("academic_year")!, 10)
    : undefined;
  const status = url.searchParams.get("status");

  const where = {
    organization_id: ctx.organization_id,
    ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}),
    deleted_at: null,
    ...(studentId ? { student_id: studentId } : {}),
    ...(academicYear ? { academic_year: academicYear } : {}),
    ...(status ? { status } : {}),
  };

  const [plans, total] = await Promise.all([
    db.feePlan.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take,
      include: {
        student: { select: { id: true, name: true, name_bn: true, code: true, roll: true } },
        fee_installments: {
          where: { deleted_at: null },
          orderBy: { due_date: "asc" },
          select: {
            id: true, label: true, amount: true, due_date: true,
            is_paid: true, paid_date: true, receipt_no: true,
            status: true, penalty: true, discount: true, amount_paid: true,
          },
        },
      },
    }),
    db.feePlan.count({ where }),
  ]);

  return jsonResponse({
    data: plans.map((p) => ({
      id: p.id,
      student_id: p.student_id,
      student_name: p.student.name,
      student_name_bn: p.student.name_bn,
      student_code: p.student.code,
      roll: p.student.roll,
      academic_year: p.academic_year,
      total_amount: Number(p.total_amount),
      scholarship_amount: Number(p.scholarship_amount),
      net_payable: Number(p.net_payable),
      installment_count: p.installment_count,
      status: p.status,
      notes: p.notes,
      installments: p.fee_installments.map((i) => ({
        id: i.id,
        label: i.label,
        amount: Number(i.amount),
        due_date: i.due_date,
        is_paid: i.is_paid,
        paid_date: i.paid_date,
        receipt_no: i.receipt_no,
        status: i.status,
        penalty: Number(i.penalty),
        discount: Number(i.discount),
        amount_paid: Number(i.amount_paid),
      })),
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
});

/** POST /api/v1/fees/plans — create fee plan */
export const POST = withPermission("fees.plan.edit", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = createFeePlanSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const data = parsed.data;

  // Check student exists
  const student = await db.student.findFirst({
    where: { id: data.student_id, organization_id: ctx.organization_id, deleted_at: null },
    select: { id: true, branch_id: true },
  });
  if (!student) return errorResponse("Student not found", 404);

  // Check uniqueness (student_id + academic_year)
  const existing = await db.feePlan.findFirst({
    where: { student_id: data.student_id, academic_year: data.academic_year, deleted_at: null },
  });
  if (existing) return errorResponse("Fee plan already exists for this student/year", 409);

  const scholarshipAmount = data.scholarship_amount ?? 0;
  const netPayable = data.total_amount - scholarshipAmount;

  // Create fee plan + installments in transaction
  const plan = await db.$transaction(async (tx) => {
    const newPlan = await tx.feePlan.create({
      data: {
        organization_id: ctx.organization_id,
        branch_id: student.branch_id ?? ctx.branch_id ?? null,
        student_id: data.student_id,
        academic_year: data.academic_year,
        total_amount: data.total_amount,
        scholarship_amount: scholarshipAmount,
        net_payable: netPayable,
        installment_count: data.installment_count ?? data.installments?.length ?? 3,
        status: "active",
        notes: data.notes ?? null,
        created_by: ctx.user_id,
      } as never,
    });

    // Create installments
    if (data.installments && data.installments.length > 0) {
      for (const inst of data.installments) {
        await tx.feeInstallment.create({
          data: {
            organization_id: ctx.organization_id,
            branch_id: student.branch_id ?? ctx.branch_id ?? null,
            fee_plan_id: newPlan.id,
            student_id: data.student_id,
            label: inst.label,
            amount: inst.amount,
            due_date: new Date(inst.due_date),
            status: "unpaid",
            created_by: ctx.user_id,
          } as never,
        });
      }
    }

    return newPlan;
  });

  return successResponse(plan, "Fee plan created");
});
