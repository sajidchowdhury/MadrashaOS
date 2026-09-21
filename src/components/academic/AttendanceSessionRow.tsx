"use client";

/**
 * MadrashaOS — AttendanceSessionRow (Session C3.3)
 *
 * A single row in the Attendance Session list (/attendance).
 * Shows class, section, date, present/absent counts, taken-by teacher name.
 * Mobile-first: stacked layout at 375px, inline row on sm+.
 */

import { CalendarDays, User } from "lucide-react";
import type { AttendanceSession, Class, User as TUser } from "@/lib/mock/types";
import { formatDate } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/config";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";

export function AttendanceSessionRow({
  session,
  cls,
  takenBy,
  locale,
}: {
  session: AttendanceSession;
  cls?: Class;
  takenBy?: TUser;
  locale: Locale;
}) {
  const present = session.records.filter((r) => r.status === "present").length;
  const absent = session.records.filter((r) => r.status === "absent").length;
  const late = session.records.filter((r) => r.status === "late").length;
  const leave = session.records.filter((r) => r.status === "leave").length;

  const className = cls
    ? locale === "bn"
      ? cls.nameBn
      : cls.name
    : session.classId;
  const dateLabel = formatDate(new Date(session.date), locale);
  const teacherName = takenBy
    ? locale === "bn"
      ? takenBy.nameBn
      : takenBy.name
    : session.takenBy;

  return (
    <li
      data-slot="attendance-session-row"
      className="flex flex-col gap-3 rounded-lg border border-border-default bg-surface-card p-4 transition-colors hover:bg-surface-hover sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700">
          <CalendarDays className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold text-text-primary">
            {className} · Section {session.section}
          </p>
          <p className="mt-0.5 text-caption text-text-secondary">{dateLabel}</p>
          <div className="mt-1 flex items-center gap-1.5 text-caption text-text-muted">
            <User className="h-3 w-3" aria-hidden="true" />
            <span className="truncate">{teacherName}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap sm:justify-end">
        <Chip tone="success">P {present}</Chip>
        <Chip tone="danger">A {absent}</Chip>
        {late > 0 && <Chip tone="warning">L {late}</Chip>}
        {leave > 0 && <Chip tone="neutral">Lv {leave}</Chip>}
      </div>
    </li>
  );
}

/**
 * Renders the taken-by avatar block. Kept separate so the list row
 * stays simple; useful for detail views.
 */
export function AttendanceTakenByAvatar({
  takenBy,
  locale,
}: {
  takenBy?: TUser;
  locale: Locale;
}) {
  const name = takenBy
    ? locale === "bn"
      ? takenBy.nameBn
      : takenBy.name
    : "—";
  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-7 w-7">
        <AvatarFallback className="bg-primary-50 text-caption font-semibold text-primary-700">
          {takenBy?.avatarInitial ?? "?"}
        </AvatarFallback>
      </Avatar>
      <span className="text-caption text-text-secondary">{name}</span>
    </div>
  );
}
