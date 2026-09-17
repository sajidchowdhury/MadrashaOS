"use client";

/**
 * MadrashaOS — TanStack Query Client + Hooks
 *
 * Session C0.4 — Mock-Data Layer & Seeding
 *
 * Provides typed query hooks that call mockApi today, swap to the
 * OpenAPI-generated client tomorrow (HandoverSequence §3.2). Each hook
 * automatically re-fetches when the session role/branch changes via the
 * queryKey.
 *
 * The QueryClient is created once and shared via React context (provider
 * mounted in src/app/layout.tsx — added in this session).
 */

import {
  QueryClient,
  useQuery,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { getSession } from "@/stores/sessionStore";
import { mockApi } from "@/lib/mock/mockApi";
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
} from "@/lib/mock/types";

/* --- Singleton QueryClient --- */

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30s — short enough to demo refetch, long enough to avoid spam
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/* --- Query keys (include session so role/branch changes re-fetch) --- */

function sessionKey() {
  const s = getSession();
  return [s.role, s.branch, s.academicYear];
}

/* --- Hooks (one per resource) --- */

export function useOrganization(
  options?: Omit<UseQueryOptions<Organization>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["organization", ...sessionKey()],
    queryFn: () => mockApi.getOrganization(),
    ...options,
  });
}

export function useBranches(
  options?: Omit<UseQueryOptions<Branch[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["branches", ...sessionKey()],
    queryFn: () => mockApi.getBranches(),
    ...options,
  });
}

export function useCurrentUser(
  options?: Omit<UseQueryOptions<User>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["current-user", ...sessionKey()],
    queryFn: () => mockApi.getCurrentUser(),
    ...options,
  });
}

export function useClasses(
  options?: Omit<UseQueryOptions<Class[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["classes", ...sessionKey()],
    queryFn: () => mockApi.getClasses(),
    ...options,
  });
}

export function useStudents(
  options?: Omit<UseQueryOptions<Student[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["students", ...sessionKey()],
    queryFn: () => mockApi.getStudents(),
    ...options,
  });
}

export function useStudent(
  id: string,
  options?: Omit<UseQueryOptions<Student | undefined>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["student", id, ...sessionKey()],
    queryFn: () => mockApi.getStudentById(id),
    enabled: !!id,
    ...options,
  });
}

export function useStudentsByClass(
  classId: string,
  section?: string,
  options?: Omit<UseQueryOptions<Student[]>, "queryKey" | "queryFn">,
) {
  // Memoize the key so it doesn't change identity on every render.
  const key = useMemo(
    () => ["students-by-class", classId, section ?? "all", ...sessionKey()],
    [classId, section],
  );
  return useQuery({
    queryKey: key,
    queryFn: () => mockApi.getStudentsByClass(classId, section),
    enabled: !!classId,
    ...options,
  });
}

export function useGuardians(
  options?: Omit<UseQueryOptions<Guardian[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["guardians", ...sessionKey()],
    queryFn: () => mockApi.getGuardians(),
    ...options,
  });
}

export function useFeePlans(
  options?: Omit<UseQueryOptions<FeePlan[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["fee-plans", ...sessionKey()],
    queryFn: () => mockApi.getFeePlans(),
    ...options,
  });
}

export function useFeePayments(
  options?: Omit<UseQueryOptions<FeePayment[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["fee-payments", ...sessionKey()],
    queryFn: () => mockApi.getFeePayments(),
    ...options,
  });
}

export function useAccounts(
  options?: Omit<UseQueryOptions<Account[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["accounts", ...sessionKey()],
    queryFn: () => mockApi.getAccounts(),
    ...options,
  });
}

export function useLedgerEntries(
  options?: Omit<UseQueryOptions<LedgerEntry[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["ledger-entries", ...sessionKey()],
    queryFn: () => mockApi.getLedgerEntries(),
    ...options,
  });
}

export function useAttendanceSessions(
  options?: Omit<UseQueryOptions<AttendanceSession[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["attendance-sessions", ...sessionKey()],
    queryFn: () => mockApi.getAttendanceSessions(),
    ...options,
  });
}

export function useInventory(
  options?: Omit<UseQueryOptions<InventoryItem[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["inventory", ...sessionKey()],
    queryFn: () => mockApi.getInventory(),
    ...options,
  });
}

export function useLowStockItems(
  options?: Omit<UseQueryOptions<InventoryItem[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["low-stock", ...sessionKey()],
    queryFn: () => mockApi.getLowStockItems(),
    ...options,
  });
}

export function useNotices(
  options?: Omit<UseQueryOptions<Notice[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["notices", ...sessionKey()],
    queryFn: () => mockApi.getNotices(),
    ...options,
  });
}

export function useApprovals(
  options?: Omit<UseQueryOptions<Approval[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["approvals", ...sessionKey()],
    queryFn: () => mockApi.getApprovals(),
    ...options,
  });
}

export function usePendingApprovals(
  options?: Omit<UseQueryOptions<Approval[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["pending-approvals", ...sessionKey()],
    queryFn: () => mockApi.getPendingApprovals(),
    ...options,
  });
}
