"use client";

/**
 * MadrashaOS — Chip (Session 1.3 #18)
 *
 * Removable or static chip for filters and applied facets.
 * Variants: removable (with X button) / static / filter (toggleable)
 */

import * as React from "react";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const chipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-medium transition-colors",
  {
    variants: {
      tone: {
        neutral: "bg-neutral-100 text-text-primary",
        primary: "bg-primary-50 text-primary-700",
        accent: "bg-accent-50 text-accent-700",
        success: "bg-success-50 text-semantic-success",
        warning: "bg-warning-50 text-semantic-warning",
        danger: "bg-danger-50 text-semantic-danger",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

type ChipProps = React.ComponentProps<"span"> &
  VariantProps<typeof chipVariants> & {
    onRemove?: () => void;
    removable?: boolean;
  };

export function Chip({
  children,
  className,
  tone,
  removable = false,
  onRemove,
  ...props
}: ChipProps) {
  return (
    <span
      data-slot="chip"
      className={cn(chipVariants({ tone }), className)}
      {...props}
    >
      {children}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-4 w-4 items-center justify-center rounded-full transition-colors hover:bg-black/10"
          aria-label="Remove"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

export { chipVariants };
