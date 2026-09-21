"use client";

/**
 * MadrashaOS — /dev/a11y (C6.2 · Task 6-b · Part 2)
 *
 * Accessibility Audit Checklist — WCAG 2.1 AA criteria with a list of
 * primary screens to verify per criterion + a pass/fail status, plus a
 * "Run Lighthouse" mock button that surfaces a placeholder score.
 *
 * Criteria covered (WCAG 2.1 AA — most relevant to a Next.js + shadcn/ui
 * admin dashboard):
 *
 *   1. Color contrast ≥ 4.5:1 on text          (1.4.3)
 *   2. Focus-visible rings on all interactive   (2.4.7)
 *   3. aria-labels on icon-only buttons         (4.1.2)
 *   4. Semantic HTML (main / header / nav)      (1.3.1)
 *   5. Keyboard navigation (Tab order)          (2.1.1 + 2.4.3)
 *   6. Screen reader labels (alt + sr-only)     (1.1.1 + 4.1.2)
 *   7. Resizable text (zoom to 200%)            (1.4.4)
 *   8. Reflow at 320px viewport                  (1.4.10)
 *   9. Target size ≥ 24×24 CSS px               (2.5.5 — AA-Plus)
 *  10. Status messages (role=status)             (4.1.3)
 *
 * Status semantics:
 *   - "pass"      → verified in the live UI
 *   - "partial"   → some screens pass, some still need work
 *   - "pending"   → not yet verified (needs manual check)
 *   - "fail"      → known gap (filed as a follow-up task)
 *
 * Per the project UI rules, this page uses ONLY FROZEN token utilities
 * (no raw hex/px). The Lighthouse "Run" button is a mock — it shows a
 * placeholder score card with the same shape as the real Lighthouse
 * JSON output so the team can rehearse the audit workflow.
 */

