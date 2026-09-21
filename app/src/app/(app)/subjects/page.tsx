"use client";

/**
 * MadrashaOS — Subjects management page (SRS §2.3.1)
 *
 * Route: /subjects
 *
 * Lists all subjects taught at the madrasha (Quran, Hadith, Fiqh, Arabic,
 * Bangla, Math, …). "Add Subject" opens a dialog to create a subject via
 * POST /api/v1/subjects. Each row supports edit (PATCH) and delete (soft
 * DELETE). Delete is blocked server-side when active teacher assignments
 * reference the subject — the user is shown the 409 message.
 *
 * Permissions:
 *   - Page visible only to roles with `academic.structure.view`
 *   - Add / Edit / Delete gated by `academic.structure.edit`
 *
 * Why this page exists: the Assign Teacher dialog (on /teachers) needs a
 * subject to be selected. If no subjects exist, that dropdown is empty.
 * This page is the single place where subjects are set up.
 */

import * as React from "react";
import {
  BookMarked, Plus, Save, Pencil, Trash2, XCircle, AlertCircle,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  LoadingState, ErrorState, PermissionDenied,
} from "@/components/states";
import { EmptyState } from "@/components/ui/empty-state";
import { IfPermission } from "@/components/auth/IfPermission";
import { useSubjects, queryClient } from "@/lib/query/client";
import { useToast } from "@/hooks/use-toast";
import { useSessionStore } from "@/stores/sessionStore";

/* ---------------------------------------------------------------
 * Types & constants
 * --------------------------------------------------------------- */

type Subject = {
  id: string;
  code: string;
  name: string;
  nameBn?: string | null;
  nameAr?: string | null;
  isQuranic: boolean;
  category?: string | null;
  fullMarks: number;
  passMarks: number;
  isActive: boolean;
  displayOrder: number;
};

const CATEGORIES = [
  { value: "quranic", label: "Quranic" },
  { value: "language", label: "Language" },
  { value: "science", label: "Science" },
  { value: "social", label: "Social" },
  { value: "arts", label: "Arts" },
] as const;

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label]),
);

/* ---------------------------------------------------------------
 * Page
 * --------------------------------------------------------------- */

export default function SubjectsPage() {
  const { hasPermission } = useSessionStore();
  const { data: rawSubjects, isLoading, isError, refetch } = useSubjects();

  const subjects = (rawSubjects ?? []) as Subject[];

  // Permission: page-level gate
  if (!hasPermission("academic.structure.view")) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <PermissionDenied resource="Subjects" />
        </div>
      </div>
    );
  }

  return (
    <SubjectsContent
      subjects={subjects}
      isLoading={isLoading}
      isError={isError}
      refetch={refetch}
    />
  );
}

/* ---------------------------------------------------------------
 * Inner content
 * --------------------------------------------------------------- */

