"use client";

/**
 * MadrashaOS — Tenant Billing Page (Phase 4)
 *
 * Route: /billing
 *
 * Tenant-facing billing page showing:
 *   - Current plan (Trial / Starter) + status badge
 *   - Branch count + monthly amount (large, prominent)
 *   - Pricing breakdown (300 BDT × N branches = N×300 BDT/month)
 *   - Trial countdown (days remaining)
 *   - Pricing FAQ / info box (no payment gateway yet)
 *   - "Add a branch" CTA (links to /organization)
 *
 * No "Pay Now" button — payment gateway is a later phase.
 */

import * as React from "react";
import {
  CreditCard, Building2, GitBranch, Clock, DollarSign, Info,
  Loader2, AlertCircle, CheckCircle2, TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState, ErrorState } from "@/components/states";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/i18n/format";
import { useRouter } from "next/navigation";

type BillingData = {
  organization: { id: string; name: string; code: string; status: string };
  subscription: {
    plan: string;
    status: string;
    monthly_amount_bdt: number;
    branch_count_snapshot: number;
    current_period_start: string;
    current_period_end: string;
    trial_ends_at: string | null;
  } | null;
  billing: {
    unit_price_bdt: number;
    branch_count: number;
    total_monthly_bdt: number;
    currency: string;
    trial_ends_at: string | null;
    is_trialing: boolean;
    days_until_trial_ends: number | null;
    pricing_rule: string;
  };
};

