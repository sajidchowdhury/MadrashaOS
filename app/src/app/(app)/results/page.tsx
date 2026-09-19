"use client";

/**
 * MadrashaOS — Exam Results (Phase P3 — Academic)
 *
 * Route: /results
 *
 * Full-width data table of all exam results (mark sheets + GPA) for the
 * current tenant (or current branch for branch-scoped roles), with:
 *   - Search bar (filters by student name / code / exam name — client-side)
 *   - FilterBar: grade filter (A+ / A / A- / B / C / F), pass/fail filter
 *   - Columns: Student | Exam | Term | Total Marks | GPA | Grade | Pass/Fail
 *   - LoadingState pattern="table" while loading
 *   - EmptyState when search/filter produces no results
 *
 * Per SRS §5.1: page visible only to roles with `results.view` (or
 * `results.view.own` for student/guardian users — the API enforces this
 * scope server-side).
 *
 * Data hook: useResults() from src/lib/query/client.ts — TanStack Query
 * against GET /api/v1/results (camelCase via toCamel()).
 *
 * Risk R7: position column is intentionally omitted unless ranking is
 * explicitly enabled — kept off this list view to avoid stigmatizing
 * lower-ranked students.
 */

import * as React from "react";
import { Award, Search, CheckCircle2, XCircle } from "lucide-react";
import { useResults } from "@/lib/query/client";
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
import { formatNumber } from "@/lib/i18n/format";

/** Row shape produced by api.getResults() (camelCase via toCamel()). */
type ResultRow = {
  id: string;
  studentId: string;
  studentName: string;
  studentNameBn: string | null;
  studentCode: string;
  roll: number | null;
  examId: string;
  examName: string;
  term: string | null;
  academicYear: number;
  totalMarks: number;
  gpa: number;
  grade: string;
  isPassed: boolean;
  division: string | null;
  remark: string | null;
  generatedAt: string | null;
  position?: number | null;
};

const GRADE_OPTIONS = [
  { value: "all", label: "All grades" },
  { value: "A+", label: "A+" },
  { value: "A", label: "A" },
  { value: "A-", label: "A-" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
  { value: "F", label: "F" },
] as const;

const PASS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pass", label: "Passed" },
  { value: "fail", label: "Failed" },
] as const;

/** Grade badge with the design-system's semantic colors. */
function GradeBadge({ grade }: { grade: string }) {
  const g = (grade ?? "").toUpperCase();
  // A+/A → success, A- → primary, B/C → accent, F → danger.
  const cls = g === "A+" || g === "A"
    ? "border-semantic-success/40 bg-success-50 text-semantic-success"
    : g === "A-"
      ? "border-primary/40 bg-primary-50 text-primary-700"
      : g === "B" || g === "C"
        ? "border-accent/40 bg-accent-50 text-accent-700"
        : g === "F"
          ? "border-semantic-danger/40 bg-danger-50 text-semantic-danger"
          : "text-text-muted";
  return <Badge variant="outline" className={cls}>{grade}</Badge>;
}

