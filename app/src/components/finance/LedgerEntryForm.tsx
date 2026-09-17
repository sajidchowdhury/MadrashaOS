"use client";

/**
 * MadrashaOS — Ledger Entry Form (C3.4 — Finance · Accounting)
 *
 * New-journal-entry dialog enforcing the double-entry invariant
 * (SRS §2.4.3 — "Debits must equal credits"). Both sides default to the
 * same amount when one is typed; if the user later diverges them, an
 * inline error appears below the form and the submit button is disabled.
 *
 *   Fields:
 *     - Debit Account   (Select — accounts of type asset/expense)
 *     - Credit Account  (Select — accounts of type income/liability/equity)
 *     - Debit Amount    (number)
 *     - Credit Amount   (number)
 *     - Narration       (textarea)
 *
 *   Validation:
 *     - debitAccount !== creditAccount (else "Debit and credit must differ")
 *     - debitAmount > 0
 *     - creditAmount > 0
 *     - debitAmount === creditAmount (else "Debits must equal credits")
 *
 * On submit: emits a success toast with the new voucher number and closes.
 */

import * as React from "react";
import { AlertTriangle, Calculator, CheckCircle2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatCurrency } from "@/lib/i18n/format";
import { useAccounts } from "@/lib/query/client";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LedgerEntryForm({ open, onOpenChange }: Props) {
  const { locale } = useI18n();
  const { toast } = useToast();
  const { data: accounts } = useAccounts();

  const [debitAccountId, setDebitAccountId] = React.useState<string | undefined>();
  const [creditAccountId, setCreditAccountId] = React.useState<string | undefined>();
  const [debitAmount, setDebitAmount] = React.useState<number>(0);
  const [creditAmount, setCreditAmount] = React.useState<number>(0);
  const [narration, setNarration] = React.useState<string>("");

  // Reset state whenever the dialog opens fresh.
  React.useEffect(() => {
    if (open) {
      setDebitAccountId(undefined);
      setCreditAccountId(undefined);
      setDebitAmount(0);
      setCreditAmount(0);
      setNarration("");
    }
  }, [open]);

  // Mirror debit→credit while they're equal — once the user diverges them,
  // we stop auto-syncing so they can correct either side intentionally.
  const userDiverged = React.useRef(false);
  React.useEffect(() => {
    if (!userDiverged.current && debitAmount > 0) {
      setCreditAmount(debitAmount);
    }
  }, [debitAmount]);

  const balanceMismatch = debitAmount > 0 && creditAmount > 0 && debitAmount !== creditAmount;
  const sameAccount = !!debitAccountId && debitAccountId === creditAccountId;
  const canSubmit =
    !!debitAccountId &&
    !!creditAccountId &&
    !sameAccount &&
    debitAmount > 0 &&
    creditAmount > 0 &&
    !balanceMismatch &&
    narration.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const num = 13 + Math.floor(Math.random() * 800);
    const voucher = `JV-2026-${num.toString().padStart(3, "0")}`;
    toast({
      title: "Journal voucher posted",
      description: `${voucher} — ${formatCurrency(debitAmount, locale)}`,
    });
    onOpenChange(false);
  };

  const accountName = (id?: string) => accounts?.find((a) => a.id === id)?.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-subtitle">
            <Calculator className="h-5 w-5 text-primary-500" />
            New Journal Entry
          </DialogTitle>
          <DialogDescription>
            Post a balanced double-entry voucher. Debits must equal credits.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Debit side */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="debit-account" className="mb-1.5 block text-subtitle">
                Debit Account
              </Label>
              <Select value={debitAccountId} onValueChange={setDebitAccountId}>
                <SelectTrigger id="debit-account" className="w-full" aria-label="Debit account">
                  <SelectValue placeholder="Select debit account…" />
                </SelectTrigger>
                <SelectContent>
                  {(accounts ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} · {a.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="debit-amount" className="mb-1.5 block text-subtitle">
                Debit Amount
              </Label>
              <Input
                id="debit-amount"
                type="number"
                min={0}
                value={debitAmount || ""}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setDebitAmount(v);
                  if (v !== creditAmount) userDiverged.current = true;
                  else userDiverged.current = false;
                }}
                aria-invalid={debitAmount <= 0}
              />
            </div>
          </div>

          {/* Credit side */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="credit-account" className="mb-1.5 block text-subtitle">
                Credit Account
              </Label>
              <Select value={creditAccountId} onValueChange={setCreditAccountId}>
                <SelectTrigger id="credit-account" className="w-full" aria-label="Credit account">
                  <SelectValue placeholder="Select credit account…" />
                </SelectTrigger>
                <SelectContent>
                  {(accounts ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} · {a.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="credit-amount" className="mb-1.5 block text-subtitle">
                Credit Amount
              </Label>
              <Input
                id="credit-amount"
                type="number"
                min={0}
                value={creditAmount || ""}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setCreditAmount(v);
                  if (v !== debitAmount) userDiverged.current = true;
                  else userDiverged.current = false;
                }}
                aria-invalid={creditAmount <= 0}
              />
            </div>
          </div>

          {/* Narration */}
          <div>
            <Label htmlFor="narration" className="mb-1.5 block text-subtitle">
              Narration
            </Label>
            <Textarea
              id="narration"
              placeholder="e.g. Fee collection — January batch"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              rows={3}
            />
          </div>

          {/* Inline validation summary */}
          {(balanceMismatch || sameAccount || !narration.trim()) && (
            <div className="space-y-1.5">
              {balanceMismatch && (
                <p className="flex items-center gap-1.5 text-caption text-semantic-danger" role="alert">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Debits must equal credits.
                </p>
              )}
              {sameAccount && (
                <p className="flex items-center gap-1.5 text-caption text-semantic-danger" role="alert">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Debit and credit accounts must differ.
                </p>
              )}
              {!narration.trim() && (
                <p className="flex items-center gap-1.5 text-caption text-text-muted">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Narration is required for audit traceability.
                </p>
              )}
            </div>
          )}

          {/* Live balance preview */}
          {debitAmount > 0 && creditAmount > 0 && !balanceMismatch && (
            <div className="flex items-center justify-between rounded-md bg-success-50 px-3 py-2 text-body text-semantic-success">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Balanced
              </span>
              <span className="font-mono">
                {accountName(debitAccountId)} → {accountName(creditAccountId)}:{" "}
                {formatCurrency(debitAmount, locale)}
              </span>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              <CheckCircle2 className="h-4 w-4" />
              Post Entry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
