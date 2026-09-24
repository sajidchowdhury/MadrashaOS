"use client";

/**
 * MadrashaOS — Pay Salary Dialog
 *
 * Pays a monthly salary to an Employee or Teacher via
 * POST /api/v1/payroll/pay. The payment posts a balanced LedgerEntry
 * (debit Salary Expense, credit Cash/Bank) + creates a PayrollRecord
 * (payslip).
 *
 * Used on the /employees page (and /teachers).
 *
 * Fields:
 *   - Staff (preselected by parent)
 *   - Month + Year (defaults to current month/year)
 *   - Amount (defaults to the staff's stored salary, editable)
 *   - Deductions (optional, default 0; gross = amount + deductions)
 *   - Payment Account (Cash/Bank — credit side)
 *   - Notes (optional)
 *   - Payment Date (defaults to today)
 *
 * Permission: accounting.ledger.post (parent wraps trigger in IfPermission)
 */

import * as React from "react";
import {
  Wallet, XCircle, AlertCircle, Save, CalendarDays,
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAccounts, queryClient } from "@/lib/query/client";

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
  isCash?: boolean;
  isBank?: boolean;
};

export type PaySalaryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffType: "employee" | "teacher";
  staffId: string;
  staffName: string;
  staffCode?: string;
  defaultSalary?: number | null;
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function PaySalaryDialog({
  open, onOpenChange,
  staffType, staffId, staffName, staffCode, defaultSalary,
}: PaySalaryDialogProps) {
  const { toast } = useToast();
  const { data: accounts } = useAccounts();

  const allAccounts = (accounts ?? []) as Account[];
  const paymentAccounts = allAccounts.filter((a) => a.type === "asset");

  const now = new Date();
  const [month, setMonth] = React.useState(now.getMonth() + 1);
  const [year, setYear] = React.useState(now.getFullYear());
  const [amount, setAmount] = React.useState<string>(
    defaultSalary ? String(defaultSalary) : "",
  );
  const [deductions, setDeductions] = React.useState<string>("0");
  const [accountId, setAccountId] = React.useState<string>("");
  const [notes, setNotes] = React.useState("");
  const [paymentDate, setPaymentDate] = React.useState<string>(
    now.toISOString().slice(0, 10),
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setAmount(defaultSalary ? String(defaultSalary) : "");
      setDeductions("0");
      setAccountId("");
      setNotes("");
      setPaymentDate(now.toISOString().slice(0, 10));
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, staffId]);

  const amt = Number(amount) || 0;
  const ded = Number(deductions) || 0;
  const gross = amt + ded;

  async function handleSubmit() {
    setError(null);
    if (amt <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }
    if (!accountId) {
      setError("Please select a payment account (Cash or Bank).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/payroll/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff_type: staffType,
          staff_id: staffId,
          month,
          year,
          amount: amt,
          deductions: ded,
          account_id: accountId,
          notes: notes.trim() || undefined,
          payment_date: paymentDate,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || `Failed (HTTP ${res.status})`);
        setSubmitting(false);
        return;
      }
      toast({
        title: "Salary paid",
        description: `${staffName} — ${MONTH_NAMES[month - 1]} ${year} — ৳${amt.toLocaleString()} (${data?.data?.payslip_no ?? "Payslip"})`,
      });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["ledger-entries"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
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
            Pay Salary
          </DialogTitle>
          <DialogDescription>
            Pay a monthly salary to{" "}
            <span className="font-medium text-text-primary">{staffName}</span>
            {staffCode ? <span className="font-mono"> ({staffCode})</span> : null}
            . This posts a ledger entry (debit Salary Expense, credit Cash/Bank)
            and generates a payslip.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pay-month">Month</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger id="pay-month" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-year">Year</Label>
              <Input
                id="pay-year"
                type="number"
                min={2020}
                max={2050}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pay-amount">Net Amount (BDT) *</Label>
              <Input
                id="pay-amount"
                type="number"
                min={0}
                placeholder="15000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {defaultSalary != null && defaultSalary > 0 && (
                <p className="text-caption text-text-muted">
                  Stored salary: ৳{defaultSalary.toLocaleString()}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-deductions">Deductions (BDT)</Label>
              <Input
                id="pay-deductions"
                type="number"
                min={0}
                placeholder="0"
                value={deductions}
                onChange={(e) => setDeductions(e.target.value)}
              />
              <p className="text-caption text-text-muted">Gross: ৳{gross.toLocaleString()}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-account">Payment Account (Cash/Bank) *</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger id="pay-account" className="w-full">
                <SelectValue placeholder="Select Cash or Bank account" />
              </SelectTrigger>
              <SelectContent>
                {paymentAccounts.length === 0 && (
                  <div className="px-3 py-2 text-caption text-text-muted">
                    No Cash/Bank accounts found. Add an asset account on the
                    Accounting page first.
                  </div>
                )}
                {paymentAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} {a.code ? `· ${a.code}` : ""}
                    {a.isCash ? " (Cash)" : a.isBank ? " (Bank)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-date">Payment Date</Label>
            <Input
              id="pay-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pay-notes">Notes (optional)</Label>
            <Textarea
              id="pay-notes"
              placeholder="e.g. September salary, paid in cash"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {amt > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-caption text-primary-700">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>
                Paying <span className="font-medium">৳{amt.toLocaleString()}</span> to{" "}
                <span className="font-medium">{staffName}</span> for{" "}
                {MONTH_NAMES[month - 1]} {year}.
              </span>
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
            {submitting ? "Paying…" : "Pay Salary"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
