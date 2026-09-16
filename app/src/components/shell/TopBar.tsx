"use client";

/**
 * MadrashaOS — TopBar
 *
 * Session C0.3 — Theme Provider & Global Shell Skeleton
 *
 * Sticky top bar in brand Deep Teal (primary-700) with all control slots:
 *   - Logo + brand name
 *   - Branch switcher (placeholder — wired in C2.1 with R1 fresh-tab lock-in)
 *   - Academic year switcher (placeholder — wired in C2.1)
 *   - Search (placeholder)
 *   - Language switcher (functional — from C0.2)
 *   - Theme toggle (functional — from C0.2, upgraded to next-themes)
 *   - Notification bell (placeholder with unread dot)
 *   - User menu (placeholder avatar)
 *
 * Mobile: shows hamburger to toggle SideNav drawer.
 */

import {
  ChevronDown,
  Search,
  Bell,
  Menu as MenuIcon,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LanguageSwitcher } from "@/components/dev/language-switcher";
import { ThemeToggle } from "@/components/dev/theme-toggle";

export function TopBar({
  onToggleMobileNav,
}: {
  onToggleMobileNav?: () => void;
}) {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-primary-800 bg-primary-700 px-3 text-primary-foreground shadow-elevation-2 md:gap-4 md:px-6">
      {/* Hamburger (mobile only) */}
      <button
        type="button"
        onClick={onToggleMobileNav}
        className="rounded-md p-2 text-primary-foreground transition-colors hover:bg-primary-600 md:hidden"
        aria-label="Toggle navigation"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      {/* Logo + brand */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-500 text-accent-foreground shadow-elevation-1">
          <span className="font-bold text-headline">م</span>
        </div>
        <span className="hidden text-title font-bold tracking-tight sm:inline">
          MadrashaOS
        </span>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-primary-600" />

      {/* Branch switcher (placeholder) */}
      <button
        type="button"
        className="hidden items-center gap-1.5 rounded-md bg-primary-600 px-3 py-1.5 text-subtitle transition-colors hover:bg-primary-500 lg:flex"
        aria-label={t("shell.topbar.branch")}
      >
        <span>{t("shell.topbar.branch.dhaka")}</span>
        <ChevronDown className="h-4 w-4" data-directional="true" />
      </button>

      {/* Academic year switcher (placeholder) */}
      <button
        type="button"
        className="hidden items-center gap-1.5 rounded-md bg-primary-600 px-3 py-1.5 text-subtitle transition-colors hover:bg-primary-500 lg:flex"
        aria-label={t("shell.topbar.academicYear")}
      >
        <span>2026</span>
        <ChevronDown className="h-4 w-4" data-directional="true" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search (placeholder, md+) */}
      <div className="hidden items-center gap-2 rounded-md bg-primary-600 px-3 py-1.5 text-subtitle text-primary-100 md:flex">
        <Search className="h-4 w-4" />
        <span className="text-caption">{t("shell.topbar.search.placeholder")}</span>
      </div>

      {/* Language switcher — variant for primary surface */}
      <LanguageSwitcher variant="onPrimary" />

      {/* Theme toggle — variant for primary surface */}
      <ThemeToggle variant="onPrimary" />

      {/* Notifications (placeholder) */}
      <button
        type="button"
        className="relative rounded-md p-2 text-primary-foreground transition-colors hover:bg-primary-600"
        aria-label={t("shell.topbar.notifications")}
      >
        <Bell className="h-5 w-5" />
        <span className="absolute end-1.5 top-1.5 h-2 w-2 rounded-full bg-accent-500 ring-2 ring-primary-700" />
      </button>

      {/* User menu (placeholder) */}
      <button
        type="button"
        className="flex items-center gap-2 rounded-md p-1 transition-colors hover:bg-primary-600"
        aria-label={t("shell.topbar.user.admin")}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-500 text-caption font-bold text-accent-foreground">
          A
        </div>
        <span className="hidden text-subtitle lg:inline">
          {t("shell.topbar.user.admin")}
        </span>
      </button>
    </header>
  );
}
