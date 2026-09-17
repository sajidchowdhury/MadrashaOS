"use client";

/**
 * MadrashaOS — SectionCard (C3.1)
 *
 * The standard section wrapper used across all Foundation module screens.
 * Implements the FROZEN token pattern referenced in the dashboard pages:
 *   rounded-2xl border bg-surface-card p-6 shadow-elevation-1
 *
 * Per project rule: every page must use the SectionCard pattern.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export function SectionCard({
  className,
  children,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="section-card"
      className={cn(
        "rounded-2xl border border-border-default bg-surface-card p-6 shadow-elevation-1",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function SectionCardHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="section-card-header"
      className={cn(
        "mb-4 flex flex-wrap items-start justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <h2 className="text-title font-semibold text-text-primary">{title}</h2>
        {description && (
          <p className="mt-1 text-body text-text-secondary">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
