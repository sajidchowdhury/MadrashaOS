"use client";

/**
 * MadrashaOS — Reports Page (C4.3 — Platform · Reports)
 *
 * Reporting dashboard per SRS §6.5 (Async report generation) with:
 *   - 6 report-type cards (mock):
 *       Student Summary, Fee Collection, Ledger Statement, Attendance Report,
 *       Zakat Statement, Inventory Valuation
 *   - Each card: name, description, "Generate" button, last-generated date
 *   - "Generate" opens a filter dialog: date range (from/to), branch filter,
 *     format (PDF/Excel)
 *   - On generate: show toast "Report queued — download will be available in
 *     /documents" (mock async job per SRS §6.5)
 *   - Finance reports gated by IfPermission code="reports.finance.view" —
 *     if user lacks permission, the card renders PermissionDenied inline
 *     (Do-Not-Do D3 enforcement — teachers see denial, not the card)
 *   - Recent reports table at bottom (mock: 5 recently generated reports
 *     with download links)
 *
 *   Loading → no async fetch (inline mock) — instant render
 *   Empty   → not applicable (cards always render)
 */

import * as React from "react";
import { BarChart3, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useSessionStore } from "@/stores/sessionStore";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatDate, formatNumber } from "@/lib/i18n/format";
import { PermissionDenied } from "@/components/states";
import {
  ReportCard,
  ReportIcons,
  GenerateReportDialog,
  type ReportType,
} from "@/components/communication";

// 6 inline-mock report types covering all three categories.
const REPORT_TYPES: ReportType[] = [
  {
    id: "rpt-student-summary",
    name: "Student Summary",
    description: "Headcount, demographics, and admissions per class & branch.",
    category: "academic",
    icon: ReportIcons.BarChart3,
    lastGeneratedAt: "2026-09-15",
  },
  {
    id: "rpt-fee-collection",
    name: "Fee Collection",
    description: "Collected vs outstanding installments with receipt numbers.",
    category: "finance",
    icon: ReportIcons.Wallet,
    lastGeneratedAt: "2026-09-14",
  },
  {
    id: "rpt-ledger-statement",
    name: "Ledger Statement",
    description: "Double-entry ledger with running balance for the period.",
    category: "finance",
    icon: ReportIcons.Calculator,
    lastGeneratedAt: "2026-09-13",
  },
  {
    id: "rpt-attendance",
    name: "Attendance Report",
    description: "Class-wise attendance rates, late arrivals, and absences.",
    category: "academic",
    icon: ReportIcons.ClipboardCheck,
    lastGeneratedAt: "2026-09-12",
  },
  {
    id: "rpt-zakat-statement",
    name: "Zakat Statement",
    description: "Zakat received vs distributed, fund-isolated per SRS §3.7.",
    category: "finance",
    icon: ReportIcons.Scale,
    lastGeneratedAt: "2026-09-10",
  },
  {
    id: "rpt-inventory-valuation",
    name: "Inventory Valuation",
    description: "Stock-on-hand valuation with low-stock alerts.",
    category: "operations",
    icon: ReportIcons.Package,
    lastGeneratedAt: "2026-09-08",
  },
];

// 5 inline-mock recently generated reports.
type RecentReport = {
  id: string;
  name: string;
  format: "PDF" | "Excel";
  generatedAt: string;
  generatedBy: string;
  sizeBytes: number;
  status: "ready" | "processing" | "failed";
};

const RECENT_REPORTS: RecentReport[] = [
  { id: "rr-1", name: "Student Summary — September 2026", format: "PDF", generatedAt: "2026-09-15", generatedBy: "Administrator Karim", sizeBytes: 245_000, status: "ready" },
  { id: "rr-2", name: "Fee Collection — August 2026", format: "Excel", generatedAt: "2026-09-14", generatedBy: "Accountant Rahman", sizeBytes: 1_180_000, status: "ready" },
  { id: "rr-3", name: "Ledger Statement — Q3 2026", format: "PDF", generatedAt: "2026-09-13", generatedBy: "Accountant Rahman", sizeBytes: 895_000, status: "ready" },
  { id: "rr-4", name: "Attendance Report — Week 37", format: "PDF", generatedAt: "2026-09-12", generatedBy: "Teacher Bilal", sizeBytes: 134_000, status: "processing" },
  { id: "rr-5", name: "Zakat Statement — Q3 2026", format: "Excel", generatedAt: "2026-09-10", generatedBy: "Accountant Rahman", sizeBytes: 76_000, status: "ready" },
];

const STATUS_TONE: Record<RecentReport["status"], string> = {
  ready: "border-semantic-success/40 text-semantic-success bg-success-50",
  processing: "border-semantic-warning/40 text-semantic-warning bg-warning-50",
  failed: "border-semantic-danger/40 text-semantic-danger bg-danger-50",
};

