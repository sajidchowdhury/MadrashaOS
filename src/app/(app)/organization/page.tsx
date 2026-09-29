"use client";

/**
 * MadrashaOS — Organization & Multi-Branch list (C3.1 / Foundation screen 1)
 *
 * Shows the organization (Darul Uloom Madrasha) with its 3 branches as
 * cards. Each branch card displays name (bn/en), address, phone,
 * established year, plus a "branch.scope" visual indicator badge.
 *
 * The "Add Branch" button is gated by IfPermission code="organization.branch.create"
 * per Risk R3 (hide unauthorized UI; server still enforces).
 *
 * Loading + error states use the shared LoadingState / ErrorState components
 * from src/components/states (per project rules).
 */

import * as React from "react";
import { Building2, Plus, MapPin, CalendarDays, Save, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { IfPermission } from "@/components/auth/IfPermission";
import { LoadingState, ErrorState } from "@/components/states";
import { SectionCard, SectionCardHeader } from "@/components/foundation/SectionCard";
import { BranchCard } from "@/components/foundation/BranchCard";
import { useOrganization, useBranches, queryClient } from "@/lib/query/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { convertDigits } from "@/lib/i18n/format";

export default function OrganizationPage() {
  const { locale } = useI18n();
  const { toast } = useToast();
  const {
    data: org,
    isLoading: orgLoading,
    isError: orgError,
    refetch: orgRefetch,
  } = useOrganization();
  const {
    data: branches,
    isLoading: branchesLoading,
    isError: branchesError,
    refetch: branchesRefetch,
  } = useBranches();

  // --- Add Branch dialog state ---
  const [addBranchOpen, setAddBranchOpen] = React.useState(false);
  const [addBranchSubmitting, setAddBranchSubmitting] = React.useState(false);
  const [addBranchError, setAddBranchError] = React.useState<string | null>(null);
  const [brCode, setBrCode] = React.useState("");
  const [brName, setBrName] = React.useState("");
  const [brNameBn, setBrNameBn] = React.useState("");
  const [brAddress, setBrAddress] = React.useState("");
  const [brPhone, setBrPhone] = React.useState("");
  const [brEmail, setBrEmail] = React.useState("");
  const [brYear, setBrYear] = React.useState("");

  function openAddBranchDialog() {
    setBrCode("");
    setBrName("");
    setBrNameBn("");
    setBrAddress("");
    setBrPhone("");
    setBrEmail("");
    setBrYear("");
    setAddBranchError(null);
    setAddBranchOpen(true);
  }

  async function handleAddBranch() {
    setAddBranchError(null);
    if (!brCode.trim() || !brName.trim()) {
      setAddBranchError("Branch code and name (English) are required.");
      return;
    }
    setAddBranchSubmitting(true);
    try {
      const res = await fetch("/api/v1/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: brCode.trim().toLowerCase(),
          name: brName.trim(),
          name_bn: brNameBn.trim() || undefined,
          address: brAddress.trim() || undefined,
          phone: brPhone.trim() || undefined,
          email: brEmail.trim() || undefined,
          established_year: brYear ? Number(brYear) : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAddBranchError(data?.error || `Failed (HTTP ${res.status})`);
        setAddBranchSubmitting(false);
        return;
      }
      toast({ title: "Branch added", description: brName });
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      setAddBranchOpen(false);
    } catch {
      setAddBranchError("Network error — please try again.");
    }
    setAddBranchSubmitting(false);
  }

  const isLoading = orgLoading || branchesLoading;
  const isError = orgError || branchesError;
  const refetch = () => {
    orgRefetch();
    branchesRefetch();
  };

  const orgName = locale === "bn" ? org?.nameBn : org?.name;
  const orgNameAlt = locale === "bn" ? org?.name : org?.nameBn;
  const branchCount = branches?.length ?? 0;
  const establishedRange = (() => {
    if (!branches || branches.length === 0) return "";
    const years = branches.map((b) => b.establishedYear).filter((y): y is number => y != null).sort((a, b) => a - b);
    if (years.length === 0) return "";
    const earliest = years[0];
    const latest = years[years.length - 1];
    return `${convertDigits(String(earliest), locale)}–${convertDigits(String(latest), locale)}`;
  })();

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-display font-bold text-text-primary">
              {orgName ?? "Organization"}
            </h1>
            {orgNameAlt && (
              <p className="mt-1 text-body text-text-secondary" lang={locale === "bn" ? "en" : "bn"}>
                {orgNameAlt}
              </p>
            )}
            <p className="mt-2 text-body text-text-secondary">
              Multi-branch configuration · {convertDigits(String(branchCount), locale)} branches
              {establishedRange && (
                <>
                  {" "}
                  · established {establishedRange}
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <IfPermission code="organization.branch.create">
              <Button onClick={openAddBranchDialog}>
                <Plus className="h-4 w-4" />
                Add Branch
              </Button>
            </IfPermission>
          </div>
        </header>

        {isLoading && <LoadingState pattern="list" rows={3} />}
        {isError && <ErrorState onRetry={refetch} />}
        {!isLoading && !isError && branches && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {branches.map((branch) => (
              <BranchCard key={branch.id} branch={branch} />
            ))}
          </div>
        )}

        {!isLoading && !isError && org && branches && (
          <SectionCard>
            <SectionCardHeader
              title="Organization Profile"
              description="Tenant-wide configuration that applies to every branch."
            />
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-500">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <dt className="text-caption uppercase tracking-wider text-text-muted">
                    Organization
                  </dt>
                  <dd className="text-body font-medium text-text-primary">
                    {orgName ?? "—"}
                  </dd>
                  <dd className="text-caption text-text-muted" lang={locale === "bn" ? "en" : "bn"}>
                    {orgNameAlt ?? "—"}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent-50 text-accent-500">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <dt className="text-caption uppercase tracking-wider text-text-muted">
                    Branches
                  </dt>
                  <dd className="text-body font-medium text-text-primary">
                    {convertDigits(String(branchCount), locale)}
                  </dd>
                  <dd className="text-caption text-text-muted">
                    {branches.map((b) => (locale === "bn" ? b.nameBn : b.name)).join(" · ")}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-500">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <dt className="text-caption uppercase tracking-wider text-text-muted">
                    Branch scope
                  </dt>
                  <dd className="text-body font-medium text-text-primary">branch.scope</dd>
                  <dd className="text-caption text-text-muted">
                    Tenant-wide &amp; Single-branch scopes in use
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent-50 text-accent-500">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <dt className="text-caption uppercase tracking-wider text-text-muted">
                    Established
                  </dt>
                  <dd className="text-body font-medium text-text-primary">
                    {establishedRange || "—"}
                  </dd>
                  <dd className="text-caption text-text-muted">
                    Earliest → latest branch
                  </dd>
                </div>
              </div>
            </dl>
          </SectionCard>
        )}

        {!isLoading && !isError && branches && (
          <SectionCard>
            <SectionCardHeader
              title="Tenant isolation"
              description="Each branch is independently scoped — users see only their branch's data unless granted cross-branch permissions."
            />
            <ul className="space-y-2 text-body text-text-secondary">
              <li className="flex items-start gap-2">
                <Badge variant="outline" className="font-mono">branch.scope</Badge>
                <span>
                  The branch.scope indicator on each card shows whether the branch is a
                  tenant-wide hub or a single-branch satellite.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Badge variant="outline" className="font-mono">data isolation</Badge>
                <span>
                  Ledger entries, students, and inventory are scoped by branch_id at the
                  data layer. Cross-branch visibility requires the
                  <span className="font-mono"> organization.branch.switch </span>
                  permission.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Badge variant="outline" className="font-mono">zakat fund</Badge>
                <span>
                  Zakat accounts are isolated at the fund level (D18) — never co-mingled
                  with general branch funds.
                </span>
              </li>
            </ul>
          </SectionCard>
        )}
      </div>

      {/* ---------- Add Branch dialog ---------- */}
      <Dialog open={addBranchOpen} onOpenChange={setAddBranchOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary-500" />
              Add New Branch
            </DialogTitle>
            <DialogDescription>
              Create a new branch/campus for your madrasha. Each branch has
              its own students, staff, and financial data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="br-code">Code *</Label>
                <Input
                  id="br-code"
                  value={brCode}
                  onChange={(e) => setBrCode(e.target.value.toLowerCase())}
                  placeholder="khulna"
                  className="font-mono"
                />
                <p className="text-caption text-text-muted">Lowercase, no spaces (e.g. dhaka, ctg, khulna).</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="br-year">Established Year</Label>
                <Input
                  id="br-year"
                  type="number"
                  min={1900}
                  max={new Date().getFullYear()}
                  value={brYear}
                  onChange={(e) => setBrYear(e.target.value)}
                  placeholder="1995"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="br-name">Name (English) *</Label>
                <Input
                  id="br-name"
                  value={brName}
                  onChange={(e) => setBrName(e.target.value)}
                  placeholder="Khulna Branch"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="br-name-bn">নাম (বাংলা)</Label>
                <Input
                  id="br-name-bn"
                  value={brNameBn}
                  onChange={(e) => setBrNameBn(e.target.value)}
                  placeholder="খুলনা শাখা"
                  lang="bn"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="br-address">Address</Label>
              <Textarea
                id="br-address"
                value={brAddress}
                onChange={(e) => setBrAddress(e.target.value)}
                placeholder="123 KDA Avenue, Khulna 9100"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="br-phone">Phone</Label>
                <Input
                  id="br-phone"
                  value={brPhone}
                  onChange={(e) => setBrPhone(e.target.value)}
                  placeholder="+880 41 123456"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="br-email">Email</Label>
                <Input
                  id="br-email"
                  type="email"
                  value={brEmail}
                  onChange={(e) => setBrEmail(e.target.value)}
                  placeholder="khulna@madrashaos.org"
                />
              </div>
            </div>

            {addBranchError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-semantic-danger/40 bg-danger-50 px-3 py-2 text-caption text-semantic-danger"
              >
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                <span>{addBranchError}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddBranchOpen(false)}>
              <XCircle className="h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleAddBranch} disabled={addBranchSubmitting}>
              <Save className="h-4 w-4" />
              {addBranchSubmitting ? "Adding…" : "Add Branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
