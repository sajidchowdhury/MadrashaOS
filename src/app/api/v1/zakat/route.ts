/**
 * MadrashaOS — Zakat API (Fund-Isolated)
 *
 * Phase B6.5 — Zakat API (fund isolation)
 *
 * GET /api/v1/zakat — Zakat dashboard: fund balance + transactions
 *   Permission: zakat.view
 *   Risk R9: fund-isolated visualization; Zakat badge on every row;
 *   non-Zakat accounts greyed out (frontend renders based on fund field)
 *
 * Returns:
 *   - Zakat fund balance (from Account where fund='zakat')
 *   - Total received + total distributed
 *   - Recent transactions (receive + distribute)
 *   - Non-Zakat accounts listed separately (greyed for frontend)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, parsePagination } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/** GET /api/v1/zakat — Zakat dashboard */
export const GET = withPermission("zakat.view", async (req: Request) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const direction = url.searchParams.get("direction"); // receive | distribute
  const dateFrom = url.searchParams.get("date_from");
  const dateTo = url.searchParams.get("date_to");

  // 1. Get the Zakat fund account(s)
  const zakatAccounts = await db.account.findMany({
    where: {
      organization_id: ctx.organization_id,
      ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}),
      fund: "zakat",
      deleted_at: null,
      is_active: true,
    },
    select: { id: true, code: true, name: true, name_bn: true, balance: true, type: true },
  });

  const zakatAccountIds = zakatAccounts.map((a) => a.id);
  const totalZakatBalance = zakatAccounts.reduce((sum, a) => sum + Number(a.balance), 0);

  // 2. Get non-Zakat accounts (for greyed-out display — Risk R9)
  const nonZakatAccounts = await db.account.findMany({
    where: {
      organization_id: ctx.organization_id,
      ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}),
      fund: "general",
      deleted_at: null,
      is_active: true,
      type: { in: ["asset", "liability"] },
    },
    select: { id: true, code: true, name: true, balance: true, type: true, fund: true },
  });

  // 3. Get Zakat transactions
  const where = {
    organization_id: ctx.organization_id,
    ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}),
    deleted_at: null,
    ...(direction ? { direction } : {}),
    ...(dateFrom || dateTo
      ? {
          transaction_date: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
          },
        }
      : {}),
  };

  const [transactions, total] = await Promise.all([
    db.zakatTransaction.findMany({
      where,
      orderBy: { transaction_date: "desc" },
      skip,
      take,
      include: {
        account: { select: { id: true, name: true, code: true, fund: true } },
        student: { select: { id: true, name: true, name_bn: true, code: true } },
        handler: { select: { id: true, name: true } },
      },
    }),
    db.zakatTransaction.count({ where }),
  ]);

  // 4. Calculate totals
  const allTransactions = await db.zakatTransaction.findMany({
    where: { ...where, deleted_at: null },
    select: { direction: true, amount: true },
  });
  const totalReceived = allTransactions
    .filter((t) => t.direction === "receive")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalDistributed = allTransactions
    .filter((t) => t.direction === "distribute")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return jsonResponse({
    summary: {
      zakat_fund_balance: totalZakatBalance,
      total_received: totalReceived,
      total_distributed: totalDistributed,
      net_balance: totalReceived - totalDistributed,
      transaction_count: total,
    },
    zakat_accounts: zakatAccounts.map((a) => ({
      ...a,
      balance: Number(a.balance),
      fund: "zakat", // Risk R9: badge on every Zakat account
      is_zakat: true,
    })),
    non_zakat_accounts: nonZakatAccounts.map((a) => ({
      ...a,
      balance: Number(a.balance),
      fund: "general",
      is_zakat: false, // Risk R9: frontend greys these out
    })),
    transactions: transactions.map((t) => ({
      id: t.id,
      voucher_no: t.voucher_no,
      receipt_no: t.receipt_no,
      direction: t.direction,
      amount: Number(t.amount),
      transaction_date: t.transaction_date,
      narration: t.narration,
      purpose: t.purpose,
      account: t.account,
      student: t.student
        ? { id: t.student.id, name: t.student.name, name_bn: t.student.name_bn, code: t.student.code }
        : null,
      recipient_name: t.recipient_name,
      donor_name: t.donor_name,
      handled_by: t.handler.name,
      fund: "zakat", // Risk R9: badge on every transaction row
      is_zakat: true,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
});