export default function BillingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = React.useState<BillingData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [previewBranches, setPreviewBranches] = React.useState("");
  const [previewResult, setPreviewResult] = React.useState<number | null>(null);
  const [previewing, setPreviewing] = React.useState(false);

  const fetchBilling = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/v1/billing/subscription", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.data);
      setPreviewBranches(String(json.data?.billing?.branch_count ?? 1));
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => { fetchBilling(); }, [fetchBilling]);

  const handlePreview = async () => {
    const n = Number(previewBranches) || 0;
    if (n < 1 || n > 100) {
      toast({ title: "Invalid input", description: "Branch count must be 1-100.", variant: "destructive" });
      return;
    }
    setPreviewing(true);
    try {
      const res = await fetch("/api/v1/billing/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchCount: n }),
        credentials: "include",
      });
      const json = await res.json();
      setPreviewResult(json.data?.total_monthly_bdt ?? null);
    } catch {
      toast({ title: "Preview failed", variant: "destructive" });
    }
    setPreviewing(false);
  };

  if (loading) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <LoadingState pattern="detail" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <ErrorState onRetry={fetchBilling} />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { billing, subscription, organization } = data;
  const isSuspended = organization.status === "suspended";

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header>
          <h1 className="flex items-center gap-2 text-display font-bold text-text-primary">
            <CreditCard className="h-7 w-7 text-primary-500" aria-hidden />
            Billing & Subscription
          </h1>
          <p className="mt-1 text-body text-text-secondary">
            Your plan, branch usage, and monthly billing summary.
          </p>
        </header>

        {/* Suspended warning */}
        {isSuspended && (
          <div className="flex items-start gap-3 rounded-lg border border-semantic-danger/40 bg-danger-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-semantic-danger" />
            <div>
              <p className="text-body font-medium text-semantic-danger">Account Suspended</p>
              <p className="mt-0.5 text-caption text-semantic-danger/80">
                Your madrasha account is currently suspended. Please contact the platform operator to reactivate your subscription.
              </p>
            </div>
          </div>
        )}

        {/* Trial countdown banner */}
        {billing.is_trialing && billing.days_until_trial_ends !== null && (
          <div className="flex items-start gap-3 rounded-lg border border-semantic-warning/40 bg-warning-50 p-4">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-semantic-warning" />
            <div className="flex-1">
              <p className="text-body font-medium text-semantic-warning">
                {billing.days_until_trial_ends === 0
                  ? "Your trial ends today!"
                  : `${billing.days_until_trial_ends} day${billing.days_until_trial_ends === 1 ? "" : "s"} left in your free trial`}
              </p>
              <p className="mt-0.5 text-caption text-semantic-warning/80">
                Trial ends on {formatDate(new Date(billing.trial_ends_at!), "en")}.
                After the trial, billing is {formatCurrency(billing.total_monthly_bdt, "en")}/month based on your branch count.
              </p>
            </div>
          </div>
        )}

        {/* Current Plan Card — the big one */}
        <Card className="border-primary-300 shadow-elevation-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-subtitle">
                <Building2 className="h-5 w-5 text-primary-500" />
                Current Plan
              </CardTitle>
              <Badge
                variant="outline"
                className={
                  isSuspended
                    ? "bg-danger-50 text-semantic-danger"
                    : billing.is_trialing
                      ? "bg-warning-50 text-semantic-warning"
                      : "bg-success-50 text-semantic-success"
                }
              >
                <span className="capitalize">{subscription?.plan ?? "trial"}</span>
                {" · "}
                <span className="capitalize">{subscription?.status ?? "trialing"}</span>
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Big monthly amount */}
            <div className="rounded-lg border-2 border-primary-200 bg-primary-50 p-6 text-center">
              <p className="text-caption font-medium uppercase tracking-wider text-primary-600">
                Monthly Billing
              </p>
              <p className="mt-2 font-mono text-display font-bold text-primary-700">
                {formatCurrency(billing.total_monthly_bdt, "en")}
                <span className="text-body font-normal text-primary-500">/month</span>
              </p>
              <p className="mt-2 text-caption text-primary-600">
                {billing.pricing_rule}
              </p>
            </div>

            {/* Breakdown */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border-default bg-surface-card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-caption font-medium uppercase tracking-wider text-text-muted">Unit Price</span>
                  <DollarSign className="h-4 w-4 text-text-muted" />
                </div>
                <p className="mt-1 font-mono text-subtitle font-bold text-text-primary">
                  {formatCurrency(billing.unit_price_bdt, "en")}
                </p>
                <p className="text-caption text-text-muted">per branch / month</p>
              </div>
              <div className="rounded-lg border border-border-default bg-surface-card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-caption font-medium uppercase tracking-wider text-text-muted">Branches</span>
                  <GitBranch className="h-4 w-4 text-text-muted" />
                </div>
                <p className="mt-1 font-mono text-subtitle font-bold text-text-primary">
                  {billing.branch_count}
                </p>
                <p className="text-caption text-text-muted">active branches</p>
              </div>
              <div className="rounded-lg border border-border-default bg-surface-card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-caption font-medium uppercase tracking-wider text-text-muted">Total</span>
                  <TrendingUp className="h-4 w-4 text-text-muted" />
                </div>
                <p className="mt-1 font-mono text-subtitle font-bold text-text-primary">
                  {formatCurrency(billing.total_monthly_bdt, "en")}
                </p>
                <p className="text-caption text-text-muted">per month</p>
              </div>
            </div>

            {/* Add branch CTA */}
            <div className="flex items-center justify-between rounded-md border border-border-default bg-surface-hover p-3">
              <div>
                <p className="text-body font-medium text-text-primary">Need more branches?</p>
                <p className="text-caption text-text-muted">
                  Each additional branch adds {formatCurrency(billing.unit_price_bdt, "en")}/month
                </p>
              </div>
              <Button variant="outline" onClick={() => router.push("/organization")}>
                <GitBranch className="h-4 w-4" />
                Add Branch
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pricing calculator */}
        <Card className="border-border-default">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-subtitle">
              <TrendingUp className="h-5 w-5 text-primary-500" />
              Pricing Calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="preview-branches">Number of branches</Label>
                <Input
                  id="preview-branches"
                  type="number"
                  min={1}
                  max={100}
                  value={previewBranches}
                  onChange={(e) => setPreviewBranches(e.target.value)}
                  className="font-mono"
                />
              </div>
              <Button onClick={handlePreview} disabled={previewing}>
                {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Calculate"}
              </Button>
            </div>
            {previewResult !== null && (
              <div className="rounded-md border border-primary-200 bg-primary-50 p-3 text-center">
                <p className="text-caption font-medium uppercase tracking-wider text-primary-600">
                  Estimated Monthly Total
                </p>
                <p className="mt-1 font-mono text-display font-bold text-primary-700">
                  {formatCurrency(previewResult, "en")}/month
                </p>
                <p className="mt-1 text-caption text-primary-600">
                  {billing.unit_price_bdt} BDT × {previewBranches} branches = {previewResult} BDT/month
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info box — no payment gateway yet */}
        <div className="flex items-start gap-3 rounded-lg border border-semantic-info/30 bg-blue-50 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div>
            <p className="text-body font-medium text-blue-900">
              How billing works
            </p>
            <ul className="mt-1.5 space-y-1 text-caption text-blue-800">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
                14-day free trial — no payment required
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
                After trial: 300 BDT per branch per month
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
                No branches = 300 BDT/month (minimum)
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
                2 branches = 600 BDT/month, 3 branches = 900 BDT/month, etc.
              </li>
              <li className="flex items-start gap-1.5">
                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                Payment gateway coming soon — for now, billing is display-only
              </li>
            </ul>
          </div>
        </div>

        {/* Subscription details */}
        {subscription && (
          <Card className="border-border-default">
            <CardHeader>
              <CardTitle className="text-subtitle">Subscription Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-body">
              <div className="flex justify-between">
                <span className="text-text-secondary">Plan</span>
                <span className="font-medium capitalize text-text-primary">{subscription.plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Status</span>
                <span className="font-medium capitalize text-text-primary">{subscription.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Current period</span>
                <span className="text-text-primary">
                  {formatDate(new Date(subscription.current_period_start), "en")} — {formatDate(new Date(subscription.current_period_end), "en")}
                </span>
              </div>
              {subscription.trial_ends_at && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Trial ends</span>
                  <span className="font-medium text-semantic-warning">
                    {formatDate(new Date(subscription.trial_ends_at), "en")}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
