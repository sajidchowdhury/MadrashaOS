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

import { Building2, Plus, MapPin, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IfPermission } from "@/components/auth/IfPermission";
import { LoadingState, ErrorState } from "@/components/states";
import { SectionCard, SectionCardHeader } from "@/components/foundation/SectionCard";
import { BranchCard } from "@/components/foundation/BranchCard";
import { useOrganization, useBranches } from "@/lib/query/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { convertDigits } from "@/lib/i18n/format";

export default function OrganizationPage() {
  const { locale } = useI18n();
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
          <IfPermission code="organization.branch.create">
            <Button>
              <Plus className="h-4 w-4" />
              Add Branch
            </Button>
          </IfPermission>
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
    </div>
  );
}
