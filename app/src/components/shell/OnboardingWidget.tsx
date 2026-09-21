"use client";

/**
 * MadrashaOS — Onboarding Widget
 *
 * Shows on the dashboard as a guided setup checklist.
 * Each step links to a real page where the user performs an action.
 * When the user returns to the dashboard, the step is checked via API.
 *
 * Completion state is persisted to localStorage.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, ChevronRight, X, Sparkles, PartyPopper } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ONBOARDING_STEPS, type OnboardingStep } from "@/lib/onboarding/steps";

const STORAGE_KEY = "madrasha-onboarding-completed";
const DISMISS_KEY = "madrasha-onboarding-dismissed";

export function OnboardingWidget() {
  const router = useRouter();
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState<Record<string, boolean>>({});

  // Load state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setCompleted(new Set(JSON.parse(saved)));
      const dis = localStorage.getItem(DISMISS_KEY);
      if (dis === "true") setDismissed(true);
    } catch {
      // ignore
    }
  }, []);

  // Check completion status via API
  useEffect(() => {
    if (dismissed) return;
    checkAllSteps();
  }, [dismissed]);

  async function checkAllSteps() {
    const cookies = ""; // uses httpOnly cookie via credentials: include
    for (const step of ONBOARDING_STEPS) {
      if (completed.has(step.id)) continue;
      setChecking((prev) => ({ ...prev, [step.id]: true }));
      try {
        const done = await checkStep(step, cookies);
        if (done) {
          setCompleted((prev) => {
            const next = new Set(prev);
            next.add(step.id);
            saveState(next);
            return next;
          });
        }
      } catch {
        // ignore — non-blocking
      }
      setChecking((prev) => ({ ...prev, [step.id]: false }));
    }
  }

  function saveState(state: Set<string>) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(state)));
    } catch {
      // ignore
    }
  }

  function handleDismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "true");
    } catch {
      // ignore
    }
  }

  function handleReset() {
    setCompleted(new Set());
    setDismissed(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(DISMISS_KEY);
    } catch {
      // ignore
    }
    setTimeout(() => checkAllSteps(), 100);
  }

  if (dismissed) {
    return (
      <Card className="border-border-default">
        <CardContent className="flex items-center justify-between p-4">
          <p className="text-body text-text-secondary" lang="bn">
            🚀 সেটআপ গাইড বন্ধ আছে। আবার দেখতে চাইলে রিসেট করুন।
          </p>
          <Button variant="outline" size="sm" onClick={handleReset} lang="bn">
            রিসেট করুন
          </Button>
        </CardContent>
      </Card>
    );
  }

  const totalSteps = ONBOARDING_STEPS.length;
  const doneCount = completed.size;
  const allDone = doneCount === totalSteps;
  const progressPct = Math.round((doneCount / totalSteps) * 100);

  // Find the first incomplete step (the "current" step)
  const currentStep = ONBOARDING_STEPS.find((s) => !completed.has(s.id));

  return (
    <Card className="border-primary-200 bg-primary-50/40 shadow-elevation-1">
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-subtitle">
            <Sparkles className="h-5 w-5 text-primary-500" />
            <span lang="bn">শুরু করুন — ধাপে ধাপে সেটআপ</span>
          </CardTitle>
          <p className="mt-1 text-caption text-text-secondary" lang="bn">
            নিচের ধাপগুলো অনুসরণ করে সিস্টেমটি সম্পূর্ণ প্রস্তুত করুন। প্রতিটি কাজ শেষ হলে স্বয়ংক্রিয়ভাবে টিক চিহ্নিত হবে।
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-md p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
          aria-label="গাইড বন্ধ করুন"
        >
          <X className="h-4 w-4" />
        </button>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-caption">
            <span className="text-text-secondary" lang="bn">
              {doneCount} / {totalSteps} সম্পন্ন
            </span>
            <span className="font-mono font-semibold text-primary-700">{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>

        {/* All done celebration */}
        {allDone ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-semantic-success/30 bg-success-50 p-4 text-center">
            <PartyPopper className="h-8 w-8 text-semantic-success" />
            <p className="text-subtitle font-semibold text-semantic-success" lang="bn">
              অভিনন্দন! সব ধাপ সম্পন্ন হয়েছে 🎉
            </p>
            <p className="text-body text-text-secondary" lang="bn">
              আপনার মাদ্রাসা সিস্টেম এখন সম্পূর্ণ প্রস্তুত। নিয়মিত ব্যবহার শুরু করুন।
            </p>
          </div>
        ) : null}

        {/* Steps list */}
        <ul className="space-y-2">
          {ONBOARDING_STEPS.map((step, idx) => {
            const isDone = completed.has(step.id);
            const isCurrent = currentStep?.id === step.id;
            const isChecking = checking[step.id];

            return (
              <li
                key={step.id}
                className={`flex items-start gap-3 rounded-lg border p-3 transition-all ${
                  isDone
                    ? "border-semantic-success/30 bg-success-50/50"
                    : isCurrent
                      ? "border-primary-300 bg-primary-50 shadow-elevation-1"
                      : "border-border-default bg-surface-card"
                }`}
              >
                {/* Status icon */}
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-semantic-success" />
                  ) : isChecking ? (
                    <Circle className="h-5 w-5 animate-pulse text-primary-400" />
                  ) : (
                    <Circle className="h-5 w-5 text-text-muted" />
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-body font-medium ${
                      isDone ? "text-text-muted line-through" : "text-text-primary"
                    }`}
                    lang="bn"
                  >
                    {step.icon} {step.title}
                  </p>
                  {!isDone && (
                    <p className="mt-0.5 text-caption leading-relaxed text-text-secondary" lang="bn">
                      {step.instruction}
                    </p>
                  )}
                </div>

                {/* Action button */}
                {!isDone && (
                  <Button
                    size="sm"
                    variant={isCurrent ? "default" : "outline"}
                    onClick={() => router.push(step.route)}
                    className="shrink-0"
                  >
                    {step.buttonLabel}
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>

        {/* Footer */}
        <p className="text-center text-caption text-text-muted" lang="bn">
          💡 প্রতিটি ধাপের কাজ শেষ করে ড্যাশবোর্ডে ফিরে আসলে স্বয়ংক্রিয়ভাবে টিক হবে
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Check if a step is completed by calling the relevant API.
 * Returns true if the step is done.
 */
async function checkStep(step: OnboardingStep, _cookies: string): Promise<boolean> {
  const BASE = "/api/v1";
  try {
    switch (step.checkType) {
      case "students": {
        const res = await fetch(`${BASE}/students?pageSize=1`, { credentials: "include" });
        const data = await res.json();
        return (data?.data?.length ?? 0) > 0;
      }
      case "attendance": {
        const res = await fetch(`${BASE}/attendance/sessions?pageSize=1`, { credentials: "include" });
        const data = await res.json();
        return (data?.data?.length ?? 0) > 0;
      }
      case "fees": {
        const res = await fetch(`${BASE}/fees/payments?pageSize=1`, { credentials: "include" });
        const data = await res.json();
        return (data?.data?.length ?? 0) > 0;
      }
      case "exams": {
        const res = await fetch(`${BASE}/exams?pageSize=1`, { credentials: "include" });
        const data = await res.json();
        return (data?.data?.length ?? 0) > 0;
      }
      case "notices": {
        const res = await fetch(`${BASE}/notices?pageSize=1`, { credentials: "include" });
        const data = await res.json();
        return (data?.data?.length ?? 0) > 0;
      }
      case "rbac": {
        // RBAC is always "done" if roles exist (seeded by default)
        const res = await fetch(`${BASE}/roles?pageSize=1`, { credentials: "include" });
        const data = await res.json();
        return (data?.data?.length ?? 0) > 0;
      }
      default:
        return false;
    }
  } catch {
    return false;
  }
}
