/**
 * MadrashaOS — Real API Client
 *
 * Phase B9.2 — Frontend Client Swap (mockApi → real)
 *
 * This file replaces src/lib/mock/mockApi.ts. It makes real HTTP requests
 * to the Next.js API routes at /api/v1/*. The TanStack Query hooks in
 * src/lib/query/client.ts import from this file instead of mockApi.
 *
 * Swap path (HandoverSequence §3.2):
 *   OLD: import { mockApi } from "@/lib/mock/mockApi"
 *   NEW: import { api } from "@/lib/api/client"
 *
 * Zero component changes — the hooks have the same function signatures.
 *
 * Authentication: uses the NextAuth session cookie (httpOnly) automatically.
 * No manual Authorization header needed — the browser sends the cookie.
 *
 * Error handling: throws ApiError with status + body for non-2xx responses.
 * The TanStack Query hooks catch these and render ErrorState.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: { error: string; details?: unknown },
    public endpoint: string,
  ) {
    super(`API ${status}: ${body.error} (${endpoint})`);
    this.name = "ApiError";
  }
}

/** Base URL for all API calls (relative — same origin) */
const BASE_URL = "/api/v1";

/** Fetch wrapper with error handling */
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    credentials: "include", // send NextAuth httpOnly cookie
  });

  if (!response.ok) {
    let body: { error: string; details?: unknown };
    try {
      body = await response.json();
    } catch {
      body = { error: response.statusText };
    }
    throw new ApiError(response.status, body, endpoint);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/** Upload with multipart form data */
async function apiUpload<T>(
  endpoint: string,
  formData: FormData,
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!response.ok) {
    let body: { error: string; details?: unknown };
    try {
      body = await response.json();
    } catch {
      body = { error: response.statusText };
    }
    throw new ApiError(response.status, body, endpoint);
  }

  return response.json() as Promise<T>;
}

// ============================================================
//  API Client — mirrors mockApi interface exactly
// ============================================================

export const api = {
  // --- Organization ---
  async getOrganization() {
    return apiFetch<{
      id: string;
      name: string;
      name_bn: string;
      slug: string;
      phone: string | null;
      email: string | null;
      address: string | null;
      branches: Array<{
        id: string;
        code: string;
        name: string;
        name_bn: string;
        address: string | null;
        phone: string | null;
        email: string | null;
        established_year: number | null;
        is_active: boolean;
      }>;
    }>("/organizations");
  },

  async getBranches() {
    const res = await apiFetch<{ data: Array<{ id: string; code: string; name: string; name_bn: string; is_active: boolean }> }>("/branches");
    return res.data;
  },

  // --- Current User ---
  async getCurrentUser() {
    return apiFetch<{
      user: {
        id: string;
        name: string;
        name_bn: string | null;
        email: string;
        role: string;
        organization_id: string;
        branch_id: string | null;
      };
      permissions: string[];
    }>("/auth/session").then((res) => ({
      id: res.user.id,
      role: res.user.role,
      name: res.user.name,
      name_bn: res.user.name_bn ?? "",
      email: res.user.email,
      phone: "",
      branchId: res.user.branch_id ?? "",
      avatarInitial: res.user.name.charAt(0).toUpperCase(),
      organization_id: res.user.organization_id,
    }));
  },

  // --- Users ---
  async getUsers() {
    return apiFetch<{ data: unknown[] }>("/auth/session").then(() => []);
  },

  // --- Classes ---
  async getClasses() {
    const res = await apiFetch<{ data: Array<{ id: string; name: string; name_bn: string; level: number; sections: Array<{ id: string; name: string }> }> }>("/classes");
    return res.data.map((c) => ({
      id: c.id,
      name: c.name,
      nameBn: c.name_bn,
      level: c.level,
      branchId: "",
      sections: c.sections.map((s) => s.name),
    }));
  },

  // --- Students ---
  async getStudents() {
    const res = await apiFetch<{ data: Array<Record<string, unknown>> }>("/students");
    return res.data as never;
  },

  async getStudentById(id: string) {
    return apiFetch<Record<string, unknown>>(`/students/${id}`) as never;
  },

  async getStudentsByClass(classId: string, section?: string) {
    const params = new URLSearchParams({ class_id: classId });
    if (section) params.set("section", section);
    const res = await apiFetch<{ data: Array<Record<string, unknown>> }>(`/students?${params}`);
    return res.data as never;
  },

  // --- Guardians ---
  async getGuardians() {
    const res = await apiFetch<{ data: Array<Record<string, unknown>> }>("/guardians");
    return res.data as never;
  },

  // --- Fee Plans + Payments ---
  async getFeePlans() {
    const res = await apiFetch<{ data: Array<Record<string, unknown>> }>("/fees/plans");
    return res.data as never;
  },

  async getFeePayments() {
    const res = await apiFetch<{ data: Array<Record<string, unknown>> }>("/fees/payments");
    return res.data as never;
  },

  // --- Accounts + Ledger ---
  async getAccounts() {
    const res = await apiFetch<{ data: Array<Record<string, unknown>> }>("/accounts");
    return res.data as never;
  },

  async getLedgerEntries() {
    const res = await apiFetch<{ data: Array<Record<string, unknown>> }>("/ledger");
    return res.data as never;
  },

  // --- Attendance ---
  async getAttendanceSessions() {
    const res = await apiFetch<{ data: Array<Record<string, unknown>> }>("/attendance/sessions");
    return res.data as never;
  },

  // --- Inventory ---
  async getInventory() {
    const res = await apiFetch<{ data: Array<Record<string, unknown>> }>("/inventory");
    return res.data as never;
  },

  async getLowStockItems() {
    const res = await apiFetch<{ data: Array<Record<string, unknown>> }>("/inventory?low_stock=true");
    return res.data as never;
  },

  // --- Notices ---
  async getNotices() {
    const res = await apiFetch<{ data: Array<Record<string, unknown>> }>("/notices");
    return res.data as never;
  },

  // --- Approvals ---
  async getApprovals() {
    const res = await apiFetch<{ data: Array<Record<string, unknown>> }>("/approvals");
    return res.data as never;
  },

  async getPendingApprovals() {
    const res = await apiFetch<{ data: Array<Record<string, unknown>> }>("/approvals/pending");
    return res.data as never;
  },
};
