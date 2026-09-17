"use client";

/**
 * MadrashaOS — Enter Marks (C3.3 — Academic Module Screen 4)
 *
 * Route: /exams/[id]/marks
 *
 * THE MOBILE-FIRST MARKS ENTRY. Must work at 375px viewport width.
 *
 * Pattern: One student at a time (swipe-next on mobile).
 *   - Exam header: name + class + subject at top
 *   - Progress bar: "Student 3 of 12"
 *   - StudentMarkCard with NumberInput (stepper) for marks
 *   - VALIDATION: if marks > full_marks (mock=100), inline error
 *     "Mark exceeds full marks (100)" and Next is blocked
 *   - "Next" button → advance to next student
 *   - "Save & Submit" appears on the last student
 *   - IfPermission code="exams.enter-marks" gates the page
 *
 * Marks are kept in local state keyed by studentId; submitted at the end
 * with a single summary toast.
 */

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Save } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useStudentsByClass } from "@/lib/query/client";

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
import type { Exam } from "@/components/academic/ExamRow";

// Inline mock exam catalogue keyed by [id]. Real backend would resolve
// this server-side; for the C3.3 mock we keep it in-page.
const EXAM_CATALOGUE: Record<string, Exam> = {
  "exam-mt-1": {
    id: "exam-mt-1",
    name: "Mid-term Examination",
    date: "2026-09-25",
    classId: "cls-5",
    className: "Class 5",
    section: "A",
    subject: "Quran & Tajweed",
    fullMarks: 100,
    status: "active",
  },
  "exam-final-1": {
    id: "exam-final-1",
    name: "Final Examination",
    date: "2026-11-20",
    classId: "cls-5",
    className: "Class 5",
    section: "A",
    subject: "Arabic Grammar",
    fullMarks: 100,
    status: "draft",
  },
  "exam-quiz-1": {
    id: "exam-quiz-1",
    name: "Quiz 1 — Hadith",
    date: "2026-09-10",
    classId: "cls-5",
    className: "Class 5",
    section: "A",
    subject: "Hadith Studies",
    fullMarks: 25,
    status: "published",
  },
  "exam-quiz-2": {
    id: "exam-quiz-2",
    name: "Quiz 2 — Fiqh",
    date: "2026-09-18",
    classId: "cls-5",
    className: "Class 5",
    section: "A",
    subject: "Fiqh (Jurisprudence)",
    fullMarks: 25,
    status: "draft",
  },
};

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

  const examId = params?.id ?? "exam-mt-1";
  const exam = EXAM_CATALOGUE[examId] ?? EXAM_CATALOGUE["exam-mt-1"];
  const fullMarks = exam.fullMarks;

  const studentsQuery = useStudentsByClass(exam.classId, exam.section);
  const students = studentsQuery.data ?? [];

  const [currentIndex, setCurrentIndex] = useState(0);
  // Marks keyed by studentId. undefined = not entered yet.
  const [marks, setMarks] = useState<Record<string, number | undefined>>({});

  const currentStudent = students[currentIndex];
  const currentMarks = currentStudent ? marks[currentStudent.id] : undefined;
  const exceedsFullMarks =
    currentMarks !== undefined && currentMarks > fullMarks;

  const totalEntered = useMemo(
    () => Object.values(marks).filter((m) => m !== undefined).length,
    [marks],
  );

  function handleMarksChange(value: number | undefined) {
    if (!currentStudent) return;
    setMarks((prev) => ({ ...prev, [currentStudent.id]: value }));
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

  function handleSaveAndSubmit() {
    if (exceedsFullMarks) return;
    const count = Object.values(marks).filter((m) => m !== undefined).length;
    const total = students.length;
    const average =
      count > 0
        ? Math.round(
            (Object.values(marks)
              .filter((m): m is number => m !== undefined)
              .reduce((a, b) => a + b, 0) /
              (count * fullMarks)) *
              100,
          )
        : 0;
    toast({
      title: "Marks saved",
      description: `${count} of ${total} students · average ${average}% · ${exam.name}`,
    });
    router.push("/exams");
  }

  // Loading
  if (studentsQuery.isLoading) {
    return (
      <PageWrap>
        <BackHeader examName={exam.name} />
        <LoadingState pattern="detail" />
      </PageWrap>
    );
  }

  // Error
  if (studentsQuery.isError) {
    const isPerm =
      studentsQuery.error instanceof Error &&
      studentsQuery.error.name === "PermissionDeniedError";
    return (
      <PageWrap>
        <BackHeader examName={exam.name} />
        {isPerm ? (
          <PermissionDenied resource="Student roster" />
        ) : (
          <ErrorState onRetry={() => studentsQuery.refetch()} />
        )}
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
  const isNextBlocked = exceedsFullMarks || currentMarks === undefined;

  return (
    <PageWrap>
      <BackHeader examName={exam.name} />

      <header className="rounded-xl border border-border-default bg-surface-card p-4 shadow-sm">
        <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
          {exam.className} · Section {exam.section}
        </p>
        <h1 className="mt-1 text-subtitle font-bold text-text-primary">
          {exam.name}
        </h1>
        <p className="mt-0.5 text-body text-text-secondary">
          Subject: {exam.subject} · Full marks: {fullMarks}
        </p>
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

      {/* Navigation: Prev / Next or Save & Submit */}
      <div className="sticky bottom-0 z-20 -mx-4 border-t border-border-default bg-surface-card/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
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
              onClick={handleSaveAndSubmit}
              disabled={isNextBlocked}
              className="flex-1"
              aria-label="Save and submit marks"
            >
              <Save className="h-4 w-4" />
              Save &amp; Submit
            </Button>
          ) : (
            <Button
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
            {marks[s.id] !== undefined ? (
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
