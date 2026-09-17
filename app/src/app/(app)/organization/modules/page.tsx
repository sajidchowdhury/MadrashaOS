"use client";

/**
 * MadrashaOS — Module Configuration (C3.1 / Foundation screen 2 / Risk R2)
 *
 * Lists every module from moduleTree.ts grouped by its `layer` field with
 * a Switch (shadcn/ui) to enable/disable. Per Risk R2 lock-in:
 *
 *   "Inline warning on the toggle; list dependents as chips;
 *    disable Save until user resolves"
 *
 * Resolution semantics:
 *   - If module M is toggled OFF but another module D depends on M
 *     (i.e., D appears in MODULE_DEPENDENTS[M.id]) and D is still ON,
 *     the toggle row for M shows the unresolved dependent(s) as warning
 *     chips inline below the switch.
 *   - The "Save Changes" button stays disabled while ANY module has at
 *     least one unresolved dependent. The user resolves by toggling the
 *     dependent modules off too (or by re-enabling M).
 */

import * as React from "react";
import { useMemo, useState } from "react";
import { Save, RotateCcw, Settings2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Chip } from "@/components/ui/chip";
import { SectionCard, SectionCardHeader } from "@/components/foundation/SectionCard";
import { ModuleToggleRow } from "@/components/foundation/ModuleToggleRow";
import { moduleTree, type ModuleDef, type ModuleLayer } from "@/lib/nav/moduleTree";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { convertDigits } from "@/lib/i18n/format";

/* ------------------------------------------------------------------ */
/*  Module dependency map                                              */
/* ------------------------------------------------------------------ */

/**
 *moduleId -> list of moduleIds that depend on it (require it enabled).
 * Conservative, acyclic subset derived from SRS §2 cross-module flows:
 *   - Hostel/Food/Transport/Library all consume Inventory stock
 *   - Suppliers feed Purchase, which feeds Inventory
 *   - Cash/Bank transfers post to Accounting ledger
 *   - Scholarships + Accounting depend on Fees
 *   - Fees depend on Students (the payer records)
 *   - Results depend on Exams; Attendance feeds Exams
 *   - Admission feeds Students
 */
const MODULE_DEPENDENTS: Record<string, string[]> = {
  inventory: ["hostel", "food", "transport", "library", "purchase"],
  purchase: ["suppliers"],
  accounting: ["cashbank"],
  fees: ["accounting", "scholarship"],
  exams: ["results"],
  students: ["fees", "attendance", "admission", "guardians"],
  attendance: ["exams"],
  teachers: ["attendance", "exams"],
};

/** Flatten all modules across groups (excluding "main" / dashboard). */
const ALL_MODULES: ModuleDef[] = moduleTree
  .filter((g) => g.id !== "main")
  .flatMap((g) => g.items);

/** Quick lookup table for a module by id. */
const MODULE_BY_ID: Record<string, ModuleDef> = Object.fromEntries(
  ALL_MODULES.map((m) => [m.id, m]),
);

/** Layers we render in order. */
const LAYER_ORDER: ModuleLayer[] = [
  "foundation",
  "people",
  "academic",
  "finance",
  "operations",
  "communication",
  "platform",
];

