"use client";

/**
 * MadrashaOS — AppShell
 *
 * Session C0.3 — Theme Provider & Global Shell Skeleton
 *
 * Responsive application shell with:
 *   - sticky TopBar (logo, branch, year, language, theme, notifications, user)
 *   - collapsible SideNav (left, module groups — items wired in C2.1)
 *   - main content area (children)
 *   - sticky Footer (mt-auto — pushes to bottom on short content)
 *
 * Layout pattern (per project UI rule):
 *   min-h-screen flex flex-col → header / flex-1 body / footer mt-auto
 *
 * Mobile behavior:
 *   - SideNav hidden below md breakpoint (768px)
 *   - TopBar shows hamburger toggle for mobile nav drawer (C0.3 simplified: just toggle)
 */

import { useState } from "react";
import { TopBar } from "./TopBar";
import { SideNav } from "./SideNav";
import { Footer } from "./Footer";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-surface-canvas">
      <TopBar
        onToggleMobileNav={() => setMobileNavOpen((v) => !v)}
      />
      <div className="flex flex-1">
        {/* Desktop side nav (md+) */}
        <SideNav className="hidden md:flex" />

        {/* Mobile nav drawer (below md) */}
        {mobileNavOpen && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 z-40 bg-neutral-950/40 md:hidden"
              onClick={() => setMobileNavOpen(false)}
              aria-hidden
            />
            {/* Drawer */}
            <SideNav
              className="fixed inset-y-0 start-0 z-50 flex md:hidden"
              onNavigate={() => setMobileNavOpen(false)}
            />
          </>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
      <Footer className="mt-auto" />
    </div>
  );
}
