"use client";

/**
 * MadrashaOS — App Route Group Layout (Phase C5.2 restructure)
 *
 * Wraps every route under `/dashboard`, `/students`, `/fees`, `/notices`, …
 * in the authenticated AppShell (TopBar + SideNav + Footer +
 * MobileBottomActionBar) plus the DevToolbar floating control panel.
 *
 * The AppShell + DevToolbar were previously mounted at the root layout
 * (which forced the public site and the `/dev/*` routes to inherit them
 * too — undesirable per SRS §2.7.3). They now live here so ONLY the
 * back-office routes pick them up.
 *
 * Route guard (C8 enforcement): a small "Authenticated as [role]" badge
 * is fixed at the bottom-end corner of the viewport whenever the user is
 * on an `(app)` route. It is a visual indicator that this is a protected
 * surface — public visitors (on `/public/*`) see a matching "Public
 * Visitor" badge in their navbar instead.
 *
 * Providers (ThemeProvider, I18nProvider, QueryProvider) are inherited
 * from the root `src/app/layout.tsx`.
 */

import React from "react";
import { AppShell } from "@/components/shell/AppShell";
import { DevToolbar } from "@/components/dev/DevToolbar";
import { useSessionStore } from "@/stores/sessionStore";
import { useCurrentUser } from "@/lib/query/client";
import { ROLE_LABELS } from "@/stores/types";
import { ShieldCheck } from "lucide-react";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = useSessionStore((s) => s.role);
  const setRole = useSessionStore((s) => s.setRole);
  const userQuery = useCurrentUser();

  // Sync the client-side sessionStore with the real server session.
  // The store is persisted in localStorage and may be stale (e.g. the
  // user logged in as a different role since the last visit). We read
  // the real role + permissions from /api/v1/auth/session on mount and
  // update the store so IfPermission checks reflect the actual session.
  React.useEffect(() => {
    if (userQuery.data?.role && userQuery.data.role !== role) {
      setRole(userQuery.data.role as never);
    }
  }, [userQuery.data?.role, role, setRole]);

  return (
    <>
      <AppShell>{children}</AppShell>
      <DevToolbar />

      {/* Route guard — fixed visual indicator that this is a protected route.
       * Per C8 enforcement: public visitors CANNOT reach these routes (the
       * middleware/guard logic should reject them with 401/403 — the badge
       * is a visual reminder for staff that they're in an authenticated
       * surface). */}
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-3 end-3 z-30 hidden items-center gap-1.5 rounded-full border border-border-default bg-surface-card px-3 py-1.5 text-caption font-medium text-text-secondary shadow-elevation-2 backdrop-blur md:inline-flex"
        title={`Authenticated as ${ROLE_LABELS[role].english}`}
      >
        <ShieldCheck className="h-3.5 w-3.5 text-semantic-success" />
        <span>Authenticated as</span>
        <span className="font-semibold text-text-primary">
          {ROLE_LABELS[role].english}
        </span>
      </div>
    </>
  );
}
