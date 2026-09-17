"use client";

/**
 * MadrashaOS — IconButton (Session 1.3 #3)
 *
 * Action component for icon-only buttons in tables, cards, and nav.
 * Variants: default / ghost / danger
 * Sizes: sm / md / lg (matching Button size scale)
 * Accessibility: aria-label is REQUIRED (enforced via TypeScript).
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const iconButtonVariants = cva(
  "inline-flex items-center justify-center rounded-md transition-all shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-primary-500/50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary-500 text-primary-foreground shadow-elevation-1 hover:bg-primary-600 active:bg-primary-700",
        ghost:
          "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
        danger:
          "bg-semantic-danger text-danger-foreground shadow-elevation-1 hover:brightness-95 active:brightness-90",
        outline:
          "border border-border-default bg-surface-card text-text-primary hover:bg-surface-hover",
      },
      size: {
        sm: "h-8 w-8",
        md: "h-10 w-10",
        lg: "h-12 w-12",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

type IconButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof iconButtonVariants> & {
    /** Required for a11y — screen readers announce this label. */
    "aria-label": string;
  };

export function IconButton({
  className,
  variant,
  size,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      data-slot="icon-button"
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { iconButtonVariants };
