"use client";

/**
 * MadrashaOS — StudentMarkCard (Session C3.3)
 *
 * Mobile-first card used by the Enter Marks screen (/exams/[id]/marks).
 * One student at a time: avatar, name, roll, and a NumberInput for marks.
 *
 * Validation: if marks > fullMarks, inline error and Next button is blocked.
 */

import type { Student } from "@/lib/mock/types";
import type { Locale } from "@/lib/i18n/config";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NumberInput } from "@/components/ui/number-input";
import { Badge } from "@/components/ui/badge";

function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function StudentMarkCard({
  student,
  locale,
  marks,
  onMarksChange,
  fullMarks,
  index,
  total,
}: {
  student: Student;
  locale: Locale;
  marks: number | undefined;
  onMarksChange: (value: number | undefined) => void;
  fullMarks: number;
  index: number;
  total: number;
}) {
  const displayName = locale === "bn" ? student.nameBn : student.name;
  const marksValue = typeof marks === "number" ? marks : 0;
  const exceeds = marks !== undefined && marks > fullMarks;
  const errorText = exceeds
    ? `Mark exceeds full marks (${fullMarks})`
    : undefined;

  return (
    <div
      data-slot="student-mark-card"
      className="rounded-xl border border-border-default bg-surface-card p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 shrink-0">
          <AvatarFallback className="bg-primary-50 text-subtitle font-semibold text-primary-700">
            {initials(displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-subtitle font-semibold text-text-primary">
            {displayName}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-caption">
              Roll {student.roll}
            </Badge>
            <Badge variant="outline" className="text-caption">
              {student.code}
            </Badge>
            <span className="text-caption text-text-muted">
              Student {index + 1} of {total}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <NumberInput
          label={`Marks obtained (out of ${fullMarks})`}
          value={marksValue}
          onValueChange={onMarksChange}
          min={0}
          max={fullMarks}
          showStepper
          error={errorText}
          helper={
            !errorText
              ? "Enter marks between 0 and " + fullMarks
              : undefined
          }
          inputMode="numeric"
        />
      </div>
    </div>
  );
}
