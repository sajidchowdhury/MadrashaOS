/**
 * MadrashaOS — Session Types
 *
 * Session C0.4 — Mock-Data Layer & Seeding
 *
 * Core types for the user session state shared across the app:
 *   - 8 personas (Session 0.2) with their permissions
 *   - 3 branches (Dhaka / Chittagong / Sylhet)
 *   - academic year (SRS §2.1.1)
 *   - locale (already in i18n/config.ts, mirrored here for store cohesion)
 *   - network simulation state (normal / slow / offline) for C3.3 mobile flows
 */

import type { Locale } from "@/lib/i18n/config";

/** The 8 personas defined in Session 0.2 — SRS §8.1. */
export const ROLES = [
  "super-admin",
  "authority",
  "administrator",
  "accountant",
  "teacher",
  "storekeeper",
  "guardian",
  "student",
] as const;
export type Role = (typeof ROLES)[number];

/** Native + English labels per role (used by DevToolbar + role pickers). */
export const ROLE_LABELS: Record<Role, { native: string; english: string }> = {
  "super-admin": { native: "Super Admin", english: "Super Admin" },
  authority: { native: "Authority", english: "Authority (Principal)" },
  administrator: { native: "Administrator", english: "Administrator" },
  accountant: { native: "Accountant", english: "Accountant" },
  teacher: { native: "Teacher", english: "Teacher" },
  storekeeper: { native: "Storekeeper", english: "Storekeeper" },
  guardian: { native: "Guardian", english: "Guardian (Parent)" },
  student: { native: "Student", english: "Student" },
};

/** Branch identifiers (SRS §2.1.1 multi-branch). */
export const BRANCHES = ["dhaka", "chittagong", "sylhet"] as const;
export type Branch = (typeof BRANCHES)[number];

export const BRANCH_LABELS: Record<Branch, string> = {
  dhaka: "Dhaka Main Branch",
  chittagong: "Chittagong Branch",
  sylhet: "Sylhet Branch",
};

/** Network simulation modes (Risk R6 — attendance under poor connectivity). */
export const NETWORK_MODES = ["normal", "slow", "offline"] as const;
export type NetworkMode = (typeof NETWORK_MODES)[number];

/**
 * Full session state consumed by the entire app.
 * Persisted to localStorage via Zustand persist middleware so the user's
 * role/branch/locale survives page reloads during development.
 */
export type SessionState = {
  role: Role;
  branch: Branch;
  academicYear: number;
  locale: Locale;
  network: NetworkMode;
  /** Resolved permission codes for the current role (derived). */
  permissions: string[];
};

/** Initial default state (administrator role on Dhaka branch, 2026, en). */
export const initialSessionState: SessionState = {
  role: "administrator",
  branch: "dhaka",
  academicYear: 2026,
  locale: "en",
  network: "normal",
  permissions: [],
};
