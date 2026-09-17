"use client";

/**
 * MadrashaOS — Notices Page (C4.3 — Communication · Notices · Risk R11)
 *
 * Notice Composer + Notice list per SRS §2.6.3 (Communication) and Risk R11
 * (composer surfaces a live recipient count chip before sending — no surprise
 * broadcasts to unintended audiences).
 *
 *   Upper section  → Notice list (useNotices() hook — 5 notices)
 *   FilterBar      → audience filter (All / Guardians / Staff / Class-specific)
 *   "Compose Notice" button (gated by IfPermission code="notices.compose")
 *   Composer Dialog with:
 *     - Title input (en + bn)
 *     - Body textarea (en + bn)
 *     - Audience selector (All / Guardians / Staff / Specific Class)
 *     - If "Specific Class" selected → show a class dropdown (useClasses)
 *     - Live recipient-count chip (Risk R11)
 *     - "Preview Recipients" button → opens Drawer listing recipients
 *     - "Send Notice" button (gated by IfPermission code="notices.send")
 *
 *   Loading → LoadingState pattern="list"
 *   Error   → ErrorState + retry
 *   Empty   → EmptyState illustration="results" (closest available)
 */

import * as React from "react";
import { Bell, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FilterBar } from "@/components/ui/filter-bar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { IfPermission } from "@/components/auth/IfPermission";
import { LoadingState, ErrorState, PermissionDenied } from "@/components/states";
import { EmptyState } from "@/components/ui/empty-state";
import { useSessionStore } from "@/stores/sessionStore";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatDate } from "@/lib/i18n/format";
import { useNotices } from "@/lib/query/client";
import { users } from "@/lib/mock/fixtures/users";
import { NoticeComposer, NoticeRow } from "@/components/communication";
import type { Notice } from "@/lib/mock/types";

type AudienceFilter = "all" | "guardians" | "staff" | "class";

export default function NoticesPage() {
  const { locale } = useI18n();
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const canView = hasPermission("notices.view");

  const { data: notices, isLoading, isError, refetch } = useNotices();

  const [audienceFilter, setAudienceFilter] = React.useState<AudienceFilter>("all");
  const [search, setSearch] = React.useState("");
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [viewing, setViewing] = React.useState<Notice | null>(null);

  const sentByName = (id: string) => users.find((u) => u.id === id)?.name ?? id;

  const filtered = React.useMemo(() => {
    if (!notices) return [];
    return notices
      .filter((n) => {
        if (audienceFilter === "all") return true;
        if (audienceFilter === "guardians") return n.audience === "guardians";
        if (audienceFilter === "staff") return n.audience === "staff";
        if (audienceFilter === "class") return n.audience === "class";
        return true;
      })
      .filter((n) => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          n.titleBn.toLowerCase().includes(q) ||
          n.body.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.sentAt < b.sentAt ? 1 : a.sentAt > b.sentAt ? -1 : 0));
  }, [notices, audienceFilter, search]);

  if (!canView) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <PermissionDenied resource="Notices" />
        </div>
      </div>
    );
  }

  const activeFilters = (audienceFilter !== "all" ? 1 : 0) + (search.trim() ? 1 : 0);

  const clearFilters = () => {
    setAudienceFilter("all");
    setSearch("");
  };

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-display font-bold text-text-primary">Notices</h1>
            <p className="mt-1 text-body text-text-secondary">
              Broadcast notices to guardians, staff, or a specific class. Recipient counts are shown live (Risk R11).
            </p>
          </div>
          <IfPermission code="notices.compose">
            <Button onClick={() => setComposeOpen(true)}>
              <Plus className="h-4 w-4" />
              Compose Notice
            </Button>
          </IfPermission>
        </header>

        {/* KPI strip */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border-default bg-surface-card p-4">
            <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
              Total Notices
            </p>
            <p className="mt-1 font-mono text-display font-bold text-primary-500">
              {notices?.length ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-border-default bg-surface-card p-4">
            <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
              Total Recipients Reached
            </p>
            <p className="mt-1 font-mono text-display font-bold text-accent-500">
              {notices?.reduce((sum, n) => sum + n.recipientCount, 0) ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-border-default bg-surface-card p-4">
            <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
              Most Recent
            </p>
            <p className="mt-1 font-mono text-display font-bold text-text-primary">
              {notices && notices.length > 0
                ? formatDate(new Date([...notices].sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1))[0].sentAt), locale)
                : "—"}
            </p>
          </div>
        </div>

        {/* FilterBar */}
        <FilterBar activeCount={activeFilters} onClear={activeFilters > 0 ? clearFilters : undefined}>
          <Select value={audienceFilter} onValueChange={(v) => setAudienceFilter(v as AudienceFilter)}>
            <SelectTrigger size="sm" className="w-44" aria-label="Filter by audience">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All audiences</SelectItem>
              <SelectItem value="guardians">Guardians</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="class">Class-specific</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              placeholder="Search by title or body…"
              className="h-8 ps-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search notices"
            />
          </div>
        </FilterBar>

        {/* Body */}
        {isLoading && <LoadingState pattern="list" rows={5} />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {!isLoading && !isError && filtered.length === 0 && (
          <EmptyState
            illustration="results"
            title="No notices yet"
            description={search || audienceFilter !== "all"
              ? "Adjust your filters to see more."
              : "Compose your first notice to broadcast to your audience."}
            action={
              <IfPermission code="notices.compose">
                <Button onClick={() => setComposeOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Compose Notice
                </Button>
              </IfPermission>
            }
          />
        )}
        {!isLoading && !isError && filtered.length > 0 && (
          <ul className="space-y-3">
            {filtered.map((n) => (
              <NoticeRow
                key={n.id}
                notice={n}
                sentByName={sentByName(n.sentBy)}
                locale={locale}
                onOpen={(notice) => setViewing(notice)}
              />
            ))}
          </ul>
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <p className="text-caption text-text-muted">
            Showing {filtered.length} of {notices?.length ?? 0} notices.
          </p>
        )}
      </div>

      {/* Composer dialog */}
      <NoticeComposer open={composeOpen} onOpenChange={setComposeOpen} />

      {/* Notice detail dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="sm:max-w-lg">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-subtitle">
                  <Bell className="h-5 w-5 text-primary-500" aria-hidden="true" />
                  {viewing.title}
                </DialogTitle>
                <DialogDescription>
                  {viewing.titleBn && (
                    <span className="block font-bn text-text-secondary" lang="bn">
                      {viewing.titleBn}
                    </span>
                  )}
                  Sent by {sentByName(viewing.sentBy)} · {formatDate(new Date(viewing.sentAt), locale)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <p className="text-body text-text-primary">{viewing.body}</p>
                {viewing.bodyBn && (
                  <p className="font-bn text-body text-text-secondary" lang="bn">
                    {viewing.bodyBn}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Badge variant="outline" className="border-primary-500/30 bg-primary-50 text-primary-700">
                    {viewing.audience === "all" ? "All"
                      : viewing.audience === "guardians" ? "Guardians"
                      : viewing.audience === "staff" ? "Staff"
                      : "Class-specific"}
                  </Badge>
                  <Badge variant="outline" className="border-border-strong text-text-secondary">
                    {viewing.recipientCount} recipients
                  </Badge>
                  {viewing.audience === "class" && viewing.audienceFilter && (
                    <Badge variant="outline" className="border-border-strong text-text-secondary">
                      {viewing.audienceFilter}
                    </Badge>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
