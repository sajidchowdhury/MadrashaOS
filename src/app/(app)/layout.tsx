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
import { useSessionStore } from "@/stores/sessionStore";
import { useCurrentUser } from "@/lib/query/client";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = useSessionStore((s) => s.role);
  const setRole = useSessionStore((s) => s.setRole);
  const userQuery = useCurrentUser();

  // Sync the client-side sessionStore with the real server session.
  React.useEffect(() => {
    if (userQuery.data?.role && userQuery.data.role !== role) {
      setRole(userQuery.data.role as never);
    }
  }, [userQuery.data?.role, role, setRole]);

  return (
    <>
      <AppShell>{children}</AppShell>
      <HelpButton />
      <DevToolbar />
    </>
  );
}
