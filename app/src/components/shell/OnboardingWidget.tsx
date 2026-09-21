"use client";

/**
 * MadrashaOS — Setup Checklist Widget
 *
 * One-time configuration checklist that appears on the dashboard.
 * Asks: "Is the SOFTWARE ready to use?" — not daily tasks.
 *
 * Checks if each foundational piece is configured:
 *   1. Organization profile
 *   2. Branches
 *   3. Classes + sections
 *   4. Users + roles (RBAC)
 *   5. Teachers
 *   6. Students
 *   7. Fee plans
 *   8. Chart of accounts
 *   9. Security policy
 *  10. First backup taken
 *
 * Each step auto-checks via API. When all 10 are ✅, the system is ready.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, Circle, ChevronRight, X, Sparkles, PartyPopper, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SETUP_STEPS, type SetupStep } from "@/lib/onboarding/steps";

const STORAGE_KEY = "madrasha-setup-dismissed";

export function OnboardingWidget() {
  const router = useRouter();
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [checking, setChecking] = useState<Record<string, boolean>>({});
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "true") {
        setDismissed(true);
        return;
      }
    } catch {
      // ignore
    }
    checkAllSteps();
  }, []);

  async function checkAllSteps() {
    for (const step of SETUP_STEPS) {
      setChecking((prev) => ({ ...prev, [step.id]: true }));
      try {
        const done = await checkStep(step);
        if (done) {
          setCompleted((prev) => {
            const next = new Set(prev);
            next.add(step.id);
            return next;
          });
        }
      } catch {
        // non-blocking
      }
      setChecking((prev) => ({ ...prev, [step.id]: false }));
    }
  }

  function handleDismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore
    }
  }

  function handleReset() {
    setDismissed(false);
    setCompleted(new Set());
    try {
      localStorage.removeItem(STORAGE_KEY);
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
            🚀 সেটআপ চেকলিস্ট বন্ধ আছে।
          </p>
          <Button variant="outline" size="sm" onClick={handleReset} lang="bn">
            আবার দেখুন
          </Button>
        </CardContent>
      </Card>
    );
  }

  const total = SETUP_STEPS.length;
  const doneCount = completed.size;
  const allDone = doneCount === total;
  const progressPct = Math.round((doneCount / total) * 100);
  const currentStep = SETUP_STEPS.find((s) => !completed.has(s.id));

  return (
    <Card className="border-primary-200 bg-primary-50/40 shadow-elevation-1">
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-subtitle">
            <Sparkles className="h-5 w-5 text-primary-500" />
            <span lang="bn">সিস্টেম প্রস্তুত করুন — একবারের সেটআপ</span>
          </CardTitle>
          <p className="mt-1 text-caption text-text-secondary" lang="bn">
            সফটওয়্যারটি ব্যবহারের আগে নিচের ধাপগুলো সম্পন্ন করুন। প্রতিটি ধাপ সম্পন্ন হলে স্বয়ংক্রিয়ভাবে টিক চিহ্নিত হবে।
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-md p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
          aria-label="বন্ধ করুন"
        >
          <X className="h-4 w-4" />
        </button>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-caption">
            <span className="text-text-secondary" lang="bn">
              {doneCount} / {total} সম্পন্ন
            </span>
            <span className="font-mono font-semibold text-primary-700">{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>

        {/* All done */}
        {allDone ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-semantic-success/30 bg-success-50 p-4 text-center">
            <PartyPopper className="h-8 w-8 text-semantic-success" />
            <p className="text-subtitle font-semibold text-semantic-success" lang="bn">
              সব প্রস্তুত! সিস্টেম ব্যবহারের জন্য তৈরি 🎉
            </p>
            <p className="text-body text-text-secondary" lang="bn">
              সকল কনফিগারেশন সম্পন্ন। এখন নিয়মিত কার্যক্রম শুরু করতে পারেন।
            </p>
          </div>
        ) : null}

        {/* Steps */}
        <ul className="space-y-2">
          {SETUP_STEPS.map((step) => {
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
                {/* Icon */}
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-semantic-success" />
                  ) : isChecking ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary-400" />
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

                {/* Action */}
                {!isDone && !isChecking && (
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

        <p className="text-center text-caption text-text-muted" lang="bn">
          💡 প্রতিটি ধাপের কাজ শেষ করে ড্যাশবোর্ডে ফিরে আসলে স্বয়ংক্রিয়ভাবে টিক হবে
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Check if a setup step is completed by calling the relevant API.
 */
async function checkStep(step: SetupStep): Promise<boolean> {
  try {
    const res = await fetch(step.checkEndpoint, { credentials: "include" });
    if (!res.ok) return false;
    const data = await res.json();

    // Support nested field access: "data.length" or "id"
    const parts = step.checkField.split(".");
    let value: unknown = data;
    for (const part of parts) {
      if (value == null) return false;
      value = (value as Record<string, unknown>)[part];
    }

    if (typeof value === "number") {
      return value >= step.checkMin;
    }
    if (typeof value === "string") {
      return value.length > 0;
    }
    if (Array.isArray(value)) {
      return value.length >= step.checkMin;
    }
    return !!value;
  } catch {
    return false;
  }
}
