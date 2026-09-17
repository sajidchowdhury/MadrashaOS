"use client";

/**
 * MadrashaOS — KpiStat (C4.2 — Operations screens)
 *
 * The simple KPI block used at the top of every Operations page:
 *   - small uppercase label
 *   - large bold value
 *   - optional hint line under
 *
 * Mirrors the inline pattern in /accounting + /fees pages but extracted
 * so all 8 operations routes share a single source of truth. Renders as
 * a flat (non-card) bordered tile so it composes with the SectionCard
 * pattern used elsewhere on the page.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

type KpiTone = "default" | "primary" | "warning" | "danger" | "success" | "accent";

const VALUE_TONE_CLASS: Record<KpiTone, string> = {
  default: "text-text-primary",
  primary: "text-primary-500",
  warning: "text-semantic-warning",
  danger: "text-semantic-danger",
  success: "text-semantic-success",
  accent: "text-accent-500",
};

export function KpiStat({
  label,
  value,
  hint,
  tone = "default",
  icon: Icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: KpiTone;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border-default bg-surface-card p-4 shadow-elevation-1",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
          {label}
        </p>
        {Icon && <Icon className="h-4 w-4 text-text-muted" />}
      </div>
      <p className={cn("mt-1 font-mono text-display font-bold", VALUE_TONE_CLASS[tone])}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-caption text-text-muted">{hint}</p>}
    </div>
  );
}
