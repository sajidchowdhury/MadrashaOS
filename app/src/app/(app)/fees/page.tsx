"use client";

/**
 * MadrashaOS — Fees Page (C3.4 — Finance · Fees)
 *
 * Student list with outstanding-fee summary + "Collect Payment" 3-step flow
 * per SRS §2.4.1 (Fee Plans & Collection) + Risk R8 (pending-discount rows
 * are visually distinguished as striped/greyed, with a "Discount Pending"
 * chip; active rows are solid).
 *
 *   Loading  → LoadingState pattern="table"
 *   Error    → ErrorState + retry
 *   Empty    → EmptyState illustration="fees"
 *   Data     → table of 40 students with per-row "Collect" button
 *
 * Permission gates:
 *   - Page itself gated by `fees.view` (nav-level — defensive check here too)
 *   - "Collect Payment" header button + per-row "Collect" buttons gated by
 *     `fees.payment.create` (per SRS §6.2)
 */

import * as React from "react";
import { Wallet, Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { IfPermission } from "@/components/auth/IfPermission";
import { LoadingState, ErrorState, PermissionDenied } from "@/components/states";
import { EmptyState } from "@/components/ui/empty-state";
import { useSessionStore } from "@/stores/sessionStore";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatCurrency, formatDate } from "@/lib/i18n/format";
import {
  useStudents, useFeePlans, usePendingApprovals,
} from "@/lib/query/client";
import { CollectPaymentDialog } from "@/components/finance/CollectPaymentDialog";

type Row = {
  studentId: string;
  studentName: string;
  studentCode: string;
  className: string;
  section: string;
  outstanding: number;
  pendingInstallments: number;
  hasPendingDiscount: boolean;
  discountTitle?: string;
};

