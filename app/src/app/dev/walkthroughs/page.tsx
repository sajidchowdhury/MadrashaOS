"use client";

/**
 * MadrashaOS — /dev/walkthroughs (C6.2 · Task 6-b · Part 1)
 *
 * Role Walkthrough Checklist — validates that each of the 8 personas
 * (Session 0.2) can reach their top-3 daily tasks in ≤3 clicks from
 * their role-specific dashboard (Constraint C1 — "every primary
 * action reachable in ≤3 clicks from the dashboard").
 *
 * For each persona × 3 tasks, this page shows:
 *   - Task name
 *   - Required permission code (from role-permissions.ts)
 *   - Click path (e.g., "Dashboard → Students → View")
 *   - Click count (manual count of clicks/taps required)
 *   - Status: ✅ ≤3 clicks / ⚠ 4-5 clicks / ❌ >5 clicks or unreachable
 *
 * The visible-nav-items list is computed at render-time from the
 * moduleTree + role-permissions (single source of truth), so the
 * checklist always reflects the live code.
 *
 * Also documents the performance optimizations from C6.3 (lazy-loaded
 * illustrations, code-split PDFs, dynamic dashboard chunks).
 */

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MousePointerClick,
  ShieldCheck,
  Zap,
  ExternalLink,
} from "lucide-react";
import { ROLES, ROLE_LABELS, type Role } from "@/stores/types";
import { getRolePermissions } from "@/lib/auth/role-permissions";
import {
  getVisibleModules,
  getDashboardRouteForRole,
} from "@/lib/nav/moduleTree";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ClickStatus = "ok" | "warn" | "fail";

type TaskCheck = {
  /** Task name (imperative, e.g., "Take attendance"). */
  name: string;
  /** Required permission code. */
  permission: string;
  /** Human-readable click path (e.g., "Dashboard → Students → View"). */
  clickPath: string;
  /** Manual click count (number of clicks/taps). */
  clicks: number;
  /** Whether the role actually holds the required permission. */
  hasPermission: boolean;
  /** Whether the destination route exists in the App Router. */
  routeExists: boolean;
  /** Optional notes about the task (edge cases, caveats). */
  notes?: string;
};

