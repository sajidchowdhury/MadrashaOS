"use client";

/**
 * MadrashaOS — /dev/flows (C6.1 · Task 6-a)
 *
 * The Flows Catalog + Walkthrough Console.
 *
 * Two modes:
 *   (A) Catalog mode — no active flow. Shows 8 flow cards (one per
 *       prototype flow). Clicking "Start Flow" sets the role via
 *       sessionStore.setRole(), calls walkthrough.startFlow(id), and
 *       navigates to steps[0].route.
 *   (B) Walkthrough mode — active flow. Shows a sticky progress card
 *       at the top ("Step 2 of 5") + the flow's steps as a vertical
 *       checklist with checkmarks for completed steps. "Next Step"
 *       advances stepIndex and navigates to the next step's route.
 *       "Exit Flow" clears the active flow.
 *
 * Also mounts the DevToolbar + FlowOverlay so users can switch role
 * mid-flow (required for flow 3) and see the pulsing CTA ring +
 * celebration overlay without leaving /dev/flows.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck, Wallet, Calculator, GraduationCap, ShieldCheck,
  UserPlus, Heart, LayoutDashboard, Play, ArrowRight, ArrowLeft,
  Check, X, RotateCcw, Info,
} from "lucide-react";
import { FLOWS } from "@/lib/flows/registry";
import type { FlowDef } from "@/lib/flows/registry";
import { useActiveFlowState, useWalkthrough } from "@/lib/flows/walkthrough";
import { useSessionStore } from "@/stores/sessionStore";
import { ROLE_LABELS, type Role } from "@/stores/types";
import { DevToolbar } from "@/components/dev/DevToolbar";
import { FlowOverlay } from "@/components/dev/FlowOverlay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* ------------------------------------------------------------------ */
/*  Icon resolver                                                      */
/* ------------------------------------------------------------------ */

const ICONS: Record<FlowDef["icon"], typeof ClipboardCheck> = {
  ClipboardCheck,
  Wallet,
  Calculator,
  GraduationCap,
  ShieldCheck,
  UserPlus,
  Heart,
  LayoutDashboard,
};

/* ------------------------------------------------------------------ */
/*  Tag palette                                                        */
/* ------------------------------------------------------------------ */

const TAG_LABEL: Record<string, string> = {
  mobile: "Mobile",
  desktop: "Desktop",
  "cross-role": "Cross-role",
  public: "Public",
  "drag-and-drop": "DnD",
};

