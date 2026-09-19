"use client";

/**
 * MadrashaOS — Cash & Bank Transfers (Phase P3 — Finance)
 *
 * Route: /cashbank
 *
 * Full-width data table of all cash/bank transfer vouchers in the current
 * tenant (or current branch for branch-scoped roles), with:
 *   - Search bar (filters by voucher no, narration, account name — client-side)
 *   - FilterBar: status filter (pending / completed / cancelled), fund filter
 *     (general / zakat / donation)
 *   - Columns: Voucher No | From → To | Amount | Fund | Transfer Date |
 *              Initiated By | Status
 *   - LoadingState pattern="table" while loading
 *   - EmptyState when search/filter produces no results
 *
 * Per SRS §5.1: page visible only to roles with `cashbank.transfer`.
 *
 * Data hook: useCashBankTransfers() from src/lib/query/client.ts — TanStack
 * Query against GET /api/v1/cashbank/transfers (camelCase via toCamel()).
 *
 * Each transfer posts a paired ledger entry (debit destination account,
 * credit source account). The `ledgerEntryId` column links to the
 * underlying ledger voucher for audit traceability.
 */

import * as React from "react";
import { Landmark, Search, ArrowRight, Banknote } from "lucide-react";
import { useCashBankTransfers } from "@/lib/query/client";
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
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState, ErrorState, PermissionDenied } from "@/components/states";
import { IfPermission } from "@/components/auth/IfPermission";
import {
  SectionCard, SectionCardHeader,
} from "@/components/foundation/SectionCard";
import { useSessionStore } from "@/stores/sessionStore";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatCurrency, formatDate, formatNumber } from "@/lib/i18n/format";

/** Row shape produced by api.getCashBankTransfers() (camelCase via toCamel()). */
type TransferRow = {
  id: string;
  voucherNo: string;
  fromAccount: { id?: string; name?: string; code?: string } | null;
  toAccount: { id?: string; name?: string; code?: string } | null;
  amount: number;
  fund: string;
  transferDate: string | null;
  narration: string | null;
  initiatedBy: string;
  status: string;
  completedAt: string | null;
  ledgerEntryId: string | null;
};

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const FUND_OPTIONS = [
  { value: "all", label: "All funds" },
  { value: "general", label: "General" },
  { value: "zakat", label: "Zakat" },
  { value: "donation", label: "Donation" },
] as const;

/** Status badge with the design-system's semantic colors. */
function StatusBadge({ status }: { status: string }) {
  const value = (status ?? "pending").toLowerCase();
  const cls =
    value === "completed"
      ? "border-semantic-success/40 bg-success-50 text-semantic-success"
      : value === "pending"
        ? "border-semantic-warning/40 bg-warning-50 text-semantic-warning"
        : value === "cancelled"
          ? "border-semantic-danger/40 bg-danger-50 text-semantic-danger"
          : "text-text-muted";
  return <Badge variant="outline" className={cls}>{value}</Badge>;
}

