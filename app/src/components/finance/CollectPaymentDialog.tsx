"use client";

/**
 * MadrashaOS — Collect Payment Dialog (C3.4 — Finance · Fees)
 *
 * 3-step payment collection flow per SRS §2.4 (Fee Management) + Risk R8
 * (pending-discount rows are visually distinguished inside the parent table,
 * but the dialog itself treats every outstanding installment equally).
 *
 *   Step 1 — Search student + show outstanding installments.
 *   Step 2 — Pick installment + amount + payment method + receiving account.
 *   Step 3 — Receipt preview (receipt no, amount, method, collector) + confirm.
 *
 * On confirm: emits a success toast "Payment collected — Receipt RCP-2026-XXXX".
 * Receipt number is generated client-side as a mock (C5 wires the real API).
 *
 * The "Collect Payment" trigger button is gated by the parent page via
 * <IfPermission code="fees.payment.create">. This component itself does not
 * re-check permission — the parent owns the gate.
 */

import * as React from "react";
import {
  Search, ArrowRight, ArrowLeft, CheckCircle2, Wallet, Receipt,
  AlertTriangle, User as UserIcon,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatCurrency, formatDate } from "@/lib/i18n/format";
import { useStudents, useFeePlans, useAccounts, useCurrentUser } from "@/lib/query/client";
import type { Student, FeeInstallment, Account } from "@/lib/mock/types";

type Step = 1 | 2 | 3;
type Method = "cash" | "bank" | "mobile";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedStudentId?: string;
};

const STEPS: { id: Step; label: string }[] = [
  { id: 1, label: "Student" },
  { id: 2, label: "Details" },
  { id: 3, label: "Confirm" },
];

