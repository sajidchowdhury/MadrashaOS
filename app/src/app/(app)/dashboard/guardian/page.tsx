"use client";

/**
 * MadrashaOS — Guardian Dashboard (Session 2.2)
 *
 * For: Parent (SRS §8.1)
 * Mobile-first (SRS §5.4). Read-only on own linked children.
 * Risk R5: child-switcher segmented control at top (mocked — single child shown).
 */

import { GraduationCap, Wallet, Bell, ClipboardCheck } from "lucide-react";
import { useStudents, useFeePlans, useNotices } from "@/lib/query/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatCurrency } from "@/lib/i18n/format";
import { KpiCard, GuardianChildrenWidget } from "@/components/widgets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/i18n/format";

export default function GuardianDashboard() {
  const { locale } = useI18n();
  const { data: students } = useStudents();
  const { data: feePlans } = useFeePlans();
  const { data: notices } = useNotices();

  // Mock: guardian sees their first 2 children
  const myChildren = students?.slice(0, 2) ?? [];
  const childIds = new Set(myChildren.map((c) => c.id));
  const myFeePlans = feePlans?.filter((p) => childIds.has(p.studentId)) ?? [];
  const outstandingAmount = myFeePlans.flatMap((p) => p.installments).filter((i) => !i.paid).reduce((s, i) => s + i.amount, 0);
  const recentNotices = notices?.slice(0, 3) ?? [];

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-display font-bold text-text-primary">Guardian Portal</h1>
            <p className="mt-1 text-body text-text-secondary">Your children · fees · notices.</p>
          </div>
          {myChildren.length > 1 && (
            <select className="rounded-md border border-border-strong bg-surface-card px-3 py-2 text-subtitle text-text-primary">
              {myChildren.map((c) => (
                <option key={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard label="My Children" value={String(myChildren.length)} icon={GraduationCap} tone="primary" />
          <KpiCard label="Outstanding Fees" value={formatCurrency(outstandingAmount, locale)} icon={Wallet} tone="warning" />
          <KpiCard label="Notices" value={String(notices?.length ?? 0)} icon={Bell} tone="primary" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <GuardianChildrenWidget />
          <Card>
            <CardHeader>
              <CardTitle className="text-subtitle">Recent Notices</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {recentNotices.map((n) => (
                  <li key={n.id} className="rounded-md border border-border-default p-3">
                    <p className="text-body font-medium text-text-primary">{n.title}</p>
                    <p className="text-caption text-text-muted">{formatDate(new Date(n.sentAt), locale)}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
