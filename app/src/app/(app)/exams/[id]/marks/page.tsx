"use client";

/**
 * MadrashaOS — Enter Marks (Session 5.3 — wired to real API)
 *
 * Route: /exams/[id]/marks
 *
 * THE MOBILE-FIRST MARKS ENTRY. Must work at 375px viewport width.
 *
 * Pattern: One student at a time (swipe-next on mobile).
 *   - Exam header: name + class + subject at top (fetched from GET /api/v1/exams/:id)
 *   - Progress bar: "Student 3 of 12"
 *   - StudentMarkCard with NumberInput (stepper) for marks
 *   - VALIDATION: if marks > full_marks, inline error and Next is blocked
 *   - "Next" button → advance to next student
 *   - "Save & Submit" appears on the last student → calls PUT /api/v1/exams/:id/marks
 *   - IfPermission code="exams.enter-marks" gates the page
 *
 * Session 5.3 changes:
 *   - Removed inline EXAM_CATALOGUE mock — now fetches the real exam via useExam(id)
 *   - Fetches existing marks via useExamMarks(id) so previously-saved marks
 *     are pre-filled when the teacher returns
 *   - Fetches the real student roster via useStudentsByClass(exam.classId)
 *   - handleSaveAndSubmit now calls PUT /api/v1/exams/:id/marks with the
 *     real marks array
 *   - Handles 200 (saved), 400 (validation), 403 (no permission), 409 (published)
 *   - Shows loading state on the Save & Submit button
 */

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Save } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useStudentsByClass, useExam, useExamMarks } from "@/lib/query/client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  LoadingState,
  ErrorState,
  PermissionDenied,
} from "@/components/states";
import { IfPermission } from "@/components/auth/IfPermission";
import { StudentMarkCard } from "@/components/academic/StudentMarkCard";

export default function EnterMarksPage() {
  return (
    <IfPermission
      code="exams.enter-marks"
      fallback={<PermissionDenied resource="Enter Marks" />}
    >
      <EnterMarksContent />
    </IfPermission>
  );
}

function EnterMarksContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { locale } = useI18n();
  const { toast } = useToast();

  const examId = params?.id ?? "";
  const examQuery = useExam(examId);
  const marksQuery = useExamMarks(examId);

  // Exam data (camelCase after toCamel transform)
  const exam = examQuery.data as {
    id: string;
    name: string;
    classId?: string;
    className?: string;
    subjectId?: string;
    subjectName?: string | null;
    fullMarks?: number;
    passMarks?: number;
    status?: string;
    examDate?: string;
    description?: string;
  } | undefined;

  const fullMarks = exam?.fullMarks ?? 100;
  const classId = exam?.classId ?? "";
  const subjectId = exam?.subjectId ?? "";

  // Fetch the student roster for the exam's class
  const studentsQuery = useStudentsByClass(classId);
  const students = studentsQuery.data ?? [];

  // Existing marks (pre-fill when the teacher returns to a saved exam)
  const existingMarks = (marksQuery.data ?? []) as Array<{
    studentId: string;
    marksObtained: number;
    isAbsent?: boolean;
  }>;

  const [currentIndex, setCurrentIndex] = useState(0);
  // Marks keyed by studentId. undefined = not entered yet.
  const [marks, setMarks] = useState<Record<string, number | undefined>>({});
  const [absent, setAbsent] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill marks from existing data when it loads
  useEffect(() => {
    if (existingMarks.length > 0) {
      const markMap: Record<string, number | undefined> = {};
      const absentMap: Record<string, boolean> = {};
      for (const m of existingMarks) {
        if (m.isAbsent) {
          absentMap[m.studentId] = true;
          markMap[m.studentId] = undefined;
        } else {
          markMap[m.studentId] = m.marksObtained;
        }
      }
      setMarks((prev) => ({ ...markMap, ...prev }));
      setAbsent((prev) => ({ ...absentMap, ...prev }));
    }
  }, [existingMarks]);

  const currentStudent = students[currentIndex];
  const currentMarks = currentStudent ? marks[currentStudent.id] : undefined;
  const isCurrentAbsent = currentStudent ? absent[currentStudent.id] : false;
  const exceedsFullMarks =
    !isCurrentAbsent && currentMarks !== undefined && currentMarks > fullMarks;

  const totalEntered = useMemo(
    () => Object.values(marks).filter((m) => m !== undefined).length
      + Object.values(absent).filter(Boolean).length,
    [marks, absent],
  );

  function handleMarksChange(value: number | undefined) {
    if (!currentStudent) return;
    setMarks((prev) => ({ ...prev, [currentStudent.id]: value }));
    // If entering a mark, clear the absent flag
    if (value !== undefined) {
      setAbsent((prev) => ({ ...prev, [currentStudent.id]: false }));
    }
  }

  function handleToggleAbsent() {
    if (!currentStudent) return;
    const next = !absent[currentStudent.id];
    setAbsent((prev) => ({ ...prev, [currentStudent.id]: next }));
    if (next) {
      // If marking absent, clear the marks
      setMarks((prev) => {
        const copy = { ...prev };
        delete copy[currentStudent.id];
        return copy;
      });
    }
  }

  function handleNext() {
    if (exceedsFullMarks) return;
    if (currentIndex < students.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }

  function handlePrev() {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }

  // --- Real submit: PUT /api/v1/exams/:id/marks ---
  async function handleSaveAndSubmit() {
    if (exceedsFullMarks || !exam) return;
    setSubmitting(true);
    try {
      // Build the marks array from local state
      const marksArray = students
        .map((s) => {
          const isAbsent = absent[s.id] ?? false;
          const markValue = marks[s.id];
          if (isAbsent) {
            return {
              student_id: s.id,
              subject_id: subjectId || s.id, // fallback — API uses exam.subject_id if not provided
              marks_obtained: 0,
              is_absent: true,
            };
          }
          if (markValue === undefined) return null;
          return {
            student_id: s.id,
            subject_id: subjectId || s.id,
            marks_obtained: markValue,
            is_absent: false,
          };
        })
        .filter((m): m is NonNullable<typeof m> => m !== null);

      if (marksArray.length === 0) {
        toast({
          title: "No marks to save",
          description: "Enter at least one mark or mark a student absent.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      const res = await fetch(`/api/v1/exams/${examId}/marks`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marks: marksArray }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg =
          res.status === 409
            ? "This exam is already published — marks cannot be edited."
            : res.status === 403
              ? "You don't have permission to enter marks."
              : data?.error || `Server returned ${res.status}.`;
        toast({
          title: "Save failed",
          description: errMsg,
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      // Success
      const count = marksArray.length;
      const total = students.length;
      const enteredMarks = marksArray.filter((m) => !m.is_absent);
      const average =
        enteredMarks.length > 0
          ? Math.round(
              (enteredMarks.reduce((a, b) => a + b.marks_obtained, 0) /
                (enteredMarks.length * fullMarks)) *
                100,
            )
          : 0;
      toast({
        title: "Marks saved",
        description: `${count} of ${total} students · average ${average}% · ${exam.name}`,
      });

      // Invalidate the exam-marks query so a refetch picks up the new state
      const { queryClient } = await import("@/lib/query/client");
      queryClient.invalidateQueries({ queryKey: ["exam-marks", examId] });
      queryClient.invalidateQueries({ queryKey: ["exam", examId] });

      router.push("/exams");
    } catch {
      toast({
        title: "Network error",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    }
    setSubmitting(false);
  }

  // --- Loading states ---
  if (examQuery.isLoading) {
    return (
      <PageWrap>
        <BackHeader examName="Loading…" />
        <LoadingState pattern="detail" />
      </PageWrap>
    );
  }

  if (examQuery.isError || !exam) {
    return (
      <PageWrap>
        <BackHeader examName="Exam not found" />
        <ErrorState onRetry={() => examQuery.refetch()} />
      </PageWrap>
    );
  }

  // Students loading (only show after exam loads so we know the classId)
  if (studentsQuery.isLoading) {
    return (
      <PageWrap>
        <BackHeader examName={exam.name} />
        <LoadingState pattern="list" rows={6} />
      </PageWrap>
    );
  }

  if (studentsQuery.isError) {
    return (
      <PageWrap>
        <BackHeader examName={exam.name} />
        <ErrorState onRetry={() => studentsQuery.refetch()} />
      </PageWrap>
    );
  }

  if (students.length === 0) {
    return (
      <PageWrap>
        <BackHeader examName={exam.name} />
        <div className="rounded-xl border border-dashed border-border-default bg-surface-card p-8 text-center">
          <p className="text-body text-text-secondary">
            No students in this class.
          </p>
        </div>
      </PageWrap>
    );
  }

  const progressPct = ((currentIndex + 1) / students.length) * 100;
  const isLastStudent = currentIndex === students.length - 1;
  const isNextBlocked = exceedsFullMarks || (currentMarks === undefined && !isCurrentAbsent);

  return (
    <PageWrap>
      <BackHeader examName={exam.name} />

      <header className="rounded-xl border border-border-default bg-surface-card p-4 shadow-sm">
        <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
          {exam.className ?? "—"} · {exam.examDate ?? ""}
        </p>
        <h1 className="mt-1 text-subtitle font-bold text-text-primary">
          {exam.name}
        </h1>
        <p className="mt-0.5 text-body text-text-secondary">
          Subject: {exam.subjectName ?? "—"} · Full marks: {fullMarks}
        </p>
        {exam.status === "published" && (
          <p className="mt-2 rounded-md bg-warning-50 px-2 py-1 text-caption font-medium text-semantic-warning">
            ⚠ This exam is published — marks are read-only.
          </p>
        )}
      </header>

      {/* Progress bar — Student X of N */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-caption text-text-secondary">
          <span>
            Student{" "}
            <span className="font-semibold text-text-primary">
              {currentIndex + 1}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-text-primary">
              {students.length}
            </span>
          </span>
          <span>
            {totalEntered} of {students.length} marked
          </span>
        </div>
        <Progress value={progressPct} aria-label={`Progress: student ${currentIndex + 1} of ${students.length}`} />
      </div>

      {/* Current student card */}
      {currentStudent && (
        <StudentMarkCard
          student={currentStudent}
          locale={locale}
          marks={currentMarks}
          onMarksChange={handleMarksChange}
          fullMarks={fullMarks}
          index={currentIndex}
          total={students.length}
        />
      )}

      {/* Absent toggle */}
      {currentStudent && (
        <div className="flex items-center justify-between rounded-lg border border-border-default bg-surface-card p-3">
          <span className="text-body text-text-secondary">
            Mark as absent
          </span>
          <Button
            type="button"
            variant={isCurrentAbsent ? "destructive" : "outline"}
            size="sm"
            onClick={handleToggleAbsent}
          >
            {isCurrentAbsent ? "Absent" : "Present"}
          </Button>
        </div>
      )}

      {/* Navigation: Prev / Next or Save & Submit */}
      <div
        data-mobile-cta-anchor
        className="sticky bottom-0 z-20 -mx-4 border-t border-border-default bg-surface-card px-4 py-3 backdrop-blur md:-mx-8 md:px-8"
      >
        <div className="mx-auto flex max-w-[var(--grid-max-width)] items-center gap-2">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex-1 sm:flex-none"
            aria-label="Previous student"
          >
            <ArrowLeft className="h-4 w-4" />
            Prev
          </Button>

          {isLastStudent ? (
            <Button
              data-mobile-cta-target
              onClick={handleSaveAndSubmit}
              disabled={isNextBlocked || submitting || exam.status === "published"}
              className="flex-1"
              aria-label="Save and submit marks"
            >
              <Save className="h-4 w-4" />
              {submitting ? "Saving…" : "Save & Submit"}
            </Button>
          ) : (
            <Button
              data-mobile-cta-target
              onClick={handleNext}
              disabled={isNextBlocked}
              className="flex-1"
              aria-label="Next student"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Quick roster skip-links — visible only on sm+ for keyboard users */}
      <nav
        aria-label="Jump to student"
        className="hidden flex-wrap gap-1.5 sm:flex"
      >
        {students.map((s, i) => (
          <Button
            key={s.id}
            variant={i === currentIndex ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentIndex(i)}
            className="h-7 px-2 text-caption"
            aria-label={`Jump to student ${i + 1}: ${s.name}`}
            aria-current={i === currentIndex ? "true" : undefined}
          >
            {marks[s.id] !== undefined || absent[s.id] ? (
              <Check className="h-3 w-3" aria-hidden="true" />
            ) : null}
            {i + 1}
          </Button>
        ))}
      </nav>
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

function BackHeader({ examName }: { examName: string }) {
  const router = useRouter();
  return (
    <header className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Back to exams list"
        onClick={() => router.push("/exams")}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="min-w-0">
        <p className="text-caption text-text-muted">Enter Marks</p>
        <h1 className="truncate text-subtitle font-semibold text-text-primary">
          {examName}
        </h1>
      </div>
    </header>
  );
}