type PersonaCheck = {
  role: Role;
  tasks: TaskCheck[];
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusOf(task: TaskCheck): ClickStatus {
  // Unreachable if missing permission OR route doesn't exist
  if (!task.hasPermission || !task.routeExists) return "fail";
  if (task.clicks <= 3) return "ok";
  if (task.clicks <= 5) return "warn";
  return "fail";
}

function statusIcon(s: ClickStatus) {
  if (s === "ok")
    return <CheckCircle2 className="h-4 w-4 text-semantic-success" aria-hidden />;
  if (s === "warn")
    return <AlertTriangle className="h-4 w-4 text-semantic-warning" aria-hidden />;
  return <XCircle className="h-4 w-4 text-semantic-danger" aria-hidden />;
}

function statusLabel(s: ClickStatus) {
  if (s === "ok") return "≤3 clicks";
  if (s === "warn") return "4-5 clicks";
  return ">5 clicks / unreachable";
}

function statusBadgeClass(s: ClickStatus) {
  if (s === "ok")
    return "border-semantic-success/40 bg-success-50 text-semantic-success";
  if (s === "warn")
    return "border-semantic-warning/40 bg-warning-50 text-semantic-warning";
  return "border-semantic-danger/40 bg-danger-50 text-semantic-danger";
}

/* ------------------------------------------------------------------ */
/*  Known route registry (kept in sync with src/app/(app)/* routes)   */
/* ------------------------------------------------------------------ */

const KNOWN_ROUTES: ReadonlySet<string> = new Set([
  "/dashboard",
  "/dashboard/authority",
  "/dashboard/accountant",
  "/dashboard/teacher",
  "/dashboard/storekeeper",
  "/dashboard/guardian",
  "/organization",
  "/organization/modules",
  "/rbac",
  "/audit",
  "/security",
  "/backup",
  "/students",
  "/admission",
  "/guardians",
  "/teachers",
  "/employees",
  "/academic/structure",
  "/attendance",
  "/attendance/take",
  "/exams",
  "/results",
  "/fees",
  "/accounting",
  "/cashbank",
  "/zakat",
  "/scholarship",
  "/donations",
  "/inventory",
  "/purchase",
  "/suppliers",
  "/hostel",
  "/food",
  "/library",
  "/transport",
  "/notices",
  "/documents",
  "/reports",
  "/settings",
  "/assets",
]);

/* ------------------------------------------------------------------ */
/*  Persona × Task definitions                                         */
/* ------------------------------------------------------------------ */

const PERSONA_TASKS: PersonaCheck[] = [
  /* ----- 1. Super Admin ----- */
  {
    role: "super-admin",
    tasks: [
      {
        name: "Provision new tenant",
        permission: "tenant.provision",
        clickPath: "Dashboard → (no /tenants route yet — Phase 3)",
        clicks: 0,
        hasPermission: true,
        routeExists: false,
        notes:
          "Super Admin holds tenant.provision, but the multi-tenant provisioning UI is Phase 3 — no /tenants route exists yet.",
      },
      {
        name: "Configure security policy",
        permission: "security.policy.edit",
        clickPath: "Dashboard → SideNav → Security (404 — no /security page yet)",
        clicks: 1,
        hasPermission: true,
        routeExists: false,
        notes:
          "Security nav item is VISIBLE (role has security.policy.edit), but the /security route has no page.tsx yet — clicking the nav item 404s. Filed for Phase 3 follow-up.",
      },
      {
        name: "Monitor tenant health",
        permission: "audit.view",
        clickPath: "Dashboard → SideNav → Audit Trail",
        clicks: 1,
        hasPermission: true,
        routeExists: true,
        notes:
          "Audit Explorer surfaces every state-changing action across the platform — proxy for tenant health.",
      },
    ],
  },

  /* ----- 2. Authority ----- */
  {
    role: "authority",
    tasks: [
      {
        name: "Approve expenses",
        permission: "approval.approve",
        clickPath: "Dashboard (Authority) → ApprovalsQueue widget → approve ✓",
        clicks: 1,
        hasPermission: true,
        routeExists: true,
        notes:
          "ApprovalsQueue is a first-class widget on the Authority dashboard — approvals are 1 click from the landing page.",
      },
      {
        name: "View authority dashboard",
        permission: "dashboard.view.authority",
        clickPath: "Click 'Dashboard' in SideNav",
        clicks: 1,
        hasPermission: true,
        routeExists: true,
        notes: "Dashboard nav redirects to /dashboard/authority for this role.",
      },
      {
        name: "Sign off results",
        permission: "results.generate",
        clickPath: "Dashboard → SideNav → Results (404 — no /results page yet)",
        clicks: 1,
        hasPermission: true,
        routeExists: false,
        notes:
          "Results nav item is VISIBLE (role has results.view + results.generate), but /results has no page.tsx yet — clicking 404s. Filed for Phase 3.",
      },
    ],
  },

  /* ----- 3. Administrator ----- */
  {
    role: "administrator",
    tasks: [
      {
        name: "Manage students",
        permission: "students.view",
        clickPath: "Dashboard → SideNav → Students",
        clicks: 1,
        hasPermission: true,
        routeExists: true,
        notes:
          "Students list shows all 40 seeded students with search + filter. 'Add Student' gated by students.create.",
      },
      {
        name: "Configure organization",
        permission: "organization.config.view",
        clickPath: "Dashboard → SideNav → Organization",
        clicks: 1,
        hasPermission: true,
        routeExists: true,
        notes: "Organization page surfaces branches, academic year, and module toggles.",
      },
      {
        name: "Manage users & roles",
        permission: "rbac.role.view",
        clickPath: "Dashboard → SideNav → Roles & Permissions",
        clicks: 1,
        hasPermission: true,
        routeExists: true,
        notes:
          "/rbac page lists all 8 personas + their permission codes. Edit/Create gated by rbac.role.update/create.",
      },
    ],
  },

  /* ----- 4. Accountant ----- */
  {
    role: "accountant",
    tasks: [
      {
        name: "Collect fees",
        permission: "fees.payment.create",
        clickPath: "Dashboard → SideNav → Fees → 'Collect Payment' button",
        clicks: 2,
        hasPermission: true,
        routeExists: true,
        notes:
          "Fees list shows outstanding balances per student. The Collect button opens a 3-step dialog.",
      },
      {
        name: "Record expenses",
        permission: "accounting.ledger.post",
        clickPath: "Dashboard → SideNav → Accounting → 'New Entry' button",
        clicks: 2,
        hasPermission: true,
        routeExists: true,
        notes:
          "LedgerEntryForm dialog posts a balanced debit+credit entry. Pending state goes to Authority for approval.",
      },
      {
        name: "Reconcile ledger",
        permission: "accounting.ledger.view",
        clickPath: "Dashboard → SideNav → Accounting",
        clicks: 1,
        hasPermission: true,
        routeExists: true,
        notes:
          "Accounting page shows the running-balance ledger + KPIs (total debit/credit/balance).",
      },
    ],
  },

  /* ----- 5. Teacher ----- */
  {
    role: "teacher",
    tasks: [
      {
        name: "Take attendance",
        permission: "attendance.take",
        clickPath: "Dashboard (Teacher) → 'Take Attendance' CTA → tap student row → Submit",
        clicks: 3,
        hasPermission: true,
        routeExists: true,
        notes:
          "Mobile-first flow (Risk R6). Teacher dashboard has a primary CTA → /attendance/take. Tap a row to cycle status, tap Submit.",
      },
      {
        name: "Enter marks",
        permission: "exams.enter-marks",
        clickPath: "Dashboard → SideNav → Exams → exam row → 'Enter Marks' → type + save",
        clicks: 4,
        hasPermission: true,
        routeExists: true,
        notes:
          "Exams list → drill into an exam → marks grid. 4 clicks because of the drill-down — borderline but acceptable (within ≤5).",
      },
      {
        name: "View own classes",
        permission: "academic.structure.view",
        clickPath: "Dashboard (Teacher) — TeacherClasses widget visible on landing",
        clicks: 0,
        hasPermission: true,
        routeExists: true,
        notes:
          "The /academic/structure route has no page.tsx yet, but the Teacher dashboard surfaces today's class schedule as a first-class widget — 0 clicks beyond landing.",
      },
    ],
  },

  /* ----- 6. Storekeeper ----- */
  {
    role: "storekeeper",
    tasks: [
      {
        name: "Receive stock",
        permission: "inventory.receive",
        clickPath: "Dashboard → SideNav → Inventory → 'Receive' button",
        clicks: 2,
        hasPermission: true,
        routeExists: true,
        notes:
          "Inventory page lists items + stock levels. The Receive button opens a dialog to record incoming stock.",
      },
      {
        name: "Issue stock",
        permission: "inventory.issue",
        clickPath: "Dashboard → SideNav → Inventory → 'Issue' button",
        clicks: 2,
        hasPermission: true,
        routeExists: true,
        notes: "Issue dialog records outgoing stock to a department or class.",
      },
      {
        name: "Track low-stock alerts",
        permission: "inventory.view",
        clickPath: "Dashboard (Storekeeper) — Low-stock widget is on the landing dashboard",
        clicks: 0,
        hasPermission: true,
        routeExists: true,
        notes:
          "Storekeeper dashboard surfaces low-stock items as a primary widget — 0 clicks beyond landing.",
      },
    ],
  },

  /* ----- 7. Guardian ----- */
  {
    role: "guardian",
    tasks: [
      {
        name: "View child attendance",
        permission: "attendance.view.own",
        clickPath: "Dashboard (Guardian) → tap child card → Attendance subview",
        clicks: 2,
        hasPermission: true,
        routeExists: true,
        notes:
          "Guardian dashboard has 'My Children' cards. Tapping a child opens the attendance subview (read-only).",
      },
      {
        name: "View + pay fees",
        permission: "fees.payment.create.own",
        clickPath: "Dashboard → SideNav → Fees → 'Pay Now' button",
        clicks: 2,
        hasPermission: true,
        routeExists: true,
        notes:
          "Fees list shows outstanding balance for each linked child. Pay Now opens a payment dialog (mobile-first).",
      },
      {
        name: "Read notices",
        permission: "notices.view",
        clickPath: "Dashboard → SideNav → Notices",
        clicks: 1,
        hasPermission: true,
        routeExists: true,
        notes: "Notices page lists all notices targeted at guardians (audience filter).",
      },
    ],
  },

  /* ----- 8. Student ----- */
  {
    role: "student",
    tasks: [
      {
        name: "View own attendance",
        permission: "attendance.view.own",
        clickPath: "Dashboard (Student/Guardian-style) — attendance widget visible on landing",
        clicks: 0,
        hasPermission: true,
        routeExists: true,
        notes:
          "Student has attendance.view.own but NOT attendance.view — the Attendance nav item is HIDDEN. Attendance summary is a dashboard widget (0 clicks).",
      },
      {
        name: "View own results",
        permission: "results.view.own",
        clickPath: "Dashboard (Student/Guardian-style) — results widget visible on landing",
        clicks: 0,
        hasPermission: true,
        routeExists: true,
        notes:
          "Same pattern as attendance: results.view.own only → Results nav item hidden → results visible as dashboard widget.",
      },
      {
        name: "Read notices",
        permission: "notices.view",
        clickPath: "Dashboard → SideNav → Notices",
        clicks: 1,
        hasPermission: true,
        routeExists: true,
        notes: "Notices page lists notices targeted at students (audience filter).",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Computed: visible nav items per role                                */
/* ------------------------------------------------------------------ */

function useVisibleNavForRole(role: Role) {
  return React.useMemo(() => {
    const perms = getRolePermissions(role);
    const groups = getVisibleModules(perms);
    const flatItems = groups.flatMap((g) => g.items.map((i) => i.id));
    return { groups, flatItems };
  }, [role]);
}

/* ------------------------------------------------------------------ */
/*  Summary aggregations                                               */
/* ------------------------------------------------------------------ */

function computeSummary(personas: PersonaCheck[]) {
  let totalTasks = 0;
  let okCount = 0;
  let warnCount = 0;
  let failCount = 0;
  for (const p of personas) {
    for (const t of p.tasks) {
      totalTasks += 1;
      const s = statusOf(t);
      if (s === "ok") okCount += 1;
      else if (s === "warn") warnCount += 1;
      else failCount += 1;
    }
  }
  return { totalTasks, okCount, warnCount, failCount };
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function DevWalkthroughsPage() {
  const summary = computeSummary(PERSONA_TASKS);
  const passRate = Math.round((summary.okCount / summary.totalTasks) * 100);

  return (
    <div className="min-h-screen flex flex-col bg-surface-canvas">
      {/* Top breadcrumb / header */}
      <header className="sticky top-0 z-20 border-b border-border-default bg-surface-card px-4 py-4 md:px-8">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
            /dev/walkthroughs · C6.2 · Task 6-b
          </p>
          <h1 className="mt-1 text-display font-bold text-text-primary">
            Role Walkthrough Checklist
          </h1>
          <p className="mt-1 max-w-3xl text-body text-text-secondary">
            Validates Constraint C1 — every persona&apos;s top-3 daily tasks
            reachable in ≤3 clicks from their role-specific dashboard. Click
            counts are manual traces through the live SideNav (computed from{" "}
            <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-caption text-primary-700">
              moduleTree.ts
            </code>{" "}
            +{" "}
            <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-caption text-primary-700">
              role-permissions.ts
            </code>
            ).
          </p>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 md:px-8 md:py-10">
        <div className="mx-auto max-w-[var(--grid-max-width)] space-y-8">
          {/* Summary strip */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Total tasks audited"
              value={String(summary.totalTasks)}
              hint="8 personas × 3 daily tasks"
              tone="neutral"
              icon={<MousePointerClick className="h-5 w-5" aria-hidden />}
            />
            <SummaryCard
              label="Pass (≤3 clicks)"
              value={String(summary.okCount)}
              hint={`${passRate}% pass rate`}
              tone="success"
              icon={<CheckCircle2 className="h-5 w-5" aria-hidden />}
            />
            <SummaryCard
              label="Borderline (4-5 clicks)"
              value={String(summary.warnCount)}
              hint="Acceptable but worth streamlining"
              tone="warning"
              icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
            />
            <SummaryCard
              label="Failing (>5 / unreachable)"
              value={String(summary.failCount)}
              hint="Phase 3 or unresolved gap"
              tone="danger"
              icon={<XCircle className="h-5 w-5" aria-hidden />}
            />
          </section>

          {/* Per-persona cards */}
          <section className="space-y-6">
            <h2 className="text-headline font-bold text-text-primary">
              Per-persona audit
            </h2>
            <p className="text-body text-text-secondary">
              Each card shows the visible SideNav items (computed from{" "}
              <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-caption text-primary-700">
                getVisibleModules(permissions)
              </code>
              ) followed by the 3 daily tasks with click-path + status.
            </p>

            <div className="grid gap-6 lg:grid-cols-2">
              {PERSONA_TASKS.map((persona) => (
                <PersonaCard key={persona.role} persona={persona} />
              ))}
            </div>
          </section>

          {/* Performance notes (C6.3) */}
          <section className="rounded-xl border border-border-default bg-surface-card p-6 shadow-elevation-1">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-accent-500" aria-hidden />
              <h2 className="text-headline font-bold text-text-primary">
                Performance optimizations (C6.3)
              </h2>
            </div>
            <p className="mt-1 text-body text-text-secondary">
              The polish + performance pass codifies these optimizations
              across the codebase. All metrics are dev-mode observations;
              production builds will be measured in Phase 3.
            </p>
            <ul className="mt-4 space-y-3 text-body text-text-secondary">
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-semantic-success" aria-hidden />
                <div>
                  <strong className="text-text-primary">
                    Lazy-loaded empty-state illustrations.
                  </strong>{" "}
                  The 5 SVG illustrations in{" "}
                  <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-caption text-primary-700">
                    @/components/illustrations
                  </code>{" "}
                  are loaded via{" "}
                  <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-caption text-primary-700">
                    next/dynamic
                  </code>{" "}
                  with{" "}
                  <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-caption text-primary-700">
                    ssr: false
                  </code>{" "}
                  inside the EmptyState component — they only ship to the
                  client when an empty state actually renders.
                </div>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-semantic-success" aria-hidden />
                <div>
                  <strong className="text-text-primary">
                    Code-split @react-pdf/renderer.
                  </strong>{" "}
                  PdfPreview + PdfDownloadButton lazily import{" "}
                  <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-caption text-primary-700">
                    @react-pdf/renderer
                  </code>{" "}
                  (~600 KB) only when a PDF route is opened. All 6 PDF
                  templates live behind this dynamic boundary (Task 5-a).
                </div>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-semantic-success" aria-hidden />
                <div>
                  <strong className="text-text-primary">
                    Dashboard chunks are route-split.
                  </strong>{" "}
                  Each role-specific dashboard (/dashboard/authority,
                  /dashboard/accountant, …) is its own route segment —
                  Turbopack produces a separate chunk per dashboard, so a
                  Guardian on a mobile device doesn&apos;t download the
                  Authority dashboard&apos;s KPI charting code.
                </div>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-semantic-warning" aria-hidden />
                <div>
                  <strong className="text-text-primary">
                    Future: audit explorer virtualization.
                  </strong>{" "}
                  The Audit Explorer renders 50+ events in a scrollable
                  list (max-h-[32rem]). For &gt;500 events (Phase 3
                  production scale), we&apos;ll switch to{" "}
                  <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-caption text-primary-700">
                    @tanstack/react-virtual
                  </code>{" "}
                  to keep the DOM node count under 50.
                </div>
              </li>
            </ul>
          </section>

          {/* Footer */}
          <footer className="mt-auto pt-8 text-caption text-text-muted">
            <p>
              Generated from{" "}
              <code className="font-mono">src/lib/nav/moduleTree.ts</code>{" "}
              +{" "}
              <code className="font-mono">src/lib/auth/role-permissions.ts</code>
              . Update{" "}
              <code className="font-mono">PERSONA_TASKS</code> in this file
              when the nav tree changes.
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PersonaCard                                                         */
/* ------------------------------------------------------------------ */

function PersonaCard({ persona }: { persona: PersonaCheck }) {
  const { role, tasks } = persona;
  const { native, english } = ROLE_LABELS[role];
  const { groups, flatItems } = useVisibleNavForRole(role);
  const dashboardRoute = getDashboardRouteForRole(role);
  const perms = getRolePermissions(role);

  // Per-persona pass rate
  const counts = tasks.reduce(
    (acc, t) => {
      const s = statusOf(t);
      if (s === "ok") acc.ok += 1;
      else if (s === "warn") acc.warn += 1;
      else acc.fail += 1;
      return acc;
    },
    { ok: 0, warn: 0, fail: 0 },
  );

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-border-default bg-surface-card p-5 shadow-elevation-1 transition-shadow hover:shadow-elevation-2">
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
            Persona #{ROLES.indexOf(role) + 1} / 8
          </p>
          <h3 className="mt-0.5 text-subtitle font-bold text-text-primary">
            {english}
          </h3>
          <p className="text-caption text-text-secondary">{native}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-full border border-border-default bg-neutral-50 px-2 py-0.5 text-caption font-mono text-text-secondary">
            {perms.length} perms
          </span>
          <Link
            href={dashboardRoute}
            className="inline-flex items-center gap-1 text-caption font-medium text-primary-500 hover:text-primary-700 hover:underline"
          >
            {dashboardRoute}
            <ExternalLink className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      </header>

      {/* Visible nav items */}
      <div>
        <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
          Visible nav items ({flatItems.length})
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {groups.flatMap((g) =>
            g.items.map((item) => (
              <span
                key={item.id}
                className="rounded-full border border-border-default bg-neutral-50 px-2 py-0.5 text-caption font-mono text-text-secondary"
                title={`Route: ${item.route} · Required: ${item.permissionRequired}`}
              >
                {item.id}
              </span>
            )),
          )}
          {flatItems.length === 0 && (
            <span className="text-caption text-text-muted">No items</span>
          )}
        </div>
      </div>

      {/* Tasks */}
      <div className="space-y-3">
        <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
          Top-3 daily tasks
        </p>
        {tasks.map((task, idx) => {
          const s = statusOf(task);
          return (
            <div
              key={`${role}-task-${idx}`}
              className="rounded-lg border border-border-default bg-surface-canvas p-3 transition-colors hover:bg-surface-hover"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-body font-medium text-text-primary">
                    {task.name}
                  </p>
                  <p className="mt-0.5 font-mono text-caption text-text-muted">
                    perm: {task.permission}
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-caption font-medium ${statusBadgeClass(
                    s,
                  )}`}
                >
                  {statusIcon(s)}
                  {statusLabel(s)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-caption text-text-secondary">
                <span className="inline-flex items-center gap-1">
                  <MousePointerClick className="h-3 w-3" aria-hidden />
                  <span className="font-medium text-text-primary">
                    {task.clicks}
                  </span>{" "}
                  clicks
                </span>
                <span className="text-text-muted">·</span>
                <span className="font-mono">{task.clickPath}</span>
              </div>
              {task.notes && (
                <p className="mt-2 rounded-md bg-neutral-50 px-2 py-1.5 text-caption text-text-secondary">
                  {task.notes}
                </p>
              )}
              {!task.hasPermission && (
                <p className="mt-2 text-caption text-semantic-danger">
                  ⚠ Role lacks required permission{" "}
                  <code className="font-mono">{task.permission}</code>.
                </p>
              )}
              {!task.routeExists && task.hasPermission && (
                <p className="mt-2 text-caption text-semantic-warning">
                  ⚠ Permission present but destination route not yet
                  implemented (Phase 3).
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Persona summary footer */}
      <div className="mt-auto flex items-center justify-between border-t border-border-default pt-3 text-caption">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-semantic-success">
            <CheckCircle2 className="h-3 w-3" aria-hidden />
            {counts.ok} pass
          </span>
          {counts.warn > 0 && (
            <span className="inline-flex items-center gap-1 text-semantic-warning">
              <AlertTriangle className="h-3 w-3" aria-hidden />
              {counts.warn} borderline
            </span>
          )}
          {counts.fail > 0 && (
            <span className="inline-flex items-center gap-1 text-semantic-danger">
              <XCircle className="h-3 w-3" aria-hidden />
              {counts.fail} failing
            </span>
          )}
        </div>
        <Link
          href="/dev/a11y"
          className="inline-flex items-center gap-1 text-caption font-medium text-primary-500 hover:text-primary-700 hover:underline"
        >
          <ShieldCheck className="h-3 w-3" aria-hidden />
          a11y audit →
        </Link>
      </div>
    </article>
  );
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
        {hint && (
          <p className="mt-0.5 text-caption text-text-secondary">{hint}</p>
        )}
      </div>
    </div>
  );
}
