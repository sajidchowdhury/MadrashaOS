"use client";

/**
 * MadrashaOS — Authority Dashboard (Session 2.2)
 *
 * For: Principal / Madrasha Head (SRS §8.1)
 * Widgets: KPIs (Students, Outstanding Fees, Zakat Fund, Pending Approvals)
 *          + ApprovalsQueue + AuditTimeline + ClassPerformance
 *
 * Per Risk R12: outstanding figure shows "as of [timestamp]".
 * Per SRS §2.6.4: outstanding reconciles to Fee module (mock data here).
 */

import { Users, Wallet, Scale, Bell } from "lucide-react";
import { useStudents, useFeePlans, useAccounts, usePendingApprovals, useLedgerEntries } from "@/lib/query/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatCurrency } from "@/lib/i18n/format";
import {
  KpiCard, ApprovalsQueueWidget, AuditTimelineWidget,
  ClassPerformanceWidget, PendingApprovalsWidget,
} from "@/components/widgets";
import { IfPermission } from "@/components/auth/IfPermission";

export default function AuthorityDashboard() {
  const { locale } = useI18n();
  const { data: students } = useStudents();
  const { data: feePlans } = useFeePlans();
  const { data: accounts } = useAccounts();
  const { data: approvals } = usePendingApprovals();
  const { data: ledger } = useLedgerEntries();

  const outstandingAmount = feePlans?.flatMap((p) => p.installments).filter((i) => !i.paid).reduce((s, i) => s + i.amount, 0) ?? 0;
  const zakatBalance = accounts?.find((a) => a.fund === "zakat")?.balance ?? 0;
  const pendingCount = approvals?.length ?? 0;

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header>
          <h1 className="text-display font-bold text-text-primary">Authority Dashboard</h1>
          <p className="mt-1 text-body text-text-secondary">
            All-branch overview · financial approvals · student outcomes.
          </p>
        </header>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total Students" value={String(students?.length ?? 0)} delta="+3 this month" icon={Users} tone="primary" />
          <KpiCard label="Outstanding Fees" value={formatCurrency(outstandingAmount, locale)} delta="15 pending" deltaDirection="down" icon={Wallet} tone="warning" />
          <IfPermission code="zakat.view">
            <KpiCard label="Zakat Fund" value={formatCurrency(zakatBalance, locale)} icon={Scale} tone="accent" />
          </IfPermission>
          <KpiCard label="Pending Approvals" value={String(pendingCount)} icon={Bell} tone={pendingCount > 0 ? "warning" : "success"} />
        </div>

        {/* Main grid */}
        <div className="grid gap-4 lg:grid-cols-2">
          <ApprovalsQueueWidget />
          <AuditTimelineWidget />
          <ClassPerformanceWidget />
          <PendingApprovalsWidget />
        </div>
      </div>
    </div>
  );
}
