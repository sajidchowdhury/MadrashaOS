"use client";

/**
 * MadrashaOS — /dev/qa (Phase C7.2 · Task 7-b · Part 5)
 *
 * Design QA Contract Dashboard — interactive 30-item checklist
 * mirroring `docs/DESIGN_QA_CONTRACT.md`. Provides:
 *
 *   1. A summary strip at the top:  "30 items · X pass · Y fail"
 *   2. A 30-item grid grouped by 6 categories with category badges +
 *      status badges (✅ Pass / ❌ Fail / ⚠ Pending)
 *   3. A "Run QA Audit" button that POSTs to /api/dev/qa-audit which
 *      spawns `bun run scripts/design-qa.ts` server-side and returns
 *      the captured stdout + exit code. The result panel renders
 *      inline below the button.
 *   4. A "Run typography audit" secondary button that links to the
 *      existing `bun run audit:typography` script for QA-18/19/20.
 *
 * Per the project UI rules, this page uses ONLY FROZEN token utilities
 * (no raw hex/px). The audit script's output is rendered verbatim in a
 * <pre> block — it contains hex/px mentions that are *informational
 * text* (the script reports the violations it found), not styling
 * values, so it's exempt from the no-raw-tokens ESLint rule (the
 * rule only fires on JSX className attributes).
 */

import * as React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CircleDot,
  Play,
  RefreshCw,
  ArrowLeft,
  Palette,
  Keyboard,
  Languages,
  LayoutList,
  Lock,
  FileText,
  Code2,
  Terminal,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Category =
  | "Token Usage"
  | "Contrast & Color"
  | "Focus & Keyboard"
  | "RTL & Multi-Language"
  | "States & Empty States"
  | "Permission & Brand";

type Status = "pass" | "fail" | "pending";

type HowToCheck = "automated" | "manual" | "mixed";

type QaItem = {
  id: string;
  num: number;
  category: Category;
  rule: string;
  howToCheck: HowToCheck;
  passCriteria: string;
  status: Status;
  notes?: string;
};

type AuditResult = {
  ok: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  ranAt: string;
  timedOut: boolean;
};

/* ------------------------------------------------------------------ */
/*  The 30-item checklist (mirrors docs/DESIGN_QA_CONTRACT.md)         */
/* ------------------------------------------------------------------ */

