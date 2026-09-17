"use client";

/**
 * MadrashaOS — Assets Register (C4.2 — Operations · Assets)
 *
 * Fixed-asset register with transfer / dispose per SRS §2.5.4.
 *
 *   - 6 mock assets (computers, furniture, vehicles)
 *   - Table: Code · Name · Value · Status badge · Location · Actions
 *   - "Transfer" dialog (perm: assets.transfer) — select destination
 *   - "Dispose" confirm dialog (perm: assets.dispose) — explicit copy:
 *       "Disposal will remove from active register but keep the record.
 *        Continue?"
 *   - Disposed assets remain in the table with strikethrough + greyed
 *     styling (record kept per SRS §2.5.4 "asset record never deleted")
 *   - formatCurrency() for values
 */

import * as React from "react";
import {
  Sofa, Plus, Search, ArrowLeftRight, Trash2, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { IfPermission } from "@/components/auth/IfPermission";
import {
  PermissionDenied,
} from "@/components/states";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiStat } from "@/components/operations/KpiStat";
import { useSessionStore } from "@/stores/sessionStore";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatCurrency, formatDate } from "@/lib/i18n/format";
import { useToast } from "@/hooks/use-toast";

/* --- Inline mock assets --- */

type AssetStatus = "active" | "transferred" | "disposed";

type Asset = {
  id: string;
  code: string;
  name: string;
  category: "Computer" | "Furniture" | "Vehicle";
  value: number;
  status: AssetStatus;
  location: string;
  purchasedOn: string;
};

const LOCATIONS = ["Dhaka — Main Office", "Dhaka — Library", "Dhaka — Hostel", "Chittagong Branch"];

const INITIAL_ASSETS: Asset[] = [
  { id: "ast-1", code: "CMP-001", name: "Dell Optiplex 7090", category: "Computer", value: 65000, status: "active", location: "Dhaka — Main Office", purchasedOn: "2025-01-15" },
  { id: "ast-2", code: "CMP-002", name: "HP EliteDesk 800", category: "Computer", value: 58000, status: "active", location: "Dhaka — Library", purchasedOn: "2025-02-10" },
  { id: "ast-3", code: "CMP-003", name: "MacBook Air M2 (Office)", category: "Computer", value: 125000, status: "active", location: "Dhaka — Main Office", purchasedOn: "2025-03-22" },
  { id: "ast-4", code: "FUR-001", name: "Office Desk Set (×10)", category: "Furniture", value: 45000, status: "active", location: "Dhaka — Main Office", purchasedOn: "2024-08-12" },
  { id: "ast-5", code: "FUR-002", name: "Library Shelves (Row A)", category: "Furniture", value: 38000, status: "transferred", location: "Chittagong Branch", purchasedOn: "2024-06-01" },
  { id: "ast-6", code: "VEH-001", name: "Toyota HiAce (School Bus)", category: "Vehicle", value: 1850000, status: "disposed", location: "Dhaka — Main Office", purchasedOn: "2018-09-10" },
];

const STATUS_BADGE: Record<AssetStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "border-semantic-success/40 bg-success-50 text-semantic-success" },
  transferred: { label: "Transferred", className: "border-primary-500/40 bg-primary-50 text-primary-700" },
  disposed: { label: "Disposed", className: "border-border-default bg-neutral-100 text-text-secondary" },
};

