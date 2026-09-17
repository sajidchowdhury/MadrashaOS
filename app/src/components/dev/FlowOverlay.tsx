"use client";

/**
 * MadrashaOS — FlowOverlay (C6.1 · Task 6-a)
 *
 * Renders two pieces of UX on top of whatever page is currently mounted:
 *
 *   1. FlowHighlighter — when an interactive flow is active and the
 *      current step has a `targetSelector`, this draws a pulsing ring
 *      around the matching CTA on the page so the user knows exactly
 *      which button/element to click next. The ring recomputes its
 *      position on scroll/resize via setInterval polling (the target
 *      element may mount asynchronously, e.g. inside a TanStack-Query
 *      gated view).
 *
 *   2. FlowCelebration — when the user clicks "Next" on the last step,
 *      a full-screen celebration overlay appears with "Flow complete! ✅"
 *      + a button to return to /dev/flows. Dismissing it marks the
 *      `celebrationDismissed` flag in the walkthrough store so it
 *      doesn't reappear on the next render cycle.
 *
 * Both components read from the walkthrough store, so they work on any
 * route (including /dev/flows itself which is outside the (app) group
 * and therefore doesn't render the DevToolbar).
 *
 * Mounted by:
 *   - the (app) group layout indirectly via the DevToolbar
 *   - /dev/flows page directly (since it's not in the (app) group)
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PartyPopper, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActiveFlowState, useWalkthrough } from "@/lib/flows/walkthrough";

/* ------------------------------------------------------------------ */
/*  1. Highlighter                                                     */
/* ------------------------------------------------------------------ */

const POLL_INTERVAL_MS = 500;

/**
 * Pulsing ring overlay drawn around the current step's target CTA.
 *
 * Implementation note: we use a single fixed-position div whose rect
 * is updated via getBoundingClientRect() of the matched element. Polling
 * is required because (a) the target may mount asynchronously after a
 * route change, and (b) scroll/resize can shift its position. We attach
 * scroll/resize listeners as well so updates feel responsive between
 * poll ticks.
 *
 * The "no step / manualOnly / complete" cases are handled by early
 * returning in render (return null) — no setState needed in the effect,
 * which keeps the React hooks linter happy.
 */
export function FlowHighlighter() {
  const { step, isComplete } = useActiveFlowState();
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Compute whether the highlighter should be visible from props.
  const shouldHighlight =
    !!step && !isComplete && !step.manualOnly && !!step.targetSelector;

  useEffect(() => {
    // Bail when there's no target to highlight — the polling effect
    // simply doesn't run, which means we don't touch setState here.
    if (!shouldHighlight || !step?.targetSelector) return;

    const selector = step.targetSelector;

    const updateRect = () => {
      const target = document.querySelector<HTMLElement>(selector);
      if (!target) {
        setRect(null);
        return;
      }
      const r = target.getBoundingClientRect();
      // Skip zero-size elements (e.g. hidden dialogs that haven't opened).
      if (r.width === 0 || r.height === 0) {
        setRect(null);
        return;
      }
      setRect(r);
    };

    updateRect();
    const intervalId = window.setInterval(updateRect, POLL_INTERVAL_MS);
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [shouldHighlight, step?.targetSelector]);

  if (!shouldHighlight || !rect) {
    return null;
  }

  // Position the ring at the target's bounding rect, expanded by a small
  // padding (drawn from the FROZEN spacing scale: --spacing-1 = 4px).
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-40 rounded-md ring-4 ring-primary-500 animate-pulse"
      style={{
        top: rect.top - 4,
        left: rect.left - 4,
        width: rect.width + 8,
        height: rect.height + 8,
      }}
    >
      {/* Floating "Click here" pill anchored to the top of the ring */}
      <div
        className="absolute left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-primary-500 px-3 py-1 text-caption font-medium text-primary-foreground shadow-elevation-2"
        style={{ top: -4 }}
      >
        Click here
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  2. Celebration                                                     */
/* ------------------------------------------------------------------ */

/**
 * Full-screen celebration overlay shown when the active flow reaches the
 * end of its steps array. The user can dismiss it (which sets the
 * `celebrationDismissed` flag in the walkthrough store) or click
 * "Back to flows" which clears the flow entirely and navigates to
 * /dev/flows.
 */
export function FlowCelebration() {
  const router = useRouter();
  const { flow, isComplete } = useActiveFlowState();
  const exitFlow = useWalkthrough((s) => s.exitFlow);
  const dismissCelebration = useWalkthrough((s) => s.dismissCelebration);
  const activeFlow = useWalkthrough((s) => s.activeFlow);

  // Derive visibility from the store's celebrationDismissed flag — no
  // local state, no sync effect needed.
  const isDismissed = !!activeFlow?.celebrationDismissed;

  if (!flow || !isComplete || isDismissed) return null;

  const handleBackToFlows = () => {
    exitFlow();
    router.push("/dev/flows");
  };

  const handleDismiss = () => {
    dismissCelebration();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="flow-celebration-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-900/60 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border-default bg-surface-card shadow-elevation-4">
        {/* Decorative top accent */}
        <div className="h-2 w-full bg-primary-500" />

        {/* Close button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute end-3 top-4 rounded-full p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
          aria-label="Dismiss celebration"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 py-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-50 text-semantic-success">
            <PartyPopper className="h-8 w-8" />
          </div>

          <h2
            id="flow-celebration-title"
            className="text-display font-bold text-text-primary"
          >
            Flow complete! ✅
          </h2>
          <p className="mt-2 text-body text-text-secondary">
            You successfully finished the{" "}
            <span className="font-semibold text-text-primary">{flow.name}</span>{" "}
            flow. That&apos;s{" "}
            <span className="font-mono">{flow.estimatedClicks} clicks</span>{" "}
            end-to-end.
          </p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={handleBackToFlows}>
              Back to flows
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={handleDismiss}>
              Stay on this page
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Combined overlay                                                   */
/* ------------------------------------------------------------------ */

/**
 * Mounts both the highlighter and the celebration. Drop this once per
 * page that needs flow UX (the DevToolbar does this for (app) routes;
 * the /dev/flows page mounts its own instance).
 */
export function FlowOverlay() {
  return (
    <>
      <FlowHighlighter />
      <FlowCelebration />
    </>
  );
}
