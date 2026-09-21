"use client";

/**
 * MadrashaOS — Purchase Kanban (C4.2 — Operations · Purchase Pipeline)
 *
 * 5-column board with drag-drop (per SRS §2.5.2 Purchase Orders):
 *   Draft → Pending Approval → Approved → Received → Paid
 *
 *   - 6 mock purchase orders distributed across the columns (inline array)
 *   - Drag-drop via @dnd-kit/core
 *   - Drag-to-Approved gated by IfPermission code="purchase.approve"
 *     (cards drop into the Approved column but show a toast + revert if
 *     the user lacks the permission — defence-in-depth per SRS §5.1)
 *   - Drag-to-Received → toast "Stock received — inventory updated"
 *   - Drag-to-Paid → toast "Payment posted — ledger updated"
 *   - "New Purchase" button (perm: purchase.create) opens dialog
 */

import * as React from "react";
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, PointerSensorOptions,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  ShoppingCart, Plus, GripVertical, CheckCircle2, Wallet,
  PackageCheck, Clock, FileEdit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { IfPermission } from "@/components/auth/IfPermission";
import {
  PermissionDenied, LoadingState,
} from "@/components/states";
import { KpiStat } from "@/components/operations/KpiStat";
import { useSessionStore } from "@/stores/sessionStore";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatCurrency, formatDate } from "@/lib/i18n/format";
import { useToast } from "@/hooks/use-toast";

/* --- Inline mock data --- */

type PurchaseStatus = "draft" | "pending_approval" | "approved" | "received" | "paid";

type PurchaseOrder = {
  id: string;
  title: string;
  supplier: string;
  amount: number;
  date: string; // ISO date
  status: PurchaseStatus;
};

const COLUMN_DEFS: { id: PurchaseStatus; label: string; icon: React.ComponentType<{ className?: string }>; tone: string }[] = [
  { id: "draft", label: "Draft", icon: FileEdit, tone: "border-l-neutral-400" },
  { id: "pending_approval", label: "Pending Approval", icon: Clock, tone: "border-l-semantic-warning" },
  { id: "approved", label: "Approved", icon: CheckCircle2, tone: "border-l-primary-500" },
  { id: "received", label: "Received", icon: PackageCheck, tone: "border-l-semantic-info" },
  { id: "paid", label: "Paid", icon: Wallet, tone: "border-l-semantic-success" },
];

const INITIAL_ORDERS: PurchaseOrder[] = [
  { id: "po-1", title: "Stationery — Q4 stock", supplier: "ABC Stationery", amount: 22000, date: "2026-09-12", status: "draft" },
  { id: "po-2", title: "Sports equipment", supplier: "Sports World Ltd.", amount: 15000, date: "2026-09-10", status: "draft" },
  { id: "po-3", title: "Library books (Arabic)", supplier: "Darul Kutub", amount: 8500, date: "2026-09-13", status: "pending_approval" },
  { id: "po-4", title: "Lab equipment — beakers", supplier: "LabHouse BD", amount: 12500, date: "2026-09-14", status: "pending_approval" },
  { id: "po-5", title: "Cleaning supplies", supplier: "CleanCo", amount: 4800, date: "2026-09-08", status: "approved" },
  { id: "po-6", title: "First-aid restock", supplier: "MediSource", amount: 3500, date: "2026-09-09", status: "received" },
  { id: "po-7", title: "Office chairs (10)", supplier: "FurniturePlus", amount: 28000, date: "2026-09-05", status: "paid" },
  { id: "po-8", title: "Rice — September", supplier: "Agro Foods", amount: 62000, date: "2026-09-04", status: "paid" },
];

/* --- Draggable card --- */

function PurchaseCard({ order }: { order: PurchaseOrder }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id,
    data: { status: order.status },
  });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="group cursor-grab rounded-lg border border-border-default bg-surface-card p-3 shadow-elevation-1 transition-shadow hover:shadow-elevation-2 active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-body font-medium text-text-primary">{order.title}</p>
        <GripVertical className="h-4 w-4 shrink-0 text-text-muted opacity-0 group-hover:opacity-100" aria-hidden />
      </div>
      <p className="mt-1 text-caption text-text-secondary">{order.supplier}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="font-mono text-body font-semibold text-text-primary">
          {formatCurrency(order.amount, "en")}
        </span>
        <span className="text-caption text-text-muted">
          {formatDate(new Date(order.date), "en")}
        </span>
      </div>
    </div>
  );
}

/* --- Droppable column --- */

