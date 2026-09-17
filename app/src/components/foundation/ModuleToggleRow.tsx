"use client";

/**
 * MadrashaOS — ModuleToggleRow (C3.1 / Risk R2)
 *
 * One row of the Module Configuration matrix. Each row shows:
 *   - The module icon + label + (layer, phase) meta
 *   - A Switch (shadcn/ui) for enable/disable
 *   - When the module is being toggled OFF but has dependents (other
 *     modules that require this one), an inline warning box appears
 *     below the toggle listing the dependents as Chips.
 *
 * Risk R2 lock-in (per task spec):
 *   "Inline warning on the toggle; list dependents as chips;
 *    disable Save until user resolves"
 *
 * The "Save disabled" enforcement lives on the parent page (which owns
 * the global enabled-state map). This component only renders the
 * warning + chips for the row's own unresolved dependents.
 */

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Chip } from "@/components/ui/chip";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { convertDigits } from "@/lib/i18n/format";
import type { ModuleDef } from "@/lib/nav/moduleTree";

export function ModuleToggleRow({
  module,
  enabled,
  dependents,
  onToggle,
}: {
  module: ModuleDef;
  enabled: boolean;
  /** Other modules that depend on this one (only shown when this is OFF). */
  dependents: ModuleDef[];
  onToggle: (next: boolean) => void;
}) {
  const { t, locale } = useI18n();
  const Icon = module.icon;
  const hasUnresolvedDependents = !enabled && dependents.length > 0;
  const phaseLabel = convertDigits(String(module.phase), locale);

  return (
    <div
      data-slot="module-toggle-row"
      className="border-b border-border-default py-4 last:border-b-0"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-500">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-body font-medium text-text-primary">
              {t(module.labelKey)}
            </p>
            <p className="text-caption text-text-muted">
              Layer: <span className="font-mono">{module.layer}</span>
              <span className="mx-1" aria-hidden>·</span>
              Phase {phaseLabel}
              <span className="mx-1" aria-hidden>·</span>
              <span className="font-mono">{module.route}</span>
            </p>
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          aria-label={`Toggle module ${t(module.labelKey)}`}
        />
      </div>

      {hasUnresolvedDependents && (
        <div
          role="alert"
          className="mt-3 rounded-md border border-semantic-warning/40 bg-warning-50 p-3"
        >
          <div className="flex items-center gap-2 text-caption font-medium text-semantic-warning">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              Disabling this module affects {convertDigits(String(dependents.length), locale)} dependent
              {" "}
              {dependents.length === 1 ? "module" : "modules"}:
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {dependents.map((d) => {
              const DepIcon = d.icon;
              return (
                <Chip key={d.id} tone="warning">
                  <DepIcon className="h-3 w-3" aria-hidden />
                  {t(d.labelKey)}
                </Chip>
              );
            })}
          </div>
          <p className="mt-2 text-caption text-text-secondary">
            Resolve by toggling the dependent modules off, or re-enable this module to save.
          </p>
        </div>
      )}
    </div>
  );
}
