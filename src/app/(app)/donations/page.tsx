"use client";

/**
 * MadrashaOS — Donations Page (redesigned for real-world madrasha use)
 *
 * Route: /donations
 *
 * Features:
 *   - Real API data (GET /api/v1/donations) — no more mock data
 *   - Summary cards: Total (this year), Zakat total, Sadaqah total, General total
 *   - Filter tabs: All | Zakat | Sadaqah | General (non-zakat)
 *   - Search by donor name
 *   - Add Donation dialog (POST /api/v1/donations) with:
 *     * Donor name (or Anonymous)
 *     * Amount + Type (Zakat/Sadaqah/General)
 *     * Method (Cash/Bank/Mobile) + Account
 *     * Date + Notes
 *   - Table: Date, Donor, Type badge, Amount, Method, Status
 *   - Clear separation of zakat vs non-zakat funds
 */

import * as React from "react";
import {
  Heart, Plus, Search, Save, XCircle, AlertCircle,
  CheckCircle2, ShieldCheck, ChevronsUpDown, UserPlus,
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
import { LoadingState, ErrorState, PermissionDenied } from "@/components/states";
import { EmptyState } from "@/components/ui/empty-state";
import { useSessionStore } from "@/stores/sessionStore";
import { useAccounts, queryClient } from "@/lib/query/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/i18n/format";
import { useRouter } from "next/navigation";

type Donor = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  donor_type?: string | null;
};

type Donation = {
  id: string;
  donor_name: string | null;
  amount: number;
  donation_type: string;
  fund: string;
  donation_date: string;
  receipt_no: string | null;
  is_anonymous: boolean;
  status: string;
  payment_method: string | null;
  note: string | null;
  confirmed_by: string | null;
};

type TabFilter = "all" | "zakat" | "sadaqah" | "general";

const TAB_LABELS: Record<TabFilter, string> = {
  all: "All Donations",
  zakat: "Zakat",
  sadaqah: "Sadaqah",
  general: "General (Non-Zakat)",
};

const TYPE_BADGE: Record<string, string> = {
  zakat: "bg-accent-50 text-accent-700",
  sadaqah: "bg-success-50 text-semantic-success",
  general: "bg-primary-50 text-primary-700",
};

