"use client";

/**
 * MadrashaOS — Sell to Student Dialog
 *
 * Sells an inventory item to a student. Two payment modes:
 *   - 'cash'   : paid immediately (posts to Cash/Bank account)
 *   - 'credit' : added to the student's outstanding fees (creates a
 *                FeeInstallment row that appears on /fees)
 *
 * Calls POST /api/v1/inventory/sell. The API handles:
 *   - Stock decrement
 *   - LedgerEntry (debit Cash/Bank or AR, credit Sale Income)
 *   - FeeInstallment creation (credit mode only)
 *   - Sale record creation
 *
 * Permission: inventory.sale (parent wraps trigger in IfPermission)
 */

import * as React from "react";
import {
  ShoppingCart, XCircle, AlertCircle, Save,
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
import {
  useStudents, useInventory, useAccounts, queryClient,
} from "@/lib/query/client";

type Student = {
  id: string;
  code: string;
  name: string;
  nameBn?: string;
  className?: string;
};

type InventoryItem = {
  id: string;
  code: string;
  name: string;
  qtyInStock?: number;
  unitCost?: number;
  unit?: string;
};

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
  isCash?: boolean;
  isBank?: boolean;
};

export type SellToStudentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Preselected item (when the Sell button is clicked per-row). */
  itemId?: string;
  itemName?: string;
};

export function SellToStudentDialog({
  open, onOpenChange, itemId, itemName,
}: SellToStudentDialogProps) {
  const { toast } = useToast();
  const { data: students } = useStudents();
  const { data: inventory } = useInventory();
  const { data: accounts } = useAccounts();

  const studentList = (students ?? []) as Student[];
  const itemList = (inventory ?? []) as InventoryItem[];
  const accountList = (accounts ?? []) as Account[];
  const paymentAccounts = accountList.filter((a) => a.type === "asset");

  const [selectedStudentId, setSelectedStudentId] = React.useState("");
  const [selectedItemId, setSelectedItemId] = React.useState(itemId ?? "");
  const [qty, setQty] = React.useState<string>("1");
  const [unitPrice, setUnitPrice] = React.useState<string>("");
  const [paymentMode, setPaymentMode] = React.useState<"cash" | "credit">("cash");
  const [accountId, setAccountId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset/pre-fill when dialog opens or itemId changes
  React.useEffect(() => {
    if (open) {
      setSelectedStudentId("");
      setSelectedItemId(itemId ?? "");
      setQty("1");
      setUnitPrice("");
      setPaymentMode("cash");
      setAccountId("");
      setNotes("");
      setError(null);
    }
  }, [open, itemId]);

  // Auto-fill unit price when item changes
  React.useEffect(() => {
    if (selectedItemId) {
      const item = itemList.find((i) => i.id === selectedItemId);
      if (item?.unitCost != null) {
        setUnitPrice(String(item.unitCost));
      }
    }
  }, [selectedItemId, itemList]);

  const selectedItem = itemList.find((i) => i.id === selectedItemId);
  const selectedStudent = studentList.find((s) => s.id === selectedStudentId);
  const qtyNum = Number(qty) || 0;
  const priceNum = Number(unitPrice) || 0;
  const total = qtyNum * priceNum;
  const stockAvailable = Number(selectedItem?.qtyInStock ?? 0);

  async function handleSubmit() {
    setError(null);
    if (!selectedStudentId) {
      setError("Please select a student.");
      return;
    }
    if (!selectedItemId) {
      setError("Please select an item.");
      return;
    }
    if (qtyNum <= 0) {
      setError("Quantity must be greater than 0.");
      return;
    }
    if (priceNum <= 0) {
      setError("Unit price must be greater than 0.");
      return;
    }
    if (qtyNum > stockAvailable) {
      setError(
        `Sale exceeds stock. Available: ${stockAvailable}, Requested: ${qtyNum}.`,
      );
      return;
    }
    if (paymentMode === "cash" && !accountId) {
      setError("Please select a Cash/Bank account for cash payment.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/inventory/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: selectedStudentId,
          item_id: selectedItemId,
          qty: qtyNum,
          unit_price: priceNum,
          payment_mode: paymentMode,
          account_id: paymentMode === "cash" ? accountId : undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || `Failed (HTTP ${res.status})`);
        setSubmitting(false);
        return;
      }
      toast({
        title: "Sale recorded",
        description: data?.message ||
          `${selectedItem?.name} × ${qtyNum} → ${selectedStudent?.name} · ৳${total.toLocaleString()}`,
      });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["fee-plans"] });
      queryClient.invalidateQueries({ queryKey: ["fee-payments"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["ledger-entries"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
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
            <ShoppingCart className="h-5 w-5 text-primary-500" />
            Sell to Student
          </DialogTitle>
          <DialogDescription>
            Sell an inventory item to a student. Choose cash (paid now) or
            credit (added to the student&apos;s outstanding fees).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student */}
          <div className="space-y-1.5">
            <Label htmlFor="sell-student">Student *</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger id="sell-student" className="w-full">
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {studentList.length === 0 && (
                  <div className="px-3 py-2 text-caption text-text-muted">
                    No students found.
                  </div>
                )}
                {studentList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.code}){s.className ? ` · ${s.className}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Item */}
          <div className="space-y-1.5">
            <Label htmlFor="sell-item">Item *</Label>
            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
              <SelectTrigger id="sell-item" className="w-full">
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent>
                {itemList.length === 0 && (
                  <div className="px-3 py-2 text-caption text-text-muted">
                    No inventory items found.
                  </div>
                )}
                {itemList.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name} ({i.code}){i.qtyInStock != null ? ` · ${i.qtyInStock} in stock` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedItem && (
              <p className="text-caption text-text-muted">
                Stock: {selectedItem.qtyInStock ?? "—"} {selectedItem.unit ?? "piece"}
              </p>
            )}
          </div>

          {/* Qty + Unit Price */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sell-qty">Quantity *</Label>
              <Input
                id="sell-qty"
                type="number"
                min={0.01}
                step="0.01"
                placeholder="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sell-price">Unit Price (BDT) *</Label>
              <Input
                id="sell-price"
                type="number"
                min={0}
                step="0.01"
                placeholder="100"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
            </div>
          </div>

          {/* Total */}
          {total > 0 && (
            <div className="rounded-md border border-border-default bg-surface-hover px-3 py-2">
              <div className="flex justify-between text-body">
                <span className="text-text-secondary">Total:</span>
                <span className="font-mono font-bold text-text-primary">
                  ৳{total.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Payment mode */}
          <div className="space-y-1.5">
            <Label htmlFor="sell-mode">Payment Mode *</Label>
            <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as "cash" | "credit")}>
              <SelectTrigger id="sell-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash — paid now (posts to Cash/Bank)</SelectItem>
                <SelectItem value="credit">Credit — add to student&apos;s fees</SelectItem>
              </SelectContent>
            </Select>
            {paymentMode === "credit" && (
              <p className="text-caption text-text-muted">
                Creates a fee installment for this student. It will appear on the
                Fees page and can be collected later via Collect Payment.
              </p>
            )}
          </div>

          {/* Account (cash mode only) */}
          {paymentMode === "cash" && (
            <div className="space-y-1.5">
              <Label htmlFor="sell-account">Payment Account (Cash/Bank) *</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger id="sell-account" className="w-full">
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
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="sell-notes">Notes (optional)</Label>
            <Textarea
              id="sell-notes"
              placeholder="e.g. Sold at counter, student requested"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
            {submitting ? "Recording…" : "Record Sale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
