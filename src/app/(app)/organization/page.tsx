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
import { Building2, Plus, MapPin, CalendarDays, Pencil, Save, XCircle, AlertCircle, Phone, Mail } from "lucide-react";
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

  // --- Edit Organization dialog state ---
  const [editOpen, setEditOpen] = React.useState(false);
  const [editSubmitting, setEditSubmitting] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editNameBn, setEditNameBn] = React.useState("");
  const [editPhone, setEditPhone] = React.useState("");
  const [editEmail, setEditEmail] = React.useState("");
  const [editAddress, setEditAddress] = React.useState("");
  const [editWebsite, setEditWebsite] = React.useState("");

  function openEditDialog() {
    setEditName(org?.name ?? "");
    setEditNameBn(org?.nameBn ?? "");
    setEditPhone(org?.phone ?? "");
    setEditEmail(org?.email ?? "");
    setEditAddress(org?.address ?? "");
    setEditWebsite(org?.websiteUrl ?? "");
    setEditError(null);
    setEditOpen(true);
  }

  async function handleSaveOrg() {
    setEditError(null);
    if (!editName.trim()) {
      setEditError("Organization name (English) is required.");
      return;
    }
    setEditSubmitting(true);
    try {
      const res = await fetch("/api/v1/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          name_bn: editNameBn.trim() || undefined,
          phone: editPhone.trim() || undefined,
          email: editEmail.trim() || undefined,
          address: editAddress.trim() || undefined,
          website_url: editWebsite.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(data?.error || `Failed (HTTP ${res.status})`);
        setEditSubmitting(false);
        return;
      }
      toast({ title: "Organization updated", description: editName });
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      setEditOpen(false);
    } catch {
      setEditError("Network error — please try again.");
    }
    setEditSubmitting(false);
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
    const years = branches.map((b) => b.establishedYear).sort((a, b) => a - b);
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
            <IfPermission code="organization.config.edit">
              <Button variant="outline" onClick={openEditDialog}>
                <Pencil className="h-4 w-4" />
                Edit Profile
              </Button>
            </IfPermission>
            <IfPermission code="organization.branch.create">
              <Button>
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

      {/* ---------- Edit Organization dialog ---------- */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary-500" />
              Edit Organization Profile
            </DialogTitle>
            <DialogDescription>
              Update your madrasha&apos;s profile. This information appears on
              receipts, reports, and the public website.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="org-name">Name (English) *</Label>
                <Input
                  id="org-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Darul Uloom Madrasha"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="org-name-bn">নাম (বাংলা)</Label>
                <Input
                  id="org-name-bn"
                  value={editNameBn}
                  onChange={(e) => setEditNameBn(e.target.value)}
                  placeholder="দারুল উলূম মাদরাসা"
                  lang="bn"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="org-phone">Phone</Label>
                <Input
                  id="org-phone"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+880 2 9661234"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="org-email">Email</Label>
                <Input
                  id="org-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="info@madrashaos.org"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="org-address">Address</Label>
              <Textarea
                id="org-address"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="123 Madrasha Road, Dhaka 1000"
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="org-website">Website URL</Label>
              <Input
                id="org-website"
                type="url"
                value={editWebsite}
                onChange={(e) => setEditWebsite(e.target.value)}
                placeholder="https://madrashaos.org"
              />
            </div>

            {editError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-semantic-danger/40 bg-danger-50 px-3 py-2 text-caption text-semantic-danger"
              >
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                <span>{editError}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              <XCircle className="h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSaveOrg} disabled={editSubmitting}>
              <Save className="h-4 w-4" />
              {editSubmitting ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
