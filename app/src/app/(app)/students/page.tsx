"use client";

/**
 * MadrashaOS — Students List (Phase C3.2 — People)
 *
 * Route: /students
 *
 * Full-width data table of all seeded students (40) with:
 *   - Search bar (filters by name or code — client-side)
 *   - FilterBar: class filter (dropdown), section filter, status filter
 *   - "Add Student" button gated by IfPermission code="students.create"
 *   - Columns: Code | Name (bn subtitle) | Class + Section | Guardian | Status | Actions (View)
 *   - LoadingState pattern="table" while loading
 *   - EmptyState when search/filter produces no results
 *   - "Showing X of 40 students" count
 *
 * Per SRS §5.1: page visible only to roles with `students.view` (the SideNav
 * already hides the nav item if missing — but this is the actual entry route).
 *
 * Data hooks: useStudents() + useClasses() + useGuardians() (all from
 * src/lib/query/client.ts — TanStack Query against mockApi).
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Eye, UserPlus, GraduationCap, Users } from "lucide-react";
import { useStudents, useClasses, useGuardians } from "@/lib/query/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FilterBar } from "@/components/ui/filter-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState, ErrorState } from "@/components/states";
import { IfPermission } from "@/components/auth/IfPermission";
import {
  StudentAvatar, StudentStatusBadge, buildNameSubtitle,
} from "@/components/people";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "graduated", label: "Graduated" },
  { value: "withdrawn", label: "Withdrawn" },
] as const;

export default function StudentsListPage() {
  const router = useRouter();

  // Server-state hooks
  const {
    data: students,
    isLoading: studentsLoading,
    isError: studentsError,
    refetch: refetchStudents,
  } = useStudents();
  const {
    data: classes,
    isLoading: classesLoading,
    isError: classesError,
    refetch: refetchClasses,
  } = useClasses();
  const {
    data: guardians,
    isLoading: guardiansLoading,
    isError: guardiansError,
    refetch: refetchGuardians,
  } = useGuardians();

  // Client-side filter state
  const [search, setSearch] = React.useState("");
  const [classFilter, setClassFilter] = React.useState<string>("all");
  const [sectionFilter, setSectionFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  // Derived lookup maps
  const classMap = React.useMemo(() => {
    const m = new Map<string, { name: string; nameBn: string; sections: string[] }>();
    classes?.forEach((c) =>
      m.set(c.id, { name: c.name, nameBn: c.nameBn, sections: c.sections }),
    );
    return m;
  }, [classes]);

  const guardianMap = React.useMemo(() => {
    const m = new Map<string, { name: string; nameBn: string }>();
    guardians?.forEach((g) => m.set(g.id, { name: g.name, nameBn: g.nameBn }));
    return m;
  }, [guardians]);

  // Available sections depend on the selected class
  const availableSections = React.useMemo(() => {
    if (classFilter === "all") return [];
    return classMap.get(classFilter)?.sections ?? [];
  }, [classFilter, classMap]);

  // Client-side filter pipeline
  const filtered = React.useMemo(() => {
    if (!students) return [];
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (q) {
        const haystack =
          `${s.name} ${s.nameBn ?? ""} ${s.nameAr ?? ""} ${s.code}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (classFilter !== "all" && s.classId !== classFilter) return false;
      if (sectionFilter !== "all" && s.section !== sectionFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      return true;
    });
  }, [students, search, classFilter, sectionFilter, statusFilter]);

  // Reset section filter when class changes and current section is no longer valid
  React.useEffect(() => {
    if (
      sectionFilter !== "all" &&
      availableSections.length > 0 &&
      !availableSections.includes(sectionFilter)
    ) {
      setSectionFilter("all");
    }
  }, [availableSections, sectionFilter]);

  const activeFilterCount =
    (classFilter !== "all" ? 1 : 0) +
    (sectionFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0);

  const clearFilters = React.useCallback(() => {
    setSearch("");
    setClassFilter("all");
    setSectionFilter("all");
    setStatusFilter("all");
  }, []);

  const totalStudents = students?.length ?? 0;
  const anyHookError = studentsError || classesError || guardiansError;
  const anyHookLoading = studentsLoading || classesLoading || guardiansLoading;

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-display font-bold text-text-primary">
              <GraduationCap className="h-7 w-7 text-primary-500" aria-hidden />
              Students
            </h1>
            <p className="mt-1 text-body text-text-secondary">
              Manage student records, profiles, and enrolment status.
            </p>
          </div>
          <IfPermission code="students.create">
            <Button onClick={() => router.push("/students/new")}>
              <UserPlus className="h-4 w-4" />
              Add Student
            </Button>
          </IfPermission>
        </header>

        {/* Search + Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            />
            <Input
              type="search"
              role="searchbox"
              aria-label="Search students by name or code"
              placeholder="Search by name or code (e.g. MOS-2026-001 or Ahmad)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>

          <FilterBar activeCount={activeFilterCount} onClear={clearFilters}>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger aria-label="Filter by class" className="w-44">
                <SelectValue placeholder="All classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {classes?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={sectionFilter}
              onValueChange={setSectionFilter}
              disabled={classFilter === "all"}
            >
              <SelectTrigger aria-label="Filter by section" className="w-36">
                <SelectValue placeholder="All sections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sections</SelectItem>
                {availableSections.map((sec) => (
                  <SelectItem key={sec} value={sec}>
                    Section {sec}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger aria-label="Filter by status" className="w-40">
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
          </FilterBar>
        </div>

        {/* Count summary */}
        <div className="flex items-center justify-between text-caption text-text-secondary">
          <span>
            Showing{" "}
            <span className="font-semibold text-text-primary">{filtered.length}</span>{" "}
            of{" "}
            <span className="font-semibold text-text-primary">{totalStudents}</span>{" "}
            students
          </span>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-primary-50 px-2 py-0.5 font-medium text-primary-700">
              {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"} applied
            </span>
          )}
        </div>

        {/* Table — error / loading / empty / data states */}
        {anyHookError && (
          <ErrorState
            title="Couldn't load students"
            description="Please retry. If the problem persists, contact your administrator."
            onRetry={() => {
              refetchStudents();
              refetchClasses();
              refetchGuardians();
            }}
          />
        )}

        {!anyHookError && anyHookLoading && <LoadingState pattern="table" rows={8} />}

        {!anyHookError && !anyHookLoading && filtered.length === 0 && (
          <EmptyState
            illustration="students"
            title={
              search || activeFilterCount > 0
                ? "No students match your search"
                : "No students yet"
            }
            description={
              search || activeFilterCount > 0
                ? "Try adjusting your search or clearing filters."
                : "Add your first student to begin."
            }
            action={
              search || activeFilterCount > 0 ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <IfPermission code="students.create" fallback={null}>
                  <Button onClick={() => router.push("/students/new")}>
                    <UserPlus className="h-4 w-4" />
                    Add Student
                  </Button>
                </IfPermission>
              )
            }
          />
        )}

        {!anyHookError && !anyHookLoading && filtered.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-border-default bg-surface-card shadow-elevation-1">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                  <TableHead className="ps-4 text-caption font-semibold uppercase tracking-wide text-text-muted">
                    Code
                  </TableHead>
                  <TableHead className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                    Name
                  </TableHead>
                  <TableHead className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                    Class
                  </TableHead>
                  <TableHead className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                    Guardian
                  </TableHead>
                  <TableHead className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                    Status
                  </TableHead>
                  <TableHead className="pe-4 text-end text-caption font-semibold uppercase tracking-wide text-text-muted">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => {
                  const cls = classMap.get(s.classId);
                  const guardian = guardianMap.get(s.guardianId);
                  const subtitle = buildNameSubtitle(s);
                  return (
                    <TableRow key={s.id} className="hover:bg-surface-hover">
                      <TableCell className="ps-4">
                        <span className="font-mono text-caption font-medium text-text-secondary">
                          {s.code}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <StudentAvatar name={s.name} size="sm" />
                          <div className="min-w-0">
                            <div className="truncate text-body font-medium text-text-primary">
                              {s.name}
                            </div>
                            {subtitle && (
                              <div
                                className="truncate text-caption text-text-muted"
                                lang={s.nameAr ? "ar" : "bn"}
                              >
                                {subtitle}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-body text-text-primary">
                            {cls?.name ?? "—"}
                          </span>
                          <span className="text-caption text-text-muted">
                            Section {s.section} · Roll {s.roll}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users
                            className="h-4 w-4 text-text-muted"
                            aria-hidden
                          />
                          <span className="text-body text-text-primary">
                            {guardian?.name ?? "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StudentStatusBadge status={s.status} />
                      </TableCell>
                      <TableCell className="pe-4 text-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/students/${s.id}`)}
                          aria-label={`View profile for ${s.name}`}
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
