"use client";

/**
 * MadrashaOS — Guardians List (Phase P3 — People)
 *
 * Route: /guardians
 *
 * Full-width data table of all guardians in the current tenant (or current
 * branch for branch-scoped roles), with:
 *   - Search bar (filters by name, nameBn, phone, email — client-side)
 *   - FilterBar: relation filter
 *   - Columns: Name (+bn subtitle) | Phone | Email | Occupation | Relation |
 *              Children count | Primary flag
 *   - LoadingState pattern="table" while loading
 *   - EmptyState when search/filter produces no results
 *   - "Showing X of N guardians" count
 *
 * Per SRS §5.1: page visible only to roles with `guardians.view` (or
 * `guardians.view.own` for guardian-role users seeing only their own row —
 * the API enforces this scope server-side).
 *
 * Data hook: useGuardians() from src/lib/query/client.ts — TanStack Query
 * against GET /api/v1/guardians (camelCase response via toCamel()).
 */

import * as React from "react";
import { Users as Guardians, Search, Phone, Mail, Star } from "lucide-react";
import { useGuardians } from "@/lib/query/client";
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

/** Row shape produced by api.getGuardians() (camelCase via toCamel()). */
type GuardianRow = {
  id: string;
  name: string;
  nameBn?: string | null;
  phone: string | null;
  email: string | null;
  occupation: string | null;
  relation: string | null;
  isPrimary: boolean | null;
  childrenCount?: number | null;
};

export default function GuardiansListPage() {
  const { locale } = useI18n();
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const canView =
    hasPermission("guardians.view") || hasPermission("guardians.view.own");

  const {
    data: guardians,
    isLoading,
    isError,
    refetch,
  } = useGuardians();

  const [search, setSearch] = React.useState("");
  const [relation, setRelation] = React.useState<string>("all");

  // Build the unique relation dropdown values.
  const relations = React.useMemo(() => {
    const rows = (guardians as GuardianRow[] | undefined) ?? [];
    const set = new Set<string>();
    rows.forEach((g) => {
      if (g.relation) set.add(g.relation);
    });
    return Array.from(set).sort();
  }, [guardians]);

  // Client-side filter pipeline.
  const filtered = React.useMemo(() => {
    if (!guardians) return [];
    const q = search.trim().toLowerCase();
    return (guardians as GuardianRow[]).filter((g) => {
      if (relation !== "all" && g.relation !== relation) return false;
      if (q) {
        const haystack =
          `${g.name} ${g.nameBn ?? ""} ${g.phone ?? ""} ${g.email ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [guardians, search, relation]);

  const activeFilterCount = (relation !== "all" ? 1 : 0) + (search ? 1 : 0);

  const clearFilters = React.useCallback(() => {
    setSearch("");
    setRelation("all");
  }, []);

  if (!canView) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <PermissionDenied resource="Guardians" />
        </div>
      </div>
    );
  }

  const totalGuardians = (guardians as GuardianRow[] | undefined)?.length ?? 0;

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-display font-bold text-text-primary">
              <Guardians className="h-7 w-7 text-primary-500" aria-hidden />
              Guardians
            </h1>
            <p className="mt-1 text-body text-text-secondary">
              Manage parent / guardian records, contact details and linked
              students.
            </p>
          </div>
          <IfPermission code="students.create">
            <Button>Add Guardian</Button>
          </IfPermission>
        </header>

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
              aria-label="Search guardians by name, phone or email"
              placeholder="Search by name, phone or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 ps-9"
            />
          </div>
          <Select value={relation} onValueChange={setRelation}>
            <SelectTrigger
              size="sm"
              className="w-44"
              aria-label="Filter by relation"
            >
              <SelectValue placeholder="All relations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All relations</SelectItem>
              {relations.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
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
              {formatNumber(totalGuardians, locale)}
            </span>{" "}
            guardians
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
            title="Couldn't load guardians"
            description="Please retry. If the problem persists, contact your administrator."
            onRetry={() => refetch()}
          />
        )}

        {!isError && isLoading && <LoadingState pattern="table" rows={6} />}

        {!isError && !isLoading && filtered.length === 0 && (
          <EmptyState
            illustration="students"
            title={
              search || activeFilterCount > 0
                ? "No guardians match your search"
                : "No guardians yet"
            }
            description={
              search || activeFilterCount > 0
                ? "Try adjusting your search or clearing filters."
                : "Guardians are added automatically when you create a student record."
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
              title="All guardians"
              description="Primary contact and linked student count for each guardian."
              className="px-4 pt-4"
            />
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                    <TableHead className="ps-4 text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Name
                    </TableHead>
                    <TableHead className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Phone
                    </TableHead>
                    <TableHead className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Email
                    </TableHead>
                    <TableHead className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Occupation
                    </TableHead>
                    <TableHead className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Relation
                    </TableHead>
                    <TableHead className="text-end text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Children
                    </TableHead>
                    <TableHead className="pe-4 text-end text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((g) => (
                    <TableRow key={g.id} className="hover:bg-surface-hover">
                      <TableCell className="ps-4 py-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-body font-medium text-text-primary">
                              {g.name}
                            </span>
                            {g.isPrimary && (
                              <Badge
                                variant="outline"
                                className="border-semantic-warning/40 bg-warning-50 text-semantic-warning"
                                title="Primary guardian"
                              >
                                <Star className="h-3 w-3" />
                                Primary
                              </Badge>
                            )}
                          </div>
                          {g.nameBn && (
                            <div
                              className="truncate text-caption text-text-muted"
                              lang="bn"
                            >
                              {g.nameBn}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        {g.phone ? (
                          <span className="flex items-center gap-2 font-mono text-body text-text-secondary">
                            <Phone
                              className="h-3.5 w-3.5 text-text-muted"
                              aria-hidden
                            />
                            {g.phone}
                          </span>
                        ) : (
                          <span className="text-caption text-text-muted">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        {g.email ? (
                          <span className="flex items-center gap-2 text-body text-text-secondary">
                            <Mail
                              className="h-3.5 w-3.5 text-text-muted"
                              aria-hidden
                            />
                            <span className="truncate">{g.email}</span>
                          </span>
                        ) : (
                          <span className="text-caption text-text-muted">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-body text-text-secondary">
                        {g.occupation || "—"}
                      </TableCell>
                      <TableCell className="py-3">
                        {g.relation ? (
                          <Badge variant="outline" className="font-normal">
                            {g.relation}
                          </Badge>
                        ) : (
                          <span className="text-caption text-text-muted">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-end font-mono text-body text-text-primary">
                        {formatNumber(g.childrenCount ?? 0, locale)}
                      </TableCell>
                      <TableCell className="pe-4 py-3 text-end">
                        <Badge
                          variant="outline"
                          className={
                            g.isPrimary
                              ? "border-semantic-success/40 bg-success-50 text-semantic-success"
                              : "text-text-muted"
                          }
                        >
                          {g.isPrimary ? "Active" : "Secondary"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
