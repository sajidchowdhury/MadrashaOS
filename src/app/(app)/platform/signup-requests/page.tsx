"use client";

/**
 * MadrashaOS — Platform Admin: Signup Requests Review (Phase 1e)
 *
 * Route: /platform/signup-requests
 *
 * Platform super-admin only. Lists all tenant signup requests with
 * status filter tabs. The admin can:
 *   - View request details
 *   - Approve → triggers provisioning → shows temp password
 *   - Reject → with optional reason
 *
 * On approval success, a dialog shows the new org details + temporary
 * admin password that the platform admin must relay to the contact person.
 */

import * as React from "react";
import {
  Building2, Mail, Phone, MapPin, Hash, Clock, CheckCircle2,
  XCircle, AlertCircle, Loader2, KeyRound, Copy, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { IfPermission } from "@/components/auth/IfPermission";
import { PermissionDenied, LoadingState, ErrorState } from "@/components/states";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/i18n/format";

type SignupRequest = {
  id: string;
  org_name: string;
  org_name_bn: string | null;
  org_slug: string;
  org_code: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  address: string | null;
  estimated_branches: number;
  notes: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  provisioned_org: { id: string; name: string; code: string; status: string } | null;
  created_at: string;
};

type StatusFilter = "all" | "pending" | "approved" | "rejected" | "provisioned" | "failed";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-warning-50 text-semantic-warning border-semantic-warning/40",
  approved: "bg-primary-50 text-primary-700 border-primary-200",
  rejected: "bg-danger-50 text-semantic-danger border-semantic-danger/40",
  provisioned: "bg-success-50 text-semantic-success border-semantic-success/40",
  failed: "bg-neutral-100 text-text-secondary border-border-default",
};

type ProvisionResult = {
  organization_id: string;
  organization_code: string;
  admin_user_id: string;
  admin_email: string;
  admin_temp_password: string;
  branch_id: string;
  message: string;
};