export default function AssetsPage() {
  const { locale } = useI18n();
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const canView = hasPermission("assets.view");
  const { toast } = useToast();

  const [assets, setAssets] = React.useState<Asset[]>(INITIAL_ASSETS);
  const [search, setSearch] = React.useState("");
  const [catFilter, setCatFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const [transferAsset, setTransferAsset] = React.useState<Asset | null>(null);
  const [transferTo, setTransferTo] = React.useState<string>("");
  const [disposeAsset, setDisposeAsset] = React.useState<Asset | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [addForm, setAddForm] = React.useState({ code: "", name: "", category: "Computer" as Asset["category"], value: 0, location: LOCATIONS[0] });

  if (!canView) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <PermissionDenied resource="Assets Register" />
        </div>
      </div>
    );
  }

  const filtered = assets.filter((a) => {
    if (catFilter !== "all" && a.category !== catFilter) return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!a.name.toLowerCase().includes(q) && !a.code.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalValue = assets.filter((a) => a.status !== "disposed").reduce((s, a) => s + a.value, 0);
  const activeCount = assets.filter((a) => a.status === "active").length;
  const disposedCount = assets.filter((a) => a.status === "disposed").length;

  const handleConfirmTransfer = () => {
    if (!transferAsset || !transferTo) return;
    setAssets((prev) => prev.map((a) => a.id === transferAsset.id ? { ...a, status: "transferred", location: transferTo } : a));
    toast({
      title: "Asset transferred",
      description: `${transferAsset.name} moved to ${transferTo}.`,
    });
    setTransferAsset(null);
    setTransferTo("");
  };

  const handleConfirmDispose = () => {
    if (!disposeAsset) return;
    setAssets((prev) => prev.map((a) => a.id === disposeAsset.id ? { ...a, status: "disposed" } : a));
    toast({
      title: "Asset disposed",
      description: `${disposeAsset.name} marked disposed. Record retained per SRS §2.5.4.`,
      variant: "destructive",
    });
    setDisposeAsset(null);
  };

  const handleAddAsset = () => {
    if (!addForm.code.trim() || !addForm.name.trim() || addForm.value <= 0) return;
    const newAsset: Asset = {
      id: `ast-${Date.now()}`,
      code: addForm.code,
      name: addForm.name,
      category: addForm.category,
      value: addForm.value,
      status: "active",
      location: addForm.location,
      purchasedOn: new Date().toISOString().slice(0, 10),
    };
    setAssets((prev) => [newAsset, ...prev]);
    toast({ title: "Asset registered", description: `${newAsset.name} added.` });
    setAddForm({ code: "", name: "", category: "Computer", value: 0, location: LOCATIONS[0] });
    setAddOpen(false);
  };

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-display font-bold text-text-primary">Asset Register</h1>
            <p className="mt-1 text-body text-text-secondary">
              Fixed assets — register, transfer, dispose. Disposed records retained per SRS §2.5.4.
            </p>
          </div>
          <IfPermission code="assets.transfer">
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Asset
            </Button>
          </IfPermission>
        </header>

        {/* KPI strip */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiStat label="Active Assets" value={String(activeCount)} icon={Sofa} tone="primary" />
          <KpiStat label="Active Book Value" value={formatCurrency(totalValue, locale)} tone="success" />
          <KpiStat label="Disposed (Retained)" value={String(disposedCount)} hint="record kept" tone="default" />
          <KpiStat label="Locations" value={String(LOCATIONS.length)} icon={Building2} tone="accent" />
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border-default bg-surface-card p-3">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              placeholder="Search by name or code…"
              className="h-8 ps-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search assets"
            />
          </div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger size="sm" className="w-32" aria-label="Filter by category"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="Computer">Computer</SelectItem>
              <SelectItem value="Furniture">Furniture</SelectItem>
              <SelectItem value="Vehicle">Vehicle</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger size="sm" className="w-36" aria-label="Filter by status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="transferred">Transferred</SelectItem>
              <SelectItem value="disposed">Disposed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Body */}
        {filtered.length === 0 && (
          <EmptyState
            illustration="inventory"
            title="No assets found"
            description={search || catFilter !== "all" || statusFilter !== "all" ? "Adjust your filters." : "Add your first asset to get started."}
          />
        )}
        {filtered.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border-default bg-surface-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50">
                  <TableHead className="px-4">Code</TableHead>
                  <TableHead className="px-4">Name</TableHead>
                  <TableHead className="px-4 text-end">Value</TableHead>
                  <TableHead className="px-4">Status</TableHead>
                  <TableHead className="px-4">Location</TableHead>
                  <TableHead className="px-4 text-end">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => {
                  const isDisposed = a.status === "disposed";
                  return (
                    <TableRow
                      key={a.id}
                      className={isDisposed ? "opacity-60" : ""}
                    >
                      <TableCell className="px-4 py-3 font-mono text-caption text-text-secondary">
                        <span className={isDisposed ? "line-through" : ""}>{a.code}</span>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <p className={`text-body font-medium text-text-primary ${isDisposed ? "line-through" : ""}`}>
                          {a.name}
                        </p>
                        <p className="text-caption text-text-muted">
                          {a.category} · purchased {formatDate(new Date(a.purchasedOn), locale)}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-end font-mono text-body text-text-primary">
                        {formatCurrency(a.value, locale)}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge variant="outline" className={STATUS_BADGE[a.status].className}>
                          {STATUS_BADGE[a.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-body text-text-secondary">{a.location}</TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {isDisposed ? (
                            <span className="text-caption text-text-muted">—</span>
                          ) : (
                            <>
                              <IfPermission code="assets.transfer" fallback={<span className="text-caption text-text-muted">View</span>}>
                                <Button size="sm" variant="ghost" onClick={() => { setTransferAsset(a); setTransferTo(a.location); }} aria-label={`Transfer ${a.name}`}>
                                  <ArrowLeftRight className="h-4 w-4 text-primary-500" />
                                </Button>
                              </IfPermission>
                              <IfPermission code="assets.dispose" fallback={<span className="text-caption text-text-muted">View</span>}>
                                <Button size="sm" variant="ghost" onClick={() => setDisposeAsset(a)} aria-label={`Dispose ${a.name}`}>
                                  <Trash2 className="h-4 w-4 text-semantic-danger" />
                                </Button>
                              </IfPermission>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {filtered.length > 0 && (
          <p className="text-caption text-text-muted">
            Disposed assets remain in the register with strikethrough (record retained per SRS §2.5.4).
          </p>
        )}
      </div>

      {/* Transfer dialog */}
      <Dialog open={!!transferAsset} onOpenChange={(o) => !o && setTransferAsset(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-subtitle">
              <ArrowLeftRight className="h-5 w-5 text-primary-500" />
              Transfer Asset
            </DialogTitle>
            <DialogDescription>
              Move <strong>{transferAsset?.name}</strong> ({transferAsset?.code}) to a new location.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1.5 block text-caption text-text-muted">Current location</Label>
              <p className="text-body text-text-secondary">{transferAsset?.location}</p>
            </div>
            <div>
              <Label htmlFor="trf-to" className="mb-1.5 block text-subtitle">New location</Label>
              <Select value={transferTo} onValueChange={setTransferTo}>
                <SelectTrigger id="trf-to" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferAsset(null)}>Cancel</Button>
            <Button onClick={handleConfirmTransfer} disabled={!transferTo || transferTo === transferAsset?.location}>
              Confirm Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispose confirm (AlertDialog) */}
      <AlertDialog open={!!disposeAsset} onOpenChange={(o) => !o && setDisposeAsset(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-subtitle">
              <Trash2 className="h-5 w-5 text-semantic-danger" />
              Dispose Asset
            </AlertDialogTitle>
            <AlertDialogDescription>
              Disposal will remove <strong>{disposeAsset?.name}</strong> from the active register but keep the record. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDispose}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Dispose Asset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Asset dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-subtitle">
              <Plus className="h-5 w-5 text-primary-500" />
              Add Asset
            </DialogTitle>
            <DialogDescription>Register a new fixed asset (mock).</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ast-code" className="mb-1.5 block text-subtitle">Code</Label>
                <Input id="ast-code" value={addForm.code} onChange={(e) => setAddForm({ ...addForm, code: e.target.value })} placeholder="CMP-004" />
              </div>
              <div>
                <Label htmlFor="ast-cat" className="mb-1.5 block text-subtitle">Category</Label>
                <Select value={addForm.category} onValueChange={(v) => setAddForm({ ...addForm, category: v as Asset["category"] })}>
                  <SelectTrigger id="ast-cat" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Computer">Computer</SelectItem>
                    <SelectItem value="Furniture">Furniture</SelectItem>
                    <SelectItem value="Vehicle">Vehicle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="ast-name" className="mb-1.5 block text-subtitle">Name</Label>
              <Input id="ast-name" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="Asset description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ast-val" className="mb-1.5 block text-subtitle">Value (BDT)</Label>
                <Input id="ast-val" type="number" min={0} value={addForm.value || ""} onChange={(e) => setAddForm({ ...addForm, value: Number(e.target.value) })} />
              </div>
              <div>
                <Label htmlFor="ast-loc" className="mb-1.5 block text-subtitle">Location</Label>
                <Select value={addForm.location} onValueChange={(v) => setAddForm({ ...addForm, location: v })}>
                  <SelectTrigger id="ast-loc" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddAsset} disabled={!addForm.code.trim() || !addForm.name.trim() || addForm.value <= 0}>Add Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