export default function ResultsPage() {
  const { locale } = useI18n();
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const canView =
    hasPermission("results.view") || hasPermission("results.view.own");

  const {
    data: results,
    isLoading,
    isError,
    refetch,
  } = useResults();

  const [search, setSearch] = React.useState("");
  const [grade, setGrade] = React.useState<string>("all");
  const [passFilter, setPassFilter] = React.useState<string>("all");

  // Client-side filter pipeline.
  const filtered = React.useMemo(() => {
    if (!results) return [];
    const q = search.trim().toLowerCase();
    return (results as ResultRow[]).filter((r) => {
      if (grade !== "all" && (r.grade ?? "").toUpperCase() !== grade) return false;
      if (passFilter === "pass" && !r.isPassed) return false;
      if (passFilter === "fail" && r.isPassed) return false;
      if (q) {
        const haystack =
          `${r.studentName} ${r.studentNameBn ?? ""} ${r.studentCode ?? ""} ${r.examName ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [results, search, grade, passFilter]);

  const activeFilterCount =
    (grade !== "all" ? 1 : 0) + (passFilter !== "all" ? 1 : 0) + (search ? 1 : 0);

  const clearFilters = React.useCallback(() => {
    setSearch("");
    setGrade("all");
    setPassFilter("all");
  }, []);

  if (!canView) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <PermissionDenied resource="Results" />
        </div>
      </div>
    );
  }

  const totalResults = (results as ResultRow[] | undefined)?.length ?? 0;
  const passCount = (results as ResultRow[] | undefined)
    ?.filter((r) => r.isPassed).length ?? 0;
  const passRate = totalResults > 0 ? Math.round((passCount / totalResults) * 100) : 0;

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-display font-bold text-text-primary">
              <Award className="h-7 w-7 text-primary-500" aria-hidden />
              Exam Results
            </h1>
            <p className="mt-1 text-body text-text-secondary">
              Mark sheets, GPA and grade distribution per exam. Risk R7:
              ranking is hidden unless explicitly enabled for this view.
            </p>
          </div>
          <IfPermission code="results.generate">
            <Button>Generate Result</Button>
          </IfPermission>
        </header>

        {/* KPI strip */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border-default bg-surface-card p-4 shadow-elevation-1">
            <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
              Total Results
            </p>
            <p className="mt-1 font-mono text-display font-bold text-primary-500">
              {formatNumber(totalResults, locale)}
            </p>
          </div>
          <div className="rounded-lg border border-border-default bg-surface-card p-4 shadow-elevation-1">
            <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
              Pass Rate
            </p>
            <p className="mt-1 font-mono text-display font-bold text-semantic-success">
              {formatNumber(passRate, locale)}%
            </p>
          </div>
          <div className="rounded-lg border border-border-default bg-surface-card p-4 shadow-elevation-1">
            <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
              Failed
            </p>
            <p className="mt-1 font-mono text-display font-bold text-semantic-danger">
              {formatNumber(totalResults - passCount, locale)}
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
              aria-label="Search results by student name, code or exam"
              placeholder="Search by student name, code or exam…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 ps-9"
            />
          </div>
          <Select value={grade} onValueChange={setGrade}>
            <SelectTrigger
              size="sm"
              className="w-36"
              aria-label="Filter by grade"
            >
              <SelectValue placeholder="All grades" />
            </SelectTrigger>
            <SelectContent>
              {GRADE_OPTIONS.map((g) => (
                <SelectItem key={g.value} value={g.value}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={passFilter} onValueChange={setPassFilter}>
            <SelectTrigger
              size="sm"
              className="w-36"
              aria-label="Filter by pass/fail"
            >
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              {PASS_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
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
              {formatNumber(totalResults, locale)}
            </span>{" "}
            results
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
            title="Couldn't load results"
            description="Please retry. If the problem persists, contact your administrator."
            onRetry={() => refetch()}
          />
        )}

        {!isError && isLoading && <LoadingState pattern="table" rows={6} />}

        {!isError && !isLoading && filtered.length === 0 && (
          <EmptyState
            illustration="results"
            title={
              search || activeFilterCount > 0
                ? "No results match your search"
                : "No exam results yet"
            }
            description={
              search || activeFilterCount > 0
                ? "Try adjusting your search or clearing filters."
                : "Generate results from exam marks to populate this list."
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
              title="All results"
              description="Sorted by total marks (descending). Failed rows are highlighted in red."
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
                      Exam
                    </TableHead>
                    <TableHead className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Term
                    </TableHead>
                    <TableHead className="text-end text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Total
                    </TableHead>
                    <TableHead className="text-end text-caption font-semibold uppercase tracking-wide text-text-muted">
                      GPA
                    </TableHead>
                    <TableHead className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Grade
                    </TableHead>
                    <TableHead className="pe-4 text-end text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Result
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const failed = !r.isPassed;
                    return (
                      <TableRow
                        key={r.id}
                        className={
                          failed
                            ? "bg-danger-50/40 hover:bg-danger-50/40"
                            : "hover:bg-surface-hover"
                        }
                      >
                        <TableCell className="ps-4 py-3">
                          <div className="min-w-0">
                            <div className="truncate text-body font-medium text-text-primary">
                              {r.studentName}
                            </div>
                            {r.studentNameBn ? (
                              <div
                                className="truncate text-caption text-text-muted"
                                lang="bn"
                              >
                                {r.studentNameBn}
                              </div>
                            ) : null}
                            <div className="truncate font-mono text-caption text-text-muted">
                              {r.studentCode}
                              {r.roll ? ` · Roll ${r.roll}` : ""}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="text-body text-text-primary">
                            {r.examName || "—"}
                          </div>
                          <div className="text-caption text-text-muted">
                            AY {formatNumber(r.academicYear ?? 0, locale)}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-body text-text-secondary">
                          {r.term ? (
                            <Badge variant="outline" className="font-normal capitalize">
                              {r.term}
                            </Badge>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="py-3 text-end font-mono text-body">
                          <span className={failed ? "text-semantic-danger font-semibold" : "text-text-primary"}>
                            {formatNumber(r.totalMarks ?? 0, locale)}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-end font-mono text-body text-text-primary">
                          {formatNumber(Number(Number(r.gpa ?? 0).toFixed(2)), locale)}
                        </TableCell>
                        <TableCell className="py-3">
                          <GradeBadge grade={r.grade} />
                        </TableCell>
                        <TableCell className="pe-4 py-3 text-end">
                          {r.isPassed ? (
                            <Badge
                              variant="outline"
                              className="border-semantic-success/40 bg-success-50 text-semantic-success"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Pass
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-semantic-danger/40 bg-danger-50 text-semantic-danger"
                            >
                              <XCircle className="h-3 w-3" />
                              Fail
                            </Badge>
                          )}
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
