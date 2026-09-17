/**
 * MadrashaOS — Interactive Flows Registry (C6.1 · Task 6-a)
 *
 * Defines the 8 end-to-end prototype flows used by /dev/flows + the
 * DevToolbar "Flow Walkthrough" mode. Each flow is a list of named steps
 * that the user manually performs in order, with the DevToolbar highlighting
 * the next CTA on each page.
 *
 * The flows are designed to cover the broadest cross-section of roles and
 * surfaces in the fewest clicks — exactly the 8 scenarios called out in
 * the Phase C6.1 brief:
 *
 *   1. Teacher → Take Attendance (mobile-first)
 *   2. Accountant → Collect Fee Payment (3-step dialog)
 *   3. Accountant → Record Expense → Authority approves (cross-role)
 *   4. Guardian → View Child Results (mobile, read-only)
 *   5. Authority → Approve Pending Request (ApprovalsQueue)
 *   6. Administrator → Admit a Student (drag-and-drop Kanban)
 *   7. Public Donation (anonymous visitor, no login)
 *   8. Any role → Dashboard redirect (role-aware landing)
 *
 * Per task rules: this file ONLY defines flows — it does not modify any
 * store, fixture, or i18n message. Consumers (the /dev/flows page + the
 * DevToolbar's Flows section) drive navigation and role switching via the
 * walkthrough store + sessionStore respectively.
 */

import type { Role } from "@/stores/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** A flow may target an authenticated role or "public" (anonymous). */
export type FlowRole = Role | "public";

export type FlowStep = {
  /** Short label shown in the progress indicator (e.g. "Take Attendance"). */
  label: string;
  /** Route to navigate to for this step (relative path). */
  route: string;
  /** Imperative description of what the user must do (e.g. "Tap Submit"). */
  action: string;
  /**
   * Optional CSS selector used by the FlowHighlighter to draw a pulsing
   * ring around the next CTA. Defaults to '[data-mobile-cta-target]'
   * (the convention used by the mobile-sticky action bar). Use a
   * specific selector for steps where the CTA is something other than
   * the primary action button (e.g. a roster row, a Kanban card).
   */
  targetSelector?: string;
  /**
   * If true, the walkthrough advances the route on "Next" but does NOT
   * try to highlight a CTA (useful for "switch role" steps that the user
   * performs in the DevToolbar).
   */
  manualOnly?: boolean;
};

export type FlowDef = {
  id: string;
  /** Human-readable flow name (shown on the flow card). */
  name: string;
  /** One-line description of what the flow proves. */
  description: string;
  /** Role required before starting (or "public" for anonymous flows). */
  role: FlowRole;
  /** Lucide icon name for the flow card. */
  icon:
    | "ClipboardCheck"
    | "Wallet"
    | "Calculator"
    | "GraduationCap"
    | "ShieldCheck"
    | "UserPlus"
    | "Heart"
    | "LayoutDashboard";
  /** Estimated number of user clicks to finish (drives the "≈ N clicks" badge). */
  estimatedClicks: number;
  /** Ordered steps. Step 0 is where the user lands after clicking Start. */
  steps: FlowStep[];
  /** Tags for grouping/filtering on the /dev/flows page. */
  tags: ("mobile" | "desktop" | "cross-role" | "public" | "drag-and-drop")[];
};

/* ------------------------------------------------------------------ */
/*  Flows                                                              */
/* ------------------------------------------------------------------ */

