"use client";

/**
 * MadrashaOS — Module Selector Sheet
 *
 * A side-off-canvas panel (Sheet) that lets the user choose which
 * modules/features to show in their sidebar. Each module has a toggle
 * switch. Modules are grouped by category (Foundation, People, Academic,
 * Finance, Operations, Communication, Platform).
 *
 * Quick actions:
 *   - "Enable All" — turn on every module
 *   - "Core Only" — reset to the default core set
 *
 * Always-on modules (Dashboard) can't be toggled off.
 *
 * The sheet is opened via a floating button (LayoutGrid icon) at the
 * bottom-right of the screen.
 */

import * as React from "react";
import {
  LayoutGrid, Check, X, Layers,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  useModuleStore,
} from "@/stores/moduleStore";
import { moduleTree } from "@/lib/nav/moduleTree";
import { useSessionStore } from "@/stores/sessionStore";

// Modules that can't be turned off
const ALWAYS_ON = new Set(["dashboard"]);

export function ModuleSelectorButton() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-primary-foreground shadow-lg transition-all hover:bg-primary-700 hover:shadow-xl active:scale-95"
        aria-label="Configure modules"
        title="Configure visible modules"
      >
        <LayoutGrid className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-500 text-[10px] font-bold text-accent-foreground">
          {/* Show count of enabled modules */}
          <ModuleCount />
        </span>
      </button>

      <ModuleSelectorSheet open={open} onOpenChange={setOpen} />
    </>
  );
}

function ModuleCount() {
  const enabledCount = useModuleStore((s) => s.enabledModules.size);
  return <>{enabledCount}</>;
}

function ModuleSelectorSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const { enabledModules, toggleModule, enableAll, resetToDefaults } = useModuleStore();
  const permissions = useSessionStore((s) => s.permissions);
  const permSet = new Set(permissions);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary-500" />
            Module Configuration
          </SheetTitle>
          <SheetDescription>
            Choose which modules appear in your sidebar. Start with what you need
            now — you can always enable more later.
          </SheetDescription>
        </SheetHeader>

        {/* Quick actions */}
        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="outline" onClick={enableAll} className="flex-1">
            <Check className="h-3.5 w-3.5" />
            Enable All
          </Button>
          <Button size="sm" variant="outline" onClick={resetToDefaults} className="flex-1">
            Core Only
          </Button>
        </div>

        {/* Module groups */}
        <div className="mt-4 space-y-4">
          {moduleTree.map((group) => {
            // Only show groups where the user has permission for at least one item
            const visibleItems = group.items.filter(
              (item) => permSet.has(item.permissionRequired),
            );
            if (visibleItems.length === 0) return null;

            const groupLabel = t(group.labelKey);
            const enabledInGroup = visibleItems.filter(
              (item) => enabledModules.has(item.id),
            ).length;

            return (
              <div key={group.id} className="space-y-2">
                <div className="flex items-center justify-between border-b border-border-default pb-1">
                  <h3 className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                    {groupLabel}
                  </h3>
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {enabledInGroup}/{visibleItems.length}
                  </Badge>
                </div>
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const isEnabled = enabledModules.has(item.id);
                    const isAlwaysOn = ALWAYS_ON.has(item.id);
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between rounded-md px-3 py-2 transition-colors ${
                          isEnabled
                            ? "bg-primary-50/50"
                            : "hover:bg-surface-hover"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-md ${
                            isEnabled
                              ? "bg-primary-100 text-primary-600"
                              : "bg-neutral-100 text-text-muted"
                          }`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className={`text-body ${
                              isEnabled ? "font-medium text-text-primary" : "text-text-secondary"
                            }`}>
                              {t(item.labelKey)}
                            </p>
                            {isAlwaysOn && (
                              <p className="text-[10px] text-text-muted">Always on</p>
                            )}
                          </div>
                        </div>
                        <Switch
                          checked={isEnabled}
                          disabled={isAlwaysOn}
                          onCheckedChange={() => toggleModule(item.id)}
                          aria-label={`Toggle ${t(item.labelKey)}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Hint */}
        <div className="mt-6 rounded-md border border-border-default bg-surface-hover px-3 py-2 text-caption text-text-secondary">
          <p>
            <strong className="text-text-primary">Tip:</strong> Changes are saved
            automatically and apply to your sidebar immediately. You can adjust
            this at any time.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
