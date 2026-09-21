"use client";

/**
 * MadrashaOS — FilterBar (Session 1.3 #29)
 *
 * Inline or collapsible filter bar for list headers and reports.
 * Supports a "save preset" affordance for power users (P7).
 */

import * as React from "react";
import { Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function FilterBar({
  children,
  onSavePreset,
  onClear,
  activeCount = 0,
  className,
}: {
  children: React.ReactNode;
  onSavePreset?: () => void;
  onClear?: () => void;
  activeCount?: number;
  className?: string;
}) {
  return (
    <div
      data-slot="filter-bar"
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border border-border-default bg-surface-card p-3",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-text-secondary">
        <Filter className="h-4 w-4" />
        {activeCount > 0 && (
          <span className="rounded-full bg-primary-50 px-2 py-0.5 text-caption font-medium text-primary-700">
            {activeCount}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
      {activeCount > 0 && onClear && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
      {onSavePreset && (
        <Button variant="outline" size="sm" onClick={onSavePreset}>
          Save preset
        </Button>
      )}
    </div>
  );
}
