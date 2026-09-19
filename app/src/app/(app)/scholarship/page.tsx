"use client";

/**
 * MadrashaOS — Scholarships (Phase P3 — Finance)
 *
 * Route: /scholarship
 *
 * Full-width data table of all scholarships / discounts in the current
 * tenant (or current branch for branch-scoped roles), with:
 *   - Search bar (filters by student name / code / scholarship name —
 *     client-side)
 *   - FilterBar: status filter (pending / active / rejected), fund-source
 *     filter (general / zakat / donation)
 *   - Columns: Student | Scholarship | Type | Amount / % | Fund Source |
 *              Academic Year | Status
 *   - Risk R8: pending scholarships shown with striped background + amber
 *     "Pending Approval" chip (matches the fees page treatment)
 *   - LoadingState pattern="table" while loading
 *   - EmptyState when search/filter produces no results
 *
 * Per SRS §5.1: page visible only to roles with `scholarship.view`.
 *
 * Data hook: useScholarships() from src/lib/query/client.ts — TanStack
 * Query against GET /api/v1/scholarships (camelCase via toCamel()).
 */

import * as React from "react";
import { Gift, Search } from "lucide-react";
import { useScholarships } from "@/lib/query/client";
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
import { formatCurrency, formatNumber, formatPercent } from "@/lib/i18n/format";

/** Row shape produced by api.getScholarships() (camelCase via toCamel()). */
type ScholarshipRow = {
  id: string;
  studentId: string;
  studentName: string;
  studentNameBn: string | null;
  studentCode: string;
  roll: number | null;
  name: string;
  type: "full" | "partial" | string;
  percentage: number;
  amountPerYear: number;
  fundSource: string;
  academicYear: number;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
  note: string | null;
  expiresAt: string | null;
  isPending: boolean;
  needsApproval: boolean;
};

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "rejected", label: "Rejected" },
] as const;

const FUND_SOURCE_OPTIONS = [
  { value: "all", label: "All funds" },
  { value: "general", label: "General" },
  { value: "zakat", label: "Zakat" },
  { value: "donation", label: "Donation" },
] as const;

/** Status badge with the design-system's semantic colors. */
function StatusBadge({ status }: { status: string }) {
  const value = (status ?? "pending").toLowerCase();
  const cls =
    value === "active"
      ? "border-semantic-success/40 bg-success-50 text-semantic-success"
      : value === "pending"
        ? "border-semantic-warning/40 bg-warning-50 text-semantic-warning"
        : value === "rejected"
          ? "border-semantic-danger/40 bg-danger-50 text-semantic-danger"
          : "text-text-muted";
  return <Badge variant="outline" className={cls}>{value}</Badge>;
}

