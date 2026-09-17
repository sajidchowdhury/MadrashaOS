"use client";

/**
 * MadrashaOS — Report Card (C4.3 — Platform · Reports)
 *
 * A single card in the Reports dashboard showing a report type.
 * Shows: report name, description, "Generate" button, last-generated date.
 *
 * Finance reports are gated by IfPermission code="reports.finance.view" —
 * the parent page passes a `denied` flag so the card renders the
 * PermissionDenied component instead of the generate flow (Do-Not-Do D3).
 */

import * as React from "react";
import { BarChart3, FileText, Wallet, Calculator, ClipboardCheck, Scale, Package, ChevronRight } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/i18n/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type ReportCategory = "academic" | "finance" | "operations";

export type ReportType = {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  icon: React.ComponentType<{ className?: string }>;
  lastGeneratedAt?: string; // ISO date
};

const CATEGORY_META: Record<
  ReportCategory,
  { label: string; tone: string }
> = {
  academic: {
    label: "Academic",
    tone: "bg-primary-50 text-primary-700 border-primary-500/30",
  },
  finance: {
    label: "Finance",
    tone: "bg-accent-50 text-accent-700 border-accent-500/30",
  },
  operations: {
    label: "Operations",
    tone: "bg-success-50 text-semantic-success border-semantic-success/30",
  },
};

export function ReportCard({
  report,
  locale,
  onGenerate,
  denied,
}: {
  report: ReportType;
  locale: Locale;
  onGenerate: (report: ReportType) => void;
  denied?: boolean;
}) {
  const Icon = report.icon;
  const catMeta = CATEGORY_META[report.category];

  if (denied) {
    return (
      <Card
        data-slot="report-card-denied"
        className="border-dashed border-border-default bg-surface-hover opacity-90"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-subtitle text-text-secondary">
            <Icon className="h-5 w-5 text-text-muted" aria-hidden="true" />
            {report.name}
          </CardTitle>
          <CardDescription>{report.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start gap-2 rounded-md border border-dashed border-border-default bg-surface-card px-3 py-4">
            <Lock className="h-4 w-4 text-text-secondary" aria-hidden="true" />
            <p className="text-caption text-text-secondary">
              You don&apos;t have permission to view finance reports.
            </p>
            <p className="text-caption text-text-muted">
              Contact admin: <a href="mailto:admin@madrashaos.org" className="text-primary-500 underline">admin@madrashaos.org</a>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-slot="report-card" className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-700">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <CardTitle className="text-subtitle">{report.name}</CardTitle>
              <Badge variant="outline" className={`mt-1 ${catMeta.tone}`}>
                {catMeta.label}
              </Badge>
            </div>
          </div>
        </div>
        <CardDescription className="mt-2">{report.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-3">
        <p className="text-caption text-text-muted">
          {report.lastGeneratedAt
            ? `Last generated: ${formatDate(new Date(report.lastGeneratedAt), locale)}`
            : "Never generated yet"}
        </p>
        <Button
          variant="default"
          size="sm"
          onClick={() => onGenerate(report)}
          className="w-full sm:w-auto"
        >
          Generate
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

/* --- Lucide icons re-exported for the reports page mock data --- */
export const ReportIcons = {
  BarChart3, FileText, Wallet, Calculator, ClipboardCheck, Scale, Package,
};

// Inline Lock icon (avoid re-importing from states) so this component stays
// self-contained for the "denied" card visual.
function Lock({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
