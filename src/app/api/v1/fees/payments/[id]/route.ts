/**
 * MadrashaOS — Single Fee Payment API
 *
 * Phase B6.1
 *
 * GET /api/v1/fees/payments/:id — single payment with receipt details
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { jsonResponse, errorResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/v1/fees/payments/:id — single payment (receipt view) */
export async function GET(_req: Request, ctx: RouteContext) {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const payment = await db.feePayment.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
    include: {
      student: {
        select: {
          id: true, name: true, name_bn: true, name_ar: true, code: true, roll: true,
          class: { select: { name: true, name_bn: true } },
          section: { select: { name: true } },
          guardian: { select: { name: true, name_bn: true, phone: true } },
        },
      },
      account: { select: { id: true, name: true, code: true } },
      collector: { select: { id: true, name: true, name_bn: true } },
      installment: { select: { id: true, label: true, amount: true } },
    },
  });

  if (!payment) return errorResponse("Payment not found", 404);

  return jsonResponse({
    id: payment.id,
    receipt_no: payment.receipt_no,
    student: {
      id: payment.student.id,
      name: payment.student.name,
      name_bn: payment.student.name_bn,
      name_ar: payment.student.name_ar,
      code: payment.student.code,
      roll: payment.student.roll,
      class_name: payment.student.class.name,
      class_name_bn: payment.student.class.name_bn,
      section: payment.student.section?.name ?? null,
      guardian_name: payment.student.guardian?.name ?? null,
      guardian_phone: payment.student.guardian?.phone ?? null,
    },
    amount: Number(payment.amount),
    method: payment.method,
    account: payment.account,
    transaction_ref: payment.transaction_ref,
    collected_by: payment.collector.name,
    collected_by_bn: payment.collector.name_bn,
    collected_at: payment.collected_at,
    is_reversed: payment.is_reversed,
    notes: payment.notes,
    installment: payment.installment
      ? {
          id: payment.installment.id,
          label: payment.installment.label,
          installment_amount: Number(payment.installment.amount),
        }
      : null,
  });
}