const TAG_CLASS: Record<string, string> = {
  mobile: "border-primary-200 bg-primary-50 text-primary-700",
  desktop: "border-border-strong bg-neutral-100 text-text-secondary",
  "cross-role": "border-accent-200 bg-accent-50 text-accent-700",
  public: "border-semantic-success/40 bg-success-50 text-semantic-success",
  "drag-and-drop": "border-semantic-warning/40 bg-warning-50 text-semantic-warning",
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DevFlowsPage() {
  const router = useRouter();
  const setRole = useSessionStore((s) => s.setRole);
  const { flow: activeFlow, stepIndex, isComplete } = useActiveFlowState();
  const startFlow = useWalkthrough((s) => s.startFlow);
  const nextStep = useWalkthrough((s) => s.nextStep);
  const prevStep = useWalkthrough((s) => s.prevStep);
  const exitFlow = useWalkthrough((s) => s.exitFlow);

  const handleStartFlow = (f: FlowDef) => {
    // Set role if the flow requires an authenticated role.
    if (f.role !== "public") {
      setRole(f.role as Role);
    }
    startFlow(f.id);
    // Navigate to the first step's route.
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

  const handlePrevStep = () => {
    if (!activeFlow) return;
    prevStep();
    const prev = activeFlow.steps[stepIndex - 1];
    if (prev) {
      router.push(prev.route);
    }
  };

  const handleExitFlow = () => {
    exitFlow();
    // Stay on /dev/flows (catalog mode will re-render).
  };

  return (
    <div className="min-h-screen bg-surface-canvas">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border-default bg-surface-card">
        <div className="mx-auto max-w-[var(--grid-max-width)] px-4 py-4 md:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-display font-bold text-text-primary">
                <Play className="h-6 w-6 text-primary-500" />
                Interactive Prototype Flows
              </h1>
              <p className="mt-1 text-body text-text-secondary">
                Pick a flow to walk through end-to-end. The DevToolbar will highlight each next CTA.
              </p>
            </div>
            <a
              href="/"
              className="inline-flex items-center gap-1 text-caption text-text-muted transition-colors hover:text-primary-500"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to home
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[var(--grid-max-width)] px-4 py-6 md:px-6 md:py-8">
        {/* Active flow progress card (walkthrough mode) */}
        {activeFlow && (
          <ActiveFlowCard
            flow={activeFlow}
            stepIndex={stepIndex}
            isComplete={isComplete}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            onExit={handleExitFlow}
          />
        )}

        {/* Catalog grid */}
        {!activeFlow && (
          <>
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-primary-200 bg-primary-50 p-4 text-body text-primary-700">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Each card starts an interactive walkthrough. The DevToolbar (bottom-right) will
                follow you to each route, highlight the next CTA with a pulsing ring, and let
                you advance with <kbd className="rounded bg-surface-card px-1.5 py-0.5 font-mono text-caption">Next</kbd>.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FLOWS.map((flow) => (
                <FlowCard key={flow.id} flow={flow} onStart={() => handleStartFlow(flow)} />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Mount the DevToolbar (so role switching works mid-flow even on this
          non-(app) route) + the FlowOverlay (highlighter + celebration). */}
      <DevToolbar />
      <FlowOverlay />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Catalog card                                                       */
/* ------------------------------------------------------------------ */

function FlowCard({ flow, onStart }: { flow: FlowDef; onStart: () => void }) {
  const Icon = ICONS[flow.icon];
  const roleLabel =
    flow.role === "public" ? "Public" : ROLE_LABELS[flow.role as Role].english;

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border-default bg-surface-canvas p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-500">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-subtitle text-text-primary">
              {flow.name}
            </CardTitle>
            <p className="mt-0.5 text-caption font-medium uppercase tracking-wider text-text-muted">
              {roleLabel} · ≈{flow.estimatedClicks} clicks · {flow.steps.length} steps
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <p className="text-body text-text-secondary">{flow.description}</p>

        <div className="flex flex-wrap gap-1.5">
          {flow.tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className={`text-caption ${TAG_CLASS[tag] ?? ""}`}
            >
              {TAG_LABEL[tag] ?? tag}
            </Badge>
          ))}
        </div>

        {/* Step preview — first 3 steps */}
        <ol className="mt-2 space-y-1.5 text-caption text-text-secondary">
          {flow.steps.slice(0, 3).map((step, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-neutral-100 font-mono text-[10px] font-bold text-text-secondary">
                {i + 1}
              </span>
              <span className="truncate">{step.label}</span>
            </li>
          ))}
          {flow.steps.length > 3 && (
            <li className="text-caption italic text-text-muted">
              +{flow.steps.length - 3} more step{flow.steps.length - 3 === 1 ? "" : "s"}
            </li>
          )}
        </ol>

        <div className="mt-auto pt-2">
          <Button onClick={onStart} className="w-full">
            <Play className="h-4 w-4" />
            Start Flow
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Active flow progress card (walkthrough mode)                       */
/* ------------------------------------------------------------------ */

function ActiveFlowCard({
  flow, stepIndex, isComplete, onNext, onPrev, onExit,
}: {
  flow: FlowDef;
  stepIndex: number;
  isComplete: boolean;
  onNext: () => void;
  onPrev: () => void;
  onExit: () => void;
}) {
  const Icon = ICONS[flow.icon];
  const roleLabel =
    flow.role === "public" ? "Public" : ROLE_LABELS[flow.role as Role].english;
  const progressPct = Math.min(
    100,
    Math.round(((stepIndex + (isComplete ? 1 : 0)) / flow.steps.length) * 100),
  );

  return (
    <Card className="mb-6 overflow-hidden border-primary-200 shadow-elevation-2">
      <CardHeader className="border-b border-border-default bg-primary-50/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-500 text-primary-foreground">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-subtitle text-text-primary">
                {flow.name}
              </CardTitle>
              <p className="mt-0.5 text-caption font-medium uppercase tracking-wider text-text-muted">
                {roleLabel} · {isComplete
                  ? "Complete!"
                  : `Step ${stepIndex + 1} of ${flow.steps.length}`}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onExit}
            aria-label="Exit flow"
            className="text-text-muted hover:text-semantic-danger"
          >
            <X className="h-4 w-4" />
            Exit
          </Button>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-neutral-100"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-primary-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {/* Steps checklist */}
        <ol className="space-y-2">
          {flow.steps.map((step, i) => {
            const isDone = i < stepIndex || isComplete;
            const isCurrent = i === stepIndex && !isComplete;
            const isFuture = i > stepIndex;
            return (
              <li
                key={i}
                className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                  isCurrent
                    ? "border-primary-500 bg-primary-50/60"
                    : isDone
                      ? "border-semantic-success/30 bg-success-50/40"
                      : "border-border-default bg-surface-card"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-caption font-bold ${
                    isDone
                      ? "bg-semantic-success text-success-foreground"
                      : isCurrent
                        ? "bg-primary-500 text-primary-foreground"
                        : "bg-neutral-100 text-text-secondary"
                  }`}
                  aria-label={
                    isDone ? `Step ${i + 1} complete` : isCurrent ? `Current step ${i + 1}` : `Step ${i + 1} pending`
                  }
                >
                  {isDone ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    i + 1
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-subtitle font-medium ${
                      isFuture ? "text-text-muted" : "text-text-primary"
                    }`}
                  >
                    {step.label}
                  </p>
                  {(isCurrent || isDone) && (
                    <p className="mt-0.5 text-caption text-text-secondary">
                      {step.action}
                    </p>
                  )}
                  {isCurrent && (
                    <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-surface-card px-2 py-0.5 font-mono text-[10px] text-text-muted">
                      {step.route}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {/* Action bar */}
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-border-default pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrev}
            disabled={stepIndex === 0 || isComplete}
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="text-caption text-text-muted">
            {isComplete ? (
              <span className="flex items-center gap-1 font-medium text-semantic-success">
                <Check className="h-3.5 w-3.5" />
                All steps done
              </span>
            ) : (
              <>
                <span className="font-mono font-medium text-text-primary">
                  {stepIndex + 1}
                </span>
                {" / "}
                <span className="font-mono">{flow.steps.length}</span>
              </>
            )}
          </div>

          {isComplete ? (
            <Button variant="outline" size="sm" onClick={onExit}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          ) : (
            <Button size="sm" onClick={onNext}>
              Next Step
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