export default function PlatformSignupRequestsPage() {
  const { toast } = useToast();
  const [requests, setRequests] = React.useState<SignupRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("pending");
  const [selected, setSelected] = React.useState<SignupRequest | null>(null);
  const [action, setAction] = React.useState<"approve" | "reject" | null>(null);
  const [reviewNote, setReviewNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [provisionResult, setProvisionResult] = React.useState<ProvisionResult | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  const fetchRequests = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(
        `/api/v1/platform/signup-requests?status=${statusFilter === "all" ? "" : statusFilter}&pageSize=100`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRequests(data.data ?? []);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, [statusFilter]);

  React.useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/v1/platform/signup-requests/${selected.id}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ review_note: reviewNote.trim() || undefined }),
          credentials: "include",
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Approval failed",
          description: data?.error || `Server returned ${res.status}.`,
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }
      setProvisionResult(data.data);
      toast({
        title: "Tenant provisioned!",
        description: `${selected.org_name} is now live.`,
      });
      setAction(null);
      setReviewNote("");
      fetchRequests();
    } catch {
      toast({
        title: "Network error",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    }
    setSubmitting(false);
  };

  const handleReject = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/v1/platform/signup-requests/${selected.id}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ review_note: reviewNote.trim() || undefined }),
          credentials: "include",
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Rejection failed",
          description: data?.error || `Server returned ${res.status}.`,
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }
      toast({
        title: "Request rejected",
        description: `${selected.org_name} has been rejected.`,
      });
      setSelected(null);
      setAction(null);
      setReviewNote("");
      fetchRequests();
    } catch {
      toast({
        title: "Network error",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    }
    setSubmitting(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    toast({ title: "Copied", description: text.slice(0, 50) + "…" });
  };

  return (
    <IfPermission code="tenant.manage" fallback={<PermissionDenied resource="Platform Admin" />}>
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
          <header>
            <h1 className="flex items-center gap-2 text-display font-bold text-text-primary">
              <Building2 className="h-7 w-7 text-primary-500" aria-hidden />
              Signup Requests
            </h1>
            <p className="mt-1 text-body text-text-secondary">
              Review and approve new madrasha signup requests. Approved
              requests are provisioned automatically (org + roles + accounts).
            </p>
          </header>

          {/* Status filter tabs */}
          <div className="flex flex-wrap gap-2">
            {(["pending", "provisioned", "rejected", "failed", "all"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-md px-3 py-1.5 text-caption font-medium capitalize transition-colors ${
                  statusFilter === s
                    ? "bg-primary-500 text-primary-foreground"
                    : "bg-neutral-100 text-text-secondary hover:bg-surface-hover"
                }`}
              >
                {s}
                <span className="ms-1 opacity-70">
                  ({s === statusFilter ? requests.length : "…"})
                </span>
              </button>
            ))}
          </div>

          {/* Body */}
          {loading && <LoadingState pattern="table" rows={5} />}
          {error && <ErrorState onRetry={fetchRequests} />}
          {!loading && !error && requests.length === 0 && (
            <EmptyState
              illustration="fees"
              title={`No ${statusFilter === "all" ? "" : statusFilter} requests`}
              description="New signup requests will appear here for review."
            />
          )}
          {!loading && !error && requests.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border-default bg-surface-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50">
                    <TableHead className="ps-4 min-w-[160px]">Madrasha</TableHead>
                    <TableHead className="min-w-[140px]">Code</TableHead>
                    <TableHead className="min-w-[150px]">Contact</TableHead>
                    <TableHead>Branches</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="pe-4 text-end min-w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((r) => (
                    <TableRow key={r.id} className="hover:bg-surface-hover">
                      <TableCell className="ps-4">
                        <div>
                          <p className="text-body font-medium text-text-primary">{r.org_name}</p>
                          {r.org_name_bn && (
                            <p className="text-caption text-text-muted" lang="bn">{r.org_name_bn}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-caption font-semibold text-primary-600">
                          {r.org_code}
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className="text-body text-text-primary">{r.contact_name}</p>
                        <p className="text-caption text-text-muted">{r.contact_email}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.estimated_branches}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_BADGE[r.status] ?? ""}>
                          <span className="capitalize">{r.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-caption text-text-secondary">
                        {formatDate(new Date(r.created_at), "en")}
                      </TableCell>
                      <TableCell className="pe-4 text-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelected(r)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Review Dialog ---------- */}
      <Dialog open={!!selected && !action && !provisionResult} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary-500" />
                  {selected.org_name}
                </DialogTitle>
                <DialogDescription>
                  Submitted {formatDate(new Date(selected.created_at), "en")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                {/* Code */}
                <div className="flex items-center justify-between rounded-md border border-primary-200 bg-primary-50 px-3 py-2">
                  <div>
                    <p className="text-caption font-medium uppercase tracking-wider text-primary-600">
                      Madrasha Code
                    </p>
                    <p className="font-mono text-subtitle font-bold text-primary-700">
                      {selected.org_code}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(selected.org_code)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Contact info */}
                <div className="grid gap-2 text-body">
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-text-muted" />
                    {selected.contact_email}
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-text-muted" />
                    {selected.contact_phone}
                  </p>
                  {selected.address && (
                    <p className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 text-text-muted" />
                      {selected.address}
                    </p>
                  )}
                  <p className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-text-muted" />
                    Estimated branches: {selected.estimated_branches}
                  </p>
                </div>

                {selected.notes && (
                  <div className="rounded-md border border-border-default bg-surface-hover p-2">
                    <p className="text-caption font-medium text-text-muted">Notes from requester:</p>
                    <p className="mt-0.5 text-body text-text-secondary">{selected.notes}</p>
                  </div>
                )}

                {selected.review_note && (
                  <div className="rounded-md border border-border-default bg-surface-hover p-2">
                    <p className="text-caption font-medium text-text-muted">Review note:</p>
                    <p className="mt-0.5 text-body text-text-secondary">{selected.review_note}</p>
                  </div>
                )}

                {selected.provisioned_org && (
                  <div className="rounded-md border border-semantic-success/40 bg-success-50 p-2">
                    <p className="flex items-center gap-1.5 text-caption font-medium text-semantic-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Provisioned as &ldquo;{selected.provisioned_org.name}&rdquo; (code: {selected.provisioned_org.code})
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                {selected.status === "pending" ? (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => { setAction("reject"); setReviewNote(""); }}
                      disabled={submitting}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      className="bg-semantic-success hover:bg-semantic-success/90"
                      onClick={() => { setAction("approve"); setReviewNote(""); }}
                      disabled={submitting}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve & Provision
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setSelected(null)}>
                    Close
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ---------- Approve/Reject Action Dialog ---------- */}
      <Dialog open={!!action} onOpenChange={(o) => !o && !submitting && setAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {action === "approve" ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-semantic-success" />
                  Approve & Provision?
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-semantic-danger" />
                  Reject Request?
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {action === "approve"
                ? `This will create a new organization "${selected?.org_name}" with roles, permissions, accounts, and a first admin user. The contact person (${selected?.contact_email}) will be the first administrator.`
                : `This will reject the signup request from ${selected?.org_name}. The requester will NOT be notified automatically (you must contact them manually).`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="review-note">Review note (optional)</Label>
            <Textarea
              id="review-note"
              placeholder={action === "approve"
                ? "e.g. Approved after phone verification with the principal."
                : "e.g. Duplicate request — already have an account."}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              rows={3}
              maxLength={500}
              disabled={submitting}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)} disabled={submitting}>
              Cancel
            </Button>
            {action === "approve" ? (
              <Button
                className="bg-semantic-success hover:bg-semantic-success/90"
                onClick={handleApprove}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Provisioning…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Approve & Provision
                  </>
                )}
              </Button>
            ) : (
              <Button variant="destructive" onClick={handleReject} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Rejecting…
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    Confirm Rejection
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Provisioning Result Dialog ---------- */}
      <Dialog open={!!provisionResult} onOpenChange={(o) => !o && setProvisionResult(null)}>
        <DialogContent className="sm:max-w-md">
          {provisionResult && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-semantic-success">
                  <CheckCircle2 className="h-5 w-5" />
                  Tenant Provisioned!
                </DialogTitle>
                <DialogDescription>
                  A new madrasha has been created and is ready to use.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                {/* Madrasha code */}
                <div className="rounded-md border border-primary-200 bg-primary-50 p-3 text-center">
                  <p className="text-caption font-medium uppercase tracking-wider text-primary-600">
                    Madrasha Code
                  </p>
                  <p className="font-mono text-display font-bold text-primary-700">
                    {provisionResult.organization_code}
                  </p>
                </div>

                {/* Admin credentials */}
                <div className="rounded-md border border-semantic-warning/40 bg-warning-50 p-3 space-y-2">
                  <p className="flex items-center gap-1.5 text-caption font-medium text-semantic-warning">
                    <KeyRound className="h-3.5 w-3.5" />
                    First Admin Credentials
                  </p>
                  <div className="space-y-1 text-body">
                    <p className="text-text-secondary">
                      Email: <strong className="text-text-primary">{provisionResult.admin_email}</strong>
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-text-secondary">Temp password:</span>
                      <code className="flex-1 rounded bg-surface-card px-2 py-1 font-mono text-text-primary">
                        {showPassword ? provisionResult.admin_temp_password : "••••••••••••"}
                      </code>
                      <Button variant="ghost" size="sm" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(provisionResult.admin_temp_password)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-caption text-semantic-warning">
                    ⚠️ Relay this password to the contact person securely. They will be prompted to change it on first login.
                  </p>
                </div>

                <div className="rounded-md border border-border-default bg-surface-hover p-2 text-caption text-text-secondary">
                  <p className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    14-day trial active. After trial: 300 BDT/month per branch.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(
                    `MadrashaOS Login:\nMadrasha Code: ${provisionResult.organization_code}\nEmail: ${provisionResult.admin_email}\nPassword: ${provisionResult.admin_temp_password}\nURL: https://your-domain.com/login`,
                  )}
                >
                  <Copy className="h-4 w-4" />
                  Copy Login Info
                </Button>
                <Button onClick={() => setProvisionResult(null)}>
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </IfPermission>
  );
}
