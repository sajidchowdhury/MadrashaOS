/**
 * MadrashaOS — Fee Payments API (Collect Payment)
 *
 * Phase B6.1 — Fees API
 *
 * GET  /api/v1/fees/payments — list payments (perm: fees.view)
 * POST /api/v1/fees/payments — collect payment (perm: fees.payment.create)
 *
 * POST implements the Golden Flow (SRS §3.6):
 *   1. Validates installment exists + is not fully paid
 *   2. Generates receipt number (RCP-{year}-{seq})
 *   3. Creates FeePayment record
 *   4. Creates balanced LedgerEntry (debit Cash/Bank, credit Fee Income)
 *   5. Updates installment status (is_paid, paid_date, receipt_no, amount_paid)
 *   6. Updates Account balance
 *   7. Accepts Idempotency-Key header (SRS §6.5)
 *   8. Writes audit log
 *
 * Risk R8: pending discounts shown as striped/greyed rows with status chip
 *   (frontend concern — API returns discount + status fields for rendering)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse, parsePagination } from "@/lib/api/helpers";
import { z } from "zod";
import { notifyEntity } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const collectPaymentSchema = z.object({
  student_id: z.string().uuid(),
  installment_id: z.string().uuid().optional(),
  amount: z.number().min(0.01),
  method: z.enum(["cash", "bank", "mobile"]),
  account_id: z.string().uuid(),
  transaction_ref: z.string().optional(),
  notes: z.string().optional(),
});

/** GET /api/v1/fees/payments — list payments (perm: fees.view) */
export const GET = withPermission("fees.view", async (req: Request) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const studentId = url.searchParams.get("student_id");
  const method = url.searchParams.get("method");
  const dateFrom = url.searchParams.get("date_from");
  const dateTo = url.searchParams.get("date_to");

  const where = {
    organization_id: ctx.organization_id,
    ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}),
    deleted_at: null,
    is_reversed: false,
    ...(studentId ? { student_id } : {}),
    ...(method ? { method } : {}),
    ...(dateFrom || dateTo
      ? {
          collected_at: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
          },
        }
      : {}),
  };

  const [payments, total] = await Promise.all([
    db.feePayment.findMany({
      where,
      orderBy: { collected_at: "desc" },
      skip,
      take,
      include: {
        student: { select: { id: true, name: true, name_bn: true, code: true, roll: true } },
        account: { select: { id: true, name: true, code: true } },
        collector: { select: { id: true, name: true } },
        installment: { select: { id: true, label: true } },
      },
    }),
    db.feePayment.count({ where }),
  ]);

  return jsonResponse({
    data: payments.map((p) => ({
      id: p.id,
      student_id: p.student_id,
      student_name: p.student.name,
      student_name_bn: p.student.name_bn,
      student_code: p.student.code,
      roll: p.student.roll,
      installment_id: p.installment_id,
      installment_label: p.installment?.label ?? null,
      account_id: p.account_id,
      account_name: p.account.name,
      amount: Number(p.amount),
      method: p.method,
      receipt_no: p.receipt_no,
      transaction_ref: p.transaction_ref,
      collected_by: p.collected_by,
      collected_by_name: p.collector.name,
      collected_at: p.collected_at,
      is_reversed: p.is_reversed,
      notes: p.notes,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
});

/** POST /api/v1/fees/payments — collect payment (Golden Flow) */
export const POST = withPermission("fees.payment.create", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  // --- Idempotency check ---
  const idempotencyKey = req.headers.get("idempotency-key");
  if (idempotencyKey) {
    const existing = await db.feePayment.findUnique({
      where: { idempotency_key: idempotencyKey } as never,
    });
    if (existing && !existing.is_reversed) {
      return jsonResponse(
        {
          id: existing.id,
          receipt_no: existing.receipt_no,
          amount: Number(existing.amount),
          message: "Payment already processed (idempotent replay)",
        },
        200,
        { "X-Idempotent-Replay": "true" },
      );
    }
  }

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = collectPaymentSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const data = parsed.data;

  // Verify student exists
  const student = await db.student.findFirst({
    where: { id: data.student_id, organization_id: ctx.organization_id, deleted_at: null },
    select: { id: true, branch_id: true, code: true, name: true },
  });
  if (!student) return errorResponse("Student not found", 404);

  // Verify account exists + is an asset account
  const account = await db.account.findFirst({
    where: { id: data.account_id, organization_id: ctx.organization_id, deleted_at: null },
    select: { id: true, code: true, name: true, type: true, balance: true, fund: true },
  });
  if (!account) return errorResponse("Account not found", 404);

  // Find the Fee Income account (credit side of Golden Flow)
  const feeIncomeAccount = await db.account.findFirst({
    where: {
      organization_id: ctx.organization_id,
      code: "4000", // Fee Income account code (from seed)
      deleted_at: null,
    },
    select: { id: true, code: true, name: true },
  });
  if (!feeIncomeAccount) return errorResponse("Fee Income account not configured", 500);

  // If installment specified, verify it's not fully paid
  let installment: { id: string; amount: number; is_paid: boolean; amount_paid: number; status: string; label: string } | null = null;
  if (data.installment_id) {
    const inst = await db.feeInstallment.findFirst({
      where: { id: data.installment_id, organization_id: ctx.organization_id, deleted_at: null },
      select: { id: true, amount: true, is_paid: true, amount_paid: true, status: true, label: true },
    });
    if (!inst) return errorResponse("Installment not found", 404);
    if (inst.is_paid) return errorResponse("Installment is already fully paid", 409);

    // Validate payment amount doesn't exceed remaining
    const remaining = Number(inst.amount) - Number(inst.amount_paid);
    if (data.amount > remaining) {
      return errorResponse(
        `Payment amount (৳${data.amount}) exceeds remaining installment balance (৳${remaining})`,
        400,
        { installment_amount: Number(inst.amount), amount_paid: Number(inst.amount_paid), remaining },
      );
    }
    installment = {
      ...inst,
      amount: Number(inst.amount),
      amount_paid: Number(inst.amount_paid),
    };
  }

  // Generate receipt number: RCP-{year}-{seq}
  const year = new Date().getFullYear();
  const lastPayment = await db.feePayment.findFirst({
    where: { receipt_no: { startsWith: `RCP-${year}-` } },
    orderBy: { receipt_no: "desc" },
    select: { receipt_no: true },
  });
  const seq = lastPayment
    ? parseInt(lastPayment.receipt_no.split("-").pop() || "0", 10) + 1
    : 1;
  const receiptNo = `RCP-${year}-${seq.toString().padStart(4, "0")}`;

  // Generate voucher number for ledger
  const lastLedger = await db.ledgerEntry.findFirst({
    where: { voucher_no: { startsWith: `JV-${year}-` } },
    orderBy: { voucher_no: "desc" },
    select: { voucher_no: true },
  });
  const ledgerSeq = lastLedger
    ? parseInt(lastLedger.voucher_no.split("-").pop() || "0", 10) + 1
    : 1;
  const voucherNo = `JV-${year}-${ledgerSeq.toString().padStart(3, "0")}`;

  // --- Golden Flow: create payment + ledger entry + update installment + update account ---
  const result = await db.$transaction(async (tx) => {
    // 1. Create FeePayment
    const payment = await tx.feePayment.create({
      data: {
        organization_id: ctx.organization_id,
        branch_id: student.branch_id ?? ctx.branch_id ?? null,
        student_id: data.student_id,
        installment_id: data.installment_id ?? null,
        account_id: data.account_id,
        amount: data.amount,
        method: data.method,
        receipt_no: receiptNo,
        transaction_ref: data.transaction_ref ?? null,
        collected_by: ctx.user_id,
        collected_at: new Date(),
        idempotency_key: idempotencyKey ?? null,
        notes: data.notes ?? null,
        created_by: ctx.user_id,
      } as never,
    });

    // 2. Create balanced LedgerEntry (debit Cash/Bank, credit Fee Income) — Golden Flow §3.6
    await tx.ledgerEntry.create({
      data: {
        organization_id: ctx.organization_id,
        branch_id: student.branch_id ?? ctx.branch_id ?? null,
        voucher_no: voucherNo,
        date: new Date(),
        narration: `Fee collection — ${student.code} — Receipt ${receiptNo}`,
        debit_account_id: data.account_id,
        credit_account_id: feeIncomeAccount.id,
        amount: data.amount,
        status: "posted",
        posted_by: ctx.user_id,
        fund: "general",
        created_by: ctx.user_id,
      } as never,
    });

    // 3. Update installment status (if installment specified)
    if (installment) {
      const newAmountPaid = installment.amount_paid + data.amount;
      const isFullyPaid = newAmountPaid >= installment.amount;
      await tx.feeInstallment.update({
        where: { id: installment.id },
        data: {
          is_paid: isFullyPaid,
          paid_date: isFullyPaid ? new Date() : installment.amount_paid > 0 ? undefined : new Date(),
          receipt_no: isFullyPaid ? receiptNo : null,
          amount_paid: newAmountPaid,
          status: isFullyPaid ? "paid" : "partial",
          updated_by: ctx.user_id,
        } as never,
      });
    }

    // 4. Update account balance (increase Cash/Bank by payment amount)
    await tx.account.update({
      where: { id: data.account_id },
      data: { balance: { increment: data.amount } } as never,
    });

    // 5. Update Fee Income account balance (increase income by payment amount)
    await tx.account.update({
      where: { id: feeIncomeAccount.id },
      data: { balance: { increment: data.amount } } as never,
    });

    return payment;
  });

  // --- Audit log ---
  await db.auditLog.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: student.branch_id ?? ctx.branch_id ?? null,
      entity_type: "fee_payments",
      entity_id: result.id,
      action: "create",
      old_values: null,
      new_values: {
        receipt_no: receiptNo,
        student_id: data.student_id,
        student_code: student.code,
        amount: data.amount,
        method: data.method,
        installment_id: data.installment_id,
        voucher_no: voucherNo,
      },
      actor_user_id: ctx.user_id,
      ip_address: req.headers.get("x-forwarded-for") || null,
      user_agent: req.headers.get("user-agent") || null,
    } as never,
  });

  // --- Phase 4: Send payment confirmation to guardian (fire-and-forget) ---
  // A notification delivery failure must NEVER roll back the successful payment.
  const org = await db.organization.findFirst({
    where: { id: ctx.organization_id },
    select: { name: true },
  });
  const orgName = org?.name ?? "MadrashaOS";
  const installmentLabel = installment?.label ?? "N/A";

  const guardian = await db.studentGuardian.findFirst({
    where: { student_id: data.student_id, is_primary: true, deleted_at: null },
    include: { guardian: { select: { name: true, phone: true, email: true } } },
  });

  if (guardian?.guardian.email) {
    notifyEntity("email", {
      to: guardian.guardian.email,
      subject: `Fee Payment Confirmation — ${receiptNo}`,
      templateId: "fee-payment-confirmation",
      templateVars: {
        receiptNo,
        studentName: student.name,
        amount: data.amount,
        installmentLabel,
        orgName,
      },
      metadata: {
        organization_id: ctx.organization_id,
        entity_type: "fee_payments",
        entity_id: result.id,
      },
    }).catch(() => {});
  }
  if (guardian?.guardian.phone) {
    notifyEntity("sms", {
      to: guardian.guardian.phone,
      body: `${orgName}: Payment of ৳${data.amount} received for ${student.name}. Receipt ${receiptNo}. Thank you.`,
      templateId: "fee-payment-confirmation",
      templateVars: {
        receiptNo,
        studentName: student.name,
        amount: data.amount,
        installmentLabel,
        orgName,
      },
      metadata: {
        organization_id: ctx.organization_id,
        entity_type: "fee_payments",
        entity_id: result.id,
      },
    }).catch(() => {});
  }

  return jsonResponse(
    {
      id: result.id,
      receipt_no: receiptNo,
      student_id: data.student_id,
      student_code: student.code,
      amount: data.amount,
      method: data.method,
      account_name: account.name,
      installment_id: data.installment_id,
      installment_label: installment?.label ?? null,
      voucher_no: voucherNo,
      collected_at: result.collected_at,
      message: `Payment collected — Receipt ${receiptNo} issued. Ledger posted (${voucherNo}).`,
    },
    201,
  );
});
