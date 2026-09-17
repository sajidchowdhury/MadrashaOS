"use client";

/**
 * MadrashaOS — Storekeeper Dashboard (Session 2.2)
 *
 * For: Inventory Staff (SRS §8.1)
 * Widgets: Low-stock alerts + Receive stock CTA + Inventory KPIs
 */

import { Package, ShoppingCart, AlertTriangle, Bell } from "lucide-react";
import { useInventory, usePendingApprovals } from "@/lib/query/client";
import {
  KpiCard, LowStockAlertWidget, QuickActionsWidget,
} from "@/components/widgets";
import { Package as ReceiveIcon, ShoppingCart as PurchaseIcon } from "lucide-react";

export default function StorekeeperDashboard() {
  const { data: inventory } = useInventory();
  const { data: approvals } = usePendingApprovals();

  const totalItems = inventory?.length ?? 0;
  const lowStockCount = inventory?.filter((i) => i.qtyInStock <= i.reorderLevel).length ?? 0;

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header>
          <h1 className="text-display font-bold text-text-primary">Storekeeper Dashboard</h1>
          <p className="mt-1 text-body text-text-secondary">Inventory · purchases · low-stock alerts.</p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total Items" value={String(totalItems)} icon={Package} tone="primary" />
          <KpiCard label="Low Stock" value={String(lowStockCount)} delta="needs reorder" deltaDirection="down" icon={AlertTriangle} tone={lowStockCount > 0 ? "danger" : "success"} />
          <KpiCard label="Pending Purchases" value="0" icon={ShoppingCart} tone="primary" />
          <KpiCard label="Notices" value={String(approvals?.length ?? 0)} icon={Bell} tone="primary" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <QuickActionsWidget
            actions={[
              { label: "Receive Stock", icon: ReceiveIcon, permission: "inventory.receive" },
              { label: "Issue Stock", icon: ReceiveIcon, permission: "inventory.issue" },
              { label: "New Purchase", icon: PurchaseIcon, permission: "purchase.create" },
            ]}
          />
          <LowStockAlertWidget />
        </div>
      </div>
    </div>
  );
}
