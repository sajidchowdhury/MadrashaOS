"use client";

/**
 * MadrashaOS — EmptyState (Session 1.3 #27 · C6.3 polish)
 *
 * Universal empty / loading / permission-denied state component.
 * Pairs with the 5 illustrations from Session 1.4 (E1–E5).
 *
 * Per Risk R3 lock-in: zero-permission users see an EmptyState with a
 * "Request access" CTA — never a silent dead-end (Do-Not-Do D8).
 *
 * C6.3 — Performance pass:
 *   The 5 illustration SVG components are now lazy-loaded via
 *   `next/dynamic` with `ssr: false`. They only ship to the client
 *   when an EmptyState actually renders (most pages render a list or
 *   table, not an empty state — so the ~3 KB of SVG markup never
 *   enters the initial bundle for those routes).
 *
 * Each dynamic import includes a lightweight loading fallback (an
 * empty <span>) so the EmptyState layout doesn't shift while the
 * SVG chunk loads.
 */

import * as React from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

export type EmptyStateIllustration =
  | "students"
  | "fees"
  | "attendance"
  | "inventory"
  | "results"
  | "generic";

/* ------------------------------------------------------------------ */
/*  Lazy-loaded illustrations                                          */
/* ------------------------------------------------------------------ */
/*  Each illustration is a separate chunk — only fetched when its     */
/*  EmptyState actually renders. The fallback is an empty <span>      */
/*  sized to match the SVG (h-40 w-60) so layout doesn't shift.       */
/* ------------------------------------------------------------------ */

const EmptyStudents = dynamic(
  () =>
    import("@/components/illustrations").then((m) => m.EmptyStudents),
  {
    ssr: false,
    loading: () => <span className="block h-40 w-60" aria-hidden />,
  },
);

const EmptyFees = dynamic(
  () => import("@/components/illustrations").then((m) => m.EmptyFees),
  {
    ssr: false,
    loading: () => <span className="block h-40 w-60" aria-hidden />,
  },
);

const EmptyAttendance = dynamic(
  () =>
    import("@/components/illustrations").then((m) => m.EmptyAttendance),
  {
    ssr: false,
    loading: () => <span className="block h-40 w-60" aria-hidden />,
  },
);

const EmptyInventory = dynamic(
  () =>
    import("@/components/illustrations").then((m) => m.EmptyInventory),
  {
    ssr: false,
    loading: () => <span className="block h-40 w-60" aria-hidden />,
  },
);

const EmptyResults = dynamic(
  () => import("@/components/illustrations").then((m) => m.EmptyResults),
  {
    ssr: false,
    loading: () => <span className="block h-40 w-60" aria-hidden />,
  },
);

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
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  );
}
