"use client";

/**
 * MadrashaOS — Take Attendance (C3.3 — Academic Module Screen 2)
 *
 * Route: /attendance/take
 *
 * THE KEY MOBILE-FIRST SCREEN. Must work at 375px viewport width.
 *
 * Risk R6 lock-in:
 *   - Default status = Present (one-tap cycle: P → A → L → Lv → P)
 *   - Single-tap action (no modals, no drop-downs)
 *   - Sticky "Present All" + "Submit" buttons
 *   - Timer showing elapsed seconds (verify <60s for 40 students)
 *   - Idempotency-Key header visual indicator (Key icon + tooltip)
 *   - Optimistic local state via useState
 *   - 30-second undo window after submit (Toast with "Undo" action button)
 *
 * Offline handling:
 *   - When sessionStore.network === "offline", show OfflineState banner and
 *     queue the submit (keep records local; show "Queued for sync" state).
 *
 * Permission gate:
 *   - IfPermission code="attendance.take" wraps the whole screen.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCheck,
  Key,
  Clock,
  Send,
  RotateCcw,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useStudentsByClass } from "@/lib/query/client";
import { useSessionStore } from "@/stores/sessionStore";
import { formatDateLong, convertDigits } from "@/lib/i18n/format";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import {
  LoadingState,
  ErrorState,
  OfflineState,
  PermissionDenied,
} from "@/components/states";
import { IfPermission } from "@/components/auth/IfPermission";
import {
  AttendanceRosterRow,
  AttendanceStatusSummary,
  STATUS_CYCLE,
  type AttendanceStatus,
} from "@/components/academic/AttendanceRoster";

// The famous Class 5-A from SRS Risk R6 — 12 students, our default target.
const CLASS_ID = "cls-5";
const SECTION = "A";
const UNDO_WINDOW_MS = 30_000;

export default function TakeAttendancePage() {
  return (
    <IfPermission
      code="attendance.take"
      fallback={<PermissionDenied resource="Take Attendance" />}
    >
      <TakeAttendanceContent />
    </IfPermission>
  );
}

function TakeAttendanceContent() {
  const router = useRouter();
  const { locale } = useI18n();
  const network = useSessionStore((s) => s.network);

  const studentsQuery = useStudentsByClass(CLASS_ID, SECTION);
  const students = studentsQuery.data ?? [];

  // Optimistic local state — Record<studentId, status> — default = present.
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({});
  const [submittedAt, setSubmittedAt] = useState<number | null>(null);
  const [queued, setQueued] = useState(false);

  // Elapsed timer (seconds). Starts at 0; stops when submitted.
  const startTimeRef = useRef<number>(Date.now());
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (submittedAt !== null) return; // stop ticking once submitted
    const id = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [submittedAt]);

  // Initialize all-present defaults when the roster arrives.
  useEffect(() => {
    if (students.length === 0) return;
    setRecords((prev) => {
      const next: Record<string, AttendanceStatus> = {};
      for (const s of students) {
        next[s.id] = prev[s.id] ?? "present";
      }
      return next;
    });
  }, [students]);

  const idempotencyKey = useMemo(() => {
    // Visual concept only: a short hash of classId/section/today.
    // In production this would be a UUID per attempt; here we just show
    // a key icon and a deterministic short token.
    const today = new Date().toISOString().slice(0, 10);
    return `att-${CLASS_ID}-${SECTION}-${today}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  }, []);

  const cycleStatus = useCallback((studentId: string) => {
    setRecords((prev) => {
      const current = prev[studentId] ?? "present";
      const idx = STATUS_CYCLE.indexOf(current);
      const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
      return { ...prev, [studentId]: next };
    });
    // Reset the undo/queued state if the user edits after a submit.
    setSubmittedAt(null);
    setQueued(false);
  }, []);

  const presentAll = useCallback(() => {
    setRecords((prev) => {
      const next: Record<string, AttendanceStatus> = {};
      for (const s of students) {
        next[s.id] = "present";
      }
      return { ...prev, ...next };
    });
    setSubmittedAt(null);
    setQueued(false);
  }, [students]);

  const summary = useMemo(() => {
    let present = 0, absent = 0, late = 0, leave = 0;
    for (const status of Object.values(records)) {
      if (status === "present") present++;
      else if (status === "absent") absent++;
      else if (status === "late") late++;
      else leave++;
    }
    return { present, absent, late, leave };
  }, [records]);

  const { toast } = useToast();

  const handleSubmit = useCallback(() => {
    if (network === "offline") {
      // Risk R6: queue the submit; user can leave the screen, the
      // records stay in local state until reconnect (conceptually).
      setQueued(true);
      toast({
        title: "Queued for sync",
        description: `You're offline — ${summary.present} Present, ${summary.absent} Absent will be sent when you reconnect.`,
        duration: UNDO_WINDOW_MS,
      });
      return;
    }

    setSubmittedAt(Date.now());
    const snapshot = { ...records };
    const toastRef = toast({
      title: "Attendance submitted",
      description: `${summary.present} Present · ${summary.absent} Absent · ${summary.late} Late · ${summary.leave} Leave`,
      duration: UNDO_WINDOW_MS,
      action: (
        <ToastAction
          altText="Undo"
          onClick={() => {
            setRecords(snapshot);
            setSubmittedAt(null);
            // Restart the elapsed timer.
            startTimeRef.current = Date.now();
            setElapsedSec(0);
            toastRef.dismiss();
            toast({
              title: "Submission undone",
              description: "Records restored — make your changes and resubmit.",
            });
          }}
        >
          Undo
        </ToastAction>
      ),
    });
  }, [network, records, summary, toast]);

  // Loading
  if (studentsQuery.isLoading) {
    return (
      <PageWrap>
        <BackHeader />
        <LoadingState pattern="list" rows={6} />
      </PageWrap>
    );
  }

  // Error
  if (studentsQuery.isError) {
    const err = studentsQuery.error;
    const isPerm = err instanceof Error && err.name === "PermissionDeniedError";
    const isNetwork = err instanceof Error && err.name === "NetworkError";
    return (
      <PageWrap>
        <BackHeader />
        {isPerm ? (
          <PermissionDenied resource="Student roster" />
        ) : isNetwork ? (
          <div className="space-y-4">
            <OfflineState />
            <Button
              variant="outline"
              onClick={() => router.push("/attendance")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to attendance
            </Button>
          </div>
        ) : (
          <ErrorState onRetry={() => studentsQuery.refetch()} />
        )}
      </PageWrap>
    );
  }

  const isSubmitted = submittedAt !== null;
  const totalStudents = students.length;
  const editedCount = Object.keys(records).length;

  return (
    <PageWrap>
      <BackHeader />

      <header className="rounded-xl border border-border-default bg-surface-card p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-subtitle font-bold text-text-primary">
              Class 5 · Section {SECTION}
            </h1>
            <p className="mt-0.5 text-caption text-text-secondary">
              {formatDateLong(new Date(), locale)}
            </p>
            <p className="mt-1 text-caption text-text-muted">
              {totalStudents} students · {editedCount} marked
            </p>
          </div>

          {/* Elapsed timer (verifies <60s for 40 students per Risk R6) */}
          <div
            className="flex shrink-0 flex-col items-end rounded-lg border border-border-default bg-neutral-50 px-3 py-1.5"
            aria-label={`Elapsed time: ${elapsedSec} seconds`}
          >
            <div className="flex items-center gap-1.5 text-caption text-text-muted">
              <Clock className="h-3 w-3" aria-hidden="true" />
              Elapsed
            </div>
            <span
              className={`font-mono text-subtitle font-bold ${
                elapsedSec > 60 ? "text-semantic-danger" : "text-primary-700"
              }`}
            >
              {convertDigits(String(elapsedSec), locale)}s
            </span>
          </div>
        </div>

        {/* Idempotency-Key indicator */}
        <div className="mt-3 flex items-center gap-2 border-t border-border-default pt-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="inline-flex cursor-help items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-caption font-medium text-primary-700"
                tabIndex={0}
              >
                <Key className="h-3 w-3" aria-hidden="true" />
                Idempotent
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-caption">
                Each submission carries an Idempotency-Key so retries are safe.
                Key: <span className="font-mono">{idempotencyKey}</span>
              </p>
            </TooltipContent>
          </Tooltip>
          <span className="text-caption text-text-muted">
            Retapping Submit with the same key won&apos;t duplicate records.
          </span>
        </div>
      </header>

      {network === "offline" && <OfflineState />}

      {isSubmitted && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-lg border border-semantic-success/40 bg-success-50 px-4 py-3"
        >
          <CheckCheck className="h-5 w-5 shrink-0 text-semantic-success" />
          <div>
            <p className="text-subtitle font-medium text-text-primary">
              Submitted · {summary.present} Present, {summary.absent} Absent
            </p>
            <p className="text-caption text-text-secondary">
              Tap Undo in the toast within 30s to revert.
            </p>
          </div>
        </div>
      )}

      {queued && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-lg border border-semantic-warning/40 bg-warning-50 px-4 py-3"
        >
          <RotateCcw className="h-5 w-5 shrink-0 text-semantic-warning" />
          <div>
            <p className="text-subtitle font-medium text-text-primary">
              Queued for sync
            </p>
            <p className="text-caption text-text-secondary">
              Your records will be sent when you reconnect.
            </p>
          </div>
        </div>
      )}

      <AttendanceStatusSummary records={records} />

      {students.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-default bg-surface-card p-8 text-center">
          <p className="text-body text-text-secondary">
            No students in this class.
          </p>
        </div>
      ) : (
        <ul
          className="max-h-[calc(100vh-26rem)] space-y-2 overflow-y-auto pe-1"
          style={{ scrollbarWidth: "thin" }}
        >
          {students.map((student) => (
            <AttendanceRosterRow
              key={student.id}
              student={student}
              status={records[student.id] ?? "present"}
              onCycle={() => cycleStatus(student.id)}
              locale={locale}
            />
          ))}
        </ul>
      )}

      {/* Sticky action bar — also a mobile CTA anchor/target for the shell-level MobileBottomActionBar */}
      <div
        data-mobile-cta-anchor
        className="sticky bottom-0 z-20 -mx-4 border-t border-border-default bg-surface-card px-4 py-3 backdrop-blur md:-mx-8 md:px-8"
      >
        <div className="mx-auto flex max-w-[var(--grid-max-width)] items-center gap-2">
          <Button
            variant="outline"
            onClick={presentAll}
            disabled={isSubmitted || queued}
            className="flex-1 sm:flex-none"
            aria-label="Mark all students as present"
          >
            <CheckCheck className="h-4 w-4" />
            Present All
          </Button>
          <Button
            data-mobile-cta-target
            onClick={handleSubmit}
            disabled={isSubmitted || queued || students.length === 0}
            className="flex-1"
            aria-label="Submit attendance"
          >
            <Send className="h-4 w-4" />
            {queued ? "Queued" : isSubmitted ? "Submitted" : "Submit"}
          </Button>
        </div>
      </div>
    </PageWrap>
  );
}

function PageWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-4 pb-24">
        {children}
      </div>
    </div>
  );
}

function BackHeader() {
  const router = useRouter();
  return (
    <header className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Back to attendance list"
        onClick={() => router.push("/attendance")}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <h1 className="text-subtitle font-semibold text-text-primary">
        Take Attendance
      </h1>
    </header>
  );
}
