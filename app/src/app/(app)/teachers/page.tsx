"use client";

/**
 * MadrashaOS — Teachers List + Assignment Grid (Phase C3.2 — People)
 *
 * Route: /teachers
 *
 * Upper section: Staff directory — shows all 8 seeded users as "staff"
 * with role badges (since fixtures only have 1 actual teacher, we show
 * the full staff list, which is the realistic case for any madrasha).
 *
 * Lower section: Teacher Assignment grid — existing teacher × class ×
 * subject assignments. "Assign Teacher" button opens a dialog with
 * teacher/class/subject selects. Duplicate-active-assignment is blocked
 * inline (same teacher + same class + same subject → inline error).
 *
 * Permissions:
 *   - Page visible only to roles with `teachers.view`
 *   - "Assign Teacher" action gated by `teachers.assign`
 *
 * Data hooks: useClasses() for the class dropdown.
 * Staff list + assignments are inline mocks (per task spec — do NOT
 * create new fixture files).
 */

import * as React from "react";
import {
  UserCheck, Briefcase, Mail, Phone, Plus, XCircle,
  AlertCircle, BookOpen, GraduationCap, Trash2,
} from "lucide-react";
import { useClasses } from "@/lib/query/client";
import { users } from "@/lib/mock/fixtures/users";
import { ROLE_LABELS, type Role } from "@/stores/types";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState, ErrorState, PermissionDenied } from "@/components/states";
import { IfPermission } from "@/components/auth/IfPermission";
import { StudentAvatar } from "@/components/people";
import { useToast } from "@/hooks/use-toast";
import { useSessionStore } from "@/stores/sessionStore";

/* ---------------------------------------------------------------
 * Inline mock data — subjects + initial assignments
 * (Per task spec: define inline, do NOT create new fixture files)
 * --------------------------------------------------------------- */

type Subject = { id: string; name: string; code: string };

const SUBJECTS: Subject[] = [
  { id: "sub-quran", name: "Quran & Tajweed", code: "QUR-101" },
  { id: "sub-hadith", name: "Hadith Studies", code: "HAD-101" },
  { id: "sub-fiqh", name: "Fiqh", code: "FIQ-101" },
  { id: "sub-arabic", name: "Arabic Language", code: "ARA-101" },
  { id: "sub-bangla", name: "Bangla Language", code: "BEN-101" },
  { id: "sub-math", name: "Mathematics", code: "MAT-101" },
  { id: "sub-english", name: "English", code: "ENG-101" },
  { id: "sub-science", name: "General Science", code: "SCI-101" },
];

type Assignment = {
  id: string;
  teacherId: string;
  classId: string;
  subjectId: string;
};

const INITIAL_ASSIGNMENTS: Assignment[] = [
  { id: "asg-1", teacherId: "usr-teacher", classId: "cls-5", subjectId: "sub-quran" },
  { id: "asg-2", teacherId: "usr-teacher", classId: "cls-5", subjectId: "sub-arabic" },
  { id: "asg-3", teacherId: "usr-teacher", classId: "cls-3", subjectId: "sub-bangla" },
  { id: "asg-4", teacherId: "usr-authority", classId: "cls-8", subjectId: "sub-fiqh" },
  { id: "asg-5", teacherId: "usr-authority", classId: "cls-5", subjectId: "sub-hadith" },
  { id: "asg-6", teacherId: "usr-administrator", classId: "cls-1", subjectId: "sub-math" },
  { id: "asg-7", teacherId: "usr-accountant", classId: "cls-3", subjectId: "sub-english" },
  { id: "asg-8", teacherId: "usr-teacher", classId: "cls-8", subjectId: "sub-quran" },
];

