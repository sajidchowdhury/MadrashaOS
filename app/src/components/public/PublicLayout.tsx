"use client";

/**
 * MadrashaOS — Premium Public Layout (Task 8-a · redesign)
 *
 * iom.edu.bd-style public site chrome:
 *   1. Top contact bar (thin, dark teal) — phone + email + portal links
 *   2. Main navbar (white, sticky) — logo · multi-level nav · language · Apply Now
 *   3. Mobile drawer (full-screen) — accordion nav with submenus
 *   4. Footer (dark teal) — 4 columns + copyright bar
 *
 * Reads from the cmsStore (Zustand + persist → localStorage) so the
 * CMS admin at /app/website/content can edit any of these strings
 * and see them propagate live.
 *
 * FROZEN tokens only — no raw hex / px in component code.
 */

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu, X, Phone, Mail, ChevronDown, Globe, Sun, Moon,
  ArrowRight, MapPin, Clock, ExternalLink,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useTheme } from "next-themes";
import { useCmsStore } from "@/stores/cmsStore";
import { tokenVersion } from "@/lib/design-system/tokens";
import { DynamicIcon } from "./DynamicIcon";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";

/* ----------------------------------------------------------------
 *  Top contact bar
 * ---------------------------------------------------------------- */

function TopContactBar() {
  const topBar = useCmsStore((s) => s.topBar);
  if (!topBar.visible) return null;

  return (
    <div className="hidden bg-primary-800 text-primary-100 md:block">
      <div className="mx-auto flex max-w-[var(--grid-max-width)] items-center justify-between gap-4 px-6 py-1.5 text-caption">
        {/* Left — phone */}
        <a
          href={`tel:${topBar.phone.replace(/[\s+-]/g, "")}`}
          className="inline-flex items-center gap-1.5 transition-colors hover:text-accent-500"
        >
          <Phone className="h-3.5 w-3.5" />
          {topBar.phone}
        </a>
        {/* Right — email + portal links */}
        <div className="flex items-center gap-4">
          <a
            href={`mailto:${topBar.email}`}
            className="inline-flex items-center gap-1.5 transition-colors hover:text-accent-500"
          >
            <Mail className="h-3.5 w-3.5" />
            {topBar.email}
          </a>
          <span aria-hidden className="h-3 w-px bg-primary-700" />
          <nav aria-label="Quick links" className="flex items-center gap-3">
            {topBar.links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="inline-flex items-center gap-1 transition-colors hover:text-accent-500"
              >
                {link.label}
                <ExternalLink className="h-3 w-3 opacity-70" />
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------
 *  Language dropdown — 3 wired locales + 5 "coming soon" entries
 *  to mirror the iom.edu.bd style (8+ languages in the dropdown).
 * ---------------------------------------------------------------- */

const COMING_SOON_LANGS = [
  { code: "ur", label: "اردو", english: "Urdu" },
  { code: "hi", label: "हिन्दी", english: "Hindi" },
  { code: "fr", label: "Français", english: "French" },
  { code: "tr", label: "Türkçe", english: "Turkish" },
  { code: "id", label: "Indonesia", english: "Indonesian" },
];

function LanguageDropdown({ variant = "default" }: { variant?: "default" | "onPrimary" }) {
  const { locale, setLocale } = useI18n();
  const triggerClass =
    variant === "onPrimary"
      ? "border-primary-500 bg-primary-600 text-primary-100 hover:bg-primary-500"
      : "border-border-default bg-surface-card text-text-secondary hover:bg-surface-hover hover:text-text-primary";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${triggerClass}`}
          aria-label="Switch language"
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{locale.toUpperCase()}</span>
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => setLocale("en")}
          className={locale === "en" ? "bg-primary-50 text-primary-700" : ""}
        >
          English
          <span className="ms-auto text-caption text-text-muted">en</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLocale("bn")}
          className={locale === "bn" ? "bg-primary-50 text-primary-700" : ""}
        >
          বাংলা
          <span className="ms-auto text-caption text-text-muted">bn</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLocale("ar")}
          className={locale === "ar" ? "bg-primary-50 text-primary-700" : ""}
        >
          العربية
          <span className="ms-auto text-caption text-text-muted">ar</span>
        </DropdownMenuItem>
        <div className="my-1 h-px bg-border-default" />
        <p className="px-2 py-1 text-caption uppercase tracking-wider text-text-muted">
          Coming soon
        </p>
        {COMING_SOON_LANGS.map((lang) => (
          <DropdownMenuItem key={lang.code} disabled className="opacity-50">
            {lang.label}
            <span className="ms-auto text-caption text-text-muted">{lang.code}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ----------------------------------------------------------------
 *  Theme toggle
 * ---------------------------------------------------------------- */

function PublicThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) {
    return <div className="h-9 w-9 rounded-full border border-border-default" aria-hidden />;
  }
  const isDark = resolvedTheme === "dark";
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

/* ----------------------------------------------------------------
 *  Brand logo — supports text or image
 * ---------------------------------------------------------------- */

function BrandLogo({ onClick }: { onClick?: () => void }) {
  const logo = useCmsStore((s) => s.logo);
  return (
    <Link
      href="/public"
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      aria-label={`${logo.text} — public home`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500 font-mono text-subtitle font-bold text-primary-foreground shadow-elevation-1">
        {logo.type === "image" && logo.imageUrl ? (
          <img src={logo.imageUrl} alt="" className="h-full w-full rounded-lg object-cover" />
        ) : (
          logo.monogram
        )}
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-subtitle font-semibold text-text-primary">{logo.text}</span>
        <span className="text-caption text-text-muted">{logo.tagline}</span>
      </span>
    </Link>
  );
}

/* ----------------------------------------------------------------
 *  Desktop multi-level nav
 *  Uses CSS group-hover to reveal the submenu — keeps the page
 *  fully static (no JS state machine for hover).
 * ---------------------------------------------------------------- */

function DesktopNav() {
  const items = useCmsStore((s) => s.navbar.items);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/public") return pathname === "/public";
    if (href.includes("#")) return pathname === href.split("#")[0];
    return pathname.startsWith(href);
  };

  return (
    <nav aria-label="Primary" className="mx-auto hidden items-center gap-1 lg:flex">
      {items.map((item) => {
        const active = isActive(item.href);
        if (!item.children?.length) {
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-body font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                active
                  ? "bg-primary-50 text-primary-700"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {item.icon && <DynamicIcon name={item.icon} className="h-4 w-4" />}
              {item.label}
            </Link>
          );
        }
        return (
          <div key={item.label} className="group relative">
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-body font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                active
                  ? "bg-primary-50 text-primary-700"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              }`}
              aria-haspopup="true"
              aria-expanded="false"
            >
              {item.icon && <DynamicIcon name={item.icon} className="h-4 w-4" />}
              {item.label}
              <ChevronDown className="h-3 w-3 transition-transform group-hover:rotate-180" />
            </button>
            {/* Submenu */}
            <div
              role="menu"
              className="invisible absolute start-0 top-full z-50 min-w-[16rem] translate-y-1 pt-2 opacity-0 transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100"
            >
              <div className="overflow-hidden rounded-lg border border-border-default bg-surface-card shadow-elevation-3">
                <ul className="max-h-[28rem] overflow-y-auto p-1.5">
                  {item.children.map((child) => (
                    <li key={child.label}>
                      <Link
                        href={child.href}
                        className="flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:bg-surface-hover"
                      >
                        {child.icon && (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-700">
                            <DynamicIcon name={child.icon} className="h-4 w-4" />
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block text-body font-medium text-text-primary">
                            {child.label}
                          </span>
                          {child.description && (
                            <span className="mt-0.5 block text-caption text-text-muted">
                              {child.description}
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

/* ----------------------------------------------------------------
 *  Mobile drawer with accordion nav
 * ---------------------------------------------------------------- */

function MobileDrawer({
  open, onClose, items, cta,
}: {
  open: boolean;
  onClose: () => void;
  items: ReturnType<typeof useCmsStore.getState>["navbar"]["items"];
  cta: ReturnType<typeof useCmsStore.getState>["navbar"]["ctaButton"];
}) {
  const pathname = usePathname();
  const isActive = (href: string) => {
    if (href === "/public") return pathname === "/public";
    if (href.includes("#")) return pathname === href.split("#")[0];
    return pathname.startsWith(href);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-neutral-950/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute inset-y-0 end-0 flex w-80 max-w-[85vw] flex-col bg-surface-card shadow-elevation-4">
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-border-default bg-primary-700 px-4 py-3 text-primary-foreground">
          <span className="text-subtitle font-semibold">Menu</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-primary-foreground transition-colors hover:bg-primary-600"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto p-3">
          <Accordion type="multiple" className="w-full">
            {items.map((item, idx) => {
              const active = isActive(item.href);
              if (!item.children?.length) {
                return (
                  <div key={item.label} className="border-b border-border-default last:border-0">
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-3 rounded-md px-3 py-3 text-body transition-colors ${
                        active
                          ? "bg-primary-50 text-primary-700"
                          : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                      }`}
                    >
                      {item.icon && <DynamicIcon name={item.icon} className="h-5 w-5 shrink-0" />}
                      <span className="flex-1">{item.label}</span>
                    </Link>
                  </div>
                );
              }
              return (
                <AccordionItem
                  key={item.label}
                  value={`item-${idx}`}
                  className="border-b border-border-default last:border-0"
                >
                  <AccordionTrigger className="gap-3 rounded-md px-3 py-3 text-body font-medium hover:bg-surface-hover hover:no-underline [&>svg]:hidden">
                    <span className="flex flex-1 items-center gap-3 text-start">
                      {item.icon && <DynamicIcon name={item.icon} className="h-5 w-5 shrink-0 text-text-secondary" />}
                      <span className={active ? "text-primary-700" : "text-text-secondary"}>
                        {item.label}
                      </span>
                    </span>
                    <ChevronDown className="h-4 w-4 text-text-muted" />
                  </AccordionTrigger>
                  <AccordionContent className="pb-1 ps-3">
                    <ul className="space-y-0.5">
                      {item.children.map((child) => (
                        <li key={child.label}>
                          <Link
                            href={child.href}
                            onClick={onClose}
                            className="flex items-start gap-2 rounded-md px-3 py-2 text-body text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                          >
                            {child.icon && (
                              <DynamicIcon name={child.icon} className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
                            )}
                            <span>{child.label}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>

        {/* Drawer footer */}
        <div className="border-t border-border-default p-3">
          {cta.visible && (
            <Link
              href={cta.href}
              onClick={onClose}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-accent-500 px-4 py-2.5 text-body font-semibold text-accent-foreground transition-colors hover:bg-accent-700"
            >
              {cta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          <div className="mt-3 flex items-center justify-between">
            <LanguageDropdown />
            <PublicThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------
 *  Footer — 4 columns + copyright bar
 * ---------------------------------------------------------------- */

function PublicFooter() {
  const footer = useCmsStore((s) => s.footer);
  const logo = useCmsStore((s) => s.logo);
  const { locale } = useI18n();
  const isBn = locale === "bn";

  return (
    <footer className="mt-auto bg-primary-900 text-primary-100">
      <div className="mx-auto grid max-w-[var(--grid-max-width)] gap-8 px-4 py-12 md:grid-cols-2 md:px-6 lg:grid-cols-4">
        {/* About column */}
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-500 font-mono text-subtitle font-bold text-accent-foreground">
              {logo.monogram}
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-subtitle font-semibold text-primary-foreground">
                {logo.text}
              </span>
              <span className="text-caption text-primary-200">{logo.tagline}</span>
            </div>
          </div>
          <p className="mt-4 text-body leading-relaxed text-primary-200">
            {isBn ? footer.aboutBn : footer.about}
          </p>
        </div>

        {/* Quick links column */}
        <nav aria-label="Footer quick links">
          <h3 className="text-subtitle font-semibold text-primary-foreground">Quick Links</h3>
          <ul className="mt-4 space-y-2">
            {footer.quickLinks.map((link) => (
              <li key={link.label}>
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

        {/* Contact column */}
        <div>
          <h3 className="text-subtitle font-semibold text-primary-foreground">Contact</h3>
          <ul className="mt-4 space-y-3 text-body text-primary-200">
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" />
              <span>{isBn ? footer.contact.addressBn : footer.contact.address}</span>
            </li>
            <li>
              <a
                href={`tel:${footer.contact.phone.replace(/[\s+-]/g, "")}`}
                className="flex items-center gap-2.5 transition-colors hover:text-accent-500"
              >
                <Phone className="h-4 w-4 shrink-0 text-accent-500" />
                <span>{footer.contact.phone}</span>
              </a>
            </li>
            <li>
              <a
                href={`mailto:${footer.contact.email}`}
                className="flex items-center gap-2.5 transition-colors hover:text-accent-500"
              >
                <Mail className="h-4 w-4 shrink-0 text-accent-500" />
                <span>{footer.contact.email}</span>
              </a>
            </li>
            <li className="flex items-start gap-2.5 text-caption text-primary-300">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-500" />
              <span>{footer.contact.hours}</span>
            </li>
          </ul>
        </div>

        {/* Social column */}
        <div>
          <h3 className="text-subtitle font-semibold text-primary-foreground">Follow Us</h3>
          <p className="mt-4 text-body text-primary-200">
            Stay connected for daily reminders, live class notifications and community updates.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {footer.social.map((social) => (
              <a
                key={social.platform}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.platform}
                title={social.platform}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-primary-700 bg-primary-800 text-primary-100 transition-colors hover:border-accent-500 hover:bg-accent-500 hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              >
                <DynamicIcon name={social.icon} className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Copyright bar */}
      <div className="border-t border-primary-800 px-4 py-4 md:px-6">
        <div className="mx-auto flex max-w-[var(--grid-max-width)] flex-col gap-2 text-caption md:flex-row md:items-center md:justify-between">
          <p className="text-primary-200">{footer.copyright}</p>
          <p className="font-mono text-primary-300">
            Powered by MadrashaOS · v{tokenVersion} · {locale.toUpperCase()}
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ----------------------------------------------------------------
 *  Main layout
 * ---------------------------------------------------------------- */

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const cta = useCmsStore((s) => s.navbar.ctaButton);
  const items = useCmsStore((s) => s.navbar.items);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const pathname = usePathname();

  // Close drawer + reset scroll on route change.
  React.useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when drawer is open.
  React.useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <div className="flex min-h-screen flex-col bg-surface-canvas">
      <TopContactBar />

      {/* Sticky navbar */}
      <header
        className={`sticky top-0 z-40 border-b border-border-default bg-surface-card/95 backdrop-blur transition-shadow ${
          scrolled ? "shadow-elevation-2" : "shadow-elevation-1"
        }`}
      >
        <div className="mx-auto flex max-w-[var(--grid-max-width)] items-center gap-3 px-4 py-3 md:px-6">
          <BrandLogo />

          <DesktopNav />

          {/* Right rail — desktop */}
          <div className="ms-auto hidden items-center gap-2 lg:flex">
            <LanguageDropdown />
            <PublicThemeToggle />
            {cta.visible && (
              <Link
                href={cta.href}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-accent-500 px-4 text-body font-semibold text-accent-foreground shadow-elevation-1 transition-colors hover:bg-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              >
                {cta.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          {/* Mobile right rail */}
          <div className="ms-auto flex items-center gap-2 lg:hidden">
            <PublicThemeToggle />
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border-default bg-surface-card text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label="Open navigation menu"
              aria-expanded={drawerOpen}
              aria-controls="public-mobile-nav"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        items={items}
        cta={cta}
      />

      {/* Main content */}
      <main className="flex-1 min-w-0">{children}</main>

      <PublicFooter />
    </div>
  );
}