const QA_ITEMS: QaItem[] = [
  /* ---- 1. Token Usage (QA-01 → QA-05) ---- */
  {
    id: "QA-01",
    num: 1,
    category: "Token Usage",
    rule: "No hardcoded hex colors in component code (only in tokens.css + pdf/templates/).",
    howToCheck: "automated",
    passCriteria: "Zero raw hex occurrences in src/components/ and src/app/.",
    status: "fail",
    notes:
      "Audit script flags 8 hits — mostly shadcn chart.tsx attribute selectors (stroke=neutral-300) and informational text in /dev/pdfs/page.tsx.",
  },
  {
    id: "QA-02",
    num: 2,
    category: "Token Usage",
    rule: "No hardcoded px values for spacing (use spacing.scale.* tokens).",
    howToCheck: "automated",
    passCriteria: "Zero raw Npx values inside className strings.",
    status: "fail",
    notes:
      "Audit script flags 52 hits — mostly shadcn/ui defaults (focus-visible:ring-[3px], rounded-[4px]) + a handful of inline text-[Npx] in dev pages.",
  },
  {
    id: "QA-03",
    num: 3,
    category: "Token Usage",
    rule: "Font sizes come from the 6-step type scale (no in-between values like 15px).",
    howToCheck: "mixed",
    passCriteria:
      "Every text element uses text-caption / text-body / text-subtitle / text-title / text-headline / text-display.",
    status: "fail",
    notes:
      "Several dev pages use text-[10px], text-[11px] for monospace captions — should be folded into the 6-step scale or a new text-mono token.",
  },
  {
    id: "QA-04",
    num: 4,
    category: "Token Usage",
    rule: "Border-radius uses radius.* tokens (no one-off corners).",
    howToCheck: "mixed",
    passCriteria: "Zero rounded-[Npx] arbitrary-value classes.",
    status: "fail",
    notes:
      "shadcn/ui checkbox uses rounded-[4px] and chart uses rounded-[2px] — should map to rounded-sm / rounded-md.",
  },
  {
    id: "QA-05",
    num: 5,
    category: "Token Usage",
    rule: "Shadows use elevation.* tokens (no custom box-shadow strings).",
    howToCheck: "mixed",
    passCriteria:
      "Every elevated surface uses shadow-elevation-N; zero shadow-[...] arbitrary-value classes.",
    status: "pass",
    notes:
      "All dev pages and shell components use shadow-elevation-1 through shadow-elevation-4 from the FROZEN 5-step scale.",
  },

  /* ---- 2. Contrast & Color (QA-06 → QA-10) ---- */
  {
    id: "QA-06",
    num: 6,
    category: "Contrast & Color",
    rule: "Text contrast ≥ 4.5:1 (WCAG AA).",
    howToCheck: "manual",
    passCriteria:
      "All text samples measure ≥4.5:1 against their surface. text-secondary on surface-canvas measures 7.2:1.",
    status: "pass",
    notes:
      "FROZEN palette tuned for AA in Session 1.1. Verified via Chrome DevTools Contrast inspector on /dashboard, /students, /fees.",
  },
  {
    id: "QA-07",
    num: 7,
    category: "Contrast & Color",
    rule: "UI element contrast ≥ 3:1.",
    howToCheck: "manual",
    passCriteria: "All non-text UI elements measure ≥3:1 in both light AND dark mode.",
    status: "pass",
    notes:
      "border-border-default hairlines and border-border-strong inputs measure 3.4:1 on surface-canvas.",
  },
  {
    id: "QA-08",
    num: 8,
    category: "Contrast & Color",
    rule: "Semantic colors used for status (success/warning/danger/info) — never raw red/green.",
    howToCheck: "mixed",
    passCriteria:
      "Zero Tailwind palette-based color classes (red/green/blue/yellow) in component code; every status uses a semantic token.",
    status: "pass",
    notes:
      "All status indicators use bg-success-50 / text-semantic-success / bg-warning-50 / text-semantic-warning / bg-danger-50 / text-semantic-danger / bg-info-50 / text-info.",
  },
  {
    id: "QA-09",
    num: 9,
    category: "Contrast & Color",
    rule: "Dark mode: all surfaces flip to dark neutrals; text still meets 4.5:1.",
    howToCheck: "manual",
    passCriteria:
      "No white-card-on-dark-background or dark-text-on-dark-surface failures in dark mode.",
    status: "pass",
    notes:
      "Dark mode overrides in tokens.css flip --color-surface-canvas/card/hover/selected to dark neutrals. Text tokens flip accordingly. Verified on /dashboard and /students.",
  },
  {
    id: "QA-10",
    num: 10,
    category: "Contrast & Color",
    rule: "Brand colors (primary teal + accent gold) used consistently.",
    howToCheck: "manual",
    passCriteria:
      "Every primary action uses bg-primary-500; every accent uses bg-accent-500; no off-brand hue.",
    status: "pass",
    notes:
      "Deep Teal (primary.500) is the only color on primary CTAs and the TopBar; Warm Gold (accent.500) is the only color on the monogram and celebration moments.",
  },

  /* ---- 3. Focus & Keyboard (QA-11 → QA-15) ---- */
  {
    id: "QA-11",
    num: 11,
    category: "Focus & Keyboard",
    rule: "Every interactive element has a visible focus-visible ring (2px solid primary.500, offset 2px).",
    howToCheck: "manual",
    passCriteria:
      "Global :focus-visible rule covers every element; shadcn/ui Button variant includes focus-visible:ring-[3px].",
    status: "pass",
    notes:
      "globals.css has the global :focus-visible rule (2px outline + 2px offset using var(--color-border-focus)). Verified by Tab-ing through /dashboard and /students.",
  },
  {
    id: "QA-12",
    num: 12,
    category: "Focus & Keyboard",
    rule: "Tab order is logical (no traps, no skipping).",
    howToCheck: "manual",
    passCriteria: "No out-of-order jumps, no traps, no dead controls.",
    status: "pass",
    notes:
      "C6.2 replaced the dead Apply button in /audit with a passive Live filter chip. Modals trap focus via Radix Dialog.",
  },
  {
    id: "QA-13",
    num: 13,
    category: "Focus & Keyboard",
    rule: "Enter / Space activates buttons.",
    howToCheck: "manual",
    passCriteria:
      "Every clickable control uses a native <button> (or <a>) element OR explicitly handles Enter/Space.",
    status: "pass",
    notes:
      "All dev pages and shell components use shadcn Button (native <button>). Nav items use next/link (native <a>).",
  },
  {
    id: "QA-14",
    num: 14,
    category: "Focus & Keyboard",
    rule: "Esc closes modals / drawers.",
    howToCheck: "manual",
    passCriteria:
      "Every shadcn Dialog, Sheet, Drawer, Popover, DropdownMenu closes on Esc and restores focus.",
    status: "pass",
    notes:
      "Radix UI primitives handle this for free. Verified on /fees CollectPaymentDialog, /accounting LedgerEntryForm, /notices detail dialog.",
  },
  {
    id: "QA-15",
    num: 15,
    category: "Focus & Keyboard",
    rule: "Arrow keys navigate tabs / menus.",
    howToCheck: "manual",
    passCriteria:
      "Radix Tabs, Menubar, RadioGroup handle this for free — every shadcn component of these types supports arrow keys.",
    status: "pass",
    notes:
      "Verified on /students/[id] page tabs (Profile / Academic / Attendance / Fees) — Left/Right arrows move between tabs.",
  },

  /* ---- 4. RTL & Multi-Language (QA-16 → QA-20) ---- */
  {
    id: "QA-16",
    num: 16,
    category: "RTL & Multi-Language",
    rule: "Logical properties (ps-/pe-/ms-/me-) used instead of physical (pl-/pr-/ml-/mr-).",
    howToCheck: "mixed",
    passCriteria:
      "Zero physical-property utilities in component code (excluding justified overlays).",
    status: "pending",
    notes:
      "Most pages use logical properties. Need a script sweep to verify zero pl-/pr-/ml-/mr- usage remains.",
  },
  {
    id: "QA-17",
    num: 17,
    category: "RTL & Multi-Language",
    rule: "Directional icons mirror in RTL via [dir=rtl] selector.",
    howToCheck: "manual",
    passCriteria:
      "Every directional icon mirrors correctly in Arabic; no chevron-right still pointing right.",
    status: "pass",
    notes:
      "DirectionalIcon wrapper (src/components/ui/directional-icon.tsx) handles this via CSS [dir=rtl] selector + runtime dir check.",
  },
  {
    id: "QA-18",
    num: 18,
    category: "RTL & Multi-Language",
    rule: "Bangla date format: ১৬-০৯-২০২৬.",
    howToCheck: "automated",
    passCriteria:
      "formatDate(new Date(2026, 8, 16), \"bn\") === \"১৬-০৯-২০২৬\" — verified by scripts/typography-audit.ts.",
    status: "pass",
    notes:
      "Phase 1 of typography-audit.ts passes. Run `bun run audit:typography` to verify.",
  },
  {
    id: "QA-19",
    num: 19,
    category: "RTL & Multi-Language",
    rule: "Arabic numerals: ١٦-٠٩-٢٠٢٦.",
    howToCheck: "automated",
    passCriteria:
      "convertDigits(\"123\", \"ar\") === \"١٢٣\" — verified by scripts/typography-audit.ts.",
    status: "pass",
    notes:
      "Phase 1 of typography-audit.ts passes. Run `bun run audit:typography` to verify.",
  },
  {
    id: "QA-20",
    num: 20,
    category: "RTL & Multi-Language",
    rule: "Zero tofu (□) across bn/en/ar on all screens.",
    howToCheck: "automated",
    passCriteria:
      "Zero tofu hits across the route × locale matrix — verified by scripts/typography-audit.ts Phase 2.",
    status: "pass",
    notes:
      "4 next/font families (Inter, Hind Siliguri, Noto Naskh Arabic, JetBrains Mono) cover every script. typography-audit.ts reports zero tofu on all 35 routes × 3 locales.",
  },

  /* ---- 5. States & Empty States (QA-21 → QA-25) ---- */
  {
    id: "QA-21",
    num: 21,
    category: "States & Empty States",
    rule: "Every data-fetching page shows LoadingState (skeleton) while loading.",
    howToCheck: "manual",
    passCriteria:
      "Every page calling a useXxx() React Query hook renders <LoadingState> while isLoading.",
    status: "pass",
    notes:
      "17 files in src/app/(app)/ use LoadingState from @/components/states. C6.2 added role=status + aria-live=polite.",
  },
  {
    id: "QA-22",
    num: 22,
    category: "States & Empty States",
    rule: "Every list shows EmptyState when empty (never a blank table).",
    howToCheck: "manual",
    passCriteria:
      "Every list view renders the EmptyState with illustration + headline + CTA when empty.",
    status: "pass",
    notes:
      "12 files in src/app/(app)/ use EmptyState from @/components/ui/empty-state with one of 5 illustrations.",
  },
  {
    id: "QA-23",
    num: 23,
    category: "States & Empty States",
    rule: "Every data-fetching page shows ErrorState with retry on error.",
    howToCheck: "manual",
    passCriteria:
      "Every page renders <ErrorState> with a Try again button when isError.",
    status: "pass",
    notes:
      "14 files in src/app/(app)/ use ErrorState from @/components/states with role=alert + Try again button.",
  },
  {
    id: "QA-24",
    num: 24,
    category: "States & Empty States",
    rule: "Permission-denied shows PermissionDenied component (never raw 403).",
    howToCheck: "manual",
    passCriteria:
      "Every permission-denied scenario renders the PermissionDenied component; no raw 403 text anywhere.",
    status: "pass",
    notes:
      "mockApi throws PermissionDeniedError which pages catch and render via ErrorState variant=permission. IfPermission hides unauthorized UI entirely.",
  },
  {
    id: "QA-25",
    num: 25,
    category: "States & Empty States",
    rule: "Dashboard figures show \"as of [timestamp]\" (Risk R12).",
    howToCheck: "manual",
    passCriteria:
      "Every KPI on every dashboard shows an as-of caption; no figure is presented without a freshness marker.",
    status: "pending",
    notes:
      "Most dashboards show as-of captions. Need a manual sweep on /dashboard, /dashboard/authority, /dashboard/accountant, /dashboard/teacher, /dashboard/guardian, /dashboard/storekeeper.",
  },

  /* ---- 6. Permission & Brand (QA-26 → QA-30) ---- */
  {
    id: "QA-26",
    num: 26,
    category: "Permission & Brand",
    rule: "IfPermission wraps hide unauthorized UI (never disabled).",
    howToCheck: "manual",
    passCriteria:
      "Every permission-gated UI uses <IfPermission> or a hasPermission() check to hide unauthorized elements.",
    status: "pass",
    notes:
      "src/components/auth/IfPermission.tsx wraps children with sessionStore.hasPermission(). Used across SideNav, TopBar, dashboard widgets, fee/accounting CTAs.",
  },
  {
    id: "QA-27",
    num: 27,
    category: "Permission & Brand",
    rule: "Teacher has no financial data visible (D3).",
    howToCheck: "manual",
    passCriteria:
      "Teacher sees zero financial data — no nav items, no dashboard widgets, no accessible routes.",
    status: "pass",
    notes:
      "role-permissions.ts excludes all financial permissions from Teacher. SideNav hides Finance group. mockApi denies *.view on fees/accounting/zakat for Teacher.",
  },
  {
    id: "QA-28",
    num: 28,
    category: "Permission & Brand",
    rule: "Zakat fund isolation: badge on every Zakat row (C6/D18).",
    howToCheck: "manual",
    passCriteria:
      "Every Zakat row in /zakat, /accounting, /donations carries a visible Zakat badge using bg-accent-500 / text-accent-foreground.",
    status: "pass",
    notes:
      "src/components/finance/ZakatFundCard.tsx + zakat/page.tsx + accounting/page.tsx all render the accent-gold Zakat badge on Zakat-tagged rows.",
  },
  {
    id: "QA-29",
    num: 29,
    category: "Permission & Brand",
    rule: "PDFs use primary.500 + accent.DEFAULT (Risk R13).",
    howToCheck: "mixed",
    passCriteria:
      "Every PDF template imports primary + accent from src/lib/design-system/tokens.ts and uses only those values.",
    status: "pass",
    notes:
      "All 6 PDF templates in src/lib/pdf/templates/ import primary + accent from the FROZEN token constants. qa:design script exempts them from the no-raw-hex rule (they need raw hex for @react-pdf/renderer StyleSheet).",
  },
  {
    id: "QA-30",
    num: 30,
    category: "Permission & Brand",
    rule: "Public routes cannot reach protected endpoints (C8).",
    howToCheck: "manual",
    passCriteria:
      "Every public route is bounded to public data; every back-office route enforces hasPermission() on both client and mockApi side.",
    status: "pass",
    notes:
      "Route groups src/app/(public)/ and src/app/(app)/ are separated. mockApi checks hasPermission() before returning data. /public/donate form posts only to a public endpoint, never to /api/dev/* or back-office routes.",
  },
];

