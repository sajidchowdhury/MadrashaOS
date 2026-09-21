"use client";

/**
 * MadrashaOS — Academic Structure page (SRS §2.3.1)
 *
 * Lists classes + sections. Add Class button opens a dialog to create
 * a new class via POST /api/v1/classes, then optionally add sections
 * via POST /api/v1/classes/:id/sections.
 */

import * as React from "react";
import { CalendarDays, BookOpen, Layers, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { IfPermission } from "@/components/auth/IfPermission";
import { PermissionDenied, LoadingState, ErrorState } from "@/components/states";
import { useClasses, queryClient } from "@/lib/query/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/hooks/use-toast";

export default function AcademicStructurePage() {
  const { locale } = useI18n();
  const { toast } = useToast();
  const { data: classes, isLoading, isError, refetch } = useClasses();
  const [search, setSearch] = React.useState("");

  // Add Class dialog state
  const [addClassOpen, setAddClassOpen] = React.useState(false);
  const [className, setClassName] = React.useState("");
  const [classNameBn, setClassNameBn] = React.useState("");
  const [classLevel, setClassLevel] = React.useState(1);
  const [sectionNames, setSectionNames] = React.useState("A");
  const [submitting, setSubmitting] = React.useState(false);

  const filtered = React.useMemo(() => {
    if (!classes) return [];
    const q = search.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter((c: { name?: string; nameBn?: string }) =>
      `${c.name ?? ""} ${c.nameBn ?? ""}`.toLowerCase().includes(q),
    );
  }, [classes, search]);

  const handleAddClass = async () => {
    if (!className.trim() || !classNameBn.trim()) {
      toast({ title: "Missing fields", description: "Class name (English + Bangla) is required.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // 1. Create the class
      const res = await fetch("/api/v1/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: className.trim(),
          name_bn: classNameBn.trim(),
          level: classLevel,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: "Failed to create class", description: data?.error || `HTTP ${res.status}`, variant: "destructive" });
        setSubmitting(false);
        return;
      }

      const classId = data?.data?.id || data?.id;

      // 2. Create sections (comma-separated: "A,B" → 2 sections)
      const sections = sectionNames.split(",").map((s) => s.trim()).filter(Boolean);
      for (const sectionName of sections) {
        await fetch(`/api/v1/classes/${classId}/sections`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: sectionName }),
        });
      }

      toast({ title: "Class created", description: `${className} with ${sections.length} section(s)` });

      // Reset + close
      setClassName("");
      setClassNameBn("");
      setClassLevel(1);
      setSectionNames("A");
      setAddClassOpen(false);

      // Refetch classes
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    } catch {
      toast({ title: "Network error", description: "Please try again.", variant: "destructive" });
    }
    setSubmitting(false);
  };

  return (
    <IfPermission code="academic.structure.view" fallback={<PermissionDenied />}>
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-display font-bold text-text-primary">
                <CalendarDays className="h-7 w-7 text-primary-500" aria-hidden />
                Academic Structure
              </h1>
              <p className="mt-1 text-body text-text-secondary">
                Manage classes, sections, and subject assignments.
              </p>
            </div>
            <IfPermission code="academic.structure.edit">
              <Button onClick={() => setAddClassOpen(true)}>
                <Plus className="h-4 w-4" />
                Add Class
              </Button>
            </IfPermission>
          </header>

          <Input
            placeholder="Search classes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />

          {isLoading ? (
            <LoadingState pattern="card-grid" />
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c: { id: string; name: string; nameBn?: string; level?: number; sections?: string[] }) => (
                <Card key={c.id} className="border-border-default shadow-elevation-1">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-subtitle">
                      <span className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-primary-600" />
                        {c.name}
                      </span>
                      <Badge variant="outline" className="font-mono">Level {c.level ?? "—"}</Badge>
                    </CardTitle>
                    {c.nameBn && (
                      <p className="text-caption text-text-secondary" lang="bn">{c.nameBn}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-body text-text-secondary">
                      <BookOpen className="h-4 w-4 text-text-muted" />
                      <span>{c.sections?.length ?? 0} sections:</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(c.sections ?? []).map((s: string) => (
                        <Badge key={s} variant="secondary">{s}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filtered.length === 0 && (
                <p className="text-body text-text-secondary">No classes found.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Class Dialog */}
      <Dialog open={addClassOpen} onOpenChange={setAddClassOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary-500" />
              Add New Class
            </DialogTitle>
            <DialogDescription>
              Create a new class with sections. Sections can be added as comma-separated names (e.g. A, B, C).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="class-name">Class Name (English) *</Label>
              <Input id="class-name" placeholder="Class 1" value={className} onChange={(e) => setClassName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-name-bn">ক্লাসের নাম (বাংলা) *</Label>
              <Input id="class-name-bn" placeholder="প্রথম শ্রেণী" value={classNameBn} onChange={(e) => setClassNameBn(e.target.value)} lang="bn" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-level">Level (1-15) *</Label>
              <Input id="class-level" type="number" min={1} max={15} value={classLevel} onChange={(e) => setClassLevel(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sections">Sections (comma-separated)</Label>
              <Input id="sections" placeholder="A, B" value={sectionNames} onChange={(e) => setSectionNames(e.target.value)} />
              <p className="text-caption text-text-muted">e.g. "A" for one section, "A, B" for two sections.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddClassOpen(false)}>Cancel</Button>
            <Button onClick={handleAddClass} disabled={submitting}>
              <Save className="h-4 w-4" />
              {submitting ? "Creating…" : "Create Class"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </IfPermission>
  );
}
