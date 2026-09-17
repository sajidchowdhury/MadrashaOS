"use client";

/**
 * MadrashaOS — Public Layout (Phase C5.2)
 *
 * The public-facing site chrome. Used by the `(public)` route group.
 *
 * Deliberate omissions vs. AppShell (per SRS §2.7.3 — public website is a
 * separate surface from the back-office):
 *   - NO TopBar with branch switcher / academic year switcher / user menu
 *   - NO SideNav (the back-office module tree)
 *   - NO DevToolbar (role / branch / network simulation — internal-only tooling)
 *   - NO MobileBottomActionBar (back-office page-level CTA bar)
 *
 * What it DOES include:
 *   - Sticky white navbar with logo, primary nav, language switcher, theme toggle
 *   - Hamburger drawer on mobile (< md breakpoint)
 *   - "Public Visitor" badge in the navbar (route-guard visual indicator, per C8)
 *   - Main content area (children)
 *   - Sticky footer with madrasha info + copyright + locale indicator
 *
 * Layout pattern (per project UI rule):
 *   min-h-screen flex flex-col → header / flex-1 body / footer mt-auto
 */

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu, X, Home, BookOpen, GraduationCap, Megaphone,
  CalendarDays, Mail, Heart, Globe, Sun, Moon, ShieldCheck,
  MapPin, Phone, Mail as MailIcon,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useTheme } from "next-themes";
import { LanguageSwitcher } from "@/components/dev/language-switcher";
import { tokenVersion } from "@/lib/design-system/tokens";

