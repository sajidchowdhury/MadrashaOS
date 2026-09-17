"use client";

/**
 * MadrashaOS — Inventory (C4.2 — Operations · Inventory)
 *
 * Full inventory list + Receive / Issue stock flow per SRS §2.5.1.
 *
 *   - Table of all inventory items via useInventory() (10 items, 3 low-stock)
 *   - Columns: Code · Name (+Bn subtitle) · Category · Qty in Stock ·
 *              Reorder Level · Status badge (Low Stock=warning, OK=success) ·
 *              Actions (Receive · Issue)
 *   - Low-stock rows highlighted with bg-warning-50/40
 *   - "Receive Stock" dialog: select item + qty → confirm
 *     (perm: inventory.receive)
 *   - "Issue Stock" dialog: select item + qty + inline validation
 *     "Issue exceeds stock" if qty > qtyInStock (perm: inventory.issue)
 *   - "Add Item" button (perm: inventory.receive)
 *   - Search + category filter (FilterBar)
 *   - formatNumber() for localized quantities
 */

import * as React from "react";
import {
  Package, Plus, Search, ArrowDownToLine, ArrowUpFromLine,
  AlertTriangle, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { FilterBar } from "@/components/ui/filter-bar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { IfPermission } from "@/components/auth/IfPermission";
import {
  LoadingState, ErrorState, PermissionDenied,
} from "@/components/states";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiStat } from "@/components/operations/KpiStat";
import { useSessionStore } from "@/stores/sessionStore";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatNumber } from "@/lib/i18n/format";
import { useInventory } from "@/lib/query/client";
import { useToast } from "@/hooks/use-toast";
import type { InventoryItem } from "@/lib/mock/types";

type DialogMode = "receive" | "issue" | "add" | null;

