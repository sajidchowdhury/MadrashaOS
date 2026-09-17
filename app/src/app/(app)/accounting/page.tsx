"use client";

/**
 * MadrashaOS — Accounting / Ledger Explorer (C3.4 — Finance · Accounting)
 *
 * Full-width ledger explorer per SRS §2.4.3 (Double-Entry Ledger) with:
 *   - FilterBar (date range + status filter)
 *   - Table: Voucher No · Date · Narration · Debit · Credit · Amount ·
 *            Status badge · Posted By · Running balance (cumulative)
 *   - "New Entry" button gated by `accounting.ledger.post`
 *
 * The New-Entry dialog enforces the double-entry invariant
 * "Debits must equal credits" via the LedgerEntryForm component.
 *
 *   Loading → LoadingState pattern="table"
 *   Error   → ErrorState + retry
 *   Empty   → EmptyState illustration="fees"
 */

import * as React from "react";
import { Calculator, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { FilterBar } from "@/components/ui/filter-bar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { IfPermission } from "@/components/auth/IfPermission";
import { LoadingState, ErrorState, PermissionDenied } from "@/components/states";
import { EmptyState } from "@/components/ui/empty-state";
import { useSessionStore } from "@/stores/sessionStore";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatCurrency, formatDate } from "@/lib/i18n/format";
import { useLedgerEntries, useAccounts } from "@/lib/query/client";
import { users } from "@/lib/mock/fixtures/users";
import { LedgerEntryForm } from "@/components/finance/LedgerEntryForm";

type StatusFilter = "all" | "posted" | "pending" | "rejected";

