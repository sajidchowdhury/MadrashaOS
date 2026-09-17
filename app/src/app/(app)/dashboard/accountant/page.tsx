"use client";

/**
 * MadrashaOS — Accountant Dashboard (Session 2.2)
 *
 * For: Madrasha Accountant (SRS §8.1)
 * Widgets: Collect Fee quick action + Outstanding Fees + Recent Receipts +
 *          Pending Approvals + Audit Timeline
 */

import { Wallet, Receipt, Calculator, Bell } from "lucide-react";
import { useFeePlans, useFeePayments, useAccounts, useLedgerEntries, usePendingApprovals } from "@/lib/query/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatCurrency } from "@/lib/i18n/format";
import {
  KpiCard, OutstandingFeesWidget, RecentReceiptsWidget,
  PendingApprovalsWidget, QuickActionsWidget, AuditTimelineWidget,
} from "@/components/widgets";
import { Plus, Wallet as WalletIcon } from "lucide-react";

export default function AccountantDashboard() {
  const { locale } = useI18n();
  const { data: feePlans } = useFeePlans();
  const { data: payments } = useFeePayments();
  const { data: accounts } = useAccounts();
  const { data: ledger } = useLedgerEntries();
  const { data: approvals } = usePendingApprovals();

  const todayReceipts = payments?.filter((p) => p.collectedAt === "2026-09-16").length ?? 0;
  const totalBalance = accounts?.filter((a) => a.type === "asset").reduce((s, a) => s + a.balance, 0) ?? 0;
  const pendingCount = approvals?.length ?? 0;

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header>
          <h1 className="text-display font-bold text-text-primary">Accountant Dashboard</h1>
          <p className="mt-1 text-body text-text-secondary">Fee collection · ledger posting · reconciliations.</p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Receipts Today" value={String(todayReceipts)} icon={Receipt} tone="success" />
          <KpiCard label="Outstanding Fees" value={formatCurrency(feePlans?.flatMap((p) => p.installments).filter((i) => !i.paid).reduce((s, i) => s + i.amount, 0) ?? 0, locale)} icon={Wallet} tone="warning" />
          <KpiCard label="Cash + Bank" value={formatCurrency(totalBalance, locale)} icon={Calculator} tone="primary" />
          <KpiCard label="Pending Approvals" value={String(pendingCount)} icon={Bell} tone={pendingCount > 0 ? "warning" : "success"} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <QuickActionsWidget
            actions={[
              { label: "Collect Fee", icon: WalletIcon, permission: "fees.payment.create" },
              { label: "Post Entry", icon: Calculator, permission: "accounting.ledger.post" },
              { label: "Record Expense", icon: Plus, permission: "accounting.ledger.post" },
              { label: "Receive Zakat", icon: WalletIcon, permission: "zakat.receive" },
            ]}
          />
          <OutstandingFeesWidget />
          <RecentReceiptsWidget />
          <PendingApprovalsWidget />
        </div>
      </div>
    </div>
  );
}
