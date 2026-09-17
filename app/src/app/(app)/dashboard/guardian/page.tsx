"use client";

/**
 * MadrashaOS — Guardian Dashboard (C4.4 — Mobile Hi-Fi Polish)
 *
 * For: Parent (SRS §8.1)
 * Mobile-first (SRS §5.4). Read-only on own linked children.
 * Risk R5: child-switcher segmented control at top.
 *
 * C4.4 polish:
 *   - All KPI cards stack vertically on mobile (grid-cols-1), grid-cols-3 on md+
 *   - Child-switcher is a segmented control (not a dropdown) on mobile for
 *     thumb-friendly interaction. Falls back to the existing inline grid on
 *     md+ via Tailwind responsive prefixes.
 *   - "Pay Now" CTA on the Outstanding Fees card — mobile-only, sticky to
 *     the bottom of the viewport so it stays reachable while scrolling
 *     (uses the same fixed-mobile-bar pattern as MobileBottomActionBar).
 *   - Notices list is scrollable (max-h-64 overflow-y-auto) on mobile to
 *     prevent the page from growing indefinitely long when many notices exist.
 *     Custom scrollbar styling for the warm-neutral token aesthetic.
 *   - Up to 5 notices shown (instead of 3) so the scroll area is meaningful.
 */

import { useState } from "react";
import {
  GraduationCap,
  Wallet,
  Bell,
  Wallet as WalletIcon,
  ChevronRight,
} from "lucide-react";
import { useStudents, useFeePlans, useNotices } from "@/lib/query/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatCurrency, formatDate } from "@/lib/i18n/format";
import { KpiCard, GuardianChildrenWidget } from "@/components/widgets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function GuardianDashboard() {
  const { locale } = useI18n();
  const { toast } = useToast();
  const { data: students } = useStudents();
  const { data: feePlans } = useFeePlans();
  const { data: notices } = useNotices();

  // Mock: guardian sees their first 2 children
  const myChildren = students?.slice(0, 2) ?? [];
  const childIds = new Set(myChildren.map((c) => c.id));
  const myFeePlans = feePlans?.filter((p) => childIds.has(p.studentId)) ?? [];
  const outstandingAmount = myFeePlans
    .flatMap((p) => p.installments)
    .filter((i) => !i.paid)
    .reduce((s, i) => s + i.amount, 0);
  // Show up to 5 notices on mobile so the scroll container is meaningful.
  const recentNotices = (notices ?? []).slice(0, 5);

  // Selected child for the segmented control (mocked — drives the active state).
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const activeChild =
    myChildren.find((c) => c.id === activeChildId) ?? myChildren[0] ?? null;

  const hasOutstanding = outstandingAmount > 0;

  function handlePayNow() {
    toast({
      title: "Opening payment",
      description: activeChild
        ? `Redirecting to the bKash/Nagad gateway for ${activeChild.name}.`
        : "Select a child first.",
    });
  }

  return (
    <div className="px-4 py-6 pb-28 md:px-8 md:py-12 md:pb-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-display font-bold text-text-primary">
              Guardian Portal
            </h1>
            <p className="mt-1 text-body text-text-secondary">
              Your children · fees · notices.
            </p>
          </div>
        </header>

        {/* Child-switcher segmented control (mobile, thumb-friendly) */}
        {myChildren.length > 1 && (
          <section
            aria-label="Switch child"
            className="md:hidden"
          >
            <div
              role="tablist"
              aria-label="Select child"
              className="inline-flex w-full gap-1 rounded-full border border-border-strong bg-surface-card p-1 shadow-elevation-1"
            >
              {myChildren.map((c) => {
                const isActive = (activeChild?.id ?? myChildren[0]?.id) === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveChildId(c.id)}
                    className={`flex-1 rounded-full px-3 py-2 text-subtitle font-medium transition-colors ${
                      isActive
                        ? "bg-primary-500 text-primary-foreground shadow-elevation-1"
                        : "text-text-secondary hover:bg-surface-hover"
                    }`}
                  >
                    <span className="block truncate">{c.name}</span>
                    <span className="block font-mono text-[10px] opacity-80">
                      {c.code}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* KPI strip — stacks on mobile, 3-col grid on md+ */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard
            label="My Children"
            value={String(myChildren.length)}
            icon={GraduationCap}
            tone="primary"
          />
          <Card className="relative">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-caption font-medium uppercase tracking-wider text-text-muted">
                Outstanding Fees
              </CardTitle>
              <Wallet className="h-5 w-5 text-semantic-warning" />
            </CardHeader>
            <CardContent>
              <p className="text-display font-bold text-semantic-warning">
                {formatCurrency(outstandingAmount, locale)}
              </p>
              <p className="mt-1 text-caption text-text-secondary">
                {hasOutstanding ? "Tap Pay Now to settle." : "All cleared · thank you."}
              </p>
              {/* Mobile-only Pay Now CTA inside the card */}
              {hasOutstanding && (
                <Button
                  type="button"
                  onClick={handlePayNow}
                  className="mt-3 w-full md:hidden"
                  size="sm"
                  aria-label={`Pay ${formatCurrency(outstandingAmount, locale)} now`}
                >
                  <WalletIcon className="h-4 w-4" />
                  Pay Now
                </Button>
              )}
            </CardContent>
          </Card>
          <KpiCard
            label="Notices"
            value={String(notices?.length ?? 0)}
            icon={Bell}
            tone="primary"
          />
        </div>

        {/* Bottom grid: my children + recent notices (stack on mobile, 2-col on lg+) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <GuardianChildrenWidget />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-subtitle">Recent Notices</CardTitle>
              <Badge variant="outline" className="border-border-strong text-text-secondary">
                {notices?.length ?? 0} total
              </Badge>
            </CardHeader>
            <CardContent>
              {recentNotices.length === 0 ? (
                <p className="py-6 text-center text-body text-text-secondary">
                  No notices yet.
                </p>
              ) : (
                <ul
                  className="max-h-64 space-y-2 overflow-y-auto pe-1"
                  style={{ scrollbarWidth: "thin" }}
                >
                  {recentNotices.map((n) => {
                    const toneClass =
                      n.audience === "guardians"
                        ? "border-accent-100 bg-accent-50 text-accent-700"
                        : n.audience === "staff"
                          ? "border-primary-200 bg-primary-50 text-primary-700"
                          : "border-border-strong bg-neutral-100 text-text-secondary";
                    const label =
                      n.audience === "all"
                        ? "All"
                        : n.audience === "staff"
                          ? "Staff"
                          : n.audience === "guardians"
                            ? "Guardians"
                            : "Class";
                    return (
                      <li
                        key={n.id}
                        className="rounded-md border border-border-default p-3 transition-colors hover:bg-surface-hover"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-body font-medium text-text-primary">
                            {locale === "bn" ? n.titleBn : n.title}
                          </p>
                          <Badge
                            variant="outline"
                            className={`shrink-0 ${toneClass}`}
                          >
                            {label}
                          </Badge>
                        </div>
                        <p className="mt-1 text-caption text-text-muted">
                          {formatDate(new Date(n.sentAt), locale)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 w-full justify-center text-caption text-primary-500"
              >
                View all notices
                <ChevronRight className="h-3 w-3" data-directional="true" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile-only sticky Pay Now CTA — anchored to the viewport bottom.
          Hidden on md+ (md:hidden) and only rendered when there's an outstanding
          balance. Adds bottom padding via the page wrapper (pb-28 on mobile)
          so content above isn't covered. */}
      {hasOutstanding && (
        <div
          role="region"
          aria-label="Quick pay action"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border-default bg-surface-card p-3 shadow-elevation-2 md:hidden"
        >
          <div className="mx-auto flex max-w-[var(--grid-max-width)] items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-caption text-text-muted">Outstanding</p>
              <p className="truncate font-mono text-subtitle font-bold text-semantic-warning">
                {formatCurrency(outstandingAmount, locale)}
              </p>
            </div>
            <Button
              type="button"
              onClick={handlePayNow}
              className="h-11 px-6"
              size="lg"
              aria-label="Pay outstanding fees now"
            >
              <WalletIcon className="h-4 w-4" />
              Pay Now
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
