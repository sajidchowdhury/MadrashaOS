"use client";

/**
 * MadrashaOS — Zakat Management (redesigned for real-world use)
 *
 * Route: /zakat
 *
 * Real API data (GET /api/v1/zakat) — no more mock data.
 *
 * Features:
 *   - Prominent balance display: Zakat Balance = Received − Distributed
 *   - Two sections: Received (incoming) + Distributed (outgoing)
 *   - "Receive Zakat" button → POST /api/v1/zakat/receive
 *   - "Distribute Zakat" button → POST /api/v1/zakat/distribute
 *   - Fund isolation warning if trying to distribute more than balance
 *   - Each transaction shows: date, donor/recipient, amount, purpose, handler
 *   - Search + filter by direction (receive/distribute)
 *
 * Fund isolation is sacred: Zakat money is NEVER mixed with general funds.
 */

import * as React from "react";
import {
  Scale, ArrowDownToLine, ArrowUpFromLine, Search, Save, XCircle,
  AlertCircle, CheckCircle2, ShieldAlert,
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
import { useStudents, queryClient } from "@/lib/query/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/i18n/format";

type ZakatTransaction = {
  id: string;
  voucher_no: string | null;
  receipt_no: string | null;
  direction: string; // receive | distribute
  amount: number;
  transaction_date: string;
  narration: string | null;
  purpose: string | null;
  recipient_name: string | null;
  donor_name: string | null;
  handled_by: string | null;
  account: { id: string; name: string; code: string } | null;
  student: { id: string; name: string; code: string } | null;
};

type ZakatSummary = {
  zakat_fund_balance: number;
  total_received: number;
  total_distributed: number;
  net_balance: number;
  transaction_count: number;
};

type ZakatAccount = {
  id: string;
  code: string;
  name: string;
  balance: number;
};

const PURPOSE_LABELS: Record<string, string> = {
  education: "Education",
  food: "Food",
  medical: "Medical",
  shelter: "Shelter",
  other: "Other",
};

export default function ZakatPage() {
  const { hasPermission } = useSessionStore();
  const { toast } = useToast();
  const { data: students } = useStudents();

  const [transactions, setTransactions] = React.useState<ZakatTransaction[]>([]);
  const [summary, setSummary] = React.useState<ZakatSummary>({
    zakat_fund_balance: 0, total_received: 0, total_distributed: 0, net_balance: 0, transaction_count: 0,
  });
  const [zakatAccounts, setZakatAccounts] = React.useState<ZakatAccount[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [filterDir, setFilterDir] = React.useState<string>("all");

  // Receive dialog
  const [receiveOpen, setReceiveOpen] = React.useState(false);
  const [receiveSubmitting, setReceiveSubmitting] = React.useState(false);
  const [receiveAmount, setReceiveAmount] = React.useState("");
  const [receiveDonor, setReceiveDonor] = React.useState("");
  const [receiveAccountId, setReceiveAccountId] = React.useState("");
  const [receiveDate, setReceiveDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [receiveNotes, setReceiveNotes] = React.useState("");
  const [receiveError, setReceiveError] = React.useState<string | null>(null);

  // Distribute dialog
  const [distributeOpen, setDistributeOpen] = React.useState(false);
  const [distributeSubmitting, setDistributeSubmitting] = React.useState(false);
  const [distributeAmount, setDistributeAmount] = React.useState("");
  const [distributeRecipient, setDistributeRecipient] = React.useState("");
  const [distributeStudentId, setDistributeStudentId] = React.useState("");
  const [distributeAccountId, setDistributeAccountId] = React.useState("");
  const [distributeDate, setDistributeDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [distributePurpose, setDistributePurpose] = React.useState("education");
  const [distributeNotes, setDistributeNotes] = React.useState("");
  const [distributeError, setDistributeError] = React.useState<string | null>(null);

  const canView = hasPermission("zakat.view");
  const studentList = (students ?? []) as Array<{ id: string; name: string; code: string }>;

  // Fetch zakat data from the API
  const fetchZakat = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/v1/zakat?pageSize=100");
      const data = await res.json().catch(() => ({}));
      setTransactions((data?.transactions ?? []) as ZakatTransaction[]);
      if (data?.summary) setSummary(data.summary as ZakatSummary);
      setZakatAccounts((data?.zakat_accounts ?? []) as ZakatAccount[]);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    fetchZakat();
  }, [fetchZakat]);

  // Filtered transactions
  const filtered = React.useMemo(() => {
    let list = transactions;
    if (filterDir !== "all") {
      list = list.filter((t) => t.direction === filterDir);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((t) =>
        (t.donor_name ?? "").toLowerCase().includes(q) ||
        (t.recipient_name ?? "").toLowerCase().includes(q) ||
        (t.narration ?? "").toLowerCase().includes(q) ||
        (t.student?.name ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [transactions, filterDir, search]);

  const receivedList = filtered.filter((t) => t.direction === "receive");
  const distributedList = filtered.filter((t) => t.direction === "distribute");

  // --- Receive Zakat handler ---
  function openReceiveDialog() {
    setReceiveAmount(""); setReceiveDonor(""); setReceiveAccountId(
      zakatAccounts[0]?.id ?? ""
    );
    setReceiveDate(new Date().toISOString().slice(0, 10));
    setReceiveNotes(""); setReceiveError(null);
    setReceiveOpen(true);
  }

  async function handleReceive() {
    setReceiveError(null);
    const amount = Number(receiveAmount) || 0;
    if (amount <= 0) { setReceiveError("Amount must be greater than 0."); return; }
    if (!receiveAccountId) { setReceiveError("No Zakat fund account found. Create an asset account with fund='zakat' first."); return; }
    setReceiveSubmitting(true);
    try {
      const res = await fetch("/api/v1/zakat/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: receiveAccountId,
          amount,
          donor_name: receiveDonor.trim() || undefined,
          transaction_date: receiveDate,
          narration: receiveNotes.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setReceiveError(data?.error || `Failed (HTTP ${res.status})`); setReceiveSubmitting(false); return; }
      toast({ title: "Zakat received", description: `${formatCurrency(amount, "en")}${receiveDonor ? ` from ${receiveDonor}` : ""}` });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["ledger-entries"] });
      fetchZakat();
      setReceiveOpen(false);
    } catch { setReceiveError("Network error — please try again."); }
    setReceiveSubmitting(false);
  }

  // --- Distribute Zakat handler ---
  function openDistributeDialog() {
    if (summary.net_balance <= 0) {
      toast({ title: "Cannot distribute", description: `Zakat fund balance is ৳${summary.net_balance}. No funds available to distribute.`, variant: "destructive" });
      return;
    }
    setDistributeAmount(""); setDistributeRecipient(""); setDistributeStudentId("");
    setDistributeAccountId(zakatAccounts[0]?.id ?? "");
    setDistributeDate(new Date().toISOString().slice(0, 10));
    setDistributePurpose("education"); setDistributeNotes(""); setDistributeError(null);
    setDistributeOpen(true);
  }

  async function handleDistribute() {
    setDistributeError(null);
    const amount = Number(distributeAmount) || 0;
    if (amount <= 0) { setDistributeError("Amount must be greater than 0."); return; }
    if (amount > summary.net_balance) {
      setDistributeError(`Amount exceeds available Zakat balance (৳${summary.net_balance.toLocaleString()}). Zakat fund is sacred — you cannot distribute more than what has been received.`);
      return;
    }
    if (!distributeAccountId) { setDistributeError("No Zakat fund account found."); return; }
    if (!distributeRecipient.trim() && !distributeStudentId) {
      setDistributeError("Please enter a recipient name or select a student.");
      return;
    }
    setDistributeSubmitting(true);
    try {
      const res = await fetch("/api/v1/zakat/distribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: distributeAccountId,
          amount,
          student_id: distributeStudentId || undefined,
          recipient_name: distributeRecipient.trim() || undefined,
          transaction_date: distributeDate,
          purpose: distributePurpose,
          narration: distributeNotes.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setDistributeError(data?.error || `Failed (HTTP ${res.status})`); setDistributeSubmitting(false); return; }
      toast({ title: "Zakat distributed", description: `${formatCurrency(amount, "en")} to ${distributeRecipient || "recipient"}` });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["ledger-entries"] });
      fetchZakat();
      setDistributeOpen(false);
    } catch { setDistributeError("Network error — please try again."); }
    setDistributeSubmitting(false);
  }

  if (!canView) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <PermissionDenied resource="Zakat" />
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
              <Scale className="h-7 w-7 text-accent-500" aria-hidden />
              Zakat Management
            </h1>
            <p className="mt-1 text-body text-text-secondary">
              Track Zakat received and distributed. Fund is sacred — never mixed with general funds.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <IfPermission code="zakat.receive">
              <Button onClick={openReceiveDialog} className="bg-accent-600 hover:bg-accent-700">
                <ArrowDownToLine className="h-4 w-4" />
                Receive Zakat
              </Button>
            </IfPermission>
            <IfPermission code="zakat.distribute">
              <Button onClick={openDistributeDialog} variant="outline">
                <ArrowUpFromLine className="h-4 w-4" />
                Distribute Zakat
              </Button>
            </IfPermission>
          </div>
        </header>

        {/* Balance display — prominent */}
        <div className="rounded-xl border-2 border-accent-300 bg-accent-50 p-6 text-center">
          <p className="text-caption font-medium uppercase tracking-wider text-accent-700">
            Zakat Fund Balance
          </p>
          <p className="mt-2 font-mono text-3xl font-bold text-accent-700 sm:text-4xl">
            {formatCurrency(summary.net_balance, "en")}
          </p>
          <div className="mt-3 flex justify-center gap-6 text-caption text-accent-600">
            <span>Received: <strong className="font-mono">{formatCurrency(summary.total_received, "en")}</strong></span>
            <span>Distributed: <strong className="font-mono">{formatCurrency(summary.total_distributed, "en")}</strong></span>
          </div>
          {summary.net_balance <= 0 && (
            <p className="mt-2 text-caption text-semantic-danger flex items-center justify-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5" />
              No funds available for distribution
            </p>
          )}
        </div>

        {/* Search + filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              placeholder="Search by donor, recipient, or narration…"
              className="ps-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterDir} onValueChange={setFilterDir}>
            <SelectTrigger className="w-full sm:w-40" aria-label="Filter by direction">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All transactions</SelectItem>
              <SelectItem value="receive">Received only</SelectItem>
              <SelectItem value="distribute">Distributed only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Body */}
        {loading && <LoadingState pattern="table" rows={5} />}
        {error && <ErrorState onRetry={fetchZakat} />}

        {!loading && !error && filtered.length === 0 && (
          <EmptyState
            illustration="fees"
            title="No Zakat transactions"
            description="No transactions found. Use 'Receive Zakat' to record incoming zakat."
          />
        )}

        {/* Transactions table */}
        {!loading && !error && filtered.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border-default bg-surface-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                  <TableHead className="px-4">Date</TableHead>
                  <TableHead className="px-4">Direction</TableHead>
                  <TableHead className="px-4">Donor / Recipient</TableHead>
                  <TableHead className="px-4">Purpose</TableHead>
                  <TableHead className="px-4 text-end">Amount</TableHead>
                  <TableHead className="px-4">Handled By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id} className="hover:bg-surface-hover">
                    <TableCell className="px-4 py-3 text-caption text-text-secondary">
                      {formatDate(new Date(t.transaction_date), "en")}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {t.direction === "receive" ? (
                        <Badge variant="outline" className="bg-success-50 text-semantic-success">
                          <ArrowDownToLine className="h-3 w-3" />
                          Received
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-danger-50 text-semantic-danger">
                          <ArrowUpFromLine className="h-3 w-3" />
                          Distributed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <p className="text-body font-medium text-text-primary">
                        {t.direction === "receive"
                          ? (t.donor_name || "Anonymous")
                          : (t.recipient_name || t.student?.name || "—")}
                      </p>
                      {t.narration && (
                        <p className="text-caption text-text-muted truncate max-w-xs">{t.narration}</p>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-caption text-text-secondary">
                      {t.purpose ? (PURPOSE_LABELS[t.purpose] ?? t.purpose) : "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-end font-mono text-body font-bold">
                      <span className={t.direction === "receive" ? "text-semantic-success" : "text-semantic-danger"}>
                        {t.direction === "receive" ? "+" : "−"}{formatCurrency(t.amount, "en")}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-caption text-text-secondary">
                      {t.handled_by || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Summary stats */}
        {!loading && !error && filtered.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border-default bg-surface-card p-3 text-center">
              <p className="text-caption uppercase text-text-muted">Received</p>
              <p className="mt-1 font-mono text-body font-bold text-semantic-success">
                {formatCurrency(summary.total_received, "en")}
              </p>
            </div>
            <div className="rounded-lg border border-border-default bg-surface-card p-3 text-center">
              <p className="text-caption uppercase text-text-muted">Distributed</p>
              <p className="mt-1 font-mono text-body font-bold text-semantic-danger">
                {formatCurrency(summary.total_distributed, "en")}
              </p>
            </div>
            <div className="rounded-lg border-2 border-accent-300 bg-accent-50 p-3 text-center">
              <p className="text-caption uppercase text-accent-700">Net Balance</p>
              <p className="mt-1 font-mono text-body font-bold text-accent-700">
                {formatCurrency(summary.net_balance, "en")}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ---------- Receive Zakat Dialog ---------- */}
      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5 text-semantic-success" />
              Receive Zakat
            </DialogTitle>
            <DialogDescription>
              Record incoming Zakat. This will be posted to the Zakat fund (sacred, never mixed with general funds).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rcv-zakat-amount">Amount (BDT) *</Label>
              <Input id="rcv-zakat-amount" type="number" min={1} placeholder="5000" value={receiveAmount} onChange={(e) => setReceiveAmount(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rcv-zakat-donor">Donor Name (optional)</Label>
              <Input id="rcv-zakat-donor" placeholder="Omar Faruq" value={receiveDonor} onChange={(e) => setReceiveDonor(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rcv-zakat-date">Date</Label>
                <Input id="rcv-zakat-date" type="date" value={receiveDate} onChange={(e) => setReceiveDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rcv-zakat-account">Zakat Account</Label>
                <Select value={receiveAccountId} onValueChange={setReceiveAccountId}>
                  <SelectTrigger id="rcv-zakat-account" className="w-full">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {zakatAccounts.length === 0 && (
                      <div className="px-3 py-2 text-caption text-text-muted">
                        No Zakat fund account. Create an asset account with fund='zakat'.
                      </div>
                    )}
                    {zakatAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rcv-zakat-notes">Notes (optional)</Label>
              <Textarea id="rcv-zakat-notes" placeholder="e.g. Ramadan zakat collection" value={receiveNotes} onChange={(e) => setReceiveNotes(e.target.value)} rows={2} />
            </div>
            {receiveError && (
              <div role="alert" className="flex items-start gap-2 rounded-md border border-semantic-danger/40 bg-danger-50 px-3 py-2 text-caption text-semantic-danger">
                <AlertCircle className="h-4 w-4 shrink-0" /><span>{receiveError}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveOpen(false)}><XCircle className="h-4 w-4" />Cancel</Button>
            <Button onClick={handleReceive} disabled={receiveSubmitting} className="bg-semantic-success hover:bg-semantic-success/90">
              <Save className="h-4 w-4" />{receiveSubmitting ? "Saving…" : "Receive Zakat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Distribute Zakat Dialog ---------- */}
      <Dialog open={distributeOpen} onOpenChange={setDistributeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpFromLine className="h-5 w-5 text-semantic-danger" />
              Distribute Zakat
            </DialogTitle>
            <DialogDescription>
              Distribute Zakat to an eligible recipient. Available balance: {formatCurrency(summary.net_balance, "en")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="dist-zakat-amount">Amount (BDT) *</Label>
              <Input id="dist-zakat-amount" type="number" min={1} max={summary.net_balance} placeholder="2000" value={distributeAmount} onChange={(e) => setDistributeAmount(e.target.value)} className="font-mono" />
              <p className="text-caption text-text-muted">Available: {formatCurrency(summary.net_balance, "en")}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dist-zakat-recipient">Recipient Name *</Label>
              <Input id="dist-zakat-recipient" placeholder="Poor/needy person name" value={distributeRecipient} onChange={(e) => setDistributeRecipient(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dist-zakat-student">Or Select Student (optional)</Label>
              <Select value={distributeStudentId} onValueChange={setDistributeStudentId}>
                <SelectTrigger id="dist-zakat-student" className="w-full">
                  <SelectValue placeholder="Select student (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {studentList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dist-zakat-purpose">Purpose</Label>
                <Select value={distributePurpose} onValueChange={setDistributePurpose}>
                  <SelectTrigger id="dist-zakat-purpose" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="food">Food</SelectItem>
                    <SelectItem value="medical">Medical</SelectItem>
                    <SelectItem value="shelter">Shelter</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dist-zakat-date">Date</Label>
                <Input id="dist-zakat-date" type="date" value={distributeDate} onChange={(e) => setDistributeDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dist-zakat-notes">Notes (optional)</Label>
              <Textarea id="dist-zakat-notes" placeholder="e.g. Zakat for education of needy student" value={distributeNotes} onChange={(e) => setDistributeNotes(e.target.value)} rows={2} />
            </div>
            {distributeError && (
              <div role="alert" className="flex items-start gap-2 rounded-md border border-semantic-danger/40 bg-danger-50 px-3 py-2 text-caption text-semantic-danger">
                <AlertCircle className="h-4 w-4 shrink-0" /><span>{distributeError}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDistributeOpen(false)}><XCircle className="h-4 w-4" />Cancel</Button>
            <Button onClick={handleDistribute} disabled={distributeSubmitting} variant="destructive">
              <Save className="h-4 w-4" />{distributeSubmitting ? "Distributing…" : "Distribute Zakat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
