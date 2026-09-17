"use client";

/**
 * MadrashaOS — Generate Report Dialog (C4.3 — Platform · Reports)
 *
 * Filter dialog for generating a report:
 *   - Date range (from / to using DateInput)
 *   - Branch filter (dropdown — mock: All branches + Dhaka)
 *   - Format (PDF / Excel — radio group)
 *
 * On generate: show toast "Report queued — download will be available in
 * /documents" (mock async job per SRS §6.5).
 *
 * The parent page owns the permission gate; this dialog does not re-check.
 */

import * as React from "react";
import { BarChart3, CheckCircle2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { ReportType } from "./ReportCard";

type Format = "pdf" | "excel";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ReportType | null;
};

export function GenerateReportDialog({ open, onOpenChange, report }: Props) {
  const { locale } = useI18n();
  const { toast } = useToast();

  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [branch, setBranch] = React.useState("all");
  const [format, setFormat] = React.useState<Format>("pdf");
  const [queued, setQueued] = React.useState(false);

  // Reset state whenever the dialog opens fresh.
  React.useEffect(() => {
    if (open) {
      setFromDate("");
      setToDate("");
      setBranch("all");
      setFormat("pdf");
      setQueued(false);
    }
  }, [open]);

  const canGenerate = !!report && fromDate.trim() !== "" && toDate.trim() !== "";

  const handleGenerate = () => {
    if (!report || !canGenerate) return;
    setQueued(true);
    toast({
      title: "Report queued",
      description: `${report.name} (${format.toUpperCase()}) · ${formatDate(new Date(fromDate), locale)} → ${formatDate(new Date(toDate), locale)}. Download will be available in /documents.`,
    });
    // Auto-close after a short delay so the user sees the success state.
    setTimeout(() => {
      onOpenChange(false);
    }, 800);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-subtitle">
            <BarChart3 className="h-5 w-5 text-primary-500" aria-hidden="true" />
            Generate Report
          </DialogTitle>
          <DialogDescription>
            {report
              ? `${report.name} — set the date range, branch, and output format.`
              : "Select a report to generate from the dashboard."}
          </DialogDescription>
        </DialogHeader>

        {!queued ? (
          <div className="space-y-4">
            {/* Date range */}
            <div className="grid gap-3 sm:grid-cols-2">
              <DateInput
                label="From"
                value={fromDate}
                onValueChange={setFromDate}
                banglaToggle
                aria-required="true"
              />
              <DateInput
                label="To"
                value={toDate}
                onValueChange={setToDate}
                banglaToggle
                aria-required="true"
              />
            </div>
            {!fromDate || !toDate ? (
              <p className="text-caption text-semantic-warning" role="alert">
                Both date-range bounds are required.
              </p>
            ) : null}

            {/* Branch filter */}
            <div>
              <Label htmlFor="branch-select" className="mb-1.5 block text-subtitle">
                Branch
              </Label>
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger id="branch-select" className="w-full">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  <SelectItem value="br-dhaka">Dhaka</SelectItem>
                  <SelectItem value="br-chittagong">Chittagong</SelectItem>
                  <SelectItem value="br-sylhet">Sylhet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Format radio */}
            <div>
              <Label className="mb-1.5 block text-subtitle">Output Format</Label>
              <RadioGroup
                value={format}
                onValueChange={(v) => setFormat(v as Format)}
                className="grid grid-cols-2 gap-2"
              >
                {([
                  { id: "pdf", label: "PDF" },
                  { id: "excel", label: "Excel" },
                ] as { id: Format; label: string }[]).map((opt) => (
                  <Label
                    key={opt.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 text-body transition-colors ${
                      format === opt.id
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-border-default hover:bg-surface-hover"
                    }`}
                  >
                    <RadioGroupItem value={opt.id} />
                    {opt.label}
                  </Label>
                ))}
              </RadioGroup>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-semantic-success/30 bg-success-50 p-4">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-semantic-success" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-subtitle font-semibold text-semantic-success">
                  Report queued
                </p>
                <p className="mt-1 text-body text-text-primary">
                  {report?.name} ({format.toUpperCase()}) is now generating.
                </p>
                <p className="mt-1 text-caption text-text-secondary">
                  Download will be available in <span className="font-mono">/documents</span> shortly.
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={queued}>
            Close
          </Button>
          <Button onClick={handleGenerate} disabled={!canGenerate || queued}>
            <BarChart3 className="h-4 w-4" />
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