const ROLE_TONE: Record<Role, string> = {
  "super-admin": "bg-accent-50 text-accent-700",
  authority: "bg-primary-50 text-primary-700",
  administrator: "bg-primary-50 text-primary-700",
  accountant: "bg-warning-50 text-semantic-warning",
  teacher: "bg-success-50 text-semantic-success",
  storekeeper: "bg-neutral-100 text-text-secondary",
  guardian: "bg-neutral-100 text-text-secondary",
  student: "bg-neutral-100 text-text-secondary",
};

/* ---------------------------------------------------------------
 * Page
 * --------------------------------------------------------------- */

export default function TeachersPage() {
  const { t: _t } = useI18n();
  void _t;
  const { hasPermission } = useSessionStore();
  const { toast } = useToast();
  const { data: classes, isLoading, isError, refetch } = useClasses();

  // Permission: page-level gate (D4 lock-in — never raw 403)
  if (!hasPermission("teachers.view")) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <PermissionDenied resource="Teachers" />
        </div>
      </div>
    );
  }

  return <TeachersContent
    classes={classes}
    isLoading={isLoading}
    isError={isError}
    refetch={refetch}
    toast={toast}
  />;
}

/* ---------------------------------------------------------------
 * Inner content (so we can early-return for permission above)
 * --------------------------------------------------------------- */

type TeachersContentProps = {
  classes: { id: string; name: string; sections: string[] }[] | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  toast: ReturnType<typeof useToast>["toast"];
};

