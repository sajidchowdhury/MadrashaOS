"use client";

/**
 * MadrashaOS — Attendance Session List (C3.3 — Academic Module Screen 1)
 *
 * Route: /attendance
 *
 * Lists recent attendance sessions with class, section, date, present/absent
 * counts, and taken-by teacher name. Provides a "Take Attendance" entry
 * point (prominent, primary) gated by IfPermission code="attendance.take".
 *
 * FilterBar with class + date filters. LoadingState pattern="table" while
 * loading. formatDate() for localized dates.
 *
 * Mobile-first: list-style rows stack at 375px; expand to inline rows on sm+.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  useAttendanceSessions,
  useClasses,
  useStudents,
} from "@/lib/query/client";
import { useSessionStore } from "@/stores/sessionStore";
import { formatDate } from "@/lib/i18n/format";
import { users as allUsers } from "@/lib/mock/fixtures/users";
import type { AttendanceSession, Class, User as TUser } from "@/lib/mock/types";

import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { EmptyState } from "@/components/ui/empty-state";
import {
  LoadingState,
  ErrorState,
  PermissionDenied,
} from "@/components/states";
import { IfPermission } from "@/components/auth/IfPermission";
import { AttendanceSessionRow } from "@/components/academic/AttendanceSessionRow";

export default function AttendanceListPage() {
  const router = useRouter();
  const { locale } = useI18n();
  const role = useSessionStore((s) => s.role);

  // Filters
  const [classFilter, setClassFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  // Data
  const sessionsQuery = useAttendanceSessions();
  const classesQuery = useClasses();
  // Warm the students cache so /attendance/take doesn't re-fetch.
  useStudents();

  const classes: Class[] = classesQuery.data ?? [];
  const classById = useMemo(() => {
    const map: Record<string, Class> = {};
    classes.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [classes]);

  const userById = useMemo(() => {
    const map: Record<string, TUser> = {};
    allUsers.forEach((u) => {
      map[u.id] = u;
    });
    return map;
  }, []);

  const sessions: AttendanceSession[] = sessionsQuery.data ?? [];

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (classFilter !== "all" && s.classId !== classFilter) return false;
      if (dateFilter && s.date !== dateFilter) return false;
      return true;
    });
  }, [sessions, classFilter, dateFilter]);

  const activeFilterCount =
    (classFilter !== "all" ? 1 : 0) + (dateFilter ? 1 : 0);

  function handleTakeAttendance() {
    router.push("/attendance/take");
  }

  function handleClearFilters() {
    setClassFilter("all");
    setDateFilter("");
  }

  // Loading
  if (sessionsQuery.isLoading || classesQuery.isLoading) {
    return (
      <PageWrap>
        <Header
          title="Attendance"
          subtitle="Recent sessions · take new attendance for your classes."
        />
        <LoadingState pattern="table" rows={4} />
      </PageWrap>
    );
  }

  // Error
  if (sessionsQuery.isError || classesQuery.isError) {
    const isPerm =
      sessionsQuery.error instanceof Error &&
      sessionsQuery.error.name === "PermissionDeniedError";
    if (isPerm) {
      return (
        <PageWrap>
          <Header title="Attendance" subtitle="" />
          <PermissionDenied resource="Attendance" />
        </PageWrap>
      );
    }
    return (
      <PageWrap>
        <Header title="Attendance" subtitle="" />
        <ErrorState onRetry={() => sessionsQuery.refetch()} />
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      <Header
        title="Attendance"
        subtitle="Recent sessions · take new attendance for your classes."
        action={
          <IfPermission code="attendance.take">
            <Button
              onClick={handleTakeAttendance}
              className="w-full sm:w-auto"
              size="default"
            >
              <Plus className="h-4 w-4" />
              Take Attendance
            </Button>
          </IfPermission>
        }
      />

      <FilterBar
        activeCount={activeFilterCount}
        onClear={activeFilterCount > 0 ? handleClearFilters : undefined}
      >
        <label className="flex items-center gap-1.5 text-caption text-text-secondary">
          <span className="sr-only">Filter by class</span>
          <select
            aria-label="Filter by class"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="h-9 rounded-md border border-border-strong bg-surface-card px-3 text-body text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          >
            <option value="all">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {locale === "bn" ? c.nameBn : c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-caption text-text-secondary">
          <span className="sr-only">Filter by date</span>
          <input
            type="date"
            aria-label="Filter by date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-9 rounded-md border border-border-strong bg-surface-card px-3 text-body text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
        </label>
        <span className="ms-auto text-caption text-text-muted">
          {filtered.length} session{filtered.length === 1 ? "" : "s"}
        </span>
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState
          illustration="attendance"
          title="No attendance sessions"
          description={
            activeFilterCount > 0
              ? "No sessions match your filters. Try clearing them."
              : "Tap “Take Attendance” to record your first session."
          }
          action={
            <IfPermission code="attendance.take">
              <Button onClick={handleTakeAttendance}>
                <ClipboardCheck className="h-4 w-4" />
                Take Attendance
              </Button>
            </IfPermission>
          }
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((session) => (
            <AttendanceSessionRow
              key={session.id}
              session={session}
              cls={classById[session.classId]}
              takenBy={userById[session.takenBy]}
              locale={locale}
            />
          ))}
        </ul>
      )}

      <p className="text-caption text-text-muted">
        Signed in as{" "}
        <span className="font-medium text-text-secondary">{role}</span> ·{" "}
        {formatDate(new Date(), locale)}
      </p>
    </PageWrap>
  );
}

function PageWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        {children}
      </div>
    </div>
  );
}

function Header({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-display font-bold text-text-primary">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-body text-text-secondary">{subtitle}</p>
        )}
      </div>
      {action}
    </header>
  );
}
