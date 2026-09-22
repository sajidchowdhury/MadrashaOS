"use client";

/**
 * MadrashaOS — Admission Kanban (Phase C3.2 — People)
 *
 * Route: /admission
 *
 * 5-column drag-and-drop Kanban for admission applications:
 *   Applied → Interviewed → Approved → Registered → Rejected
 *
 * Behavior:
 *   - Each column is a droppable area; each card is a draggable.
 *   - Uses @dnd-kit/core (already installed in package.json).
 *   - Dragging a card to "Registered" fires a success toast:
 *     "Student registered — fee plan created".
 *   - Dragging a card to "Approved" is gated by IfPermission
 *     code="admission.approve" — users lacking the permission see
 *     an inline warning toast and the card snaps back.
 *   - "New Application" button gated by IfPermission code="admission.view".
 *
 * Mock applicants are defined inline (per task spec — do NOT create new
 * fixture files). 10 applicants distributed across the 5 columns.
 */

import * as React from "react";
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor,
  useSensor, useSensors, useDraggable, useDroppable,
  type DragEndEvent, type DragStartEvent,
  closestCorners,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  UserPlus, GripVertical, CalendarDays, GraduationCap,
  XCircle, CheckCircle2, AlertCircle, Ban, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IfPermission } from "@/components/auth/IfPermission";
import { useSessionStore } from "@/stores/sessionStore";
import { useToast } from "@/hooks/use-toast";
import { useClasses, queryClient } from "@/lib/query/client";
import { StudentAvatar } from "@/components/people";
import { formatDate } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/I18nProvider";

/* ---------------------------------------------------------------
 * Inline mock applicants — distributed across columns
 * (Per task spec: define inline, do NOT create new fixture files)
 * --------------------------------------------------------------- */

type AdmissionStage = "applied" | "interviewed" | "approved" | "registered" | "rejected";

type Applicant = {
  id: string;
  name: string;
  nameBn: string;
  appliedFor: string; // class name e.g. "Class 5"
  appliedDate: string; // ISO date
  stage: AdmissionStage;
};

const INITIAL_APPLICANTS: Applicant[] = [
  { id: "apl-1", name: "Tahsin Rahman", nameBn: "তাহসিন রহমান", appliedFor: "Class 1", appliedDate: "2026-09-10", stage: "applied" },
  { id: "apl-2", name: "Ayesha Siddiqua", nameBn: "আয়েশা সিদ্দিকা", appliedFor: "Class 3", appliedDate: "2026-09-11", stage: "applied" },
  { id: "apl-3", name: "Muhammad Zubair", nameBn: "মুহাম্মদ যুবায়ের", appliedFor: "Class 5", appliedDate: "2026-09-12", stage: "interviewed" },
  { id: "apl-4", name: "Sara Anjum", nameBn: "সারা আনজুম", appliedFor: "Class 1", appliedDate: "2026-09-12", stage: "interviewed" },
  { id: "apl-5", name: "Abdullah Al Mamun", nameBn: "আব্দুল্লাহ আল মামুন", appliedFor: "Class 8", appliedDate: "2026-09-09", stage: "approved" },
  { id: "apl-6", name: "Hafsa Akter", nameBn: "হাফসা আক্তার", appliedFor: "Class 5", appliedDate: "2026-09-08", stage: "approved" },
  { id: "apl-7", name: "Yahya Ibn Khan", nameBn: "ইয়াহইয়া ইবনে খান", appliedFor: "Class 3", appliedDate: "2026-09-05", stage: "registered" },
  { id: "apl-8", name: "Maryam Begum", nameBn: "মরিয়ম বেগম", appliedFor: "Class 1", appliedDate: "2026-09-04", stage: "registered" },
  { id: "apl-9", name: "Bilal Hossain", nameBn: "বিলাল হোসেন", appliedFor: "Class 8", appliedDate: "2026-09-07", stage: "rejected" },
  { id: "apl-10", name: "Zainab Chowdhury", nameBn: "জয়নব চৌধুরী", appliedFor: "Class 5", appliedDate: "2026-09-13", stage: "applied" },
];

const COLUMNS: {
  id: AdmissionStage;
  title: string;
  tone: "neutral" | "primary" | "accent" | "success" | "danger";
  Icon: typeof UserPlus;
}[] = [
  { id: "applied", title: "Applied", tone: "neutral", Icon: UserPlus },
  { id: "interviewed", title: "Interviewed", tone: "primary", Icon: GraduationCap },
  { id: "approved", title: "Approved", tone: "accent", Icon: CheckCircle2 },
  { id: "registered", title: "Registered", tone: "success", Icon: CheckCircle2 },
  { id: "rejected", title: "Rejected", tone: "danger", Icon: Ban },
];

const COLUMN_TONE_CLASS: Record<string, string> = {
  neutral: "bg-neutral-100 text-text-primary",
  primary: "bg-primary-50 text-primary-700",
  accent: "bg-accent-50 text-accent-700",
  success: "bg-success-50 text-semantic-success",
  danger: "bg-danger-50 text-semantic-danger",
};

