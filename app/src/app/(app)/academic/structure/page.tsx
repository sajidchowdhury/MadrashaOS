"use client";

/**
 * MadrashaOS — Academic Structure page (SRS §2.3.1)
 *
 * Lists classes + sections + subjects. Backend: GET /api/v1/classes (already
 * exists, returns classes with nested sections). Subjects: GET /api/v1/subjects.
 */

import * as React from "react";
import { CalendarDays, BookOpen, Layers, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { IfPermission } from "@/components/auth/IfPermission";
import { PermissionDenied, LoadingState, ErrorState } from "@/components/states";
import { useClasses, useCurrentUser } from "@/lib/query/client";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function AcademicStructurePage() {
  const { locale } = useI18n();
  const { data: classes, isLoading, isError, refetch } = useClasses();
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    if (!classes) return [];
    const q = search.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter((c: { name?: string; nameBn?: string }) =>
      `${c.name ?? ""} ${c.nameBn ?? ""}`.toLowerCase().includes(q),
    );
  }, [classes, search]);

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
              <Button>
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
    </IfPermission>
  );
}
