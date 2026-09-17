"use client";

/**
 * MadrashaOS — Suppliers (C4.2 — Operations · Suppliers)
 *
 * Supplier list with outstanding totals (SRS §2.5.3 — Supplier Payables).
 *
 *   - 5 mock suppliers with name, phone, totalPurchased, totalPaid, outstanding
 *   - Table: Name · Phone · Total Purchased · Total Paid · Outstanding (badge
 *     if > 0)
 *   - Detail drawer on row click showing mock purchase history
 *   - "Add Supplier" button (perm: suppliers.view — visual gate per spec)
 *   - formatCurrency() for all amounts
 */

import * as React from "react";
import {
  Truck, Plus, Search, Phone, ArrowRight, Wallet,
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
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter,
} from "@/components/ui/drawer";
import { IfPermission } from "@/components/auth/IfPermission";
import {
  PermissionDenied, LoadingState,
} from "@/components/states";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiStat } from "@/components/operations/KpiStat";
import { useSessionStore } from "@/stores/sessionStore";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatCurrency, formatDate } from "@/lib/i18n/format";
import { useToast } from "@/hooks/use-toast";

/* --- Inline mock suppliers --- */

type SupplierHistory = {
  date: string;
  poNumber: string;
  amount: number;
  paid: boolean;
};

type Supplier = {
  id: string;
  name: string;
  nameBn: string;
  phone: string;
  email: string;
  category: string;
  totalPurchased: number;
  totalPaid: number;
  history: SupplierHistory[];
};

const SUPPLIERS: Supplier[] = [
  {
    id: "sup-1",
    name: "ABC Stationery",
    nameBn: "এবিসি স্টেশনারি",
    phone: "+8801711001001",
    email: "sales@abcstationery.com",
    category: "Stationery",
    totalPurchased: 84500,
    totalPaid: 62500,
    history: [
      { date: "2026-09-12", poNumber: "PO-2026-012", amount: 22000, paid: false },
      { date: "2026-08-04", poNumber: "PO-2026-008", amount: 18500, paid: true },
      { date: "2026-07-10", poNumber: "PO-2026-003", amount: 44000, paid: true },
    ],
  },
  {
    id: "sup-2",
    name: "Agro Foods",
    nameBn: "অ্যাগ্রো ফুডস",
    phone: "+8801822002002",
    email: "orders@agrofoods.bd",
    category: "Food",
    totalPurchased: 245000,
    totalPaid: 245000,
    history: [
      { date: "2026-09-04", poNumber: "PO-2026-008", amount: 62000, paid: true },
      { date: "2026-08-04", poNumber: "PO-2026-005", amount: 91000, paid: true },
      { date: "2026-07-04", poNumber: "PO-2026-002", amount: 92000, paid: true },
    ],
  },
  {
    id: "sup-3",
    name: "Sports World Ltd.",
    nameBn: "স্পোর্টস ওয়ার্ল্ড লিমিটেড",
    phone: "+8801933003003",
    email: "info@sportsworld.bd",
    category: "Sports",
    totalPurchased: 45000,
    totalPaid: 30000,
    history: [
      { date: "2026-09-10", poNumber: "PO-2026-002", amount: 15000, paid: false },
      { date: "2026-08-12", poNumber: "PO-2026-006", amount: 30000, paid: true },
    ],
  },
  {
    id: "sup-4",
    name: "Darul Kutub",
    nameBn: "দারুল কুতুব",
    phone: "+8801544004004",
    email: "books@darulkutub.com",
    category: "Library",
    totalPurchased: 38500,
    totalPaid: 30000,
    history: [
      { date: "2026-09-13", poNumber: "PO-2026-003", amount: 8500, paid: false },
      { date: "2026-08-22", poNumber: "PO-2026-007", amount: 30000, paid: true },
    ],
  },
  {
    id: "sup-5",
    name: "CleanCo",
    nameBn: "ক্লিনকো",
    phone: "+8801655005005",
    email: "supply@cleanco.bd",
    category: "Cleaning",
    totalPurchased: 24800,
    totalPaid: 24800,
    history: [
      { date: "2026-09-08", poNumber: "PO-2026-005", amount: 4800, paid: true },
      { date: "2026-08-08", poNumber: "PO-2026-004", amount: 20000, paid: true },
    ],
  },
];

