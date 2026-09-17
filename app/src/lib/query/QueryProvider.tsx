"use client";

/**
 * MadrashaOS — Query Client Provider
 *
 * Session C0.4 — wraps children in a TanStack QueryClientProvider so
 * every useQuery hook below shares the same cache + devtools.
 *
 * Mounted inside I18nProvider (so locale is available to query functions
 * if needed in the future) and inside ThemeProvider (so the overlay
 * components inherit theme).
 */

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./client";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
