/**
 * MadrashaOS — Cash & Bank Transfer API
 *
 * Phase B6.4 — Cash & Bank API
 *
 * POST /api/v1/cashbank/transfer — transfer between accounts (perm: cashbank.transfer)
 *   Creates CashBankTransfer + balanced LedgerEntry (both legs in one entry)
 *   Updates both account balances atomically.
 *   Golden Flow: debit destination account, credit source account.
 *
 * GET  /api/v1/cashbank/transfers — list transfers (perm: cashbank.transfer)
 * GET  /api/v1/cashbank/transfers/:id — single transfer with ledger entry
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-tenant";
import { withPermission as withPerm } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse, parsePagination } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const transferSchema = z.object({
  from_account_id: z.string().uuid(),
  to_account_id: z.string().uuid(),
  amount: z.number().min(0.01),
  transfer_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  narration: z.string().max(500).optional(),
});

/** POST /api/v1/cashbank/transfer — transfer between accounts */
export const POST = withPerm("cashbank.transfer", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = transferSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const data = parsed.data;

  // Same account check
  if (data.from_account_id === data.to_account_id) {
    return errorResponse("Source and destination accounts must be different", 400);
  }

  // Verify both accounts exist + are asset accounts (cash/bank)
  const [fromAccount, toAccount] = await Promise.all([
    db.account.findFirst({
      where: { id: data.from_account_id, organization_id: ctx.organization_id, deleted_at: null, is_active: true },
      select: { id: true, name: true, code: true, type: true, balance: true, fund: true, is_cash: true, is_bank: true },
    }),
    db.account.findFirst({
      where: { id: data.to_account_id, organization_id: ctx.organization_id, deleted_at: null, is_active: true },
      select: { id: true, name: true, code: true, type: true, balance: true, fund: true, is_cash: true, is_bank: true },
    }),
  ]);

  if (!fromAccount) return errorResponse("Source account not found or inactive", 404);
  if (!toAccount) return errorResponse("Destination account not found or inactive", 404);

  // Both must be asset accounts (cash/bank)
  if (fromAccount.type !== "asset" || toAccount.type !== "asset") {
    return errorResponse("Both accounts must be asset type (cash/bank) for transfers", 400);
  }

  // C6/D18: fund isolation — both accounts must have the same fund
  if (fromAccount.fund !== toAccount.fund) {
    return errorResponse(
      "Fund isolation violation: cannot transfer between accounts of different fund types (general vs zakat).",
      400,
      { from_fund: fromAccount.fund, to_fund: toAccount.fund },
    );
  }

  // Check sufficient balance in source account
  if (Number(fromAccount.balance) < data.amount) {
    return errorResponse(
      `Insufficient balance in source account. Available: ৳${Number(fromAccount.balance)}, Requested: ৳${data.amount}`,
      400,
      { available: Number(fromAccount.balance), requested: data.amount },
    );
  }

  // Generate voucher number
  const year = new Date().getFullYear();
  const lastTransfer = await db.cashBankTransfer.findFirst({
    where: { voucher_no: { startsWith: `TR-${year}-` } },
    orderBy: { voucher_no: "desc" },
    select: { voucher_no: true },
  });
  const transferSeq = lastTransfer ? parseInt(lastTransfer.voucher_no.split("-").pop() || "0", 10) + 1 : 1;
  const transferVoucherNo = `TR-${year}-${transferSeq.toString().padStart(4, "0")}`;

  // Generate ledger voucher number
  const lastLedger = await db.ledgerEntry.findFirst({
    where: { voucher_no: { startsWith: `JV-${year}-` } },
    orderBy: { voucher_no: "desc" },
    select: { voucher_no: true },
  });
  const ledgerSeq = lastLedger ? parseInt(lastLedger.voucher_no.split("-").pop() || "0", 10) + 1 : 1;
  const ledgerVoucherNo = `JV-${year}-${ledgerSeq.toString().padStart(3, "0")}`;

  const transferDate = data.transfer_date ? new Date(data.transfer_date) : new Date();

  // Create transfer + ledger entry + update balances in one transaction
  const result = await db.$transaction(async (tx) => {
    // 1. Create CashBankTransfer record
    const transfer = await tx.cashBankTransfer.create({
      data: {
        organization_id: ctx.organization_id,
        branch_id: ctx.branch_id ?? null,
        voucher_no: transferVoucherNo,
        from_account_id: data.from_account_id,
        to_account_id: data.to_account_id,
        amount: data.amount,
        fund: fromAccount.fund,
        transfer_date: transferDate,
        narration: data.narration ?? `Transfer: ${fromAccount.name} → ${toAccount.name}`,
        initiated_by: ctx.user_id,
        status: "completed",
        completed_at: new Date(),
        created_by: ctx.user_id,
      } as never,
    });

    // 2. Create balanced LedgerEntry (debit destination, credit source)
    const ledgerEntry = await tx.ledgerEntry.create({
      data: {
        organization_id: ctx.organization_id,
        branch_id: ctx.branch_id ?? null,
        voucher_no: ledgerVoucherNo,
        date: transferDate,
        narration: data.narration ?? `Cash/Bank transfer — ${fromAccount.name} → ${toAccount.name}`,
        debit_account_id: data.to_account_id,   // destination receives (debit for asset = increase)
        credit_account_id: data.from_account_id, // source gives (credit for asset = decrease)
        amount: data.amount,
        fund: fromAccount.fund,
        status: "posted",
        posted_by: ctx.user_id,
        posted_at: new Date(),
        source_type: "cash_bank_transfer",
        source_id: transfer.id,
        created_by: ctx.user_id,
      } as never,
    });

    // 3. Link ledger entry to transfer
    await tx.cashBankTransfer.update({
      where: { id: transfer.id },
      data: { ledger_entry_id: ledgerEntry.id } as never,
    });

    // 4. Update account balances
    // Source account: decrease (credit to asset = decrease)
    await tx.account.update({
      where: { id: data.from_account_id },
      data: { balance: { decrement: data.amount } } as never,
    });
    // Destination account: increase (debit to asset = increase)
    await tx.account.update({
      where: { id: data.to_account_id },
      data: { balance: { increment: data.amount } } as never,
    });

    return { transfer, ledgerEntry };
  });

  // Audit log
  await db.auditLog.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      entity_type: "cash_bank_transfers",
      entity_id: result.transfer.id,
      action: "create",
      old_values: null,
      new_values: {
        voucher_no: transferVoucherNo,
        from_account: fromAccount.name,
        to_account: toAccount.name,
        amount: data.amount,
        ledger_voucher: ledgerVoucherNo,
        status: "completed",
      },
      actor_id: ctx.user_id,
      ip_address: req.headers.get("x-forwarded-for") || null,
      user_agent: req.headers.get("user-agent") || null,
    } as never,
  });

  return jsonResponse(
    {
      id: result.transfer.id,
      voucher_no: transferVoucherNo,
      from_account: { id: fromAccount.id, name: fromAccount.name, code: fromAccount.code },
      to_account: { id: toAccount.id, name: toAccount.name, code: toAccount.code },
      amount: data.amount,
      fund: fromAccount.fund,
      transfer_date: transferDate,
      narration: data.narration ?? `Transfer: ${fromAccount.name} → ${toAccount.name}`,
      status: "completed",
      ledger_entry_id: result.ledgerEntry.id,
      ledger_voucher_no: ledgerVoucherNo,
      message: `Transfer completed — ৳${data.amount} moved from ${fromAccount.name} to ${toAccount.name}. Ledger posted (${ledgerVoucherNo}). Both account balances updated.`,
    },
    201,
  );
});
