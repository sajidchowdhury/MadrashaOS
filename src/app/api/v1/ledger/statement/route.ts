/**
 * MadrashaOS — Ledger Statement API
 *
 * Phase B6.3 — Accounting (GL) API
 *
 * GET /api/v1/ledger/statement — account statement with running balance
 *   Query params: account_id (required), date_from, date_to
 *   Returns: opening balance + all entries + closing balance
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { jsonResponse, errorResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/** GET /api/v1/ledger/statement?account_id=... */
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const accountId = url.searchParams.get("account_id");
  const dateFrom = url.searchParams.get("date_from");
  const dateTo = url.searchParams.get("date_to");

  if (!accountId) return errorResponse("account_id is required", 400);

  // Verify account exists
  const account = await db.account.findFirst({
    where: { id: accountId, organization_id: ctx.organization_id, deleted_at: null },
    select: { id: true, name: true, code: true, type: true, fund: true, balance: true },
  });
  if (!account) return errorResponse("Account not found", 404);

  // Build where clause
  const where = {
    organization_id: ctx.organization_id,
    deleted_at: null,
    is_reversed: false,
    status: "posted",
    OR: [{ debit_account_id: accountId }, { credit_account_id: accountId }],
    ...(dateFrom || dateTo
      ? {
          date: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
          },
        }
      : {}),
  };

  // Get entries in chronological order
  const entries = await db.ledgerEntry.findMany({
    where,
    orderBy: [{ date: "asc" }, { created_at: "asc" }],
    include: {
      debit_account: { select: { id: true, name: true, code: true } },
      credit_account: { select: { id: true, name: true, code: true } },
    },
  });

  // Calculate opening balance (balance before date_from, or 0 if not specified)
  let openingBalance = 0;

  if (dateFrom) {
    // Get all entries before date_from for this account
    const priorEntries = await db.ledgerEntry.findMany({
      where: {
        organization_id: ctx.organization_id,
        deleted_at: null,
        is_reversed: false,
        status: "posted",
        OR: [{ debit_account_id: accountId }, { credit_account_id: accountId }],
        date: { lt: new Date(dateFrom) },
      },
      include: {
        debit_account: { select: { id: true } },
        credit_account: { select: { id: true } },
      },
    });

    for (const e of priorEntries) {
      const amount = Number(e.amount);
      if (e.debit_account_id === accountId) {
        openingBalance += (account.type === "asset" || account.type === "expense") ? amount : -amount;
      } else {
        openingBalance += (account.type === "asset" || account.type === "expense") ? -amount : amount;
      }
    }
  }

  // Build statement with running balance
  let runningBalance = openingBalance;
  const statementEntries = entries.map((e) => {
    const amount = Number(e.amount);
    let debit = 0;
    let credit = 0;

    if (e.debit_account_id === accountId) {
      debit = amount;
      if (account.type === "asset" || account.type === "expense") {
        runningBalance += amount;
      } else {
        runningBalance -= amount;
      }
    } else {
      credit = amount;
      if (account.type === "asset" || account.type === "expense") {
        runningBalance -= amount;
      } else {
        runningBalance += amount;
      }
    }

    return {
      id: e.id,
      voucher_no: e.voucher_no,
      date: e.date,
      narration: e.narration,
      debit: debit,
      credit: credit,
      balance: Math.round(runningBalance * 100) / 100,
      counterparty: e.debit_account_id === accountId ? e.credit_account.name : e.debit_account.name,
    };
  });

  return jsonResponse({
    account: {
      id: account.id,
      name: account.name,
      code: account.code,
      type: account.type,
      fund: account.fund,
    },
    period: {
      from: dateFrom || null,
      to: dateTo || null,
    },
    opening_balance: Math.round(openingBalance * 100) / 100,
    closing_balance: Math.round(runningBalance * 100) / 100,
    total_debits: statementEntries.reduce((sum, e) => sum + e.debit, 0),
    total_credits: statementEntries.reduce((sum, e) => sum + e.credit, 0),
    entry_count: statementEntries.length,
    entries: statementEntries,
  });
}
