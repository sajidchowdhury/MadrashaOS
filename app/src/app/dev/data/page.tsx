"use client";

/**
 * MadrashaOS — /dev/data route (C0.4 exit criterion)
 *
 * Debug page showing:
 *   (a) Every fixture's row count
 *   (b) The current session state (role, branch, network, permissions)
 *   (c) Live TanStack Query results for each resource — filtered by
 *       the current role's permissions via mockApi's checkPermission()
 *   (d) Permission filter: switching role via DevToolbar immediately
 *       updates which queries succeed vs throw PermissionDeniedError
 *
 * This route proves the mock-data layer works end-to-end before
 * Phase C2 (Information Architecture) consumes it.
 */

import {
  useStudents,
  useGuardians,
  useFeePlans,
  useFeePayments,
  useAccounts,
  useLedgerEntries,
  useAttendanceSessions,
  useInventory,
  useNotices,
  usePendingApprovals,
  useCurrentUser,
  useClasses,
} from "@/lib/query/client";
import { useSessionStore } from "@/stores/sessionStore";
import { ROLE_LABELS, BRANCH_LABELS } from "@/stores/types";
import { fixtureCounts } from "@/lib/mock/fixtures";
import { getRolePermissions } from "@/lib/auth/role-permissions";

export default function DevDataPage() {
  const { role, branch, network, permissions } = useSessionStore();

  // Each hook calls mockApi which checks permission → may throw 403
  const studentsQ = useStudents();
  const guardiansQ = useGuardians();
  const feePlansQ = useFeePlans();
  const feePaymentsQ = useFeePayments();
  const accountsQ = useAccounts();
  const ledgerQ = useLedgerEntries();
  const attendanceQ = useAttendanceSessions();
  const inventoryQ = useInventory();
  const noticesQ = useNotices();
  const approvalsQ = usePendingApprovals();
  const userQ = useCurrentUser();
  const classesQ = useClasses();

  const queries = [
    { name: "students", q: studentsQ, perm: "students.view" },
    { name: "guardians", q: guardiansQ, perm: "guardians.view" },
    { name: "feePlans", q: feePlansQ, perm: "fees.view" },
    { name: "feePayments", q: feePaymentsQ, perm: "fees.view" },
    { name: "accounts", q: accountsQ, perm: "accounting.ledger.view" },
    { name: "ledgerEntries", q: ledgerQ, perm: "accounting.ledger.view" },
    { name: "attendanceSessions", q: attendanceQ, perm: "attendance.view" },
    { name: "inventory", q: inventoryQ, perm: "inventory.view" },
    { name: "notices", q: noticesQ, perm: "notices.view" },
    { name: "pendingApprovals", q: approvalsQ, perm: "approval.view" },
    { name: "currentUser", q: userQ, perm: "(always allowed)" },
    { name: "classes", q: classesQ, perm: "(always allowed)" },
  ];

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-display font-bold text-text-primary">/dev/data</h1>
          <p className="mt-1 text-body text-text-secondary">
            Mock-data layer debug view — switch role via DevToolbar to see
            permission filtering in real-time.
          </p>
        </header>

        {/* Session state */}
        <section className="rounded-xl border border-border-default bg-surface-card p-6 shadow-elevation-1">
          <h2 className="text-headline font-bold text-text-primary">
            Session State
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <dl className="space-y-2 text-body">
                <Row label="Role" value={`${ROLE_LABELS[role].english} (${ROLE_LABELS[role].native})`} />
                <Row label="Branch" value={BRANCH_LABELS[branch]} />
                <Row label="Network" value={network} />
                <Row label="Permissions count" value={String(permissions.length)} />
                <Row label="Current user" value={userQ.data?.name ?? "—"} />
              </dl>
            </div>
            <div>
              <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
                Permission codes
              </p>
              <div className="mt-2 max-h-32 overflow-y-auto rounded-md border border-border-default bg-neutral-50 p-2">
                <code className="text-[11px] leading-relaxed text-text-secondary">
                  {getRolePermissions(role).join(", ")}
                </code>
              </div>
            </div>
          </div>
        </section>

        {/* Fixture counts */}
        <section className="rounded-xl border border-border-default bg-surface-card p-6 shadow-elevation-1">
          <h2 className="text-headline font-bold text-text-primary">
            Fixture Counts (seed data)
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
            {Object.entries(fixtureCounts).map(([key, count]) => (
              <div
                key={key}
                className="rounded-lg border border-border-default bg-neutral-50 p-3 text-center"
              >
                <p className="font-mono text-headline font-bold text-primary-500">
                  {count}
                </p>
                <p className="mt-1 text-caption text-text-secondary">{key}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Live query results */}
        <section className="rounded-xl border border-border-default bg-surface-card p-6 shadow-elevation-1">
          <h2 className="text-headline font-bold text-text-primary">
            Live Query Results (permission-filtered)
          </h2>
          <p className="mt-1 text-body text-text-secondary">
            Each row calls mockApi which enforces permissions. Switch role
            via DevToolbar to see rows flip from ✅ data to ❌ 403.
          </p>
          <div className="mt-4 overflow-hidden rounded-lg border border-border-default">
            <table className="w-full">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-2 text-start text-caption font-medium uppercase tracking-wider text-text-muted">
                    Resource
                  </th>
                  <th className="px-4 py-2 text-start text-caption font-medium uppercase tracking-wider text-text-muted">
                    Required Permission
                  </th>
                  <th className="px-4 py-2 text-start text-caption font-medium uppercase tracking-wider text-text-muted">
                    Status
                  </th>
                  <th className="px-4 py-2 text-end text-caption font-medium uppercase tracking-wider text-text-muted">
                    Rows
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {queries.map(({ name, q, perm }) => {
                  const isLoading = q.isLoading;
                  const isError = q.isError;
                  const isSuccess = q.isSuccess;
                  const rowCount = Array.isArray(q.data) ? q.data.length : q.data ? 1 : 0;
                  const errorName = isError
                    ? (q.error as Error)?.name ?? "Error"
                    : null;
                  return (
                    <tr key={name} className="hover:bg-surface-hover">
                      <td className="px-4 py-2.5 font-mono text-subtitle text-text-primary">
                        {name}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-caption text-text-secondary">
                        {perm}
                      </td>
                      <td className="px-4 py-2.5">
                        {isLoading && (
                          <span className="text-caption text-text-muted">
                            loading…
                          </span>
                        )}
                        {isSuccess && (
                          <span className="rounded-full bg-success-50 px-2 py-0.5 text-caption font-medium text-semantic-success">
                            ✅ success
                          </span>
                        )}
                        {isError && errorName === "PermissionDeniedError" && (
                          <span className="rounded-full bg-danger-50 px-2 py-0.5 text-caption font-medium text-semantic-danger">
                            ❌ 403 denied
                          </span>
                        )}
                        {isError && errorName === "NetworkError" && (
                          <span className="rounded-full bg-warning-50 px-2 py-0.5 text-caption font-medium text-semantic-warning">
                            ⚠ network
                          </span>
                        )}
                        {isError && errorName !== "PermissionDeniedError" && errorName !== "NetworkError" && (
                          <span className="rounded-full bg-danger-50 px-2 py-0.5 text-caption font-medium text-semantic-danger">
                            ❌ {errorName}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-end font-mono text-subtitle text-text-primary">
                        {isSuccess ? rowCount : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="font-medium text-text-primary">{value}</dd>
    </div>
  );
}
