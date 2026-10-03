"use client";

/**
 * MadrashaOS — Accounting / Daily Ledger (redesigned)
 *
 * Optimized for the daily workflow of the accountant who spends most of
 * their time here. What they expect to see:
 *
 *   1. Only TODAY's posts by default (quick "Today" / "All time" toggle)
 *   2. Date-range search to view any period's report
 *   3. NO Chart of Accounts table (kept on a separate admin screen)
 *   4. Report columns: Voucher No · Date · Narration · Debit · Credit ·
 *      Amount · Running Balance  (no Status / Posted By clutter)
 *   5. NO KPI strip (Total Movement / Entries Shown / Pending Review)
 *   6. Receive Money (with Zakat-wise vs Normal fund) + Pay Money
 *   7. Receive Donation quick-link to /donations + Donor panel in sidebar
 *
 * Fund separation summary cards (General / Zakat) are kept because they
 * are operationally critical for a madrasha accountant.
 */

import * as React from "react";
import {
  Search, ArrowDownToLine, ArrowUpFromLine,
  CalendarDays, CalendarRange, Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { FilterBar } from "@/components/ui/filter-bar";
import { IfPermission } from "@/components/auth/IfPermission";
import { LoadingState, ErrorState, PermissionDenied } from "@/components/states";
import { EmptyState } from "@/components/ui/empty-state";
import { useSessionStore } from "@/stores/sessionStore";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatCurrency, formatDate } from "@/lib/i18n/format";
import { useLedgerEntries, useAccounts } from "@/lib/query/client";
import { ReceiveMoneyDialog } from "@/components/finance/ReceiveMoneyDialog";
import { PayMoneyDialog } from "@/components/finance/PayMoneyDialog";
import { PdfDownloadButton } from "@/components/pdf/PdfPreview";
import { useRouter } from "next/navigation";

/** Today's date in YYYY-MM-DD (local, not UTC) — used as the default filter. */
function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type LedgerEntry = {
  id: string;
  voucherNo: string;
  date: string;
  narration: string;
  debitAccount?: string;
  debitAccountName?: string;
  creditAccount?: string;
  creditAccountName?: string;
  amount: number;
  fund?: string;
  status?: string;
  postedBy?: string;
};

