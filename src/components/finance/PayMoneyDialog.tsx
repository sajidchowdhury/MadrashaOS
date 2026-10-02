"use client";

/**
 * MadrashaOS — Pay Money Dialog
 *
 * Records money going OUT of the madrasha (expenses, bills, etc.)
 * without using debit/credit jargon. The user picks a category and the
 * paying account; the system handles the double-entry behind the scenes.
 *
 * Behind the scenes: Creates a LedgerEntry (debit Expense account, credit Cash/Bank)
 */

import * as React from "react";
import {
  ArrowUpFromLine, Save, XCircle, AlertCircle,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAccounts, queryClient } from "@/lib/query/client";
import { formatCurrency } from "@/lib/i18n/format";

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
  fund: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Expense categories — each maps to an expense account.
 */
const EXPENSE_CATEGORIES = [
  { value: "Salary", keyword: "salary" },
  { value: "Rent", keyword: "rent" },
  { value: "Utilities (Electricity/Water/Gas)", keyword: "utilities" },
  { value: "Supplies / Stationery", keyword: "supplies" },
  { value: "Food / Meals", keyword: "food" },
  { value: "Transport / Fuel", keyword: "transport" },
  { value: "Maintenance", keyword: "maintenance" },
  { value: "Other Expense", keyword: "expense" },
] as const;

export function PayMoneyDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { data: accounts } = useAccounts();

  const allAccounts = (accounts ?? []) as Account[];
  const assetAccounts = allAccounts.filter((a) => a.type === "asset");
  const expenseAccounts = allAccounts.filter((a) => a.type === "expense");

  const [amount, setAmount] = React.useState("");
  const [paidTo, setPaidTo] = React.useState("");
  const [fromAccountId, setFromAccountId] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setAmount(""); setPaidTo(""); setFromAccountId("");
      setCategory(""); setDate(new Date().toISOString().slice(0, 10));
      setNotes(""); setError(null);
    }
  }, [open]);

  // Find the best expense account for the selected category
  const selectedCategory = EXPENSE_CATEGORIES.find((c) => c.value === category);
  const targetExpenseAccount = React.useMemo(() => {
    if (!selectedCategory) return null;
    const match = expenseAccounts.find((a) =>
      a.name.toLowerCase().includes(selectedCategory.keyword.toLowerCase())
    );
    return match ?? expenseAccounts[0] ?? null;
  }, [selectedCategory, expenseAccounts]);

  const amountNum = Number(amount) || 0;

  async function handleSubmit() {
    setError(null);
    if (amountNum <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }
    if (!fromAccountId) {
      setError("Please select which account to pay from (Cash or Bank).");
      return;
    }
    if (!category) {
      setError("Please select a category.");
      return;
    }
    if (!targetExpenseAccount) {
      setError("No expense account found. Go to Accounting → Add Account → Type: Expense to create one.");
      return;
    }

    setSubmitting(true);
    try {
      const year = new Date().getFullYear();
      const voucherNo = `JV-${year}-${Date.now().toString().slice(-6)}`;

      const res = await fetch("/api/v1/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voucher_no: voucherNo,
          date: date,
          narration: `Paid: ${category} — to ${paidTo || "—"} — ৳${amountNum}`,
          debit_account_id: targetExpenseAccount.id, // Expense (increases)
          credit_account_id: fromAccountId,           // Cash/Bank (decreases)
          amount: amountNum,
          status: "posted",
          fund: "general",
          source_type: "manual",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || `Failed (HTTP ${res.status})`);
        setSubmitting(false);
        return;
      }

      toast({
        title: "Money paid",
        description: `${formatCurrency(amountNum, "en")} — ${category}${paidTo ? ` to ${paidTo}` : ""}`,
      });
      queryClient.invalidateQueries({ queryKey: ["ledger-entries"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      onOpenChange(false);
    } catch {
      setError("Network error — please try again.");
    }
    setSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpFromLine className="h-5 w-5 text-semantic-danger" />
            Pay Money
          </DialogTitle>
          <DialogDescription>
            Record money going out — salary, rent, utilities, supplies, etc.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="pay-amount">Amount (BDT) *</Label>
            <Input
              id="pay-amount"
              type="number"
              min={1}
              placeholder="5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="font-mono"
            />
          </div>

          {/* Paid to */}
          <div className="space-y-1.5">
            <Label htmlFor="pay-to">Paid To</Label>
            <Input
              id="pay-to"
              placeholder="Landlord name / Employee / Supplier"
              value={paidTo}
              onChange={(e) => setPaidTo(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="pay-category">Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="pay-category" className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Paid from (account) */}
          <div className="space-y-1.5">
            <Label htmlFor="pay-from">Paid From *</Label>
            <Select value={fromAccountId} onValueChange={setFromAccountId}>
              <SelectTrigger id="pay-from" className="w-full">
                <SelectValue placeholder="Select Cash or Bank account" />
              </SelectTrigger>
              <SelectContent>
                {assetAccounts.length === 0 && (
                  <div className="px-3 py-2 text-caption text-text-muted">
                    No asset accounts. Add a Cash/Bank account first.
                  </div>
                )}
                {assetAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} {a.code ? `· ${a.code}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="pay-date">Date</Label>
            <Input
              id="pay-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="pay-notes">Notes (optional)</Label>
            <Textarea
              id="pay-notes"
              placeholder="e.g. September rent for madrasha building"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-semantic-danger/40 bg-danger-50 px-3 py-2 text-caption text-semantic-danger">
              <AlertCircle className="h-4 w-4 shrink-0" />
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
            {submitting ? "Saving…" : "Pay Money"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
