/**
 * MadrashaOS — Zakat Receive API
 *
 * Phase B6.5 — Zakat API (fund isolation)
 *
 * POST /api/v1/zakat/receive — receive Zakat (perm: zakat.receive)
 *
 * Fund isolation (C6/D18):
 *   - Posts ONLY to the Zakat fund account (fund='zakat')
 *   - Creates balanced LedgerEntry with fund='zakat'
 *   - Updates Zakat account balance (increase)
 *   - Creates ZakatTransaction record
 *   - Audit logged
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const receiveZakatSchema = z.object({
  account_id: z.string().uuid(), // must be a fund='zakat' account
  amount: z.number().min(0.01),
  donor_name: z.string().optional(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  narration: z.string().max(500).optional(),
  purpose: z.string().optional(),
});

/** POST /api/v1/zakat/receive */
export const POST = withPermission("zakat.receive", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = receiveZakatSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const data = parsed.data;

  // Verify account exists + is a Zakat fund account (C6/D18)
  const account = await db.account.findFirst({
    where: { id: data.account_id, organization_id: ctx.organization_id, deleted_at: null, is_active: true },
    select: { id: true, name: true, code: true, type: true, fund: true, balance: true },
  });
  if (!account) return errorResponse("Account not found", 404);

  // C6/D18: Fund isolation — account must be fund='zakat'
  if (account.fund !== "zakat") {
    return errorResponse(
      "Fund isolation violation: Zakat can only be received into a Zakat fund account. This account has fund='general'.",
      400,
      { account_fund: account.fund, required_fund: "zakat" },
    );
  }

  // Find the matching Zakat income/credit account (or use the same liability account)
  // For simplicity, we'll debit the Zakat cash account and credit the Zakat fund (liability) account
  // If the account IS the fund (liability), we need a cash account to debit
  let debitAccountId = account.id;
  let creditAccountId = account.id;

  if (account.type === "asset") {
    // Debit cash (increase asset), credit Zakat fund (increase liability)
    // Find the Zakat fund liability account
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
      return errorResponse("Zakat fund (liability) account not configured. Please create a liability account with fund='zakat'.", 500);
    }
    debitAccountId = account.id;       // Cash/Bank account (asset)
    creditAccountId = zakatFundAccount.id; // Zakat Fund (liability)
  } else if (account.type === "liability") {
    // If receiving directly into the liability account, we need a cash account to debit
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
    debitAccountId = zakatCashAccount.id; // Cash (asset)
    creditAccountId = account.id;          // Zakat Fund (liability)
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

  const receiptNo = `ZKR-${year}-${zakatSeq.toString().padStart(4, "0")}`;
  const txDate = data.transaction_date ? new Date(data.transaction_date) : new Date();

  // Create ZakatTransaction + LedgerEntry + update balances in transaction
  const result = await db.$transaction(async (tx) => {
    // 1. Create ZakatTransaction
    const zakatTx = await tx.zakatTransaction.create({
      data: {
        organization_id: ctx.organization_id,
        branch_id: ctx.branch_id ?? null,
        account_id: data.account_id,
        direction: "receive",
        amount: data.amount,
        transaction_date: txDate,
        narration: data.narration ?? `Zakat received — ${data.donor_name ?? "Anonymous"}`,
        purpose: data.purpose ?? null,
        donor_name: data.donor_name ?? null,
        handled_by: ctx.user_id,
        voucher_no: voucherNo,
        receipt_no: receiptNo,
        created_by: ctx.user_id,
      } as never,
    });

    // 2. Create balanced LedgerEntry (fund='zakat' — C6/D18)
    await tx.ledgerEntry.create({
      data: {
        organization_id: ctx.organization_id,
        branch_id: ctx.branch_id ?? null,
        voucher_no: ledgerVoucherNo,
        date: txDate,
        narration: data.narration ?? `Zakat received — ${data.donor_name ?? "Anonymous"}`,
        debit_account_id: debitAccountId,
        credit_account_id: creditAccountId,
        amount: data.amount,
        fund: "zakat", // C6/D18: Zakat fund isolation
        status: "posted",
        posted_by: ctx.user_id,
        posted_at: new Date(),
        source_type: "zakat_transaction",
        source_id: zakatTx.id,
        created_by: ctx.user_id,
      } as never,
    });

    // 3. Update account balances
    // Debit account (asset): increase
    await tx.account.update({
      where: { id: debitAccountId },
      data: { balance: { increment: data.amount } } as never,
    });
    // Credit account (liability): increase
    await tx.account.update({
      where: { id: creditAccountId },
      data: { balance: { increment: data.amount } } as never,
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
        direction: "receive",
        amount: data.amount,
        donor_name: data.donor_name ?? "Anonymous",
        account: account.name,
        fund: "zakat",
        ledger_voucher: ledgerVoucherNo,
      },
      actor_user_id: ctx.user_id,
    } as never,
  });

  return jsonResponse(
    {
      id: result.id,
      voucher_no: voucherNo,
      receipt_no: receiptNo,
      direction: "receive",
      amount: data.amount,
      account: { id: account.id, name: account.name, code: account.code, fund: "zakat" },
      donor_name: data.donor_name ?? "Anonymous",
      transaction_date: txDate,
      ledger_voucher_no: ledgerVoucherNo,
      message: `Zakat received — ৳${data.amount} from ${data.donor_name ?? "Anonymous"}. Posted to Zakat fund account. Receipt ${receiptNo} issued.`,
    },
    201,
  );
});
