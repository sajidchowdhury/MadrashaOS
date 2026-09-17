"use client";

/**
 * MadrashaOS — RBAC Permission Matrix (C3.1 / Foundation screen 3)
 *
 * Interactive grid editor for role-based access control. Layout:
 *
 *   Main matrix: rows = 8 personas (stores/types.ts ROLES)
 *                columns = 7 permission groups
 *                  (Foundation / People / Academic / Finance /
 *                   Operations / Communication / Platform)
 *                cell = tri-state Checkbox + count "X/Y perms in group"
 *
 *   Approval detail: rows = 4 approval permission codes
 *                    (approval.view / approve / reject / delegate)
 *                    columns = 8 personas
 *                    cell at (approval.approve, currentUserRole) shows a
 *                    tooltip explaining Do-Not-Do D16:
 *                      "Requester cannot approve own request"
 *
 * The whole page is gated by IfPermission code="rbac.permission.assign" per
 * Risk R3 (hide unauthorized UI). ROLE_PERMISSIONS is the initial state;
 * "Save Matrix" is visual-only in mock mode (no actual mutation).
 */

import * as React from "react";
import { useMemo, useState } from "react";
import { Save, ShieldCheck, Info, AlertCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tooltip, TooltipContent, TooltipTrigger, TooltipProvider,
} from "@/components/ui/tooltip";
import { IfPermission } from "@/components/auth/IfPermission";
import { PermissionDenied } from "@/components/states";
import { SectionCard, SectionCardHeader } from "@/components/foundation/SectionCard";
import { ROLES, ROLE_LABELS, type Role } from "@/stores/types";
import { ROLE_PERMISSIONS } from "@/lib/auth/role-permissions";
import { useSessionStore } from "@/stores/sessionStore";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { convertDigits } from "@/lib/i18n/format";

/* ------------------------------------------------------------------ */
/*  Permission group definitions                                       */
/* ------------------------------------------------------------------ */

type PermissionGroup =
  | "foundation"
  | "people"
  | "academic"
  | "finance"
  | "operations"
  | "communication"
  | "platform";

const GROUP_ORDER: PermissionGroup[] = [
  "foundation", "people", "academic", "finance",
  "operations", "communication", "platform",
];

const GROUP_LABEL: Record<PermissionGroup, string> = {
  foundation: "Foundation",
  people: "People",
  academic: "Academic",
  finance: "Finance",
  operations: "Operations",
  communication: "Communication",
  platform: "Platform",
};

/**
 * Derives a permission code's group from its dotted prefix.
 * Mirrors the SRS §6.2 permission catalog organization.
 */
function groupOfPermission(code: string): PermissionGroup {
  if (
    code.startsWith("organization.") ||
    code.startsWith("rbac.") ||
    code.startsWith("audit.") ||
    code.startsWith("security.") ||
    code.startsWith("backup.") ||
    code.startsWith("tenant.")
  ) {
    return "foundation";
  }
  if (
    code.startsWith("students.") ||
    code.startsWith("admission.") ||
    code.startsWith("guardians.") ||
    code.startsWith("teachers.") ||
    code.startsWith("employees.")
  ) {
    return "people";
  }
  if (
    code.startsWith("academic.") ||
    code.startsWith("attendance.") ||
    code.startsWith("exams.") ||
    code.startsWith("results.")
  ) {
    return "academic";
  }
  if (
    code.startsWith("fees.") ||
    code.startsWith("scholarship.") ||
    code.startsWith("accounting.") ||
    code.startsWith("cashbank.") ||
    code.startsWith("zakat.") ||
    code.startsWith("donations.")
  ) {
    return "finance";
  }
  if (
    code.startsWith("inventory.") ||
    code.startsWith("purchase.") ||
    code.startsWith("suppliers.") ||
    code.startsWith("assets.") ||
    code.startsWith("hostel.") ||
    code.startsWith("food.") ||
    code.startsWith("library.") ||
    code.startsWith("transport.")
  ) {
    return "operations";
  }
  if (
    code.startsWith("notices.") ||
    code.startsWith("documents.")
  ) {
    return "communication";
  }
  return "platform"; // reports.*, approval.*, dashboard.*, pdf.*
}

