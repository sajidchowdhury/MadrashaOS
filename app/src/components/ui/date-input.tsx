"use client";

/**
 * MadrashaOS — DateInput (Session 1.3 #6)
 *
 * Date input with optional Bangla calendar toggle. Uses the native
 * <input type="date"> for the picker, plus a locale-aware display layer
 * that converts digits to Bangla/Arabic numerals via the i18n formatters.
 *
 * When `banglaToggle` is true, renders a toggle button that switches
 * the display between western numerals and Bangla numerals (SRS §2.6.6).
 */

import * as React from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatDate } from "@/lib/i18n/format";

type DateInputProps = Omit<
  React.ComponentProps<"input">,
  "type" | "onChange"
> & {
  label?: string;
  helper?: string;
  error?: string;
  banglaToggle?: boolean;
  onValueChange?: (value: string) => void;
};

export function DateInput({
  label,
  helper,
  error,
  banglaToggle = false,
  onValueChange,
  className,
  id,
  ...props
}: DateInputProps) {
  const { locale } = useI18n();
  const generatedId = React.useId();
  const inputId = id || generatedId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const value = typeof props.value === "string" ? props.value : "";

  // Render the localized display string (e.g. "১৬-০৯-২০২৬" for bn)
  const localizedDisplay = value
    ? formatDate(new Date(value + "T00:00:00"), locale)
    : "";

  return (
    <div className="w-full" data-slot="date-input-wrapper">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-subtitle font-medium text-text-primary"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type="date"
          aria-describedby={
            error ? errorId : helper ? helperId : undefined
          }
          aria-invalid={!!error}
          className={cn(
            "flex h-10 w-full rounded-md border border-border-strong bg-surface-card ps-3 pe-10 py-2 text-body text-text-primary transition-colors",
            "placeholder:text-text-muted focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error &&
              "border-semantic-danger focus:border-semantic-danger focus:ring-semantic-danger/30",
            className,
          )}
          onChange={(e) => {
            onValueChange?.(e.target.value);
            props.onChange?.(e);
          }}
          {...props}
        />
        <CalendarDays className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
      </div>
      {banglaToggle && value && (
        <p className="mt-1 text-caption font-mono text-text-muted">
          {localizedDisplay}
        </p>
      )}
      {error ? (
        <p id={errorId} className="mt-1.5 text-caption text-semantic-danger">
          {error}
        </p>
      ) : helper ? (
        <p id={helperId} className="mt-1.5 text-caption text-text-secondary">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
