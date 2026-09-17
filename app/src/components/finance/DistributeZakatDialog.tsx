"use client";

/**
 * MadrashaOS — Distribute Zakat Dialog (C3.4 — Finance · Zakat · Risk R9)
 *
 * Records a Zakat distribution to a beneficiary. Risk R9 fund-isolation
 * invariant is enforced client-side: the dialog queries the Zakat fund
 * balance from useAccounts() and blocks submit if the distribution
 * amount exceeds the available balance, surfacing an inline error with
 * the Zakat fund badge visible.
 *
 * Permission gate (zakat.distribute) is owned by the parent page.
 */

import * as React from "react";
import { AlertTriangle, Scale, CheckCircle2 } from "lucide-react";
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

export function DistributeZakatDialog({ open, onOpenChange }: Props) {
  const { locale } = useI18n();
  const { toast } = useToast();
  const { data: accounts } = useAccounts();

  const zakatAccount = accounts?.find((a) => a.fund === "zakat");
  const fundBalance = zakatAccount?.balance ?? 0;

  const [beneficiary, setBeneficiary] = React.useState("");
  const [amount, setAmount] = React.useState(0);
  const [purpose, setPurpose] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setBeneficiary("");
      setAmount(0);
      setPurpose("");
    }
  }, [open]);

  const exceedsBalance = amount > 0 && amount > fundBalance;
  const canSubmit =
    amount > 0 && !exceedsBalance && beneficiary.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const num = 1000 + Math.floor(Math.random() * 9000);
    const rcp = `ZKD-2026-${num}`;
    toast({
      title: "Zakat distributed",
      description: `${rcp} — ${formatCurrency(amount, locale)} released from Zakat fund`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-subtitle">
            <Scale className="h-5 w-5 text-accent-500" />
            Distribute Zakat
          </DialogTitle>
          <DialogDescription>
            Release funds from the Zakat fund to a beneficiary. Amount cannot exceed the fund balance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Fund balance preview with badge */}
          <div className="flex items-center justify-between rounded-md border border-accent-500/30 bg-accent-50 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Badge className="bg-accent-500 text-accent-foreground">Zakat</Badge>
              <div>
                <p className="text-body font-medium text-accent-700">
                  {zakatAccount?.name ?? "Zakat Fund"}
                </p>
                <p className="text-caption text-accent-700/70">Available balance</p>
              </div>
            </div>
            <p className="font-mono text-body text-accent-700">
              {formatCurrency(fundBalance, locale)}
            </p>
          </div>

          <div>
            <Label htmlFor="beneficiary" className="mb-1.5 block text-subtitle">
              Beneficiary <span className="text-semantic-danger">*</span>
            </Label>
            <Input
              id="beneficiary"
              placeholder="e.g. Needy student — MOS-2026-005"
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
              aria-invalid={beneficiary.trim().length === 0}
            />
            {beneficiary.trim().length === 0 && (
              <p className="mt-1 text-caption text-text-muted">
                Recipient name or reference is required.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="dist-amount" className="mb-1.5 block text-subtitle">
              Distribution Amount <span className="text-semantic-danger">*</span>
            </Label>
            <Input
              id="dist-amount"
              type="number"
              min={1}
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
              aria-invalid={exceedsBalance}
              className={exceedsBalance ? "border-semantic-danger" : ""}
            />
            {amount <= 0 && (
              <p className="mt-1 text-caption text-semantic-danger">Amount must be greater than zero.</p>
            )}
            {exceedsBalance && (
              <p
                className="mt-1 flex items-center gap-1.5 text-caption text-semantic-danger"
                role="alert"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Distribution exceeds Zakat fund balance (available: {formatCurrency(fundBalance, locale)}).
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="dist-purpose" className="mb-1.5 block text-subtitle">
              Purpose <span className="text-text-muted">(optional)</span>
            </Label>
            <Textarea
              id="dist-purpose"
              placeholder="e.g. Tuition assistance for orphaned student"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={2}
            />
          </div>

          {/* Available-after preview */}
          {amount > 0 && !exceedsBalance && (
            <div className="flex items-center justify-between rounded-md bg-success-50 px-3 py-2 text-body text-semantic-success">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Within fund
              </span>
              <span className="font-mono">
                Balance after: {formatCurrency(fundBalance - amount, locale)}
              </span>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              <CheckCircle2 className="h-4 w-4" />
              Distribute
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
