"use client";

/**
 * MadrashaOS — Examination List (C3.3 — Academic Module Screen 3)
 *
 * Route: /exams
 *
 * Lists mock exams (Mid-term, Final, Quiz 1, Quiz 2) with name, date,
 * class, subject, and status (Draft/Active/Published). Provides:
 *   - "Enter Marks" entry (gated by IfPermission code="exams.enter-marks")
 *     → navigates to /exams/[id]/marks
 *   - "Publish" action (gated by IfPermission code="exams.publish") with
 *     a confirm dialog: "Publishing locks the paper. Continue?"
 *
 * Status badge tone:
 *   - Draft   = neutral  (outline + neutral-300 border)
 *   - Active  = primary  (primary-500 bg + foreground)
 *   - Published = success (success-50 bg + semantic-success text)
 *
 * Mobile-first: list rows stack at 375px; inline on sm+.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useSessionStore } from "@/stores/sessionStore";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { IfPermission } from "@/components/auth/IfPermission";
import { ExamRow, type Exam } from "@/components/academic/ExamRow";
import { useExams } from "@/lib/query/client";

// Real exams are fetched from the API via useExams() hook.
// The Exam type is retained for the ExamRow component compatibility.

export default function ExamsListPage() {
  const router = useRouter();
  const { locale } = useI18n();
  const { toast } = useToast();
  const role = useSessionStore((s) => s.role);
  const canEnterMarks = useSessionStore((s) =>
    s.permissions.includes("exams.enter-marks"),
  );
  const canPublish = useSessionStore((s) =>
    s.permissions.includes("exams.publish"),
  );

  const examsQuery = useExams();
  // Map API response (camelCase) to the Exam shape ExamRow expects
  const exams: Exam[] = ((examsQuery.data ?? []) as Array<Record<string, unknown>>).map((e) => ({
    id: e.id as string,
    name: (e.name as string) ?? "Unnamed",
    date: (e.examDate as string) ?? "",
    classId: (e.classId as string) ?? "",
    className: (e.className as string) ?? "—",
    section: "",
    subject: (e.subjectName as string) ?? "—",
    fullMarks: (e.fullMarks as number) ?? 100,
    status: ((e.status as string) ?? "draft") as Exam["status"],
  }));
  const [publishTarget, setPublishTarget] = useState<Exam | null>(null);

  function handleEnterMarks(exam: Exam) {
    router.push(`/exams/${exam.id}/marks`);
  }

  function handlePublishClick(exam: Exam) {
    setPublishTarget(exam);
  }

  async function confirmPublish() {
    if (!publishTarget) return;
    // Call the real publish API
    try {
      const res = await fetch(`/api/v1/exams/${publishTarget.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({
          title: "Publish failed",
          description: data?.error || `Server returned ${res.status}.`,
          variant: "destructive",
        });
        setPublishTarget(null);
        return;
      }
      toast({
        title: "Exam published",
        description: `${publishTarget.name} is now locked. Marks can no longer be edited.`,
      });
      // Refetch the exams list
      const { queryClient } = await import("@/lib/query/client");
      queryClient.invalidateQueries({ queryKey: ["exams"] });
    } catch {
      toast({
        title: "Network error",
        description: "Please try again.",
        variant: "destructive",
      });
    }
    setPublishTarget(null);
  }

  return (
    <PageWrap>
      <Header
        title="Examinations"
        subtitle="Manage exam papers · enter marks · publish results."
      />

      {examsQuery.isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg border border-border-default bg-surface-card" />
          ))}
        </div>
      )}

      {examsQuery.isError && (
        <div className="rounded-lg border border-semantic-danger/30 bg-danger-50 p-4 text-body text-text-primary">
          Failed to load exams.{" "}
          <button onClick={() => examsQuery.refetch()} className="font-semibold text-primary-600 underline">
            Retry
          </button>
        </div>
      )}

      {!examsQuery.isLoading && !examsQuery.isError && exams.length === 0 && (
        <div className="rounded-xl border border-dashed border-border-default bg-surface-card p-8 text-center">
          <p className="text-body text-text-secondary">No exams configured yet.</p>
        </div>
      )}

      <ul className="space-y-2">
        {exams.map((exam) => (
          <ExamRow
            key={exam.id}
            exam={exam}
            locale={locale}
            onEnterMarks={handleEnterMarks}
            onPublish={handlePublishClick}
            canEnterMarks={canEnterMarks}
            canPublish={canPublish}
          />
        ))}
      </ul>

      {/* Publish confirmation dialog (gated by exams.publish permission) */}
      <IfPermission code="exams.publish" fallback={null}>
        <AlertDialog
          open={publishTarget !== null}
          onOpenChange={(open) => {
            if (!open) setPublishTarget(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-semantic-warning" />
                Publish exam?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Publishing locks the paper. Marks for{" "}
                <span className="font-medium text-text-primary">
                  {publishTarget?.name}
                </span>{" "}
                can no longer be edited. Continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmPublish}
                className="bg-primary-500 text-primary-foreground hover:bg-primary-500/90"
              >
                Yes, publish
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </IfPermission>

      <p className="text-caption text-text-muted">
        Signed in as <span className="font-medium text-text-secondary">{role}</span>
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
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-display font-bold text-text-primary">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-body text-text-secondary">{subtitle}</p>
        )}
      </div>
    </header>
  );
}
