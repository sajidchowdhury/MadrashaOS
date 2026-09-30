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
import { Award, Search, CheckCircle2, XCircle, Plus, AlertCircle } from "lucide-react";
import { useResults, useExams, queryClient } from "@/lib/query/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { FilterBar } from "@/components/ui/filter-bar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState, ErrorState, PermissionDenied } from "@/components/states";
import { IfPermission } from "@/components/auth/IfPermission";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
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

  // --- Generate Results dialog state ---
  const { data: examsData } = useExams();
  const examsList = ((examsData ?? []) as Array<Record<string, unknown>>).filter(
    (e) => e.status === "published",
  );
  const [genOpen, setGenOpen] = React.useState(false);
  const [genExamId, setGenExamId] = React.useState("");
  const [genRanking, setGenRanking] = React.useState(false);
  const [genSubmitting, setGenSubmitting] = React.useState(false);
  const [genError, setGenError] = React.useState<string | null>(null);

  async function handleGenerate() {
    setGenError(null);
    if (!genExamId) {
      setGenError("Please select a published exam.");
      return;
    }
    setGenSubmitting(true);
    try {
      const res = await fetch("/api/v1/results/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_id: genExamId,
          ranking_enabled: genRanking,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGenError(data?.error || `Failed (HTTP ${res.status})`);
        setGenSubmitting(false);
        return;
      }
      toast({ title: "Results generated", description: data?.message || "Results are now available." });
      queryClient.invalidateQueries({ queryKey: ["results"] });
      setGenOpen(false);
      setGenExamId("");
      setGenRanking(false);
    } catch {
      setGenError("Network error — please try again.");
    }
    setGenSubmitting(false);
  }

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
            <Button onClick={() => { setGenError(null); setGenOpen(true); }}>
              <Plus className="h-4 w-4" />
              Generate Result
            </Button>
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

      {/* ---------- Generate Results dialog ---------- */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary-500" />
              Generate Results
            </DialogTitle>
            <DialogDescription>
              Select a published exam to generate results (GPA, grade,
              pass/fail) for all students who have marks entered.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="gen-exam">Published Exam *</Label>
              <Select value={genExamId} onValueChange={setGenExamId}>
                <SelectTrigger id="gen-exam" className="w-full">
                  <SelectValue placeholder="Select published exam" />
                </SelectTrigger>
                <SelectContent>
                  {examsList.length === 0 && (
                    <div className="px-3 py-2 text-caption text-text-muted">
                      No published exams found. Publish an exam first.
                    </div>
                  )}
                  {examsList.map((e) => (
                    <SelectItem key={e.id as string} value={e.id as string}>
                      {e.name as string} · {e.className as string ?? "—"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border-default px-3 py-2">
              <Checkbox
                checked={genRanking}
                onCheckedChange={(v) => setGenRanking(v === true)}
              />
              <div>
                <p className="text-body font-medium text-text-primary">Enable ranking</p>
                <p className="text-caption text-text-muted">
                  Assign positions (1st, 2nd, 3rd…) based on total marks.
                </p>
              </div>
            </label>
            {genError && (
              <div role="alert" className="flex items-start gap-2 rounded-md border border-semantic-danger/40 bg-danger-50 px-3 py-2 text-caption text-semantic-danger">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{genError}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={genSubmitting || !genExamId}>
              {genSubmitting ? "Generating…" : "Generate Results"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
