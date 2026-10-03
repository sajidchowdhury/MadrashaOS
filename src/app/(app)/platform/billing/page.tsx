"use client";

/**
 * MadrashaOS — Platform Admin: Billing Overview (Phase 4)
 *
 * Route: /platform/billing
 *
 * Platform super-admin page showing all tenants' billing status:
 *   - Summary KPIs: total MRR, active, trialing, suspended
 *   - Table: each tenant with plan, branches, unit price, monthly total
 *   - Totals row at the bottom
 */

import * as React from "react";
import {
  DollarSign, TrendingUp, Clock, Ban, Loader2, Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IfPermission } from "@/components/auth/IfPermission";
import { PermissionDenied, LoadingState, ErrorState } from "@/components/states";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/i18n/format";

type TenantBilling = {
  id: string;
  name: string;
  code: string;
  status: string;
  plan: string;
  subscription_status: string;
  branch_count: number;
  unit_price_bdt: number;
  monthly_total_bdt: number;
  trial_ends_at: string | null;
  created_at: string;
};

type BillingData = {
  summary: {
    total_tenants: number;
    active_count: number;
    trialing_count: number;
    suspended_count: number;
    total_mrr_bdt: number;
    currency: string;
  };
  tenants: TenantBilling[];
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-success-50 text-semantic-success border-semantic-success/40",
  suspended: "bg-danger-50 text-semantic-danger border-semantic-danger/40",
};

export default function PlatformBillingPage() {
  const [data, setData] = React.useState<BillingData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  const fetchBilling = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/v1/platform/billing", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.data);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => { fetchBilling(); }, [fetchBilling]);

  return (
    <IfPermission code="tenant.manage" fallback={<PermissionDenied resource="Platform Admin" />}>
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
          <header>
            <h1 className="flex items-center gap-2 text-display font-bold text-text-primary">
              <DollarSign className="h-7 w-7 text-primary-500" aria-hidden />
              Billing Overview
            </h1>
            <p className="mt-1 text-body text-text-secondary">
              All tenants' billing status and total monthly recurring revenue (MRR).
            </p>
          </header>

          {loading && <LoadingState pattern="detail" />}
          {error && <ErrorState onRetry={fetchBilling} />}

          {data && !loading && !error && (
            <>
              {/* Summary KPIs */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-semantic-success/30 bg-success-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-caption font-medium uppercase tracking-wider text-semantic-success">Total MRR</span>
                    <TrendingUp className="h-4 w-4 text-semantic-success" />
                  </div>
                  <p className="mt-2 font-mono text-display font-bold text-semantic-success">
                    {formatCurrency(data.summary.total_mrr_bdt, "en")}
                  </p>
                  <p className="text-caption text-semantic-success/70">per month</p>
                </div>
                <div className="rounded-lg border border-primary-200 bg-primary-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-caption font-medium uppercase tracking-wider text-primary-600">Active</span>
                    <Building2 className="h-4 w-4 text-primary-500" />
                  </div>
                  <p className="mt-2 font-mono text-display font-bold text-primary-700">
                    {data.summary.active_count}
                  </p>
                  <p className="text-caption text-primary-600">tenants</p>
                </div>
                <div className="rounded-lg border border-semantic-warning/30 bg-warning-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-caption font-medium uppercase tracking-wider text-semantic-warning">Trialing</span>
                    <Clock className="h-4 w-4 text-semantic-warning" />
                  </div>
                  <p className="mt-2 font-mono text-display font-bold text-semantic-warning">
                    {data.summary.trialing_count}
                  </p>
                  <p className="text-caption text-semantic-warning/70">on trial</p>
                </div>
                <div className="rounded-lg border border-semantic-danger/30 bg-danger-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-caption font-medium uppercase tracking-wider text-semantic-danger">Suspended</span>
                    <Ban className="h-4 w-4 text-semantic-danger" />
                  </div>
                  <p className="mt-2 font-mono text-display font-bold text-semantic-danger">
                    {data.summary.suspended_count}
                  </p>
                  <p className="text-caption text-semantic-danger/70">non-paying</p>
                </div>
              </div>

              {/* Tenants billing table */}
              <Card className="border-border-default">
                <CardHeader>
                  <CardTitle className="text-subtitle">Per-Tenant Billing</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-lg border border-border-default">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-neutral-50">
                          <TableHead className="ps-4 min-w-[160px]">Madrasha</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead className="text-center">Branches</TableHead>
                          <TableHead className="text-end">Unit Price</TableHead>
                          <TableHead className="text-end">Monthly Total</TableHead>
                          <TableHead>Trial Ends</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.tenants.map((t) => {
                          const isTrialing = t.trial_ends_at && new Date(t.trial_ends_at) > new Date();
                          return (
                            <TableRow key={t.id} className="hover:bg-surface-hover">
                              <TableCell className="ps-4 text-body font-medium text-text-primary">
                                {t.name}
                              </TableCell>
                              <TableCell>
                                <span className="font-mono text-caption font-semibold text-primary-600">{t.code}</span>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={STATUS_BADGE[t.status] ?? ""}>
                                  <span className="capitalize">{t.status}</span>
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-caption capitalize text-text-secondary">{t.plan}</span>
                              </TableCell>
                              <TableCell className="text-center font-mono text-body">{t.branch_count}</TableCell>
                              <TableCell className="text-end font-mono text-body text-text-secondary">
                                {formatCurrency(t.unit_price_bdt, "en")}
                              </TableCell>
                              <TableCell className="text-end font-mono text-body font-bold text-text-primary">
                                {formatCurrency(t.monthly_total_bdt, "en")}
                              </TableCell>
                              <TableCell className="text-caption text-text-secondary">
                                {t.trial_ends_at ? formatDate(new Date(t.trial_ends_at), "en") : "—"}
                                {isTrialing && (
                                  <span className="ms-1 text-semantic-warning">●</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {/* Totals row */}
                        <TableRow className="border-t-2 border-primary-200 bg-primary-50">
                          <TableCell className="ps-4 font-bold text-text-primary">
                            Total ({data.tenants.length} tenants)
                          </TableCell>
                          <TableCell colSpan={3} />
                          <TableCell className="text-center font-mono font-bold text-text-primary">
                            {data.tenants.reduce((s, t) => s + t.branch_count, 0)}
                          </TableCell>
                          <TableCell />
                          <TableCell className="text-end font-mono text-display font-bold text-primary-700">
                            {formatCurrency(
                              data.tenants.reduce((s, t) => s + t.monthly_total_bdt, 0),
                              "en",
                            )}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Note about payment gateway */}
              <div className="rounded-lg border border-semantic-info/30 bg-blue-50 p-4 text-caption text-blue-800">
                <p>
                  <strong>Note:</strong> Billing is display-only in this phase.
                  No payments are being collected yet — the payment gateway will be added in a future phase.
                  MRR shown is the expected monthly revenue based on current branch counts.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </IfPermission>
  );
}