const LAYER_LABEL: Record<ModuleLayer, string> = {
  main: "Main",
  foundation: "Foundation",
  people: "People",
  academic: "Academic",
  finance: "Finance",
  operations: "Operations",
  communication: "Communication",
  platform: "Platform",
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ModuleConfigurationPage() {
  const { t, locale } = useI18n();

  // All modules start enabled by default.
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ALL_MODULES.map((m) => [m.id, true])),
  );
  const [justSaved, setJustSaved] = React.useState(false);

  /**
   * Returns the dependent modules (full ModuleDef) for the given module
   * that are still enabled — i.e., the unresolved dependents when this
   * module is OFF.
   */
  function unresolvedDependents(moduleId: string): ModuleDef[] {
    const deps = MODULE_DEPENDENTS[moduleId] ?? [];
    return deps
      .map((id) => MODULE_BY_ID[id])
      .filter((m): m is ModuleDef => Boolean(m) && enabledMap[m.id]);
  }

  /** Global: is there any module with unresolved dependents? */
  const unresolvedModules = useMemo(
    () =>
      ALL_MODULES.filter((m) => {
        if (enabledMap[m.id]) return false;
        const deps = MODULE_DEPENDENTS[m.id] ?? [];
        return deps.some(
          (id) => MODULE_BY_ID[id] && enabledMap[id],
        );
      }),
    [enabledMap],
  );
  const hasUnresolved = unresolvedModules.length > 0;

  function handleToggle(moduleId: string, next: boolean) {
    setEnabledMap((prev) => ({ ...prev, [moduleId]: next }));
    setJustSaved(false);
  }

  function handleReset() {
    setEnabledMap(Object.fromEntries(ALL_MODULES.map((m) => [m.id, true])));
    setJustSaved(false);
  }

  function handleSave() {
    if (hasUnresolved) return;
    // Mock save: just flash a confirmation. No mutation in mock mode.
    setJustSaved(true);
  }

  const enabledCount = Object.values(enabledMap).filter(Boolean).length;
  const totalCount = ALL_MODULES.length;
  const disabledCount = totalCount - enabledCount;

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-display font-bold text-text-primary">
              Module Configuration
            </h1>
            <p className="mt-1 text-body text-text-secondary">
              Enable or disable modules per tenant. Toggling a module off hides
              its nav item and routes from the UI; the server still enforces
              authorization per SRS §5.1.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button onClick={handleSave} disabled={hasUnresolved}>
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </header>

        {/* Summary strip */}
        <SectionCard>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-caption uppercase tracking-wider text-text-muted">
                Enabled modules
              </p>
              <p className="text-display font-bold text-semantic-success">
                {convertDigits(String(enabledCount), locale)}
                <span className="ms-1 text-body font-normal text-text-muted">
                  / {convertDigits(String(totalCount), locale)}
                </span>
              </p>
            </div>
            <div>
              <p className="text-caption uppercase tracking-wider text-text-muted">
                Disabled modules
              </p>
              <p className="text-display font-bold text-semantic-warning">
                {convertDigits(String(disabledCount), locale)}
              </p>
            </div>
            <div>
              <p className="text-caption uppercase tracking-wider text-text-muted">
                Unresolved dependencies
              </p>
              <p
                className={`text-display font-bold ${
                  hasUnresolved ? "text-semantic-danger" : "text-semantic-success"
                }`}
              >
                {convertDigits(String(unresolvedModules.length), locale)}
              </p>
            </div>
          </div>

          {hasUnresolved ? (
            <div
              role="alert"
              className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-semantic-danger/40 bg-danger-50 p-3"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-semantic-danger" aria-hidden />
              <p className="text-body text-text-primary">
                Save is disabled while unresolved dependencies exist. Resolve by
                toggling the dependent modules off, or re-enable the parent module.
              </p>
              <div className="flex flex-wrap gap-2">
                {unresolvedModules.map((m) => (
                  <Chip key={m.id} tone="danger">
                    {t(m.labelKey)}
                  </Chip>
                ))}
              </div>
            </div>
          ) : justSaved ? (
            <div
              role="status"
              className="mt-4 flex items-center gap-2 rounded-md border border-semantic-success/40 bg-success-50 p-3"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-semantic-success" aria-hidden />
              <p className="text-body text-text-primary">
                Module configuration saved (mock mode — no persistence).
              </p>
            </div>
          ) : null}
        </SectionCard>

        {/* Layer sections */}
        {LAYER_ORDER.map((layer) => {
          const modulesInLayer = ALL_MODULES.filter((m) => m.layer === layer);
          if (modulesInLayer.length === 0) return null;

          const layerLabel = LAYER_LABEL[layer];
          const enabledInLayer = modulesInLayer.filter((m) => enabledMap[m.id]).length;

          return (
            <SectionCard key={layer}>
              <SectionCardHeader
                title={layerLabel}
                description={`${convertDigits(String(enabledInLayer), locale)} of ${convertDigits(String(modulesInLayer.length), locale)} modules active`}
                action={
                  <Badge variant="outline" className="font-mono">
                    {layer}
                  </Badge>
                }
              />
              <div>
                {modulesInLayer.map((module) => (
                  <ModuleToggleRow
                    key={module.id}
                    module={module}
                    enabled={enabledMap[module.id]}
                    dependents={unresolvedDependents(module.id)}
                    onToggle={(next) => handleToggle(module.id, next)}
                  />
                ))}
              </div>
            </SectionCard>
          );
        })}

        {/* Dependency map reference */}
        <SectionCard>
          <SectionCardHeader
            title="Dependency map"
            description="Modules referenced by MODULE_DEPENDENTS. Toggling a parent off requires resolving every dependent still enabled."
          />
          <ul className="space-y-2 text-body text-text-secondary">
            {Object.entries(MODULE_DEPENDENTS).map(([parentId, depIds]) => {
              const parent = MODULE_BY_ID[parentId];
              if (!parent) return null;
              return (
                <li key={parentId} className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-text-primary">
                    {t(parent.labelKey)}
                  </span>
                  <span className="text-text-muted">→</span>
                  <span className="text-text-muted">dependents:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {depIds.map((id) => {
                      const dep = MODULE_BY_ID[id];
                      if (!dep) return null;
                      return (
                        <Chip
                          key={id}
                          tone={enabledMap[id] ? "neutral" : "warning"}
                        >
                          {t(dep.labelKey)}
                        </Chip>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 flex items-center gap-2 text-caption text-text-muted">
            <Settings2 className="h-3 w-3" aria-hidden />
            Risk R2 lock-in: inline warning on the toggle, dependent chips,
            Save disabled until user resolves.
          </p>
        </SectionCard>
      </div>
    </div>
  );
}