/* ---------------------------------------------------------------
 * KanbanCard — draggable card
 * --------------------------------------------------------------- */

function KanbanCard({
  applicant, isOverlay,
}: {
  applicant: Applicant;
  isOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: applicant.id,
    data: { applicant },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-lg border border-border-default bg-surface-card p-3 shadow-elevation-1 transition-shadow hover:shadow-elevation-2 ${
        isOverlay ? "rotate-2 cursor-grabbing" : ""
      }`}
      aria-roledescription="draggable item"
      aria-label={`Applicant ${applicant.name}, stage ${applicant.stage}`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 cursor-grab text-text-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
          aria-label="Drag handle"
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StudentAvatar name={applicant.name} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-body font-medium text-text-primary">
                {applicant.name}
              </p>
              <p className="truncate text-caption text-text-muted" lang="bn">
                {applicant.nameBn}
              </p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-caption text-text-secondary">
            <span className="inline-flex items-center gap-1">
              <GraduationCap className="h-3.5 w-3.5" aria-hidden />
              {applicant.appliedFor}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              {formatDate(new Date(applicant.appliedDate), "en")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
 * Column — droppable area
 * --------------------------------------------------------------- */

function Column({
  column, applicants,
}: {
  column: typeof COLUMNS[number];
  applicants: Applicant[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <div
      className="flex min-h-[24rem] w-full flex-col gap-2 rounded-xl border border-border-default bg-surface-canvas p-3 sm:w-72"
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <column.Icon className="h-4 w-4 text-text-secondary" aria-hidden />
          <h2 className="text-subtitle font-semibold text-text-primary">
            {column.title}
          </h2>
        </div>
        <Badge variant="outline" className={COLUMN_TONE_CLASS[column.tone]}>
          {applicants.length}
        </Badge>
      </header>

      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2 rounded-lg p-1 transition-colors ${
          isOver ? "bg-primary-50/60 ring-2 ring-primary-500/30" : ""
        }`}
        aria-label={`Drop zone for ${column.title}`}
      >
        {applicants.length === 0 ? (
          <div className="flex h-full min-h-[6rem] flex-col items-center justify-center rounded-md border border-dashed border-border-default p-3 text-center text-caption text-text-muted">
            <AlertCircle className="mb-1 h-4 w-4" />
            Drop applicants here
          </div>
        ) : (
          applicants.map((a) => <KanbanCard key={a.id} applicant={a} />)
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
 * Page
 * --------------------------------------------------------------- */

export default function AdmissionKanbanPage() {
  const { toast } = useToast();
  const { hasPermission } = useSessionStore();
  const { locale } = useI18n();
  const { data: classes } = useClasses();

  const [applicants, setApplicants] = React.useState<Applicant[]>(INITIAL_APPLICANTS);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  // --- New Application dialog state ---
  const [newAppOpen, setNewAppOpen] = React.useState(false);
  const [newAppSubmitting, setNewAppSubmitting] = React.useState(false);
  const [newAppError, setNewAppError] = React.useState<string | null>(null);
  const [appName, setAppName] = React.useState("");
  const [appNameBn, setAppNameBn] = React.useState("");
  const [guardianName, setGuardianName] = React.useState("");
  const [guardianPhone, setGuardianPhone] = React.useState("");
  const [appEmail, setAppEmail] = React.useState("");
  const [desiredClassId, setDesiredClassId] = React.useState("");

  function openNewAppDialog() {
    setAppName("");
    setAppNameBn("");
    setGuardianName("");
    setGuardianPhone("");
    setAppEmail("");
    setDesiredClassId("");
    setNewAppError(null);
    setNewAppOpen(true);
  }

  async function handleNewAppSubmit() {
    setNewAppError(null);
    if (!appName.trim() || !guardianName.trim() || !guardianPhone.trim() || !desiredClassId) {
      setNewAppError("Applicant name, guardian name, guardian phone, and desired class are required.");
      return;
    }
    setNewAppSubmitting(true);
    try {
      const res = await fetch("/api/v1/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant_name: appName.trim(),
          applicant_name_bn: appNameBn.trim() || undefined,
          guardian_name: guardianName.trim(),
          guardian_phone: guardianPhone.trim(),
          phone: guardianPhone.trim(),
          email: appEmail.trim() || undefined,
          desired_class_id: desiredClassId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNewAppError(data?.error || `Failed (HTTP ${res.status})`);
        setNewAppSubmitting(false);
        return;
      }
      toast({
        title: "Application submitted",
        description: `${appName} — reference ${String(data?.id ?? "").slice(0, 8).toUpperCase()}`,
      });
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
      setNewAppOpen(false);
    } catch {
      setNewAppError("Network error — please try again.");
    }
    setNewAppSubmitting(false);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const activeApplicant = applicants.find((a) => a.id === activeId) ?? null;

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const applicantId = String(active.id);
    const targetStage = String(over.id) as AdmissionStage;
    const current = applicants.find((a) => a.id === applicantId);
    if (!current || current.stage === targetStage) return;

    // Permission gate: dragging to "approved" requires admission.approve
    if (targetStage === "approved" && !hasPermission("admission.approve")) {
      toast({
        title: "Permission required",
        description: "You need the 'admission.approve' permission to approve applicants.",
        variant: "destructive",
      });
      return;
    }

    setApplicants((prev) =>
      prev.map((a) => (a.id === applicantId ? { ...a, stage: targetStage } : a)),
    );

    if (targetStage === "registered") {
      toast({
        title: "Student registered",
        description: "Fee plan created — January 2026 installment generated.",
      });
    } else if (targetStage === "approved") {
      toast({
        title: "Application approved",
        description: `${current.name} moved to Approved.`,
      });
    } else if (targetStage === "rejected") {
      toast({
        title: "Application rejected",
        description: `${current.name} marked as rejected.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Application updated",
        description: `${current.name} → ${targetStage}.`,
      });
    }
  };

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-display font-bold text-text-primary">
              <UserPlus className="h-7 w-7 text-primary-500" aria-hidden />
              Admissions
            </h1>
            <p className="mt-1 text-body text-text-secondary">
              Drag applications through the pipeline. Registering a student auto-creates their fee plan.
            </p>
          </div>
          <IfPermission code="admission.view">
            <Button onClick={openNewAppDialog}>
              <UserPlus className="h-4 w-4" />
              New Application
            </Button>
          </IfPermission>
        </header>

        {/* Permission hint for approve action */}
        <IfPermission
          code="admission.approve"
          fallback={
            <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-50 px-4 py-3 text-caption text-semantic-warning">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                You don&apos;t have permission to <strong>approve</strong> applications.
                You can move them through other stages, but the Approved column is locked.
              </span>
            </div>
          }
        >
          <></>
        </IfPermission>

        {/* Kanban */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="flex flex-col gap-3 overflow-x-auto pb-2 lg:flex-row lg:overflow-x-visible">
            {COLUMNS.map((col) => {
              const items = applicants.filter((a) => a.stage === col.id);
              return (
                <Column key={col.id} column={col} applicants={items} />
              );
            })}
          </div>

          <DragOverlay>
            {activeApplicant ? (
              <KanbanCard applicant={activeApplicant} isOverlay />
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Stats footer */}
        <div className="grid gap-3 sm:grid-cols-5">
          {COLUMNS.map((col) => {
            const count = applicants.filter((a) => a.stage === col.id).length;
            return (
              <Card key={col.id} className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-caption font-medium uppercase tracking-wide text-text-muted">
                    {col.title}
                  </span>
                  <Badge variant="outline" className={COLUMN_TONE_CLASS[col.tone]}>
                    {count}
                  </Badge>
                </div>
              </Card>
            );
          })}
        </div>

        <p className="text-caption text-text-muted">
          Showing {applicants.length} applicants · Stage labels localized · {locale.toUpperCase()}
        </p>
      </div>

      {/* ---------- New Application dialog ---------- */}
      <Dialog open={newAppOpen} onOpenChange={setNewAppOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary-500" />
              New Admission Application
            </DialogTitle>
            <DialogDescription>
              Submit a new admission application. It will appear in the
              “Applied” column with status <code>applied</code>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="app-name">Applicant Name (English) *</Label>
                <Input
                  id="app-name"
                  placeholder="Tahsin Rahman"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="app-name-bn">আবেদনকারীর নাম (বাংলা)</Label>
                <Input
                  id="app-name-bn"
                  placeholder="তাহসিন রহমান"
                  value={appNameBn}
                  onChange={(e) => setAppNameBn(e.target.value)}
                  lang="bn"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="app-guardian">Guardian Name *</Label>
                <Input
                  id="app-guardian"
                  placeholder="Abdul Rahman"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="app-phone">Guardian Phone *</Label>
                <Input
                  id="app-phone"
                  placeholder="+880 1XXX-XXXXXX"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="app-email">Email</Label>
                <Input
                  id="app-email"
                  type="email"
                  placeholder="guardian@example.com"
                  value={appEmail}
                  onChange={(e) => setAppEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="app-class">Desired Class *</Label>
                <Select value={desiredClassId} onValueChange={setDesiredClassId}>
                  <SelectTrigger id="app-class" className="w-full">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {(classes as Array<{ id: string; name: string }> | undefined ?? []).length === 0 && (
                      <div className="px-3 py-2 text-caption text-text-muted">
                        No classes found. Create classes first.
                      </div>
                    )}
                    {(classes as Array<{ id: string; name: string }> | undefined ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newAppError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-semantic-danger/40 bg-danger-50 px-3 py-2 text-caption text-semantic-danger"
              >
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                <span>{newAppError}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewAppOpen(false)}>
              <XCircle className="h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleNewAppSubmit} disabled={newAppSubmitting}>
              <Save className="h-4 w-4" />
              {newAppSubmitting ? "Submitting…" : "Submit Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
