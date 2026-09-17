"use client";

/**
 * MadrashaOS — ButtonGroup (Session 1.3 #2)
 *
 * Segmented or joined group of buttons. Used in filters, dashboards,
 * and bulk actions.
 * Variants: segmented (gap between) / joined (no gap, shared border)
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export function ButtonGroup({
  children,
  variant = "segmented",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "segmented" | "joined";
  className?: string;
}) {
  return (
    <div
      role="group"
      data-slot="button-group"
      className={cn(
        "inline-flex items-center",
        variant === "segmented" ? "gap-2" : "[&>button]:rounded-none [&>button]:border-e-0 [&>button:last-child]:border-e [&>button:first-child]:rounded-s-md [&>button:last-child]:rounded-e-md",
        className,
      )}
    >
      {children}
    </div>
  );
}
