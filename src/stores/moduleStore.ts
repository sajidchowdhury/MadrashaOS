"use client";

/**
 * MadrashaOS — Module Store (Zustand + persist)
 *
 * Tracks which modules the user has chosen to ENABLE in their sidebar.
 * Uses an ARRAY for localStorage compatibility.
 *
 * Dashboard is ALWAYS enabled and can NEVER be disabled.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { moduleTree } from "@/lib/nav/moduleTree";

export const ALL_MODULE_IDS: string[] = moduleTree.flatMap((g) => g.items.map((i) => i.id));

const ALWAYS_ON = ["dashboard"];

const DEFAULT_ENABLED = [
  "dashboard",
  "organization",
  "rbac",
  "security",
  "employees",
  "fees",
  "accounting",
  "donations",
  "donors",
  "reports",
  "notices",
  "documents",
  "settings",
];

type ModuleStoreState = {
  enabledModules: string[];
  toggleModule: (id: string) => void;
  enableModule: (id: string) => void;
  disableModule: (id: string) => void;
  enableAll: () => void;
  resetToDefaults: () => void;
};

/** Ensures enabledModules is always a valid array (never null/object/set) */
function safeArray(val: unknown): string[] {
  if (Array.isArray(val)) return val;
  if (val instanceof Set) return Array.from(val);
  return [...DEFAULT_ENABLED];
}

/**
 * Merge persisted modules with defaults: ensures any newly-added default
 * module is present even for existing users with old persisted state.
 * (e.g. when donors/donations are added to DEFAULT_ENABLED later)
 */
function mergeWithDefaults(arr: string[]): string[] {
  const set = new Set(arr);
  for (const id of DEFAULT_ENABLED) set.add(id);
  // Keep only valid module IDs
  const validIds = new Set(ALL_MODULE_IDS);
  return Array.from(set).filter((id) => validIds.has(id));
}

export const useModuleStore = create<ModuleStoreState>()(
  persist(
    (set) => ({
      enabledModules: [...DEFAULT_ENABLED],

      toggleModule: (id) => {
        if (ALWAYS_ON.includes(id)) return; // Dashboard can't be toggled
        set((state) => {
          const current = safeArray(state.enabledModules);
          if (current.includes(id)) {
            return { enabledModules: current.filter((m) => m !== id) };
          }
          return { enabledModules: [...current, id] };
        });
      },

      enableModule: (id) => {
        set((state) => {
          const current = safeArray(state.enabledModules);
          if (current.includes(id)) return state;
          return { enabledModules: [...current, id] };
        });
      },

      disableModule: (id) => {
        if (ALWAYS_ON.includes(id)) return;
        set((state) => ({
          enabledModules: safeArray(state.enabledModules).filter((m) => m !== id),
        }));
      },

      enableAll: () => {
        set({ enabledModules: [...ALL_MODULE_IDS] });
      },

      resetToDefaults: () => {
        set({ enabledModules: [...DEFAULT_ENABLED] });
      },
    }),
    {
      name: "madrasha-module-store",
      // Merge persisted state with defaults — handles corrupted/old format
      // AND ensures newly-added default modules appear for existing users.
      merge: (persisted, current) => {
        const persistedState = (persisted as { enabledModules?: unknown }) ?? {};
        return {
          ...current,
          ...persistedState,
          enabledModules: mergeWithDefaults(safeArray(persistedState.enabledModules)),
        };
      },
    },
  ),
);

/**
 * Returns the module tree filtered by BOTH:
 *   1. The user's permissions
 *   2. The user's module store selection
 * Dashboard is always included regardless.
 */
export function getEnabledVisibleModules(
  permissions: string[],
  enabledModules: string[] | unknown,
) {
  const permSet = new Set(permissions);
  const enabledArr = safeArray(enabledModules);
  const enabledSet = new Set(enabledArr);
  // Always ensure dashboard is in the set
  enabledSet.add("dashboard");

  return moduleTree
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          permSet.has(item.permissionRequired) &&
          enabledSet.has(item.id),
      ),
    }))
    .filter((group) => group.items.length > 0);
}