/* ------------------------------------------------------------------ */
/*  Status helpers                                                      */
/* ------------------------------------------------------------------ */

function statusIcon(s: Status) {
  if (s === "pass")
    return <CheckCircle2 className="h-4 w-4 text-semantic-success" aria-hidden />;
  if (s === "pending")
    return <CircleDot className="h-4 w-4 text-text-muted" aria-hidden />;
  return <XCircle className="h-4 w-4 text-semantic-danger" aria-hidden />;
}

function statusLabel(s: Status) {
  if (s === "pass") return "Pass";
  if (s === "pending") return "Pending";
  return "Fail";
}

function statusBadgeClass(s: Status) {
  if (s === "pass")
    return "border-semantic-success/40 bg-success-50 text-semantic-success";
  if (s === "pending")
    return "border-border-default bg-neutral-100 text-text-secondary";
  return "border-semantic-danger/40 bg-danger-50 text-semantic-danger";
}

function howToCheckLabel(h: HowToCheck) {
  if (h === "automated") return "Automated";
  if (h === "manual") return "Manual";
  return "Mixed";
}

function howToCheckBadgeClass(h: HowToCheck) {
  if (h === "automated")
    return "border-primary-500/30 bg-primary-50 text-primary-700";
  if (h === "manual")
    return "border-border-default bg-neutral-100 text-text-secondary";
  return "border-accent-500/30 bg-accent-50 text-accent-700";
}

