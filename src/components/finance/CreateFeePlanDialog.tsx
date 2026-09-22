"use client";

/**
 * MadrashaOS — Create Fee Plan Dialog (Class-wise + Components)
 *
 * Route: used on /fees
 *
 * Creates fee plans for ALL students in a class in one go — the typical
 * madrasha workflow where the fee structure is the same for every
 * student in a class:
 *
 *   - Monthly/Tuition fee (per month, required)
 *   - Hostel fee (per month, optional)
 *   - Bus/Transport fee (per month, optional)
 *   - Other fee (per month, optional, with custom label)
 *
 * The dialog computes the monthly total per student, then creates N
 * monthly installments (default 12) for every active student in the
 * selected class via POST /api/v1/fees/plans/bulk.
 *
 * Students who already have a plan for that academic year are SKIPPED
 * (not overwritten) — so per-student overrides survive a re-bulk.
 *
 * For per-student overrides (e.g. reducing fees for a specific student),
 * the admin can use the per-row "Edit Plan" action after bulk creation.
 */

import * as React from "react";
import {
  Wallet, Plus, XCircle, AlertCircle, Save, CalendarDays,
  Home, Bus, BookOpen, Package, Users,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useClasses, queryClient } from "@/lib/query/client";

type ClassItem = {
  id: string;
  name: string;
  sections?: string[];
};

type CreateFeePlanDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function CreateFeePlanDialog({
  open, onOpenChange,
}: CreateFeePlanDialogProps) {
  const { toast } = useToast();
  const { data: classes } = useClasses();

  const classList = (classes ?? []) as ClassItem[];

  const [selectedClassId, setSelectedClassId] = React.useState("");
  const [academicYear, setAcademicYear] = React.useState(
    new Date().getFullYear(),
  );
  const [monthlyTuition, setMonthlyTuition] = React.useState<string>("");
  const [hostelFee, setHostelFee] = React.useState<string>("0");
  const [busFee, setBusFee] = React.useState<string>("0");
  const [otherFee, setOtherFee] = React.useState<string>("0");
  const [otherLabel, setOtherLabel] = React.useState<string>("");
  const [months, setMonths] = React.useState(12);
  const [startMonth, setStartMonth] = React.useState(1);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedClassId("");
      setAcademicYear(new Date().getFullYear());
      setMonthlyTuition("");
      setHostelFee("0");
      setBusFee("0");
      setOtherFee("0");
      setOtherLabel("");
      setMonths(12);
      setStartMonth(1);
      setError(null);
    }
  }, [open]);

  // Compute totals
  const tuition = Number(monthlyTuition) || 0;
  const hostel = Number(hostelFee) || 0;
  const bus = Number(busFee) || 0;
  const other = Number(otherFee) || 0;
  const monthlyTotal = tuition + hostel + bus + other;
  const totalPerStudent = monthlyTotal * months;

  const selectedClass = classList.find((c) => c.id === selectedClassId);

  // Installment preview labels
  const installmentPreview = React.useMemo(() => {
    if (months <= 0 || monthlyTotal <= 0) return [];
    const items: string[] = [];
    for (let i = 0; i < Math.min(months, 4); i++) {
      const monthIdx = (startMonth - 1 + i) % 12;
      const yearOffset = Math.floor((startMonth - 1 + i) / 12);
      const year = academicYear + yearOffset;
      items.push(`${MONTH_NAMES[monthIdx]} ${year}`);
    }
    return items;
  }, [months, monthlyTotal, startMonth, academicYear]);

  async function handleSubmit() {
    setError(null);
    if (!selectedClassId) {
      setError("Please select a class.");
      return;
    }
    if (tuition <= 0 && hostel <= 0 && bus <= 0 && other <= 0) {
      setError("At least one fee component must be greater than 0.");
      return;
    }
    if (months < 1 || months > 12) {
      setError("Months must be between 1 and 12.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/fees/plans/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: selectedClassId,
          academic_year: academicYear,
          monthly_tuition: tuition,
          hostel_fee: hostel,
          bus_fee: bus,
          other_fee: other,
          other_label: otherLabel.trim() || undefined,
          months,
          start_month: startMonth,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || `Failed (HTTP ${res.status})`);
        setSubmitting(false);
        return;
      }

      const result = data?.data ?? {};
      const created = result.created ?? 0;
      const skipped = result.skipped ?? 0;
      const totalStudents = result.total_students ?? 0;

      if (created > 0) {
        toast({
          title: "Fee plans created",
          description: `${created} plan(s) created for ${selectedClass?.name ?? "class"} · ৳${monthlyTotal}/mo × ${months} months${skipped > 0 ? ` · ${skipped} already had plans` : ""}`,
        });
      } else if (skipped > 0) {
        toast({
          title: "No new plans created",
          description: `All ${totalStudents} students in ${selectedClass?.name ?? "class"} already have fee plans for ${academicYear}.`,
        });
      }

      // Invalidate fee-related queries so the table refreshes
      queryClient.invalidateQueries({ queryKey: ["fee-plans"] });
      queryClient.invalidateQueries({ queryKey: ["fee-payments"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      onOpenChange(false);
    } catch {
      setError("Network error — please try again.");
    }
    setSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary-500" />
            Create Fee Plan (Class-wise)
          </DialogTitle>
          <DialogDescription>
            Set the monthly fee structure once and apply it to all students
            in a class. Students with existing plans are skipped — their
            per-student overrides are preserved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Class selection */}
          <div className="space-y-1.5">
            <Label htmlFor="fee-class">Class *</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger id="fee-class" className="w-full">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classList.length === 0 && (
                  <div className="px-3 py-2 text-caption text-text-muted">
                    No classes found. Create classes first.
                  </div>
                )}
                {classList.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.sections && c.sections.length > 0
                      ? ` (Sections: ${c.sections.join(", ")})`
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Academic year + months */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fee-year">Academic Year</Label>
              <Input
                id="fee-year"
                type="number"
                min={2020}
                max={2050}
                value={academicYear}
                onChange={(e) => setAcademicYear(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fee-months">Months (1-12)</Label>
              <Input
                id="fee-months"
                type="number"
                min={1}
                max={12}
                value={months}
                onChange={(e) =>
                  setMonths(Math.max(1, Math.min(12, Number(e.target.value) || 1)))
                }
              />
            </div>
          </div>

          {/* --- Fee Components --- */}
          <div className="space-y-2">
            <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">
              Monthly Fee Components (BDT/month)
            </p>

            {/* Tuition */}
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-50">
                <BookOpen className="h-4 w-4 text-primary-600" />
              </div>
              <Label htmlFor="fee-tuition" className="w-24 shrink-0 text-body">
                Tuition *
              </Label>
              <Input
                id="fee-tuition"
                type="number"
                min={0}
                placeholder="500"
                value={monthlyTuition}
                onChange={(e) => setMonthlyTuition(e.target.value)}
                className="flex-1"
              />
            </div>

            {/* Hostel */}
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent-50">
                <Home className="h-4 w-4 text-accent-600" />
              </div>
              <Label htmlFor="fee-hostel" className="w-24 shrink-0 text-body">
                Hostel
              </Label>
              <Input
                id="fee-hostel"
                type="number"
                min={0}
                placeholder="0"
                value={hostelFee}
                onChange={(e) => setHostelFee(e.target.value)}
                className="flex-1"
              />
            </div>

            {/* Bus */}
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-success-50">
                <Bus className="h-4 w-4 text-semantic-success" />
              </div>
              <Label htmlFor="fee-bus" className="w-24 shrink-0 text-body">
                Bus
              </Label>
              <Input
                id="fee-bus"
                type="number"
                min={0}
                placeholder="0"
                value={busFee}
                onChange={(e) => setBusFee(e.target.value)}
                className="flex-1"
              />
            </div>

            {/* Other */}
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-100">
                <Package className="h-4 w-4 text-text-secondary" />
              </div>
              <Label htmlFor="fee-other" className="w-24 shrink-0 text-body">
                Other
              </Label>
              <Input
                id="fee-other"
                type="number"
                min={0}
                placeholder="0"
                value={otherFee}
                onChange={(e) => setOtherFee(e.target.value)}
                className="flex-1"
              />
              <Input
                aria-label="Other fee label"
                placeholder="label (e.g. Exam)"
                value={otherLabel}
                onChange={(e) => setOtherLabel(e.target.value)}
                className="w-32"
              />
            </div>
          </div>

          {/* Start month */}
          <div className="space-y-1.5">
            <Label htmlFor="fee-start">Start Month</Label>
            <Select value={String(startMonth)} onValueChange={(v) => setStartMonth(Number(v))}>
              <SelectTrigger id="fee-start" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((m, i) => (
                  <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Summary */}
          {monthlyTotal > 0 && (
            <div className="rounded-md border border-primary-200 bg-primary-50 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wide text-primary-700">
                <CalendarDays className="h-3.5 w-3.5" />
                Summary
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-body">
                  <span className="text-text-secondary">Monthly per student:</span>
                  <span className="font-mono font-medium text-text-primary">
                    ৳{monthlyTotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-body">
                  <span className="text-text-secondary">Total per student ({months} mo):</span>
                  <span className="font-mono font-medium text-text-primary">
                    ৳{totalPerStudent.toLocaleString()}
                  </span>
                </div>
                {selectedClass && (
                  <div className="flex items-center justify-between pt-1 text-caption text-primary-700">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Applies to all active students in {selectedClass.name}
                    </span>
                  </div>
                )}
              </div>
              {installmentPreview.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {installmentPreview.map((label) => (
                    <Badge key={label} variant="outline" className="bg-surface-card font-normal">
                      {label} · ৳{monthlyTotal.toLocaleString()}
                    </Badge>
                  ))}
                  {months > 4 && (
                    <Badge variant="outline" className="bg-surface-card">
                      +{months - 4} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tip about per-student overrides */}
          <div className="rounded-md border border-border-default bg-surface-hover px-3 py-2 text-caption text-text-secondary">
            <strong className="text-text-primary">Tip:</strong> After bulk creation,
            you can edit individual student plans to reduce fees for specific
            students (e.g. scholarships).
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-semantic-danger/40 bg-danger-50 px-3 py-2 text-caption text-semantic-danger"
            >
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <XCircle className="h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            <Save className="h-4 w-4" />
            {submitting ? "Creating…" : `Create for ${selectedClass?.name ?? "Class"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