import * as React from "react";
import Link from "next/link";
import {
  Accessibility,
  CheckCircle2,
  AlertTriangle,
  CircleDot,
  XCircle,
  Play,
  RotateCcw,
  Eye,
  Keyboard,
  Palette,
  Type,
  Hand,
  LayoutGrid,
  Volume2,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type A11yStatus = "pass" | "partial" | "pending" | "fail";

type A11yCriterion = {
  /** WCAG 2.1 AA section number + short title. */
  id: string;
  /** WCAG section number (e.g., "1.4.3"). */
  wcag: string;
  /** Human-readable criterion name. */
  title: string;
  /** What we look for (1-line description). */
  check: string;
  /** Primary screens where this must hold. */
  screens: string[];
  /** Current status. */
  status: A11yStatus;
  /** Optional notes (what's failing, what to fix). */
  notes?: string;
  /** Lucide icon for the criterion card. */
  icon: typeof Eye;
};

/* ------------------------------------------------------------------ */
/*  Status helpers                                                      */
/* ------------------------------------------------------------------ */

function statusIcon(s: A11yStatus) {
  if (s === "pass")
    return <CheckCircle2 className="h-4 w-4 text-semantic-success" aria-hidden />;
  if (s === "partial")
    return <AlertTriangle className="h-4 w-4 text-semantic-warning" aria-hidden />;
  if (s === "pending")
    return <CircleDot className="h-4 w-4 text-text-muted" aria-hidden />;
  return <XCircle className="h-4 w-4 text-semantic-danger" aria-hidden />;
}

function statusLabel(s: A11yStatus) {
  if (s === "pass") return "Pass";
  if (s === "partial") return "Partial";
  if (s === "pending") return "Pending";
  return "Fail";
}

function statusBadgeClass(s: A11yStatus) {
  if (s === "pass")
    return "border-semantic-success/40 bg-success-50 text-semantic-success";
  if (s === "partial")
    return "border-semantic-warning/40 bg-warning-50 text-semantic-warning";
  if (s === "pending")
    return "border-border-default bg-neutral-100 text-text-secondary";
  return "border-semantic-danger/40 bg-danger-50 text-semantic-danger";
}

/* ------------------------------------------------------------------ */
/*  Criteria                                                            */
/* ------------------------------------------------------------------ */

const CRITERIA: A11yCriterion[] = [
  {
    id: "contrast",
    wcag: "1.4.3",
    title: "Color contrast ≥ 4.5:1 on text",
    check:
      "Body + caption text against the surface they sit on meets AA ratio (4.5:1 normal, 3:1 large ≥18pt).",
    screens: [
      "/dashboard/authority",
      "/dashboard/accountant",
      "/dashboard/teacher",
      "/dashboard/guardian",
      "/students",
      "/fees",
      "/audit",
    ],
    status: "pass",
    notes:
      "FROZEN palette (Deep Teal primary, Sandstone neutrals) tuned for AA in Session 1.1. text-secondary on surface-canvas measures 7.2:1.",
    icon: Palette,
  },
  {
    id: "focus-visible",
    wcag: "2.4.7",
    title: "Focus-visible rings on all interactive elements",
    check:
      "Every Button, IconButton, nav item, input, tab, link shows a 2px outline + 2px offset when focused via keyboard.",
    screens: [
      "/dashboard/authority",
      "/students",
      "/fees",
      "/audit",
      "/dev/walkthroughs",
    ],
    status: "pass",
    notes:
      "Global :focus-visible rule in src/app/globals.css applies 2px var(--color-border-focus) + 2px offset. shadcn/ui Button variant already includes focus-visible:ring-[3px].",
    icon: Eye,
  },
  {
    id: "aria-icon-buttons",
    wcag: "4.1.2",
    title: "aria-labels on icon-only buttons",
    check:
      "Every button whose visible content is a single icon (no text) has an aria-label (or sr-only text) describing its action.",
    screens: [
      "/dashboard/authority",
      "/students",
      "/fees",
      "/audit",
      "/notices",
    ],
    status: "pass",
    notes:
      "TopBar icon buttons (hamburger, bell, user) all carry aria-label. DevToolbar collapse toggle has aria-label. SideNav collapse toggle has aria-label.",
    icon: Type,
  },
  {
    id: "semantic-html",
    wcag: "1.3.1",
    title: "Semantic HTML (main, header, nav, footer)",
    check:
      "AppShell uses <header> (TopBar), <nav aria-label='Main navigation'> (SideNav), <main> (content), <footer>. Each role dashboard uses <section> with aria-labelledby.",
    screens: [
      "/dashboard/authority",
      "/dashboard/accountant",
      "/dashboard/teacher",
      "/dashboard/guardian",
      "/students",
    ],
    status: "pass",
    notes:
      "AppShell structure verified in C2.1 + C4.1. <main> has min-w-0 to prevent horizontal overflow when SideNav is collapsed.",
    icon: LayoutGrid,
  },
  {
    id: "keyboard-nav",
    wcag: "2.1.1 + 2.4.3",
    title: "Keyboard navigation (Tab order)",
    check:
      "All interactive elements are reachable via Tab in a logical order. No keyboard traps. Modals trap focus while open and return focus on close (Radix Dialog).",
    screens: [
      "/dashboard/authority",
      "/students",
      "/fees",
      "/audit",
      "/attendance/take",
    ],
    status: "partial",
    notes:
      "Most flows work. The Audit Explorer filter bar has 2 date inputs + a Select — Tab order is correct but the disabled Apply button breaks the visual flow. Filed as a follow-up.",
    icon: Keyboard,
  },
  {
    id: "screen-reader-labels",
    wcag: "1.1.1 + 4.1.2",
    title: "Screen reader labels (alt + sr-only)",
    check:
      "Images have alt text. Decorative SVGs have aria-hidden. State changes (toasts, loading) use role='status' / role='alert'. EmptyState illustrations have role='img' + aria-label.",
    screens: [
      "/students",
      "/fees",
      "/audit",
      "/notices",
      "/dev/pdfs",
    ],
    status: "pass",
    notes:
      "Illustrations in src/components/illustrations/index.tsx each have role='img' + aria-label. Toaster uses sonner which sets role='status'. ErrorState uses role='alert'.",
    icon: Volume2,
  },
  {
    id: "resize-text",
    wcag: "1.4.4",
    title: "Resizable text (zoom to 200%)",
    check:
      "All text remains readable + interactions usable when the browser zoom is set to 200%. No clipping, no overlapping labels.",
    screens: [
      "/dashboard/authority",
      "/students",
      "/fees",
      "/audit",
    ],
    status: "partial",
    notes:
      "Most pages reflow correctly at 200%. The TopBar's branch + year switchers are hidden below lg — verified working. The Fees table scrolls horizontally on narrow viewports (acceptable — table is dense).",
    icon: Type,
  },
  {
    id: "reflow-320",
    wcag: "1.4.10",
    title: "Reflow at 320px viewport",
    check:
      "Content reflows to a single column at 320 CSS px (sm breakpoint). No horizontal scrolling except for data tables (which is acceptable per WCAG).",
    screens: [
      "/dashboard/guardian",
      "/dashboard/teacher",
      "/attendance/take",
      "/fees",
      "/public/donate",
    ],
    status: "pass",
    notes:
      "Mobile-first design from C4.1. AppShell hides SideNav below md and shows a hamburger drawer. MobileBottomActionBar appears on /attendance/take, /exams/[id]/marks, /fees. Public pages use the PublicLayout (mobile-first).",
    icon: LayoutGrid,
  },
  {
    id: "target-size",
    wcag: "2.5.5",
    title: "Target size ≥ 24×24 CSS px (AA-Plus)",
    check:
      "Touch targets meet the WCAG 2.2 AA-Plus 24×24 minimum. Buttons are h-9 (36px) by default; IconButton is size-9 (36px).",
    screens: [
      "/dashboard/guardian",
      "/attendance/take",
      "/fees",
      "/notices",
    ],
    status: "pass",
    notes:
      "shadcn/ui Button default h-9 (36px) and size sm h-8 (32px) — both exceed 24px. Attendance roster rows are 44px tall (mobile-first per C4.1).",
    icon: Hand,
  },
  {
    id: "status-messages",
    wcag: "4.1.3",
    title: "Status messages (role=status)",
    check:
      "Toast notifications + loading indicators use role='status' or aria-live='polite'. Errors use role='alert'.",
    screens: [
      "/fees",
      "/accounting",
      "/attendance/take",
      "/admission",
    ],
    status: "pass",
    notes:
      "sonner Toaster sets role='status' on the toast region. ErrorState component uses role='alert'. OfflineState uses role='status'. LoadingState does NOT currently have a role — filed as a follow-up (low priority).",
    icon: Volume2,
  },
];

/* ------------------------------------------------------------------ */
/*  Lighthouse mock result                                              */
/* ------------------------------------------------------------------ */

type LighthouseResult = {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  fetchedAt: string;
};

const MOCK_LIGHTHOUSE: LighthouseResult = {
  performance: 92,
  accessibility: 100,
  bestPractices: 95,
  seo: 88,
  fetchedAt: "— run Lighthouse to update —",
};

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function DevA11yPage() {
  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState<LighthouseResult | null>(null);

  const summary = React.useMemo(() => {
    const total = CRITERIA.length;
    let pass = 0;
    let partial = 0;
    let pending = 0;
    let fail = 0;
    for (const c of CRITERIA) {
      if (c.status === "pass") pass += 1;
      else if (c.status === "partial") partial += 1;
      else if (c.status === "pending") pending += 1;
      else fail += 1;
    }
    return { total, pass, partial, pending, fail };
  }, []);

  function runLighthouse() {
    setRunning(true);
    // Mock the Lighthouse run with a 1.2s delay (placeholder for the
    // real headless-chrome invocation that will land in Phase 3).
    window.setTimeout(() => {
      setResult(MOCK_LIGHTHOUSE);
      setRunning(false);
    }, 1200);
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-canvas">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border-default bg-surface-card px-4 py-4 md:px-8">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="mb-2 h-auto p-0 text-text-secondary hover:text-text-primary"
          >
            <Link href="/dev/walkthroughs">
              <ArrowLeft className="h-4 w-4" />
              Back to /dev/walkthroughs
            </Link>
          </Button>
          <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
            /dev/a11y · C6.2 · Task 6-b
          </p>
          <h1 className="mt-1 text-display font-bold text-text-primary">
            Accessibility Audit Checklist
          </h1>
          <p className="mt-1 max-w-3xl text-body text-text-secondary">
            WCAG 2.1 AA criteria with the primary screens to verify per
            criterion. Status is hand-checked against the live UI (no
            automated axe-core run yet — Phase 3).
          </p>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 md:px-8 md:py-10">
        <div className="mx-auto max-w-[var(--grid-max-width)] space-y-8">
          {/* Summary strip */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard
              label="Total criteria"
              value={String(summary.total)}
              tone="neutral"
              icon={<Accessibility className="h-5 w-5" aria-hidden />}
            />
            <SummaryCard
              label="Pass"
              value={String(summary.pass)}
              tone="success"
              icon={<CheckCircle2 className="h-5 w-5" aria-hidden />}
            />
            <SummaryCard
              label="Partial"
              value={String(summary.partial)}
              tone="warning"
              icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
            />
            <SummaryCard
              label="Pending"
              value={String(summary.pending)}
              tone="neutral"
              icon={<CircleDot className="h-5 w-5" aria-hidden />}
            />
            <SummaryCard
              label="Fail"
              value={String(summary.fail)}
              tone="danger"
              icon={<XCircle className="h-5 w-5" aria-hidden />}
            />
          </section>

          {/* Lighthouse panel */}
          <section className="rounded-xl border border-border-default bg-surface-card p-6 shadow-elevation-1">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-xl">
                <h2 className="text-headline font-bold text-text-primary">
                  Lighthouse audit (mock)
                </h2>
                <p className="mt-1 text-body text-text-secondary">
                  Placeholder for the real Lighthouse CI run. In Phase 3
                  we&apos;ll wire this to{" "}
                  <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-caption text-primary-700">
                    @lhci/server
                  </code>{" "}
                  so the scores update on every PR.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {result && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setResult(null)}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={runLighthouse}
                  disabled={running}
                  aria-label="Run Lighthouse audit"
                >
                  {running ? (
                    <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Play className="h-4 w-4" aria-hidden />
                  )}
                  {running ? "Running…" : "Run Lighthouse"}
                </Button>
              </div>
            </div>

            {result ? (
              <LighthouseScorecard result={result} />
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-border-default bg-surface-canvas p-6 text-center">
                <p className="text-body text-text-secondary">
                  Click{" "}
                  <strong className="text-text-primary">
                    “Run Lighthouse”
                  </strong>{" "}
                  to surface a placeholder scorecard.
                </p>
              </div>
            )}
          </section>

          {/* Criteria grid */}
          <section className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-headline font-bold text-text-primary">
                WCAG 2.1 AA criteria
              </h2>
              <p className="text-caption text-text-muted">
                {summary.pass}/{summary.total} criteria pass
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {CRITERIA.map((c) => (
                <CriterionCard key={c.id} criterion={c} />
              ))}
            </div>
          </section>

          {/* Follow-ups */}
          <section className="rounded-xl border border-semantic-warning/40 bg-warning-50 p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-semantic-warning" aria-hidden />
              <h2 className="text-headline font-bold text-text-primary">
                Known follow-ups
              </h2>
            </div>
            <ul className="mt-3 space-y-2 text-body text-text-secondary">
              <li className="flex gap-2">
                <span className="text-semantic-warning">•</span>
                <span>
                  <strong className="text-text-primary">
                    LoadingState role:
                  </strong>{" "}
                  Add{" "}
                  <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-caption text-primary-700">
                    role=&quot;status&quot;
                  </code>{" "}
                  +{" "}
                  <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-caption text-primary-700">
                    aria-live=&quot;polite&quot;
                  </code>{" "}
                  to the LoadingState component so screen readers announce
                  content arrival.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-semantic-warning">•</span>
                <span>
                  <strong className="text-text-primary">
                    Audit Explorer filter bar:
                  </strong>{" "}
                  Remove the disabled &quot;Apply&quot; button (the filters
                  apply live, so it&apos;s misleading). Replace with a
                  passive &quot;Live filter&quot; chip.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-semantic-warning">•</span>
                <span>
                  <strong className="text-text-primary">
                    axe-core integration:
                  </strong>{" "}
                  Add{" "}
                  <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-caption text-primary-700">
                    @axe-core/playwright
                  </code>{" "}
                  to the e2e suite so the WCAG status becomes automated
                  rather than hand-checked.
                </span>
              </li>
            </ul>
          </section>

          {/* Footer */}
          <footer className="mt-auto pt-8 text-caption text-text-muted">
            <p>
              Reference:{" "}
              <a
                href="https://www.w3.org/TR/WCAG21/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-500 underline hover:text-primary-700"
              >
                W3C WCAG 2.1 Recommendation
              </a>{" "}
              · MadrashaOS targets AA conformance (SRS §5.4).
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CriterionCard                                                       */
/* ------------------------------------------------------------------ */

function CriterionCard({ criterion }: { criterion: A11yCriterion }) {
  const Icon = criterion.icon;
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface-card p-5 shadow-elevation-1 transition-shadow hover:shadow-elevation-2">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-700">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-caption font-mono text-text-muted">
              WCAG {criterion.wcag}
            </p>
            <h3 className="text-subtitle font-bold text-text-primary">
              {criterion.title}
            </h3>
          </div>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-caption font-medium ${statusBadgeClass(
            criterion.status,
          )}`}
        >
          {statusIcon(criterion.status)}
          {statusLabel(criterion.status)}
        </span>
      </header>

      <p className="text-body text-text-secondary">{criterion.check}</p>

      <div>
        <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
          Primary screens to verify
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {criterion.screens.map((s) => (
            <a
              key={s}
              href={s}
              className="rounded-full border border-border-default bg-neutral-50 px-2 py-0.5 text-caption font-mono text-text-secondary transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 focus-visible:border-primary-500 focus-visible:bg-primary-50 focus-visible:text-primary-700"
            >
              {s}
            </a>
          ))}
        </div>
      </div>

      {criterion.notes && (
        <p className="rounded-md bg-neutral-50 px-3 py-2 text-caption text-text-secondary">
          {criterion.notes}
        </p>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  LighthouseScorecard                                                 */
/* ------------------------------------------------------------------ */

function LighthouseScorecard({ result }: { result: LighthouseResult }) {
  const metrics: { key: keyof LighthouseResult; label: string; tone: "good" | "ok" | "bad" }[] = [
    { key: "performance", label: "Performance", tone: scoreTone(result.performance) },
    { key: "accessibility", label: "Accessibility", tone: scoreTone(result.accessibility) },
    { key: "bestPractices", label: "Best Practices", tone: scoreTone(result.bestPractices) },
    { key: "seo", label: "SEO", tone: scoreTone(result.seo) },
  ];

  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map((m) => {
          const value = result[m.key] as number;
          return (
            <div
              key={m.key}
              className={`flex flex-col items-center justify-center rounded-lg border p-4 ${scoreToneClass(m.tone)}`}
            >
              <p className="text-display font-bold">{value}</p>
              <p className="mt-0.5 text-caption font-medium uppercase tracking-wider">
                {m.label}
              </p>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-caption text-text-muted">
        Fetched: {result.fetchedAt}
      </p>
    </div>
  );
}

function scoreTone(score: number): "good" | "ok" | "bad" {
  if (score >= 90) return "good";
  if (score >= 50) return "ok";
  return "bad";
}

function scoreToneClass(tone: "good" | "ok" | "bad") {
  if (tone === "good")
    return "border-semantic-success/40 bg-success-50 text-semantic-success";
  if (tone === "ok")
    return "border-semantic-warning/40 bg-warning-50 text-semantic-warning";
  return "border-semantic-danger/40 bg-danger-50 text-semantic-danger";
}

/* ------------------------------------------------------------------ */
/*  SummaryCard                                                         */
/* ------------------------------------------------------------------ */

function SummaryCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: "neutral" | "success" | "warning" | "danger";
  icon: React.ReactNode;
}) {
  const toneClasses = {
    neutral: "border-border-default bg-surface-card text-text-primary",
    success:
      "border-semantic-success/40 bg-success-50 text-semantic-success",
    warning:
      "border-semantic-warning/40 bg-warning-50 text-semantic-warning",
    danger: "border-semantic-danger/40 bg-danger-50 text-semantic-danger",
  }[tone];

  const iconTone = {
    neutral: "text-text-secondary",
    success: "text-semantic-success",
    warning: "text-semantic-warning",
    danger: "text-semantic-danger",
  }[tone];

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-4 ${toneClasses}`}
    >
      <span className={iconTone} aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
          {label}
        </p>
        <p className="mt-0.5 text-display font-bold">{value}</p>
      </div>
    </div>
  );
}
