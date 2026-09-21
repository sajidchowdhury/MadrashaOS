"use client";

/**
 * MadrashaOS — DevToolbar (C0.4 upgrade + C6.1 Flow Walkthrough mode)
 *
 * Now wired to the Zustand sessionStore:
 *   - Role selector → setRole() → re-derives permissions[]
 *   - Branch selector → setBranch()
 *   - Network simulator → setNetwork() (Risk R6 — attendance under poor connectivity)
 *
 * C6.1 addition — "Flows" section:
 *   - Shows the currently-active interactive flow (if any) with a
 *     "Step 2 / 5" mini-indicator + "Next" button + "Exit" button.
 *   - When no flow is active, the section shows a dropdown listing all
 *     8 flows from the registry; selecting one calls startFlow(id)
 *     and navigates to the first step's route.
 *   - The FlowOverlay (pulsing CTA ring + completion celebration) is
 *     mounted alongside this toolbar.
 *
 * Language + Theme controls are in the TopBar (user dropdown + theme toggle).
 *
 * Collapses to a small "DEV" badge; expands to show all controls. When
 * a flow is active, the collapsed badge also shows a "2/5" pill so the
 * progress is always visible.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bug, ChevronUp, Play, ChevronRight, X, ArrowRight, ListChecks,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useSessionStore } from "@/stores/sessionStore";
import {
  ROLES,
  BRANCHES,
  NETWORK_MODES,
  ROLE_LABELS,
  BRANCH_LABELS,
  type Role,
  type Branch,
  type NetworkMode,
} from "@/stores/types";
import { getRolePermissions } from "@/lib/auth/role-permissions";
import { FLOWS } from "@/lib/flows/registry";
import type { FlowDef } from "@/lib/flows/registry";
import { useActiveFlowState, useWalkthrough } from "@/lib/flows/walkthrough";
import { FlowOverlay } from "@/components/dev/FlowOverlay";
import { Button } from "@/components/ui/button";

export function DevToolbar() {
  const { t } = useI18n();
  const { role, branch, network, permissions, setRole, setBranch, setNetwork } =
    useSessionStore();
  const [expanded, setExpanded] = useState(false);

  /* --- Flow Walkthrough state --- */
  const router = useRouter();
  const { flow: activeFlow, stepIndex, step, isComplete, totalSteps } =
    useActiveFlowState();
  const startFlow = useWalkthrough((s) => s.startFlow);
  const nextStep = useWalkthrough((s) => s.nextStep);
  const exitFlow = useWalkthrough((s) => s.exitFlow);

  const handleStartFlow = (f: FlowDef) => {
    if (f.role !== "public") {
      setRole(f.role as Role);
    }
    startFlow(f.id);
    const firstStep = f.steps[0];
    if (firstStep) {
      router.push(firstStep.route);
    }
  };

  const handleNextStep = () => {
    if (!activeFlow) return;
    nextStep();
    const next = activeFlow.steps[stepIndex + 1];
    if (next) {
      router.push(next.route);
    }
  };

  /* --- Collapsed: floating DEV badge. When a flow is active, also show
         a "2/5" pill so progress is visible without expanding. --- */
  if (!expanded) {
    return (
      <>
        <div className="fixed bottom-4 end-4 z-50 flex items-center gap-1.5">
          {activeFlow && (
            <button
              type="button"
              onClick={handleNextStep}
              className="flex items-center gap-1.5 rounded-full bg-primary-500 px-3 py-2 text-caption font-medium text-primary-foreground shadow-elevation-3 transition-all hover:bg-primary-700"
              aria-label={
                isComplete
                  ? `Flow ${activeFlow.name} complete`
                  : `Flow ${activeFlow.name} — step ${stepIndex + 1} of ${totalSteps}. Click to advance.`
              }
              title={step ? step.action : `${activeFlow.name} — complete`}
            >
              <ListChecks className="h-4 w-4" />
              <span className="font-mono">
                {isComplete ? "Done" : `${stepIndex + 1}/${totalSteps}`}
              </span>
              {!isComplete && <ArrowRight className="h-3 w-3" />}
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-2 text-caption font-medium text-neutral-0 shadow-elevation-3 transition-all hover:bg-neutral-700"
            aria-label={t("shell.dev.title")}
          >
            <Bug className="h-4 w-4" />
            <span>{t("shell.dev.expand")}</span>
            <span className="ms-1 rounded-full bg-primary-500 px-1.5 py-0.5 text-[10px] font-bold">
              {ROLE_LABELS[role].native}
            </span>
          </button>
        </div>
        <FlowOverlay />
      </>
    );
  }

  /* --- Expanded: controls panel --- */
  return (
    <>
      <div className="fixed bottom-4 end-4 z-50 w-80 rounded-xl border border-border-default bg-surface-card shadow-elevation-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-default px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4 text-primary-500" />
            <span className="text-subtitle font-semibold text-text-primary">
              {t("shell.dev.title")}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="rounded-md p-1 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            aria-label={t("shell.dev.collapse")}
          >
            <ChevronUp className="h-4 w-4" data-directional="true" />
          </button>
        </div>

        {/* Scrollable controls (max height so the panel never overflows
            the viewport when the Flows section grows tall). */}
        <div className="max-h-[calc(100vh-12rem)] space-y-3 overflow-y-auto p-4">
          {/* --- Flows section (C6.1) --- */}
          <FlowsSection
            activeFlow={activeFlow}
            stepIndex={stepIndex}
            totalSteps={totalSteps}
            step={step}
            isComplete={isComplete}
            onStart={handleStartFlow}
            onNext={handleNextStep}
            onExit={exitFlow}
          />

          {/* Role selector — wired to sessionStore */}
          <div>
            <label className="mb-1 block text-caption font-medium uppercase tracking-wider text-text-muted">
              {t("shell.dev.role")} ({permissions.length} perms)
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded-md border border-border-strong bg-surface-card px-3 py-1.5 text-subtitle text-text-primary focus:border-primary-500 focus:outline-none"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r].english} ({ROLE_LABELS[r].native})
                </option>
              ))}
            </select>
          </div>

          {/* Branch selector — wired to sessionStore */}
          <div>
            <label className="mb-1 block text-caption font-medium uppercase tracking-wider text-text-muted">
              {t("shell.dev.branch")}
            </label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value as Branch)}
              className="w-full rounded-md border border-border-strong bg-surface-card px-3 py-1.5 text-subtitle text-text-primary focus:border-primary-500 focus:outline-none"
            >
              {BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {BRANCH_LABELS[b]}
                </option>
              ))}
            </select>
          </div>

          {/* Network simulator — wired to sessionStore */}
          <div>
            <label className="mb-1 block text-caption font-medium uppercase tracking-wider text-text-muted">
              {t("shell.dev.network")}
            </label>
            <div className="flex gap-1">
              {NETWORK_MODES.map((n: NetworkMode) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNetwork(n)}
                  className={`flex-1 rounded-md px-2 py-1.5 text-caption font-medium transition-colors ${
                    network === n
                      ? n === "offline"
                        ? "bg-semantic-danger text-danger-foreground"
                        : n === "slow"
                          ? "bg-semantic-warning text-warning-foreground"
                          : "bg-semantic-success text-success-foreground"
                      : "bg-neutral-100 text-text-secondary hover:bg-neutral-200"
                  }`}
                >
                  {t(`shell.dev.network.${n}` as never)}
                </button>
              ))}
            </div>
          </div>

          {/* Permissions preview (truncated) */}
          <div>
            <label className="mb-1 block text-caption font-medium uppercase tracking-wider text-text-muted">
              Permissions ({permissions.length})
            </label>
            <div className="max-h-24 overflow-y-auto rounded-md border border-border-default bg-neutral-50 p-2">
              <code className="text-[10px] leading-relaxed text-text-secondary">
                {getRolePermissions(role).slice(0, 6).join(", ")}
                {permissions.length > 6 && ` … +${permissions.length - 6} more`}
              </code>
            </div>
          </div>
        </div>
      </div>
      <FlowOverlay />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Flows section (used inside the expanded DevToolbar)                 */