/* ------------------------------------------------------------------ */
/*  Pre-computed permission totals per group                            */
/* ------------------------------------------------------------------ */

/**
 * For the main matrix cell we show "X / Y" where:
 *   X = permissions in this group held by the role
 *   Y = total permissions in this group (across the union of all roles)
 */
function buildGroupStats() {
  // Union of all permissions held by any role, grouped.
  const allPermsInGroup: Record<PermissionGroup, Set<string>> = {
    foundation: new Set(),
    people: new Set(),
    academic: new Set(),
    finance: new Set(),
    operations: new Set(),
    communication: new Set(),
    platform: new Set(),
  };
  for (const role of ROLES) {
    for (const code of ROLE_PERMISSIONS[role]) {
      allPermsInGroup[groupOfPermission(code)].add(code);
    }
  }

  const totalsByGroup: Record<PermissionGroup, number> = {
    foundation: 0, people: 0, academic: 0, finance: 0,
    operations: 0, communication: 0, platform: 0,
  };
  for (const g of GROUP_ORDER) {
    totalsByGroup[g] = allPermsInGroup[g].size;
  }

  // Per-role counts by group
  const perRole: Record<Role, Record<PermissionGroup, number>> =
    {} as Record<Role, Record<PermissionGroup, number>>;
  for (const role of ROLES) {
    perRole[role] = {
      foundation: 0, people: 0, academic: 0, finance: 0,
      operations: 0, communication: 0, platform: 0,
    };
    for (const code of ROLE_PERMISSIONS[role]) {
      perRole[role][groupOfPermission(code)]++;
    }
  }

  return { totalsByGroup, perRole };
}

/* ------------------------------------------------------------------ */
/*  Approval permissions detail rows                                    */
/* ------------------------------------------------------------------ */

const APPROVAL_CODES = [
  "approval.view",
  "approval.approve",
  "approval.reject",
  "approval.delegate",
] as const;

const APPROVAL_LABELS: Record<string, string> = {
  "approval.view": "approval.view — View approval queue",
  "approval.approve": "approval.approve — Approve a request",
  "approval.reject": "approval.reject — Reject a request",
  "approval.delegate": "approval.delegate — Delegate approval authority",
};

/* ------------------------------------------------------------------ */
/*  Page component                                                      */
/* ------------------------------------------------------------------ */

export default function RbacPage() {
  return (
    <IfPermission
      code="rbac.permission.assign"
      fallback={<PermissionDenied resource="RBAC Permission Matrix" />}
    >
      <RbacMatrixContent />
    </IfPermission>
  );
}