export function CollectPaymentDialog({
  open, onOpenChange, preselectedStudentId,
}: Props) {
  const { locale } = useI18n();
  const { toast } = useToast();
  const { data: students } = useStudents();
  const { data: feePlans } = useFeePlans();
  const { data: accounts } = useAccounts();
  const { data: currentUser } = useCurrentUser();

  const [step, setStep] = React.useState<Step>(1);
  const [search, setSearch] = React.useState("");
  const [selectedStudentId, setSelectedStudentId] = React.useState<string | undefined>(preselectedStudentId);
  const [selectedInstallmentId, setSelectedInstallmentId] = React.useState<string | undefined>();
  const [amount, setAmount] = React.useState<number>(0);
  const [method, setMethod] = React.useState<Method>("cash");
  const [accountId, setAccountId] = React.useState<string | undefined>();
  const [submitting, setSubmitting] = React.useState(false);
  const [realReceipt, setRealReceipt] = React.useState<string | null>(null);
  const [realPaymentId, setRealPaymentId] = React.useState<string | null>(null);
  const idempotencyKeyRef = React.useRef<string>(crypto.randomUUID());

  // Sync the preselected student whenever the dialog opens or the prop changes.
  React.useEffect(() => {
    if (open) {
      setSelectedStudentId(preselectedStudentId);
      setSelectedInstallmentId(undefined);
      setAmount(0);
      setMethod("cash");
      setAccountId(undefined);
      setSubmitting(false);
      setRealReceipt(null);
      setRealPaymentId(null);
      idempotencyKeyRef.current = crypto.randomUUID();
      setStep(preselectedStudentId ? 2 : 1);
      setSearch("");
    }
  }, [open, preselectedStudentId]);

  const selectedStudent: Student | undefined = React.useMemo(
    () => students?.find((s) => s.id === selectedStudentId),
    [students, selectedStudentId],
  );
  const selectedPlan = feePlans?.find((p) => p.studentId === selectedStudentId);
  const outstandingInstallments: FeeInstallment[] = (selectedPlan?.installments ?? [])
    .filter((i) => !i.isPaid);
  const selectedInstallment = outstandingInstallments
    .find((i) => i.id === selectedInstallmentId);

  // When an installment is selected, default amount to its full amount
  // (guard against overwriting a partial amount the user typed later).
  const previousInstallmentId = React.useRef<string | undefined>();
  React.useEffect(() => {
    if (
      selectedInstallmentId &&
      selectedInstallmentId !== previousInstallmentId.current &&
      selectedInstallment
    ) {
      setAmount(selectedInstallment.amount);
      previousInstallmentId.current = selectedInstallmentId;
    }
  }, [selectedInstallmentId, selectedInstallment]);

  // Asset accounts filtered by chosen method (cash/bank/mobile).
  const methodAccounts: Account[] = React.useMemo(() => {
    const assets = (accounts ?? []).filter((a) => a.type === "asset");
    return assets.filter((a) => {
      const n = a.name.toLowerCase();
      if (method === "cash") return n.includes("cash");
      if (method === "bank") return n.includes("bank");
      if (method === "mobile") return n.includes("mobile") || n.includes("bkash") || n.includes("wallet");
      return true;
    });
  }, [accounts, method]);

  // Reset the account when method changes (only if current is no longer valid).
  React.useEffect(() => {
    if (methodAccounts.length > 0) {
      const stillValid = methodAccounts.some((a) => a.id === accountId);
      if (!stillValid) setAccountId(methodAccounts[0].id);
    } else {
      setAccountId(undefined);
    }
  }, [methodAccounts, accountId]);

  const filteredStudents = React.useMemo(() => {
    if (!students) return [];
    if (!search.trim()) return students;
    const q = search.trim().toLowerCase();
    return students.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q),
    );
  }, [students, search]);

  const selectedAccount: Account | undefined = accounts?.find((a) => a.id === accountId);

  const canProceed1 = !!selectedStudentId && outstandingInstallments.length > 0;
  const canProceed2 = !!selectedInstallmentId && amount > 0 && !!accountId;

  // Preview Receipt — moves to step 3 WITHOUT calling the API.
  // The real receipt_no is generated server-side on confirm.
  const handleConfirm = () => {
    setStep(3);
  };

  // Confirm Payment — calls POST /api/v1/fees/payments (the Golden Flow:
  // validates installment → generates receipt → posts balanced LedgerEntry
  // → updates installment + account balances, all in a transaction).
  const handleFinish = async () => {
    if (!selectedStudentId || !accountId || amount <= 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/fees/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKeyRef.current,
        },
        body: JSON.stringify({
          student_id: selectedStudentId,
          installment_id: selectedInstallmentId || undefined,
          amount,
          method,
          account_id: accountId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Payment failed",
          description:
            data?.error ||
            data?.details?.formErrors?.[0] ||
            `Server returned ${res.status}. Please try again.`,
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }
      // Success — extract the real receipt_no from the response.
      const rcp = data?.receipt_no || data?.data?.receipt_no || `RCP-UNKNOWN`;
      const paymentId = data?.id || data?.data?.id || null;
      setRealReceipt(rcp);
      setRealPaymentId(paymentId);
      toast({
        title: "Payment collected",
        description: `${rcp} — ${formatCurrency(amount, locale)} via ${method}`,
      });
      // Refetch so the installment shows as paid + the ledger entry appears.
      const { queryClient } = await import("@/lib/query/client");
      queryClient.invalidateQueries({ queryKey: ["fee-payments"] });
      queryClient.invalidateQueries({ queryKey: ["fee-plans"] });
      queryClient.invalidateQueries({ queryKey: ["ledger-entries"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      // Close after a brief delay so the user sees the receipt update.
      setTimeout(() => onOpenChange(false), 1500);
    } catch {
      toast({
        title: "Network error",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-subtitle">
            <Wallet className="h-5 w-5 text-primary-500" />
            Collect Fee Payment
          </DialogTitle>
          <DialogDescription>
            Three-step collection flow — search, collect, confirm.
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
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : isDone
                        ? "bg-success-50 text-semantic-success"
                        : "bg-neutral-100 text-text-secondary"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      isActive
                        ? "bg-primary-500 text-primary-foreground"
                        : isDone
                          ? "bg-semantic-success text-white"
                          : "bg-neutral-300 text-text-secondary"
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="h-3 w-3" /> : s.id}
                  </span>
                  {s.label}
                </div>
                {idx < STEPS.length - 1 && (
                  <div className="h-px flex-1 bg-border-default" aria-hidden="true" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step 1 — Search + outstanding installments */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                placeholder="Search by student name or code…"
                className="ps-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search student"
              />
            </div>

            {/* Outstanding installments for the selected student */}
            {selectedStudent && (
              <div className="rounded-lg border border-border-default bg-surface-card p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-body font-medium text-text-primary">{selectedStudent.name}</p>
                    <p className="text-caption text-text-muted">
                      {selectedStudent.code} · Class {selectedStudent.classId.replace("cls-", "")} · Section {selectedStudent.section}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-semantic-warning/40 text-semantic-warning">
                    {outstandingInstallments.length} pending
                  </Badge>
                </div>
                {outstandingInstallments.length === 0 ? (
                  <p className="text-caption text-semantic-success">No outstanding installments — fully paid.</p>
                ) : (
                  <ul className="divide-y divide-border-default">
                    {outstandingInstallments.map((i) => (
                      <li key={i.id} className="flex items-center justify-between py-2 text-body">
                        <div>
                          <p className="font-medium text-text-primary">{i.label}</p>
                          <p className="text-caption text-text-muted">
                            Due {formatDate(new Date(i.dueDate), locale)}
                          </p>
                        </div>
                        <span className="font-mono text-body text-text-primary">
                          {formatCurrency(i.amount, locale)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Student list (search results) */}
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border-default">
              <ul className="divide-y divide-border-default">
                {filteredStudents.slice(0, 30).map((s) => {
                  const plan = feePlans?.find((p) => p.studentId === s.id);
                  const outstanding = (plan?.installments ?? [])
                    .filter((i) => !i.isPaid)
                    .reduce((sum, i) => sum + i.amount, 0);
                  const isSelected = s.id === selectedStudentId;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudentId(s.id);
                          setSelectedInstallmentId(undefined);
                          setAmount(0);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-2 text-start transition-colors hover:bg-surface-hover ${
                          isSelected ? "bg-primary-50" : ""
                        }`}
                        aria-pressed={isSelected}
                      >
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4 text-text-muted" />
                          <div>
                            <p className="text-body font-medium text-text-primary">{s.name}</p>
                            <p className="text-caption text-text-muted">{s.code}</p>
                          </div>
                        </div>
                        <div className="text-end">
                          <p className="font-mono text-body text-semantic-warning">
                            {formatCurrency(outstanding, locale)}
                          </p>
                          <p className="text-caption text-text-muted">outstanding</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <li className="px-3 py-6 text-center text-caption text-text-muted">
                    No students match &ldquo;{search}&rdquo;
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Step 2 — Installment + amount + method + account */}
        {step === 2 && selectedStudent && (
          <div className="space-y-4">
            {/* Installment selector */}
            <div>
              <Label className="mb-1.5 block text-subtitle">Outstanding Installment</Label>
              {outstandingInstallments.length === 0 ? (
                <p className="text-caption text-semantic-success">
                  This student has no outstanding installments.
                </p>
              ) : (
                <div className="space-y-2">
                  {outstandingInstallments.map((i) => {
                    const isSel = i.id === selectedInstallmentId;
                    return (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => setSelectedInstallmentId(i.id)}
                        className={`flex w-full items-center justify-between rounded-md border p-3 text-start transition-colors ${
                          isSel
                            ? "border-primary-500 bg-primary-50"
                            : "border-border-default bg-surface-card hover:bg-surface-hover"
                        }`}
                        aria-pressed={isSel}
                      >
                        <div>
                          <p className="text-body font-medium text-text-primary">{i.label}</p>
                          <p className="text-caption text-text-muted">
                            Due {formatDate(new Date(i.dueDate), locale)}
                          </p>
                        </div>
                        <span className="font-mono text-body text-text-primary">
                          {formatCurrency(i.amount, locale)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Amount */}
            <div>
              <Label htmlFor="pay-amount" className="mb-1.5 block text-subtitle">
                Amount Received
              </Label>
              <Input
                id="pay-amount"
                type="number"
                min={1}
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
                aria-invalid={amount <= 0}
              />
              {amount <= 0 && (
                <p className="mt-1 text-caption text-semantic-danger">Amount must be greater than zero.</p>
              )}
            </div>

            {/* Method */}
            <div>
              <Label className="mb-1.5 block text-subtitle">Payment Method</Label>
              <RadioGroup
                value={method}
                onValueChange={(v) => setMethod(v as Method)}
                className="grid grid-cols-3 gap-2"
              >
                {(["cash", "bank", "mobile"] as Method[]).map((m) => (
                  <Label
                    key={m}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 text-body capitalize transition-colors ${
                      method === m
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-border-default hover:bg-surface-hover"
                    }`}
                  >
                    <RadioGroupItem value={m} />
                    {m}
                  </Label>
                ))}
              </RadioGroup>
            </div>

            {/* Account */}
            <div>
              <Label className="mb-1.5 block text-subtitle">Receiving Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="w-full" aria-label="Receiving account">
                  <SelectValue placeholder="Select account…" />
                </SelectTrigger>
                <SelectContent>
                  {methodAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} · {a.code}
                    </SelectItem>
                  ))}
                  {methodAccounts.length === 0 && (
                    <div className="px-3 py-2 text-caption text-text-muted">
                      No accounts configured for {method}.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 3 — Receipt preview */}
        {step === 3 && selectedStudent && selectedInstallment && selectedAccount && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border-default bg-surface-card p-4">
              <div className="mb-3 flex items-center justify-between border-b border-border-default pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary-500" />
                  <p className="text-subtitle font-semibold text-text-primary">Payment Receipt</p>
                </div>
                <Badge className="bg-success-50 text-semantic-success">PAID</Badge>
              </div>
              <dl className="space-y-2 text-body">
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Receipt No.</dt>
                  <dd className="font-mono font-medium text-text-primary">
                    {realReceipt ?? "— to be generated —"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Date</dt>
                  <dd className="text-text-primary">
                    {formatDate(new Date(), locale)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Student</dt>
                  <dd className="text-text-primary">
                    {selectedStudent.name} <span className="text-text-muted">({selectedStudent.code})</span>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Installment</dt>
                  <dd className="text-text-primary">{selectedInstallment.label}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Amount</dt>
                  <dd className="font-mono font-semibold text-primary-700">
                    {formatCurrency(amount, locale)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Method</dt>
                  <dd className="text-text-primary capitalize">{method}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Account</dt>
                  <dd className="text-text-primary">{selectedAccount.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Collected By</dt>
                  <dd className="text-text-primary">{currentUser?.name ?? "—"}</dd>
                </div>
              </dl>
            </div>
            <div className="flex items-start gap-2 rounded-md bg-success-50 p-3 text-body text-semantic-success">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Ready to post. Click <strong>Confirm</strong> to record this payment.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="mt-2 flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-caption text-text-muted">
            {step === 1 && selectedStudent && (
              <AlertTriangle className="h-3.5 w-3.5 text-semantic-warning" />
            )}
            {step === 1 && selectedStudent && (
              <span>
                {outstandingInstallments.length > 0
                  ? `${outstandingInstallments.length} installment(s) pending for this student`
                  : "No outstanding installments"}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            {step === 1 && (
              <Button disabled={!canProceed1} onClick={() => setStep(2)}>
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            {step === 2 && (
              <Button disabled={!canProceed2} onClick={handleConfirm}>
                Preview Receipt
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            {step === 3 && (
              <Button onClick={handleFinish} disabled={submitting}>
                <CheckCircle2 className="h-4 w-4" />
                {submitting ? "Processing…" : realReceipt ? "Done" : "Confirm Payment"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
