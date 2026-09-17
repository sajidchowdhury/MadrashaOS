"use client";

/**
 * MadrashaOS — TopBar (C4.1 Hi-Fi Polish)
 *
 * Sticky top bar in brand Deep Teal (primary-700) with all control slots:
 *   - Logo + brand name
 *   - Branch switcher (placeholder — wired in C2.1 with R1 fresh-tab lock-in)
 *   - Academic year switcher (placeholder — wired in C2.1)
 *   - Search (placeholder)
 *   - Language switcher (functional — variant="onPrimary")
 *   - Theme toggle (functional — variant="onPrimary")
 *   - Notification bell flyout (C4.1) — DropdownMenu showing 5 most recent
 *     notices pulled via useNotices() hook. Each item shows title + date +
 *     audience badge. Unread count badge on the bell (red dot with number).
 *     "View all" link at the bottom.
 *   - User menu flyout (C4.1) — DropdownMenu showing user name + role at top
 *     (pulled via useCurrentUser() hook) with Profile / Settings / Logout items.
 *
 * Mobile: shows hamburger to toggle SideNav drawer.
 */

import {
  ChevronDown,
  Search,
  Bell,
  Menu as MenuIcon,
  User as UserIcon,
  Settings,
  LogOut,
  BellOff,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LanguageSwitcher } from "@/components/dev/language-switcher";
import { ThemeToggle } from "@/components/dev/theme-toggle";
import { useNotices, useCurrentUser } from "@/lib/query/client";
import { useSessionStore } from "@/stores/sessionStore";
import { ROLE_LABELS, type Role } from "@/stores/types";
import { formatDate } from "@/lib/i18n/format";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

/** Audience badge tone + label map (uses FROZEN token utilities). */
const AUDIENCE_TONE: Record<
  string,
  { label: string; className: string }
> = {
  all: { label: "All", className: "border-border-strong bg-neutral-100 text-text-secondary" },
  staff: { label: "Staff", className: "border-primary-200 bg-primary-50 text-primary-700" },
  guardians: { label: "Guardians", className: "border-accent-100 bg-accent-50 text-accent-700" },
  class: { label: "Class", className: "border-info/30 bg-info-50 text-info" },
};