type SubjectsContentProps = {
  subjects: Subject[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

function SubjectsContent({
  subjects, isLoading, isError, refetch,
}: SubjectsContentProps) {
  const { toast } = useToast();
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Form fields
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [nameBn, setNameBn] = React.useState("");
  const [nameAr, setNameAr] = React.useState("");
  const [isQuranic, setIsQuranic] = React.useState(false);
  const [category, setCategory] = React.useState<string>("");
  const [fullMarks, setFullMarks] = React.useState(100);
  const [passMarks, setPassMarks] = React.useState(33);
  const [displayOrder, setDisplayOrder] = React.useState(100);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = React.useState<Subject | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // Filtered list
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return subjects.filter((s) => {
      const matchesSearch =
        !q ||
        `${s.name} ${s.nameBn ?? ""} ${s.code}`.toLowerCase().includes(q);
      const matchesCategory =
        categoryFilter === "all" ||
        (s.category ?? "") === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [subjects, search, categoryFilter]);

  const quranicCount = subjects.filter((s) => s.isQuranic).length;
  const activeCount = subjects.filter((s) => s.isActive).length;

  function resetForm() {
    setCode("");
    setName("");
    setNameBn("");
    setNameAr("");
    setIsQuranic(false);
    setCategory("");
    setFullMarks(100);
    setPassMarks(33);
    setDisplayOrder(100);
    setFormError(null);
    setEditingId(null);
  }

  function openAdd() {
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(s: Subject) {
    setEditingId(s.id);
    setCode(s.code);
    setName(s.name);
    setNameBn(s.nameBn ?? "");
    setNameAr(s.nameAr ?? "");
    setIsQuranic(s.isQuranic);
    setCategory(s.category ?? "");
    setFullMarks(s.fullMarks);
    setPassMarks(s.passMarks);
    setDisplayOrder(s.displayOrder);
    setFormError(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    resetForm();
  }

  async function handleSubmit() {
    setFormError(null);
    if (!code.trim() || !name.trim()) {
      setFormError("Subject code and name (English) are required.");
      return;
    }
    if (passMarks > fullMarks) {
      setFormError("Pass marks cannot be greater than full marks.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        code: code.trim(),
        name: name.trim(),
        name_bn: nameBn.trim() || undefined,
        name_ar: nameAr.trim() || undefined,
        is_quranic: isQuranic,
        category: category || undefined,
        full_marks: fullMarks,
        pass_marks: passMarks,
        display_order: displayOrder,
      };

      const url = editingId
        ? `/api/v1/subjects/${editingId}`
        : "/api/v1/subjects";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setFormError(data?.error || `Failed (HTTP ${res.status})`);
        setSubmitting(false);
        return;
      }

      toast({
        title: editingId ? "Subject updated" : "Subject created",
        description: `${name} (${code})`,
      });

      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      closeDialog();
    } catch {
      setFormError("Network error — please try again.");
    }
    setSubmitting(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/subjects/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Could not delete",
          description: data?.error || `HTTP ${res.status}`,
          variant: "destructive",
        });
        setDeleting(false);
        return;
      }
      toast({ title: "Subject deleted", description: `${deleteTarget.name} (${deleteTarget.code})` });
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      setDeleteTarget(null);
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    }
    setDeleting(false);
  }

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-display font-bold text-text-primary">
              <BookMarked className="h-7 w-7 text-primary-500" aria-hidden />
              Subjects
            </h1>
            <p className="mt-1 text-body text-text-secondary">
              Manage the subjects taught at your madrasha. Add subjects here
              before assigning teachers.
            </p>
          </div>
          <IfPermission code="academic.structure.edit">
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add Subject
            </Button>
          </IfPermission>
        </header>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-surface-card">
            Total: {subjects.length}
          </Badge>
          <Badge variant="outline" className="bg-success-50 text-semantic-success">
            Active: {activeCount}
          </Badge>
          <Badge variant="outline" className="bg-primary-50 text-primary-700">
            Quranic: {quranicCount}
          </Badge>
        </div>

        {/* Search + category filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
            <Input
              type="search"
              role="searchbox"
              aria-label="Search subjects"
              placeholder="Search by name or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48" aria-label="Filter by category">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isError && <ErrorState title="Couldn't load subjects" onRetry={() => refetch()} />}
        {isLoading && <LoadingState pattern="table" rows={5} />}

        {!isError && !isLoading && filtered.length === 0 && (
          <EmptyState
            illustration="generic"
            title={subjects.length === 0 ? "No subjects yet" : "No matching subjects"}
            description={
              subjects.length === 0
                ? "Add the subjects taught at your madrasha (Quran, Hadith, Arabic, Bangla, …). You need at least one subject before you can assign teachers."
                : "Try a different search or category filter."
            }
            action={
              subjects.length === 0 ? (
                <IfPermission code="academic.structure.edit">
                  <Button onClick={openAdd}>
                    <Plus className="h-4 w-4" />
                    Add Subject
                  </Button>
                </IfPermission>
              ) : undefined
            }
          />
        )}

        {!isError && !isLoading && filtered.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-border-default bg-surface-card shadow-elevation-1">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                  <TableHead className="ps-4 text-caption font-semibold uppercase tracking-wide text-text-muted">
                    Code
                  </TableHead>
                  <TableHead className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                    Subject
                  </TableHead>
                  <TableHead className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                    Category
                  </TableHead>
                  <TableHead className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                    Marks
                  </TableHead>
                  <TableHead className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                    Status
                  </TableHead>
                  <TableHead className="pe-4 text-end text-caption font-semibold uppercase tracking-wide text-text-muted">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id} className="hover:bg-surface-hover">
                    <TableCell className="ps-4">
                      <span className="font-mono text-caption font-semibold text-text-primary">
                        {s.code}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-body font-medium text-text-primary">
                          {s.name}
                        </span>
                        {s.isQuranic && (
                          <Badge variant="secondary" className="bg-primary-50 text-primary-700">
                            Quranic
                          </Badge>
                        )}
                      </div>
                      {s.nameBn && (
                        <p className="text-caption text-text-muted" lang="bn">{s.nameBn}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {s.category ? (
                        <Badge variant="outline">
                          {CATEGORY_LABEL[s.category] ?? s.category}
                        </Badge>
                      ) : (
                        <span className="text-caption text-text-muted">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-caption text-text-secondary">
                      <span className="font-medium text-text-primary">{s.fullMarks}</span>
                      {" / "}
                      pass {s.passMarks}
                    </TableCell>
                    <TableCell>
                      {s.isActive ? (
                        <Badge variant="outline" className="bg-success-50 text-semantic-success">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-neutral-100 text-text-muted">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="pe-4 text-end">
                      <IfPermission
                        code="academic.structure.edit"
                        fallback={<span className="text-caption text-text-muted">—</span>}
                      >
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${s.name}`}
                            onClick={() => openEdit(s)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${s.name}`}
                            onClick={() => setDeleteTarget(s)}
                          >
                            <Trash2 className="h-4 w-4 text-semantic-danger" />
                          </Button>
                        </div>
                      </IfPermission>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ---------- Add / Edit dialog ---------- */}
      <Dialog open={dialogOpen} onOpenChange={(o) => (o ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary-500" />
              {editingId ? "Edit Subject" : "Add New Subject"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the subject details below."
                : "Create a subject taught at your madrasha (e.g. Quran, Arabic, Bangla). You'll select these when assigning teachers."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="subj-code">Code *</Label>
                <Input
                  id="subj-code"
                  placeholder="QUR"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="font-mono"
                  disabled={!!editingId}
                />
                <p className="text-caption text-text-muted">Short, unique code (e.g. QUR, ARB).</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subj-name">Name (English) *</Label>
                <Input
                  id="subj-name"
                  placeholder="Quran"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="subj-name-bn">নাম (বাংলা)</Label>
                <Input
                  id="subj-name-bn"
                  placeholder="কুরআন"
                  value={nameBn}
                  onChange={(e) => setNameBn(e.target.value)}
                  lang="bn"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subj-name-ar">الاسم (Arabic)</Label>
                <Input
                  id="subj-name-ar"
                  placeholder="القرآن"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  lang="ar"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="subj-category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="subj-category" className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subj-order">Display order</Label>
                <Input
                  id="subj-order"
                  type="number"
                  min={0}
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="subj-full">Full marks</Label>
                <Input
                  id="subj-full"
                  type="number"
                  min={1}
                  max={1000}
                  value={fullMarks}
                  onChange={(e) => setFullMarks(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subj-pass">Pass marks</Label>
                <Input
                  id="subj-pass"
                  type="number"
                  min={0}
                  max={fullMarks}
                  value={passMarks}
                  onChange={(e) => setPassMarks(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-md border border-border-default bg-surface-hover px-3 py-2.5">
              <Checkbox
                id="subj-quranic"
                checked={isQuranic}
                onCheckedChange={(v) => setIsQuranic(v === true)}
              />
              <Label htmlFor="subj-quranic" className="cursor-pointer text-body">
                Quranic subject
                <span className="block text-caption text-text-muted">
                  Check for Quran, Hadith, Fiqh, Tajweed, etc.
                </span>
              </Label>
            </div>

            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-semantic-danger/40 bg-danger-50 px-3 py-2 text-caption text-semantic-danger"
              >
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                <span>{formError}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              <XCircle className="h-4 w-4" />
              Cancel
            </Button>
            <IfPermission code="academic.structure.edit" fallback={null}>
              <Button onClick={handleSubmit} disabled={submitting}>
                <Save className="h-4 w-4" />
                {submitting ? "Saving…" : editingId ? "Save Changes" : "Create Subject"}
              </Button>
            </IfPermission>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Delete confirmation ---------- */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-semantic-danger" />
              Delete Subject?
            </DialogTitle>
            <DialogDescription>
              You are about to delete{" "}
              <span className="font-medium text-text-primary">{deleteTarget?.name}</span>{" "}
              ({deleteTarget?.code}). This cannot be undone.
              {deleteTarget?.isQuranic && " This is a Quranic subject."}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-semantic-danger/40 bg-danger-50 px-3 py-2 text-caption text-semantic-danger">
            If this subject is used in active teacher assignments, the deletion
            will be blocked. Remove those assignments first.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              <Trash2 className="h-4 w-4" />
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