function TeachersContent({
  classes, isLoading, isError, refetch, toast,
}: TeachersContentProps) {
  const [assignments, setAssignments] = React.useState<Assignment[]>(INITIAL_ASSIGNMENTS);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [newTeacher, setNewTeacher] = React.useState<string>("");
  const [newClass, setNewClass] = React.useState<string>("");
  const [newSubject, setNewSubject] = React.useState<string>("");
  const [search, setSearch] = React.useState("");
  const [duplicateError, setDuplicateError] = React.useState<string | null>(null);

  // Lookups
  const classMap = React.useMemo(() => {
    const m = new Map<string, { name: string; sections: string[] }>();
    classes?.forEach((c) => m.set(c.id, { name: c.name, sections: c.sections }));
    return m;
  }, [classes]);
  const subjectMap = React.useMemo(() => {
    const m = new Map<string, Subject>();
    SUBJECTS.forEach((s) => m.set(s.id, s));
    return m;
  }, []);
  const userMap = React.useMemo(() => {
    const m = new Map<string, typeof users[number]>();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, []);

  // Filtered staff (search by name or email)
  const filteredStaff = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => `${u.name} ${u.nameBn} ${u.email} ${u.role}`.toLowerCase().includes(q),
    );
  }, [search]);

  const filteredAssignments = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assignments;
    return assignments.filter((asg) => {
      const u = userMap.get(asg.teacherId);
      const c = classMap.get(asg.classId);
      const s = subjectMap.get(asg.subjectId);
      const hay = `${u?.name ?? ""} ${u?.nameBn ?? ""} ${c?.name ?? ""} ${s?.name ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [assignments, search, userMap, classMap, subjectMap]);

  const handleOpenDialog = () => {
    setNewTeacher("");
    setNewClass("");
    setNewSubject("");
    setDuplicateError(null);
    setDialogOpen(true);
  };

  const handleConfirmAssign = async () => {
    setDuplicateError(null);
    if (!newTeacher || !newClass || !newSubject) {
      setDuplicateError("Please select a teacher, class, and subject.");
      return;
    }
    // Duplicate-active-assignment block (same teacher + class + subject)
    const exists = assignments.some(
      (a) =>
        a.teacherId === newTeacher &&
        a.classId === newClass &&
        a.subjectId === newSubject,
    );
    if (exists) {
      setDuplicateError(
        "This teacher is already assigned to this class for the same subject. Pick a different combination.",
      );
      return;
    }
    // Call the real API
    try {
      const res = await fetch("/api/v1/teachers/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacher_id: newTeacher,
          class_id: newClass,
          subject_id: newSubject || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDuplicateError(data?.error || `Failed to assign (HTTP ${res.status})`);
        return;
      }
      // Add to local state too
      const next: Assignment = {
        id: data?.id || `asg-${Date.now()}`,
        teacherId: newTeacher,
        classId: newClass,
        subjectId: newSubject,
      };
      setAssignments((prev) => [...prev, next]);
      setDialogOpen(false);
      const u = userMap.get(newTeacher);
      const c = classMap.get(newClass);
      const s = subjectMap.get(newSubject);
      toast({
        title: "Assignment created",
        description: `${u?.name ?? "Teacher"} assigned to ${c?.name ?? ""} · ${s?.name ?? ""}`,
      });
    } catch {
      setDuplicateError("Network error — please try again.");
    }
  };

  const handleDeleteAssignment = (id: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
    toast({ title: "Assignment removed" });
  };

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-display font-bold text-text-primary">
              <UserCheck className="h-7 w-7 text-primary-500" aria-hidden />
              Teachers &amp; Staff
            </h1>
            <p className="mt-1 text-body text-text-secondary">
              Directory of staff and their class / subject assignments.
            </p>
          </div>
          <IfPermission code="teachers.assign">
            <Button onClick={handleOpenDialog}>
              <Plus className="h-4 w-4" />
              Assign Teacher
            </Button>
          </IfPermission>
        </header>

        {/* Search */}
        <div className="relative">
          <Input
            type="search"
            role="searchbox"
            aria-label="Search staff or assignments"
            placeholder="Search by name, role, class, or subject"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-3"
          />
        </div>

        {/* ---------- Staff directory ---------- */}
        <section aria-labelledby="staff-heading">
          <h2 id="staff-heading" className="mb-3 text-subtitle font-semibold text-text-primary">
            Staff Directory ({filteredStaff.length})
          </h2>

          {isError && (
            <ErrorState
              title="Couldn't load staff data"
              onRetry={() => refetch()}
            />
          )}

          {isLoading && <LoadingState pattern="table" rows={4} />}

          {!isError && !isLoading && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {filteredStaff.map((u) => {
                const roleLabel = ROLE_LABELS[u.role as Role] ?? { native: u.role, english: u.role };
                const assignmentCount = assignments.filter((a) => a.teacherId === u.id).length;
                return (
                  <Card key={u.id} className="shadow-elevation-1">
                    <CardContent className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <StudentAvatar name={u.name} size="md" />
                        <div className="min-w-0">
                          <p className="truncate text-body font-semibold text-text-primary">
                            {u.name}
                          </p>
                          <p className="truncate text-caption text-text-muted" lang="bn">
                            {u.nameBn}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={ROLE_TONE[u.role as Role] ?? "bg-neutral-100"}>
                          <Briefcase className="h-3 w-3" />
                          {roleLabel.english}
                        </Badge>
                        <span className="text-caption text-text-muted">
                          {assignmentCount} assignment{assignmentCount === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="space-y-1 text-caption text-text-secondary">
                        <p className="flex items-center gap-1.5 truncate">
                          <Mail className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                          <span className="truncate">{u.email}</span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                          {u.phone}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* ---------- Assignment grid ---------- */}
        <section aria-labelledby="assignments-heading">
          <h2 id="assignments-heading" className="mb-3 flex items-center gap-2 text-subtitle font-semibold text-text-primary">
            <BookOpen className="h-4 w-4 text-primary-500" />
            Teacher Assignments ({filteredAssignments.length})
          </h2>

          {isError && (
            <ErrorState title="Couldn't load assignments" onRetry={() => refetch()} />
          )}

          {isLoading && <LoadingState pattern="table" rows={5} />}

          {!isError && !isLoading && filteredAssignments.length === 0 && (
            <Card>
              <CardContent>
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <GraduationCap className="h-10 w-10 text-text-muted" aria-hidden />
                  <div>
                    <p className="text-body font-medium text-text-primary">No assignments yet</p>
                    <p className="text-caption text-text-secondary">
                      Assign a teacher to a class and subject to get started.
                    </p>
                  </div>
                  <IfPermission code="teachers.assign">
                    <Button size="sm" onClick={handleOpenDialog}>
                      <Plus className="h-4 w-4" />
                      Assign Teacher
                    </Button>
                  </IfPermission>
                </div>
              </CardContent>
            </Card>
          )}

          {!isError && !isLoading && filteredAssignments.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border-default bg-surface-card shadow-elevation-1">
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                    <TableHead className="ps-4 text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Teacher
                    </TableHead>
                    <TableHead className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Class
                    </TableHead>
                    <TableHead className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Subject
                    </TableHead>
                    <TableHead className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Subject code
                    </TableHead>
                    <TableHead className="pe-4 text-end text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.map((asg) => {
                    const u = userMap.get(asg.teacherId);
                    const c = classMap.get(asg.classId);
                    const s = subjectMap.get(asg.subjectId);
                    return (
                      <TableRow key={asg.id} className="hover:bg-surface-hover">
                        <TableCell className="ps-4">
                          <div className="flex items-center gap-2">
                            <StudentAvatar name={u?.name ?? "?"} size="sm" />
                            <div>
                              <p className="text-body font-medium text-text-primary">
                                {u?.name ?? "—"}
                              </p>
                              <p className="text-caption text-text-muted">
                                {ROLE_LABELS[u?.role as Role]?.english ?? u?.role}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-primary-50 text-primary-700">
                            <GraduationCap className="h-3 w-3" />
                            {c?.name ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-body text-text-primary">
                          {s?.name ?? "—"}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-caption text-text-secondary">
                            {s?.code ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell className="pe-4 text-end">
                          <IfPermission
                            code="teachers.assign"
                            fallback={
                              <span className="text-caption text-text-muted">—</span>
                            }
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Remove assignment for ${u?.name}`}
                              onClick={() => handleDeleteAssignment(asg.id)}
                            >
                              <Trash2 className="h-4 w-4 text-semantic-danger" />
                            </Button>
                          </IfPermission>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </div>

      {/* ---------- Assign Teacher dialog ---------- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary-500" />
              Assign Teacher
            </DialogTitle>
            <DialogDescription>
              Pick a teacher, a class, and a subject. Duplicate assignments are blocked.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="assign-teacher">Teacher</Label>
              <Select value={newTeacher} onValueChange={setNewTeacher}>
                <SelectTrigger id="assign-teacher" className="w-full">
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} · {ROLE_LABELS[u.role as Role]?.english ?? u.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assign-class">Class</Label>
              <Select value={newClass} onValueChange={setNewClass}>
                <SelectTrigger id="assign-class" className="w-full">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} (Sections: {c.sections.join(", ")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assign-subject">Subject</Label>
              <Select value={newSubject} onValueChange={setNewSubject}>
                <SelectTrigger id="assign-subject" className="w-full">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} · <span className="font-mono text-caption">{s.code}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {duplicateError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-semantic-danger/40 bg-danger-50 px-3 py-2 text-caption text-semantic-danger"
              >
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                <span>{duplicateError}</span>
              </div>
            )}

            {/* Live preview of what's about to be assigned */}
            {newTeacher && newClass && newSubject && !duplicateError && (
              <div className="rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-caption text-primary-700">
                <span className="font-medium">{userMap.get(newTeacher)?.name}</span> will teach{" "}
                <span className="font-medium">{subjectMap.get(newSubject)?.name}</span> to{" "}
                <span className="font-medium">{classMap.get(newClass)?.name}</span>.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              <XCircle className="h-4 w-4" />
              Cancel
            </Button>
            <IfPermission code="teachers.assign" fallback={null}>
              <Button onClick={handleConfirmAssign}>
                <Plus className="h-4 w-4" />
                Create Assignment
              </Button>
            </IfPermission>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