export function TopBar({
  onToggleMobileNav,
}: {
  onToggleMobileNav?: () => void;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const role = useSessionStore((s) => s.role) as Role;
  const resetSession = useSessionStore((s) => s.reset);

  const { data: notices } = useNotices();
  const { data: currentUser } = useCurrentUser();

  // 5 most recent notices — newest first by sentAt.
  const recentNotices = (notices ?? [])
    .slice()
    .sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1))
    .slice(0, 5);

  // Mocked unread count = number of notices from the last 7 days.
  // In a real backend this would be a per-user `read_at` join; here we
  // surface a representative count so the badge always renders in demos.
  const unreadCount = Math.min(
    (notices ?? []).filter((n) => {
      const sent = new Date(n.sentAt).getTime();
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return sent >= sevenDaysAgo;
    }).length,
    9,
  );

  const userLabel = currentUser?.name ?? ROLE_LABELS[role].native;
  const userInitial = currentUser?.avatarInitial ?? userLabel.charAt(0).toUpperCase();
  const roleLabel = ROLE_LABELS[role].english;

  function handleLogout() {
    toast({
      title: "Signed out",
      description: "Session cleared (dev mode — switch role via the DevToolbar).",
    });
    resetSession();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-primary-800 bg-primary-700 px-3 text-primary-foreground shadow-elevation-2 md:gap-4 md:px-6">
      {/* Hamburger (mobile only) */}
      <button
        type="button"
        onClick={onToggleMobileNav}
        className="rounded-md p-2 text-primary-foreground transition-colors hover:bg-primary-600 focus-visible:bg-primary-600 md:hidden"
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
        className="hidden items-center gap-1.5 rounded-md bg-primary-600 px-3 py-1.5 text-subtitle transition-colors hover:bg-primary-500 focus-visible:bg-primary-500 lg:flex"
        aria-label={t("shell.topbar.branch")}
      >
        <span>{t("shell.topbar.branch.dhaka")}</span>
        <ChevronDown className="h-4 w-4" data-directional="true" />
      </button>

      {/* Academic year switcher (placeholder) */}
      <button
        type="button"
        className="hidden items-center gap-1.5 rounded-md bg-primary-600 px-3 py-1.5 text-subtitle transition-colors hover:bg-primary-500 focus-visible:bg-primary-500 lg:flex"
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

      {/* Notifications flyout (C4.1) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="relative rounded-md p-2 text-primary-foreground transition-colors hover:bg-primary-600 focus-visible:bg-primary-600"
            aria-label={t("shell.topbar.notifications")}
            aria-haspopup="menu"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
              <span
                className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-semantic-danger px-1 text-[10px] font-bold leading-none text-danger-foreground ring-2 ring-primary-700"
                aria-label={`${unreadCount} unread notifications`}
              >
                {unreadCount}
              </span>
            ) : (
              <span className="absolute end-1.5 top-1.5 h-2 w-2 rounded-full bg-accent-500 ring-2 ring-primary-700" />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-[min(22rem,calc(100vw-2rem))] p-0"
          sideOffset={8}
        >
          <div className="flex items-center justify-between border-b border-border-default px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary-500" />
              <span className="text-subtitle font-semibold text-text-primary">
                Notifications
              </span>
            </div>
            {unreadCount > 0 && (
              <Badge
                variant="outline"
                className="border-semantic-danger/40 bg-danger-50 text-semantic-danger"
              >
                {unreadCount} new
              </Badge>
            )}
          </div>

          {recentNotices.length === 0 ? (
            <div className="flex flex-col items-center gap-1 px-3 py-6 text-center">
              <BellOff className="h-5 w-5 text-text-muted" />
              <p className="text-body text-text-secondary">No notices yet</p>
            </div>
          ) : (
            <ul role="menu" className="max-h-80 overflow-y-auto">
              {recentNotices.map((n) => {
                const tone =
                  AUDIENCE_TONE[n.audience] ?? AUDIENCE_TONE.all;
                return (
                  <li
                    key={n.id}
                    role="menuitem"
                    className="cursor-pointer border-b border-border-default px-3 py-2.5 transition-colors last:border-b-0 hover:bg-surface-hover focus:bg-surface-hover"
                    tabIndex={0}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-body font-medium text-text-primary">
                        {locale === "bn" ? n.titleBn : n.title}
                      </p>
                      <Badge
                        variant="outline"
                        className={`shrink-0 ${tone.className}`}
                      >
                        {tone.label}
                      </Badge>
                    </div>
                    <p className="mt-1 text-caption text-text-muted">
                      {formatDate(new Date(n.sentAt), locale)} ·{" "}
                      {n.recipientCount} recipients
                    </p>
                  </li>
                );
              })}
            </ul>
          )}

          <DropdownMenuSeparator className="m-0" />
          <DropdownMenuItem
            className="cursor-pointer justify-center text-primary-500 focus:text-primary-600"
            onClick={() => router.push("/notices")}
          >
            View all notices
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User menu flyout (C4.1) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-md p-1 transition-colors hover:bg-primary-600 focus-visible:bg-primary-600"
            aria-label={`User menu — ${userLabel}`}
            aria-haspopup="menu"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-500 text-caption font-bold text-accent-foreground">
              {userInitial}
            </div>
            <span className="hidden text-subtitle lg:inline">{userLabel}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60" sideOffset={8}>
          <DropdownMenuLabel className="block">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-subtitle font-bold text-primary-700">
                {userInitial}
              </div>
              <div className="min-w-0">
                <p className="truncate text-subtitle font-semibold text-text-primary">
                  {userLabel}
                </p>
                <p className="truncate text-caption text-text-secondary">
                  {roleLabel}
                </p>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => router.push("/dashboard")}
          >
            <UserIcon className="h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => router.push("/organization")}
          >
            <Settings className="h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-semantic-danger focus:text-semantic-danger"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
