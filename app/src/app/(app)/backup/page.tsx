"use client";

/**
 * MadrashaOS — Backup & Restore page (SRS §2.1.6)
 *
 * Session 8.4: Wired to real API — GET /api/v1/backup lists BackupRecord
 * rows, POST /api/v1/backup runs a real pg_dump via child_process.exec.
 * Replaces the mock setTimeout + fake data.
 */

import * as React from "react";
import { DatabaseBackup, Download, RotateCcw, Play, HardDrive, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IfPermission } from "@/components/auth/IfPermission";
import { PermissionDenied, LoadingState, ErrorState } from "@/components/states";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/i18n/format";

type BackupRecord = {
  id: string;
  backup_type: string;
  status: string;
  size_bytes: number | null;
  storage_url: string | null;
  triggered_by: string | null;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
};

export default function BackupPage() {
  const { toast } = useToast();
  const [running, setRunning] = React.useState(false);
  const [backups, setBackups] = React.useState<BackupRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  // Fetch real backup records on mount
  const fetchBackups = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/v1/backup?pageSize=20", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBackups(data.data ?? []);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const runBackup = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/v1/backup", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Backup failed",
          description: data?.error || `Server returned ${res.status}.`,
          variant: "destructive",
        });
        setRunning(false);
        return;
      }
      toast({
        title: "Backup completed",
        description: data?.message || data?.data?.message || "Backup created successfully.",
      });
      // Refetch the list
      fetchBackups();
    } catch {
      toast({
        title: "Network error",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    }
    setRunning(false);
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(0)} KB`;
    return `${(bytes / 1_000_000).toFixed(1)} MB`;
  };

  return (
    <IfPermission code="backup.run" fallback={<PermissionDenied />}>
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-display font-bold text-text-primary">
                <DatabaseBackup className="h-7 w-7 text-primary-500" aria-hidden />
                Backup & Restore
              </h1>
              <p className="mt-1 text-body text-text-secondary">
                Manual and scheduled database backups. Download or restore as needed.
              </p>
            </div>
            <Button onClick={runBackup} disabled={running}>
              <Play className="h-4 w-4" />
              {running ? "Running…" : "Run Backup Now"}
            </Button>
          </header>

          <div className="flex items-start gap-3 rounded-lg border border-semantic-info/30 bg-blue-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <p className="text-body font-medium text-blue-900">
                Production backups
              </p>
              <p className="mt-1 text-caption text-blue-800">
                For production, set up a daily cron job using <code className="font-mono">scripts/backup.sh</code>{" "}
                (see DEPLOYMENT.md). This UI button runs an on-demand <code className="font-mono">pg_dump</code> —
                suitable for manual backups but not for scheduled ones.
              </p>
            </div>
          </div>

          <Card className="border-border-default shadow-elevation-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-subtitle">
                <HardDrive className="h-5 w-5 text-primary-600" />
                Backup History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <LoadingState pattern="table" />
              ) : error ? (
                <ErrorState onRetry={fetchBackups} />
              ) : backups.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border-default bg-surface-card p-8 text-center">
                  <DatabaseBackup className="mx-auto mb-3 h-10 w-10 text-text-muted" />
                  <p className="text-body text-text-secondary">
                    No backups yet. Click &ldquo;Run Backup Now&rdquo; to create one.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border-default">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-neutral-50">
                        <TableHead className="ps-4 text-caption font-semibold uppercase text-text-muted">Type</TableHead>
                        <TableHead className="text-caption font-semibold uppercase text-text-muted">Size</TableHead>
                        <TableHead className="text-caption font-semibold uppercase text-text-muted">Status</TableHead>
                        <TableHead className="text-caption font-semibold uppercase text-text-muted">Started</TableHead>
                        <TableHead className="text-caption font-semibold uppercase text-text-muted">Completed</TableHead>
                        <TableHead className="pe-4 text-end text-caption font-semibold uppercase text-text-muted">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backups.map((b) => (
                        <TableRow key={b.id} className="hover:bg-surface-hover">
                          <TableCell className="ps-4 text-body text-text-primary">
                            <Badge variant="outline" className="capitalize">{b.backup_type}</Badge>
                          </TableCell>
                          <TableCell className="text-body text-text-secondary">{formatSize(b.size_bytes)}</TableCell>
                          <TableCell>
                            <Badge variant={b.status === "completed" ? "default" : "destructive"} className="capitalize">
                              {b.status}
                            </Badge>
                            {b.error_message && (
                              <p className="mt-1 text-caption text-semantic-danger">{b.error_message}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-body text-text-secondary">{formatDate(new Date(b.started_at), "en")}</TableCell>
                          <TableCell className="text-body text-text-secondary">
                            {b.completed_at ? formatDate(new Date(b.completed_at), "en") : "—"}
                          </TableCell>
                          <TableCell className="pe-4 text-end">
                            <div className="flex justify-end gap-1">
                              {b.storage_url && b.status === "completed" && (
                                <a href={b.storage_url} target="_blank" rel="noopener noreferrer">
                                  <Button variant="ghost" size="sm" aria-label="Download backup">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </a>
                              )}
                              <Button variant="ghost" size="sm" aria-label="Restore backup" disabled>
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </IfPermission>
  );
}
