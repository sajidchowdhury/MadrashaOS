/**
 * MadrashaOS — Flow Walkthrough Store (C6.1 · Task 6-a)
 *
 * Zustand store that tracks the currently-active interactive flow.
 * Designed to survive client-side navigation between routes that live
 * in different route groups (e.g. /dev/flows → /dashboard/teacher →
 * /attendance/take) because the DevToolbar only mounts inside the
 * `(app)` group — the store's module-level singleton persists across
 * those mounts.
 *
 * Persisted to localStorage so a refresh mid-flow doesn't lose progress.
 *
 * Public API:
 *   - startFlow(id)      → sets active flow + stepIndex 0 (does NOT
 *                          navigate; the caller is responsible for
 *                          router.push to steps[0].route).
 *   - nextStep()          → stepIndex++ (clamped to steps.length).
 *   - prevStep()          → stepIndex-- (clamped to 0).
 *   - goToStep(i)         → jump to a specific step.
 *   - exitFlow()          → clears the active flow.
 *   - getCurrentStep()    → { label, route, action, targetSelector, manualOnly } | null
 *   - isComplete          → derived: stepIndex === steps.length
 *
 * Consumers:
 *   - /dev/flows page renders the flow cards + active-flow progress card
 *   - DevToolbar renders the active-flow mini-indicator + "Next" button
 *   - FlowOverlay renders the pulsing CTA ring + completion celebration
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  FLOWS,
  getFlowById,
  DEFAULT_TARGET_SELECTOR,
  type FlowDef,
  type FlowStep,
} from "./registry";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ActiveFlowState = {
  flowId: string;
  stepIndex: number;
  /** ISO timestamp the flow was started — used by the celebration screen. */
  startedAt: number;
  /** Set true once the user dismisses the celebration screen. */
  celebrationDismissed: boolean;
};

type WalkthroughState = {
  activeFlow: ActiveFlowState | null;
  startFlow: (id: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (i: number) => void;
  exitFlow: () => void;
  dismissCelebration: () => void;
};

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useWalkthrough = create<WalkthroughState>()(
  persist(
    (set) => ({
      activeFlow: null,

      startFlow: (id) => {
        // Only start flows that exist in the registry.
        const flow = getFlowById(id);
        if (!flow) return;
        set({
          activeFlow: {
            flowId: id,
            stepIndex: 0,
            startedAt: Date.now(),
            celebrationDismissed: false,
          },
        });
      },

      nextStep: () => {
        set((state) => {
          if (!state.activeFlow) return state;
          const flow = getFlowById(state.activeFlow.flowId);
          if (!flow) return state;
          const nextIdx = Math.min(
            state.activeFlow.stepIndex + 1,
            flow.steps.length,
          );
          return {
            activeFlow: { ...state.activeFlow, stepIndex: nextIdx },
          };
        });
      },

      prevStep: () => {
        set((state) => {
          if (!state.activeFlow) return state;
          return {
            activeFlow: {
              ...state.activeFlow,
              stepIndex: Math.max(state.activeFlow.stepIndex - 1, 0),
            },
          };
        });
      },

      goToStep: (i) => {
        set((state) => {
          if (!state.activeFlow) return state;
          const flow = getFlowById(state.activeFlow.flowId);
          if (!flow) return state;
          return {
            activeFlow: {
              ...state.activeFlow,
              stepIndex: Math.max(0, Math.min(i, flow.steps.length)),
            },
          };
        });
      },

      exitFlow: () => {
        set({ activeFlow: null });
      },

      dismissCelebration: () => {
        set((state) => {
          if (!state.activeFlow) return state;
          return {
            activeFlow: { ...state.activeFlow, celebrationDismissed: true },
          };
        });
      },
    }),
    {
      name: "madrasha-walkthrough",
      // Only persist the active flow payload, not the action functions.
      partialize: (state) => ({ activeFlow: state.activeFlow }),
    },
  ),
);

/* ------------------------------------------------------------------ */
/*  Non-hook selectors (used outside React)                           */
/* ------------------------------------------------------------------ */

export function getActiveFlowId(): string | null {
  return useWalkthrough.getState().activeFlow?.flowId ?? null;
}

export function getActiveStepIndex(): number {
  return useWalkthrough.getState().activeFlow?.stepIndex ?? 0;
}

/**
 * Returns the current step's metadata or null if no flow is active
 * (or if the active flow's stepIndex points past the last step — that
 * means the flow is complete and the celebration should be shown).
 */
export function getCurrentStep(): FlowStep | null {
  const state = useWalkthrough.getState().activeFlow;
  if (!state) return null;
  const flow = getFlowById(state.flowId);
  if (!flow) return null;
  if (state.stepIndex >= flow.steps.length) return null;
  const step = flow.steps[state.stepIndex];
  return {
    ...step,
    targetSelector: step.targetSelector ?? DEFAULT_TARGET_SELECTOR,
  };
}

/**
 * Returns the FlowDef for the active flow, or null.
 */
export function getActiveFlow() {
  const id = getActiveFlowId();
  return id ? getFlowById(id) ?? null : null;
}

/**
 * True when the active flow's stepIndex has reached steps.length
 * (i.e. the user has clicked "Next" on the last step).
 */
export function isFlowComplete(): boolean {
  const state = useWalkthrough.getState().activeFlow;
  if (!state) return false;
  const flow = getFlowById(state.flowId);
  if (!flow) return false;
  return state.stepIndex >= flow.steps.length;
}

/* ------------------------------------------------------------------ */
/*  Convenience hook                                                  */
/* ------------------------------------------------------------------ */

/**
 * Subscribes to the active flow + current step + isComplete flag in
 * one shot — used by the DevToolbar and /dev/flows page.
 */
export function useActiveFlowState(): {
  flow: FlowDef | null;
  stepIndex: number;
  step: FlowStep | null;
  isComplete: boolean;
  totalSteps: number;
} {
  const activeFlow = useWalkthrough((s) => s.activeFlow);
  if (!activeFlow) {
    return {
      flow: null,
      stepIndex: 0,
      step: null,
      isComplete: false,
      totalSteps: 0,
    };
  }
  const flow = getFlowById(activeFlow.flowId);
  if (!flow) {
    return {
      flow: null,
      stepIndex: 0,
      step: null,
      isComplete: false,
      totalSteps: 0,
    };
  }
  const isComplete = activeFlow.stepIndex >= flow.steps.length;
  const step = isComplete
    ? null
    : {
        ...flow.steps[activeFlow.stepIndex],
        targetSelector:
          flow.steps[activeFlow.stepIndex].targetSelector ??
          DEFAULT_TARGET_SELECTOR,
      };
  return {
    flow,
    stepIndex: activeFlow.stepIndex,
    step,
    isComplete,
    totalSteps: flow.steps.length,
  };
}

/** Re-export the FLOWS array so consumers can import from one place. */
export { FLOWS };
