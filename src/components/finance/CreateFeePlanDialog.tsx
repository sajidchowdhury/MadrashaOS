"use client";

/**
 * MadrashaOS — Create Fee Plan Dialog
 *
 * Route: used on /fees
 *
 * Creates a fee plan for a student for an academic year via
 * POST /api/v1/fees/plans. Auto-generates evenly-split installments
 * with due dates spread across the year.
 *
 * Fields:
 *   - Student (dropdown from useStudents)
 *   - Academic year (default current year)
 *   - Total amount (BDT)
 *   - Scholarship amount (optional, default 0)
 *   - Installment count (1-12, default 3)
 *
 * Installments are auto-calculated:
 *   amount = (total - scholarship) / count
 *   due dates: spread evenly starting Jan 15 of the academic year
 *
 * Permission gate: fees.plan.edit (checked by parent via IfPermission)
 */

import * as React from "react";
import {
  Wallet, Plus, XCircle, AlertCircle, Save, CalendarDays,
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
import { useToast } from "@/hooks/use-toast";
import { useStudents, queryClient } from "@/lib/query/client";

type Student = {
  id: string;
  code: string;
  name: string;
  nameBn?: string;
  className?: string;
  section?: string;
};

type CreateFeePlanDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function CreateFeePlanDialog({
  open, onOpenChange,
}: CreateFeePlanDialogProps) {
  const { toast } = useToast();
  const { data: students } = useStudents();

  const studentList = (students ?? []) as Student[];

  const [selectedStudentId, setSelectedStudentId] = React.useState("");
  const [academicYear, setAcademicYear] = React.useState(
    new Date().getFullYear(),
  );
  const [totalAmount, setTotalAmount] = React.useState<string>("");
  const [scholarshipAmount, setScholarshipAmount] = React.useState<string>("0");
  const [installmentCount, setInstallmentCount] = React.useState(3);
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedStudentId("");
      setAcademicYear(new Date().getFullYear());
      setTotalAmount("");
      setScholarshipAmount("0");
      setInstallmentCount(3);
      setNotes("");
      setError(null);
    }
  }, [open]);

  // Compute installment preview
  const total = Number(totalAmount) || 0;
  const scholarship = Number(scholarshipAmount) || 0;
  const netPayable = Math.max(0, total - scholarship);
  const perInstallment = installmentCount > 0 ? netPayable / installmentCount : 0;

  // Auto-generate due dates: spread evenly starting Jan 15
  const installmentPreview = React.useMemo(() => {
    if (installmentCount <= 0 || perInstallment <= 0) return [];
    const items: { label: string; amount: number; dueDate: string }[] = [];
    const interval = 12 / installmentCount; // months between installments
    for (let i = 0; i < installmentCount; i++) {
      const monthIndex = Math.floor(i * interval);
      const month = MONTH_NAMES[monthIndex] ?? "Jan";
      items.push({
        label: `${month} ${academicYear}`,
        amount: Math.round(perInstallment * 100) / 100,
        dueDate: `${academicYear}-${String(monthIndex + 1).padStart(2, "0")}-15`,
      });
    }
    return items;
  }, [installmentCount, perInstallment, academicYear]);

  const selectedStudent = studentList.find((s) => s.id === selectedStudentId);

  async function handleSubmit() {
    setError(null);
    if (!selectedStudentId) {
      setError("Please select a student.");
      return;
    }
    if (total <= 0) {
      setError("Total amount must be greater than 0.");
      return;
    }
    if (scholarship > total) {
      setError("Scholarship amount cannot exceed total amount.");
      return;
    }
    if (installmentCount < 1 || installmentCount > 12) {
      setError("Installment count must be between 1 and 12.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/fees/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: selectedStudentId,
          academic_year: academicYear,
          total_amount: total,
          scholarship_amount: scholarship,
          installment_count: installmentCount,
          notes: notes.trim() || undefined,
          installments: installmentPreview.map((i) => ({
            label: i.label,
            amount: i.amount,
            due_date: i.dueDate,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || `Failed (HTTP ${res.status})`);
        setSubmitting(false);
        return;
      }
      toast({
        title: "Fee plan created",
        description: `${selectedStudent?.name ?? "Student"} — ${installmentCount} installment(s), ৳${netPayable.toLocaleString()}`,
      });
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
            Create Fee Plan
          </DialogTitle>
          <DialogDescription>
            Set up a fee plan for a student for the academic year. Installments
            are auto-generated and evenly split.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student selection */}
          <div className="space-y-1.5">
            <Label htmlFor="fee-student">Student *</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger id="fee-student" className="w-full">
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {studentList.length === 0 && (
                  <div className="px-3 py-2 text-caption text-text-muted">
                    No students found. Add students first.
                  </div>
                )}
                {studentList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.code}){s.className ? ` · ${s.className}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Academic year + installment count */}
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
              <Label htmlFor="fee-installments">Installments (1-12)</Label>
              <Input
                id="fee-installments"
                type="number"
                min={1}
                max={12}
                value={installmentCount}
                onChange={(e) =>
                  setInstallmentCount(
                    Math.max(1, Math.min(12, Number(e.target.value) || 1)),
                  )
                }
              />
            </div>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fee-total">Total Amount (BDT) *</Label>
              <Input
                id="fee-total"
                type="number"
                min={0}
                placeholder="12000"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fee-scholarship">Scholarship (BDT)</Label>
              <Input
                id="fee-scholarship"
                type="number"
                min={0}
                placeholder="0"
                value={scholarshipAmount}
                onChange={(e) => setScholarshipAmount(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="fee-notes">Notes (optional)</Label>
            <Input
              id="fee-notes"
              placeholder="e.g. Annual tuition fee"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Installment preview */}
          {installmentPreview.length > 0 && total > 0 && (
            <div className="rounded-md border border-border-default bg-surface-hover p-3">
              <div className="mb-2 flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wide text-text-muted">
                <CalendarDays className="h-3.5 w-3.5" />
                Installment Preview
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-caption text-text-secondary">
                  <span>Net payable:</span>
                  <span className="font-mono font-medium text-text-primary">
                    ৳{netPayable.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-caption text-text-secondary">
                  <span>Per installment ({installmentCount}×):</span>
                  <span className="font-mono font-medium text-text-primary">
                    ৳{perInstallment.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {installmentPreview.map((inst, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-md border border-border-default bg-surface-card px-2 py-1 text-caption text-text-secondary"
                  >
                    {inst.label} · ৳{inst.amount.toLocaleString()}
                  </span>
                ))}
              </div>
            </div>
          )}

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
            {submitting ? "Creating…" : "Create Fee Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