type NavLink = {
  href: string;
  labelKey: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV_LINKS: NavLink[] = [
  { href: "/public", labelKey: "public.nav.home", label: "Home", icon: Home },
  { href: "/public/programs", labelKey: "public.nav.programs", label: "Programs", icon: BookOpen },
  { href: "/public/admission", labelKey: "public.nav.admission", label: "Admission", icon: GraduationCap },
  { href: "/public/notices", labelKey: "public.nav.notices", label: "Notices", icon: Megaphone },
  { href: "/public/events", labelKey: "public.nav.events", label: "Events", icon: CalendarDays },
  { href: "/public/contact", labelKey: "public.nav.contact", label: "Contact", icon: Mail },
  { href: "/public/donate", labelKey: "public.nav.donate", label: "Donate", icon: Heart },
];

/**
 * Minimal theme toggle for the public navbar.
 * Same shape as the dev theme-toggle but uses default variant
 * (white card surface) so it sits cleanly on the white navbar.
 */
function PublicThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const isDark = resolvedTheme === "dark";
  if (!mounted) {
    return <div className="h-9 w-9 rounded-full border border-border-default" aria-hidden />;
  }
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border-default bg-surface-card text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={isDark}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { locale } = useI18n();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  // Close the mobile drawer on route change.
  React.useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/public" ? pathname === "/public" : pathname.startsWith(href);

  return (
    <div className="flex min-h-screen flex-col bg-surface-canvas">
      {/* -----------------------------------------------------------
       * Sticky navbar
       * --------------------------------------------------------- */}
      <header
        className="sticky top-0 z-40 border-b border-border-default bg-surface-card shadow-elevation-1"
      >
        <div className="mx-auto flex max-w-[var(--grid-max-width)] items-center gap-3 px-4 py-3 md:px-6">
          {/* Brand */}
          <Link
            href="/public"
            className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="MadrashaOS — public home"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500 font-mono text-subtitle font-bold text-primary-foreground shadow-elevation-1">
              م
            </span>
            <span className="hidden flex-col leading-tight sm:flex">
              <span className="text-subtitle font-semibold text-text-primary">
                Darul Irfan Madrasha
              </span>
              <span className="text-caption text-text-muted">
                Est. 2001 · Dhaka, Bangladesh
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav
            aria-label="Primary"
            className="mx-auto hidden items-center gap-1 md:flex"
          >
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-body font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                    active
                      ? "bg-primary-50 text-primary-700"
                      : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side — language, theme, public badge */}
          <div className="ms-auto flex items-center gap-2 md:ms-0">
            <span
              className="hidden items-center gap-1 rounded-full border border-success-200 bg-success-50 px-2.5 py-1 text-caption font-medium text-semantic-success sm:inline-flex"
              title="Route guard — public visitor"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Public Visitor
            </span>
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            <PublicThemeToggle />

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileNavOpen((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border-default bg-surface-card text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 md:hidden"
              aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileNavOpen}
              aria-controls="public-mobile-nav"
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileNavOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-neutral-950/40 md:hidden"
              onClick={() => setMobileNavOpen(false)}
              aria-hidden
            />
            <nav
              id="public-mobile-nav"
              aria-label="Mobile primary"
              className="fixed inset-y-0 end-0 z-50 flex w-72 max-w-[85vw] flex-col bg-surface-card shadow-elevation-4 md:hidden"
            >
              <div className="flex items-center justify-between border-b border-border-default bg-primary-700 px-4 py-3 text-primary-foreground">
                <span className="text-subtitle font-semibold">Menu</span>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-md p-1.5 text-primary-foreground transition-colors hover:bg-primary-600 focus-visible:bg-primary-600"
                  aria-label="Close navigation menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ul className="flex-1 overflow-y-auto p-2">
                {NAV_LINKS.map((link) => {
                  const Icon = link.icon;
                  const active = isActive(link.href);
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={`flex items-center gap-3 rounded-md px-3 py-3 text-body transition-colors ${
                          active
                            ? "bg-primary-50 text-primary-700"
                            : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                        }`}
                        aria-current={active ? "page" : undefined}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className="flex-1">{link.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="border-t border-border-default p-3">
                <div className="mb-2 flex items-center gap-1.5 text-caption text-text-muted">
                  <Globe className="h-3.5 w-3.5" />
                  Language
                </div>
                <LanguageSwitcher />
              </div>
            </nav>
          </>
        )}
      </header>

      {/* -----------------------------------------------------------
       * Main content
       * --------------------------------------------------------- */}
      <main className="flex-1 min-w-0">{children}</main>

      {/* -----------------------------------------------------------
       * Footer
       * --------------------------------------------------------- */}
      <footer className="mt-auto border-t border-border-default bg-primary-900 text-primary-100">
        <div className="mx-auto grid max-w-[var(--grid-max-width)] gap-8 px-4 py-10 md:grid-cols-3 md:px-6">
          {/* Brand + about */}
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-500 font-mono text-subtitle font-bold text-accent-foreground">
                م
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-subtitle font-semibold text-primary-foreground">
                  Darul Irfan Madrasha
                </span>
                <span className="text-caption text-primary-200">
                  Knowledge · Faith · Character
                </span>
              </div>
            </div>
            <p className="mt-4 text-body text-primary-200">
              A community madrasha serving Dhaka since 2001 — offering Hifz,
              Alim, Qirat and Tajweed programs in a nurturing Islamic environment.
            </p>
          </div>

          {/* Quick links */}
          <nav aria-label="Footer">
            <h3 className="text-subtitle font-semibold text-primary-foreground">
              Quick Links
            </h3>
            <ul className="mt-4 space-y-2">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-body text-primary-200 transition-colors hover:text-accent-500"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact */}
          <div>
            <h3 className="text-subtitle font-semibold text-primary-foreground">
              Contact
            </h3>
            <ul className="mt-4 space-y-3 text-body text-primary-200">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" />
                <span>123 Bashundhara R/A, Dhaka 1229, Bangladesh</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-accent-500" />
                <span>+880 2 555 0199</span>
              </li>
              <li className="flex items-center gap-2.5">
                <MailIcon className="h-4 w-4 shrink-0 text-accent-500" />
                <span>info@darulirfan.edu.bd</span>
              </li>
              <li className="text-caption text-primary-300">
                Office hours: Sat–Thu, 8:30 AM – 4:30 PM
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright row */}
        <div className="border-t border-primary-800 px-4 py-4 md:px-6">
          <div className="mx-auto flex max-w-[var(--grid-max-width)] flex-col gap-2 text-caption md:flex-row md:items-center md:justify-between">
            <p className="text-primary-200">
              © 2026 Darul Irfan Madrasha · MadrashaOS · All rights reserved.
            </p>
            <p className="font-mono text-primary-300">
              v{tokenVersion} · {locale.toUpperCase()} · Public Site
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