export default function ScholarshipsPage() {
  const { locale } = useI18n();
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const canView = hasPermission("scholarship.view");

  const {
    data: scholarships,
    isLoading,
    isError,
    refetch,
  } = useScholarships();

  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<string>("all");
  const [fund, setFund] = React.useState<string>("all");

  // Client-side filter pipeline.
  const filtered = React.useMemo(() => {
    if (!scholarships) return [];
    const q = search.trim().toLowerCase();
    return (scholarships as ScholarshipRow[]).filter((s) => {
      if (status !== "all" && (s.status ?? "pending").toLowerCase() !== status) return false;
      if (fund !== "all" && (s.fundSource ?? "").toLowerCase() !== fund) return false;
      if (q) {
        const haystack =
          `${s.studentName} ${s.studentNameBn ?? ""} ${s.studentCode ?? ""} ${s.name ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [scholarships, search, status, fund]);

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
          <PermissionDenied resource="Scholarships" />
        </div>
      </div>
    );
  }

  const totalScholarships = (scholarships as ScholarshipRow[] | undefined)?.length ?? 0;
  const pendingCount = (scholarships as ScholarshipRow[] | undefined)
    ?.filter((s) => (s.status ?? "").toLowerCase() === "pending").length ?? 0;
  const totalAwarded = (scholarships as ScholarshipRow[] | undefined)
    ?.filter((s) => (s.status ?? "").toLowerCase() === "active")
    .reduce((sum, s) => sum + (s.amountPerYear ?? 0), 0) ?? 0;

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-display font-bold text-text-primary">
              <Gift className="h-7 w-7 text-primary-500" aria-hidden />
              Scholarships &amp; Discounts
            </h1>
            <p className="mt-1 text-body text-text-secondary">
              Manage tuition waivers, need-based discounts and zakat-funded
              scholarships. Risk R8 routes high-value discounts to the
              approval queue.
            </p>
          </div>
        </header>

        {/* KPI strip */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border-default bg-surface-card p-4 shadow-elevation-1">
            <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
              Total Scholarships
            </p>
            <p className="mt-1 font-mono text-display font-bold text-primary-500">
              {formatNumber(totalScholarships, locale)}
            </p>
          </div>
          <div className="rounded-lg border border-border-default bg-surface-card p-4 shadow-elevation-1">
            <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
              Pending Approvals
            </p>
            <p className="mt-1 font-mono text-display font-bold text-semantic-warning">
              {formatNumber(pendingCount, locale)}
            </p>
          </div>
          <div className="rounded-lg border border-border-default bg-surface-card p-4 shadow-elevation-1">
            <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
              Total Awarded / Year
            </p>
            <p className="mt-1 font-mono text-display font-bold text-semantic-success">
              {formatCurrency(totalAwarded, locale)}
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
              aria-label="Search scholarships by student name or code"
              placeholder="Search by student name, code or scholarship name…"
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
              {FUND_SOURCE_OPTIONS.map((f) => (
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
              {formatNumber(totalScholarships, locale)}
            </span>{" "}
            scholarships
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
            title="Couldn't load scholarships"
            description="Please retry. If the problem persists, contact your administrator."
            onRetry={() => refetch()}
          />
        )}

        {!isError && isLoading && <LoadingState pattern="table" rows={6} />}

        {!isError && !isLoading && filtered.length === 0 && (
          <EmptyState
            illustration="fees"
            title={
              search || activeFilterCount > 0
                ? "No scholarships match your search"
                : "No scholarships yet"
            }
            description={
              search || activeFilterCount > 0
                ? "Try adjusting your search or clearing filters."
                : "Create your first scholarship to waive or discount tuition fees."
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
              title="All scholarships"
              description="Pending approvals are highlighted with a striped background (Risk R8)."
              className="px-4 pt-4"
            />
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                    <TableHead className="ps-4 text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Student
                    </TableHead>
                    <TableHead className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Scholarship
                    </TableHead>
                    <TableHead className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Type
                    </TableHead>
                    <TableHead className="text-end text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Amount / %
                    </TableHead>
                    <TableHead className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Fund
                    </TableHead>
                    <TableHead className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Year
                    </TableHead>
                    <TableHead className="pe-4 text-end text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => {
                    // Risk R8 — pending rows striped/greyed.
                    const isPending = (s.status ?? "").toLowerCase() === "pending";
                    return (
                      <TableRow
                        key={s.id}
                        className={
                          isPending
                            ? "bg-[repeating-linear-gradient(45deg,var(--color-accent-50)_0,var(--color-accent-50)_8px,var(--color-surface-card)_8px,var(--color-surface-card)_16px)]"
                            : "hover:bg-surface-hover"
                        }
                      >
                        <TableCell className="ps-4 py-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-body font-medium text-text-primary">
                                {s.studentName}
                              </span>
                              {isPending && (
                                <Badge className="bg-accent-50 text-accent-700">
                                  Pending Approval
                                </Badge>
                              )}
                            </div>
                            {s.studentNameBn ? (
                              <div
                                className="truncate text-caption text-text-muted"
                                lang="bn"
                              >
                                {s.studentNameBn}
                              </div>
                            ) : null}
                            <div className="truncate font-mono text-caption text-text-muted">
                              {s.studentCode}
                              {s.roll ? ` · Roll ${s.roll}` : ""}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-body text-text-primary">
                            {s.name || "—"}
                          </span>
                          {s.note && (
                            <div className="mt-0.5 line-clamp-2 max-w-xs text-caption text-text-muted">
                              {s.note}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge
                            variant="outline"
                            className={
                              s.type === "full"
                                ? "border-primary/40 bg-primary-50 text-primary-700"
                                : "font-normal"
                            }
                          >
                            {s.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-end font-mono text-body">
                          {s.type === "full" || (s.percentage ?? 0) >= 100 ? (
                            <span className="text-primary-500">100%</span>
                          ) : s.percentage > 0 ? (
                            <span className="text-text-primary">
                              {formatPercent(s.percentage, locale)}
                            </span>
                          ) : (
                            <span className="text-text-primary">
                              {formatCurrency(s.amountPerYear ?? 0, locale)}
                            </span>
                          )}
                          {s.percentage > 0 && s.amountPerYear > 0 && (
                            <div className="text-caption text-text-muted">
                              {formatCurrency(s.amountPerYear, locale)}/yr
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-body text-text-secondary capitalize">
                          {s.fundSource || "—"}
                        </TableCell>
                        <TableCell className="py-3 font-mono text-body text-text-secondary">
                          {formatNumber(s.academicYear ?? 0, locale)}
                        </TableCell>
                        <TableCell className="pe-4 py-3 text-end">
                          <StatusBadge status={s.status} />
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
