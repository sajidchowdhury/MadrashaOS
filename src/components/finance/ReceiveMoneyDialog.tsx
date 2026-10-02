"use client";

/**
 * MadrashaOS — Receive Money Dialog
 *
 * Records money coming IN to the madrasha (donations, other income, etc.)
 * without using debit/credit jargon. The user picks a category and the
 * receiving account; the system handles the double-entry behind the scenes.
 *
 * Behind the scenes: Creates a LedgerEntry (debit Cash/Bank, credit Income account)
 */

import * as React from "react";
import {
  ArrowDownToLine, Save, XCircle, AlertCircle,
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
 * Income categories — each maps to an income account.
 * The system finds a matching income account by name keyword.
 */
const INCOME_CATEGORIES = [
  { value: "Donation (General)", keyword: "donation" },
  { value: "Donation (Sadaqah)", keyword: "sadaqah" },
  { value: "Fee Income", keyword: "fee" },
  { value: "Sale Income", keyword: "sale" },
  { value: "Library Fine", keyword: "fine" },
  { value: "Other Income", keyword: "income" },
] as const;

export function ReceiveMoneyDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { data: accounts } = useAccounts();

  const allAccounts = (accounts ?? []) as Account[];
  const assetAccounts = allAccounts.filter((a) => a.type === "asset");
  const incomeAccounts = allAccounts.filter((a) => a.type === "income");

  const [amount, setAmount] = React.useState("");
  const [receivedFrom, setReceivedFrom] = React.useState("");
  const [intoAccountId, setIntoAccountId] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setAmount(""); setReceivedFrom(""); setIntoAccountId("");
      setCategory(""); setDate(new Date().toISOString().slice(0, 10));
      setNotes(""); setError(null);
    }
  }, [open]);

  // Find the best income account for the selected category
  const selectedCategory = INCOME_CATEGORIES.find((c) => c.value === category);
  const targetIncomeAccount = React.useMemo(() => {
    if (!selectedCategory) return null;
    // Try to find an income account whose name contains the keyword
    const match = incomeAccounts.find((a) =>
      a.name.toLowerCase().includes(selectedCategory.keyword.toLowerCase())
    );
    return match ?? incomeAccounts[0] ?? null;
  }, [selectedCategory, incomeAccounts]);

  const amountNum = Number(amount) || 0;

  async function handleSubmit() {
    setError(null);
    if (amountNum <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }
    if (!intoAccountId) {
      setError("Please select where the money is received (Cash or Bank account).");
      return;
    }
    if (!category) {
      setError("Please select a category.");
      return;
    }
    if (!targetIncomeAccount) {
      setError("No income account found. Go to Accounting → Add Account → Type: Income to create one.");
      return;
    }

    setSubmitting(true);
    try {
      // Generate voucher number
      const year = new Date().getFullYear();
      const lastLedger = await fetch(`/api/v1/ledger?pageSize=1`).then(r => r.json()).catch(() => ({}));
      const voucherNo = `JV-${year}-${Date.now().toString().slice(-6)}`;

      const res = await fetch("/api/v1/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voucher_no: voucherNo,
          date: date,
          narration: `Received: ${category} — from ${receivedFrom || "—"} — ৳${amountNum}`,
          debit_account_id: intoAccountId,       // Cash/Bank (asset increases)
          credit_account_id: targetIncomeAccount.id, // Income (income increases)
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

      // Update account balances
      await fetch(`/api/v1/accounts/${intoAccountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).catch(() => {});

      toast({
        title: "Money received",
        description: `${formatCurrency(amountNum, "en")} — ${category}${receivedFrom ? ` from ${receivedFrom}` : ""}`,
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
            <ArrowDownToLine className="h-5 w-5 text-semantic-success" />
            Receive Money
          </DialogTitle>
          <DialogDescription>
            Record money coming in — donations, fee income, sale income, etc.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="rcv-amount">Amount (BDT) *</Label>
            <Input
              id="rcv-amount"
              type="number"
              min={1}
              placeholder="5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="font-mono"
            />
          </div>

          {/* Received from */}
          <div className="space-y-1.5">
            <Label htmlFor="rcv-from">Received From</Label>
            <Input
              id="rcv-from"
              placeholder="Donor name / Organization / Student"
              value={receivedFrom}
              onChange={(e) => setReceivedFrom(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="rcv-category">Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="rcv-category" className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {INCOME_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Received into (account) */}
          <div className="space-y-1.5">
            <Label htmlFor="rcv-into">Received Into *</Label>
            <Select value={intoAccountId} onValueChange={setIntoAccountId}>
              <SelectTrigger id="rcv-into" className="w-full">
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
            <Label htmlFor="rcv-date">Date</Label>
            <Input
              id="rcv-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="rcv-notes">Notes (optional)</Label>
            <Textarea
              id="rcv-notes"
              placeholder="e.g. Cash donation from a well-wisher"
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
            {submitting ? "Saving…" : "Receive Money"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