const CATEGORIES = ["All", "Stationery", "Food", "Sports", "Library", "Cleaning"];

export default function SuppliersPage() {
  const { locale } = useI18n();
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const canView = hasPermission("suppliers.view");
  const { toast } = useToast();

  const [search, setSearch] = React.useState("");
  const [catFilter, setCatFilter] = React.useState<string>("All");
  const [selected, setSelected] = React.useState<Supplier | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [addForm, setAddForm] = React.useState({ name: "", phone: "", category: "Stationery" });

  // Suppliers are static mock data — keep a tiny loading flash for parity.
  const [loading] = React.useState(false);

  if (!canView) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <PermissionDenied resource="Suppliers" />
        </div>
      </div>
    );
  }

  const filtered = SUPPLIERS.filter((s) => {
    if (catFilter !== "All" && s.category !== catFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!s.name.toLowerCase().includes(q) && !s.phone.includes(q) && !s.nameBn.includes(q)) return false;
    }
    return true;
  });

  const totalPurchased = SUPPLIERS.reduce((s, x) => s + x.totalPurchased, 0);
  const totalOutstanding = SUPPLIERS.reduce((s, x) => s + (x.totalPurchased - x.totalPaid), 0);
  const withOutstanding = SUPPLIERS.filter((s) => s.totalPurchased - s.totalPaid > 0).length;

  const handleAdd = () => {
    if (!addForm.name.trim() || !addForm.phone.trim()) return;
    toast({
      title: "Supplier added (mock)",
      description: `${addForm.name} — ${addForm.phone}`,
    });
    setAddForm({ name: "", phone: "", category: "Stationery" });
    setAddOpen(false);
  };

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-display font-bold text-text-primary">Suppliers</h1>
            <p className="mt-1 text-body text-text-secondary">
              Supplier register with outstanding payable totals per SRS §2.5.3.
            </p>
          </div>
          {/* Visual gate per task spec (perm: suppliers.view) */}
          <IfPermission code="suppliers.view">
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Supplier
            </Button>
          </IfPermission>
        </header>

        {/* KPI strip */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiStat label="Total Suppliers" value={String(SUPPLIERS.length)} icon={Truck} tone="primary" />
          <KpiStat label="Total Purchased" value={formatCurrency(totalPurchased, locale)} icon={Wallet} tone="default" />
          <KpiStat label="Total Outstanding" value={formatCurrency(totalOutstanding, locale)} icon={Wallet} tone={totalOutstanding > 0 ? "warning" : "success"} />
          <KpiStat label="With Outstanding" value={String(withOutstanding)} tone="accent" />
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border-default bg-surface-card p-3">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              placeholder="Search by name or phone…"
              className="h-8 ps-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search suppliers"
            />
          </div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger size="sm" className="w-40" aria-label="Filter by category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c === "All" ? "All categories" : c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Body */}
        {loading && <LoadingState pattern="table" rows={5} />}
        {!loading && filtered.length === 0 && (
          <EmptyState
            illustration="inventory"
            title="No suppliers found"
            description={search || catFilter !== "All" ? "Adjust your filters to see more suppliers." : "Add your first supplier to get started."}
          />
        )}
        {!loading && filtered.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border-default bg-surface-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50">
                  <TableHead className="px-4">Name</TableHead>
                  <TableHead className="px-4">Phone</TableHead>
                  <TableHead className="px-4">Category</TableHead>
                  <TableHead className="px-4 text-end">Total Purchased</TableHead>
                  <TableHead className="px-4 text-end">Total Paid</TableHead>
                  <TableHead className="px-4 text-end">Outstanding</TableHead>
                  <TableHead className="px-4 text-end">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => {
                  const outstanding = s.totalPurchased - s.totalPaid;
                  return (
                    <TableRow
                      key={s.id}
                      className="cursor-pointer"
                      onClick={() => setSelected(s)}
                    >
                      <TableCell className="px-4 py-3">
                        <p className="text-body font-medium text-text-primary">{s.name}</p>
                        <p className="text-caption text-text-muted" lang="bn">{s.nameBn}</p>
                      </TableCell>
                      <TableCell className="px-4 py-3 font-mono text-caption text-text-secondary">
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-text-muted" />
                          {s.phone}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-body text-text-secondary">{s.category}</TableCell>
                      <TableCell className="px-4 py-3 text-end font-mono text-body text-text-primary">
                        {formatCurrency(s.totalPurchased, locale)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-end font-mono text-body text-semantic-success">
                        {formatCurrency(s.totalPaid, locale)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-end font-mono text-body">
                        {outstanding > 0 ? (
                          <Badge variant="outline" className="border-semantic-warning/40 bg-warning-50 text-semantic-warning">
                            {formatCurrency(outstanding, locale)}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-semantic-success/40 bg-success-50 text-semantic-success">
                            Settled
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-end">
                        <Button size="sm" variant="ghost" aria-label={`View ${s.name} history`}>
                          <ArrowRight className="h-4 w-4 text-primary-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <p className="text-caption text-text-muted">
            Click any row to view purchase history.
          </p>
        )}
      </div>

      {/* Detail drawer */}
      <Drawer open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-2xl">
            <DrawerHeader>
              <DrawerTitle className="text-subtitle">
                {selected?.name}
                {selected?.nameBn && (
                  <span className="ms-2 text-caption text-text-muted" lang="bn">{selected.nameBn}</span>
                )}
              </DrawerTitle>
              <DrawerDescription>
                {selected?.category} · {selected?.phone} · {selected?.email}
              </DrawerDescription>
            </DrawerHeader>
            <div className="space-y-4 p-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border-default p-3">
                  <p className="text-caption uppercase tracking-wider text-text-muted">Total Purchased</p>
                  <p className="mt-1 font-mono text-body font-bold text-text-primary">
                    {selected && formatCurrency(selected.totalPurchased, locale)}
                  </p>
                </div>
                <div className="rounded-lg border border-border-default p-3">
                  <p className="text-caption uppercase tracking-wider text-text-muted">Total Paid</p>
                  <p className="mt-1 font-mono text-body font-bold text-semantic-success">
                    {selected && formatCurrency(selected.totalPaid, locale)}
                  </p>
                </div>
                <div className="rounded-lg border border-border-default p-3">
                  <p className="text-caption uppercase tracking-wider text-text-muted">Outstanding</p>
                  <p className="mt-1 font-mono text-body font-bold text-semantic-warning">
                    {selected && formatCurrency(selected.totalPurchased - selected.totalPaid, locale)}
                  </p>
                </div>
              </div>
              {/* History */}
              <div>
                <h4 className="mb-2 text-subtitle font-semibold text-text-primary">Purchase History</h4>
                {selected && selected.history.length > 0 ? (
                  <ul className="divide-y divide-border-default rounded-lg border border-border-default">
                    {selected.history.map((h) => (
                      <li key={h.poNumber} className="flex items-center justify-between px-3 py-2">
                        <div>
                          <p className="font-mono text-caption text-text-secondary">{h.poNumber}</p>
                          <p className="text-caption text-text-muted">{formatDate(new Date(h.date), locale)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-body text-text-primary">{formatCurrency(h.amount, locale)}</span>
                          <Badge variant="outline" className={h.paid
                            ? "border-semantic-success/40 bg-success-50 text-semantic-success"
                            : "border-semantic-warning/40 bg-warning-50 text-semantic-warning"}>
                            {h.paid ? "Paid" : "Pending"}
                          </Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-body text-text-secondary">No purchase history yet.</p>
                )}
              </div>
            </div>
            <DrawerFooter>
              <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Add Supplier dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-subtitle">
              <Truck className="h-5 w-5 text-primary-500" />
              Add Supplier
            </DialogTitle>
            <DialogDescription>
              Register a new supplier (mock — not persisted).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="sup-name" className="mb-1.5 block text-subtitle">Name</Label>
              <Input id="sup-name" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="Supplier name" />
            </div>
            <div>
              <Label htmlFor="sup-phone" className="mb-1.5 block text-subtitle">Phone</Label>
              <Input id="sup-phone" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} placeholder="+8801XXXXXXXXX" />
            </div>
            <div>
              <Label htmlFor="sup-cat" className="mb-1.5 block text-subtitle">Category</Label>
              <Select value={addForm.category} onValueChange={(v) => setAddForm({ ...addForm, category: v })}>
                <SelectTrigger id="sup-cat" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Stationery", "Food", "Sports", "Library", "Cleaning", "Medical"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!addForm.name.trim() || !addForm.phone.trim()}>Add Supplier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
