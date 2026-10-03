/**
 * MadrashaOS — Monthly Summary Report API
 *
 * GET /api/v1/reports/monthly-summary
 *   Returns a clear income vs expense breakdown for a given month or year.
 *   Designed for committee meetings — no accounting jargon, just totals.
 *
 *   Query params:
 *     month  (1-12, required if not year-only)
 *     year   (e.g. 2026, required)
 *
 *   Permission: reports.view (or reports.finance.view)
 *
 *   Returns:
 *   {
 *     period: { month, year, label: "September 2026" },
 *     income: [
 *       { account_name, amount, source_type }
 *     ],
 *     expenses: [
 *       { account_name, amount, source_type }
 *     ],
 *     summary: {
 *       total_income, total_expenses, net_surplus,
 *       zakat_received, zakat_distributed, zakat_balance,
 *       general_balance
 *     }
 *   }
 */

import { db } from "@/lib/db";
import { getTenantContext, tenantWhere } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const GET = withPermission("reports.view", async (req: Request) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const monthStr = url.searchParams.get("month");
  const yearStr = url.searchParams.get("year");

  const now = new Date();
  const year = yearStr ? parseInt(yearStr, 10) : now.getFullYear();
  const month = monthStr ? parseInt(monthStr, 10) : null; // null = full year

  if (Number.isNaN(year)) return errorResponse("Invalid year", 400);
  if (month !== null && (month < 1 || month > 12)) return errorResponse("Invalid month (1-12)", 400);

  // Build date range
  let startDate: Date;
  let endDate: Date;
  let periodLabel: string;

  if (month !== null) {
    startDate = new Date(year, month - 1, 1);
    endDate = new Date(year, month, 0, 23, 59, 59); // last day of month
    periodLabel = `${MONTH_NAMES[month - 1]} ${year}`;
  } else {
    startDate = new Date(year, 0, 1);
    endDate = new Date(year, 11, 31, 23, 59, 59);
    periodLabel = `Year ${year}`;
  }

  const where = {
    ...tenantWhere(ctx),
    deleted_at: null,
    status: "posted",
    date: { gte: startDate, lte: endDate },
  };

  // Fetch all posted ledger entries in the period
  const entries = await db.ledgerEntry.findMany({
    where,
    include: {
      debit_account: { select: { id: true, name: true, type: true, fund: true } },
      credit_account: { select: { id: true, name: true, type: true, fund: true } },
    },
    orderBy: { date: "asc" },
  });

  // Group by account: income = credit to income accounts, expense = debit to expense accounts
  const incomeMap = new Map<string, { account_name: string; amount: number; source_types: Set<string> }>();
  const expenseMap = new Map<string, { account_name: string; amount: number; source_types: Set<string> }>();
  let zakatReceived = 0;
  let zakatDistributed = 0;

  for (const entry of entries) {
    const amount = Number(entry.amount);

    // Income: credit account is type "income" → money came IN
    if (entry.credit_account?.type === "income") {
      const key = entry.credit_account.id;
      const existing = incomeMap.get(key);
      if (existing) {
        existing.amount += amount;
        if (entry.source_type) existing.source_types.add(entry.source_type);
      } else {
        incomeMap.set(key, {
          account_name: entry.credit_account.name,
          amount,
          source_types: new Set(entry.source_type ? [entry.source_type] : []),
        });
      }
    }

    // Expense: debit account is type "expense" → money went OUT
    if (entry.debit_account?.type === "expense") {
      const key = entry.debit_account.id;
      const existing = expenseMap.get(key);
      if (existing) {
        existing.amount += amount;
        if (entry.source_type) existing.source_types.add(entry.source_type);
      } else {
        expenseMap.set(key, {
          account_name: entry.debit_account.name,
          amount,
          source_types: new Set(entry.source_type ? [entry.source_type] : []),
        });
      }
    }

    // Zakat tracking
    if (entry.fund === "zakat") {
      if (entry.credit_account?.type === "income") zakatReceived += amount;
      if (entry.debit_account?.type === "expense") zakatDistributed += amount;
    }
  }

  // Convert maps to sorted arrays
  const income = Array.from(incomeMap.values())
    .map((v) => ({
      account_name: v.account_name,
      amount: v.amount,
      source_types: Array.from(v.source_types),
    }))
    .sort((a, b) => b.amount - a.amount);

  const expenses = Array.from(expenseMap.values())
    .map((v) => ({
      account_name: v.account_name,
      amount: v.amount,
      source_types: Array.from(v.source_types),
    }))
    .sort((a, b) => b.amount - a.amount);

  const totalIncome = income.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netSurplus = totalIncome - totalExpenses;

  // Get current fund balances from accounts
  const generalAccounts = await db.account.findMany({
    where: { ...tenantWhere(ctx), fund: "general", deleted_at: null, is_active: true },
    select: { balance: true },
  });
  const zakatAccounts = await db.account.findMany({
    where: { ...tenantWhere(ctx), fund: "zakat", deleted_at: null, is_active: true },
    select: { balance: true },
  });
  const generalBalance = generalAccounts.reduce((s, a) => s + Number(a.balance), 0);
  const zakatBalance = zakatAccounts.reduce((s, a) => s + Number(a.balance), 0);

  return jsonResponse({
    period: {
      month,
      year,
      label: periodLabel,
      start_date: startDate.toISOString().slice(0, 10),
      end_date: endDate.toISOString().slice(0, 10),
    },
    income,
    expenses,
    summary: {
      total_income: totalIncome,
      total_expenses: totalExpenses,
      net_surplus: netSurplus,
      zakat_received: zakatReceived,
      zakat_distributed: zakatDistributed,
      zakat_balance: zakatBalance,
      general_balance: generalBalance,
      transaction_count: entries.length,
    },
  });
});
