"use client";

/**
 * MadrashaOS — ExamRow (Session C3.3)
 *
 * A single row in the Examination list (/exams).
 * Shows: name, date, class, subject, status badge + action buttons.
 * Mobile-first: stacked layout at 375px, inline row on sm+.
 *
 * "Enter Marks" button is gated by IfPermission code="exams.enter-marks"
 * at the page level (each row is a controlled child).
 * "Publish" button is gated by IfPermission code="exams.publish" similarly.
 */

import { FileText, CalendarDays, BookOpen, Users } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/i18n/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type ExamStatus = "draft" | "active" | "published";

export type Exam = {
  id: string;
  name: string;
  date: string; // ISO date "2026-09-20"
  classId: string;
  className: string;
  section: string;
  subject: string;
  fullMarks: number;
  status: ExamStatus;
};

const STATUS_VARIANT: Record<
  ExamStatus,
  { variant: "outline" | "default" | "secondary"; label: string; className: string }
> = {
  draft: {
    variant: "outline",
    label: "Draft",
    className: "border-neutral-300 text-text-secondary",
  },
  active: {
    variant: "default",
    label: "Active",
    className: "bg-primary-500 text-primary-foreground",
  },
  published: {
    variant: "secondary",
    label: "Published",
    className: "bg-success-50 text-semantic-success border-semantic-success/30",
  },
};

export function ExamRow({
  exam,
  locale,
  onEnterMarks,
  onPublish,
  canEnterMarks,
  canPublish,
}: {
  exam: Exam;
  locale: Locale;
  onEnterMarks: (exam: Exam) => void;
  onPublish: (exam: Exam) => void;
  canEnterMarks: boolean;
  canPublish: boolean;
}) {
  const statusMeta = STATUS_VARIANT[exam.status];
  const dateLabel = formatDate(new Date(exam.date), locale);
  const isPublished = exam.status === "published";

  return (
    <li
      data-slot="exam-row"
      className="flex flex-col gap-3 rounded-lg border border-border-default bg-surface-card p-4 transition-colors hover:bg-surface-hover sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-700">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold text-text-primary">
            {exam.name}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-caption text-text-muted">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" aria-hidden="true" />
              {dateLabel}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" aria-hidden="true" />
              {exam.className} · {exam.section}
            </span>
            <span className="inline-flex items-center gap-1">
              <BookOpen className="h-3 w-3" aria-hidden="true" />
              {exam.subject} · {exam.fullMarks}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
        <Badge
          variant={statusMeta.variant}
          className={statusMeta.className}
          aria-label={`Status: ${statusMeta.label}`}
        >
          {statusMeta.label}
        </Badge>

        {canEnterMarks && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEnterMarks(exam)}
            disabled={isPublished}
            aria-label={`Enter marks for ${exam.name}`}
          >
            Enter Marks
          </Button>
        )}

        {canPublish && (
          <Button
            size="sm"
            variant="default"
            onClick={() => onPublish(exam)}
            disabled={isPublished}
            aria-label={`Publish ${exam.name}`}
          >
            {isPublished ? "Published" : "Publish"}
          </Button>
        )}
      </div>
    </li>
  );
}
