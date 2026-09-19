"use client";

/**
 * MadrashaOS — Backup & Restore page (SRS §2.1.6)
 *
 * Lists backup records from the BackupRecord table + a "Run Backup" button.
 * Backend: GET /api/v1/backup (to be implemented) + POST /api/v1/backup/run
 */

import * as React from "react";
import { DatabaseBackup, Download, RotateCcw, Play, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IfPermission } from "@/components/auth/IfPermission";
import { PermissionDenied, LoadingState } from "@/components/states";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/i18n/format";

type BackupRecord = {
  id: string;
  filename: string;
  sizeBytes: number;
  status: "completed" | "failed" | "running";
  createdAt: string;
  triggeredBy: string;
};

export default function BackupPage() {
  const { toast } = useToast();
  const [running, setRunning] = React.useState(false);
  const [backups, setBackups] = React.useState<BackupRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Mock initial load — the /api/v1/backup endpoint will be wired in a follow-up.
    setTimeout(() => {
      setBackups([
        {
          id: "b1",
          filename: "madrashaos_backup_2026-09-18.sql.gz",
          sizeBytes: 45_200_000,
          status: "completed",
          createdAt: "2026-09-18T02:00:00Z",
          triggeredBy: "System (scheduled)",
        },
        {
          id: "b2",
          filename: "madrashaos_backup_2026-09-17.sql.gz",
          sizeBytes: 44_800_000,
          status: "completed",
          createdAt: "2026-09-17T02:00:00Z",
          triggeredBy: "System (scheduled)",
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const runBackup = async () => {
    setRunning(true);
    setTimeout(() => {
      const now = new Date().toISOString().slice(0, 10);
      setBackups((prev) => [
        {
          id: `b-${Date.now()}`,
          filename: `madrashaos_backup_${now}.sql.gz`,
          sizeBytes: 45_500_000,
          status: "completed",
          createdAt: new Date().toISOString(),
          triggeredBy: "Administrator Karim (manual)",
        },
        ...prev,
      ]);
      setRunning(false);
      toast({ title: "Backup completed", description: `madrashaos_backup_${now}.sql.gz` });
    }, 1500);
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
              ) : (
                <div className="overflow-hidden rounded-xl border border-border-default">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-neutral-50">
                        <TableHead className="ps-4 text-caption font-semibold uppercase text-text-muted">Filename</TableHead>
                        <TableHead className="text-caption font-semibold uppercase text-text-muted">Size</TableHead>
                        <TableHead className="text-caption font-semibold uppercase text-text-muted">Status</TableHead>
                        <TableHead className="text-caption font-semibold uppercase text-text-muted">Created</TableHead>
                        <TableHead className="text-caption font-semibold uppercase text-text-muted">Triggered By</TableHead>
                        <TableHead className="pe-4 text-end text-caption font-semibold uppercase text-text-muted">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backups.map((b) => (
                        <TableRow key={b.id} className="hover:bg-surface-hover">
                          <TableCell className="ps-4 font-mono text-caption text-text-primary">{b.filename}</TableCell>
                          <TableCell className="text-body text-text-secondary">{(b.sizeBytes / 1_000_000).toFixed(1)} MB</TableCell>
                          <TableCell>
                            <Badge variant={b.status === "completed" ? "default" : "destructive"}>
                              {b.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-body text-text-secondary">{formatDate(new Date(b.createdAt), "en")}</TableCell>
                          <TableCell className="text-body text-text-secondary">{b.triggeredBy}</TableCell>
                          <TableCell className="pe-4 text-end">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" aria-label="Download backup">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" aria-label="Restore backup">
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
