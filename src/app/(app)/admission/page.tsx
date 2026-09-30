"use client";

/**
 * MadrashaOS — Admission Management (redesigned)
 *
 * Route: /admission
 *
 * Class-wise admission pipeline with search + Kanban-style columns.
 *
 * Features:
 *   - Class filter dropdown (select a class to see only its applications)
 *   - Search by applicant name or phone
 *   - 5 columns: Applied → Interviewed → Approved → Registered → Rejected
 *   - Each card shows: applicant name (en/bn), phone, applied date, status badge
 *   - Stage transitions via buttons (not drag-and-drop — more reliable on mobile):
 *     Applied → Interview: mark as interviewed
 *     Interview → Approve: approve (gated by admission.approve)
 *     Approve → Register: converts to Student + FeePlan + Guardian
 *     Any → Reject: reject with reason
 *   - "New Application" button (dialog wired to POST /api/v1/admissions)
 *   - Class filter shows count per class
 *
 * Data: real API via fetch() — no mock data.
 */

import * as React from "react";
import {
  UserPlus, Search, CheckCircle2, XCircle, ArrowRight,
  AlertCircle, Phone, CalendarDays, GraduationCap, Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { IfPermission } from "@/components/auth/IfPermission";
import { LoadingState, ErrorState, PermissionDenied } from "@/components/states";
import { EmptyState } from "@/components/ui/empty-state";
import { useSessionStore } from "@/stores/sessionStore";
import { useClasses, queryClient } from "@/lib/query/client";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/i18n/format";

type Stage = "applied" | "interviewed" | "approved" | "registered" | "rejected";

type Applicant = {
  id: string;
  applicant_name: string;
  applicant_name_bn: string | null;
  guardian_name: string;
  phone: string;
  email: string | null;
  desired_class: string; // UUID of the class
  status: Stage;
  submitted_at: string;
  student_id: string | null;
  rejection_reason: string | null;
};

const COLUMNS: {
  id: Stage;
  title: string;
  tone: "neutral" | "primary" | "accent" | "success" | "danger";
}[] = [
  { id: "applied", title: "Applied", tone: "neutral" },
  { id: "interviewed", title: "Interviewed", tone: "primary" },
  { id: "approved", title: "Approved", tone: "accent" },
  { id: "registered", title: "Registered", tone: "success" },
  { id: "rejected", title: "Rejected", tone: "danger" },
];

const COLUMN_BADGE: Record<string, string> = {
  neutral: "bg-neutral-100 text-text-primary",
  primary: "bg-primary-50 text-primary-700",
  accent: "bg-accent-50 text-accent-700",
  success: "bg-success-50 text-semantic-success",
  danger: "bg-danger-50 text-semantic-danger",
};

export default function AdmissionPage() {
  const { hasPermission } = useSessionStore();
  const { toast } = useToast();
  const { data: classes } = useClasses();

  const classList = (classes ?? []) as Array<{ id: string; name: string }>;

  const [applicants, setApplicants] = React.useState<Applicant[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [selectedClassId, setSelectedClassId] = React.useState<string>("all");
  const [search, setSearch] = React.useState("");

  // New application dialog state
  const [newAppOpen, setNewAppOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [appName, setAppName] = React.useState("");
  const [appNameBn, setAppNameBn] = React.useState("");
  const [guardianName, setGuardianName] = React.useState("");
  const [guardianPhone, setGuardianPhone] = React.useState("");
  const [appEmail, setAppEmail] = React.useState("");
  const [desiredClassId, setDesiredClassId] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);

  // Fetch applicants from the API
  const fetchApplicants = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (selectedClassId !== "all") params.set("class_id", selectedClassId);
      params.set("pageSize", "200");
      const res = await fetch(`/api/v1/admissions?${params}`);
      const data = await res.json().catch(() => ({}));
      const list = (data?.data ?? []) as Applicant[];
      setApplicants(list);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, [selectedClassId]);

  React.useEffect(() => {
    fetchApplicants();
  }, [fetchApplicants]);

  // Filter by search
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return applicants;
    return applicants.filter(
      (a) =>
        a.applicant_name?.toLowerCase().includes(q) ||
        a.applicant_name_bn?.toLowerCase().includes(q) ||
        a.phone?.includes(q) ||
        a.guardian_name?.toLowerCase().includes(q),
    );
  }, [applicants, search]);

  // Group by stage
  const byStage = React.useMemo(() => {
    const m: Record<Stage, Applicant[]> = {
      applied: [], interviewed: [], approved: [], registered: [], rejected: [],
    };
    for (const a of filtered) {
      if (m[a.status]) m[a.status].push(a);
    }
    return m;
  }, [filtered]);

  // --- Stage transition handlers ---
  async function changeStage(id: string, newStatus: Stage, extraBody?: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/v1/admissions/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, ...extraBody }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: "Failed", description: data?.error || `HTTP ${res.status}`, variant: "destructive" });
        return;
      }
      toast({ title: "Status updated", description: `→ ${newStatus}` });
      fetchApplicants();
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    }
  }

  async function registerStudent(id: string) {
    try {
      const res = await fetch(`/api/v1/admissions/${id}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: "Registration failed", description: data?.error || `HTTP ${res.status}`, variant: "destructive" });
        return;
      }
      toast({
        title: "Student registered",
        description: `Student code: ${data?.data?.student_code ?? "—"}. Fee plan + guardian created automatically.`,
      });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["fee-plans"] });
      fetchApplicants();
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    }
  }

  // --- New application handler ---
  async function handleNewApplication() {
    setFormError(null);
    if (!appName.trim() || !guardianName.trim() || !guardianPhone.trim() || !desiredClassId) {
      setFormError("Applicant name, guardian name, guardian phone, and desired class are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant_name: appName.trim(),
          applicant_name_bn: appNameBn.trim() || undefined,
          guardian_name: guardianName.trim(),
          guardian_phone: guardianPhone.trim(),
          phone: guardianPhone.trim(),
          email: appEmail.trim() || undefined,
          desired_class_id: desiredClassId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data?.error || `Failed (HTTP ${res.status})`);
        setSubmitting(false);
        return;
      }
      toast({ title: "Application submitted", description: `${appName} — ref ${String(data?.data?.id ?? "").slice(0, 8).toUpperCase()}` });
      setAppName(""); setAppNameBn(""); setGuardianName(""); setGuardianPhone(""); setAppEmail(""); setDesiredClassId("");
      setNewAppOpen(false);
      fetchApplicants();
    } catch {
      setFormError("Network error — please try again.");
    }
    setSubmitting(false);
  }

  if (!hasPermission("admission.view")) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <PermissionDenied resource="Admissions" />
        </div>
      </div>
    );
  }

  const classMap = new Map(classList.map((c) => [c.id, c.name]));

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-display font-bold text-text-primary">
              <UserPlus className="h-7 w-7 text-primary-500" aria-hidden />
              Admissions
            </h1>
            <p className="mt-1 text-body text-text-secondary">
              Filter by class, search applicants, and move them through the pipeline.
              Registering converts the applicant into a Student with fee plan + guardian.
            </p>
          </div>
          <IfPermission code="admission.view">
            <Button onClick={() => setNewAppOpen(true)}>
              <UserPlus className="h-4 w-4" />
              New Application
            </Button>
          </IfPermission>
        </header>

        {/* Filters: class + search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-full sm:w-64" aria-label="Filter by class">
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classList.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              type="search"
              placeholder="Search by applicant name, guardian, or phone…"
              className="ps-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-5">
          {COLUMNS.map((col) => (
            <Card key={col.id} className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-caption font-medium uppercase tracking-wide text-text-muted">
                  {col.title}
                </span>
                <Badge variant="outline" className={COLUMN_BADGE[col.tone]}>
                  {byStage[col.id]?.length ?? 0}
                </Badge>
              </div>
            </Card>
          ))}
        </div>

        {/* Body */}
        {loading && <LoadingState pattern="list" rows={4} />}
        {error && <ErrorState onRetry={fetchApplicants} />}

        {!loading && !error && filtered.length === 0 && (
          <EmptyState
            title="No applications found"
            description={search ? `No matches for "${search}".` : "No admission applications yet. Click 'New Application' to create one."}
          />
        )}

        {/* Kanban columns */}
        {!loading && !error && filtered.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-5">
            {COLUMNS.map((col) => (
              <div key={col.id} className="flex min-h-[16rem] flex-col gap-2">
                <div className="flex items-center justify-between rounded-lg bg-surface-canvas px-3 py-2">
                  <h2 className="text-subtitle font-semibold text-text-primary">
                    {col.title}
                  </h2>
                  <Badge variant="outline" className={COLUMN_BADGE[col.tone]}>
                    {byStage[col.id]?.length ?? 0}
                  </Badge>
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  {(byStage[col.id] ?? []).length === 0 ? (
                    <p className="px-3 py-4 text-center text-caption text-text-muted">
                      No applications
                    </p>
                  ) : (
                    byStage[col.id].map((a) => (
                      <AdmissionCard
                        key={a.id}
                        applicant={a}
                        className={classMap.get(a.desired_class) ?? "Unknown"}
                        onAdvance={(newStage) => changeStage(a.id, newStage)}
                        onRegister={() => registerStudent(a.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Application Dialog */}
      <Dialog open={newAppOpen} onOpenChange={setNewAppOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary-500" />
              New Admission Application
            </DialogTitle>
            <DialogDescription>
              Submit a new admission application. It will appear in the
              "Applied" column.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="app-name">Applicant Name (English) *</Label>
                <Input id="app-name" placeholder="Tahsin Rahman" value={appName} onChange={(e) => setAppName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="app-name-bn">আবেদনকারীর নাম (বাংলা)</Label>
                <Input id="app-name-bn" placeholder="তাহসিন রহমান" value={appNameBn} onChange={(e) => setAppNameBn(e.target.value)} lang="bn" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="g-name">Guardian Name *</Label>
                <Input id="g-name" placeholder="Abdul Rahman" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="g-phone">Guardian Phone *</Label>
                <Input id="g-phone" placeholder="+880 1XXX-XXXXXX" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="app-email">Email</Label>
                <Input id="app-email" type="email" placeholder="guardian@example.com" value={appEmail} onChange={(e) => setAppEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="app-class">Desired Class *</Label>
                <Select value={desiredClassId} onValueChange={setDesiredClassId}>
                  <SelectTrigger id="app-class" className="w-full">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classList.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formError && (
              <div role="alert" className="flex items-start gap-2 rounded-md border border-semantic-danger/40 bg-danger-50 px-3 py-2 text-caption text-semantic-danger">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewAppOpen(false)}>Cancel</Button>
            <Button onClick={handleNewApplication} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------------------------------------------------------
 * AdmissionCard — single applicant card with action buttons
 * --------------------------------------------------------------- */

function AdmissionCard({
  applicant: a,
  className,
  onAdvance,
  onRegister,
}: {
  applicant: Applicant;
  className: string;
  onAdvance: (stage: Stage) => void;
  onRegister: () => void;
}) {
  return (
    <Card className="shadow-elevation-1">
      <CardContent className="space-y-2 p-3">
        <div>
          <p className="text-body font-medium text-text-primary">{a.applicant_name}</p>
          {a.applicant_name_bn && (
            <p className="text-caption text-text-muted" lang="bn">{a.applicant_name_bn}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-caption text-text-secondary">
          <span className="inline-flex items-center gap-1">
            <GraduationCap className="h-3 w-3" />
            {className}
          </span>
          <span className="inline-flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {a.phone}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {formatDate(new Date(a.submitted_at), "en")}
          </span>
        </div>
        {a.student_id && (
          <Badge variant="outline" className="bg-success-50 text-semantic-success">
            <CheckCircle2 className="h-3 w-3" />
            Student created
          </Badge>
        )}

        {/* Action buttons — based on current stage */}
        <div className="flex flex-wrap gap-1 pt-1">
          {a.status === "applied" && (
            <IfPermission code="admission.approve">
              <Button size="sm" variant="outline" onClick={() => onAdvance("interviewed")}>
                <ArrowRight className="h-3 w-3" />
                Interview
              </Button>
            </IfPermission>
          )}
          {a.status === "interviewed" && (
            <IfPermission code="admission.approve">
              <Button size="sm" variant="outline" onClick={() => onAdvance("approved")}>
                <CheckCircle2 className="h-3 w-3" />
                Approve
              </Button>
            </IfPermission>
          )}
          {a.status === "approved" && (
            <IfPermission code="admission.approve">
              <Button size="sm" onClick={onRegister}>
                <CheckCircle2 className="h-3 w-3" />
                Register as Student
              </Button>
            </IfPermission>
          )}
          {a.status !== "rejected" && a.status !== "registered" && (
            <IfPermission code="admission.reject">
              <Button size="sm" variant="ghost" onClick={() => onAdvance("rejected")}>
                <Ban className="h-3 w-3" />
                Reject
              </Button>
            </IfPermission>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