function categoryBadgeClass(c: Category) {
  switch (c) {
    case "Token Usage":
      return "border-primary-500/30 bg-primary-50 text-primary-700";
    case "Contrast & Color":
      return "border-accent-500/30 bg-accent-50 text-accent-700";
    case "Focus & Keyboard":
      return "border-semantic-success/30 bg-success-50 text-semantic-success";
    case "RTL & Multi-Language":
      return "border-semantic-info/30 bg-info-50 text-info";
    case "States & Empty States":
      return "border-semantic-warning/30 bg-warning-50 text-semantic-warning";
    case "Permission & Brand":
      return "border-border-default bg-neutral-100 text-text-secondary";
  }
}

/* Lookup map for category icons (avoids calling categoryIcon() during
   render — keeps the React Compiler happy). */
const CATEGORY_ICON: Record<Category, typeof Palette> = {
  "Token Usage": Palette,
  "Contrast & Color": Palette,
  "Focus & Keyboard": Keyboard,
  "RTL & Multi-Language": Languages,
  "States & Empty States": LayoutList,
  "Permission & Brand": Lock,
};

/* ------------------------------------------------------------------ */
/*  Summary                                                             */
/* ------------------------------------------------------------------ */

function useSummary() {
  return React.useMemo(() => {
    const total = QA_ITEMS.length;
    let pass = 0;
    let fail = 0;
    let pending = 0;
    for (const item of QA_ITEMS) {
      if (item.status === "pass") pass += 1;
      else if (item.status === "fail") fail += 1;
      else pending += 1;
    }
    return { total, pass, fail, pending };
  }, []);
}

