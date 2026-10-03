"use client";

/**
 * MadrashaOS — DevToolbar Open Store (Zustand)
 *
 * Lightweight shared state for the DevToolbar's expanded/collapsed state.
 * This decouples the TopBar's bug-icon trigger button from the DevToolbar
 * component (which is rendered in the app layout, not in the TopBar).
 *
 * - TopBar calls `toggle()` when the bug icon is clicked
 * - DevToolbar reads `open` and calls `setOpen()` when its own collapse
 *   button is clicked
 */

import { create } from "zustand";

type DevToolbarStore = {
  open: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
};

export const useDevToolbarStore = create<DevToolbarStore>((set) => ({
  open: false,
  toggle: () => set((s) => ({ open: !s.open })),
  setOpen: (open) => set({ open }),
}));
