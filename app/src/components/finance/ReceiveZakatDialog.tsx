"use client";

/**
 * MadrashaOS — Receive Zakat Dialog (C3.4 — Finance · Zakat)
 *
 * Records an incoming Zakat contribution. The receiving account is
 * hard-locked to the Zakat fund account (acc-zakat-fund) per SRS §3.7 —
 * the operator cannot accidentally post Zakat money to a general fund.
 *
 * Permission gate (zakat.receive) is owned by the parent page; this
 * component does not re-check.
 */

import * as React from "react";
import { HandCoins, CheckCircle2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatCurrency } from "@/lib/i18n/format";
import { useAccounts } from "@/lib/query/client";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReceiveZakatDialog({ open, onOpenChange }: Props) {
  const { locale } = useI18n();
  const { toast } = useToast();
  const { data: accounts } = useAccounts();

  const zakatAccount = accounts?.find((a) => a.fund === "zakat");

  const [donorName, setDonorName] = React.useState("");
  const [amount, setAmount] = React.useState(0);
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setDonorName("");
      setAmount(0);
      setNote("");
    }
  }, [open]);

  const canSubmit = amount > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const num = 2000 + Math.floor(Math.random() * 8000);
    const rcp = `ZKT-2026-${num}`;
    toast({
      title: "Zakat received",
      description: `${rcp} — ${formatCurrency(amount, locale)} posted to Zakat fund`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-subtitle">
            <HandCoins className="h-5 w-5 text-accent-500" />
            Receive Zakat
          </DialogTitle>
          <DialogDescription>
            Record an incoming Zakat contribution. Posts to the Zakat fund account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Locked account preview */}
          <div className="flex items-center justify-between rounded-md border border-accent-500/30 bg-accent-50 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Badge className="bg-accent-500 text-accent-foreground">Zakat</Badge>
              <div>
                <p className="text-body font-medium text-accent-700">
                  {zakatAccount?.name ?? "Zakat Fund"}
                </p>
                <p className="text-caption text-accent-700/70">Locked — fund isolation per SRS §3.7</p>
              </div>
            </div>
            <p className="font-mono text-body text-accent-700">
              {formatCurrency(zakatAccount?.balance ?? 0, locale)}
            </p>
          </div>

          <div>
            <Label htmlFor="donor-name" className="mb-1.5 block text-subtitle">
              Donor Name <span className="text-text-muted">(optional)</span>
            </Label>
            <Input
              id="donor-name"
              placeholder="Anonymous donor"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="zakat-amount" className="mb-1.5 block text-subtitle">
              Amount Received <span className="text-semantic-danger">*</span>
            </Label>
            <Input
              id="zakat-amount"
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

          <div>
            <Label htmlFor="zakat-note" className="mb-1.5 block text-subtitle">
              Note <span className="text-text-muted">(optional)</span>
            </Label>
            <Textarea
              id="zakat-note"
              placeholder="e.g. Zakat al-Fitr contribution for Ramadan 2026"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              <CheckCircle2 className="h-4 w-4" />
              Record Receipt
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
