/**
 * MadrashaOS — Single Cash/Bank Transfer API
 *
 * Phase B6.4
 *
 * GET /api/v1/cashbank/transfers/:id — single transfer with linked ledger entry
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/v1/cashbank/transfers/:id */
export const GET = withPermission("cashbank.transfer", async (_req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const transfer = await db.cashBankTransfer.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
    include: {
      from_account: {
        select: { id: true, name: true, code: true, type: true, fund: true, is_cash: true, is_bank: true, bank_name: true },
      },
      to_account: {
        select: { id: true, name: true, code: true, type: true, fund: true, is_cash: true, is_bank: true, bank_name: true },
      },
      initiator: { select: { id: true, name: true, name_bn: true } },
    },
  });

  if (!transfer) return errorResponse("Transfer not found", 404);

  // Get the linked ledger entry
  let ledgerEntry = null;
  if (transfer.ledger_entry_id) {
    ledgerEntry = await db.ledgerEntry.findFirst({
      where: { id: transfer.ledger_entry_id, organization_id: tenantCtx.organization_id },
      select: {
        id: true, voucher_no: true, date: true, narration: true,
        amount: true, status: true, posted_at: true,
        debit_account: { select: { id: true, name: true, code: true } },
        credit_account: { select: { id: true, name: true, code: true } },
      },
    });
  }

  return jsonResponse({
    id: transfer.id,
    voucher_no: transfer.voucher_no,
    from_account: transfer.from_account,
    to_account: transfer.to_account,
    amount: Number(transfer.amount),
    fund: transfer.fund,
    transfer_date: transfer.transfer_date,
    narration: transfer.narration,
    initiated_by: transfer.initiator.name,
    initiated_by_bn: transfer.initiator.name_bn,
    status: transfer.status,
    completed_at: transfer.completed_at,
    ledger_entry: ledgerEntry
      ? {
          id: ledgerEntry.id,
          voucher_no: ledgerEntry.voucher_no,
          date: ledgerEntry.date,
          narration: ledgerEntry.narration,
          amount: Number(ledgerEntry.amount),
          status: ledgerEntry.status,
          posted_at: ledgerEntry.posted_at,
          debit_account: ledgerEntry.debit_account,
          credit_account: ledgerEntry.credit_account,
        }
      : null,
  });
});
