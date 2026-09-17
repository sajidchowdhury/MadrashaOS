"use client";

/**
 * MadrashaOS — NumberInput (Session 1.3 #5)
 *
 * Numeric input with optional stepper (+/- buttons). Validates min/max.
 * Pairs with a visible label (P1 progressive disclosure — never
 * placeholder-only).
 */

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type NumberInputProps = Omit<
  React.ComponentProps<"input">,
  "type" | "onChange"
> & {
  label?: string;
  helper?: string;
  error?: string;
  showStepper?: boolean;
  onValueChange?: (value: number | undefined) => void;
};

export function NumberInput({
  label,
  helper,
  error,
  showStepper = false,
  onValueChange,
  className,
  id,
  min,
  max,
  step = 1,
  ...props
}: NumberInputProps) {
  const generatedId = React.useId();
  const inputId = id || generatedId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  function handleStep(delta: number) {
    const current = Number(props.value) || 0;
    const next = current + delta * (typeof step === "number" ? step : 1);
    const clamped =
      typeof min === "number" && next < min
        ? min
        : typeof max === "number" && next > max
          ? max
          : next;
    onValueChange?.(clamped);
  }

  return (
    <div className="w-full" data-slot="number-input-wrapper">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-subtitle font-medium text-text-primary"
        >
          {label}
        </label>
      )}
      <div className="flex items-stretch">
        {showStepper && (
          <button
            type="button"
            onClick={() => handleStep(-1)}
            className="flex items-center justify-center rounded-s-md border border-e-0 border-border-strong bg-surface-card px-3 text-text-secondary transition-colors hover:bg-surface-hover"
            aria-label="Decrease"
          >
            <Minus className="h-4 w-4" />
          </button>
        )}
        <input
          id={inputId}
          type="number"
          min={min}
          max={max}
          step={step}
          aria-describedby={
            error ? errorId : helper ? helperId : undefined
          }
          aria-invalid={!!error}
          className={cn(
            "flex h-10 w-full rounded-md border border-border-strong bg-surface-card px-3 py-2 text-body text-text-primary transition-colors",
            "placeholder:text-text-muted focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30",
            "disabled:cursor-not-allowed disabled:opacity-50",
            showStepper && "rounded-none",
            error &&
              "border-semantic-danger focus:border-semantic-danger focus:ring-semantic-danger/30",
            className,
          )}
          onChange={(e) => {
            const val = e.target.value === "" ? undefined : Number(e.target.value);
            onValueChange?.(val);
            props.onChange?.(e);
          }}
          {...props}
        />
        {showStepper && (
          <button
            type="button"
            onClick={() => handleStep(1)}
            className="flex items-center justify-center rounded-e-md border border-s-0 border-border-strong bg-surface-card px-3 text-text-secondary transition-colors hover:bg-surface-hover"
            aria-label="Increase"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
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