/* ------------------------------------------------------------------ */

function FlowsSection({
  activeFlow,
  stepIndex,
  totalSteps,
  step,
  isComplete,
  onStart,
  onNext,
  onExit,
}: {
  activeFlow: FlowDef | null;
  stepIndex: number;
  totalSteps: number;
  step: ReturnType<typeof useActiveFlowState>["step"];
  isComplete: boolean;
  onStart: (f: FlowDef) => void;
  onNext: () => void;
  onExit: () => void;
}) {
  const [flowMenuOpen, setFlowMenuOpen] = useState(false);

  // Active flow — show progress + Next/Exit.
  if (activeFlow) {
    return (
      <div className="rounded-lg border border-primary-200 bg-primary-50/40 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
              {isComplete ? "Flow complete" : "Active flow"}
            </p>
            <p className="mt-0.5 truncate text-subtitle font-semibold text-text-primary">
              {activeFlow.name}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-primary-500 px-2 py-0.5 font-mono text-[10px] font-bold text-primary-foreground">
            {isComplete ? "Done" : `${stepIndex + 1}/${totalSteps}`}
          </span>
        </div>

        {!isComplete && step && (
          <div className="mt-2 rounded-md bg-surface-card p-2">
            <p className="text-caption font-medium text-text-primary">
              {step.label}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-text-secondary">
              {step.action}
            </p>
          </div>
        )}

        {/* Progress bar */}
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-primary-500 transition-all"
            style={{
              width: `${Math.min(
                100,
                Math.round(((stepIndex + (isComplete ? 1 : 0)) / Math.max(1, totalSteps)) * 100),
              )}%`,
            }}
          />
        </div>

        <div className="mt-3 flex items-center gap-2">
          {!isComplete && (
            <Button size="sm" onClick={onNext} className="flex-1">
              Next
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={onExit}
            aria-label="Exit flow"
          >
            <X className="h-3 w-3" />
            {isComplete ? "Close" : "Exit"}
          </Button>
        </div>
      </div>
    );
  }

  // No active flow — show the "Start Flow" dropdown.
  return (
    <div className="rounded-lg border border-border-default bg-surface-canvas p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
            Interactive flows
          </p>
          <p className="mt-0.5 text-subtitle font-semibold text-text-primary">
            Walk through a flow
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setFlowMenuOpen((v) => !v)}
          aria-expanded={flowMenuOpen}
        >
          <Play className="h-3 w-3" />
          Start
          <ChevronRight
            className={`h-3 w-3 transition-transform ${flowMenuOpen ? "rotate-90" : ""}`}
            data-directional="true"
          />
        </Button>
      </div>

      {flowMenuOpen && (
        <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto pe-1">
          {FLOWS.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => {
                  setFlowMenuOpen(false);
                  onStart(f);
                }}
                className="flex w-full items-center gap-2 rounded-md border border-border-default bg-surface-card px-2 py-1.5 text-start text-caption transition-colors hover:bg-surface-hover"
              >
                <Play className="h-3 w-3 shrink-0 text-primary-500" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-text-primary">
                    {f.name}
                  </span>
                  <span className="block text-[10px] text-text-muted">
                    {f.role === "public"
                      ? "Public"
                      : ROLE_LABELS[f.role as Role].english}
                    {" · "}≈{f.estimatedClicks} clicks
                  </span>
                </span>
              </button>
            </li>
          ))}
          <li>
            <a
              href="/dev/flows"
              className="flex w-full items-center gap-2 rounded-md border border-dashed border-border-strong bg-surface-card px-2 py-1.5 text-caption text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              <ListChecks className="h-3 w-3 shrink-0" />
              <span>Open Flows catalog (all 8)</span>
              <ArrowRight className="ms-auto h-3 w-3" data-directional="true" />
            </a>
          </li>
        </ul>
      )}
    </div>
  );
}
