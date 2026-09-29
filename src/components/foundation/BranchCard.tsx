"use client";

/**
 * MadrashaOS — BranchCard (C3.1)
 *
 * Visual card for a single branch in the Organization list. Shows:
 *   - Branch name (locale-aware: bn/en)
 *   - Address, phone, established year
 *   - "branch.scope" indicator badge (visual indicator per task spec)
 *   - "Current branch" badge when the session is scoped to this branch
 *   - "Edit" button (gated by organization.branch.create) → opens a
 *     dialog to edit this branch's name, address, phone, email,
 *     established year. Wired to PATCH /api/v1/branches/:id.
 *
 * Per C3.1 rules: uses ONLY FROZEN tokens (no raw hex/px), respects
 * locale via useI18n, handles RTL via logical properties.
 */

import * as React from "react";
import {
  Building2, MapPin, Phone, CalendarDays, CheckCircle2,
  Pencil, Save, XCircle, AlertCircle, Mail,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { convertDigits } from "@/lib/i18n/format";
import { useSessionStore } from "@/stores/sessionStore";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/query/client";

type Branch = {
  id: string;
  code: string;
  name: string;
  nameBn?: string;
  address?: string;
  phone?: string;
  email?: string;
  establishedYear?: number | null;
};

/**
 * Derives a human-readable "data scope" label from the branch code.
 * The Dhaka branch is treated as the primary (tenant-wide) hub;
 * the satellite branches get "Single-branch" scope.
 */
function getBranchScopeLabel(code: string): string {
  if (code === "dhaka") return "Tenant-wide";
  return "Single-branch";
}

export function BranchCard({ branch }: { branch: Branch }) {
  const { locale } = useI18n();
  const { toast } = useToast();
  const currentBranchCode = useSessionStore((s) => s.branch);
  const isCurrent = currentBranchCode === branch.code;

  const name = locale === "bn" ? (branch.nameBn || branch.name) : branch.name;
  const altName = locale === "bn" ? branch.name : (branch.nameBn || "");
  const establishedYear = branch.establishedYear
    ? convertDigits(String(branch.establishedYear), locale)
    : "—";
  const scopeLabel = getBranchScopeLabel(branch.code);

  // --- Edit Branch dialog state ---
  const [editOpen, setEditOpen] = React.useState(false);
  const [editSubmitting, setEditSubmitting] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState(branch.name);
  const [editNameBn, setEditNameBn] = React.useState(branch.nameBn ?? "");
  const [editAddress, setEditAddress] = React.useState(branch.address ?? "");
  const [editPhone, setEditPhone] = React.useState(branch.phone ?? "");
  const [editEmail, setEditEmail] = React.useState(branch.email ?? "");
  const [editYear, setEditYear] = React.useState(
    branch.establishedYear ? String(branch.establishedYear) : "",
  );

  function openEditDialog(e: React.MouseEvent) {
    e.stopPropagation();
    // Reset to current branch values
    setEditName(branch.name);
    setEditNameBn(branch.nameBn ?? "");
    setEditAddress(branch.address ?? "");
    setEditPhone(branch.phone ?? "");
    setEditEmail(branch.email ?? "");
    setEditYear(branch.establishedYear ? String(branch.establishedYear) : "");
    setEditError(null);
    setEditOpen(true);
  }

  async function handleSaveBranch() {
    setEditError(null);
    if (!editName.trim()) {
      setEditError("Branch name (English) is required.");
      return;
    }
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/v1/branches/${branch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          name_bn: editNameBn.trim() || undefined,
          address: editAddress.trim() || undefined,
          phone: editPhone.trim() || undefined,
          email: editEmail.trim() || undefined,
          established_year: editYear ? Number(editYear) : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(data?.error || `Failed (HTTP ${res.status})`);
        setEditSubmitting(false);
        return;
      }
      toast({ title: "Branch updated", description: editName });
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      setEditOpen(false);
    } catch {
      setEditError("Network error — please try again.");
    }
    setEditSubmitting(false);
  }

  return (
    <>
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
              {altName && (
                <p className="text-caption text-text-muted" lang={locale === "bn" ? "en" : "bn"}>
                  {altName}
                </p>
              )}
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
              <dd className="text-text-secondary">{branch.address || "—"}</dd>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0 text-text-secondary" />
            <div>
              <dt className="sr-only">Phone</dt>
              <dd className="font-mono text-text-secondary">{branch.phone || "—"}</dd>
            </div>
          </div>
          {branch.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-text-secondary" />
              <div>
                <dt className="sr-only">Email</dt>
                <dd className="font-mono text-text-secondary">{branch.email}</dd>
              </div>
            </div>
          )}
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
          <div className="flex items-center gap-2">
            <span className="font-mono text-caption text-text-muted">
              {branch.code}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={openEditDialog}
              aria-label={`Edit ${branch.name}`}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
        </footer>
      </article>

      {/* ---------- Edit Branch dialog ---------- */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary-500" />
              Edit Branch — {branch.name}
            </DialogTitle>
            <DialogDescription>
              Update this branch&apos;s information. Changes apply to all
              data scoped to this branch.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`br-name-${branch.id}`}>Name (English) *</Label>
                <Input
                  id={`br-name-${branch.id}`}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Dhaka Main Branch"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`br-name-bn-${branch.id}`}>নাম (বাংলা)</Label>
                <Input
                  id={`br-name-bn-${branch.id}`}
                  value={editNameBn}
                  onChange={(e) => setEditNameBn(e.target.value)}
                  placeholder="ঢাকা মূল শাখা"
                  lang="bn"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`br-address-${branch.id}`}>Address</Label>
              <Textarea
                id={`br-address-${branch.id}`}
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="123 Madrasha Road, Dhaka 1000"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`br-phone-${branch.id}`}>Phone</Label>
                <Input
                  id={`br-phone-${branch.id}`}
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+880 2 9661234"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`br-email-${branch.id}`}>Email</Label>
                <Input
                  id={`br-email-${branch.id}`}
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="dhaka@madrashaos.org"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`br-year-${branch.id}`}>Established Year</Label>
              <Input
                id={`br-year-${branch.id}`}
                type="number"
                min={1900}
                max={new Date().getFullYear()}
                value={editYear}
                onChange={(e) => setEditYear(e.target.value)}
                placeholder="1995"
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
            <Button onClick={handleSaveBranch} disabled={editSubmitting}>
              <Save className="h-4 w-4" />
              {editSubmitting ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