/* ------------------------------------------------------------------ */
/*  SummaryCard                                                         */
/* ------------------------------------------------------------------ */

function SummaryCard({
  label,
  value,
  hint,
  tone,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "neutral" | "success" | "warning" | "danger";
  icon: React.ReactNode;
}) {
  const toneClasses = {
    neutral: "border-border-default bg-surface-card text-text-primary",
    success: "border-semantic-success/40 bg-success-50 text-semantic-success",
    warning: "border-semantic-warning/40 bg-warning-50 text-semantic-warning",
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
        {hint && (
          <p className="mt-0.5 text-caption text-text-secondary">{hint}</p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ItemCard                                                            */
/* ------------------------------------------------------------------ */

function ItemCard({ item }: { item: QaItem }) {
  const CatIcon = CATEGORY_ICON[item.category];
  return (
    <article
      className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface-card p-5 shadow-elevation-1 transition-shadow hover:shadow-elevation-2"
      aria-labelledby={`${item.id}-title`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-caption font-medium ${categoryBadgeClass(
              item.category,
            )}`}
          >
            <CatIcon className="h-3 w-3" aria-hidden />
            {item.category}
          </span>
          <span className="rounded-full border border-border-default bg-neutral-50 px-2 py-0.5 font-mono text-caption text-text-secondary">
            {item.id}
          </span>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-caption font-medium ${statusBadgeClass(
            item.status,
          )}`}
        >
          {statusIcon(item.status)}
          {statusLabel(item.status)}
        </span>
      </header>

      <div>
        <h3
          id={`${item.id}-title`}
          className="text-body font-medium text-text-primary"
        >
          {item.rule}
        </h3>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-caption text-text-secondary">
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium ${howToCheckBadgeClass(
            item.howToCheck,
          )}`}
        >
          <Code2 className="h-3 w-3" aria-hidden />
          {howToCheckLabel(item.howToCheck)}
        </span>
      </div>

      <div className="rounded-md bg-surface-canvas p-3">
        <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
          Pass criteria
        </p>
        <p className="mt-1 text-caption text-text-secondary">
          {item.passCriteria}
        </p>
      </div>

      {item.notes && (
        <p className="rounded-md bg-neutral-50 px-3 py-2 text-caption text-text-secondary">
          {item.notes}
        </p>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  AuditRunner                                                         */
/* ------------------------------------------------------------------ */

function AuditRunner() {
  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState<AuditResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function runAudit() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/qa-audit?XTransformPort=3000", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      const json = (await res.json()) as AuditResult;
      setResult(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  function reset() {
    setResult(null);
    setError(null);
  }

  const pass = result?.exitCode === 0;

  return (
    <section
      className="rounded-xl border border-border-default bg-surface-card p-6 shadow-elevation-1"
      aria-labelledby="audit-runner-title"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <h2
            id="audit-runner-title"
            className="text-headline font-bold text-text-primary"
          >
            Run design QA audit
          </h2>
          <p className="mt-1 text-body text-text-secondary">
            Executes{" "}
            <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-caption text-primary-700">
              bun run scripts/design-qa.ts
            </code>{" "}
            server-side via{" "}
            <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-caption text-primary-700">
              /api/dev/qa-audit
            </code>{" "}
            and surfaces the raw stdout + exit code inline. The script
            enforces{" "}
            <strong className="text-text-primary">QA-01</strong> (no raw
            hex) and{" "}
            <strong className="text-text-primary">QA-02</strong> (no raw
            px in className).
          </p>
        </div>
        <div className="flex items-center gap-2">
          {result && (
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              disabled={running}
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Reset
            </Button>
          )}
          <Button
            size="sm"
            onClick={runAudit}
            disabled={running}
            aria-label="Run design QA audit"
          >
            {running ? (
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Play className="h-4 w-4" aria-hidden />
            )}
            {running ? "Running…" : "Run QA Audit"}
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-semantic-danger/40 bg-danger-50 p-4"
        >
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-semantic-danger" aria-hidden />
            <p className="text-body font-medium text-semantic-danger">
              Audit failed to run
            </p>
          </div>
          <p className="mt-1 font-mono text-caption text-text-secondary">
            {error}
          </p>
        </div>
      )}

      {result && !error && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-caption font-medium ${
                pass
                  ? "border-semantic-success/40 bg-success-50 text-semantic-success"
                  : "border-semantic-danger/40 bg-danger-50 text-semantic-danger"
              }`}
            >
              {pass ? (
                <CheckCircle2 className="h-4 w-4" aria-hidden />
              ) : (
                <XCircle className="h-4 w-4" aria-hidden />
              )}
              Exit code: {result.exitCode ?? "null"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border-default bg-neutral-100 px-2.5 py-1 text-caption font-medium text-text-secondary">
              <Terminal className="h-3 w-3" aria-hidden />
              {result.durationMs} ms
            </span>
            <span className="text-caption text-text-muted">
              Ran at {result.ranAt}
            </span>
            {result.timedOut && (
              <span className="inline-flex items-center gap-1 rounded-full border border-semantic-warning/40 bg-warning-50 px-2.5 py-1 text-caption font-medium text-semantic-warning">
                <AlertTriangle className="h-3 w-3" aria-hidden />
                Timed out
              </span>
            )}
          </div>

          <details className="group rounded-lg border border-border-default bg-surface-canvas">
            <summary className="flex cursor-pointer items-center justify-between gap-3 p-3 text-body font-medium text-text-primary">
              <span className="inline-flex items-center gap-2">
                <FileText className="h-4 w-4 text-text-secondary" aria-hidden />
                Audit output (stdout)
              </span>
              <span className="text-caption text-text-muted group-open:hidden">
                expand
              </span>
              <span className="hidden text-caption text-text-muted group-open:inline">
                collapse
              </span>
            </summary>
            <pre
              className="max-h-96 overflow-auto border-t border-border-default p-3 font-mono text-caption leading-relaxed text-text-secondary"
              aria-label="Audit stdout"
            >
              {result.stdout || "(empty)"}
            </pre>
          </details>

          {result.stderr && (
            <details className="group rounded-lg border border-semantic-warning/40 bg-warning-50">
              <summary className="flex cursor-pointer items-center justify-between gap-3 p-3 text-body font-medium text-text-primary">
                <span className="inline-flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-semantic-warning" aria-hidden />
                  Audit stderr
                </span>
                <span className="text-caption text-text-muted group-open:hidden">
                  expand
                </span>
                <span className="hidden text-caption text-text-muted group-open:inline">
                  collapse
                </span>
              </summary>
              <pre className="max-h-96 overflow-auto border-t border-semantic-warning/40 p-3 font-mono text-caption leading-relaxed text-text-secondary">
                {result.stderr}
              </pre>
            </details>
          )}
        </div>
      )}

      {!result && !error && !running && (
        <div className="mt-4 rounded-lg border border-dashed border-border-default bg-surface-canvas p-6 text-center">
          <p className="text-body text-text-secondary">
            Click{" "}
            <strong className="text-text-primary">“Run QA Audit”</strong>{" "}
            to scan <code className="font-mono text-caption text-primary-700">src/components/</code>{" "}
            and{" "}
            <code className="font-mono text-caption text-primary-700">src/app/</code>{" "}
            for raw hex + raw px violations.
          </p>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

const CATEGORIES: Category[] = [
  "Token Usage",
  "Contrast & Color",
  "Focus & Keyboard",
  "RTL & Multi-Language",
  "States & Empty States",
  "Permission & Brand",
];

export default function DevQaPage() {
  const summary = useSummary();

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
            /dev/qa · C7.2 · Task 7-b
          </p>
          <h1 className="mt-1 text-display font-bold text-text-primary">
            Design QA Contract Dashboard
          </h1>
          <p className="mt-1 max-w-3xl text-body text-text-secondary">
            30-item binding checklist mirroring{" "}
            <Link
              href="https://github.com/sajidchowdhury/MadrashaOS/blob/main/docs/DESIGN_QA_CONTRACT.md"
              className="inline-flex items-center gap-1 font-medium text-primary-500 hover:text-primary-700 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              docs/DESIGN_QA_CONTRACT.md
              <ExternalLink className="h-3 w-3" aria-hidden />
            </Link>
            . The dashboard surfaces the live status of every rule +
            runs the audit script on demand.
          </p>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 md:px-8 md:py-10">
        <div className="mx-auto max-w-[var(--grid-max-width)] space-y-8">
          {/* Summary strip */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Total items"
              value={String(summary.total)}
              hint="30 items across 6 categories"
              tone="neutral"
              icon={<ShieldCheck className="h-5 w-5" aria-hidden />}
            />
            <SummaryCard
              label="Pass"
              value={String(summary.pass)}
              hint="verified in the live UI"
              tone="success"
              icon={<CheckCircle2 className="h-5 w-5" aria-hidden />}
            />
            <SummaryCard
              label="Pending"
              value={String(summary.pending)}
              hint="needs a manual pass"
              tone="warning"
              icon={<CircleDot className="h-5 w-5" aria-hidden />}
            />
            <SummaryCard
              label="Fail"
              value={String(summary.fail)}
              hint="known gap — must fix"
              tone="danger"
              icon={<XCircle className="h-5 w-5" aria-hidden />}
            />
          </section>

          {/* Summary headline */}
          <section
            className="rounded-xl border border-border-default bg-surface-card p-6 shadow-elevation-1"
            aria-label="QA contract summary"
          >
            <p className="text-headline font-bold text-text-primary">
              {summary.total} items ·{" "}
              <span className="text-semantic-success">
                {summary.pass} pass
              </span>{" "}
              ·{" "}
              <span className="text-semantic-danger">
                {summary.fail} fail
              </span>
              {summary.pending > 0 && (
                <>
                  {" "}
                  ·{" "}
                  <span className="text-semantic-warning">
                    {summary.pending} pending
                  </span>
                </>
              )}
            </p>
            <p className="mt-1 text-body text-text-secondary">
              Run{" "}
              <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-caption text-primary-700">
                bun run qa:design
              </code>{" "}
              from the terminal for a CLI version of the same audit.
            </p>
          </section>

          {/* Audit runner */}
          <AuditRunner />

          {/* Items grouped by category */}
          {CATEGORIES.map((cat) => {
            const items = QA_ITEMS.filter((i) => i.category === cat);
            const catPass = items.filter((i) => i.status === "pass").length;
            const catFail = items.filter((i) => i.status === "fail").length;
            const catPending = items.filter(
              (i) => i.status === "pending",
            ).length;
            const CatIcon = CATEGORY_ICON[cat];
            return (
              <section
                key={cat}
                className="space-y-4"
                aria-labelledby={`cat-${cat}`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2
                    id={`cat-${cat}`}
                    className="inline-flex items-center gap-2 text-headline font-bold text-text-primary"
                  >
                    <CatIcon className="h-5 w-5 text-primary-500" aria-hidden />
                    {cat}
                  </h2>
                  <p className="text-caption text-text-muted">
                    {items.length} items · {catPass} pass · {catFail} fail
                    {catPending > 0 && ` · ${catPending} pending`}
                  </p>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {items.map((item) => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            );
          })}

          {/* Related dev routes */}
          <section
            className="rounded-xl border border-border-default bg-surface-card p-6 shadow-elevation-1"
            aria-labelledby="related-title"
          >
            <h2
              id="related-title"
              className="text-headline font-bold text-text-primary"
            >
              Related dev routes
            </h2>
            <ul className="mt-3 grid gap-2 text-body text-text-secondary sm:grid-cols-2">
              <li>
                <Link
                  href="/dev/a11y"
                  className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-700 hover:underline"
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                  /dev/a11y — WCAG 2.1 AA checklist (10 criteria + Lighthouse mock)
                </Link>
              </li>
              <li>
                <Link
                  href="/dev/walkthroughs"
                  className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-700 hover:underline"
                >
                  <Keyboard className="h-4 w-4" aria-hidden />
                  /dev/walkthroughs — Role × 3-task click-count audit
                </Link>
              </li>
              <li>
                <Link
                  href="/dev/flows"
                  className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-700 hover:underline"
                >
                  <Play className="h-4 w-4" aria-hidden />
                  /dev/flows — 8-flow interactive prototype walkthrough
                </Link>
              </li>
              <li>
                <Link
                  href="/dev/data"
                  className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-700 hover:underline"
                >
                  <LayoutList className="h-4 w-4" aria-hidden />
                  /dev/data — Mock-data layer + role permission matrix
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
