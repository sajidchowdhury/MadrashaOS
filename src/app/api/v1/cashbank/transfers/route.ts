/**
 * MadrashaOS — Cash & Bank Transfers List API
 *
 * Phase B6.4
 *
 * GET /api/v1/cashbank/transfers — list transfers (perm: cashbank.transfer)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, parsePagination } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/** GET /api/v1/cashbank/transfers — list transfers */
export const GET = withPermission("cashbank.transfer", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const fromAccountId = url.searchParams.get("from_account_id");
  const toAccountId = url.searchParams.get("to_account_id");
  const status = url.searchParams.get("status");
  const fund = url.searchParams.get("fund");
  const dateFrom = url.searchParams.get("date_from");
  const dateTo = url.searchParams.get("date_to");

  const where = {
    organization_id: ctx.organization_id,
    ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}),
    deleted_at: null,
    ...(fromAccountId ? { from_account_id: fromAccountId } : {}),
    ...(toAccountId ? { to_account_id: toAccountId } : {}),
    ...(status ? { status } : {}),
    ...(fund ? { fund } : {}),
    ...(dateFrom || dateTo
      ? {
          transfer_date: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
          },
        }
      : {}),
  };

  const [transfers, total] = await Promise.all([
    db.cashBankTransfer.findMany({
      where,
      orderBy: { transfer_date: "desc" },
      skip,
      take,
      include: {
        from_account: { select: { id: true, name: true, code: true, is_cash: true, is_bank: true } },
        to_account: { select: { id: true, name: true, code: true, is_cash: true, is_bank: true } },
        initiator: { select: { id: true, name: true } },
      },
    }),
    db.cashBankTransfer.count({ where }),
  ]);

  return jsonResponse({
    data: transfers.map((t) => ({
      id: t.id,
      voucher_no: t.voucher_no,
      from_account: t.from_account,
      to_account: t.to_account,
      amount: Number(t.amount),
      fund: t.fund,
      transfer_date: t.transfer_date,
      narration: t.narration,
      initiated_by: t.initiator.name,
      status: t.status,
      completed_at: t.completed_at,
      ledger_entry_id: t.ledger_entry_id,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
});
