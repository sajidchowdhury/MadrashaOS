"use client";

/**
 * MadrashaOS — Platform Admin: Tenants List (Phase 3)
 *
 * Route: /platform/tenants
 *
 * Super-admin page listing all madrasha tenants (cross-tenant).
 * Supports search by name/code/email + status filter.
 * Each row links to the tenant detail page.
 */

import * as React from "react";
import Link from "next/link";
import {
  Building2, Search, Eye, Ban, CheckCircle2, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { IfPermission } from "@/components/auth/IfPermission";
import { PermissionDenied, LoadingState, ErrorState } from "@/components/states";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/i18n/format";

type Tenant = {
  id: string;
  name: string;
  name_bn: string;
  code: string;
  email: string | null;
  phone: string | null;
  status: string;
  trial_ends_at: string | null;
  suspended_at: string | null;
  branch_count: number;
  user_count: number;
  subscription: {
    status: string;
    plan: string;
    monthly_amount_bdt: number;
    branch_count_snapshot: number;
  } | null;
  created_at: string;
};

type StatusFilter = "all" | "active" | "suspended";

const STATUS_BADGE: Record<string, string> = {
  active: "bg-success-50 text-semantic-success border-semantic-success/40",
  suspended: "bg-danger-50 text-semantic-danger border-semantic-danger/40",
  deleted: "bg-neutral-100 text-text-muted border-border-default",
};

export default function PlatformTenantsPage() {
  const [tenants, setTenants] = React.useState<Tenant[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");

  const fetchTenants = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("pageSize", "100");
      const res = await fetch(`/api/v1/platform/tenants?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTenants(data.data ?? []);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, [search, statusFilter]);

  React.useEffect(() => {
    const timer = setTimeout(fetchTenants, 300);
    return () => clearTimeout(timer);
  }, [fetchTenants]);

  return (
    <IfPermission code="tenant.manage" fallback={<PermissionDenied resource="Platform Admin" />}>
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
          <header>
            <h1 className="flex items-center gap-2 text-display font-bold text-text-primary">
              <Building2 className="h-7 w-7 text-primary-500" aria-hidden />
              All Tenants
            </h1>
            <p className="mt-1 text-body text-text-secondary">
              Manage all madrasha organizations on the platform.
            </p>
          </header>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                placeholder="Search by name, code, or email…"
                className="ps-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="inline-flex rounded-md border border-border-default bg-surface-card p-0.5">
              {(["all", "active", "suspended"] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`rounded px-3 py-1.5 text-caption font-medium capitalize transition-colors ${
                    statusFilter === s
                      ? "bg-primary-500 text-primary-foreground"
                      : "text-text-secondary hover:bg-surface-hover"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          {loading && <LoadingState pattern="table" rows={5} />}
          {error && <ErrorState onRetry={fetchTenants} />}
          {!loading && !error && tenants.length === 0 && (
            <EmptyState
              illustration="fees"
              title="No tenants found"
              description={search ? `No matches for "${search}".` : "No tenants have been provisioned yet."}
            />
          )}
          {!loading && !error && tenants.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border-default bg-surface-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50">
                    <TableHead className="ps-4 min-w-[180px]">Madrasha</TableHead>
                    <TableHead className="min-w-[100px]">Code</TableHead>
                    <TableHead>Branches</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-end">Monthly</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="pe-4 text-end">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((t) => {
                    const monthly = t.subscription
                      ? t.subscription.monthly_amount_bdt * (t.subscription.branch_count_snapshot || t.branch_count || 1)
                      : 0;
                    const isTrialing = t.trial_ends_at && new Date(t.trial_ends_at) > new Date();
                    return (
                      <TableRow key={t.id} className="hover:bg-surface-hover">
                        <TableCell className="ps-4">
                          <div>
                            <p className="text-body font-medium text-text-primary">{t.name}</p>
                            {t.email && <p className="text-caption text-text-muted">{t.email}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-caption font-semibold text-primary-600">{t.code}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{t.branch_count}</Badge>
                        </TableCell>
                        <TableCell className="text-body text-text-secondary">{t.user_count}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_BADGE[t.status] ?? ""}>
                            <span className="capitalize">{t.status}</span>
                          </Badge>
                          {isTrialing && t.status === "active" && (
                            <p className="mt-0.5 text-[10px] text-semantic-warning">
                              Trial ends {formatDate(new Date(t.trial_ends_at!), "en")}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {t.subscription ? (
                            <span className="text-caption capitalize">{t.subscription.plan}</span>
                          ) : (
                            <span className="text-caption text-text-muted">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-end font-mono text-body">
                          {monthly > 0 ? formatCurrency(monthly, "en") : "—"}
                        </TableCell>
                        <TableCell className="text-caption text-text-secondary">
                          {formatDate(new Date(t.created_at), "en")}
                        </TableCell>
                        <TableCell className="pe-4 text-end">
                          <Link href={`/platform/tenants/${t.id}`}>
                            <Button variant="ghost" size="sm" aria-label="View tenant">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </IfPermission>
  );
}
