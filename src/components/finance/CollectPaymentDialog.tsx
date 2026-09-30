"use client";

/**
 * MadrashaOS — Collect Payment Dialog (redesigned for real-world flow)
 *
 * Real-world madrasha fee collection flow:
 *   1. Guardian comes to the account section
 *   2. Accountant searches by student code OR guardian phone
 *   3. System shows: student name, total due, installment breakdown
 *   4. Accountant can:
 *      - Pay one installment (normal monthly payment)
 *      - Pay multiple installments (e.g. 3 months at once)
 *      - Pay a custom amount (advance payment when no due, or partial)
 *   5. Select payment method (cash/bank/mobile) + account
 *   6. Confirm → receipt generated → ledger entry posted
 *
 * Step 1 — Search student (by name, code, or guardian phone)
 * Step 2 — Review due + select what to pay + payment method
 * Step 3 — Receipt preview + confirm
 */

import * as React from "react";
import {
  Search, ArrowRight, ArrowLeft, CheckCircle2, Wallet, Receipt,
  AlertTriangle, User as UserIcon, Phone, CalendarDays,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatCurrency, formatDate } from "@/lib/i18n/format";
import { useStudents, useFeePlans, useAccounts, queryClient } from "@/lib/query/client";

type Step = 1 | 2 | 3;
type Method = "cash" | "bank" | "mobile";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedStudentId?: string;
};

const STEPS: { id: Step; label: string }[] = [
  { id: 1, label: "Find Student" },
  { id: 2, label: "Payment" },
  { id: 3, label: "Receipt" },
];

