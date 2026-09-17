"use client";

/**
 * MadrashaOS — People Module Components (Phase C3.2)
 *
 * Shared presentational + helper components for the People module
 * (Students, Admission, Teachers). Used across the 4 People routes:
 *   /students, /students/[id], /admission, /teachers
 *
 * Design rules:
 *   - Uses ONLY FROZEN tokens (bg-primary-500, text-text-primary, etc.) — no raw hex/px
 *   - All interactive elements have visible focus states
 *   - Localized where appropriate (delegates to useI18n for labels)
 *   - Role-gated UI uses <IfPermission> wrapper from src/components/auth
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Student } from "@/lib/mock/types";

/* ---------------------------------------------------------------
 * StudentStatusBadge — active/graduated/withdrawn semantic badge
 * --------------------------------------------------------------- */

export type StudentStatus = "active" | "graduated" | "withdrawn";

const STATUS_TONE: Record<
  StudentStatus,
  { label: string; className: string }
> = {
  active: {
    label: "Active",
    className:
      "bg-success-50 text-semantic-success border-transparent",
  },
  graduated: {
    label: "Graduated",
    className:
      "bg-primary-50 text-primary-700 border-transparent",
  },
  withdrawn: {
    label: "Withdrawn",
    className:
      "bg-neutral-100 text-text-secondary border-transparent",
  },
};

export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  const tone = STATUS_TONE[status] ?? STATUS_TONE.active;
  return (
    <Badge variant="outline" className={tone.className}>
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full bg-current"
      />
      {tone.label}
    </Badge>
  );
}

/* ---------------------------------------------------------------
 * StudentAvatar — Avatar showing initials (auto from name)
 * --------------------------------------------------------------- */

export function StudentAvatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const initials = React.useMemo(() => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
    return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
  }, [name]);

  const sizeClass = {
    sm: "size-8 text-caption",
    md: "size-10 text-subtitle",
    lg: "size-16 text-display",
  }[size];

  return (
    <Avatar className={cn(sizeClass, "bg-primary-50", className)}>
      <AvatarFallback className="bg-primary-50 font-semibold text-primary-700">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

/* ---------------------------------------------------------------
 * InfoRow — label + value row (used in profile tabs)
 * --------------------------------------------------------------- */

export function InfoRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 py-2 sm:grid-cols-3 sm:gap-4 sm:py-3">
      <dt className="text-caption font-medium uppercase tracking-wide text-text-muted">
        {label}
      </dt>
      <dd className="text-body text-text-primary sm:col-span-2">
        {value}
        {hint && (
          <span className="ms-2 text-caption text-text-muted">· {hint}</span>
        )}
      </dd>
    </div>
  );
}

/* ---------------------------------------------------------------
 * PastClassChip — Risk R4 "past chips" (history lock-in)
 *
 * Shows a previous class assignment as a chip with a small
 * "past" indicator (dot + label). Never rendered as deleted.
 * --------------------------------------------------------------- */

export function PastClassChip({
  label,
  period,
}: {
  label: string;
  period: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border-strong bg-surface-card px-3 py-1 text-caption text-text-secondary"
      title={`Previous assignment: ${label} (${period})`}
    >
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full bg-text-muted"
      />
      <span className="font-medium">{label}</span>
      <span className="text-text-muted">· {period}</span>
    </span>
  );
}

/* ---------------------------------------------------------------
 * StudentRowSkeleton — single row placeholder for the table
 * --------------------------------------------------------------- */

export function StudentRowSkeleton() {
  return (
    <tr className="border-b border-border-default">
      <td className="p-3">
        <div className="h-4 w-20 animate-pulse rounded bg-neutral-200" />
      </td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <div className="size-8 animate-pulse rounded-full bg-neutral-200" />
          <div className="space-y-1">
            <div className="h-3 w-28 animate-pulse rounded bg-neutral-200" />
            <div className="h-2 w-20 animate-pulse rounded bg-neutral-100" />
          </div>
        </div>
      </td>
      <td className="p-3">
        <div className="h-3 w-24 animate-pulse rounded bg-neutral-200" />
      </td>
      <td className="p-3">
        <div className="h-3 w-28 animate-pulse rounded bg-neutral-200" />
      </td>
      <td className="p-3">
        <div className="h-5 w-16 animate-pulse rounded-full bg-neutral-200" />
      </td>
      <td className="p-3">
        <div className="h-7 w-16 animate-pulse rounded bg-neutral-200" />
      </td>
    </tr>
  );
}

/* ---------------------------------------------------------------
 * buildDisplayName — Bangla/Arabic name subtitle helper
 *
 * Returns the localized secondary name (Bangla first, Arabic as
 * tertiary hint) for a student. Returns null if neither is present.
 * --------------------------------------------------------------- */

export function buildNameSubtitle(student: Student): string | null {
  const parts: string[] = [];
  if (student.nameBn && student.nameBn !== student.name) {
    parts.push(student.nameBn);
  }
  if (student.nameAr && student.nameAr !== student.name) {
    parts.push(student.nameAr);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}
