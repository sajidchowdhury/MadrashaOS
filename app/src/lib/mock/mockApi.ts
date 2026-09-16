/**
 * MadrashaOS — Mock API Layer
 *
 * Session C0.4 — Mock-Data Layer & Seeding
 *
 * Async functions that return mock fixture data with realistic latency
 * (300-800ms). Simulates 403 (permission denied) and 500 (server error)
 * for testing error states (Risk R3 / Do-Not-Do D4).
 *
 * Swap path (HandoverSequence §3.2): when the backend ships its OpenAPI
 * 3.1 spec, replace this file with a generated client. Component code
 * stays unchanged because the TanStack Query hooks (query/client.ts)
 * abstract the data source.
 *
 * Network simulation: when sessionStore.network === "slow", latency
 * triples; when "offline", all calls reject with a NetworkError.
 */

import { getSession } from "@/stores/sessionStore";
import {
  organization,
  branches,
} from "./fixtures/organization";
import { users, getUserByRole } from "./fixtures/users";
import {
  classes,
  guardians,
  students,
  getStudentsByClass,
  getStudentById,
} from "./fixtures/students";
import {
  feePlans,
  feePayments,
  accounts,
  ledgerEntries,
  attendanceSessions,
  inventoryItems,
  notices,
  approvals,
} from "./fixtures";
import type {
  Account,
  Approval,
  AttendanceSession,
  Branch,
  Class,
  FeePayment,
  FeePlan,
  Guardian,
  InventoryItem,
  LedgerEntry,
  Notice,
  Organization,
  Student,
  User,
} from "./types";

/* ------------------------------------------------------------------ */
/*  Latency + error simulation                                        */
/* ------------------------------------------------------------------ */

function getNetworkLatency(base: number): number {
  const { network } = getSession();
  if (network === "offline") {
    throw new NetworkError("Network offline (simulated)");
  }
  if (network === "slow") {
    return base * 3; // slow 3G: ~3x latency
  }
  return base;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Random latency in range [min, max]. */
function randomLatency(min = 300, max = 800): number {
  return getNetworkLatency(min + Math.random() * (max - min));
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

export class PermissionDeniedError extends Error {
  constructor(requiredPermission: string) {
    super(`Permission denied: requires '${requiredPermission}'`);
    this.name = "PermissionDeniedError";
  }
}

/**
 * Throws PermissionDeniedError if the current session lacks the permission.
 * Components call checkPermission() before returning data so the mockApi
 * behaves like the real backend (SRS §5.1: server still enforces).
 */
function checkPermission(requiredPermission: string): void {
  const { permissions } = getSession();
  if (!permissions.includes(requiredPermission)) {
    throw new PermissionDeniedError(requiredPermission);
  }
}

/* ------------------------------------------------------------------ */
/*  Public API (mirrors future OpenAPI endpoints)                      */
/* ------------------------------------------------------------------ */

export const mockApi = {
  /* --- Organization --- */
  async getOrganization(): Promise<Organization> {
    await delay(randomLatency());
    return organization;
  },

  async getBranches(): Promise<Branch[]> {
    await delay(randomLatency());
    return branches;
  },

  /* --- Users --- */
  async getCurrentUser(): Promise<User> {
    await delay(randomLatency(150, 400));
    const { role } = getSession();
    const user = getUserByRole(role);
    if (!user) throw new Error(`No user for role ${role}`);
    return user;
  },

  async getUsers(): Promise<User[]> {
    await delay(randomLatency());
    return users;
  },

  /* --- Classes --- */
  async getClasses(): Promise<Class[]> {
    await delay(randomLatency());
    const { branch } = getSession();
    return classes.filter((c) => c.branchId === `br-${branch}`);
  },

  /* --- Guardians --- */
  async getGuardians(): Promise<Guardian[]> {
    checkPermission("guardians.view");
    await delay(randomLatency());
    return guardians;
  },

  /* --- Students --- */
  async getStudents(): Promise<Student[]> {
    checkPermission("students.view");
    await delay(randomLatency());
    return students;
  },

  async getStudentById(id: string): Promise<Student | undefined> {
    checkPermission("students.view");
    await delay(randomLatency(150, 400));
    return getStudentById(id);
  },

  async getStudentsByClass(classId: string, section?: string): Promise<Student[]> {
    checkPermission("students.view");
    await delay(randomLatency());
    return getStudentsByClass(classId, section);
  },

  /* --- Fees --- */
  async getFeePlans(): Promise<FeePlan[]> {
    checkPermission("fees.view");
    await delay(randomLatency());
    return feePlans;
  },

  async getFeePayments(): Promise<FeePayment[]> {
    checkPermission("fees.view");
    await delay(randomLatency());
    return feePayments;
  },

  /* --- Accounting --- */
  async getAccounts(): Promise<Account[]> {
    checkPermission("accounting.ledger.view");
    await delay(randomLatency());
    return accounts;
  },

  async getLedgerEntries(): Promise<LedgerEntry[]> {
    checkPermission("accounting.ledger.view");
    await delay(randomLatency());
    return ledgerEntries;
  },

  /* --- Attendance --- */
  async getAttendanceSessions(): Promise<AttendanceSession[]> {
    checkPermission("attendance.view");
    await delay(randomLatency());
    return attendanceSessions;
  },

  /* --- Inventory --- */
  async getInventory(): Promise<InventoryItem[]> {
    checkPermission("inventory.view");
    await delay(randomLatency());
    return inventoryItems;
  },

  async getLowStockItems(): Promise<InventoryItem[]> {
    checkPermission("inventory.view");
    await delay(randomLatency());
    return inventoryItems.filter((i) => i.qtyInStock <= i.reorderLevel);
  },

  /* --- Notices --- */
  async getNotices(): Promise<Notice[]> {
    checkPermission("notices.view");
    await delay(randomLatency());
    return notices;
  },

  /* --- Approvals --- */
  async getApprovals(): Promise<Approval[]> {
    checkPermission("approval.view");
    await delay(randomLatency());
    return approvals;
  },

  async getPendingApprovals(): Promise<Approval[]> {
    checkPermission("approval.view");
    await delay(randomLatency());
    return approvals.filter((a) => a.status === "pending");
  },
};