export default function AccountingPage() {
  const { locale } = useI18n();
  const router = useRouter();
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const canView = hasPermission("accounting.ledger.view");

  const { data: ledger, isLoading, isError, refetch } = useLedgerEntries();
  const { data: accounts } = useAccounts();

  // Default to TODAY so the accountant sees only today's posts on landing.
  const today = todayLocal();
  const [fromDate, setFromDate] = React.useState<string>(today);
  const [toDate, setToDate] = React.useState<string>(today);
  const [search, setSearch] = React.useState("");
  const [receiveOpen, setReceiveOpen] = React.useState(false);
  const [payOpen, setPayOpen] = React.useState(false);

  // Quick toggle: "Today" vs "All time"
  const [dateMode, setDateMode] = React.useState<"today" | "all">("today");

  const accountName = (entry: LedgerEntry, side: "debit" | "credit") => {
    const direct = side === "debit" ? entry.debitAccountName : entry.creditAccountName;
    if (direct) return direct;
    const id = side === "debit" ? entry.debitAccount : entry.creditAccount;
    const acct = (accounts as Array<{ id: string; name: string }> | undefined)?.find((a) => a.id === id);
    return acct?.name ?? id ?? "—";
  };

  const filtered = React.useMemo<LedgerEntry[]>(() => {
    if (!ledger) return [];
    const list = (ledger as LedgerEntry[]).filter((e) => {
      if (dateMode === "today") {
        // Compare YYYY-MM-DD portion of the entry date against today.
        const entryDate = String(e.date).slice(0, 10);
        if (entryDate !== today) return false;
      } else {
        if (fromDate && e.date < fromDate) return false;
        if (toDate && e.date > toDate) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !e.voucherNo?.toLowerCase().includes(q) &&
          !e.narration?.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
    // Chronological (oldest first) so running balance reads naturally.
    return list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }, [ledger, dateMode, fromDate, toDate, search, today]);

  // Running balance: cumulative sum of entry amounts (chronological).
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

  const activeFilters = (dateMode === "all" ? (fromDate ? 1 : 0) + (toDate ? 1 : 0) : 1) + (search.trim() ? 1 : 0);

  const clearFilters = () => {
    setDateMode("today");
    setFromDate(today);
    setToDate(today);
    setSearch("");
  };

  function switchToToday() {
    setDateMode("today");
    setFromDate(today);
    setToDate(today);
  }

  function switchToAllTime() {
    setDateMode("all");
    setFromDate("");
    setToDate("");
  }

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-display font-bold text-text-primary">Daily Ledger</h1>
            <p className="mt-1 text-body text-text-secondary">
              {dateMode === "today"
                ? `Showing today's posts (${formatDate(new Date(), locale)}).`
                : "Showing all entries in the selected date range."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PdfDownloadButton
              templateId="ledger-statement"
              locale={locale}
              from={dateMode === "today" ? today : fromDate || undefined}
              to={dateMode === "today" ? today : toDate || undefined}
              accountName="All Accounts"
              label="Download Statement"
              variant="outline"
              size="default"
              icon="download"
              fileName={`ledger-statement-${dateMode === "today" ? today : `${fromDate || "all"}-to-${toDate || "now"}`}.pdf`}
            />
            <IfPermission code="accounting.ledger.post">
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setReceiveOpen(true)} className="bg-semantic-success hover:bg-semantic-success/90">
                  <ArrowDownToLine className="h-4 w-4" />
                  Receive Money
                </Button>
                <Button onClick={() => setPayOpen(true)} variant="destructive">
                  <ArrowUpFromLine className="h-4 w-4" />
                  Pay Money
                </Button>
                <Button variant="outline" onClick={() => router.push("/donations")}>
                  <Heart className="h-4 w-4" />
                  Receive Donation
                </Button>
              </div>
            </IfPermission>
          </div>
        </header>

        {/* Fund separation summary cards (operationally critical) */}
        <div className="grid gap-4 sm:grid-cols-2">
          {(() => {
            const allAccts = (accounts ?? []) as Array<{ type: string; fund: string; balance: number }>;
            const generalAccounts = allAccts.filter((a) => a.fund === "general" || !a.fund);
            const zakatAccounts = allAccts.filter((a) => a.fund === "zakat");
            const generalBalance = generalAccounts.reduce((s, a) => s + Number(a.balance ?? 0), 0);
            const zakatBalance = zakatAccounts.reduce((s, a) => s + Number(a.balance ?? 0), 0);
            return (
              <>
                <div className="rounded-lg border-2 border-primary-200 bg-primary-50 p-4">
                  <p className="text-caption font-medium uppercase tracking-wider text-primary-600">
                    General Fund Balance
                  </p>
                  <p className="mt-1 font-mono text-display font-bold text-primary-700">
                    {formatCurrency(generalBalance, locale)}
                  </p>
                  <p className="mt-1 text-caption text-primary-600">
                    Fee income, donations (non-zakat), expenses
                  </p>
                </div>
                <div className="rounded-lg border-2 border-accent-200 bg-accent-50 p-4">
                  <p className="text-caption font-medium uppercase tracking-wider text-accent-700">
                    Zakat Fund Balance
                  </p>
                  <p className="mt-1 font-mono text-display font-bold text-accent-700">
                    {formatCurrency(zakatBalance, locale)}
                  </p>
                  <p className="mt-1 text-caption text-accent-600">
                    Zakat received − zakat distributed (sacred, never mixed)
                  </p>
                </div>
              </>
            );
          })()}
        </div>

        {/* Date-mode quick toggle + filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border border-border-default bg-surface-card p-0.5">
            <button
              type="button"
              onClick={switchToToday}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-caption font-medium transition-colors ${
                dateMode === "today"
                  ? "bg-primary-500 text-primary-foreground"
                  : "text-text-secondary hover:bg-surface-hover"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Today
            </button>
            <button
              type="button"
              onClick={switchToAllTime}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-caption font-medium transition-colors ${
                dateMode === "all"
                  ? "bg-primary-500 text-primary-foreground"
                  : "text-text-secondary hover:bg-surface-hover"
              }`}
            >
              <CalendarRange className="h-3.5 w-3.5" />
              Date Range
            </button>
          </div>
        </div>

        <FilterBar activeCount={activeFilters} onClear={activeFilters > 0 ? clearFilters : undefined}>
          {dateMode === "all" && (
            <>
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
            </>
          )}
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

        {/* Body — the daily report table */}
        {isLoading && <LoadingState pattern="table" rows={8} />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {!isLoading && !isError && withBalance.length === 0 && (
          <EmptyState
            illustration="fees"
            title={dateMode === "today" ? "No posts today" : "No ledger entries found"}
            description={
              dateMode === "today"
                ? "Nothing has been posted today yet. Use Receive Money / Pay Money to record an entry."
                : "Adjust your filters or date range to see entries."
            }
            action={
              <IfPermission code="accounting.ledger.post">
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setReceiveOpen(true)} className="bg-semantic-success hover:bg-semantic-success/90">
                    <ArrowDownToLine className="h-4 w-4" />
                    Receive Money
                  </Button>
                  <Button onClick={() => setPayOpen(true)} variant="destructive">
                    <ArrowUpFromLine className="h-4 w-4" />
                    Pay Money
                  </Button>
                </div>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withBalance.map((e) => (
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
                        {accountName(e, "debit")}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-body text-text-secondary">
                        {accountName(e, "credit")}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-end font-mono text-body text-text-primary">
                        {formatCurrency(e.amount, locale)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-end font-mono text-body text-primary-700">
                        {formatCurrency(e.balance, locale)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {!isLoading && !isError && withBalance.length > 0 && (
          <p className="text-caption text-text-muted">
            {dateMode === "today"
              ? `Showing ${withBalance.length} post(s) from today.`
              : `Showing ${withBalance.length} of ${ledger?.length ?? 0} entries.`}
            {" · "}
            Running balance is cumulative in chronological order.
          </p>
        )}
      </div>

      <ReceiveMoneyDialog open={receiveOpen} onOpenChange={setReceiveOpen} />
      <PayMoneyDialog open={payOpen} onOpenChange={setPayOpen} />
    </div>
  );
}