export default function FeesPage() {
  const { locale } = useI18n();
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const canView = hasPermission("fees.view");

  const { data: students, isLoading: studentsLoading, isError: studentsError, refetch: refetchStudents } = useStudents();
  const { data: feePlans, isLoading: feesLoading, isError: feesError, refetch: refetchFees } = useFeePlans();
  const { data: approvals } = usePendingApprovals();

  const [collectOpen, setCollectOpen] = React.useState(false);
  const [preselectedStudentId, setPreselectedStudentId] = React.useState<string | undefined>();
  const [search, setSearch] = React.useState("");

  const isLoading = studentsLoading || feesLoading;
  const isError = studentsError || feesError;
  const refetch = () => { refetchStudents(); refetchFees(); };

  // Build the row data, annotating rows that have a pending discount approval.
  // Discount approvals carry titles like "Fee discount — Student MOS-2026-005 — 50%".
  const rows: Row[] = React.useMemo(() => {
    if (!students || !feePlans) return [];
    return students.map((s) => {
      const plan = feePlans.find((p) => p.studentId === s.id);
      const unpaid = (plan?.installments ?? []).filter((i) => !i.paid);
      const outstanding = unpaid.reduce((sum, i) => sum + i.amount, 0);
      const pendingApproval = approvals?.find(
        (a) => a.type === "discount" && a.status === "pending" && a.title.includes(s.code),
      );
      return {
        studentId: s.id,
        studentName: s.name,
        studentCode: s.code,
        className: s.classId.replace("cls-", "Class "),
        section: s.section,
        outstanding,
        pendingInstallments: unpaid.length,
        hasPendingDiscount: !!pendingApproval,
        discountTitle: pendingApproval?.title,
      };
    });
  }, [students, feePlans, approvals]);

  const filteredRows = React.useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) => r.studentName.toLowerCase().includes(q) || r.studentCode.toLowerCase().includes(q),
    );
  }, [rows, search]);

  if (!canView) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <PermissionDenied resource="Fees" />
        </div>
      </div>
    );
  }

  const totalOutstanding = rows.reduce((s, r) => s + r.outstanding, 0);
  const studentsWithDues = rows.filter((r) => r.outstanding > 0).length;
  const pendingDiscounts = rows.filter((r) => r.hasPendingDiscount).length;

  const openCollect = (studentId?: string) => {
    setPreselectedStudentId(studentId);
    setCollectOpen(true);
  };

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-display font-bold text-text-primary">Fees &amp; Collection</h1>
            <p className="mt-1 text-body text-text-secondary">
              Outstanding installments per student. Collect payments in three guided steps.
            </p>
          </div>
          <IfPermission code="fees.payment.create">
            <Button onClick={() => openCollect(undefined)}>
              <Wallet className="h-4 w-4" />
              Collect Payment
            </Button>
          </IfPermission>
        </header>

        {/* KPI strip */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border-default bg-surface-card p-4">
            <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
              Total Outstanding
            </p>
            <p className="mt-1 font-mono text-display font-bold text-semantic-warning">
              {formatCurrency(totalOutstanding, locale)}
            </p>
          </div>
          <div className="rounded-lg border border-border-default bg-surface-card p-4">
            <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
              Students with Dues
            </p>
            <p className="mt-1 font-mono text-display font-bold text-primary-500">
              {studentsWithDues}
            </p>
          </div>
          <div className="rounded-lg border border-border-default bg-surface-card p-4">
            <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
              Pending Discount Approvals
            </p>
            <p className="mt-1 font-mono text-display font-bold text-accent-500">
              {pendingDiscounts}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            placeholder="Search by student name or code…"
            className="ps-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search students"
          />
        </div>

        {/* Body */}
        {isLoading && <LoadingState pattern="table" rows={8} />}
        {isError && <ErrorState onRetry={refetch} />}
        {!isLoading && !isError && filteredRows.length === 0 && (
          <EmptyState
            illustration="fees"
            title="No students found"
            description={search ? `No matches for "${search}".` : "No fee plans have been created yet."}
          />
        )}
        {!isLoading && !isError && filteredRows.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border-default bg-surface-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50">
                  <TableHead className="px-4">Student</TableHead>
                  <TableHead className="px-4">Code</TableHead>
                  <TableHead className="px-4">Class</TableHead>
                  <TableHead className="px-4 text-end">Outstanding</TableHead>
                  <TableHead className="px-4 text-end">Pending Installments</TableHead>
                  <TableHead className="px-4 text-end">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((r) => {
                  // Risk R8 — pending-discount rows are striped/greyed with status chip.
                  const isDiscountPending = r.hasPendingDiscount;
                  const noDues = r.outstanding === 0;
                  return (
                    <TableRow
                      key={r.studentId}
                      className={
                        isDiscountPending
                          ? "bg-[repeating-linear-gradient(45deg,var(--color-accent-50)_0,var(--color-accent-50)_8px,var(--color-surface-card)_8px,var(--color-surface-card)_16px)]"
                          : noDues
                            ? "bg-neutral-50/50"
                            : ""
                      }
                    >
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="text-body font-medium text-text-primary">{r.studentName}</p>
                          {isDiscountPending && (
                            <Badge className="bg-accent-50 text-accent-700">
                              Discount Pending
                            </Badge>
                          )}
                          {noDues && !isDiscountPending && (
                            <Badge variant="outline" className="border-semantic-success/40 text-semantic-success">
                              Paid
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 font-mono text-caption text-text-secondary">
                        {r.studentCode}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-body text-text-secondary">
                        {r.className} · Sec {r.section}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-end font-mono text-body">
                        <span className={r.outstanding > 0 ? "text-semantic-warning" : "text-text-muted"}>
                          {formatCurrency(r.outstanding, locale)}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-end font-mono text-body text-text-secondary">
                        {r.pendingInstallments}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-end">
                        <IfPermission
                          code="fees.payment.create"
                          fallback={
                            <span className="text-caption text-text-muted">View only</span>
                          }
                        >
                          <Button
                            size="sm"
                            variant={r.outstanding === 0 ? "outline" : "default"}
                            disabled={r.outstanding === 0 || isDiscountPending}
                            onClick={() => openCollect(r.studentId)}
                          >
                            {isDiscountPending ? (
                              <>
                                <AlertTriangle className="h-4 w-4" />
                                On Hold
                              </>
                            ) : r.outstanding === 0 ? (
                              "No Dues"
                            ) : (
                              <>
                                <Wallet className="h-4 w-4" />
                                Collect
                              </>
                            )}
                          </Button>
                        </IfPermission>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Footer note: Risk R12-style "as of" timestamp */}
        {!isLoading && !isError && filteredRows.length > 0 && (
          <p className="text-caption text-text-muted">
            Outstanding amounts as of {formatDate(new Date(), locale)}.
            Pending discount approvals are flagged on their respective rows (Risk R8).
          </p>
        )}
      </div>

      <CollectPaymentDialog
        open={collectOpen}
        onOpenChange={setCollectOpen}
        preselectedStudentId={preselectedStudentId}
      />
    </div>
  );
}
