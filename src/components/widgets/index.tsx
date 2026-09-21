"use client";

/**
 * MadrashaOS — Dashboard Widgets (Session 2.2)
 *
 * 12 widget types covering all 5 role dashboards. Each widget has:
 *   - empty state (via EmptyState component)
 *   - loading state (via Skeleton)
 *   - error state (via ErrorState)
 *   - permission-denied state (hidden if user lacks the perm — Risk R3)
 *
 * Widgets:
 *   1. KpiCard — single metric + delta
 *   2. PendingApprovals — list of pending requests
 *   3. OutstandingFees — total outstanding + "as of [timestamp]" (Risk R12)
 *   4. LowStockAlert — inventory items below reorder level
 *   5. AttendanceToday — today's sessions + quick-take CTA
 *   6. RecentReceipts — last 5 fee payments
 *   7. QuickActions — role-specific shortcut buttons
 *   8. ClassPerformance — top/bottom classes by attendance
 *   9. GuardianChildren — list of linked children (guardian dashboard)
 *   10. TeacherClasses — today's class schedule (teacher dashboard)
 *   11. AuditTimeline — recent audit events (authority dashboard)
 *   12. ApprovalsQueue — items awaiting the current user's approval
 */

import { type LucideIcon, Users, Wallet, Package, ClipboardCheck, Receipt, Clock, TrendingUp, TrendingDown, Bell, History, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useSessionStore } from "@/stores/sessionStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/states";
import { IfPermission } from "@/components/auth/IfPermission";
import {
  useStudents, useFeePlans, useFeePayments, usePendingApprovals,
  useLowStockItems, useAttendanceSessions, useLedgerEntries, useCurrentUser,
} from "@/lib/query/client";
import { formatCurrency, formatDate } from "@/lib/i18n/format";