export default function CashBankPage() {
  const { locale } = useI18n();
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const canView = hasPermission("cashbank.transfer");

  const {
    data: transfers,
    isLoading,
    isError,
    refetch,
  } = useCashBankTransfers();

  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<string>("all");
  const [fund, setFund] = React.useState<string>("all");

  // Client-side filter pipeline.
  const filtered = React.useMemo(() => {
    if (!transfers) return [];
    const q = search.trim().toLowerCase();
    return (transfers as TransferRow[]).filter((t) => {
      if (status !== "all" && (t.status ?? "pending").toLowerCase() !== status) return false;
      if (fund !== "all" && (t.fund ?? "").toLowerCase() !== fund) return false;
      if (q) {
        const haystack =
          `${t.voucherNo} ${t.fromAccount?.name ?? ""} ${t.toAccount?.name ?? ""} ${t.fromAccount?.code ?? ""} ${t.toAccount?.code ?? ""} ${t.narration ?? ""} ${t.initiatedBy ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [transfers, search, status, fund]);

  const activeFilterCount =
    (status !== "all" ? 1 : 0) + (fund !== "all" ? 1 : 0) + (search ? 1 : 0);

  const clearFilters = React.useCallback(() => {
    setSearch("");
    setStatus("all");
    setFund("all");
  }, []);

  if (!canView) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <PermissionDenied resource="Cash &amp; Bank" />
        </div>
      </div>
    );
  }

  const totalTransfers = (transfers as TransferRow[] | undefined)?.length ?? 0;
  const totalAmount = (transfers as TransferRow[] | undefined)
    ?.reduce((sum, t) => sum + (t.amount ?? 0), 0) ?? 0;
  const pendingCount = (transfers as TransferRow[] | undefined)
    ?.filter((t) => (t.status ?? "").toLowerCase() === "pending").length ?? 0;

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-display font-bold text-text-primary">
              <Landmark className="h-7 w-7 text-primary-500" aria-hidden />
              Cash &amp; Bank Transfers
            </h1>
            <p className="mt-1 text-body text-text-secondary">
              Track cash-to-bank, bank-to-cash and inter-account transfers.
              Each transfer posts a paired ledger entry for full audit
              traceability.
            </p>
          </div>
        </header>

        {/* KPI strip */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border-default bg-surface-card p-4 shadow-elevation-1">
            <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
              Total Transfers
            </p>
            <p className="mt-1 font-mono text-display font-bold text-primary-500">
              {formatNumber(totalTransfers, locale)}
            </p>
          </div>
          <div className="rounded-lg border border-border-default bg-surface-card p-4 shadow-elevation-1">
            <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
              Total Moved
            </p>
            <p className="mt-1 font-mono text-display font-bold text-semantic-success">
              {formatCurrency(totalAmount, locale)}
            </p>
          </div>
          <div className="rounded-lg border border-border-default bg-surface-card p-4 shadow-elevation-1">
            <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
              Pending
            </p>
            <p className="mt-1 font-mono text-display font-bold text-semantic-warning">
              {formatNumber(pendingCount, locale)}
            </p>
          </div>
        </div>

        {/* Search + Filters */}
        <FilterBar activeCount={activeFilterCount} onClear={clearFilters}>
          <div className="relative min-w-56 flex-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            />
            <Input
              type="search"
              role="searchbox"
              aria-label="Search transfers by voucher no or account"
              placeholder="Search by voucher no, account or narration…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 ps-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger
              size="sm"
              className="w-40"
              aria-label="Filter by status"
            >
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={fund} onValueChange={setFund}>
            <SelectTrigger
              size="sm"
              className="w-36"
              aria-label="Filter by fund source"
            >
              <SelectValue placeholder="All funds" />
            </SelectTrigger>
            <SelectContent>
              {FUND_OPTIONS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterBar>

        {/* Count summary */}
        <div className="flex items-center justify-between text-caption text-text-secondary">
          <span>
            Showing{" "}
            <span className="font-semibold text-text-primary">
              {formatNumber(filtered.length, locale)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-text-primary">
              {formatNumber(totalTransfers, locale)}
            </span>{" "}
            transfers
          </span>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-primary-50 px-2 py-0.5 font-medium text-primary-700">
              {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"} applied
            </span>
          )}
        </div>

        {/* Table — error / loading / empty / data states */}
        {isError && (
          <ErrorState
            title="Couldn't load transfers"
            description="Please retry. If the problem persists, contact your administrator."
            onRetry={() => refetch()}
          />
        )}

        {!isError && isLoading && <LoadingState pattern="table" rows={6} />}

        {!isError && !isLoading && filtered.length === 0 && (
          <EmptyState
            illustration="generic"
            title={
              search || activeFilterCount > 0
                ? "No transfers match your search"
                : "No transfers yet"
            }
            description={
              search || activeFilterCount > 0
                ? "Try adjusting your search or clearing filters."
                : "Record your first cash-to-bank or bank-to-cash transfer to begin."
            }
            action={
              search || activeFilterCount > 0 ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        )}

        {!isError && !isLoading && filtered.length > 0 && (
          <SectionCard className="overflow-hidden p-0">
            <SectionCardHeader
              title="All transfers"
              description="Voucher number, source → destination account, amount and status for each transfer."
              className="px-4 pt-4"
            />
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                    <TableHead className="ps-4 text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Voucher
                    </TableHead>
                    <TableHead className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                      From → To
                    </TableHead>
                    <TableHead className="text-end text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Amount
                    </TableHead>
                    <TableHead className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Fund
                    </TableHead>
                    <TableHead className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Date
                    </TableHead>
                    <TableHead className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Initiated By
                    </TableHead>
                    <TableHead className="pe-4 text-end text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => {
                    const transferDate = t.transferDate
                      ? new Date(t.transferDate)
                      : null;
                    const fromName = t.fromAccount?.name ?? "Unknown account";
                    const toName = t.toAccount?.name ?? "Unknown account";
                    const fromIsCash = !!t.fromAccount?.code?.toLowerCase().includes("cash");
                    return (
                      <TableRow key={t.id} className="hover:bg-surface-hover">
                        <TableCell className="ps-4 py-3">
                          <div className="font-mono text-caption font-medium text-text-secondary">
                            {t.voucherNo}
                          </div>
                          {t.narration && (
                            <div className="mt-0.5 line-clamp-1 max-w-xs text-caption text-text-muted">
                              {t.narration}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2 text-body">
                            <span className="flex items-center gap-1 text-text-primary">
                              {fromIsCash ? (
                                <Banknote className="h-3.5 w-3.5 text-semantic-success" aria-hidden />
                              ) : (
                                <Landmark className="h-3.5 w-3.5 text-primary-500" aria-hidden />
                              )}
                              {fromName}
                            </span>
                            <ArrowRight
                              className="h-3.5 w-3.5 shrink-0 text-text-muted"
                              aria-hidden
                            />
                            <span className="flex items-center gap-1 text-text-primary">
                              {t.toAccount?.code?.toLowerCase().includes("cash") ? (
                                <Banknote className="h-3.5 w-3.5 text-semantic-success" aria-hidden />
                              ) : (
                                <Landmark className="h-3.5 w-3.5 text-primary-500" aria-hidden />
                              )}
                              {toName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-end font-mono text-body">
                          <span className="text-text-primary">
                            {formatCurrency(t.amount ?? 0, locale)}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          {t.fund ? (
                            <Badge variant="outline" className="font-normal capitalize">
                              {t.fund}
                            </Badge>
                          ) : (
                            <span className="text-caption text-text-muted">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-body text-text-secondary">
                          {transferDate && !Number.isNaN(transferDate.getTime())
                            ? formatDate(transferDate, locale)
                            : "—"}
                        </TableCell>
                        <TableCell className="py-3 text-body text-text-secondary">
                          {t.initiatedBy || "—"}
                        </TableCell>
                        <TableCell className="pe-4 py-3 text-end">
                          <StatusBadge status={t.status} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
