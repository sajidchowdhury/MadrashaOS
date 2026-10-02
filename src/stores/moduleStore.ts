"use client";

/**
 * MadrashaOS — Module Store (Zustand + persist)
 *
 * Tracks which modules the user has chosen to ENABLE in their sidebar.
 * Uses an ARRAY (not Set) for localStorage compatibility — Sets don't
 * serialize/deserialize properly with JSON.
 *
 * Persisted to localStorage so the selection survives page reloads.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { moduleTree } from "@/lib/nav/moduleTree";

// All module IDs (flattened from moduleTree)
export const ALL_MODULE_IDS: string[] = moduleTree.flatMap((g) => g.items.map((i) => i.id));

// Modules that are always on (can't be disabled)
const ALWAYS_ON = ["dashboard"];

// Default: enable a "core" set for new madrashas
const DEFAULT_ENABLED = [
  "dashboard",
  "organization",
  "rbac",
  "employees",
  "fees",
  "accounting",
  "reports",
  "notices",
  "documents",
  "settings",
];

type ModuleStoreState = {
  /** Array of enabled module IDs (JSON-serializable) */
  enabledModules: string[];
  toggleModule: (id: string) => void;
  enableModule: (id: string) => void;
  disableModule: (id: string) => void;
  enableAll: () => void;
  resetToDefaults: () => void;
};

export const useModuleStore = create<ModuleStoreState>()(
  persist(
    (set) => ({
      enabledModules: DEFAULT_ENABLED,

      toggleModule: (id) => {
        if (ALWAYS_ON.includes(id)) return;
        set((state) => {
          if (state.enabledModules.includes(id)) {
            return { enabledModules: state.enabledModules.filter((m) => m !== id) };
          }
          return { enabledModules: [...state.enabledModules, id] };
        });
      },

      enableModule: (id) => {
        set((state) => {
          if (state.enabledModules.includes(id)) return state;
          return { enabledModules: [...state.enabledModules, id] };
        });
      },

      disableModule: (id) => {
        if (ALWAYS_ON.includes(id)) return;
        set((state) => ({
          enabledModules: state.enabledModules.filter((m) => m !== id),
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
    },
  ),
);

/**
 * Returns the module tree filtered by BOTH:
 *   1. The user's permissions
 *   2. The user's module store selection
 */
export function getEnabledVisibleModules(
  permissions: string[],
  enabledModules: string[],
) {
  const permSet = new Set(permissions);
  const enabledSet = new Set(enabledModules);
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
