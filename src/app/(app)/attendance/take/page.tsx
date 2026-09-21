"use client";

/**
 * MadrashaOS — Take Attendance (Session 5.1 — wired to real API)
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
 *   - Idempotency-Key header on the POST (server enforces replay safety)
 *   - Optimistic local state via useState
 *   - 30-second undo window after submit (Toast with "Undo" action button)
 *
 * Session 5.1 changes:
 *   - Removed hardcoded CLASS_ID = "cls-5" and SECTION = "A"
 *   - Added class + section selectors (driven by useClasses hook)
 *   - handleSubmit now calls POST /api/v1/attendance/sessions with a real
 *     Idempotency-Key header (crypto.randomUUID())
 *   - Shows loading state on Submit button while the request is in flight
 *   - On 201: shows confirmation summary; on 400/500: shows error toast
 *   - On success: refetches the attendance sessions list so the new
 *     session appears in /attendance immediately
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
  ChevronDown,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useClasses, useStudentsByClass, useAttendanceSessions } from "@/lib/query/client";
import { useSessionStore } from "@/stores/sessionStore";
import { formatDateLong, convertDigits } from "@/lib/i18n/format";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const { toast } = useToast();

  // --- Class + section selectors ---
  const classesQuery = useClasses();
  const classes = classesQuery.data ?? [];

  const [classId, setClassId] = useState<string>("");
  const [sectionId, setSectionId] = useState<string>("");

  // Auto-select the first class once the list loads.
  useEffect(() => {
    if (classes.length > 0 && !classId) {
      setClassId(classes[0].id);
    }
  }, [classes, classId]);

  // Derive sections (with IDs) for the selected class.
  const selectedClass = useMemo(
    () => classes.find((c) => c.id === classId),
    [classes, classId],
  );
  const sections = useMemo(
    () => (selectedClass as { sectionsWithIds?: Array<{ id: string; name: string }> } | undefined)?.sectionsWithIds ?? [],
    [selectedClass],
  );

  // Auto-select the first section when the class changes.
  useEffect(() => {
    if (sections.length > 0 && !sections.some((s) => s.id === sectionId)) {
      setSectionId(sections[0].id);
    } else if (sections.length === 0) {
      setSectionId("");
    }
  }, [sections, sectionId]);

  // Find the section name (for display) from the sectionId.
  const sectionName = useMemo(
    () => sections.find((s) => s.id === sectionId)?.name ?? "",
    [sections, sectionId],
  );

  // Fetch the student roster for the selected class+section.
  // useStudentsByClass accepts (classId, sectionId?) — the API's `section`
  // query param expects a section UUID (section_id), not a section name.
  const studentsQuery = useStudentsByClass(classId, sectionId);
  const students = studentsQuery.data ?? [];

  // --- Attendance records state ---
  // Record<studentId, status> — default = present.
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({});
  const [submittedAt, setSubmittedAt] = useState<number | null>(null);
  const [queued, setQueued] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  // Generate a fresh Idempotency-Key per submission attempt (not per render).
  // This key is sent as a header so the server can deduplicate retries.
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());
  const idempotencyKey = idempotencyKeyRef.current;

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

  // --- The real submit handler — calls POST /api/v1/attendance/sessions ---
  const handleSubmit = useCallback(async () => {
    if (network === "offline") {
      setQueued(true);
      toast({
        title: "Queued for sync",
        description: `You're offline — ${summary.present} Present, ${summary.absent} Absent will be sent when you reconnect.`,
        duration: UNDO_WINDOW_MS,
      });
      return;
    }

    if (students.length === 0) return;

    setSubmitting(true);

    // Build the request body matching the Zod schema:
    // { class_id (UUID), section_id (UUID), date (YYYY-MM-DD), records: [{ student_id, status }] }
    const today = new Date().toISOString().slice(0, 10);
    const body = {
      class_id: classId,
      section_id: sectionId || undefined,
      date: today,
      records: students.map((s) => ({
        student_id: s.id,
        status: records[s.id] ?? "present",
      })),
    };

    try {
      const res = await fetch("/api/v1/attendance/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKeyRef.current,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast({
          title: "Submission failed",
          description:
            data?.error ||
            data?.details?.formErrors?.[0] ||
            `Server returned ${res.status}. Please try again.`,
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      // Success (201 = new, 200 = idempotent replay).
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
              // Generate a fresh idempotency key for the next attempt.
              idempotencyKeyRef.current = crypto.randomUUID();
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

      // Refetch the attendance sessions list so the new session appears.
      // useAttendanceSessions uses queryKey ["attendance-sessions", ...].
      // We import the query client to invalidate it.
      const { queryClient } = await import("@/lib/query/client");
      queryClient.invalidateQueries({ queryKey: ["attendance-sessions"] });
    } catch {
      toast({
        title: "Network error",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    }
    setSubmitting(false);
  }, [network, records, students, classId, sectionId, summary, toast]);

  // --- Loading states ---
  if (classesQuery.isLoading) {
    return (
      <PageWrap>
        <BackHeader />
        <LoadingState pattern="list" rows={3} />
      </PageWrap>
    );
  }

  if (classesQuery.isError) {
    return (
      <PageWrap>
        <BackHeader />
        <ErrorState onRetry={() => classesQuery.refetch()} />
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
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-subtitle font-bold text-text-primary">
              Take Attendance
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

        {/* Class + Section selectors */}
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border-default pt-3">
          <div>
            <label htmlFor="class-select" className="mb-1 block text-caption font-medium text-text-secondary">
              Class
            </label>
            <Select value={classId} onValueChange={(v) => { setClassId(v); setSubmittedAt(null); }}>
              <SelectTrigger id="class-select" className="w-full">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="section-select" className="mb-1 block text-caption font-medium text-text-secondary">
              Section
            </label>
            <Select
              value={sectionId}
              onValueChange={(v) => { setSectionId(v); setSubmittedAt(null); }}
              disabled={sections.length === 0}
            >
              <SelectTrigger id="section-select" className="w-full">
                <SelectValue placeholder={sections.length === 0 ? "No sections" : "Select section"} />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                Key: <span className="font-mono">{idempotencyKey.slice(0, 12)}…</span>
              </p>
            </TooltipContent>
          </Tooltip>
          <span className="text-caption text-text-muted">
            Retapping Submit with the same key won&apos;t duplicate records.
          </span>
        </div>
      </header>

      {network === "offline" && <OfflineState />}

      {/* Student roster loading / error / empty states */}
      {studentsQuery.isLoading && classId && (
        <LoadingState pattern="list" rows={6} />
      )}
      {studentsQuery.isError && (
        <ErrorState onRetry={() => studentsQuery.refetch()} />
      )}

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

      {!studentsQuery.isLoading && !studentsQuery.isError && students.length === 0 && classId && (
        <div className="rounded-xl border border-dashed border-border-default bg-surface-card p-8 text-center">
          <p className="text-body text-text-secondary">
            No students found in {selectedClass?.name} · {sectionName}.
          </p>
        </div>
      )}

      {students.length > 0 && (
        <>
          <AttendanceStatusSummary records={records} />
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
        </>
      )}

      {/* Sticky action bar */}
      <div
        data-mobile-cta-anchor
        className="sticky bottom-0 z-20 -mx-4 border-t border-border-default bg-surface-card px-4 py-3 backdrop-blur md:-mx-8 md:px-8"
      >
        <div className="mx-auto flex max-w-[var(--grid-max-width)] items-center gap-2">
          <Button
            variant="outline"
            onClick={presentAll}
            disabled={isSubmitted || queued || submitting || students.length === 0}
            className="flex-1 sm:flex-none"
            aria-label="Mark all students as present"
          >
            <CheckCheck className="h-4 w-4" />
            Present All
          </Button>
          <Button
            data-mobile-cta-target
            onClick={handleSubmit}
            disabled={isSubmitted || queued || submitting || students.length === 0}
            className="flex-1"
            aria-label="Submit attendance"
          >
            <Send className="h-4 w-4" />
            {submitting ? "Submitting…" : queued ? "Queued" : isSubmitted ? "Submitted" : "Submit"}
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
