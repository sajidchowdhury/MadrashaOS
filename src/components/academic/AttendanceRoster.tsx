"use client";

/**
 * MadrashaOS — AttendanceRoster (Session C3.3)
 *
 * Mobile-first roster used by the Take Attendance screen (/attendance/take).
 * Each student row: avatar initials, name, and a single status toggle
 * button that cycles Present → Absent → Late → Leave → Present.
 *
 * Risk R6 lock-in (single-tap cycle, no modals, default = Present),
 * tuned for 375px viewport width.
 */

import { Check, X, Clock, CalendarOff } from "lucide-react";
import type { Student } from "@/lib/mock/types";
import type { Locale } from "@/lib/i18n/config";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/utils";

export type AttendanceStatus = "present" | "absent" | "late" | "leave";

const STATUS_CYCLE: AttendanceStatus[] = ["present", "absent", "late", "leave"];

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  leave: "Leave",
};

const STATUS_TONE: Record<
  AttendanceStatus,
  "success" | "danger" | "warning" | "neutral"
> = {
  present: "success",
  absent: "danger",
  late: "warning",
  leave: "neutral",
};

const STATUS_ICON: Record<AttendanceStatus, typeof Check> = {
  present: Check,
  absent: X,
  late: Clock,
  leave: CalendarOff,
};

function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AttendanceRosterRow({
  student,
  status,
  onCycle,
  locale,
}: {
  student: Student;
  status: AttendanceStatus;
  onCycle: () => void;
  locale: Locale;
}) {
  const displayName = locale === "bn" ? student.nameBn : student.name;
  const Icon = STATUS_ICON[status];
  const tone = STATUS_TONE[status];

  // Visual feedback for the whole row based on status (left border accent)
  const rowAccent = {
    present: "border-s-2 border-s-semantic-success",
    absent: "border-s-2 border-s-semantic-danger",
    late: "border-s-2 border-s-semantic-warning",
    leave: "border-s-2 border-s-neutral-300",
  }[status];

  return (
    <li
      data-slot="attendance-roster-row"
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border border-border-default bg-surface-card p-3 shadow-sm transition-colors hover:bg-surface-hover",
        rowAccent,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className="bg-primary-50 text-caption font-semibold text-primary-700">
            {initials(displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-medium text-text-primary">
            {displayName}
          </p>
          <p className="text-caption text-text-muted">
            Roll {student.roll} · {student.code}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onCycle}
        aria-label={`Toggle attendance for ${displayName}. Current: ${STATUS_LABEL[status]}. Tap to switch to next status.`}
        aria-pressed={status === "present"}
        className={cn(
          "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-caption font-semibold transition-all active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40",
          tone === "success" &&
            "border-semantic-success/30 bg-success-50 text-semantic-success hover:bg-success-50/80",
          tone === "danger" &&
            "border-semantic-danger/30 bg-danger-50 text-semantic-danger hover:bg-danger-50/80",
          tone === "warning" &&
            "border-semantic-warning/30 bg-warning-50 text-semantic-warning hover:bg-warning-50/80",
          tone === "neutral" &&
            "border-neutral-300 bg-neutral-100 text-text-primary hover:bg-neutral-100/80",
        )}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{STATUS_LABEL[status]}</span>
      </button>
    </li>
  );
}

/**
 * Summary chip strip shown above the roster — counts per status.
 */
export function AttendanceStatusSummary({
  records,
}: {
  records: Record<string, AttendanceStatus>;
}) {
  const counts = { present: 0, absent: 0, late: 0, leave: 0 };
  for (const s of Object.values(records)) counts[s]++;
  return (
    <div
      data-slot="attendance-status-summary"
      className="flex flex-wrap items-center gap-1.5"
      aria-label="Attendance summary"
    >
      <Chip tone="success">Present · {counts.present}</Chip>
      <Chip tone="danger">Absent · {counts.absent}</Chip>
      <Chip tone="warning">Late · {counts.late}</Chip>
      <Chip tone="neutral">Leave · {counts.leave}</Chip>
    </div>
  );
}

export { STATUS_CYCLE, STATUS_LABEL, STATUS_TONE };
