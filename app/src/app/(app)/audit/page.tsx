"use client";

/**
 * MadrashaOS — Audit Explorer (C3.1 / Foundation screen 4 / SRS §2.1.4)
 *
 * The Audit Explorer is a key differentiator per SRS §2.1.4. It renders a
 * timeline of audit events derived from the 12 mock ledger entries
 * (expanded to 50+ sub-events via expandLedgerToAuditEvents — see
 * src/components/foundation/AuditEventCard.tsx).
 *
 * Each event shows:
 *   - Timestamp (locale-aware via formatDateLong)
 *   - Actor (user name + email monospace)
 *   - Action description + voucher number badge
 *   - Field-diff viewer: `amount: 20000 → 25000 by accountant@ at ...`
 *
 * The page is gated by IfPermission code="audit.view" per Risk R3. Loading +
 * error states use the shared LoadingState / ErrorState components.
 *
 * Filter bar (date range + actor) is client-side and visual-only per the
 * task spec — no backend call.
 */

import * as React from "react";
import { useMemo, useState } from "react";
import { History, Download, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IfPermission } from "@/components/auth/IfPermission";
import { PermissionDenied, LoadingState, ErrorState } from "@/components/states";
import { SectionCard, SectionCardHeader } from "@/components/foundation/SectionCard";
import {
  AuditEventCard,
  expandLedgerToAuditEvents,
  type AuditEvent,
} from "@/components/foundation/AuditEventCard";
import { useLedgerEntries, useCurrentUser } from "@/lib/query/client";
import { users as allUsers } from "@/lib/mock/fixtures/users";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { convertDigits, formatDateLong } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/config";

export default function AuditPage() {
  return (
    <IfPermission
      code="audit.view"
      fallback={<PermissionDenied resource="Audit Explorer" />}
    >
      <AuditExplorerContent />
    </IfPermission>
  );
}