function KanbanColumn({
  column, orders, canApprove,
}: {
  column: typeof COLUMN_DEFS[number];
  orders: PurchaseOrder[];
  canApprove: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const ColumnIcon = column.icon;
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-64 flex-col rounded-lg border border-border-default border-l-4 ${column.tone} bg-surface-card transition-colors ${isOver ? "bg-primary-50/50" : ""}`}
    >
      <div className="flex items-center justify-between border-b border-border-default px-3 py-2">
        <div className="flex items-center gap-1.5">
          <ColumnIcon className="h-4 w-4 text-text-secondary" />
          <h3 className="text-subtitle font-semibold text-text-primary">{column.label}</h3>
        </div>
        <Badge variant="outline" className="font-mono">{orders.length}</Badge>
      </div>
      <div className="flex-1 space-y-2 p-2">
        {orders.length === 0 && (
          <p className="px-2 py-6 text-center text-caption text-text-muted">Drop here</p>
        )}
        {orders.map((o) => (
          <PurchaseCard key={o.id} order={o} />
        ))}
      </div>
      {column.id === "approved" && !canApprove && (
        <p className="px-3 py-2 text-caption text-semantic-warning border-t border-border-default">
          Approval requires <code className="font-mono">purchase.approve</code>
        </p>
      )}
    </div>
  );
}

/* --- Main page --- */

export default function PurchasePage() {
  const { locale } = useI18n();
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const canView = hasPermission("purchase.view");
  const canApprove = hasPermission("purchase.approve");
  const { toast } = useToast();

  // PointerSensor with activation constraint so click vs. drag distinguishable.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } } as PointerSensorOptions),
  );

  const [orders, setOrders] = React.useState<PurchaseOrder[]>(INITIAL_ORDERS);
  const [newOpen, setNewOpen] = React.useState(false);
  const [draft, setDraft] = React.useState({ title: "", supplier: "", amount: 0 });

  // Mock loading: Kanban is local-state so we simulate a brief loading flash.
  const [loading] = React.useState(false);

  if (!canView) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <PermissionDenied resource="Purchase Pipeline" />
        </div>
      </div>
    );
  }

  const ordersByStatus = (status: PurchaseStatus) =>
    orders.filter((o) => o.status === status);

  const totalValue = orders.reduce((s, o) => s + o.amount, 0);
  const draftCount = ordersByStatus("draft").length;
  const pendingCount = ordersByStatus("pending_approval").length;
  const paidTotal = ordersByStatus("paid").reduce((s, o) => s + o.amount, 0);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const newStatus = over.id as PurchaseStatus;
    const activeId = String(active.id);
    const order = orders.find((o) => o.id === activeId);
    if (!order || order.status === newStatus) return;

    // Permission gate on Approved column (defence-in-depth — server also enforces).
    if (newStatus === "approved" && !canApprove) {
      toast({
        title: "Approval permission required",
        description: "You don't have permission to approve purchases. The card stays in its current column.",
        variant: "destructive",
      });
      return;
    }

    setOrders((prev) => prev.map((o) => (o.id === activeId ? { ...o, status: newStatus } : o)));

    if (newStatus === "received") {
      toast({
        title: "Stock received — inventory updated",
        description: `${order.title} marked received. Stock ledger updated (mock).`,
      });
    } else if (newStatus === "paid") {
      toast({
        title: "Payment posted — ledger updated",
        description: `${order.title} marked paid. JV posted to Operating Expenses (mock).`,
      });
    } else {
      toast({
        title: "Purchase moved",
        description: `${order.title} → ${COLUMN_DEFS.find((c) => c.id === newStatus)?.label}`,
      });
    }
  };

  const handleCreate = () => {
    if (!draft.title.trim() || !draft.supplier.trim() || draft.amount <= 0) return;
    const newOrder: PurchaseOrder = {
      id: `po-${Date.now()}`,
      title: draft.title.trim(),
      supplier: draft.supplier.trim(),
      amount: draft.amount,
      date: new Date().toISOString().slice(0, 10),
      status: "draft",
    };
    setOrders((prev) => [newOrder, ...prev]);
    setDraft({ title: "", supplier: "", amount: 0 });
    setNewOpen(false);
    toast({ title: "Purchase order drafted", description: `${newOrder.title} added to Draft column.` });
  };

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-display font-bold text-text-primary">Purchase Pipeline</h1>
            <p className="mt-1 text-body text-text-secondary">
              Drag orders through Draft → Pending Approval → Approved → Received → Paid (SRS §2.5.2).
            </p>
          </div>
          <IfPermission code="purchase.create">
            <Button onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" />
              New Purchase
            </Button>
          </IfPermission>
        </header>

        {/* KPI strip */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiStat label="Open Orders" value={String(orders.length)} icon={ShoppingCart} tone="primary" />
          <KpiStat label="Drafts" value={String(draftCount)} icon={FileEdit} tone="default" />
          <KpiStat label="Pending Approval" value={String(pendingCount)} icon={Clock} tone="warning" />
          <KpiStat label="Total Paid (Lifetime)" value={formatCurrency(paidTotal, locale)} icon={Wallet} tone="success" />
        </div>

        {loading ? (
          <LoadingState pattern="dashboard" />
        ) : (
          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <div className="grid gap-3 lg:grid-cols-5">
              {COLUMN_DEFS.map((col) => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  orders={ordersByStatus(col.id)}
                  canApprove={canApprove}
                />
              ))}
            </div>
          </DndContext>
        )}

        <p className="text-caption text-text-muted">
          Total pipeline value: <span className="font-mono">{formatCurrency(totalValue, locale)}</span> ·
          Cards drag across columns. Approved column requires the <code className="font-mono">purchase.approve</code> permission.
        </p>
      </div>

      {/* New Purchase dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-subtitle">
              <ShoppingCart className="h-5 w-5 text-primary-500" />
              New Purchase Order
            </DialogTitle>
            <DialogDescription>
              Creates a draft order in the Draft column. Submit it for approval to advance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="po-title" className="mb-1.5 block text-subtitle">Title</Label>
              <Input id="po-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. Stationery — Q4 stock" />
            </div>
            <div>
              <Label htmlFor="po-sup" className="mb-1.5 block text-subtitle">Supplier</Label>
              <Input id="po-sup" value={draft.supplier} onChange={(e) => setDraft({ ...draft, supplier: e.target.value })} placeholder="e.g. ABC Stationery" />
            </div>
            <div>
              <Label htmlFor="po-amt" className="mb-1.5 block text-subtitle">Amount (BDT)</Label>
              <Input id="po-amt" type="number" min={1} value={draft.amount || ""} onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!draft.title.trim() || !draft.supplier.trim() || draft.amount <= 0}>
              Create Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
