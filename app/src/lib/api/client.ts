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

/**
 * Deeply converts snake_case keys to camelCase.
 *
 * The backend API returns snake_case (e.g. `name_bn`, `student_id`,
 * `is_paid`). The frontend was designed against a mock API that used
 * camelCase (`nameBn`, `studentId`, `isPaid`). This transformer bridges
 * the gap so components don't need to change.
 */
function toCamel<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(toCamel) as unknown as T;
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    const source = value as Record<string, unknown>;
    for (const key of Object.keys(source)) {
      const camelKey = key.replace(/_([a-z0-9])/g, (_, c) =>
        c.toUpperCase(),
      );
      result[camelKey] = toCamel(source[key]);
    }
    return result as T;
  }
  return value;
}

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

  const json = await response.json();
  // Transform snake_case → camelCase so frontend components (designed
  // against the camelCase mock API) consume real backend data unchanged.
  return toCamel(json) as T;
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

  return toCamel(await response.json()) as T;
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
        nameBn: string | null;
        email: string;
        role: string;
        organizationId: string;
        branchId: string | null;
      };
      permissions: string[];
    }>("/auth/session").then((res) => ({
      id: res.user.id,
      role: res.user.role,
      name: res.user.name,
      nameBn: res.user.nameBn ?? "",
      email: res.user.email,
      phone: "",
      branchId: res.user.branchId ?? "",
      avatarInitial: res.user.name.charAt(0).toUpperCase(),
      organization_id: res.user.organizationId,
    }));
  },

  // --- Users ---
  async getUsers() {
    return apiFetch<{ data: unknown[] }>("/auth/session").then(() => []);
  },

  // --- Classes ---
  // Returns `sections` as string[] (name-only, backward-compatible with
  // existing callers) AND `sectionsWithIds` as {id, name}[] for callers
  // that need the section UUID (e.g. attendance/take → POST /attendance/sessions
  // requires section_id as a UUID).
  async getClasses() {
    const res = await apiFetch<{ data: Array<{ id: string; name: string; nameBn: string; level: number; sections: Array<{ id: string; name: string }> }> }>("/classes");
    return res.data.map((c) => ({
      id: c.id,
      name: c.name,
      nameBn: c.nameBn,
      level: c.level,
      branchId: "",
      sections: c.sections.map((s) => s.name),
      sectionsWithIds: c.sections.map((s) => ({ id: s.id, name: s.name })),
    }));
  },

  // --- Students ---
  // Frontend expects flat camelCase fields: classId (string), section (name
  // string), guardianId (string), nameBn, nameAr. The API returns nested
  // objects (class: {id,name}, section: {id,name}, primary_guardian: {...}).
  // Flatten here so components don't change.
  async getStudents() {
    const res = await apiFetch<{ data: Array<Record<string, unknown>> }>("/students");
    return res.data.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      nameBn: (s.nameBn as string) ?? "",
      nameAr: (s.nameAr as string) ?? "",
      roll: s.roll,
      gender: s.gender,
      dob: s.dob,
      status: s.status,
      classId: (s.class as { id?: string } | null)?.id ?? "",
      className: (s.class as { name?: string } | null)?.name ?? "",
      section: (s.section as { name?: string } | null)?.name ?? "",
      sectionId: (s.section as { id?: string } | null)?.id ?? "",
      guardianId: (s.primaryGuardian as { id?: string } | null)?.id ?? "",
      guardianName: (s.primaryGuardian as { name?: string } | null)?.name ?? "",
      guardianPhone: (s.primaryGuardian as { phone?: string } | null)?.phone ?? "",
    })) as never;
  },

  async getStudentById(id: string) {
    const s = await apiFetch<Record<string, unknown>>(`/students/${id}`);
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      nameBn: (s.nameBn as string) ?? "",
      nameAr: (s.nameAr as string) ?? "",
      roll: s.roll,
      gender: s.gender,
      dob: s.dob,
      status: s.status,
      classId: (s.class as { id?: string } | null)?.id ?? "",
      className: (s.class as { name?: string } | null)?.name ?? "",
      section: (s.section as { name?: string } | null)?.name ?? "",
      sectionId: (s.section as { id?: string } | null)?.id ?? "",
      guardianId: (s.primaryGuardian as { id?: string } | null)?.id ?? "",
      guardianName: (s.primaryGuardian as { name?: string } | null)?.name ?? "",
    } as never;
  },

  async getStudentHistory(id: string) {
    const res = await apiFetch<{ data: Array<Record<string, unknown>> }>(`/students/${id}/history`);
    return res.data as never;
  },

  async getDocuments() {
    const res = await apiFetch<{ data: Array<Record<string, unknown>> }>("/documents?pageSize=100");
    return res.data as never;
  },

  async getStudentsByClass(classId: string, section?: string) {
    const params = new URLSearchParams({ class_id: classId });
    // The API expects `section` to be a section UUID (section_id), not the
    // section name. If the caller passes a UUID (36 chars with dashes),
    // send it as-is. If they pass a section name, we still send it but the
    // API will interpret it as a section_id (and return no results if it's
    // not a valid UUID). Callers should pass the sectionId UUID.
    if (section) params.set("section", section);
    const res = await apiFetch<{ data: Array<Record<string, unknown>> }>(`/students?${params}`);
    return (res.data as Array<Record<string, unknown>>).map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      nameBn: (s.nameBn as string) ?? "",
      nameAr: (s.nameAr as string) ?? "",
      roll: s.roll,
      gender: s.gender,
      dob: s.dob,
      status: s.status,
      classId: (s.class as { id?: string } | null)?.id ?? "",
      className: (s.class as { name?: string } | null)?.name ?? "",
      section: (s.section as { name?: string } | null)?.name ?? "",
      sectionId: (s.section as { id?: string } | null)?.id ?? "",
      guardianId: (s.primaryGuardian as { id?: string } | null)?.id ?? "",
    })) as never;
  },

  // --- Guardians ---
  async getGuardians() {
    const res = await apiFetch<{ data: Array<Record<string, unknown>> }>("/guardians");
    return res.data as never;
  },

  // --- Employees ---
  // Frontend expects flat camelCase fields. The API returns nested objects
  // (branch, user) so we flatten what the page needs and keep names handy.
  async getEmployees() {
    const res = await apiFetch<{ data: Array<Record<string, unknown>> }>("/employees");
    return res.data.map((e) => ({
      id: e.id,
      employeeCode: e.employeeCode,
      name: e.name,
      nameBn: (e.nameBn as string | null) ?? "",
      email: (e.email as string | null) ?? "",
      designation: (e.designation as string | null) ?? "",
      department: (e.department as string | null) ?? "",
      phone: (e.phone as string | null) ?? "",
      salary: e.salary ?? null,
      joinedAt: e.joinedAt,
      status: e.status,
      photoUrl: e.photoUrl ?? null,
      branch:
        (e.branch as { id?: string; name?: string; code?: string } | null) ?? null,
      user:
        (e.user as { id?: string; status?: string; lastLoginAt?: string } | null) ??
        null,
      createdAt: e.createdAt,
    })) as never;
  },

  // --- Scholarships ---
  async getScholarships() {
    const res = await apiFetch<{ data: Array<Record<string, unknown>> }>("/scholarships");
    return res.data as never;
  },

  // --- Exam Results ---
  async getResults() {
    const res = await apiFetch<{ data: Array<Record<string, unknown>> }>("/results");
    return res.data as never;
  },

  // --- Cash & Bank Transfers ---
  // API returns nested from_account / to_account objects (each with id,
  // name, code, is_cash, is_bank). Flatten the names so the page can render
  // them directly without a separate accounts lookup.
  async getCashBankTransfers() {
    const res = await apiFetch<{ data: Array<Record<string, unknown>> }>("/cashbank/transfers");
    return res.data.map((t) => ({
      id: t.id,
      voucherNo: t.voucherNo,
      fromAccount: (t.fromAccount as { id?: string; name?: string; code?: string } | null) ?? null,
      toAccount: (t.toAccount as { id?: string; name?: string; code?: string } | null) ?? null,
      amount: t.amount,
      fund: t.fund,
      transferDate: t.transferDate,
      narration: t.narration,
      initiatedBy: t.initiatedBy ?? "",
      status: t.status,
      completedAt: t.completedAt,
      ledgerEntryId: t.ledgerEntryId,
    })) as never;
  },

  // --- Fee Plans + Payments ---
  async getFeePlans() {
    // Fetch all plans (pageSize=100) so the dialog can match any student.
    const res = await apiFetch<{ data: Array<Record<string, unknown>> }>("/fees/plans?pageSize=100");
    return res.data as never;
  },

  async getFeePayments() {
    const res = await apiFetch<{ data: Array<Record<string, unknown>> }>("/fees/payments");
    return res.data as never;
  },

  // --- Exams + Marks ---
  async getExams() {
    const res = await apiFetch<{ data: Array<Record<string, unknown>> }>("/exams?pageSize=100");
    return res.data as never;
  },

  async getExamById(id: string) {
    return apiFetch<Record<string, unknown>>(`/exams/${id}`) as never;
  },

  async getExamMarks(examId: string) {
    const res = await apiFetch<{ data: Array<Record<string, unknown>> }>(`/exams/${examId}/marks`);
    return res.data as never;
  },

  // --- Accounts + Ledger ---
  async getAccounts() {
    const res = await apiFetch<{ data: Array<Record<string, unknown>> }>("/accounts");
    return res.data as never;
  },

  // Frontend expects flat ID strings: debitAccount, creditAccount,
  // postedBy (all used as keys to look up account/user names). The API
  // returns nested objects: debitAccount: {id,name,code,type}. Flatten
  // the .id out so the component's accountMap.get(e.debitAccount) works.
  async getLedgerEntries() {
    const res = await apiFetch<{ data: Array<Record<string, unknown>> }>("/ledger");
    return res.data.map((e) => ({
      id: e.id,
      voucherNo: e.voucherNo,
      date: e.date,
      narration: e.narration,
      debitAccount: (e.debitAccount as { id?: string } | null)?.id ?? "",
      debitAccountName: (e.debitAccount as { name?: string } | null)?.name ?? "",
      creditAccount: (e.creditAccount as { id?: string } | null)?.id ?? "",
      creditAccountName: (e.creditAccount as { name?: string } | null)?.name ?? "",
      amount: e.amount,
      fund: e.fund,
      status: e.status,
      // postedBy may already be a name string from the API; keep it as-is
      // so the component's postedBy(id) lookup falls through to ?? id → name.
      postedBy: e.postedBy ?? "",
      postedAt: e.postedAt,
      sourceType: e.sourceType,
      isReversed: e.isReversed,
      runningBalance: e.runningBalance,
    })) as never;
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