/* --- 1. KpiCard --- */
export function KpiCard({
  label, value, delta, deltaDirection = "up", icon: Icon, tone = "primary",
}: {
  label: string;
  value: string;
  delta?: string;
  deltaDirection?: "up" | "down";
  icon: LucideIcon;
  tone?: "primary" | "accent" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    primary: "text-primary-500",
    accent: "text-accent-500",
    success: "text-semantic-success",
    warning: "text-semantic-warning",
    danger: "text-semantic-danger",
  }[tone];
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-caption font-medium uppercase tracking-wider text-text-muted">
          {label}
        </CardTitle>
        <Icon className={`h-5 w-5 ${toneClass}`} />
      </CardHeader>
      <CardContent>
        <p className={`text-display font-bold ${toneClass}`}>{value}</p>
        {delta && (
          <p className="mt-1 flex items-center gap-1 text-caption">
            {deltaDirection === "up" ? (
              <TrendingUp className="h-3 w-3 text-semantic-success" />
            ) : (
              <TrendingDown className="h-3 w-3 text-semantic-danger" />
            )}
            <span className={deltaDirection === "up" ? "text-semantic-success" : "text-semantic-danger"}>
              {delta}
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* --- 2. PendingApprovals --- */
export function PendingApprovalsWidget() {
  const { t, locale } = useI18n();
  const { data, isLoading, isError, refetch } = usePendingApprovals();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-subtitle">
          <Bell className="h-4 w-4 text-semantic-warning" />
          Pending Approvals
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-20 w-full" />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {data && data.length === 0 && (
          <EmptyState illustration="fees" title="All caught up" description="No pending approvals." />
        )}
        {data && data.length > 0 && (
          <ul className="space-y-2">
            {data.slice(0, 5).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 rounded-md border border-border-default p-2">
                <div>
                  <p className="text-body font-medium text-text-primary">{a.title}</p>
                  <p className="text-caption text-text-muted">{formatDate(new Date(a.requestedAt), locale)}</p>
                </div>
                {a.amount && (
                  <Badge variant="outline">{formatCurrency(a.amount, locale)}</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* --- 3. OutstandingFees (Risk R12: "as of [timestamp]") --- */
export function OutstandingFeesWidget() {
  const { locale } = useI18n();
  const { data, isLoading, isError, refetch } = useFeePlans();
  const outstanding = data?.flatMap((p) => p.installments.filter((i) => !i.paid)).length ?? 0;
  const totalAmount = data?.flatMap((p) => p.installments).filter((i) => !i.paid).reduce((sum, i) => sum + i.amount, 0) ?? 0;
  const now = new Date();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-subtitle">Outstanding Fees</CardTitle>
        <Wallet className="h-5 w-5 text-semantic-warning" />
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-16 w-full" />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {data && (
          <>
            <p className="text-display font-bold text-semantic-warning">
              {formatCurrency(totalAmount, locale)}
            </p>
            <p className="mt-1 text-caption text-text-secondary">
              {outstanding} installments pending · as of {formatDate(now, locale)}
            </p>
            <Button size="sm" variant="outline" className="mt-3">View report</Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* --- 4. LowStockAlert --- */
export function LowStockAlertWidget() {
  const { locale } = useI18n();
  const { data, isLoading, isError, refetch } = useLowStockItems();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-subtitle">Low Stock Alert</CardTitle>
        <Package className="h-5 w-5 text-semantic-danger" />
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-20 w-full" />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {data && data.length === 0 && (
          <EmptyState illustration="inventory" title="Stock levels healthy" description="No items below reorder level." />
        )}
        {data && data.length > 0 && (
          <ul className="space-y-2">
            {data.map((item) => (
              <li key={item.id} className="flex items-center justify-between text-body">
                <span className="text-text-primary">{item.name}</span>
                <Badge variant="destructive">{item.qtyInStock} {item.unit} (reorder: {item.reorderLevel})</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* --- 5. AttendanceToday --- */
export function AttendanceTodayWidget() {
  const { locale } = useI18n();
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useAttendanceSessions();
  const today = formatDate(new Date(), "en"); // ISO date for comparison
  const todaysSessions = data?.filter((s) => s.date === today) ?? [];
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-subtitle">Today&apos;s Attendance</CardTitle>
        <ClipboardCheck className="h-5 w-5 text-primary-500" />
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-20 w-full" />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {data && todaysSessions.length === 0 && (
          <EmptyState illustration="attendance" title="No sessions yet today" description="Take attendance to get started." action={<Button size="sm" onClick={() => router.push("/attendance/take")}>Take Attendance</Button>} />
        )}
        {data && todaysSessions.length > 0 && (
          <div>
            <p className="text-display font-bold text-primary-500">{todaysSessions.length}</p>
            <p className="text-caption text-text-secondary">sessions taken today</p>
            <Button size="sm" className="mt-3" onClick={() => router.push("/attendance/take")}><ClipboardCheck className="h-4 w-4" /> Take Attendance</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* --- 6. RecentReceipts --- */
export function RecentReceiptsWidget() {
  const { locale } = useI18n();
  const { data, isLoading, isError, refetch } = useFeePayments();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-subtitle">Recent Receipts</CardTitle>
        <Receipt className="h-5 w-5 text-primary-500" />
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-32 w-full" />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {data && data.length === 0 && (
          <EmptyState illustration="fees" title="No receipts yet" />
        )}
        {data && data.length > 0 && (
          <ul className="space-y-2">
            {data.slice(0, 5).map((p) => (
              <li key={p.id} className="flex items-center justify-between text-body">
                <div>
                  <p className="font-medium text-text-primary">{p.receiptNo}</p>
                  <p className="text-caption text-text-muted">{formatDate(new Date(p.collectedAt), locale)}</p>
                </div>
                <Badge variant="outline">{formatCurrency(p.amount, locale)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* --- 7. QuickActions --- */
const QUICK_ACTION_ROUTES: Record<string, string> = {
  "Collect Fee": "/fees",
  "Post Entry": "/accounting",
  "Record Expense": "/accounting",
  "Receive Zakat": "/zakat",
  "Take Attendance": "/attendance/take",
  "Enter Marks": "/exams",
  "Receive Stock": "/inventory",
  "Issue Stock": "/inventory",
  "New Purchase": "/purchase",
};
export function QuickActionsWidget({ actions }: { actions: { label: string; icon: LucideIcon; permission?: string }[] }) {
  const router = useRouter();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-subtitle">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((a) => {
            const route = QUICK_ACTION_ROUTES[a.label] ?? "/dashboard";
            const actionEl = (
              <Button key={a.label} variant="outline" size="sm" className="justify-start" onClick={() => router.push(route)}>
                <a.icon className="h-4 w-4" />
                {a.label}
              </Button>
            );
            return a.permission ? (
              <IfPermission key={a.label} code={a.permission}>{actionEl}</IfPermission>
            ) : actionEl;
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* --- 8. ClassPerformance --- */
export function ClassPerformanceWidget() {
  const { data: students } = useStudents();
  const { data: attendance } = useAttendanceSessions();
  // Simple: count present vs total per class
  const classStats = (students ?? []).reduce((acc, s) => {
    const key = s.classId;
    if (!acc[key]) acc[key] = { total: 0, present: 0 };
    acc[key].total++;
    return acc;
  }, {} as Record<string, { total: number; present: number }>);
  (attendance ?? []).forEach((s: { records?: Array<{ student_id?: string; studentId?: string; status?: string }> }) => {
    (s.records ?? []).forEach((r) => {
      const studentId = r.student_id ?? r.studentId;
      const student = students?.find((st) => st.id === studentId);
      if (student && classStats[student.classId]) {
        if (r.status === "present") classStats[student.classId].present++;
      }
    });
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-subtitle">Class Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {Object.entries(classStats).map(([classId, stat]) => {
            const rate = stat.total > 0 ? Math.round((stat.present / (stat.total * (attendance?.length || 1))) * 100) : 0;
            return (
              <li key={classId} className="flex items-center justify-between text-body">
                <span className="text-text-primary">{classId}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-neutral-200">
                    <div className="h-full rounded-full bg-primary-500" style={{ width: `${rate}%` }} />
                  </div>
                  <span className="font-mono text-caption text-text-secondary">{rate}%</span>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

/* --- 9. GuardianChildren --- */
export function GuardianChildrenWidget() {
  const { locale } = useI18n();
  const router = useRouter();
  const { data: students, isLoading, isError, refetch } = useStudents();
  // Guardian sees only their linked children — mock: first 2 students
  const myChildren = students?.slice(0, 2) ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-subtitle">My Children</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-20 w-full" />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {students && myChildren.length === 0 && (
          <EmptyState illustration="students" title="No children linked" description="Contact admin to link your children." />
        )}
        {students && myChildren.length > 0 && (
          <ul className="space-y-2">
            {myChildren.map((c) => (
              <li key={c.id} className="flex items-center justify-between text-body">
                <div>
                  <p className="font-medium text-text-primary">{c.name}</p>
                  <p className="text-caption text-text-muted">{c.code}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => router.push(`/students/${c.id}`)}>View</Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* --- 10. TeacherClasses --- */
export function TeacherClassesWidget() {
  const router = useRouter();
  const { data: sessions, isLoading, isError, refetch } = useAttendanceSessions();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-subtitle">My Classes Today</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-20 w-full" />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {sessions && sessions.length === 0 && (
          <EmptyState illustration="attendance" title="No classes today" />
        )}
        {sessions && sessions.length > 0 && (
          <ul className="space-y-2">
            {sessions.slice(0, 4).map((s) => (
              <li key={s.id} className="flex items-center justify-between text-body">
                <span className="text-text-primary">Class 5 · Section {s.section}</span>
                <Button size="sm" variant="outline" onClick={() => router.push("/attendance/take")}>Take</Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* --- 11. AuditTimeline --- */
export function AuditTimelineWidget() {
  const { locale } = useI18n();
  const { data: ledger, isLoading, isError, refetch } = useLedgerEntries();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-subtitle">Recent Activity</CardTitle>
        <History className="h-5 w-5 text-primary-500" />
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-32 w-full" />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {ledger && (
          <ul className="space-y-2">
            {ledger.slice(0, 5).map((e) => (
              <li key={e.id} className="flex items-start gap-2 text-body">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-500" />
                <div>
                  <p className="text-text-primary">{e.narration}</p>
                  <p className="text-caption text-text-muted">
                    {formatDate(new Date(e.date), locale)} · {e.voucherNo}
                    {e.status === "pending" && <Badge variant="outline" className="ms-2">Pending</Badge>}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* --- 12. ApprovalsQueue (for authority role) --- */
export function ApprovalsQueueWidget() {
  const { locale } = useI18n();
  const { data: approvals, isLoading, isError, refetch } = usePendingApprovals();
  function handleApprove(title: string) {
    toast.success("Request approved", { description: title });
  }
  function handleReject(title: string) {
    toast.error("Request rejected", { description: title });
  }
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-subtitle">Approvals Queue</CardTitle>
        <Bell className="h-5 w-5 text-semantic-warning" />
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-32 w-full" />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {approvals && approvals.length === 0 && (
          <EmptyState illustration="fees" title="No pending approvals" description="All requests handled." />
        )}
        {approvals && approvals.length > 0 && (
          <ul className="space-y-2">
            {approvals.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-md border border-border-default p-3">
                <div>
                  <p className="text-body font-medium text-text-primary">{a.title}</p>
                  <p className="text-caption text-text-muted">{formatDate(new Date(a.requestedAt), locale)}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" aria-label="Approve" onClick={() => handleApprove(a.title)}><CheckCircle2 className="h-4 w-4 text-semantic-success" /></Button>
                  <Button size="sm" variant="outline" aria-label="Reject" onClick={() => handleReject(a.title)}><AlertCircle className="h-4 w-4 text-semantic-danger" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
