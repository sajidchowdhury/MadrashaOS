"use client";

/**
 * MadrashaOS — Platform Dashboard (Phase 3)
 *
 * Route: /platform
 *
 * Super-admin landing page with KPI cards + quick links.
 * Shows: total tenants, pending signups, MRR, suspended, branches, users.
 */

import * as React from "react";
import {
  Building2, Users, GitBranch, DollarSign, Clock, Ban, Server,
  TrendingUp, AlertCircle, ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IfPermission } from "@/components/auth/IfPermission";
import { PermissionDenied, LoadingState, ErrorState } from "@/components/states";
import { formatCurrency, formatDate } from "@/lib/i18n/format";

type Stats = {
  total_tenants: number;
  active_tenants: number;
  trialing_tenants: number;
  suspended_tenants: number;
  pending_signups: number;
  total_branches: number;
  total_users: number;
  mrr_bdt: number;
  active_subscriptions: number;
};

export default function PlatformDashboardPage() {
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  const fetchStats = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/v1/platform/stats", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStats(data.data);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <IfPermission code="tenant.manage" fallback={<PermissionDenied resource="Platform Admin" />}>
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
          {/* Header with platform banner */}
          <header>
            <div className="flex items-center gap-2 rounded-lg border border-primary-300 bg-primary-100 px-3 py-1.5 mb-3">
              <Server className="h-4 w-4 text-primary-700" />
              <span className="text-caption font-semibold uppercase tracking-wider text-primary-700">
                Platform Admin Mode
              </span>
            </div>
            <h1 className="flex items-center gap-2 text-display font-bold text-text-primary">
              <Building2 className="h-7 w-7 text-primary-500" aria-hidden />
              Platform Dashboard
            </h1>
            <p className="mt-1 text-body text-text-secondary">
              Manage all madrasha tenants, review signups, and monitor billing.
            </p>
          </header>

          {loading && <LoadingState pattern="detail" />}
          {error && <ErrorState onRetry={fetchStats} />}

          {/* KPI Cards */}
          {stats && !loading && !error && (
            <>
              {stats.pending_signups > 0 && (
                <div className="flex items-start gap-3 rounded-lg border border-semantic-warning/40 bg-warning-50 p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-semantic-warning" />
                  <div className="flex-1">
                    <p className="text-body font-medium text-semantic-warning">
                      {stats.pending_signups} signup request{stats.pending_signups === 1 ? "" : "s"} awaiting review
                    </p>
                    <p className="text-caption text-semantic-warning/80">
                      Review and approve new madrasha signups to provision their accounts.
                    </p>
                  </div>
                  <Button size="sm" onClick={() => window.location.href = "/platform/signup-requests"}>
                    Review now
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                  icon={<Building2 className="h-5 w-5" />}
                  label="Total Tenants"
                  value={stats.total_tenants}
                  sub={`${stats.active_tenants} active`}
                  tone="primary"
                />
                <KpiCard
                  icon={<Clock className="h-5 w-5" />}
                  label="Trialing"
                  value={stats.trialing_tenants}
                  sub="On 14-day trial"
                  tone="accent"
                />
                <KpiCard
                  icon={<Ban className="h-5 w-5" />}
                  label="Suspended"
                  value={stats.suspended_tenants}
                  sub="Non-paying / policy"
                  tone="danger"
                />
                <KpiCard
                  icon={<DollarSign className="h-5 w-5" />}
                  label="MRR (BDT)"
                  value={formatCurrency(stats.mrr_bdt, "en")}
                  sub={`${stats.active_subscriptions} active subs`}
                  tone="success"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <KpiCard
                  icon={<GitBranch className="h-5 w-5" />}
                  label="Total Branches"
                  value={stats.total_branches}
                  tone="neutral"
                />
                <KpiCard
                  icon={<Users className="h-5 w-5" />}
                  label="Total Users"
                  value={stats.total_users}
                  tone="neutral"
                />
                <KpiCard
                  icon={<TrendingUp className="h-5 w-5" />}
                  label="Pending Signups"
                  value={stats.pending_signups}
                  tone="warning"
                />
              </div>

              {/* Quick links */}
              <Card className="border-border-default">
                <CardHeader>
                  <CardTitle className="text-subtitle">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <QuickLink href="/platform/signup-requests" label="Review Signups" description={`${stats.pending_signups} pending`} />
                  <QuickLink href="/platform/tenants" label="Manage Tenants" description={`${stats.total_tenants} organizations`} />
                  <QuickLink href="/backup" label="Backup System" description="Cross-tenant backup" />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </IfPermission>
  );
}

function KpiCard({
  icon, label, value, sub, tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  tone: "primary" | "accent" | "danger" | "success" | "warning" | "neutral";
}) {
  const toneClasses: Record<typeof tone, string> = {
    primary: "border-primary-200 bg-primary-50 text-primary-700",
    accent: "border-accent-200 bg-accent-50 text-accent-700",
    danger: "border-semantic-danger/30 bg-danger-50 text-semantic-danger",
    success: "border-semantic-success/30 bg-success-50 text-semantic-success",
    warning: "border-semantic-warning/30 bg-warning-50 text-semantic-warning",
    neutral: "border-border-default bg-surface-card text-text-primary",
  };
  return (
    <div className={`rounded-lg border p-4 ${toneClasses[tone]}`}>
      <div className="flex items-center justify-between">
        <span className="text-caption font-medium uppercase tracking-wider opacity-80">{label}</span>
        {icon}
      </div>
      <p className="mt-2 font-mono text-display font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-caption opacity-70">{sub}</p>}
    </div>
  );
}

function QuickLink({ href, label, description }: { href: string; label: string; description: string }) {
  return (
    <a
      href={href}
      className="flex items-center justify-between rounded-lg border border-border-default bg-surface-card p-3 transition-colors hover:bg-surface-hover"
    >
      <div>
        <p className="text-body font-medium text-text-primary">{label}</p>
        <p className="text-caption text-text-muted">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-text-muted" />
    </a>
  );
}