export function CollectPaymentDialog({
  open, onOpenChange, preselectedStudentId,
}: Props) {
  const { locale } = useI18n();
  const { toast } = useToast();
  const { data: students } = useStudents();
  const { data: feePlans } = useFeePlans();
  const { data: accounts } = useAccounts();

  const [step, setStep] = React.useState<Step>(1);
  const [search, setSearch] = React.useState("");
  const [selectedStudentId, setSelectedStudentId] = React.useState<string | undefined>(preselectedStudentId);

  // Payment selection
  const [selectedInstallmentIds, setSelectedInstallmentIds] = React.useState<Set<string>>(new Set());
  const [customAmount, setCustomAmount] = React.useState<string>("");
  const [useCustomAmount, setUseCustomAmount] = React.useState(false);
  const [method, setMethod] = React.useState<Method>("cash");
  const [accountId, setAccountId] = React.useState<string | undefined>();
  const [submitting, setSubmitting] = React.useState(false);
  const [receiptNo, setReceiptNo] = React.useState<string | null>(null);
  const [paymentId, setPaymentId] = React.useState<string | null>(null);
  const idempotencyKeyRef = React.useRef<string>(typeof crypto !== "undefined" ? crypto.randomUUID() : "");

  // Reset on dialog open
  React.useEffect(() => {
    if (open) {
      setSelectedStudentId(preselectedStudentId);
      setSelectedInstallmentIds(new Set());
      setCustomAmount("");
      setUseCustomAmount(false);
      setMethod("cash");
      setAccountId(undefined);
      setSubmitting(false);
      setReceiptNo(null);
      setPaymentId(null);
      idempotencyKeyRef.current = typeof crypto !== "undefined" ? crypto.randomUUID() : "";
      setStep(preselectedStudentId ? 2 : 1);
      setSearch("");
    }
  }, [open, preselectedStudentId]);

  // --- Search: by student name, code, OR guardian phone ---
  const filteredStudents = React.useMemo(() => {
    if (!students) return [];
    if (!search.trim()) return students.slice(0, 20); // show first 20 by default
    const q = search.trim().toLowerCase();
    return students.filter((s: Record<string, unknown>) =>
      (s.name as string)?.toLowerCase().includes(q) ||
      (s.code as string)?.toLowerCase().includes(q) ||
      (s.guardianPhone as string)?.includes(q) ||
      (s.guardianName as string)?.toLowerCase().includes(q)
    );
  }, [students, search]);

  const selectedStudent = students?.find((s: Record<string, unknown>) => s.id === selectedStudentId) as
    | { id: string; name: string; code: string; className?: string; section?: string; guardianName?: string; guardianPhone?: string }
    | undefined;

  const selectedPlan = feePlans?.find(
    (p: Record<string, unknown>) => p.studentId === selectedStudentId
  ) as { installments?: Array<{ id: string; label: string; amount: number; isPaid: boolean; dueDate?: string; amountPaid?: number }> } | undefined;

  const outstandingInstallments = (selectedPlan?.installments ?? []).filter((i) => !i.isPaid);
  const paidInstallments = (selectedPlan?.installments ?? []).filter((i) => i.isPaid);

  // Total due = sum of outstanding installment amounts
  const totalDue = outstandingInstallments.reduce((sum, i) => sum + i.amount, 0);
  const totalPaid = paidInstallments.reduce((sum, i) => sum + (i.amountPaid ?? i.amount), 0);

  // Selected installment total (when not using custom amount)
  const selectedTotal = outstandingInstallments
    .filter((i) => selectedInstallmentIds.has(i.id))
    .reduce((sum, i) => sum + i.amount, 0);

  // Final amount to charge
  const chargeAmount = useCustomAmount
    ? (Number(customAmount) || 0)
    : selectedTotal;

  // Filter accounts by method
  const methodAccounts = React.useMemo(() => {
    const assets = (accounts ?? []) as Array<Record<string, unknown>>;
    return assets.filter((a) => {
      if (a.type !== "asset") return false;
      const name = (a.name as string ?? "").toLowerCase();
      if (method === "cash") return name.includes("cash");
      if (method === "bank") return name.includes("bank");
      if (method === "mobile") return name.includes("mobile") || name.includes("bkash") || name.includes("wallet");
      return true;
    });
  }, [accounts, method]);

  React.useEffect(() => {
    if (methodAccounts.length > 0) {
      const stillValid = methodAccounts.some((a) => a.id === accountId);
      if (!stillValid) setAccountId(methodAccounts[0].id as string);
    }
  }, [methodAccounts, accountId]);

  // Toggle installment selection
  function toggleInstallment(id: string) {
    setSelectedInstallmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllOutstanding() {
    setSelectedInstallmentIds(new Set(outstandingInstallments.map((i) => i.id)));
  }

  function selectNone() {
    setSelectedInstallmentIds(new Set());
  }

  const canProceed1 = !!selectedStudentId;
  const canProceed2 = chargeAmount > 0 && !!accountId;

  function handleConfirm() {
    setStep(3);
  }

  async function handleFinish() {
    if (!selectedStudentId || !accountId || chargeAmount <= 0) return;
    setSubmitting(true);
    try {
      // If multiple installments are selected, we need to create multiple payments
      // (one per installment). If custom amount, create a single payment without
      // an installment link (advance payment).
      const installmentIds = useCustomAmount ? [] : Array.from(selectedInstallmentIds);

      if (installmentIds.length === 0) {
        // Custom/advance payment — no specific installment
        const res = await fetch("/api/v1/fees/payments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKeyRef.current,
          },
          body: JSON.stringify({
            student_id: selectedStudentId,
            installment_id: undefined,
            amount: chargeAmount,
            method,
            account_id: accountId,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast({ title: "Payment failed", description: data?.error || `HTTP ${res.status}`, variant: "destructive" });
          setSubmitting(false);
          return;
        }
        const rcp = data?.receipt_no || data?.data?.receipt_no || `RCP-UNKNOWN`;
        setReceiptNo(rcp);
        setPaymentId(data?.id || data?.data?.id || null);
      } else {
        // Pay each selected installment — loop through them
        let lastRcp = "";
        for (const instId of installmentIds) {
          const inst = outstandingInstallments.find((i) => i.id === instId);
          if (!inst) continue;
          const res = await fetch("/api/v1/fees/payments", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": `${idempotencyKeyRef.current}-${instId}`,
            },
            body: JSON.stringify({
              student_id: selectedStudentId,
              installment_id: instId,
              amount: inst.amount,
              method,
              account_id: accountId,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            toast({ title: "Payment failed", description: data?.error || `HTTP ${res.status}`, variant: "destructive" });
            setSubmitting(false);
            return;
          }
          lastRcp = data?.receipt_no || data?.data?.receipt_no || `RCP-UNKNOWN`;
        }
        setReceiptNo(lastRcp);
      }

      toast({
        title: "Payment collected",
        description: `${receiptNo ?? "Receipt"} — ${formatCurrency(chargeAmount, locale)} via ${method}`,
      });
      queryClient.invalidateQueries({ queryKey: ["fee-payments"] });
      queryClient.invalidateQueries({ queryKey: ["fee-plans"] });
      queryClient.invalidateQueries({ queryKey: ["ledger-entries"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
    } catch {
      toast({ title: "Network error", description: "Please try again.", variant: "destructive" });
    }
    setSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-subtitle">
            <Wallet className="h-5 w-5 text-primary-500" />
            Collect Fee Payment
          </DialogTitle>
          <DialogDescription>
            Search by student name, code, or guardian phone. Pay one or
            multiple installments, or make an advance payment.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2" role="tablist" aria-label="Collection steps">
          {STEPS.map((s, idx) => {
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <React.Fragment key={s.id}>
                <div
                  role="tab"
                  aria-selected={isActive}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-caption font-medium ${
                    isActive ? "bg-primary-50 text-primary-700"
                    : isDone ? "bg-success-50 text-semantic-success"
                    : "bg-neutral-100 text-text-secondary"
                  }`}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    isActive ? "bg-primary-500 text-primary-foreground"
                    : isDone ? "bg-semantic-success text-white"
                    : "bg-neutral-300 text-text-secondary"
                  }`}>
                    {isDone ? <CheckCircle2 className="h-3 w-3" /> : s.id}
                  </span>
                  {s.label}
                </div>
                {idx < STEPS.length - 1 && <div className="h-px flex-1 bg-border-default" aria-hidden />}
              </React.Fragment>
            );
          })}
        </div>

        {/* ============ Step 1 — Find Student ============ */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                placeholder="Search by student name, code, or guardian phone…"
                className="ps-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search student"
                autoFocus
              />
            </div>

            <div className="max-h-72 space-y-1 overflow-y-auto">
              {filteredStudents.length === 0 && (
                <p className="py-4 text-center text-caption text-text-muted">
                  No students found. Try a different search.
                </p>
              )}
              {filteredStudents.map((s: Record<string, unknown>) => (
                <button
                  key={s.id as string}
                  type="button"
                  onClick={() => {
                    setSelectedStudentId(s.id as string);
                    setStep(2);
                  }}
                  className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-start transition-colors ${
                    selectedStudentId === s.id
                      ? "border-primary-500 bg-primary-50"
                      : "border-border-default hover:bg-surface-hover"
                  }`}
                >
                  <UserIcon className="h-4 w-4 shrink-0 text-text-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-medium text-text-primary">
                      {s.name as string}
                    </p>
                    <p className="truncate text-caption text-text-muted">
                      {s.code as string}
                      {s.className ? ` · ${s.className}` : ""}
                      {s.guardianPhone ? ` · 📞 ${s.guardianPhone}` : ""}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {selectedStudent && (
              <div className="rounded-lg border border-primary-200 bg-primary-50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-body font-semibold text-primary-700">{selectedStudent.name}</p>
                    <p className="text-caption text-primary-600">
                      {selectedStudent.code} · {selectedStudent.className ?? "—"} · {selectedStudent.guardianName ?? "—"}
                    </p>
                  </div>
                  {totalDue > 0 ? (
                    <div className="text-end">
                      <p className="text-caption uppercase tracking-wide text-primary-600">Total Due</p>
                      <p className="font-mono text-display font-bold text-semantic-warning">
                        {formatCurrency(totalDue, locale)}
                      </p>
                    </div>
                  ) : (
                    <Badge className="bg-success-50 text-semantic-success">No dues</Badge>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={() => setStep(2)} disabled={!canProceed1}>
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ============ Step 2 — Payment Details ============ */}
        {step === 2 && selectedStudent && (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="grid grid-cols-3 gap-2 rounded-lg border border-border-default bg-surface-card p-3">
              <div>
                <p className="text-caption uppercase tracking-wide text-text-muted">Total Due</p>
                <p className="font-mono text-body font-bold text-semantic-warning">
                  {formatCurrency(totalDue, locale)}
                </p>
              </div>
              <div>
                <p className="text-caption uppercase tracking-wide text-text-muted">Total Paid</p>
                <p className="font-mono text-body font-bold text-semantic-success">
                  {formatCurrency(totalPaid, locale)}
                </p>
              </div>
              <div>
                <p className="text-caption uppercase tracking-wide text-text-muted">Outstanding</p>
                <p className="font-mono text-body font-bold text-text-primary">
                  {outstandingInstallments.length} installments
                </p>
              </div>
            </div>

            {/* Installment selection */}
            {!useCustomAmount && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-subtitle font-semibold">Outstanding Installments</Label>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={selectAllOutstanding}>Select all</Button>
                    <Button size="sm" variant="ghost" onClick={selectNone}>Clear</Button>
                  </div>
                </div>
                {outstandingInstallments.length === 0 ? (
                  <div className="rounded-md border border-border-default bg-surface-hover p-4 text-center">
                    <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-semantic-success" />
                    <p className="text-body font-medium text-text-primary">No outstanding dues</p>
                    <p className="text-caption text-text-secondary">
                      This student has paid all installments. You can make an advance payment below.
                    </p>
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => setUseCustomAmount(true)}>
                      Make advance payment
                    </Button>
                  </div>
                ) : (
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {outstandingInstallments.map((inst) => (
                      <label
                        key={inst.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition-colors ${
                          selectedInstallmentIds.has(inst.id)
                            ? "border-primary-500 bg-primary-50"
                            : "border-border-default hover:bg-surface-hover"
                        }`}
                      >
                        <Checkbox
                          checked={selectedInstallmentIds.has(inst.id)}
                          onCheckedChange={() => toggleInstallment(inst.id)}
                        />
                        <div className="flex-1">
                          <p className="text-body font-medium text-text-primary">{inst.label}</p>
                          {inst.dueDate && (
                            <p className="text-caption text-text-muted">
                              Due: {formatDate(new Date(inst.dueDate), locale)}
                            </p>
                          )}
                        </div>
                        <p className="font-mono text-body font-bold text-text-primary">
                          {formatCurrency(inst.amount, locale)}
                        </p>
                      </label>
                    ))}
                  </div>
                )}

                {/* Option for custom/advance payment */}
                <Button size="sm" variant="ghost" onClick={() => { setUseCustomAmount(true); setSelectedInstallmentIds(new Set()); }}>
                  + Pay custom amount (advance)
                </Button>
              </div>
            )}

            {/* Custom amount input */}
            {useCustomAmount && (
              <div className="space-y-2 rounded-md border border-primary-200 bg-primary-50/30 p-3">
                <Label htmlFor="custom-amount">Custom / Advance Amount (BDT)</Label>
                <Input
                  id="custom-amount"
                  type="number"
                  min={1}
                  placeholder="1500"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="font-mono"
                />
                <p className="text-caption text-text-muted">
                  This will be recorded as an advance/credit payment for the student.
                  {!useCustomAmount && totalDue === 0 && " No outstanding dues — this is a pure advance."}
                </p>
                <Button size="sm" variant="ghost" onClick={() => setUseCustomAmount(false)}>
                  ← Back to installment selection
                </Button>
              </div>
            )}

            {/* Total to charge */}
            <div className="flex items-center justify-between rounded-lg border-2 border-primary-300 bg-primary-50 p-3">
              <span className="text-subtitle font-semibold text-primary-700">Amount to collect:</span>
              <span className="font-mono text-display font-bold text-primary-700">
                {formatCurrency(chargeAmount, locale)}
              </span>
            </div>

            {/* Payment method + account */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="method">Payment Method</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as Method)}>
                  <SelectTrigger id="method" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="mobile">Mobile (bKash/etc.)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="account">Receiving Account</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger id="account" className="w-full">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {methodAccounts.length === 0 && (
                      <div className="px-3 py-2 text-caption text-text-muted">
                        No matching account. Add an asset account first.
                      </div>
                    )}
                    {methodAccounts.map((a) => (
                      <SelectItem key={a.id as string} value={a.id as string}>
                        {a.name as string}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={handleConfirm} disabled={!canProceed2}>
                Review Receipt <ArrowRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ============ Step 3 — Receipt Preview ============ */}
        {step === 3 && selectedStudent && (
          <div className="space-y-4">
            {!receiptNo ? (
              <>
                <div className="rounded-lg border border-border-default bg-surface-card p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-primary-500" />
                    <h3 className="text-subtitle font-semibold text-text-primary">Payment Summary</h3>
                  </div>
                  <dl className="space-y-2 text-body">
                    <div className="flex justify-between">
                      <dt className="text-text-secondary">Student:</dt>
                      <dd className="font-medium text-text-primary">{selectedStudent.name} ({selectedStudent.code})</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-text-secondary">Amount:</dt>
                      <dd className="font-mono font-bold text-text-primary">{formatCurrency(chargeAmount, locale)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-text-secondary">Method:</dt>
                      <dd className="capitalize text-text-primary">{method}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-text-secondary">Account:</dt>
                      <dd className="text-text-primary">
                        {methodAccounts.find((a) => a.id === accountId)?.name ?? "—"}
                      </dd>
                    </div>
                    {!useCustomAmount && selectedInstallmentIds.size > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-text-secondary">Installments:</dt>
                        <dd className="text-text-primary">{selectedInstallmentIds.size} month(s)</dd>
                      </div>
                    )}
                    {useCustomAmount && (
                      <div className="flex justify-between">
                        <dt className="text-text-secondary">Type:</dt>
                        <dd className="text-text-primary">Advance / Custom payment</dd>
                      </div>
                    )}
                  </dl>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setStep(2)}>
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button onClick={handleFinish} disabled={submitting}>
                    {submitting ? "Processing…" : "Confirm & Collect"}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <div className="rounded-lg border border-semantic-success/40 bg-success-50 p-6 text-center">
                <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-semantic-success" />
                <h3 className="text-display font-bold text-semantic-success">Payment Collected!</h3>
                <p className="mt-1 text-body text-text-secondary">
                  Receipt: <span className="font-mono font-bold text-text-primary">{receiptNo}</span>
                </p>
                <p className="mt-1 text-body text-text-secondary">
                  Amount: <span className="font-mono font-bold text-text-primary">{formatCurrency(chargeAmount, locale)}</span>
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
