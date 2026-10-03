"use client";

/**
 * MadrashaOS — Platform Admin: Tenant Detail (Phase 3)
 *
 * Route: /platform/tenants/[orgId]
 *
 * Super-admin page showing a single tenant's full details:
 *   - Org info (name, code, status, contact)
 *   - Branches list
 *   - User count, student count, ledger entry count
 *   - Subscription details
 *   - Suspend / Reactivate buttons (with confirmation dialog)
 */

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Building2, ArrowLeft, Mail, Phone, MapPin, GitBranch, Users,
  GraduationCap, Calculator, Ban, CheckCircle2, AlertCircle,
  Loader2, Clock, DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { IfPermission } from "@/components/auth/IfPermission";
import { PermissionDenied, LoadingState, ErrorState } from "@/components/states";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/i18n/format";

type TenantDetail = {
  id: string;
  name: string;
  name_bn: string;
  code: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: string;
  trial_ends_at: string | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  created_at: string;
  branches: Array<{ id: string; name: string; code: string; is_active: boolean; phone: string | null; email: string | null }>;
  branch_count: number;
  user_count: number;
  student_count: number;
  ledger_entry_count: number;
  subscription: {
    id: string;
    plan: string;
    status: string;
    monthly_amount_bdt: number;
    branch_count_snapshot: number;
    current_period_start: string;
    current_period_end: string;
    trial_ends_at: string | null;
  } | null;
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-success-50 text-semantic-success border-semantic-success/40",
  suspended: "bg-danger-50 text-semantic-danger border-semantic-danger/40",
};

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const orgId = params.orgid as string;

  const [tenant, setTenant] = React.useState<TenantDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [suspendOpen, setSuspendOpen] = React.useState(false);
  const [suspendReason, setSuspendReason] = React.useState("");
  const [actioning, setActioning] = React.useState(false);

  const fetchTenant = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/v1/platform/tenants/${orgId}`, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTenant(data.data);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, [orgId]);

  React.useEffect(() => { fetchTenant(); }, [fetchTenant]);

  const handleSuspend = async () => {
    setActioning(true);
    try {
      const res = await fetch(`/api/v1/platform/tenants/${orgId}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: suspendReason.trim() || undefined }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: "Failed", description: data?.error || `HTTP ${res.status}`, variant: "destructive" });
        setActioning(false);
        return;
      }
      toast({ title: "Tenant suspended", description: data?.message });
      setSuspendOpen(false);
      setSuspendReason("");
      fetchTenant();
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    }
    setActioning(false);
  };

  const handleActivate = async () => {
    setActioning(true);
    try {
      const res = await fetch(`/api/v1/platform/tenants/${orgId}/activate`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: "Failed", description: data?.error || `HTTP ${res.status}`, variant: "destructive" });
        setActioning(false);
        return;
      }
      toast({ title: "Tenant activated", description: data?.message });
      fetchTenant();
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    }
    setActioning(false);
  };

  return (
    <IfPermission code="tenant.manage" fallback={<PermissionDenied resource="Platform Admin" />}>
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
          {/* Back link */}
          <button
            type="button"
            onClick={() => router.push("/platform/tenants")}
            className="flex items-center gap-1.5 text-caption text-text-secondary hover:text-primary-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to all tenants
          </button>

          {loading && <LoadingState pattern="detail" />}
          {error && <ErrorState onRetry={fetchTenant} />}

          {tenant && !loading && !error && (
            <>
              {/* Header */}
              <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="flex items-center gap-2 text-display font-bold text-text-primary">
                    <Building2 className="h-7 w-7 text-primary-500" aria-hidden />
                    {tenant.name}
                  </h1>
                  {tenant.name_bn && (
                    <p className="mt-0.5 text-body text-text-secondary" lang="bn">{tenant.name_bn}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={STATUS_BADGE[tenant.status] ?? ""}>
                      <span className="capitalize">{tenant.status}</span>
                    </Badge>
                    <span className="font-mono text-caption font-semibold text-primary-600">
                      Code: {tenant.code}
                    </span>
                    {tenant.trial_ends_at && new Date(tenant.trial_ends_at) > new Date() && (
                      <Badge variant="outline" className="bg-warning-50 text-semantic-warning">
                        <Clock className="h-3 w-3" />
                        Trial ends {formatDate(new Date(tenant.trial_ends_at), "en")}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  {tenant.status === "active" ? (
                    <Button variant="destructive" onClick={() => setSuspendOpen(true)} disabled={actioning}>
                      <Ban className="h-4 w-4" />
                      Suspend
                    </Button>
                  ) : (
                    <Button className="bg-semantic-success hover:bg-semantic-success/90" onClick={handleActivate} disabled={actioning}>
                      {actioning ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Reactivate
                    </Button>
                  )}
                </div>
              </header>

              {/* Suspended reason */}
              {tenant.status === "suspended" && tenant.suspended_reason && (
                <div className="flex items-start gap-3 rounded-lg border border-semantic-danger/40 bg-danger-50 p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-semantic-danger" />
                  <div>
                    <p className="text-body font-medium text-semantic-danger">Suspended</p>
                    <p className="mt-0.5 text-caption text-semantic-danger/80">
                      {tenant.suspended_reason}
                      {tenant.suspended_at && ` · ${formatDate(new Date(tenant.suspended_at), "en")}`}
                    </p>
                  </div>
                </div>
              )}

              {/* KPI strip */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={<GitBranch className="h-5 w-5" />} label="Branches" value={tenant.branch_count} />
                <StatCard icon={<Users className="h-5 w-5" />} label="Users" value={tenant.user_count} />
                <StatCard icon={<GraduationCap className="h-5 w-5" />} label="Students" value={tenant.student_count} />
                <StatCard icon={<Calculator className="h-5 w-5" />} label="Ledger Entries" value={tenant.ledger_entry_count} />
              </div>

              {/* Contact + subscription */}
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Contact info */}
                <Card className="border-border-default">
                  <CardHeader>
                    <CardTitle className="text-subtitle">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-body">
                    {tenant.email && (
                      <p className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-text-muted" />
                        {tenant.email}
                      </p>
                    )}
                    {tenant.phone && (
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-text-muted" />
                        {tenant.phone}
                      </p>
                    )}
                    {tenant.address && (
                      <p className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-text-muted" />
                        {tenant.address}
                      </p>
                    )}
                    <p className="text-caption text-text-muted">
                      Created: {formatDate(new Date(tenant.created_at), "en")}
                    </p>
                  </CardContent>
                </Card>

                {/* Subscription */}
                <Card className="border-border-default">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-subtitle">
                      <DollarSign className="h-5 w-5 text-primary-500" />
                      Subscription
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {tenant.subscription ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-body text-text-secondary">Plan</span>
                          <Badge variant="outline" className="capitalize">{tenant.subscription.plan}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-body text-text-secondary">Status</span>
                          <Badge variant="outline" className="capitalize">{tenant.subscription.status}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-body text-text-secondary">Monthly amount</span>
                          <span className="font-mono text-body font-bold text-primary-600">
                            {formatCurrency(tenant.subscription.monthly_amount_bdt, "en")}/branch
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-body text-text-secondary">Billed branches</span>
                          <span className="font-mono text-body">{tenant.subscription.branch_count_snapshot}</span>
                        </div>
                        <div className="rounded-md border border-primary-200 bg-primary-50 p-3">
                          <p className="text-caption font-medium uppercase tracking-wider text-primary-600">
                            Estimated Monthly Total
                          </p>
                          <p className="mt-1 font-mono text-display font-bold text-primary-700">
                            {formatCurrency(
                              tenant.subscription.monthly_amount_bdt * tenant.subscription.branch_count_snapshot,
                              "en",
                            )}/month
                          </p>
                        </div>
                        {tenant.subscription.trial_ends_at && (
                          <p className="text-caption text-semantic-warning">
                            <Clock className="me-1 inline h-3.5 w-3.5" />
                            Trial ends: {formatDate(new Date(tenant.subscription.trial_ends_at), "en")}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-body text-text-muted">No subscription record found.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Branches */}
              <Card className="border-border-default">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-subtitle">
                    <GitBranch className="h-5 w-5 text-primary-500" />
                    Branches ({tenant.branches.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {tenant.branches.map((b) => (
                      <div key={b.id} className="flex items-center justify-between rounded-md border border-border-default p-3">
                        <div>
                          <p className="text-body font-medium text-text-primary">{b.name}</p>
                          <p className="text-caption text-text-muted">
                            Code: {b.code}
                            {b.email && ` · ${b.email}`}
                          </p>
                        </div>
                        <Badge variant="outline" className={b.is_active ? "bg-success-50 text-semantic-success" : "bg-neutral-100 text-text-muted"}>
                          {b.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Suspend confirmation dialog */}
      <Dialog open={suspendOpen} onOpenChange={(o) => !o && !actioning && setSuspendOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-semantic-danger">
              <Ban className="h-5 w-5" />
              Suspend Tenant?
            </DialogTitle>
            <DialogDescription>
              This will immediately block all users of <strong>{tenant?.name}</strong> from logging in.
              They will see a &ldquo;account suspended&rdquo; message. You can reactivate at any time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="suspend-reason">Reason (optional)</Label>
            <Textarea
              id="suspend-reason"
              placeholder="e.g. Non-payment, policy violation, requested by tenant…"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={3}
              maxLength={500}
              disabled={actioning}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendOpen(false)} disabled={actioning}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSuspend} disabled={actioning}>
              {actioning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              {actioning ? "Suspending…" : "Confirm Suspend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </IfPermission>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border-default bg-surface-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-caption font-medium uppercase tracking-wider text-text-muted">{label}</span>
        {icon}
      </div>
      <p className="mt-2 font-mono text-display font-bold text-text-primary">{value.toLocaleString()}</p>
    </div>
  );
}
