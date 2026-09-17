"use client";

/**
 * MadrashaOS — CMS Content Store (Task 8-a)
 *
 * A Zustand store (persisted to localStorage as "madrasha-cms") that holds
 * ALL customizable public-website content — branding, top bar, navbar,
 * hero, stats, about, programs, alumni, footer, and theme overrides.
 *
 * The public website (PublicLayout + 7 public pages) reads from this
 * store via the `useCms()` hook so an admin can edit content at
 * /app/website/content and see the change propagate live.
 *
 * Pattern mirrors sessionStore.ts (Zustand + persist middleware + a
 * non-hook getState accessor for module-level reads).
 *
 * Per task rules: ONLY THE DEFAULT color tokens here are raw hex strings
 * (the FROZEN primary #0E5C5C + accent #C9A961). The store itself does
 * not style anything — those strings are user-editable content, not
 * component styling, so the no-raw-tokens ESLint rule does not apply.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_CMS_CONTENT,
  type CmsContent,
  type NavItem,
  type Program,
} from "./cms-defaults";

type CmsActions = {
  /** Replace the entire CMS content (used by import + reset). */
  setContent: (next: CmsContent) => void;
  /** Patch a single top-level key (logo, hero, footer, etc.). */
  patch: <K extends keyof CmsContent>(
    key: K,
    value: CmsContent[K],
  ) => void;

  // Branding
  updateLogo: (next: Partial<CmsContent["logo"]>) => void;

  // Navbar
  addNavItem: (item: NavItem, parentIndex?: number) => void;
  updateNavItem: (index: number, next: Partial<NavItem>) => void;
  removeNavItem: (index: number) => void;
  reorderNavItem: (index: number, direction: "up" | "down") => void;
  setCtaButton: (next: Partial<CmsContent["navbar"]["ctaButton"]>) => void;

  // Programs
  addProgram: (program: Program) => void;
  updateProgram: (id: string, next: Partial<Program>) => void;
  removeProgram: (id: string) => void;

  // Stats
  addStat: (stat: CmsContent["stats"][number]) => void;
  updateStat: (index: number, next: Partial<CmsContent["stats"][number]>) => void;
  removeStat: (index: number) => void;

  // Theme
  updateTheme: (next: Partial<CmsContent["theme"]>) => void;

  /** Reset to DEFAULT_CMS_CONTENT (used by the CMS admin "Reset" button). */
  resetCms: () => void;
};

type CmsStore = CmsContent & CmsActions;

function withArr<T>(arr: T[], idx: number, next: Partial<T>): T[] {
  return arr.map((item, i) => (i === idx ? { ...item, ...next } : item));
}

export const useCmsStore = create<CmsStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_CMS_CONTENT,

      setContent: (next) => set({ ...next }),

      patch: (key, value) => set({ [key]: value } as Pick<CmsContent, typeof key>),

      updateLogo: (next) =>
        set({ logo: { ...get().logo, ...next } }),

      addNavItem: (item, parentIndex) =>
        set((state) => {
          if (typeof parentIndex === "number") {
            const items = [...state.navbar.items];
            const parent = items[parentIndex];
            if (!parent) return state;
            const newParent: NavItem = {
              ...parent,
              children: [...(parent.children ?? []), {
                label: item.label,
                href: item.href,
                icon: item.icon,
                description: item.description,
              }],
            };
            items[parentIndex] = newParent;
            return { navbar: { ...state.navbar, items } };
          }
          return {
            navbar: {
              ...state.navbar,
              items: [...state.navbar.items, item],
            },
          };
        }),

      updateNavItem: (index, next) =>
        set((state) => {
          const items = [...state.navbar.items];
          if (!items[index]) return state;
          items[index] = { ...items[index], ...next };
          return { navbar: { ...state.navbar, items } };
        }),

      removeNavItem: (index) =>
        set((state) => {
          const items = state.navbar.items.filter((_, i) => i !== index);
          return { navbar: { ...state.navbar, items } };
        }),

      reorderNavItem: (index, direction) =>
        set((state) => {
          const items = [...state.navbar.items];
          const target = direction === "up" ? index - 1 : index + 1;
          if (target < 0 || target >= items.length) return state;
          [items[index], items[target]] = [items[target], items[index]];
          return { navbar: { ...state.navbar, items } };
        }),

      setCtaButton: (next) =>
        set((state) => ({
          navbar: {
            ...state.navbar,
            ctaButton: { ...state.navbar.ctaButton, ...next },
          },
        })),

      addProgram: (program) =>
        set((state) => ({ programs: [...state.programs, program] })),

      updateProgram: (id, next) =>
        set((state) => ({
          programs: state.programs.map((p) =>
            p.id === id ? { ...p, ...next } : p,
          ),
        })),

      removeProgram: (id) =>
        set((state) => ({
          programs: state.programs.filter((p) => p.id !== id),
        })),

      addStat: (stat) =>
        set((state) => ({ stats: [...state.stats, stat] })),

      updateStat: (index, next) =>
        set((state) => ({
          stats: withArr(state.stats, index, next),
        })),

      removeStat: (index) =>
        set((state) => ({
          stats: state.stats.filter((_, i) => i !== index),
        })),

      updateTheme: (next) =>
        set((state) => ({ theme: { ...state.theme, ...next } })),

      resetCms: () => set({ ...DEFAULT_CMS_CONTENT }),
    }),
    {
      name: "madrasha-cms",
      // Persist every data field, never the action functions.
      partialize: (state) => ({
        logo: state.logo,
        topBar: state.topBar,
        navbar: state.navbar,
        hero: state.hero,
        stats: state.stats,
        about: state.about,
        programs: state.programs,
        alumni: state.alumni,
        footer: state.footer,
        theme: state.theme,
      }),
      // Skip hydration on the server to avoid SSR mismatches — the
      // public layout will render with DEFAULT_CMS_CONTENT during SSR
      // and rehydrate on the client.
      skipHydration: false,
    },
  ),
);

/**
 * Non-hook accessor for use outside React (utility modules, tests).
 * Returns the current CMS content snapshot.
 */
export function getCms(): CmsContent {
  const {
    logo, topBar, navbar, hero, stats, about, programs, alumni, footer, theme,
  } = useCmsStore.getState();
  return {
    logo, topBar, navbar, hero, stats, about, programs, alumni, footer, theme,
  };
}

/** Re-export types for convenience. */
export type { CmsContent, NavItem, Program } from "./cms-defaults";
