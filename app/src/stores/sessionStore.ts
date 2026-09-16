"use client";

/**
 * MadrashaOS — Session Store (Zustand)
 *
 * Session C0.4 — Mock-Data Layer & Seeding
 *
 * Central client-side state for the current user's session:
 *   - role (1 of 8 personas — Session 0.2)
 *   - branch (Dhaka / Chittagong / Sylhet)
 *   - academicYear (2026 default)
 *   - network (normal / slow / offline — Risk R6 simulation)
 *   - permissions[] (derived from role via role-permissions.ts)
 *
 * Locale is intentionally NOT stored here — it lives in the I18nProvider
 * (cookie-persisted) so server + client agree. This store is client-only.
 *
 * Persisted to localStorage so the DevToolbar's role/branch selections
 * survive page reloads during development.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  initialSessionState,
  type Branch,
  type NetworkMode,
  type Role,
  type SessionState,
} from "./types";
import { getRolePermissions } from "@/lib/auth/role-permissions";
import type { Locale } from "@/lib/i18n/config";

type SessionActions = {
  setRole: (role: Role) => void;
  setBranch: (branch: Branch) => void;
  setAcademicYear: (year: number) => void;
  setLocale: (locale: Locale) => void;
  setNetwork: (mode: NetworkMode) => void;
  /** Returns true if the current role has the given permission code. */
  hasPermission: (code: string) => boolean;
  /** Reset to defaults (used by DevToolbar "reset" action). */
  reset: () => void;
};

type SessionStore = SessionState & SessionActions;

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      ...initialSessionState,
      // Derive permissions for the initial role so the store is consistent
      // from first render (avoid the empty-permissions flash on reload).
      permissions: getRolePermissions(initialSessionState.role),

      setRole: (role) =>
        set({ role, permissions: getRolePermissions(role) }),

      setBranch: (branch) => set({ branch }),
      setAcademicYear: (academicYear) => set({ academicYear }),
      setLocale: (locale) => set({ locale }),
      setNetwork: (network) => set({ network }),

      hasPermission: (code) => get().permissions.includes(code),

      reset: () =>
        set({
          ...initialSessionState,
          permissions: getRolePermissions(initialSessionState.role),
        }),
    }),
    {
      name: "madrasha-session",
      // Only persist the data fields, not the action functions.
      partialize: (state) => ({
        role: state.role,
        branch: state.branch,
        academicYear: state.academicYear,
        locale: state.locale,
        network: state.network,
        permissions: state.permissions,
      }),
    },
  ),
);

/**
 * Non-hook accessor for use in modules outside React (e.g. mockApi,
 * utility functions). Returns the current session state snapshot.
 */
export function getSession(): SessionState {
  const { role, branch, academicYear, locale, network, permissions } =
    useSessionStore.getState();
  return { role, branch, academicYear, locale, network, permissions };
}