function formatSize(bytes: number, locale: ReturnType<typeof useI18n>["locale"]) {
  if (bytes < 1024) return `${formatNumber(bytes, locale)} B`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    const r = kb >= 100 ? Math.round(kb) : Math.round(kb * 10) / 10;
    return `${formatNumber(r, locale)} KB`;
  }
  const mb = bytes / (1024 * 1024);
  const r = mb >= 100 ? Math.round(mb) : Math.round(mb * 10) / 10;
  return `${formatNumber(r, locale)} MB`;
}

export default function ReportsPage() {
  const { locale } = useI18n();
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const canView = hasPermission("reports.view");
  const canViewFinance = hasPermission("reports.finance.view");

  const [generateOpen, setGenerateOpen] = React.useState(false);
  const [selectedReport, setSelectedReport] = React.useState<ReportType | null>(null);

  if (!canView) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <PermissionDenied resource="Reports" />
        </div>
      </div>
    );
  }

  const handleGenerate = (report: ReportType) => {
    setSelectedReport(report);
    setGenerateOpen(true);
  };

  const academicCount = REPORT_TYPES.filter((r) => r.category === "academic").length;
  const financeCount = REPORT_TYPES.filter((r) => r.category === "finance").length;
  const opsCount = REPORT_TYPES.filter((r) => r.category === "operations").length;

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-display font-bold text-text-primary">Reports</h1>
            <p className="mt-1 text-body text-text-secondary">
              Generate periodic statements across academic, finance, and operations. Finance reports require additional permission (D3).
            </p>
          </div>
        </header>

        {/* KPI strip */}
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-border-default bg-surface-card p-4">
            <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
              Total Reports
            </p>
            <p className="mt-1 font-mono text-display font-bold text-primary-500">
              {formatNumber(REPORT_TYPES.length, locale)}
            </p>
          </div>
          <div className="rounded-lg border border-border-default bg-surface-card p-4">
            <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
              Academic
            </p>
            <p className="mt-1 font-mono text-display font-bold text-text-primary">
              {formatNumber(academicCount, locale)}
            </p>
          </div>
          <div className="rounded-lg border border-border-default bg-surface-card p-4">
            <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
              Finance {canViewFinance ? "" : "(locked)"}
            </p>
            <p className={`mt-1 font-mono text-display font-bold ${canViewFinance ? "text-accent-500" : "text-text-muted"}`}>
              {formatNumber(financeCount, locale)}
            </p>
          </div>
          <div className="rounded-lg border border-border-default bg-surface-card p-4">
            <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
              Operations
            </p>
            <p className="mt-1 font-mono text-display font-bold text-semantic-success">
              {formatNumber(opsCount, locale)}
            </p>
          </div>
        </div>

        {/* Report-type cards grid */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-title font-semibold text-text-primary">Report Types</h2>
            <Badge variant="outline" className="border-border-strong text-text-secondary">
              {REPORT_TYPES.length} available
            </Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {REPORT_TYPES.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                locale={locale}
                onGenerate={handleGenerate}
                denied={report.category === "finance" && !canViewFinance}
              />
            ))}
          </div>
        </section>

        {/* Recent reports table */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-title font-semibold text-text-primary">
              <FileText className="h-4 w-4 text-text-secondary" aria-hidden="true" />
              Recent Reports
            </h2>
            <span className="text-caption text-text-muted">
              {formatNumber(RECENT_REPORTS.length, locale)} generated recently
            </span>
          </div>
          <div className="overflow-hidden rounded-lg border border-border-default bg-surface-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50">
                    <TableHead className="px-4">Name</TableHead>
                    <TableHead className="px-4">Format</TableHead>
                    <TableHead className="hidden px-4 sm:table-cell">Size</TableHead>
                    <TableHead className="px-4">Generated At</TableHead>
                    <TableHead className="hidden px-4 md:table-cell">Generated By</TableHead>
                    <TableHead className="px-4">Status</TableHead>
                    <TableHead className="px-4 text-end">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {RECENT_REPORTS.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
                          <p className="text-body font-medium text-text-primary">{r.name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge variant="outline" className="border-border-strong text-text-secondary">
                          {r.format}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden px-4 py-3 font-mono text-caption text-text-secondary sm:table-cell">
                        {formatSize(r.sizeBytes, locale)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-caption text-text-muted">
                        {formatDate(new Date(r.generatedAt), locale)}
                      </TableCell>
                      <TableCell className="hidden px-4 py-3 text-body text-text-secondary md:table-cell">
                        {r.generatedBy}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge variant="outline" className={STATUS_TONE[r.status]}>
                          <span className="capitalize">{r.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-end">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={r.status !== "ready"}
                          aria-label={`Download ${r.name}`}
                        >
                          <Download className="h-4 w-4" />
                          <span className="hidden sm:inline">Download</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <p className="text-caption text-text-muted">
            Reports with status &ldquo;processing&rdquo; are queued — download will be available once ready (SRS §6.5).
          </p>
        </section>
      </div>

      {/* Generate dialog */}
      <GenerateReportDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        report={selectedReport}
      />
    </div>
  );
}