export default function DonationsPage() {
  const router = useRouter();
  const { hasPermission } = useSessionStore();
  const { toast } = useToast();
  const { data: accounts } = useAccounts();

  const [donations, setDonations] = React.useState<Donation[]>([]);
  const [summary, setSummary] = React.useState({
    total_confirmed_amount: 0,
    zakat_total: 0,
    general_total: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [tab, setTab] = React.useState<TabFilter>("all");
  const [search, setSearch] = React.useState("");

  // Add donation dialog
  const [addOpen, setAddOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [selectedDonorId, setSelectedDonorId] = React.useState("");
  const [donorName, setDonorName] = React.useState("");
  const [donorPhone, setDonorPhone] = React.useState("");
  const [donorEmail, setDonorEmail] = React.useState("");
  const [donorSearch, setDonorSearch] = React.useState("");
  const [donors, setDonors] = React.useState<Donor[]>([]);
  const [donorsLoading, setDonorsLoading] = React.useState(false);
  const [donAmount, setDonAmount] = React.useState("");
  const [donType, setDonType] = React.useState("general");
  const [donMethod, setDonMethod] = React.useState("cash");
  const [donAccountId, setDonAccountId] = React.useState("");
  const [donDate, setDonDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [donNotes, setDonNotes] = React.useState("");
  const [donAnonymous, setDonAnonymous] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const canView = hasPermission("donations.view");

  const assetAccounts = ((accounts ?? []) as Array<Record<string, unknown>>)
    .filter((a) => a.type === "asset");

  // Fetch donations from the API
  const fetchDonations = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/v1/donations?pageSize=100");
      const data = await res.json().catch(() => ({}));
      setDonations((data?.data ?? []) as Donation[]);
      if (data?.summary) {
        setSummary(data.summary);
      }
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  // Filter by tab + search
  const filtered = React.useMemo(() => {
    let list = donations;
    if (tab !== "all") {
      list = list.filter((d) => d.donation_type === tab);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((d) => (d.donor_name ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [donations, tab, search]);

  // Zakat vs non-zakat totals for summary
  const zakatTotal = summary.zakat_total || 0;
  const nonZakatTotal = summary.general_total || 0;
  const grandTotal = summary.total_confirmed_amount || 0;

  // Fetch donors for the searchable dropdown (called when dialog opens)
  const fetchDonors = React.useCallback(async () => {
    setDonorsLoading(true);
    try {
      const res = await fetch("/api/v1/donors?pageSize=500");
      const data = await res.json().catch(() => ({}));
      setDonors((data?.data ?? []) as Donor[]);
    } catch {
      setDonors([]);
    }
    setDonorsLoading(false);
  }, []);

  function openAddDialog() {
    setSelectedDonorId("");
    setDonorName(""); setDonorPhone(""); setDonorEmail(""); setDonorSearch("");
    setDonAmount("");
    setDonType("general"); setDonMethod("cash"); setDonAccountId("");
    setDonDate(new Date().toISOString().slice(0, 10));
    setDonNotes(""); setDonAnonymous(false); setFormError(null);
    setAddOpen(true);
    // Lazy-load donors list if not already loaded
    if (donors.length === 0) fetchDonors();
  }

  // When a donor is selected from the dropdown, sync the name + phone + email fields
  function selectDonor(donorId: string) {
    setSelectedDonorId(donorId);
    const d = donors.find((x) => x.id === donorId);
    if (d) {
      setDonorName(d.name);
      setDonorPhone(d.phone ?? "");
      setDonorEmail(d.email ?? "");
      setDonorSearch(d.name);
    }
  }

  // Filtered donors for the dropdown (by search query)
  const filteredDonors = React.useMemo(() => {
    if (!donorSearch.trim()) return donors;
    const q = donorSearch.trim().toLowerCase();
    return donors.filter((d) =>
      d.name.toLowerCase().includes(q) ||
      (d.phone ?? "").toLowerCase().includes(q) ||
      (d.email ?? "").toLowerCase().includes(q),
    );
  }, [donors, donorSearch]);

  async function handleAddDonation() {
    setFormError(null);
    const amount = Number(donAmount) || 0;
    if (amount <= 0) {
      setFormError("Amount must be greater than 0.");
      return;
    }
    if (!donAnonymous && !donorName.trim()) {
      setFormError("Please select a donor from the list (or check Anonymous).");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          donor_name: donAnonymous ? null : donorName.trim(),
          donor_phone: donorPhone.trim() || undefined,
          donor_email: donorEmail.trim() || undefined,
          amount,
          donation_type: donType,
          account_id: donAccountId || undefined,
          donation_date: donDate,
          note: donNotes.trim() || undefined,
          is_anonymous: donAnonymous,
          payment_method: donMethod,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data?.error || `Failed (HTTP ${res.status})`);
        setSubmitting(false);
        return;
      }
      toast({
        title: "Donation recorded",
        description: `${formatCurrency(amount, "en")} — ${donType}${donAnonymous ? " (Anonymous)" : donorName ? ` from ${donorName}` : ""}`,
      });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["ledger-entries"] });
      fetchDonations();
      setAddOpen(false);
    } catch {
      setFormError("Network error — please try again.");
    }
    setSubmitting(false);
  }

  if (!canView) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <PermissionDenied resource="Donations" />
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
              Donations
            </h1>
            <p className="mt-1 text-body text-text-secondary">
              Track all donations with clear separation of Zakat and Non-Zakat funds.
            </p>
          </div>
          <IfPermission code="donations.create">
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4" />
              Add Donation
            </Button>
          </IfPermission>
        </header>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border-2 border-accent-200 bg-accent-50 p-4">
            <p className="text-caption font-medium uppercase tracking-wider text-accent-700">
              Zakat Fund (Received)
            </p>
            <p className="mt-1 font-mono text-display font-bold text-accent-700">
              {formatCurrency(zakatTotal, "en")}
            </p>
            <p className="mt-1 text-caption text-accent-600">Sacred — never mixed with general funds</p>
          </div>
          <div className="rounded-lg border-2 border-primary-200 bg-primary-50 p-4">
            <p className="text-caption font-medium uppercase tracking-wider text-primary-600">
              Non-Zakat (General + Sadaqah)
            </p>
            <p className="mt-1 font-mono text-display font-bold text-primary-700">
              {formatCurrency(nonZakatTotal, "en")}
            </p>
            <p className="mt-1 text-caption text-primary-600">Used for general madrasha expenses</p>
          </div>
          <div className="rounded-lg border border-border-default bg-surface-card p-4">
            <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
              Total Donations (Confirmed)
            </p>
            <p className="mt-1 font-mono text-display font-bold text-text-primary">
              {formatCurrency(grandTotal, "en")}
            </p>
            <p className="mt-1 text-caption text-text-muted">{donations.length} donation(s) total</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {(["all", "zakat", "sadaqah", "general"] as TabFilter[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-caption font-medium transition-colors ${
                tab === t
                  ? "bg-primary-500 text-primary-foreground"
                  : "bg-neutral-100 text-text-secondary hover:bg-surface-hover"
              }`}
            >
              {TAB_LABELS[t]}
              <span className="ms-1 opacity-70">
                ({t === "all" ? donations.length : donations.filter((d) => d.donation_type === t).length})
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            placeholder="Search by donor name…"
            className="ps-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Body */}
        {loading && <LoadingState pattern="table" rows={5} />}
        {error && <ErrorState onRetry={fetchDonations} />}

        {!loading && !error && filtered.length === 0 && (
          <EmptyState
            illustration="fees"
            title="No donations found"
            description={search ? `No matches for "${search}".` : "No donations recorded yet. Click 'Add Donation' to record one."}
          />
        )}

        {/* Donations table */}
        {!loading && !error && filtered.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border-default bg-surface-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                  <TableHead className="px-4">Date</TableHead>
                  <TableHead className="px-4">Donor</TableHead>
                  <TableHead className="px-4">Type</TableHead>
                  <TableHead className="px-4 text-end">Amount</TableHead>
                  <TableHead className="px-4">Method</TableHead>
                  <TableHead className="px-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => (
                  <TableRow key={d.id} className="hover:bg-surface-hover">
                    <TableCell className="px-4 py-3 text-caption text-text-secondary">
                      {formatDate(new Date(d.donation_date), "en")}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div>
                        <p className="text-body font-medium text-text-primary">
                          {d.donor_name || "Anonymous"}
                        </p>
                        {d.note && (
                          <p className="text-caption text-text-muted truncate max-w-xs">{d.note}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge variant="outline" className={TYPE_BADGE[d.donation_type] ?? ""}>
                        <span className="capitalize">{d.donation_type}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-end font-mono text-body font-bold text-text-primary">
                      {formatCurrency(d.amount, "en")}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-caption text-text-secondary capitalize">
                      {d.payment_method || "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {d.status === "confirmed" ? (
                        <Badge variant="outline" className="bg-success-50 text-semantic-success">
                          <CheckCircle2 className="h-3 w-3" />
                          Confirmed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-warning-50 text-semantic-warning">
                          <ShieldCheck className="h-3 w-3" />
                          {d.status}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ---------- Add Donation Dialog ---------- */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary-500" />
              Add Donation
            </DialogTitle>
            <DialogDescription>
              Record a donation. Zakat donations go to the Zakat fund;
              all others go to the General fund.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Donor — searchable dropdown + Anonymous toggle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="don-search">Donor *</Label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={donAnonymous}
                    onChange={(e) => setDonAnonymous(e.target.checked)}
                    className="h-4 w-4 rounded border-border-default"
                  />
                  <span className="text-caption text-text-secondary">Anonymous</span>
                </label>
              </div>
              {donAnonymous ? (
                <div className="rounded-md border border-dashed border-border-default bg-surface-hover px-3 py-2 text-caption text-text-muted">
                  Donation will be recorded as Anonymous (no donor linked).
                </div>
              ) : (
                <DonorCombobox
                  donors={filteredDonors}
                  loading={donorsLoading}
                  selectedId={selectedDonorId}
                  search={donorSearch}
                  onSearchChange={setDonorSearch}
                  onSelect={selectDonor}
                  onAddNew={() => {
                    setAddOpen(false);
                    router.push("/donors");
                  }}
                />
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="don-phone">Donor Phone (optional)</Label>
              <Input
                id="don-phone"
                placeholder="+880 1XXX-XXXXXX"
                value={donorPhone}
                onChange={(e) => setDonorPhone(e.target.value)}
              />
            </div>

            {/* Amount + Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="don-amount">Amount (BDT) *</Label>
                <Input
                  id="don-amount"
                  type="number"
                  min={1}
                  placeholder="5000"
                  value={donAmount}
                  onChange={(e) => setDonAmount(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="don-type">Donation Type *</Label>
                <Select value={donType} onValueChange={setDonType}>
                  <SelectTrigger id="don-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General (Non-Zakat)</SelectItem>
                    <SelectItem value="sadaqah">Sadaqah (Non-Zakat)</SelectItem>
                    <SelectItem value="zakat">Zakat (Sacred Fund)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {donType === "zakat" && (
              <div className="rounded-md border border-accent-200 bg-accent-50 px-3 py-2 text-caption text-accent-700">
                ⚠️ This donation will be posted to the Zakat fund. Zakat money is sacred and must only be distributed to eligible recipients.
              </div>
            )}

            {/* Method + Account */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="don-method">Payment Method</Label>
                <Select value={donMethod} onValueChange={setDonMethod}>
                  <SelectTrigger id="don-method" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="mobile">Mobile (bKash/etc.)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="don-account">Received Into</Label>
                <Select value={donAccountId} onValueChange={setDonAccountId}>
                  <SelectTrigger id="don-account" className="w-full">
                    <SelectValue placeholder="Auto-select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Auto-select</SelectItem>
                    {assetAccounts.map((a) => (
                      <SelectItem key={a.id as string} value={a.id as string}>
                        {a.name as string}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="don-date">Date</Label>
              <Input id="don-date" type="date" value={donDate} onChange={(e) => setDonDate(e.target.value)} />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="don-notes">Notes (optional)</Label>
              <Textarea
                id="don-notes"
                placeholder="e.g. Cash donation during Ramadan"
                value={donNotes}
                onChange={(e) => setDonNotes(e.target.value)}
                rows={2}
              />
            </div>

            {formError && (
              <div role="alert" className="flex items-start gap-2 rounded-md border border-semantic-danger/40 bg-danger-50 px-3 py-2 text-caption text-semantic-danger">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              <XCircle className="h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleAddDonation} disabled={submitting}>
              <Save className="h-4 w-4" />
              {submitting ? "Saving…" : "Record Donation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ----------------------------------------------------------------
 * DonorCombobox — searchable dropdown for selecting an existing donor.
 *
 * - Type to filter by name / phone / email
 * - Click a result to select (syncs name + phone into the parent form)
 * - "Add new donor" link at the bottom routes to /donors
 * - Shows the selected donor's name as a chip when picked
 * ---------------------------------------------------------------- */
function DonorCombobox({
  donors,
  loading,
  selectedId,
  search,
  onSearchChange,
  onSelect,
  onAddNew,
}: {
  donors: Donor[];
  loading: boolean;
  selectedId: string;
  search: string;
  onSearchChange: (v: string) => void;
  onSelect: (donorId: string) => void;
  onAddNew: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const selectedDonor = donors.find((d) => d.id === selectedId);

  return (
    <div className="relative">
      {/* Search input / selected chip */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <Input
          ref={inputRef}
          id="don-search"
          placeholder="Search donor by name, phone, or email…"
          className="ps-9 pe-9"
          value={selectedDonor ? selectedDonor.name : search}
          onChange={(e) => {
            onSearchChange(e.target.value);
            if (selectedId) onSelect(""); // clear selection when user types
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          aria-label="Search donor"
        />
        <ChevronsUpDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border-default bg-surface-card shadow-lg">
          {loading && (
            <div className="px-3 py-4 text-center text-caption text-text-muted">
              Loading donors…
            </div>
          )}
          {!loading && donors.length === 0 && (
            <div className="px-3 py-4 text-center">
              <p className="text-caption text-text-secondary">
                {search.trim()
                  ? `No donors match "${search.trim()}".`
                  : "No donors found yet."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onAddNew();
                }}
                className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary-500 px-3 py-1.5 text-caption font-medium text-primary-foreground hover:bg-primary-600"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Add new donor
              </button>
            </div>
          )}
          {!loading &&
            donors.slice(0, 50).map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  onSelect(d.id);
                  setOpen(false);
                  inputRef.current?.blur();
                }}
                className={`flex w-full items-center justify-between border-b border-border-default px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-surface-hover ${
                  d.id === selectedId ? "bg-primary-50" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-medium text-text-primary">{d.name}</p>
                  {(d.phone || d.email) && (
                    <p className="truncate text-caption text-text-muted">
                      {[d.phone, d.email].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                {d.donor_type && d.donor_type !== "regular" && (
                  <span className="ms-2 shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium capitalize text-text-secondary">
                    {d.donor_type.replace("_", " ")}
                  </span>
                )}
                {d.id === selectedId && (
                  <CheckCircle2 className="ms-2 h-4 w-4 shrink-0 text-semantic-success" />
                )}
              </button>
            ))}
          {!loading && donors.length > 50 && (
            <div className="border-t border-border-default px-3 py-2 text-center text-caption text-text-muted">
              Showing first 50 — refine your search to see more.
            </div>
          )}
          {!loading && donors.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onAddNew();
              }}
              className="flex w-full items-center gap-2 border-t-2 border-border-default bg-surface-hover px-3 py-2 text-left text-caption font-medium text-primary-600 hover:bg-primary-50"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add new donor…
            </button>
          )}
        </div>
      )}
    </div>
  );
}