function RbacMatrixContent() {
  const { locale } = useI18n();
  const currentRole = useSessionStore((s) => s.role);
  const [justSaved, setJustSaved] = useState(false);

  const { totalsByGroup, perRole } = useMemo(() => buildGroupStats(), []);

  // Visual-only checkbox state. Default-checked = role has at least one
  // permission in the group (per ROLE_PERMISSIONS).
  const [groupChecks, setGroupChecks] = useState<
    Record<string, boolean>
  >(() => {
    const init: Record<string, boolean> = {};
    for (const role of ROLES) {
      for (const g of GROUP_ORDER) {
        init[`${role}.${g}`] = perRole[role][g] > 0;
      }
    }
    return init;
  });

  // Visual-only approval detail checkbox state.
  const [approvalChecks, setApprovalChecks] = useState<Record<string, boolean>>(
    () => {
      const init: Record<string, boolean> = {};
      for (const role of ROLES) {
        for (const code of APPROVAL_CODES) {
          init[`${role}.${code}`] = ROLE_PERMISSIONS[role].includes(code);
        }
      }
      return init;
    },
  );

  function toggleGroup(role: Role, group: PermissionGroup, next: boolean) {
    setGroupChecks((prev) => ({ ...prev, [`${role}.${group}`]: next }));
    setJustSaved(false);
  }

  function toggleApproval(role: Role, code: string, next: boolean) {
    setApprovalChecks((prev) => ({ ...prev, [`${role}.${code}`]: next }));
    setJustSaved(false);
  }

  function handleSave() {
    setJustSaved(true);
  }

  const roleLabel = (role: Role) => ROLE_LABELS[role].english;

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-display font-bold text-text-primary">
              Roles &amp; Permission Matrix
            </h1>
            <p className="mt-1 text-body text-text-secondary">
              Map permission groups to the 8 personas. Per Do-Not-Do D16: a
              requester cannot approve their own request — the approval.approve
              row is annotated for the current user&apos;s role.
            </p>
          </div>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4" />
            Save Matrix
          </Button>
        </header>

        {justSaved && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-md border border-semantic-success/40 bg-success-50 p-3 text-body text-text-primary"
          >
            <ShieldCheck className="h-4 w-4 shrink-0 text-semantic-success" aria-hidden />
            Permission matrix saved (mock mode — no persistence).
          </div>
        )}

        {/* --- Main matrix: roles × permission groups --- */}
        <SectionCard>
          <SectionCardHeader
            title="Role × Permission Group"
            description="Each cell shows whether the role currently holds permissions in that group. Toggle to draft changes (visual only in mock mode)."
            action={
              <Badge variant="outline" className="font-mono">
                {convertDigits(String(ROLES.length), locale)} roles ×{" "}
                {convertDigits(String(GROUP_ORDER.length), locale)} groups
              </Badge>
            }
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky start-0 bg-surface-card text-text-secondary">
                  Role
                </TableHead>
                {GROUP_ORDER.map((g) => (
                  <TableHead
                    key={g}
                    className="text-center text-text-secondary"
                  >
                    {GROUP_LABEL[g]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROLES.map((role) => {
                const isCurrent = role === currentRole;
                return (
                  <TableRow
                    key={role}
                    className={isCurrent ? "bg-primary-50/50" : undefined}
                  >
                    <TableCell
                      className="sticky start-0 bg-surface-card font-medium text-text-primary"
                    >
                      <span className="flex items-center gap-2">
                        {roleLabel(role)}
                        {isCurrent && (
                          <Badge className="bg-primary-500 text-primary-foreground">
                            You
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                    {GROUP_ORDER.map((g) => {
                      const key = `${role}.${g}`;
                      const checked = groupChecks[key];
                      const held = perRole[role][g];
                      const total = totalsByGroup[g];
                      return (
                        <TableCell key={g} className="text-center">
                          <label className="inline-flex cursor-pointer flex-col items-center gap-1">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(next) =>
                                toggleGroup(role, g, next === true)
                              }
                              aria-label={`${roleLabel(role)} · ${GROUP_LABEL[g]}`}
                            />
                            <span className="text-caption text-text-muted">
                              {convertDigits(String(held), locale)} /{" "}
                              {convertDigits(String(total), locale)}
                            </span>
                          </label>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </SectionCard>

        {/* --- Approval detail matrix with D16 tooltip --- */}
        <SectionCard>
          <SectionCardHeader
            title="Approval permissions"
            description="Detail view of the approval.* permission codes. The approval.approve row is annotated for the current user's role with the D16 lock-in tooltip."
            action={
              <Badge variant="outline" className="font-mono">
                D16 · self-approval blocked
              </Badge>
            }
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky start-0 bg-surface-card text-text-secondary">
                  Permission code
                </TableHead>
                {ROLES.map((role) => (
                  <TableHead
                    key={role}
                    className={`text-center ${
                      role === currentRole
                        ? "bg-primary-50 text-primary-700"
                        : "text-text-secondary"
                    }`}
                  >
                    {roleLabel(role)}
                    {role === currentRole && (
                      <span className="ms-1 text-caption" aria-hidden>•</span>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {APPROVAL_CODES.map((code) => {
                const isApproveRow = code === "approval.approve";
                return (
                  <TableRow key={code}>
                    <TableCell className="sticky start-0 bg-surface-card font-mono text-body text-text-primary">
                      {APPROVAL_LABELS[code]}
                    </TableCell>
                    {ROLES.map((role) => {
                      const key = `${role}.${code}`;
                      const checked = approvalChecks[key];
                      const isCurrentUserCell =
                        isApproveRow && role === currentRole;
                      const roleHasPerm =
                        ROLE_PERMISSIONS[role].includes(code);

                      return (
                        <TableCell
                          key={role}
                          className={`text-center ${
                            isCurrentUserCell ? "bg-warning-50" : ""
                          }`}
                        >
                          {isCurrentUserCell ? (
                            <TooltipProvider delayDuration={0}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex cursor-help items-center gap-1.5">
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(next) =>
                                        toggleApproval(role, code, next === true)
                                      }
                                      aria-label={`${roleLabel(role)} · ${code}`}
                                    />
                                    <Info className="h-3 w-3 text-semantic-warning" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  Do-Not-Do D16 — Requester cannot approve own
                                  request. A user with approval.approve is still
                                  blocked from approving any request they
                                  submitted (enforced server-side).
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(next) =>
                                toggleApproval(role, code, next === true)
                              }
                              aria-label={`${roleLabel(role)} · ${code}`}
                            />
                          )}
                          {roleHasPerm && (
                            <span className="sr-only">
                              Default: enabled per ROLE_PERMISSIONS
                            </span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </SectionCard>

        {/* --- Persona quick-reference --- */}
        <SectionCard>
          <SectionCardHeader
            title="Persona quick reference"
            description="Native + English labels for the 8 personas per Session 0.2."
          />
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((role) => {
              const isCurrent = role === currentRole;
              return (
                <li
                  key={role}
                  className={`flex items-center gap-3 rounded-md border p-3 ${
                    isCurrent
                      ? "border-primary-300 bg-primary-50"
                      : "border-border-default bg-surface-card"
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-50 text-accent-700">
                    {isCurrent ? (
                      <Lock className="h-4 w-4" aria-hidden />
                    ) : (
                      <ShieldCheck className="h-4 w-4" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-body font-medium text-text-primary">
                      {ROLE_LABELS[role].english}
                    </p>
                    <p
                      className="text-caption text-text-muted"
                      lang={locale === "bn" ? "en" : "bn"}
                    >
                      {ROLE_LABELS[role].native}
                    </p>
                    <p className="text-caption text-text-muted">
                      {convertDigits(String(ROLE_PERMISSIONS[role].length), locale)} permission codes
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </SectionCard>

        {/* --- Lock-in rules reference --- */}
        <SectionCard>
          <SectionCardHeader
            title="Enforced rules"
            description="Hard constraints baked into ROLE_PERMISSIONS — visible here for review."
          />
          <ul className="space-y-2 text-body text-text-secondary">
            <li className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-semantic-warning" />
              <span>
                <strong className="text-text-primary">D3 — Separation of duties:</strong>{" "}
                Teacher has NO financial permissions; Accountant has NO academic
                edit permissions.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-semantic-warning" />
              <span>
                <strong className="text-text-primary">D16 — Self-approval blocked:</strong>{" "}
                A requester cannot approve their own request. Enforced server-side
                regardless of the approval.approve checkbox above.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-semantic-warning" />
              <span>
                <strong className="text-text-primary">D18 — Zakat isolation:</strong>{" "}
                Zakat fund permissions are isolated from general finance.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-semantic-warning" />
              <span>
                <strong className="text-text-primary">R3 — Hide, don&apos;t disable:</strong>{" "}
                Items the user lacks permission for are hidden in the UI; the
                server still enforces authorization.
              </span>
            </li>
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
