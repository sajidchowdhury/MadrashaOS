/**
 * MadrashaOS — Single Fee Plan API
 *
 * Phase B6.1
 *
 * GET   /api/v1/fees/plans/:id — single plan with installments + payments
 * PATCH /api/v1/fees/plans/:id — update plan (perm: fees.plan.edit)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateFeePlanSchema = z.object({
  total_amount: z.number().min(0).optional(),
  scholarship_amount: z.number().min(0).optional(),
  installment_count: z.number().int().min(1).max(12).optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/v1/fees/plans/:id */
export async function GET(_req: Request, ctx: RouteContext) {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const plan = await db.feePlan.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
    include: {
      student: { select: { id: true, name: true, name_bn: true, code: true, roll: true } },
      fee_installments: {
        where: { deleted_at: null },
        orderBy: { due_date: "asc" },
      },
    },
  });

  if (!plan) return errorResponse("Fee plan not found", 404);

  // Get payments for this student (associated with installments)
  const installmentIds = plan.fee_installments.map((i) => i.id);
  const payments = installmentIds.length > 0
    ? await db.feePayment.findMany({
        where: { installment_id: { in: installmentIds }, deleted_at: null, is_reversed: false },
        select: {
          id: true, installment_id: true, amount: true, method: true,
          receipt_no: true, collected_at: true, is_reversed: true,
        },
        orderBy: { collected_at: "desc" },
      })
    : [];

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalOutstanding = Number(plan.net_payable) - totalPaid;

  return jsonResponse({
    id: plan.id,
    student: plan.student,
    academic_year: plan.academic_year,
    total_amount: Number(plan.total_amount),
    scholarship_amount: Number(plan.scholarship_amount),
    net_payable: Number(plan.net_payable),
    installment_count: plan.installment_count,
    status: plan.status,
    notes: plan.notes,
    installments: plan.fee_installments.map((i) => ({
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
    payments: payments.map((p) => ({
      id: p.id,
      installment_id: p.installment_id,
      amount: Number(p.amount),
      method: p.method,
      receipt_no: p.receipt_no,
      collected_at: p.collected_at,
    })),
    summary: {
      total_paid: totalPaid,
      total_outstanding: Math.max(0, totalOutstanding),
      payment_progress: plan.net_payable > 0 ? Math.round((totalPaid / Number(plan.net_payable)) * 100) : 100,
    },
  });
}

/** PATCH /api/v1/fees/plans/:id */
export const PATCH = withPermission("fees.plan.edit", async (req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = updateFeePlanSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const existing = await db.feePlan.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
  });
  if (!existing) return errorResponse("Fee plan not found", 404);

  // Recalculate net_payable if amounts changed
  const totalAmount = parsed.data.total_amount ?? Number(existing.total_amount);
  const scholarshipAmount = parsed.data.scholarship_amount ?? Number(existing.scholarship_amount);
  const netPayable = totalAmount - scholarshipAmount;

  const updated = await db.feePlan.update({
    where: { id },
    data: {
      ...parsed.data,
      total_amount: totalAmount,
      scholarship_amount: scholarshipAmount,
      net_payable: netPayable,
      updated_by: tenantCtx.user_id,
    } as never,
  });

  return successResponse(updated, "Fee plan updated");
});
