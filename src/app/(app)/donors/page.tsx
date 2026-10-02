"use client";

/**
 * MadrashaOS — Donor Management Page
 *
 * Route: /donors
 *
 * Features:
 *   - Donor list with search (by name/phone/email)
 *   - Summary cards: Total Donors, Total Donated, Total Pledged
 *   - Add Donor dialog (name, phone, email, type, address)
 *   - Add Pledge dialog (amount, type, frequency, start date)
 *   - View pledges per donor (expandable row)
 *   - Filter by donor type (regular/zakat_donor/sadaqah_donor/one_time)
 *
 * Data: real API (GET /api/v1/donors, POST /api/v1/donors,
 * POST /api/v1/donors/:id/pledges)
 */

import * as React from "react";
import {
  Heart, Plus, Search, Save, XCircle, AlertCircle,
  Phone, Mail, CalendarDays, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { IfPermission } from "@/components/auth/IfPermission";
import {
  LoadingState, ErrorState, PermissionDenied,
} from "@/components/states";
import { EmptyState } from "@/components/ui/empty-state";
import { useSessionStore } from "@/stores/sessionStore";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/i18n/format";

type Donor = {
  id: string;
  name: string;
  name_bn: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  donor_type: string;
  total_donated: number;
  total_pledged: number;
  notes: string | null;
  is_active: boolean;
  donation_count: number;
  pledge_count: number;
};

type Pledge = {
  id: string;
  amount: number;
  pledge_type: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
  amount_received: number;
  next_reminder: string | null;
  status: string;
  notes: string | null;
};

const TYPE_BADGE: Record<string, string> = {
  regular: "bg-primary-50 text-primary-700",
  one_time: "bg-neutral-100 text-text-secondary",
  zakat_donor: "bg-accent-50 text-accent-700",
  sadaqah_donor: "bg-success-50 text-semantic-success",
};

const TYPE_LABELS: Record<string, string> = {
  regular: "Regular",
  one_time: "One-time",
  zakat_donor: "Zakat Donor",
  sadaqah_donor: "Sadaqah Donor",
};

export default function DonorsPage() {
  const { hasPermission } = useSessionStore();
  const { toast } = useToast();

  const [donors, setDonors] = React.useState<Donor[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [expandedDonorId, setExpandedDonorId] = React.useState<string | null>(null);
  const [pledges, setPledges] = React.useState<Record<string, Pledge[]>>({});

  // Add donor dialog
  const [addOpen, setAddOpen] = React.useState(false);
  const [addSubmitting, setAddSubmitting] = React.useState(false);
  const [donorName, setDonorName] = React.useState("");
  const [donorNameBn, setDonorNameBn] = React.useState("");
  const [donorPhone, setDonorPhone] = React.useState("");
  const [donorEmail, setDonorEmail] = React.useState("");
  const [donorAddress, setDonorAddress] = React.useState("");
  const [donorType, setDonorType] = React.useState("regular");
  const [donorNotes, setDonorNotes] = React.useState("");
  const [addError, setAddError] = React.useState<string | null>(null);

  // Add pledge dialog
  const [pledgeOpen, setPledgeOpen] = React.useState(false);
  const [pledgeDonorId, setPledgeDonorId] = React.useState<string | null>(null);
  const [pledgeDonorName, setPledgeDonorName] = React.useState("");
  const [pledgeSubmitting, setPledgeSubmitting] = React.useState(false);
  const [pledgeAmount, setPledgeAmount] = React.useState("");
  const [pledgeType, setPledgeType] = React.useState("general");
  const [pledgeFrequency, setPledgeFrequency] = React.useState("one_time");
  const [pledgeStartDate, setPledgeStartDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [pledgeReminder, setPledgeReminder] = React.useState("");
  const [pledgeNotes, setPledgeNotes] = React.useState("");
  const [pledgeError, setPledgeError] = React.useState<string | null>(null);

  const canView = hasPermission("donors.view");

  const fetchDonors = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/v1/donors?pageSize=100");
      const data = await res.json().catch(() => ({}));
      setDonors((data?.data ?? []) as Donor[]);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    fetchDonors();
  }, [fetchDonors]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return donors.filter((d) => {
      if (typeFilter !== "all" && d.donor_type !== typeFilter) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        (d.phone ?? "").includes(q) ||
        (d.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [donors, search, typeFilter]);

  const totalDonated = donors.reduce((s, d) => s + d.total_donated, 0);
  const totalPledged = donors.reduce((s, d) => s + d.total_pledged, 0);

  async function handleAddDonor() {
    setAddError(null);
    if (!donorName.trim()) {
      setAddError("Donor name is required.");
      return;
    }
    setAddSubmitting(true);
    try {
      const res = await fetch("/api/v1/donors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: donorName.trim(),
          name_bn: donorNameBn.trim() || undefined,
          phone: donorPhone.trim() || undefined,
          email: donorEmail.trim() || undefined,
          address: donorAddress.trim() || undefined,
          donor_type: donorType,
          notes: donorNotes.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAddError(data?.error || `Failed (HTTP ${res.status})`);
        setAddSubmitting(false);
        return;
      }
      toast({ title: "Donor added", description: donorName });
      setDonorName(""); setDonorNameBn(""); setDonorPhone(""); setDonorEmail("");
      setDonorAddress(""); setDonorType("regular"); setDonorNotes("");
      setAddOpen(false);
      fetchDonors();
    } catch {
      setAddError("Network error — please try again.");
    }
    setAddSubmitting(false);
  }

  function openPledgeDialog(donorId: string, donorName: string) {
    setPledgeDonorId(donorId);
    setPledgeDonorName(donorName);
    setPledgeAmount(""); setPledgeType("general"); setPledgeFrequency("one_time");
    setPledgeStartDate(new Date().toISOString().slice(0, 10));
    setPledgeReminder(""); setPledgeNotes(""); setPledgeError(null);
    setPledgeOpen(true);
  }

  async function handleAddPledge() {
    setPledgeError(null);
    const amount = Number(pledgeAmount) || 0;
    if (amount <= 0) { setPledgeError("Amount must be greater than 0."); return; }
    if (!pledgeDonorId) { setPledgeError("No donor selected."); return; }
    setPledgeSubmitting(true);
    try {
      const res = await fetch(`/api/v1/donors/${pledgeDonorId}/pledges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          pledge_type: pledgeType,
          frequency: pledgeFrequency,
          start_date: pledgeStartDate,
          next_reminder: pledgeReminder || undefined,
          notes: pledgeNotes.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPledgeError(data?.error || `Failed (HTTP ${res.status})`);
        setPledgeSubmitting(false);
        return;
      }
      toast({ title: "Pledge created", description: `${pledgeDonorName} — ৳${amount.toLocaleString()} (${pledgeFrequency})` });
      setPledgeOpen(false);
      fetchDonors();
      // If the donor is expanded, refresh pledges
      if (expandedDonorId === pledgeDonorId) {
        fetchPledges(pledgeDonorId);
      }
    } catch {
      setPledgeError("Network error — please try again.");
    }
    setPledgeSubmitting(false);
  }

  async function fetchPledges(donorId: string) {
    try {
      const res = await fetch(`/api/v1/donors/${donorId}/pledges`);
      const data = await res.json().catch(() => ({}));
      setPledges((prev) => ({ ...prev, [donorId]: (data?.data ?? []) as Pledge[] }));
    } catch {
      // Non-fatal
    }
  }

  function toggleExpand(donorId: string) {
    if (expandedDonorId === donorId) {
      setExpandedDonorId(null);
    } else {
      setExpandedDonorId(donorId);
      fetchPledges(donorId);
    }
  }

  if (!canView) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <PermissionDenied resource="Donors" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-display font-bold text-text-primary">
              <Heart className="h-7 w-7 text-primary-500" aria-hidden />
              Donors
            </h1>
            <p className="mt-1 text-body text-text-secondary">
              Manage donors, track pledges, and view donation history.
            </p>
          </div>
          <IfPermission code="donors.create">
            <Button onClick={() => { setAddError(null); setAddOpen(true); }}>
              <Plus className="h-4 w-4" />
              Add Donor
            </Button>
          </IfPermission>
        </header>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border-default bg-surface-card p-4">
            <p className="text-caption font-medium uppercase tracking-wide text-text-muted">Total Donors</p>
            <p className="mt-1 font-mono text-display font-bold text-primary-500">{donors.length}</p>
          </div>
          <div className="rounded-lg border border-border-default bg-surface-card p-4">
            <p className="text-caption font-medium uppercase tracking-wide text-text-muted">Total Donated</p>
            <p className="mt-1 font-mono text-display font-bold text-semantic-success">{formatCurrency(totalDonated, "en")}</p>
          </div>
          <div className="rounded-lg border-2 border-accent-200 bg-accent-50 p-4">
            <p className="text-caption font-medium uppercase tracking-wide text-accent-700">Total Pledged</p>
            <p className="mt-1 font-mono text-display font-bold text-accent-700">{formatCurrency(totalPledged, "en")}</p>
          </div>
        </div>

        {/* Search + filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input placeholder="Search by name, phone, or email…" className="ps-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-48" aria-label="Filter by type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="regular">Regular</SelectItem>
              <SelectItem value="zakat_donor">Zakat Donor</SelectItem>
              <SelectItem value="sadaqah_donor">Sadaqah Donor</SelectItem>
              <SelectItem value="one_time">One-time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Body */}
        {loading && <LoadingState pattern="table" rows={5} />}
        {error && <ErrorState onRetry={fetchDonors} />}

        {!loading && !error && filtered.length === 0 && (
          <EmptyState
            illustration="fees"
            title="No donors found"
            description={search ? `No matches for "${search}".` : "No donors recorded yet. Click 'Add Donor' to create one."}
          />
        )}

        {/* Donors table */}
        {!loading && !error && filtered.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border-default bg-surface-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                  <TableHead className="px-4">Donor</TableHead>
                  <TableHead className="px-4">Type</TableHead>
                  <TableHead className="px-4 text-end">Donated</TableHead>
                  <TableHead className="px-4 text-end">Pledged</TableHead>
                  <TableHead className="px-4 text-end">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => (
                  <React.Fragment key={d.id}>
                    <TableRow className="hover:bg-surface-hover">
                      <TableCell className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleExpand(d.id)}
                          className="flex items-center gap-2 text-start"
                        >
                          <div>
                            <p className="text-body font-medium text-text-primary">{d.name}</p>
                            {d.name_bn && <p className="text-caption text-text-muted" lang="bn">{d.name_bn}</p>}
                            <div className="flex items-center gap-3 text-caption text-text-muted">
                              {d.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{d.phone}</span>}
                              {d.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{d.email}</span>}
                            </div>
                          </div>
                        </button>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge variant="outline" className={TYPE_BADGE[d.donor_type] ?? ""}>
                          {TYPE_LABELS[d.donor_type] ?? d.donor_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-end font-mono text-body text-semantic-success">
                        {formatCurrency(d.total_donated, "en")}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-end font-mono text-body text-accent-700">
                        {d.total_pledged > 0 ? formatCurrency(d.total_pledged, "en") : "—"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-end">
                        <IfPermission code="donors.create">
                          <Button size="sm" variant="ghost" onClick={() => openPledgeDialog(d.id, d.name)}>
                            <Plus className="h-3.5 w-3.5" />
                            Pledge
                          </Button>
                        </IfPermission>
                      </TableCell>
                    </TableRow>

                    {/* Expanded pledges row */}
                    {expandedDonorId === d.id && (
                      <TableRow className="bg-surface-hover">
                        <TableCell colSpan={5} className="px-8 py-3">
                          {pledges[d.id]?.length === 0 ? (
                            <p className="text-caption text-text-muted">No pledges for this donor.</p>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">Pledges</p>
                              {(pledges[d.id] ?? []).map((p) => (
                                <div key={p.id} className="flex items-center justify-between rounded-md border border-border-default bg-surface-card px-3 py-2">
                                  <div className="flex items-center gap-3">
                                    <Badge variant="outline" className={p.pledge_type === "zakat" ? "bg-accent-50 text-accent-700" : "bg-primary-50 text-primary-700"}>
                                      <span className="capitalize">{p.pledge_type}</span>
                                    </Badge>
                                    <span className="text-caption text-text-secondary capitalize">{p.frequency}</span>
                                    <span className="text-caption text-text-muted">From {formatDate(new Date(p.start_date), "en")}</span>
                                    {p.next_reminder && (
                                      <Badge variant="outline" className="bg-warning-50 text-semantic-warning">
                                        <CalendarDays className="h-3 w-3" />
                                        Reminder: {formatDate(new Date(p.next_reminder), "en")}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4 text-end">
                                    <div>
                                      <p className="text-caption text-text-muted">Promised</p>
                                      <p className="font-mono text-body font-bold text-accent-700">{formatCurrency(p.amount, "en")}</p>
                                    </div>
                                    <div>
                                      <p className="text-caption text-text-muted">Received</p>
                                      <p className="font-mono text-body font-bold text-semantic-success">{formatCurrency(p.amount_received, "en")}</p>
                                    </div>
                                    <Badge variant="outline" className={p.status === "active" ? "bg-success-50 text-semantic-success" : "bg-neutral-100 text-text-muted"}>
                                      {p.status}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ---------- Add Donor Dialog ---------- */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary-500" />
              Add Donor
            </DialogTitle>
            <DialogDescription>
              Create a new donor record. Pledges can be added later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="donor-name">Name (English) *</Label>
                <Input id="donor-name" placeholder="Omar Faruq" value={donorName} onChange={(e) => setDonorName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="donor-name-bn">নাম (বাংলা)</Label>
                <Input id="donor-name-bn" placeholder="ওমর ফারুক" value={donorNameBn} onChange={(e) => setDonorNameBn(e.target.value)} lang="bn" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="donor-phone">Phone</Label>
                <Input id="donor-phone" placeholder="+880 1XXX-XXXXXX" value={donorPhone} onChange={(e) => setDonorPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="donor-email">Email</Label>
                <Input id="donor-email" type="email" placeholder="donor@example.com" value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="donor-type">Donor Type</Label>
                <Select value={donorType} onValueChange={setDonorType}>
                  <SelectTrigger id="donor-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="zakat_donor">Zakat Donor</SelectItem>
                    <SelectItem value="sadaqah_donor">Sadaqah Donor</SelectItem>
                    <SelectItem value="one_time">One-time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="donor-address">Address</Label>
                <Input id="donor-address" placeholder="Dhaka, Bangladesh" value={donorAddress} onChange={(e) => setDonorAddress(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="donor-notes">Notes (optional)</Label>
              <Textarea id="donor-notes" placeholder="e.g. Donates every Ramadan" value={donorNotes} onChange={(e) => setDonorNotes(e.target.value)} rows={2} />
            </div>
            {addError && (
              <div role="alert" className="flex items-start gap-2 rounded-md border border-semantic-danger/40 bg-danger-50 px-3 py-2 text-caption text-semantic-danger">
                <AlertCircle className="h-4 w-4 shrink-0" /><span>{addError}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}><XCircle className="h-4 w-4" />Cancel</Button>
            <Button onClick={handleAddDonor} disabled={addSubmitting}>
              <Save className="h-4 w-4" />{addSubmitting ? "Adding…" : "Add Donor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Add Pledge Dialog ---------- */}
      <Dialog open={pledgeOpen} onOpenChange={setPledgeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent-500" />
              Add Pledge — {pledgeDonorName}
            </DialogTitle>
            <DialogDescription>
              Record a pledge (promise to donate). Track amount promised vs received.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pl-amount">Pledge Amount (BDT) *</Label>
                <Input id="pl-amount" type="number" min={1} placeholder="50000" value={pledgeAmount} onChange={(e) => setPledgeAmount(e.target.value)} className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pl-type">Pledge Type</Label>
                <Select value={pledgeType} onValueChange={setPledgeType}>
                  <SelectTrigger id="pl-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General (Non-Zakat)</SelectItem>
                    <SelectItem value="zakat">Zakat</SelectItem>
                    <SelectItem value="sadaqah">Sadaqah</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pl-freq">Frequency</Label>
                <Select value={pledgeFrequency} onValueChange={setPledgeFrequency}>
                  <SelectTrigger id="pl-freq" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One-time</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pl-start">Start Date</Label>
                <Input id="pl-start" type="date" value={pledgeStartDate} onChange={(e) => setPledgeStartDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pl-reminder">Next Reminder Date (optional)</Label>
              <Input id="pl-reminder" type="date" value={pledgeReminder} onChange={(e) => setPledgeReminder(e.target.value)} />
              <p className="text-caption text-text-muted">When to remind the donor about this pledge.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pl-notes">Notes (optional)</Label>
              <Textarea id="pl-notes" placeholder="e.g. Promised during Ramadan" value={pledgeNotes} onChange={(e) => setPledgeNotes(e.target.value)} rows={2} />
            </div>
            {pledgeError && (
              <div role="alert" className="flex items-start gap-2 rounded-md border border-semantic-danger/40 bg-danger-50 px-3 py-2 text-caption text-semantic-danger">
                <AlertCircle className="h-4 w-4 shrink-0" /><span>{pledgeError}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPledgeOpen(false)}><XCircle className="h-4 w-4" />Cancel</Button>
            <Button onClick={handleAddPledge} disabled={pledgeSubmitting}>
              <Save className="h-4 w-4" />{pledgeSubmitting ? "Creating…" : "Create Pledge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
