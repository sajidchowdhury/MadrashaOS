"use client";

/**
 * MadrashaOS — AppShell (C4.1 Mobile Shell Polish)
 *
 * Responsive application shell with:
 *   - sticky TopBar (logo, branch, year, language, theme, notifications, user)
 *   - collapsible SideNav (left, module groups — items wired in C2.1)
 *   - main content area (children)
 *   - sticky Footer (mt-auto — pushes to bottom on short content)
 *   - MobileBottomActionBar (C4.1): mobile-only sticky CTA bar that appears
 *     on /attendance/take, /exams/[id]/marks, and /fees routes. Renders a
 *     short, route-specific primary action — visually distinct from each
 *     page's own sticky bar (which lives inside the page content area).
 *     Hidden on md+ (md:hidden) and on non-target routes.
 *   - Mobile drawer (C4.1 polish): now includes a Close (X) button at the
 *     top-right of the drawer for explicit dismissal in addition to the
 *     overlay-click-to-close behavior.
 *
 * Layout pattern (per project UI rule):
 *   min-h-screen flex flex-col → header / flex-1 body / footer mt-auto
 *
 * Mobile behavior:
 *   - SideNav hidden below md breakpoint (768px)
 *   - TopBar shows hamburger toggle for mobile nav drawer
 *   - MobileBottomActionBar visible only on the 3 target routes (md:hidden)
 */

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { TopBar } from "./TopBar";
import { SideNav } from "./SideNav";
import { Footer } from "./Footer";
import { MobileBottomActionBar } from "./MobileBottomActionBar";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col bg-surface-canvas">
      <TopBar onToggleMobileNav={() => setMobileNavOpen((v) => !v)} />
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
            {/* Drawer wrapper — adds a header row with a Close (X) button on mobile. */}
            <div className="fixed inset-y-0 start-0 z-50 flex w-64 max-w-[85vw] flex-col md:hidden">
              <div className="flex items-center justify-between border-b border-border-default bg-primary-700 px-3 py-2 text-primary-foreground">
                <span className="text-subtitle font-semibold">Menu</span>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-md p-1.5 text-primary-foreground transition-colors hover:bg-primary-600 focus-visible:bg-primary-600"
                  aria-label="Close navigation drawer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden bg-surface-card">
                <SideNav
                  className="flex h-full"
                  onNavigate={() => setMobileNavOpen(false)}
                />
              </div>
            </div>
          </>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
      <Footer className="mt-auto" />
      <MobileBottomActionBar pathname={pathname} />
    </div>
  );
}
