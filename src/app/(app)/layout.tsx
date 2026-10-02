"use client";

/**
 * MadrashaOS — App Route Group Layout (v1.0 — clean)
 *
 * Wraps every route under `/dashboard`, `/students`, `/fees`, `/notices`, …
 * in the authenticated AppShell (TopBar + SideNav + Footer) + DevToolbar.
 *
 * Providers (ThemeProvider, I18nProvider, QueryProvider) are inherited
 * from the root `src/app/layout.tsx`.
 */

import React from "react";
import { AppShell } from "@/components/shell/AppShell";
import { DevToolbar } from "@/components/dev/DevToolbar";
import { HelpButton } from "@/components/shell/HelpButton";
import { ModuleSelectorButton } from "@/components/shell/ModuleSelectorButton";
import { useSessionStore } from "@/stores/sessionStore";
import { useCurrentUser } from "@/lib/query/client";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const setRole = useSessionStore((s) => s.setRole);
  const userQuery = useCurrentUser();

  // Sync the client-side sessionStore with the real server session.
  //
  // IMPORTANT: We use a ref to track the last role we synced FROM the
  // server, and only call setRole when the SERVER role changes. This
  // prevents the infinite loop:
  //   - Before: effect deps included `role` (store state) → calling
  //     setRole changed `role` → effect re-ran → loop.
  //   - Now: effect deps are only [userQuery.data?.role, setRole].
  //     setRole is stable (Zustand returns the same function reference),
  //     so the effect only runs when the server session's role actually
  //     changes (e.g. on login/role switch). The ref guards against
  //     re-calling setRole for the same value.
  const lastSyncedRole = React.useRef<string | undefined>(undefined);

  React.useEffect(() => {
    const serverRole = userQuery.data?.role;
    if (serverRole && serverRole !== lastSyncedRole.current) {
      lastSyncedRole.current = serverRole;
      setRole(serverRole as never);
    }
  }, [userQuery.data?.role, setRole]);

  return (
    <>
      <AppShell>{children}</AppShell>
      <HelpButton />
      <ModuleSelectorButton />
      <DevToolbar />
    </>
  );
}
