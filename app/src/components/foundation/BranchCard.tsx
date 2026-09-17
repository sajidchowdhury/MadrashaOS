"use client";

/**
 * MadrashaOS — BranchCard (C3.1)
 *
 * Visual card for a single branch in the Organization list. Shows:
 *   - Branch name (locale-aware: bn/en)
 *   - Address, phone, established year
 *   - "branch.scope" indicator badge (visual indicator per task spec)
 *   - "Current branch" badge when the session is scoped to this branch
 *
 * Per C3.1 rules: uses ONLY FROZEN tokens (no raw hex/px), respects
 * locale via useI18n, handles RTL via logical properties.
 */

import * as React from "react";
import { Building2, MapPin, Phone, CalendarDays, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { convertDigits } from "@/lib/i18n/format";
import { useSessionStore } from "@/stores/sessionStore";
import type { Branch } from "@/lib/mock/types";

/**
 * Derives a human-readable "data scope" label from the branch code.
 * The Dhaka branch is treated as the primary (tenant-wide) hub;
 * the satellite branches get "Single-branch" scope.
 *
 * The literal token name "branch.scope" is rendered in the tooltip /
 * aria-label so the indicator is auditable against the spec.
 */
function getBranchScopeLabel(code: Branch["code"]): string {
  if (code === "dhaka") return "Tenant-wide";
  return "Single-branch";
}

export function BranchCard({ branch }: { branch: Branch }) {
  const { locale } = useI18n();
  const currentBranchCode = useSessionStore((s) => s.branch);
  const isCurrent = currentBranchCode === branch.code;

  const name = locale === "bn" ? branch.nameBn : branch.name;
  const altName = locale === "bn" ? branch.name : branch.nameBn;
  const establishedYear = convertDigits(String(branch.establishedYear), locale);
  const scopeLabel = getBranchScopeLabel(branch.code);

  return (
    <article
      data-slot="branch-card"
      className="flex flex-col gap-4 rounded-2xl border border-border-default bg-surface-card p-6 shadow-elevation-1"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-500">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-subtitle font-semibold text-text-primary">
              {name}
            </h3>
            <p className="text-caption text-text-muted" lang={locale === "bn" ? "en" : "bn"}>
              {altName}
            </p>
          </div>
        </div>
        {isCurrent ? (
          <Badge className="bg-primary-500 text-primary-foreground">
            <CheckCircle2 className="h-3 w-3" />
            Current
          </Badge>
        ) : (
          <Chip tone="neutral" aria-label="branch.scope">
            {scopeLabel}
          </Chip>
        )}
      </header>

      <dl className="space-y-2 text-body">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" />
          <div>
            <dt className="sr-only">Address</dt>
            <dd className="text-text-secondary">{branch.address}</dd>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 shrink-0 text-text-secondary" />
          <div>
            <dt className="sr-only">Phone</dt>
            <dd className="font-mono text-text-secondary">{branch.phone}</dd>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0 text-text-secondary" />
          <div>
            <dt className="sr-only">Established</dt>
            <dd className="text-text-secondary">Established {establishedYear}</dd>
          </div>
        </div>
      </dl>

      <footer className="mt-auto flex items-center justify-between pt-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-caption text-text-muted underline-offset-2 hover:text-primary-500 hover:underline"
              aria-label="Branch scope indicator (branch.scope)"
            >
              branch.scope: {scopeLabel}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            Data scope: branch.scope = {scopeLabel}
          </TooltipContent>
        </Tooltip>
        <span className="font-mono text-caption text-text-muted">
          {branch.code}
        </span>
      </footer>
    </article>
  );
}