export const FLOWS: FlowDef[] = [
  /* ------------------------------------------------------------ */
  /*  Flow 1 — Teacher → Take Attendance                          */
  /* ------------------------------------------------------------ */
  {
    id: "flow-1-teacher-attendance",
    name: "Teacher takes attendance",
    description:
      "Switch to the Teacher role, open the dashboard, take attendance for Class 5-A and submit. Mobile-first flow (Risk R6).",
    role: "teacher",
    icon: "ClipboardCheck",
    estimatedClicks: 5,
    tags: ["mobile", "desktop"],
    steps: [
      {
        label: "Set role to Teacher",
        route: "/dashboard/teacher",
        action:
          "Use the DevToolbar role selector (bottom-right) to switch to Teacher, then click Next.",
        manualOnly: true,
      },
      {
        label: "Open Take Attendance",
        route: "/attendance/take",
        action: "Tap the primary 'Take Attendance' action on the dashboard or the sticky action bar.",
        targetSelector: "[data-mobile-cta-target]",
      },
      {
        label: "Mark a student present",
        route: "/attendance/take",
        action: "Tap any student row in the roster to cycle the status (Present → Absent → Late → Leave).",
        targetSelector: "[data-attendance-roster-row]",
      },
      {
        label: "Submit attendance",
        route: "/attendance/take",
        action: "Tap the 'Submit' button. A toast with a 30-second Undo window appears.",
        targetSelector: "[data-mobile-cta-target]",
      },
      {
        label: "Done — attendance submitted",
        route: "/attendance/take",
        action: "Verify the success banner shows the Present/Absent/Late counts.",
        manualOnly: true,
      },
    ],
  },

  /* ------------------------------------------------------------ */
  /*  Flow 2 — Accountant → Collect Fee Payment                    */
  /* ------------------------------------------------------------ */
  {
    id: "flow-2-accountant-collect-fee",
    name: "Accountant collects a fee payment",
    description:
      "Switch to the Accountant role, open the fees page, open the 3-step Collect Payment dialog and confirm.",
    role: "accountant",
    icon: "Wallet",
    estimatedClicks: 4,
    tags: ["desktop", "mobile"],
    steps: [
      {
        label: "Set role to Accountant",
        route: "/dashboard/accountant",
        action: "Use the DevToolbar role selector to switch to Accountant.",
        manualOnly: true,
      },
      {
        label: "Open Fees & Collection",
        route: "/fees",
        action: "Navigate to the Fees module from the sidebar (Finance group).",
        manualOnly: true,
      },
      {
        label: "Click Collect Payment",
        route: "/fees",
        action: "Tap the 'Collect Payment' button in the page header (or the per-row 'Collect' button).",
        targetSelector: "[data-mobile-cta-target]",
      },
      {
        label: "Confirm the 3-step dialog",
        route: "/fees",
        action: "Step through Student → Amount → Method → Confirm in the CollectPaymentDialog.",
        targetSelector: "[role='dialog'] [data-mobile-cta-target]",
      },
      {
        label: "Done — receipt printed",
        route: "/fees",
        action: "Verify the success toast and the new row in Recent Receipts.",
        manualOnly: true,
      },
    ],
  },

  /* ------------------------------------------------------------ */
  /*  Flow 3 — Accountant records expense → Authority approves     */
  /* ------------------------------------------------------------ */
  {
    id: "flow-3-expense-approval",
    name: "Accountant records expense → Authority approves",
    description:
      "Cross-role flow: Accountant posts a pending ledger entry, then switches to Authority and approves it via the ApprovalsQueue.",
    role: "accountant",
    icon: "Calculator",
    estimatedClicks: 7,
    tags: ["cross-role", "desktop"],
    steps: [
      {
        label: "Set role to Accountant",
        route: "/accounting",
        action: "Use the DevToolbar role selector to switch to Accountant.",
        manualOnly: true,
      },
      {
        label: "Open Accounting / Ledger",
        route: "/accounting",
        action: "Open the Ledger Explorer.",
        manualOnly: true,
      },
      {
        label: "Click New Entry",
        route: "/accounting",
        action: "Tap 'New Entry' in the page header to open the LedgerEntryForm dialog.",
        targetSelector: "[data-mobile-cta-target]",
      },
      {
        label: "Submit pending entry",
        route: "/accounting",
        action: "Fill the debit + credit lines, then save the entry as 'pending' (it appears in the ledger with a Pending badge).",
        targetSelector: "[role='dialog'] [data-mobile-cta-target]",
      },
      {
        label: "Switch role to Authority",
        route: "/dashboard/authority",
        action: "Use the DevToolbar role selector to switch to Authority. The pending entry now appears in the ApprovalsQueue.",
        manualOnly: true,
      },
      {
        label: "Approve the pending request",
        route: "/dashboard/authority",
        action: "Find the entry in the ApprovalsQueue widget and click the green approve checkmark.",
        targetSelector: "[data-approval-action='approve']",
      },
      {
        label: "Done — entry posted to ledger",
        route: "/dashboard/authority",
        action: "Verify the audit timeline shows the newly posted entry.",
        manualOnly: true,
      },
    ],
  },

  /* ------------------------------------------------------------ */
  /*  Flow 4 — Guardian → View Child Results                       */
  /* ------------------------------------------------------------ */
  {
    id: "flow-4-guardian-view-child",
    name: "Guardian views child results",
    description:
      "Switch to the Guardian role (mobile-first, read-only). Pick a child and view their attendance + results.",
    role: "guardian",
    icon: "GraduationCap",
    estimatedClicks: 4,
    tags: ["mobile"],
    steps: [
      {
        label: "Set role to Guardian",
        route: "/dashboard/guardian",
        action: "Use the DevToolbar role selector to switch to Guardian.",
        manualOnly: true,
      },
      {
        label: "Pick a child",
        route: "/dashboard/guardian",
        action: "Tap one of the children in the 'My Children' widget (or use the mobile segmented control at the top).",
        targetSelector: "[data-flow-target='guardian-child']",
      },
      {
        label: "View results tab",
        route: "/dashboard/guardian",
        action: "Open the child's results / attendance subview (read-only — no financial data per Do-Not-Do D3).",
        targetSelector: "[data-flow-target='child-results']",
      },
      {
        label: "Done — child results visible",
        route: "/dashboard/guardian",
        action: "Verify the latest results, attendance summary and notices are shown.",
        manualOnly: true,
      },
    ],
  },

  /* ------------------------------------------------------------ */
  /*  Flow 5 — Authority → Approve Pending Request                 */
  /* ------------------------------------------------------------ */
  {
    id: "flow-5-authority-approve",
    name: "Authority approves a pending request",
    description:
      "Switch to the Authority role, open the dashboard, find an item in the ApprovalsQueue and approve it.",
    role: "authority",
    icon: "ShieldCheck",
    estimatedClicks: 3,
    tags: ["desktop"],
    steps: [
      {
        label: "Set role to Authority",
        route: "/dashboard/authority",
        action: "Use the DevToolbar role selector to switch to Authority (Principal).",
        manualOnly: true,
      },
      {
        label: "Approve a pending request",
        route: "/dashboard/authority",
        action: "Find an item in the ApprovalsQueue widget and click the green approve checkmark.",
        targetSelector: "[data-approval-action='approve']",
      },
      {
        label: "Done — request approved",
        route: "/dashboard/authority",
        action: "Verify the audit timeline shows the approval and the queue shrinks by one.",
        manualOnly: true,
      },
    ],
  },

  /* ------------------------------------------------------------ */
  /*  Flow 6 — Administrator → Admit a Student                      */
  /* ------------------------------------------------------------ */
  {
    id: "flow-6-admin-admit-student",
    name: "Administrator admits a student",
    description:
      "Switch to the Administrator role, open the Admission Kanban, drag a card from Applied → Approved → Registered. Toast confirms the fee plan is created.",
    role: "administrator",
    icon: "UserPlus",
    estimatedClicks: 4,
    tags: ["drag-and-drop", "desktop"],
    steps: [
      {
        label: "Set role to Administrator",
        route: "/admission",
        action: "Use the DevToolbar role selector to switch to Administrator.",
        manualOnly: true,
      },
      {
        label: "Drag a card to Approved",
        route: "/admission",
        action: "Drag any applicant card from the Applied or Interviewed column into the Approved column. Requires the 'admission.approve' permission (Administrator has it).",
        targetSelector: "[data-flow-target='kanban-card']",
      },
      {
        label: "Drag the card to Registered",
        route: "/admission",
        action: "Drag the approved card into the Registered column. A success toast confirms the fee plan was created.",
        targetSelector: "[data-flow-target='kanban-card']",
      },
      {
        label: "Done — student registered",
        route: "/admission",
        action: "Verify the toast: 'Student registered — fee plan created'.",
        manualOnly: true,
      },
    ],
  },

  /* ------------------------------------------------------------ */
  /*  Flow 7 — Public Donation (anonymous, no login)                */
  /* ------------------------------------------------------------ */
  {
    id: "flow-7-public-donation",
    name: "Public donation (anonymous)",
    description:
      "No login required. Open the public donation form, fill the amount + type + contact, complete the reCAPTCHA checkbox and submit. Success screen with downloadable receipt.",
    role: "public",
    icon: "Heart",
    estimatedClicks: 5,
    tags: ["public", "mobile"],
    steps: [
      {
        label: "Open the public donate page",
        route: "/public/donate",
        action: "Navigate to the public-facing donation form. No login required.",
        manualOnly: true,
      },
      {
        label: "Pick an amount",
        route: "/public/donate",
        action: "Tap one of the preset buttons (৳500 / ৳1000 / ৳5000) or enter a custom amount.",
        targetSelector: "button[aria-pressed='true'], input[type='number']",
      },
      {
        label: "Choose donation type + enter contact",
        route: "/public/donate",
        action: "Pick General / Zakat / Sadaqah. Enter an email OR a mobile number (Risk R10 — at least one is mandatory).",
        targetSelector: "#email, #mobile",
      },
      {
        label: "Check 'I'm not a robot' + submit",
        route: "/public/donate",
        action: "Tick the reCAPTCHA checkbox and tap the 'Donate' button.",
        targetSelector: "#recaptcha",
      },
      {
        label: "Done — receipt generated",
        route: "/public/donate",
        action: "Verify the success screen with the receipt number and the 'Download Receipt' button.",
        manualOnly: true,
      },
    ],
  },

  /* ------------------------------------------------------------ */
  /*  Flow 8 — Any role → Dashboard redirect                        */
  /* ------------------------------------------------------------ */
  {
    id: "flow-8-dashboard-redirect",
    name: "Role-aware dashboard redirect",
    description:
      "The /dashboard route auto-redirects to the role-appropriate dashboard (teacher → teacher dashboard, accountant → accountant dashboard, etc.). Switch roles to verify each redirect.",
    role: "administrator",
    icon: "LayoutDashboard",
    estimatedClicks: 3,
    tags: ["desktop", "cross-role"],
    steps: [
      {
        label: "Open /dashboard",
        route: "/dashboard",
        action: "Watch the brief loading state, then auto-redirect to the role-appropriate dashboard.",
        manualOnly: true,
      },
      {
        label: "Switch role + revisit /dashboard",
        route: "/dashboard",
        action: "Use the DevToolbar role selector to switch to Teacher / Accountant / Guardian / Authority. Each click on /dashboard lands on a different role-specific dashboard.",
        manualOnly: true,
      },
      {
        label: "Done — redirect verified",
        route: "/dashboard",
        action: "The role redirect (getDashboardRouteForRole) works for all 8 personas.",
        manualOnly: true,
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Lookup helpers                                                    */
/* ------------------------------------------------------------------ */

export function getFlowById(id: string): FlowDef | undefined {
  return FLOWS.find((f) => f.id === id);
}

export const DEFAULT_TARGET_SELECTOR = "[data-mobile-cta-target]";
