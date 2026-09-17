"use client";

/**
 * MadrashaOS — FieldRow (Session 1.3 #30)
 *
 * Form layout primitive — stacks a label + input + helper/error
 * in a consistent vertical or inline row. Used by every form.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export function FieldRow({
  label,
  htmlFor,
  helper,
  error,
  required = false,
  layout = "stacked",
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  helper?: string;
  error?: string;
  required?: boolean;
  layout?: "stacked" | "inline";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="field-row"
      className={cn(
        layout === "inline"
          ? "flex items-center justify-between gap-4"
          : "flex flex-col gap-1.5",
        className,
      )}
    >
      {label && (
        <label
          htmlFor={htmlFor}
          className={cn(
            "text-subtitle font-medium text-text-primary",
            layout === "inline" && "shrink-0",
          )}
        >
          {label}
          {required && <span className="ms-1 text-semantic-danger">*</span>}
        </label>
      )}
      <div className={cn(layout === "inline" && "flex-1")}>{children}</div>
      {error ? (
        <p className="text-caption text-semantic-danger">{error}</p>
      ) : helper ? (
        <p className="text-caption text-text-secondary">{helper}</p>
      ) : null}
    </div>
  );
}
