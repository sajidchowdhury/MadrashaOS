"use client";

/**
 * MadrashaOS — Financial Reports (redesigned for committee meetings)
 *
 * Route: /reports
 *
 * Real API data (GET /api/v1/reports/monthly-summary) — no more mock.
 *
 * Features:
 *   - Month + Year selector (or "Full Year" toggle)
 *   - Income section: all income accounts + amounts (green)
 *   - Expense section: all expense accounts + amounts (red)
 *   - Summary bar: Total Income | Total Expenses | Net Surplus/Deficit
 *   - Zakat Fund summary: received, distributed, balance (separate)
 *   - Print button (window.print) for meetings
 *   - Clean, jargon-free layout — no "debit/credit"
 */

import * as React from "react";
import {
  BarChart3, Printer, TrendingUp, TrendingDown, Scale,
  CheckCircle2, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { LoadingState, ErrorState, PermissionDenied } from "@/components/states";
import { EmptyState } from "@/components/ui/empty-state";
import { useSessionStore } from "@/stores/sessionStore";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/i18n/format";

type IncomeItem = { account_name: string; amount: number; source_types: string[] };
type ExpenseItem = { account_name: string; amount: number; source_types: string[] };
type Summary = {
  total_income: number;
  total_expenses: number;
  net_surplus: number;
  zakat_received: number;
  zakat_distributed: number;
  zakat_balance: number;
  general_balance: number;
  transaction_count: number;
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function ReportsPage() {
  const { hasPermission } = useSessionStore();
  const canView = hasPermission("reports.view");

  const now = new Date();
  const [month, setMonth] = React.useState<string>(String(now.getMonth() + 1));
  const [year, setYear] = React.useState<string>(String(now.getFullYear()));
  const [fullYear, setFullYear] = React.useState(false);

  const [income, setIncome] = React.useState<IncomeItem[]>([]);
  const [expenses, setExpenses] = React.useState<ExpenseItem[]>([]);
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [periodLabel, setPeriodLabel] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [hasFetched, setHasFetched] = React.useState(false);

  const fetchReport = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    setHasFetched(true);
    try {
      const params = new URLSearchParams();
      params.set("year", year);
      if (!fullYear) params.set("month", month);
      const res = await fetch(`/api/v1/reports/monthly-summary?${params}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(true);
        setLoading(false);
        return;
      }
      setIncome((data?.income ?? []) as IncomeItem[]);
      setExpenses((data?.expenses ?? []) as ExpenseItem[]);
      setSummary(data?.summary as Summary);
      setPeriodLabel(data?.period?.label ?? "");
    } catch {
      setError(true);
    }
    setLoading(false);
  }, [month, year, fullYear]);

  React.useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  if (!canView) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <PermissionDenied resource="Reports" />
        </div>
      </div>
    );
  }

  const totalIncome = summary?.total_income ?? 0;
  const totalExpenses = summary?.total_expenses ?? 0;
  const netSurplus = summary?.net_surplus ?? 0;
  const isSurplus = netSurplus >= 0;

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-display font-bold text-text-primary">
              <BarChart3 className="h-7 w-7 text-primary-500" aria-hidden />
              Financial Reports
            </h1>
            <p className="mt-1 text-body text-text-secondary">
              Clear income vs expense summary for committee meetings.
            </p>
          </div>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print Report
          </Button>
        </header>

        {/* Period selector */}
        <div className="flex flex-wrap items-end gap-3">
          {!fullYear && (
            <div className="space-y-1.5">
              <Label htmlFor="month-select">Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger id="month-select" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="year-input">Year</Label>
            <Input
              id="year-input"
              type="number"
              min={2020}
              max={2050}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-24"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 pb-2">
            <input
              type="checkbox"
              checked={fullYear}
              onChange={(e) => setFullYear(e.target.checked)}
              className="h-4 w-4 rounded border-border-default"
            />
            <span className="text-body text-text-secondary">Full Year</span>
          </label>
        </div>

        {/* Loading / Error */}
        {loading && <LoadingState pattern="list" rows={4} />}
        {error && <ErrorState onRetry={fetchReport} />}

        {/* No data */}
        {!loading && !error && hasFetched && summary && summary.transaction_count === 0 && (
          <EmptyState
            illustration="fees"
            title="No transactions in this period"
            description={`No posted ledger entries found for ${periodLabel}. Try a different month or year.`}
          />
        )}

        {/* Report */}
        {!loading && !error && summary && summary.transaction_count > 0 && (
          <>
            {/* Period label */}
            <div className="text-center">
              <h2 className="text-display font-bold text-text-primary">{periodLabel}</h2>
              <p className="text-caption text-text-muted">
                {summary.transaction_count} transaction(s) · Generated {new Date().toLocaleDateString()}
              </p>
            </div>

            {/* Summary bar */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border-2 border-success-200 bg-success-50 p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-semantic-success">
                  <TrendingUp className="h-5 w-5" />
                  <span className="text-caption font-medium uppercase tracking-wide">Total Income</span>
                </div>
                <p className="mt-2 font-mono text-display font-bold text-semantic-success">
                  {formatCurrency(totalIncome, "en")}
                </p>
              </div>
              <div className="rounded-lg border-2 border-danger-200 bg-danger-50 p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-semantic-danger">
                  <TrendingDown className="h-5 w-5" />
                  <span className="text-caption font-medium uppercase tracking-wide">Total Expenses</span>
                </div>
                <p className="mt-2 font-mono text-display font-bold text-semantic-danger">
                  {formatCurrency(totalExpenses, "en")}
                </p>
              </div>
              <div className={`rounded-lg border-2 p-4 text-center ${
                isSurplus
                  ? "border-primary-200 bg-primary-50"
                  : "border-semantic-danger/40 bg-danger-50"
              }`}>
                <div className={`flex items-center justify-center gap-2 ${
                  isSurplus ? "text-primary-600" : "text-semantic-danger"
                }`}>
                  {isSurplus ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                  <span className="text-caption font-medium uppercase tracking-wide">
                    {isSurplus ? "Net Surplus" : "Net Deficit"}
                  </span>
                </div>
                <p className={`mt-2 font-mono text-display font-bold ${
                  isSurplus ? "text-primary-700" : "text-semantic-danger"
                }`}>
                  {formatCurrency(Math.abs(netSurplus), "en")}
                </p>
              </div>
            </div>

            {/* Income breakdown */}
            {income.length > 0 && (
              <div className="rounded-lg border border-border-default bg-surface-card overflow-hidden">
                <div className="border-b border-border-default bg-success-50 px-4 py-2">
                  <h3 className="flex items-center gap-2 text-subtitle font-semibold text-semantic-success">
                    <TrendingUp className="h-4 w-4" />
                    Income Breakdown
                  </h3>
                </div>
                <div className="divide-y divide-border-default">
                  {income.map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2">
                      <div>
                        <p className="text-body font-medium text-text-primary">{item.account_name}</p>
                        {item.source_types.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {item.source_types.map((st) => (
                              <Badge key={st} variant="outline" className="text-[10px] font-normal">
                                {st}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="font-mono text-body font-bold text-semantic-success">
                        {formatCurrency(item.amount, "en")}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t-2 border-success-200 bg-success-50/50 px-4 py-2">
                  <span className="text-body font-semibold text-text-primary">Total Income</span>
                  <span className="font-mono text-subtitle font-bold text-semantic-success">
                    {formatCurrency(totalIncome, "en")}
                  </span>
                </div>
              </div>
            )}

            {/* Expense breakdown */}
            {expenses.length > 0 && (
              <div className="rounded-lg border border-border-default bg-surface-card overflow-hidden">
                <div className="border-b border-border-default bg-danger-50 px-4 py-2">
                  <h3 className="flex items-center gap-2 text-subtitle font-semibold text-semantic-danger">
                    <TrendingDown className="h-4 w-4" />
                    Expense Breakdown
                  </h3>
                </div>
                <div className="divide-y divide-border-default">
                  {expenses.map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2">
                      <div>
                        <p className="text-body font-medium text-text-primary">{item.account_name}</p>
                        {item.source_types.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {item.source_types.map((st) => (
                              <Badge key={st} variant="outline" className="text-[10px] font-normal">
                                {st}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="font-mono text-body font-bold text-semantic-danger">
                        {formatCurrency(item.amount, "en")}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t-2 border-danger-200 bg-danger-50/50 px-4 py-2">
                  <span className="text-body font-semibold text-text-primary">Total Expenses</span>
                  <span className="font-mono text-subtitle font-bold text-semantic-danger">
                    {formatCurrency(totalExpenses, "en")}
                  </span>
                </div>
              </div>
            )}

            {/* Zakat Fund Summary */}
            <div className="rounded-lg border-2 border-accent-300 bg-accent-50 p-4">
              <h3 className="flex items-center gap-2 text-subtitle font-semibold text-accent-700">
                <Scale className="h-5 w-5" />
                Zakat Fund Summary
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="text-center">
                  <p className="text-caption uppercase tracking-wide text-accent-600">Received (this period)</p>
                  <p className="mt-1 font-mono text-body font-bold text-semantic-success">
                    {formatCurrency(summary.zakat_received, "en")}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-caption uppercase tracking-wide text-accent-600">Distributed (this period)</p>
                  <p className="mt-1 font-mono text-body font-bold text-semantic-danger">
                    {formatCurrency(summary.zakat_distributed, "en")}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-caption uppercase tracking-wide text-accent-600">Current Balance</p>
                  <p className="mt-1 font-mono text-display font-bold text-accent-700">
                    {formatCurrency(summary.zakat_balance, "en")}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-center text-caption text-accent-600">
                Zakat money is sacred — never mixed with general funds
              </p>
            </div>

            {/* Fund balances */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border-default bg-surface-card p-4">
                <p className="text-caption font-medium uppercase tracking-wide text-text-muted">General Fund Balance</p>
                <p className="mt-1 font-mono text-display font-bold text-primary-500">
                  {formatCurrency(summary.general_balance, "en")}
                </p>
              </div>
              <div className="rounded-lg border-2 border-accent-200 bg-accent-50 p-4">
                <p className="text-caption font-medium uppercase tracking-wide text-accent-700">Zakat Fund Balance</p>
                <p className="mt-1 font-mono text-display font-bold text-accent-700">
                  {formatCurrency(summary.zakat_balance, "en")}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Initial state (no fetch yet) */}
        {!loading && !error && !hasFetched && (
          <EmptyState
            illustration="fees"
            title="Select a period"
            description="Choose a month and year, then the report will load automatically."
          />
        )}
      </div>
    </div>
  );
}