export default function AccountingPage() {
  const { locale } = useI18n();
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const canView = hasPermission("accounting.ledger.view");

  const { data: ledger, isLoading, isError, refetch } = useLedgerEntries();
  const { data: accounts } = useAccounts();

  const [fromDate, setFromDate] = React.useState<string>("");
  const [toDate, setToDate] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [search, setSearch] = React.useState("");
  const [entryOpen, setEntryOpen] = React.useState(false);

  const accountName = (id: string) => accounts?.find((a) => a.id === id)?.name ?? id;
  const postedBy = (id: string) => users.find((u) => u.id === id)?.name ?? id;

  const filtered = React.useMemo(() => {
    if (!ledger) return [];
    return ledger
      .filter((e) => {
        if (statusFilter !== "all" && e.status !== statusFilter) return false;
        if (fromDate && e.date < fromDate) return false;
        if (toDate && e.date > toDate) return false;
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          if (
            !e.voucherNo.toLowerCase().includes(q) &&
            !e.narration.toLowerCase().includes(q)
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }, [ledger, statusFilter, fromDate, toDate, search]);

  // Running balance: cumulative sum of entry amounts (in chronological order).
  // Computed via slice+reduce per index so no variable is reassigned (lint-safe).
  const withBalance = React.useMemo(() => {
    return filtered.map((entry, idx) => ({
      ...entry,
      balance: filtered.slice(0, idx + 1).reduce((acc, e) => acc + e.amount, 0),
    }));
  }, [filtered]);

  if (!canView) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <PermissionDenied resource="Accounting Ledger" />
        </div>
      </div>
    );
  }

  const totalDebits = withBalance.reduce((s, e) => s + e.amount, 0);
  const pendingCount = withBalance.filter((e) => e.status === "pending").length;
  const activeFilters = (statusFilter !== "all" ? 1 : 0) + (fromDate ? 1 : 0) + (toDate ? 1 : 0);

  const clearFilters = () => {
    setStatusFilter("all");
    setFromDate("");
    setToDate("");
    setSearch("");
  };

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-display font-bold text-text-primary">Ledger Explorer</h1>
            <p className="mt-1 text-body text-text-secondary">
              Double-entry journal vouchers with running balance.
            </p>
          </div>
          <IfPermission code="accounting.ledger.post">
            <Button onClick={() => setEntryOpen(true)}>
              <Plus className="h-4 w-4" />
              New Entry
            </Button>
          </IfPermission>
        </header>

        {/* KPI strip */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border-default bg-surface-card p-4">
            <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
              Total Movement
            </p>
            <p className="mt-1 font-mono text-display font-bold text-primary-500">
              {formatCurrency(totalDebits, locale)}
            </p>
          </div>
          <div className="rounded-lg border border-border-default bg-surface-card p-4">
            <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
              Entries Shown
            </p>
            <p className="mt-1 font-mono text-display font-bold text-text-primary">
              {withBalance.length}
            </p>
          </div>
          <div className="rounded-lg border border-border-default bg-surface-card p-4">
            <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
              Pending Review
            </p>
            <p className="mt-1 font-mono text-display font-bold text-semantic-warning">
              {pendingCount}
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <FilterBar activeCount={activeFilters} onClear={activeFilters > 0 ? clearFilters : undefined}>
          <div className="flex items-center gap-2">
            <label htmlFor="from-date" className="text-caption text-text-secondary">From</label>
            <Input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-8 w-36"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="to-date" className="text-caption text-text-secondary">To</label>
            <Input
              id="to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-8 w-36"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger size="sm" className="w-32" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="posted">Posted</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1 min-w-48">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              placeholder="Voucher no / narration…"
              className="h-8 ps-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search ledger"
            />
          </div>
        </FilterBar>

        {/* Body */}
        {isLoading && <LoadingState pattern="table" rows={8} />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {!isLoading && !isError && withBalance.length === 0 && (
          <EmptyState
            illustration="fees"
            title="No ledger entries"
            description="Adjust your filters or post a new entry to get started."
            action={
              <IfPermission code="accounting.ledger.post">
                <Button onClick={() => setEntryOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Post First Entry
                </Button>
              </IfPermission>
            }
          />
        )}
        {!isLoading && !isError && withBalance.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border-default bg-surface-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50">
                    <TableHead className="px-4">Voucher No</TableHead>
                    <TableHead className="px-4">Date</TableHead>
                    <TableHead className="px-4 min-w-64">Narration</TableHead>
                    <TableHead className="px-4">Debit</TableHead>
                    <TableHead className="px-4">Credit</TableHead>
                    <TableHead className="px-4 text-end">Amount</TableHead>
                    <TableHead className="px-4 text-end">Running Balance</TableHead>
                    <TableHead className="px-4">Status</TableHead>
                    <TableHead className="px-4">Posted By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withBalance.map((e) => {
                    const statusVariant =
                      e.status === "posted"
                        ? "border-semantic-success/40 text-semantic-success"
                        : e.status === "pending"
                          ? "border-semantic-warning/40 text-semantic-warning"
                          : "border-semantic-danger/40 text-semantic-danger";
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="px-4 py-3 font-mono text-caption text-text-primary">
                          {e.voucherNo}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-caption text-text-secondary">
                          {formatDate(new Date(e.date), locale)}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-body text-text-primary">
                          {e.narration}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-body text-text-secondary">
                          {accountName(e.debitAccount)}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-body text-text-secondary">
                          {accountName(e.creditAccount)}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-end font-mono text-body text-text-primary">
                          {formatCurrency(e.amount, locale)}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-end font-mono text-body text-primary-700">
                          {formatCurrency(e.balance, locale)}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge variant="outline" className={statusVariant}>
                            <span className="capitalize">{e.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-caption text-text-secondary">
                          {postedBy(e.postedBy)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {!isLoading && !isError && withBalance.length > 0 && (
          <p className="text-caption text-text-muted">
            Showing {withBalance.length} of {ledger?.length ?? 0} entries ·
            Running balance is cumulative in chronological order.
          </p>
        )}
      </div>

      <LedgerEntryForm open={entryOpen} onOpenChange={setEntryOpen} />
    </div>
  );
}