function AuditExplorerContent() {
  const { locale } = useI18n();
  const {
    data: ledger,
    isLoading: ledgerLoading,
    isError: ledgerError,
    refetch: ledgerRefetch,
  } = useLedgerEntries();
  const { data: currentUser } = useCurrentUser();

  // Date range + actor filters (visual-only per task spec).
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [actorFilter, setActorFilter] = useState<string>("all");

  // Expand ledger into 50+ audit events. Memoized on ledger identity.
  const allEvents = useMemo<AuditEvent[]>(() => {
    if (!ledger) return [];
    return expandLedgerToAuditEvents(ledger, allUsers);
  }, [ledger]);

  // Apply visual-only filters (client-side).
  const filteredEvents = useMemo<AuditEvent[]>(() => {
    return allEvents.filter((e) => {
      if (actorFilter !== "all" && e.actorId !== actorFilter) return false;
      if (dateFrom) {
        const fromTs = new Date(`${dateFrom}T00:00:00`).getTime();
        if (e.timestamp.getTime() < fromTs) return false;
      }
      if (dateTo) {
        const toTs = new Date(`${dateTo}T23:59:59`).getTime();
        if (e.timestamp.getTime() > toTs) return false;
      }
      return true;
    });
  }, [allEvents, actorFilter, dateFrom, dateTo]);

  const activeFilterCount =
    (actorFilter !== "all" ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setActorFilter("all");
  }

  // KPI summary
  const uniqueActors = useMemo(
    () => new Set(filteredEvents.map((e) => e.actorId)).size,
    [filteredEvents],
  );
  const diffEventCount = useMemo(
    () => filteredEvents.filter((e) => e.diffs && e.diffs.length > 0).length,
    [filteredEvents],
  );

  if (ledgerLoading) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
          <HeaderBlock />
          <LoadingState pattern="list" rows={6} />
        </div>
      </div>
    );
  }

  if (ledgerError) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
          <HeaderBlock />
          <ErrorState
            title="Audit log unavailable"
            description="Could not load the audit trail. Please try again."
            onRetry={() => ledgerRefetch()}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <HeaderBlock currentUser={currentUser?.name} />

        {/* KPI strip */}
        <SectionCard>
          <div className="grid gap-4 sm:grid-cols-4">
            <KpiMetric
              label="Audit events"
              value={convertDigits(String(filteredEvents.length), locale)}
              hint={`of ${convertDigits(String(allEvents.length), locale)} total`}
            />
            <KpiMetric
              label="Field-level edits"
              value={convertDigits(String(diffEventCount), locale)}
              hint="with diff viewer"
            />
            <KpiMetric
              label="Distinct actors"
              value={convertDigits(String(uniqueActors), locale)}
              hint="across filtered range"
            />
            <KpiMetric
              label="Time range"
              value={
                filteredEvents.length > 0
                  ? formatRange(filteredEvents, locale)
                  : "—"
              }
              hint="earliest → latest"
            />
          </div>
        </SectionCard>

        {/* Filter bar — visual only per task spec */}
        <SectionCard>
          <SectionCardHeader
            title="Filters"
            description="Client-side filtering on the expanded audit trail. No backend call (mock mode)."
            action={
              activeFilterCount > 0 ? (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                  Clear ({convertDigits(String(activeFilterCount), locale)})
                </Button>
              ) : null
            }
          />
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-caption font-medium uppercase tracking-wider text-text-muted">
                Date from
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                aria-label="Date from"
                className="w-40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-caption font-medium uppercase tracking-wider text-text-muted">
                Date to
              </label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                aria-label="Date to"
                className="w-40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-caption font-medium uppercase tracking-wider text-text-muted">
                Actor
              </label>
              <Select value={actorFilter} onValueChange={setActorFilter}>
                <SelectTrigger className="w-56" aria-label="Filter by actor">
                  <SelectValue placeholder="All actors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actors</SelectItem>
                  {allUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} · {u.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" disabled>
              <Filter className="h-4 w-4" />
              Apply
            </Button>
          </div>
        </SectionCard>

        {/* Timeline */}
        <SectionCard>
          <SectionCardHeader
            title="Audit timeline"
            description="Most recent first. Each event shows actor, action, and field-level diffs (old → new)."
            action={
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            }
          />
          {filteredEvents.length === 0 ? (
            <p className="text-body text-text-secondary">
              No events match the current filters.
            </p>
          ) : (
            <ol className="max-h-[32rem] space-y-3 overflow-y-auto pe-2">
              {filteredEvents.map((event) => (
                <li key={event.id}>
                  <AuditEventCard event={event} />
                </li>
              ))}
            </ol>
          )}
        </SectionCard>

        {/* Legend */}
        <SectionCard>
          <SectionCardHeader
            title="Event legend"
            description="Color tone per action type."
          />
          <div className="flex flex-wrap gap-3 text-body">
            <LegendItem tone="info" label="Create / View / Export" />
            <LegendItem tone="warning" label="Edit / Submit" />
            <LegendItem tone="success" label="Post (approved)" />
            <LegendItem tone="danger" label="Danger / Reject" />
          </div>
          <p className="mt-4 text-caption text-text-muted">
            Diff viewer format:{" "}
            <span className="font-mono">
              field: <span className="text-semantic-danger line-through">old</span>{" "}
              → <span className="text-semantic-success">new</span> by{" "}
              <span className="font-mono">accountant@</span> at{" "}
              <span className="font-mono">2026-09-16 14:32</span>
            </span>
          </p>
        </SectionCard>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Local presentational helpers                                       */
/* ------------------------------------------------------------------ */

function HeaderBlock({ currentUser }: { currentUser?: string }) {
  return (
    <header>
      <h1 className="text-display font-bold text-text-primary">Audit Explorer</h1>
      <p className="mt-1 text-body text-text-secondary">
        Timeline of every state-changing action across the platform — the key
        differentiator per SRS §2.1.4.
        {currentUser && (
          <>
            {" "}
            Viewing as <span className="font-medium text-text-primary">{currentUser}</span>.
          </>
        )}
      </p>
    </header>
  );
}

function KpiMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-caption uppercase tracking-wider text-text-muted">
        {label}
      </p>
      <p className="text-display font-bold text-primary-500">{value}</p>
      {hint && (
        <p className="text-caption text-text-muted">{hint}</p>
      )}
    </div>
  );
}

const LEGEND_TONE_CLASS: Record<string, string> = {
  info: "bg-primary-50 text-primary-700",
  warning: "bg-warning-50 text-semantic-warning",
  success: "bg-success-50 text-semantic-success",
  danger: "bg-danger-50 text-semantic-danger",
};

function LegendItem({ tone, label }: { tone: string; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-medium ${LEGEND_TONE_CLASS[tone]}`}
    >
      <History className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}

function formatRange(events: AuditEvent[], locale: Locale): string {
  if (events.length === 0) return "";
  const timestamps = events.map((e) => e.timestamp.getTime());
  const earliest = new Date(Math.min(...timestamps));
  const latest = new Date(Math.max(...timestamps));
  return `${formatDateLong(earliest, locale)} → ${formatDateLong(latest, locale)}`;
}
