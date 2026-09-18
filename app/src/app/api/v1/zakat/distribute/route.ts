/**
 * MadrashaOS — Zakat Distribute API
 *
 * Phase B6.5 — Zakat API (fund isolation)
 *
 * POST /api/v1/zakat/distribute — distribute Zakat (perm: zakat.distribute)
 *
 * Risk R9 lock-in:
 *   - Validates distribution amount ≤ Zakat fund balance → 400 if exceeds
 *   - Fund badge visible in error response
 *   - Posts ONLY from Zakat fund account (fund='zakat')
 *   - Creates balanced LedgerEntry with fund='zakat'
 *   - Updates Zakat account balance (decrease)
 *   - Creates ZakatTransaction record
 *   - Audit logged
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const distributeZakatSchema = z.object({
  account_id: z.string().uuid(), // must be a fund='zakat' account
  amount: z.number().min(0.01),
  student_id: z.string().uuid().optional(), // recipient student (if applicable)
  recipient_name: z.string().optional(), // free-text recipient name
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  narration: z.string().max(500).optional(),
  purpose: z.enum(["education", "food", "medical", "shelter", "other"]).optional(),
});

/** POST /api/v1/zakat/distribute */
export const POST = withPermission("zakat.distribute", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = distributeZakatSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const data = parsed.data;

  // Verify account exists + is a Zakat fund account
  const account = await db.account.findFirst({
    where: { id: data.account_id, organization_id: ctx.organization_id, deleted_at: null, is_active: true },
    select: { id: true, name: true, code: true, type: true, fund: true, balance: true },
  });
  if (!account) return errorResponse("Account not found", 404);

  // C6/D18: Fund isolation — account must be fund='zakat'
  if (account.fund !== "zakat") {
    return errorResponse(
      "Fund isolation violation: Zakat can only be distributed from a Zakat fund account. This account has fund='general'.",
      400,
      { account_fund: account.fund, required_fund: "zakat" },
    );
  }

  // Risk R9: Validate distribution amount ≤ fund balance
  const currentBalance = Number(account.balance);
  if (data.amount > currentBalance) {
    return errorResponse(
      `Distribution exceeds Zakat fund balance. Available: ৳${currentBalance}, Requested: ৳${data.amount}`,
      400,
      {
        fund: "zakat", // Risk R9: fund badge visible in error
        available_balance: currentBalance,
        requested_amount: data.amount,
        shortfall: data.amount - currentBalance,
        account_name: account.name,
      },
    );
  }

  // Determine debit/credit accounts for the ledger entry
  // Distribution: debit Zakat Fund (liability, decrease), credit Cash (asset, decrease)
  let debitAccountId = account.id;
  let creditAccountId = account.id;

  if (account.type === "liability") {
    // Debit Zakat Fund (liability decrease), credit Cash (asset decrease)
    const zakatCashAccount = await db.account.findFirst({
      where: {
        organization_id: ctx.organization_id,
        fund: "zakat",
        type: "asset",
        deleted_at: null,
        is_active: true,
      },
      select: { id: true, name: true },
    });
    if (!zakatCashAccount) {
      return errorResponse("Zakat cash account not configured. Please create an asset account with fund='zakat'.", 500);
    }
    debitAccountId = account.id;             // Zakat Fund (liability)
    creditAccountId = zakatCashAccount.id;   // Cash (asset)
  } else if (account.type === "asset") {
    // If distributing directly from cash, debit Zakat Fund (liability), credit Cash (asset)
    const zakatFundAccount = await db.account.findFirst({
      where: {
        organization_id: ctx.organization_id,
        fund: "zakat",
        type: "liability",
        deleted_at: null,
      },
      select: { id: true, name: true },
    });
    if (!zakatFundAccount) {
      return errorResponse("Zakat fund (liability) account not configured.", 500);
    }
    debitAccountId = zakatFundAccount.id;  // Zakat Fund (liability)
    creditAccountId = account.id;          // Cash (asset)
  }

  // Generate voucher numbers
  const year = new Date().getFullYear();
  const lastZakatTx = await db.zakatTransaction.findFirst({
    where: { voucher_no: { startsWith: `ZK-${year}-` } },
    orderBy: { voucher_no: "desc" },
    select: { voucher_no: true },
  });
  const zakatSeq = lastZakatTx ? parseInt(lastZakatTx.voucher_no.split("-").pop() || "0", 10) + 1 : 1;
  const voucherNo = `ZK-${year}-${zakatSeq.toString().padStart(4, "0")}`;

  const lastLedger = await db.ledgerEntry.findFirst({
    where: { voucher_no: { startsWith: `JV-${year}-` } },
    orderBy: { voucher_no: "desc" },
    select: { voucher_no: true },
  });
  const ledgerSeq = lastLedger ? parseInt(lastLedger.voucher_no.split("-").pop() || "0", 10) + 1 : 1;
  const ledgerVoucherNo = `JV-${year}-${ledgerSeq.toString().padStart(3, "0")}`;

  const receiptNo = `ZKD-${year}-${zakatSeq.toString().padStart(4, "0")}`;
  const txDate = data.transaction_date ? new Date(data.transaction_date) : new Date();

  // Determine recipient name
  let recipientName = data.recipient_name ?? null;
  if (data.student_id && !recipientName) {
    const student = await db.student.findFirst({
      where: { id: data.student_id, organization_id: ctx.organization_id, deleted_at: null },
      select: { name: true },
    });
    if (student) recipientName = student.name;
  }

  // Create ZakatTransaction + LedgerEntry + update balances in transaction
  const result = await db.$transaction(async (tx) => {
    // 1. Create ZakatTransaction
    const zakatTx = await tx.zakatTransaction.create({
      data: {
        organization_id: ctx.organization_id,
        branch_id: ctx.branch_id ?? null,
        account_id: data.account_id,
        direction: "distribute",
        student_id: data.student_id ?? null,
        recipient_name: recipientName,
        amount: data.amount,
        transaction_date: txDate,
        narration: data.narration ?? `Zakat distributed — ${recipientName ?? "Recipient"}`,
        purpose: data.purpose ?? null,
        handled_by: ctx.user_id,
        voucher_no: voucherNo,
        receipt_no: receiptNo,
        created_by: ctx.user_id,
      } as never,
    });

    // 2. Create balanced LedgerEntry (fund='zakat')
    await tx.ledgerEntry.create({
      data: {
        organization_id: ctx.organization_id,
        branch_id: ctx.branch_id ?? null,
        voucher_no: ledgerVoucherNo,
        date: txDate,
        narration: data.narration ?? `Zakat distributed — ${recipientName ?? "Recipient"}`,
        debit_account_id: debitAccountId,
        credit_account_id: creditAccountId,
        amount: data.amount,
        fund: "zakat", // C6/D18: fund isolation
        status: "posted",
        posted_by: ctx.user_id,
        posted_at: new Date(),
        source_type: "zakat_transaction",
        source_id: zakatTx.id,
        created_by: ctx.user_id,
      } as never,
    });

    // 3. Update account balances
    // Debit account (liability): decrease (debit to liability = decrease)
    await tx.account.update({
      where: { id: debitAccountId },
      data: { balance: { decrement: data.amount } } as never,
    });
    // Credit account (asset): decrease (credit to asset = decrease)
    await tx.account.update({
      where: { id: creditAccountId },
      data: { balance: { decrement: data.amount } } as never,
    });

    return zakatTx;
  });

  // Audit log
  await db.auditLog.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      entity_type: "zakat_transactions",
      entity_id: result.id,
      action: "create",
      old_values: null,
      new_values: {
        voucher_no: voucherNo,
        receipt_no: receiptNo,
        direction: "distribute",
        amount: data.amount,
        recipient: recipientName ?? "Unknown",
        purpose: data.purpose ?? "other",
        account: account.name,
        fund: "zakat",
        ledger_voucher: ledgerVoucherNo,
      },
      actor_id: ctx.user_id,
    } as never,
  });

  return jsonResponse(
    {
      id: result.id,
      voucher_no: voucherNo,
      receipt_no: receiptNo,
      direction: "distribute",
      amount: data.amount,
      account: { id: account.id, name: account.name, code: account.code, fund: "zakat" },
      recipient_name: recipientName,
      student_id: data.student_id ?? null,
      purpose: data.purpose ?? "other",
      transaction_date: txDate,
      ledger_voucher_no: ledgerVoucherNo,
      remaining_zakat_balance: currentBalance - data.amount,
      message: `Zakat distributed — ৳${data.amount} to ${recipientName ?? "recipient"}. Remaining Zakat fund balance: ৳${currentBalance - data.amount}. Ledger posted (${ledgerVoucherNo}).`,
    },
    201,
  );
});
