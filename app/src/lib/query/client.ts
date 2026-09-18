"use client";

/**
 * MadrashaOS — TanStack Query Client + Hooks
 *
 * Phase B9.2 — Frontend Client Swap (mockApi → real)
 *
 * SWAP COMPLETE: hooks now call the real API client (src/lib/api/client.ts)
 * instead of the mock API (src/lib/mock/mockApi.ts).
 *
 * The swap is a one-import change:
 *   OLD: import { mockApi } from "@/lib/mock/mockApi";
 *   NEW: import { api } from "@/lib/api/client";
 *
 * Zero component changes — all hooks have the same signatures.
 *
 * The queryKeys still include session role/branch so the cache invalidates
 * when the user switches roles (via DevToolbar in dev, or real login in prod).
 *
 * NOTE: In production, the session is set by NextAuth login (not DevToolbar).
 * The DevToolbar still works for development — it sets the role in the
 * sessionStore, which changes the queryKey, which triggers a refetch.
 * The real API will return 403 for endpoints the DevToolbar-selected role
 * doesn't have — this is correct behavior (server still enforces auth).
 */

import {
  QueryClient,
  useQuery,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { api } from "@/lib/api/client";

/* --- Singleton QueryClient --- */

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30s
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/* --- Query keys (include session so role/branch changes re-fetch) --- */

function sessionKey() {
  const state = useSessionStore.getState();
  return [state.role, state.branch, state.academicYear];
}

/* --- Hooks (one per resource) --- */

export function useOrganization(
  options?: Omit<UseQueryOptions<unknown>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["organization", ...sessionKey()],
    queryFn: () => api.getOrganization(),
    ...options,
  });
}

export function useBranches(
  options?: Omit<UseQueryOptions<unknown[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["branches", ...sessionKey()],
    queryFn: () => api.getBranches(),
    ...options,
  });
}

export function useCurrentUser(
  options?: Omit<UseQueryOptions<unknown>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["current-user", ...sessionKey()],
    queryFn: () => api.getCurrentUser(),
    ...options,
  });
}

export function useClasses(
  options?: Omit<UseQueryOptions<unknown[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["classes", ...sessionKey()],
    queryFn: () => api.getClasses(),
    ...options,
  });
}

export function useStudents(
  options?: Omit<UseQueryOptions<unknown[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["students", ...sessionKey()],
    queryFn: () => api.getStudents(),
    ...options,
  });
}

export function useStudent(
  id: string,
  options?: Omit<UseQueryOptions<unknown>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["student", id, ...sessionKey()],
    queryFn: () => api.getStudentById(id),
    enabled: !!id,
    ...options,
  });
}

export function useStudentsByClass(
  classId: string,
  section?: string,
  options?: Omit<UseQueryOptions<unknown[]>, "queryKey" | "queryFn">,
) {
  const key = useMemo(
    () => ["students-by-class", classId, section ?? "all", ...sessionKey()],
    [classId, section],
  );
  return useQuery({
    queryKey: key,
    queryFn: () => api.getStudentsByClass(classId, section),
    enabled: !!classId,
    ...options,
  });
}

export function useGuardians(
  options?: Omit<UseQueryOptions<unknown[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["guardians", ...sessionKey()],
    queryFn: () => api.getGuardians(),
    ...options,
  });
}

export function useFeePlans(
  options?: Omit<UseQueryOptions<unknown[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["fee-plans", ...sessionKey()],
    queryFn: () => api.getFeePlans(),
    ...options,
  });
}

export function useFeePayments(
  options?: Omit<UseQueryOptions<unknown[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["fee-payments", ...sessionKey()],
    queryFn: () => api.getFeePayments(),
    ...options,
  });
}

export function useAccounts(
  options?: Omit<UseQueryOptions<unknown[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["accounts", ...sessionKey()],
    queryFn: () => api.getAccounts(),
    ...options,
  });
}

export function useLedgerEntries(
  options?: Omit<UseQueryOptions<unknown[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["ledger-entries", ...sessionKey()],
    queryFn: () => api.getLedgerEntries(),
    ...options,
  });
}

export function useAttendanceSessions(
  options?: Omit<UseQueryOptions<unknown[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["attendance-sessions", ...sessionKey()],
    queryFn: () => api.getAttendanceSessions(),
    ...options,
  });
}

export function useInventory(
  options?: Omit<UseQueryOptions<unknown[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["inventory", ...sessionKey()],
    queryFn: () => api.getInventory(),
    ...options,
  });
}

export function useLowStockItems(
  options?: Omit<UseQueryOptions<unknown[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["low-stock", ...sessionKey()],
    queryFn: () => api.getLowStockItems(),
    ...options,
  });
}

export function useNotices(
  options?: Omit<UseQueryOptions<unknown[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["notices", ...sessionKey()],
    queryFn: () => api.getNotices(),
    ...options,
  });
}

export function useApprovals(
  options?: Omit<UseQueryOptions<unknown[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["approvals", ...sessionKey()],
    queryFn: () => api.getApprovals(),
    ...options,
  });
}

export function usePendingApprovals(
  options?: Omit<UseQueryOptions<unknown[]>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: ["pending-approvals", ...sessionKey()],
    queryFn: () => api.getPendingApprovals(),
    ...options,
  });
}
