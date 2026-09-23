"use client";

/**
 * MadrashaOS — Account Form Dialog
 *
 * Creates a new GL account via POST /api/v1/accounts.
 * Used on /accounting to build the chart of accounts.
 *
 * Fields:
 *   - Code (e.g. 1000, 4000, 5000)
 *   - Name (English) + Name (Bangla, optional)
 *   - Type: asset | liability | equity | income | expense
 *   - Fund: general | zakat (default general)
 *   - Is Cash / Is Bank (checkboxes — for asset accounts)
 *   - Bank name + account no (shown when "Is Bank" is checked)
 *   - Opening balance (optional)
 *   - Description (optional)
 *
 * Permission: accounting.ledger.post (enforced by parent via IfPermission)
 */

import * as React from "react";
import { Plus, XCircle, AlertCircle, Save, Landmark } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/query/client";

type AccountFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ACCOUNT_TYPES = [
  { value: "asset", label: "Asset (what you own — cash, bank, property)" },
  { value: "liability", label: "Liability (what you owe — loans, payables)" },
  { value: "equity", label: "Equity (owner's capital, retained funds)" },
  { value: "income", label: "Income (fees, donations, zakat received)" },
  { value: "expense", label: "Expense (salary, rent, utilities, supplies)" },
] as const;

const FUNDS = [
  { value: "general", label: "General Fund" },
  { value: "zakat", label: "Zakat Fund" },
] as const;

export function AccountFormDialog({ open, onOpenChange }: AccountFormDialogProps) {
  const { toast } = useToast();

  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [nameBn, setNameBn] = React.useState("");
  const [type, setType] = React.useState<string>("");
  const [fund, setFund] = React.useState<string>("general");
  const [isCash, setIsCash] = React.useState(false);
  const [isBank, setIsBank] = React.useState(false);
  const [bankName, setBankName] = React.useState("");
  const [bankAccountNo, setBankAccountNo] = React.useState("");
  const [openingBalance, setOpeningBalance] = React.useState<string>("");
  const [description, setDescription] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setCode("");
      setName("");
      setNameBn("");
      setType("");
      setFund("general");
      setIsCash(false);
      setIsBank(false);
      setBankName("");
      setBankAccountNo("");
      setOpeningBalance("");
      setDescription("");
      setError(null);
    }
  }, [open]);

  async function handleSubmit() {
    setError(null);
    if (!code.trim()) {
      setError("Account code is required.");
      return;
    }
    if (!name.trim()) {
      setError("Account name is required.");
      return;
    }
    if (!type) {
      setError("Account type is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          name: name.trim(),
          name_bn: nameBn.trim() || undefined,
          type,
          fund: fund || undefined,
          is_cash: isCash || undefined,
          is_bank: isBank || undefined,
          bank_name: isBank ? bankName.trim() || undefined : undefined,
          bank_account_no: isBank ? bankAccountNo.trim() || undefined : undefined,
          opening_balance: openingBalance ? Number(openingBalance) : undefined,
          description: description.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || `Failed (HTTP ${res.status})`);
        setSubmitting(false);
        return;
      }
      toast({
        title: "Account created",
        description: `${code} · ${name} (${type})`,
      });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
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
            <Landmark className="h-5 w-5 text-primary-500" />
            Add Account
          </DialogTitle>
          <DialogDescription>
            Create a new ledger account. Assets = what you own (cash, bank),
            Income = what you earn (fees, donations), Expense = what you spend
            (salary, rent).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Code + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-code">Code *</Label>
              <Input
                id="acc-code"
                placeholder="1000"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="font-mono"
              />
              <p className="text-caption text-text-muted">e.g. 1000 = asset, 4000 = income, 5000 = expense</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-type">Type *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="acc-type" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Name + Name Bangla */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-name">Name (English) *</Label>
              <Input
                id="acc-name"
                placeholder="Cash on Hand"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-name-bn">নাম (বাংলা)</Label>
              <Input
                id="acc-name-bn"
                placeholder="নগদ"
                value={nameBn}
                onChange={(e) => setNameBn(e.target.value)}
                lang="bn"
              />
            </div>
          </div>

          {/* Fund */}
          <div className="space-y-1.5">
            <Label htmlFor="acc-fund">Fund</Label>
            <Select value={fund} onValueChange={setFund}>
              <SelectTrigger id="acc-fund" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FUNDS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cash / Bank checkboxes (only relevant for asset accounts) */}
          {type === "asset" && (
            <div className="space-y-2 rounded-md border border-border-default bg-surface-hover px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="acc-is-cash"
                  checked={isCash}
                  onCheckedChange={(v) => setIsCash(v === true)}
                />
                <Label htmlFor="acc-is-cash" className="cursor-pointer text-body">
                  This is a Cash account
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="acc-is-bank"
                  checked={isBank}
                  onCheckedChange={(v) => setIsBank(v === true)}
                />
                <Label htmlFor="acc-is-bank" className="cursor-pointer text-body">
                  This is a Bank account
                </Label>
              </div>

              {/* Bank details — shown when Is Bank is checked */}
              {isBank && (
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="acc-bank-name">Bank Name</Label>
                    <Input
                      id="acc-bank-name"
                      placeholder="Sonali Bank"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="acc-bank-acct">Account No.</Label>
                    <Input
                      id="acc-bank-acct"
                      placeholder="1234567890"
                      value={bankAccountNo}
                      onChange={(e) => setBankAccountNo(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Opening balance */}
          <div className="space-y-1.5">
            <Label htmlFor="acc-balance">Opening Balance (BDT)</Label>
            <Input
              id="acc-balance"
              type="number"
              min={0}
              placeholder="0"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
            />
            <p className="text-caption text-text-muted">Only set if this account starts with an existing balance.</p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="acc-desc">Description (optional)</Label>
            <Textarea
              id="acc-desc"
              placeholder="Purpose of this account…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
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
            {submitting ? "Creating…" : "Create Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