export default function InventoryPage() {
  const { locale } = useI18n();
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const canView = hasPermission("inventory.view");

  const { data: inventory, isLoading, isError, refetch } = useInventory();
  const { toast } = useToast();

  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<string>("all");
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [dialogItem, setDialogItem] = React.useState<InventoryItem | undefined>();
  const [dialogQty, setDialogQty] = React.useState<number>(0);
  const [addItem, setAddItem] = React.useState({
    name: "", code: "", category: "Stationery", unit: "pcs", qty: 0, reorder: 0,
  });

  const categories = React.useMemo(() => {
    const set = new Set<string>(inventory?.map((i) => i.category) ?? []);
    return Array.from(set).sort();
  }, [inventory]);

  const filtered = React.useMemo(() => {
    if (!inventory) return [];
    return inventory.filter((i) => {
      if (category !== "all" && i.category !== category) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!i.name.toLowerCase().includes(q) && !i.code.toLowerCase().includes(q) && !i.nameBn.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [inventory, search, category]);

  if (!canView) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <PermissionDenied resource="Inventory" />
        </div>
      </div>
    );
  }

  const lowStockCount = inventory?.filter((i) => i.qtyInStock <= i.reorderLevel).length ?? 0;
  const totalStockValue = inventory?.reduce((s, i) => s + i.qtyInStock, 0) ?? 0;

  const openReceive = (item?: InventoryItem) => {
    setDialogItem(item);
    setDialogQty(0);
    setDialogMode("receive");
  };
  const openIssue = (item?: InventoryItem) => {
    setDialogItem(item);
    setDialogQty(0);
    setDialogMode("issue");
  };

  const issueExceedsStock =
    dialogMode === "issue" && dialogItem && dialogQty > dialogItem.qtyInStock;

  const canConfirm = (() => {
    if (dialogMode === "receive") return !!dialogItem && dialogQty > 0;
    if (dialogMode === "issue") return !!dialogItem && dialogQty > 0 && dialogQty <= dialogItem.qtyInStock;
    if (dialogMode === "add") return addItem.name.trim().length > 0 && addItem.code.trim().length > 0 && addItem.qty >= 0;
    return false;
  })();

  const handleConfirm = () => {
    if (dialogMode === "receive" && dialogItem) {
      toast({
        title: "Stock received",
        description: `${formatNumber(dialogQty, locale)} ${dialogItem.unit} of ${dialogItem.name} added (mock).`,
      });
    } else if (dialogMode === "issue" && dialogItem) {
      toast({
        title: "Stock issued",
        description: `${formatNumber(dialogQty, locale)} ${dialogItem.unit} of ${dialogItem.name} issued (mock).`,
      });
    } else if (dialogMode === "add") {
      toast({
        title: "Item added",
        description: `${addItem.name} (${addItem.code}) registered (mock).`,
      });
      setAddItem({ name: "", code: "", category: "Stationery", unit: "pcs", qty: 0, reorder: 0 });
    }
    setDialogMode(null);
    setDialogItem(undefined);
    setDialogQty(0);
  };

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-display font-bold text-text-primary">Inventory</h1>
            <p className="mt-1 text-body text-text-secondary">
              Stock on hand, low-stock alerts, receive & issue flow per SRS §2.5.1.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <IfPermission code="inventory.receive">
              <Button variant="outline" onClick={() => openReceive(undefined)}>
                <ArrowDownToLine className="h-4 w-4" />
                Receive Stock
              </Button>
            </IfPermission>
            <IfPermission code="inventory.issue">
              <Button variant="outline" onClick={() => openIssue(undefined)}>
                <ArrowUpFromLine className="h-4 w-4" />
                Issue Stock
              </Button>
            </IfPermission>
            <IfPermission code="inventory.receive">
              <Button onClick={() => setDialogMode("add")}>
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </IfPermission>
          </div>
        </header>

        {/* KPI strip */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiStat label="Total Items" value={formatNumber(inventory?.length ?? 0, locale)} icon={Package} tone="primary" />
          <KpiStat label="Low Stock" value={formatNumber(lowStockCount, locale)} hint="at or below reorder level" icon={AlertTriangle} tone={lowStockCount > 0 ? "danger" : "success"} />
          <KpiStat label="Total Units on Hand" value={formatNumber(totalStockValue, locale)} icon={CheckCircle2} tone="default" />
          <KpiStat label="Categories" value={formatNumber(categories.length, locale)} tone="accent" />
        </div>

        {/* Filter bar */}
        <FilterBar
          activeCount={(category !== "all" ? 1 : 0) + (search ? 1 : 0)}
          onClear={() => { setSearch(""); setCategory("all"); }}
        >
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              placeholder="Search by name or code…"
              className="h-8 ps-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search inventory"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger size="sm" className="w-40" aria-label="Filter by category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterBar>

        {/* Body */}
        {isLoading && <LoadingState pattern="table" rows={6} />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {!isLoading && !isError && filtered.length === 0 && (
          <EmptyState
            illustration="inventory"
            title="No items found"
            description={search || category !== "all" ? "Adjust your filters to see more items." : "Add your first inventory item to get started."}
          />
        )}
        {!isLoading && !isError && filtered.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border-default bg-surface-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50">
                  <TableHead className="px-4">Code</TableHead>
                  <TableHead className="px-4">Name</TableHead>
                  <TableHead className="px-4">Category</TableHead>
                  <TableHead className="px-4 text-end">Qty in Stock</TableHead>
                  <TableHead className="px-4 text-end">Reorder Level</TableHead>
                  <TableHead className="px-4">Status</TableHead>
                  <TableHead className="px-4 text-end">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => {
                  const isLow = item.qtyInStock <= item.reorderLevel;
                  return (
                    <TableRow
                      key={item.id}
                      className={isLow ? "bg-warning-50/40" : ""}
                    >
                      <TableCell className="px-4 py-3 font-mono text-caption text-text-secondary">
                        {item.code}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <p className="text-body font-medium text-text-primary">{item.name}</p>
                        <p className="text-caption text-text-muted" lang="bn">{item.nameBn}</p>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-body text-text-secondary">
                        {item.category}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-end font-mono text-body">
                        <span className={isLow ? "text-semantic-danger font-semibold" : "text-text-primary"}>
                          {formatNumber(item.qtyInStock, locale)}
                        </span>
                        <span className="text-caption text-text-muted"> {item.unit}</span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-end font-mono text-body text-text-secondary">
                        {formatNumber(item.reorderLevel, locale)}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {isLow ? (
                          <Badge variant="outline" className="border-semantic-warning/40 bg-warning-50 text-semantic-warning">
                            <AlertTriangle className="h-3 w-3" />
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-semantic-success/40 bg-success-50 text-semantic-success">
                            <CheckCircle2 className="h-3 w-3" />
                            OK
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <IfPermission code="inventory.receive" fallback={<span className="text-caption text-text-muted">View</span>}>
                            <Button size="sm" variant="ghost" onClick={() => openReceive(item)} aria-label={`Receive ${item.name}`}>
                              <ArrowDownToLine className="h-4 w-4 text-semantic-success" />
                            </Button>
                          </IfPermission>
                          <IfPermission code="inventory.issue" fallback={<span className="text-caption text-text-muted">View</span>}>
                            <Button size="sm" variant="ghost" onClick={() => openIssue(item)} aria-label={`Issue ${item.name}`}>
                              <ArrowUpFromLine className="h-4 w-4 text-primary-500" />
                            </Button>
                          </IfPermission>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {!isLoading && !isError && filtered.length > 0 && (
          <p className="text-caption text-text-muted">
            Showing {formatNumber(filtered.length, locale)} of {formatNumber(inventory?.length ?? 0, locale)} items ·
            Low-stock rows highlighted in amber.
          </p>
        )}
      </div>

      {/* Receive / Issue dialog */}
      <Dialog open={dialogMode === "receive" || dialogMode === "issue"} onOpenChange={(o) => !o && setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-subtitle">
              {dialogMode === "receive" ? (
                <ArrowDownToLine className="h-5 w-5 text-semantic-success" />
              ) : (
                <ArrowUpFromLine className="h-5 w-5 text-primary-500" />
              )}
              {dialogMode === "receive" ? "Receive Stock" : "Issue Stock"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "receive"
                ? "Add units to a stock item. Posts a positive movement (mock)."
                : "Issue units from stock. Cannot exceed current stock on hand."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="recv-item" className="mb-1.5 block text-subtitle">Item</Label>
              <Select
                value={dialogItem?.id ?? ""}
                onValueChange={(v) => {
                  const it = inventory?.find((i) => i.id === v);
                  setDialogItem(it);
                }}
              >
                <SelectTrigger id="recv-item" className="w-full" aria-label="Select item">
                  <SelectValue placeholder="Select item…" />
                </SelectTrigger>
                <SelectContent>
                  {(inventory ?? []).map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name} · {i.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {dialogItem && (
                <p className="mt-1 text-caption text-text-muted">
                  Current stock: <span className="font-mono">{formatNumber(dialogItem.qtyInStock, locale)} {dialogItem.unit}</span>
                  {" · "}Reorder level: <span className="font-mono">{formatNumber(dialogItem.reorderLevel, locale)}</span>
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="recv-qty" className="mb-1.5 block text-subtitle">Quantity</Label>
              <Input
                id="recv-qty"
                type="number"
                min={1}
                value={dialogQty || ""}
                onChange={(e) => setDialogQty(Number(e.target.value))}
                aria-invalid={!!issueExceedsStock}
              />
              {dialogMode === "issue" && issueExceedsStock && dialogItem && (
                <p className="mt-1 text-caption text-semantic-danger" role="alert">
                  Issue exceeds stock — only {formatNumber(dialogItem.qtyInStock, locale)} {dialogItem.unit} available.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={!canConfirm}>
              {dialogMode === "receive" ? "Receive" : "Issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item dialog */}
      <Dialog open={dialogMode === "add"} onOpenChange={(o) => !o && setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-subtitle">
              <Plus className="h-5 w-5 text-primary-500" />
              Add Inventory Item
            </DialogTitle>
            <DialogDescription>
              Register a new stock item. Code and name are required.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="add-code" className="mb-1.5 block text-subtitle">Code</Label>
                <Input id="add-code" value={addItem.code} onChange={(e) => setAddItem({ ...addItem, code: e.target.value })} placeholder="STN-005" />
              </div>
              <div>
                <Label htmlFor="add-cat" className="mb-1.5 block text-subtitle">Category</Label>
                <Select value={addItem.category} onValueChange={(v) => setAddItem({ ...addItem, category: v })}>
                  <SelectTrigger id="add-cat" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Stationery", "Food", "Cleaning", "Medical"].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="add-name" className="mb-1.5 block text-subtitle">Name (English)</Label>
              <Input id="add-name" value={addItem.name} onChange={(e) => setAddItem({ ...addItem, name: e.target.value })} placeholder="e.g. Chalk (White)" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="add-unit" className="mb-1.5 block text-subtitle">Unit</Label>
                <Input id="add-unit" value={addItem.unit} onChange={(e) => setAddItem({ ...addItem, unit: e.target.value })} placeholder="pcs" />
              </div>
              <div>
                <Label htmlFor="add-qty" className="mb-1.5 block text-subtitle">Qty</Label>
                <Input id="add-qty" type="number" min={0} value={addItem.qty || ""} onChange={(e) => setAddItem({ ...addItem, qty: Number(e.target.value) })} />
              </div>
              <div>
                <Label htmlFor="add-reorder" className="mb-1.5 block text-subtitle">Reorder</Label>
                <Input id="add-reorder" type="number" min={0} value={addItem.reorder || ""} onChange={(e) => setAddItem({ ...addItem, reorder: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={!canConfirm}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
