"use client";

/**
 * MadrashaOS — EmptyState (Session 1.3 #27)
 *
 * Universal empty / loading / permission-denied state component.
 * Pairs with the 5 illustrations from Session 1.4 (E1–E5).
 *
 * Per Risk R3 lock-in: zero-permission users see an EmptyState with a
 * "Request access" CTA — never a silent dead-end (Do-Not-Do D8).
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  EmptyStudents,
  EmptyFees,
  EmptyAttendance,
  EmptyInventory,
  EmptyResults,
} from "@/components/illustrations";

export type EmptyStateIllustration =
  | "students"
  | "fees"
  | "attendance"
  | "inventory"
  | "results"
  | "generic";

const ILLUSTRATION_MAP: Record<
  EmptyStateIllustration,
  React.ComponentType<{ className?: string }> | null
> = {
  students: EmptyStudents,
  fees: EmptyFees,
  attendance: EmptyAttendance,
  inventory: EmptyInventory,
  results: EmptyResults,
  generic: null,
};

export function EmptyState({
  illustration = "generic",
  title,
  description,
  action,
  className,
}: {
  illustration?: EmptyStateIllustration;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  const Illustration = ILLUSTRATION_MAP[illustration];

  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border-default bg-surface-card px-6 py-12 text-center",
        className,
      )}
    >
      {Illustration && (
        <Illustration className="mb-4 h-40 w-60 text-primary-500" />
      )}
      <h3 className="text-subtitle font-semibold text-text-primary">
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-sm text-body text-text-secondary">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
