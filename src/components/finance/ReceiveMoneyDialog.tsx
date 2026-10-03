"use client";

/**
 * MadrashaOS — Receive Money Dialog
 *
 * Records money coming IN to the madrasha (donations, fee income, etc.)
 * without debit/credit jargon. The user picks a FUND (Zakat vs General),
 * a category, and the receiving account; the system handles double-entry.
 *
 * Fund isolation (SRS C6/D18): Zakat money is sacred — when "Zakat" fund
 * is selected, only zakat-fund asset + income accounts are offered, and
 * the ledger entry is tagged fund:"zakat".
 *
 * Behind the scenes: Creates a LedgerEntry (debit Cash/Bank, credit Income account)
 */

import * as React from "react";
import {
  ArrowDownToLine, Save, XCircle, AlertCircle, ShieldCheck,
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

type FundType = "general" | "zakat";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Income categories — each maps to an income account by name keyword.
 * Categories with (Zakat) suffix are only offered when fund === "zakat".
 */
const INCOME_CATEGORIES_GENERAL = [
  { value: "Donation (General)", keyword: "donation" },
  { value: "Donation (Sadaqah)", keyword: "sadaqah" },
  { value: "Fee Income", keyword: "fee" },
  { value: "Sale Income", keyword: "sale" },
  { value: "Library Fine", keyword: "fine" },
  { value: "Other Income", keyword: "income" },
] as const;

const INCOME_CATEGORIES_ZAKAT = [
  { value: "Zakat Received", keyword: "zakat" },
  { value: "Zakat Donation", keyword: "donation" },
  { value: "Other Zakat Income", keyword: "income" },
] as const;

export function ReceiveMoneyDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { data: accounts } = useAccounts();

  const allAccounts = (accounts ?? []) as Account[];

  const [fund, setFund] = React.useState<FundType>("general");
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
      setFund("general");
      setAmount(""); setReceivedFrom(""); setIntoAccountId("");
      setCategory(""); setDate(new Date().toISOString().slice(0, 10));
      setNotes(""); setError(null);
    }
  }, [open]);

  // Filter accounts by the selected fund (zakat vs general).
  // Accounts with no fund field default to "general".
  const fundAssetAccounts = React.useMemo(
    () => allAccounts.filter((a) => a.type === "asset" && (a.fund ?? "general") === fund),
    [allAccounts, fund],
  );
  const fundIncomeAccounts = React.useMemo(
    () => allAccounts.filter((a) => a.type === "income" && (a.fund ?? "general") === fund),
    [allAccounts, fund],
  );

  const categories = fund === "zakat" ? INCOME_CATEGORIES_ZAKAT : INCOME_CATEGORIES_GENERAL;

  // Find the best income account for the selected category
  const selectedCategory = categories.find((c) => c.value === category);
  const targetIncomeAccount = React.useMemo(() => {
    if (!selectedCategory) return null;
    const match = fundIncomeAccounts.find((a) =>
      a.name.toLowerCase().includes(selectedCategory.keyword.toLowerCase()),
    );
    return match ?? fundIncomeAccounts[0] ?? null;
  }, [selectedCategory, fundIncomeAccounts]);

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
      setError(
        `No ${fund === "zakat" ? "zakat-fund" : "general-fund"} income account found. ` +
        `Go to Accounting → Add Account → Type: Income, Fund: ${fund} to create one.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const year = new Date().getFullYear();
      const voucherNo = `JV-${year}-${Date.now().toString().slice(-6)}`;

      const fundLabel = fund === "zakat" ? "[Zakat] " : "";
      const res = await fetch("/api/v1/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voucher_no: voucherNo,
          date: date,
          narration: `${fundLabel}Received: ${category} — from ${receivedFrom || "—"} — ৳${amountNum}`,
          debit_account_id: intoAccountId,            // Cash/Bank (asset increases)
          credit_account_id: targetIncomeAccount.id,  // Income (income increases)
          amount: amountNum,
          status: "posted",
          fund: fund,                                  // zakat or general
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
        title: "Money received",
        description:
          `${formatCurrency(amountNum, "en")} — ${category}${receivedFrom ? ` from ${receivedFrom}` : ""}` +
          (fund === "zakat" ? " (Zakat fund)" : ""),
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
            Choose the fund first: Zakat money is sacred and never mixed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Fund selector — Zakat vs General */}
          <div className="space-y-1.5">
            <Label>Fund *</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setFund("general"); setCategory(""); setIntoAccountId(""); }}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-caption font-medium transition-colors ${
                  fund === "general"
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-border-default bg-surface-card text-text-secondary hover:bg-surface-hover"
                }`}
              >
                <ArrowDownToLine className="h-4 w-4" />
                General Fund
              </button>
              <button
                type="button"
                onClick={() => { setFund("zakat"); setCategory(""); setIntoAccountId(""); }}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-caption font-medium transition-colors ${
                  fund === "zakat"
                    ? "border-accent-500 bg-accent-50 text-accent-700"
                    : "border-border-default bg-surface-card text-text-secondary hover:bg-surface-hover"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                Zakat Fund
              </button>
            </div>
            {fund === "zakat" && (
              <p className="flex items-start gap-1.5 rounded-md border border-accent-200 bg-accent-50 px-2.5 py-1.5 text-[11px] text-accent-700">
                <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
                Zakat money is sacred — it will only be received into Zakat-fund accounts and distributed to eligible recipients only.
              </p>
            )}
          </div>

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
                {categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Received into (account) — filtered by fund */}
          <div className="space-y-1.5">
            <Label htmlFor="rcv-into">
              Received Into * <span className="text-text-muted">({fund === "zakat" ? "Zakat" : "General"} fund accounts)</span>
            </Label>
            <Select value={intoAccountId} onValueChange={setIntoAccountId}>
              <SelectTrigger id="rcv-into" className="w-full">
                <SelectValue placeholder={`Select ${fund === "zakat" ? "Zakat" : "Cash/Bank"} account`} />
              </SelectTrigger>
              <SelectContent>
                {fundAssetAccounts.length === 0 && (
                  <div className="px-3 py-2 text-caption text-text-muted">
                    No {fund === "zakat" ? "zakat-fund" : ""} asset accounts. Add a Cash/Bank account with fund=&ldquo;{fund}&rdquo; first.
                  </div>
                )}
                {fundAssetAccounts.map((a) => (
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
