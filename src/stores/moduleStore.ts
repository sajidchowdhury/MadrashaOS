"use client";

/**
 * MadrashaOS — Module Store (Zustand + persist)
 *
 * Tracks which modules the user has chosen to ENABLE in their sidebar.
 * Modules not in the `enabledModules` set are hidden from the SideNav
 * (even if the user has permission to view them).
 *
 * This lets a madrasha start with just "Accounts" and later enable
 * other modules (Inventory, Exams, etc.) when they're ready.
 *
 * The "dashboard" module is ALWAYS enabled (can't be turned off).
 *
 * Persisted to localStorage so the selection survives page reloads.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { moduleTree, type ModuleDef } from "@/lib/nav/moduleTree";

// All module IDs (flattened from moduleTree)
export const ALL_MODULE_IDS: string[] = moduleTree.flatMap((g) => g.items.map((i) => i.id));

// Modules that are always on (can't be disabled)
const ALWAYS_ON = new Set(["dashboard"]);

// Default: enable a "core" set for new madrashas
const DEFAULT_ENABLED = new Set([
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
]);

type ModuleStoreState = {
  /** Set of enabled module IDs */
  enabledModules: Set<string>;
  /** Toggle a module on/off */
  toggleModule: (id: string) => void;
  /** Enable a module */
  enableModule: (id: string) => void;
  /** Disable a module (unless it's always-on) */
  disableModule: (id: string) => void;
  /** Enable all modules */
  enableAll: () => void;
  /** Reset to defaults (core set) */
  resetToDefaults: () => void;
  /** Check if a module is enabled */
  isModuleEnabled: (id: string) => boolean;
};

export const useModuleStore = create<ModuleStoreState>()(
  persist(
    (set, get) => ({
      enabledModules: DEFAULT_ENABLED,

      toggleModule: (id) => {
        if (ALWAYS_ON.has(id)) return; // can't toggle always-on modules
        set((state) => {
          const next = new Set(state.enabledModules);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return { enabledModules: next };
        });
      },

      enableModule: (id) => {
        set((state) => {
          const next = new Set(state.enabledModules);
          next.add(id);
          return { enabledModules: next };
        });
      },

      disableModule: (id) => {
        if (ALWAYS_ON.has(id)) return;
        set((state) => {
          const next = new Set(state.enabledModules);
          next.delete(id);
          return { enabledModules: next };
        });
      },

      enableAll: () => {
        set({ enabledModules: new Set(ALL_MODULE_IDS) });
      },

      resetToDefaults: () => {
        set({ enabledModules: new Set(DEFAULT_ENABLED) });
      },

      isModuleEnabled: (id) => {
        return get().enabledModules.has(id);
      },
    }),
    {
      name: "madrasha-module-store",
      // Set serialization/deserialization (Sets aren't JSON-serializable)
      serialize: (state) => JSON.stringify({
        ...state,
        state: {
          ...state.state,
          enabledModules: Array.from(state.state.enabledModules),
        },
      }),
      deserialize: (str) => {
        const parsed = JSON.parse(str);
        return {
          ...parsed,
          state: {
            ...parsed.state,
            enabledModules: new Set(parsed.state.enabledModules),
          },
        };
      },
    },
  ),
);

/**
 * Returns the module tree filtered by BOTH:
 *   1. The user's permissions (getVisibleModules logic)
 *   2. The user's module store selection (enabled/disabled)
 *
 * This is used by SideNav to render only the modules the user has
 * permission for AND has chosen to enable.
 */
export function getEnabledVisibleModules(
  permissions: string[],
  enabledModules: Set<string>,
) {
  const permSet = new Set(permissions);
  return moduleTree
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          permSet.has(item.permissionRequired) &&
          enabledModules.has(item.id),
      ),
    }))
    .filter((group) => group.items.length > 0);
}
