"use client";

/**
 * MadrashaOS — DevToolbar
 *
 * Session C0.3 — Theme Provider & Global Shell Skeleton
 *
 * Floating toolbar (bottom-end corner) for instant context switching during
 * UI/UX development. Collapses to a small "DEV" badge; expands to show:
 *   - Role selector (8 personas from Session 0.2 — visual placeholder,
 *     wired to Zustand session store in C0.4)
 *   - Branch selector (3 branches — visual placeholder, wired in C2.1)
 *   - Language buttons (functional — reuses I18nProvider)
 *   - Theme toggle (functional — uses next-themes)
 *   - Network simulator (visual placeholder, wired in C3.3 for attendance)
 *
 * Always visible on top of all content (z-50).
 */

import { useState } from "react";
import {
  Bug,
  X,
  ChevronUp,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useTheme } from "next-themes";
import { locales, localeConfig, type Locale } from "@/lib/i18n/config";

/** 8 personas from Session 0.2 (visual placeholders until C0.4 session store) */
const ROLES = [
  "super-admin",
  "authority",
  "administrator",
  "accountant",
  "teacher",
  "storekeeper",
  "guardian",
  "student",
] as const;

const BRANCHES = ["dhaka", "chittagong", "sylhet"] as const;
const NETWORKS = ["normal", "slow", "offline"] as const;

export function DevToolbar() {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [role, setRole] = useState<string>("administrator");
  const [branch, setBranch] = useState<string>("dhaka");
  const [network, setNetwork] = useState<string>("normal");

  /* --- Collapsed: just a floating DEV badge --- */
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="fixed bottom-4 end-4 z-50 flex items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-2 text-caption font-medium text-neutral-0 shadow-elevation-3 transition-all hover:bg-neutral-700"
        aria-label={t("shell.dev.title")}
      >
        <Bug className="h-4 w-4" />
        <span>{t("shell.dev.expand")}</span>
      </button>
    );
  }

  /* --- Expanded: controls panel --- */
  return (
    <div className="fixed bottom-4 end-4 z-50 w-72 rounded-xl border border-border-default bg-surface-card shadow-elevation-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-default px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-primary-500" />
          <span className="text-subtitle font-semibold text-text-primary">
            {t("shell.dev.title")}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="rounded-md p-1 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          aria-label={t("shell.dev.collapse")}
        >
          <ChevronUp className="h-4 w-4" data-directional="true" />
        </button>
      </div>

      {/* Controls */}
      <div className="space-y-3 p-4">
        {/* Role selector */}
        <div>
          <label className="mb-1 block text-caption font-medium uppercase tracking-wider text-text-muted">
            {t("shell.dev.role")}
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-md border border-border-strong bg-surface-card px-3 py-1.5 text-subtitle text-text-primary focus:border-primary-500 focus:outline-none"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace("-", " ")}
              </option>
            ))}
          </select>
        </div>

        {/* Branch selector */}
        <div>
          <label className="mb-1 block text-caption font-medium uppercase tracking-wider text-text-muted">
            {t("shell.dev.branch")}
          </label>
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="w-full rounded-md border border-border-strong bg-surface-card px-3 py-1.5 text-subtitle text-text-primary focus:border-primary-500 focus:outline-none"
          >
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {t(`shell.topbar.branch.${b}` as never)}
              </option>
            ))}
          </select>
        </div>

        {/* Language buttons */}
        <div>
          <label className="mb-1 block text-caption font-medium uppercase tracking-wider text-text-muted">
            Language
          </label>
          <div className="flex gap-1">
            {locales.map((l: Locale) => (
              <button
                key={l}
                type="button"
                onClick={() => setLocale(l)}
                className={`flex-1 rounded-md px-2 py-1.5 text-caption font-medium transition-colors ${
                  locale === l
                    ? "bg-primary-500 text-primary-foreground"
                    : "bg-neutral-100 text-text-secondary hover:bg-neutral-200"
                }`}
              >
                {localeConfig[l].labelNative}
              </button>
            ))}
          </div>
        </div>

        {/* Theme toggle */}
        <div>
          <label className="mb-1 block text-caption font-medium uppercase tracking-wider text-text-muted">
            Theme
          </label>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`flex-1 rounded-md px-2 py-1.5 text-caption font-medium transition-colors ${
                theme === "light"
                  ? "bg-primary-500 text-primary-foreground"
                  : "bg-neutral-100 text-text-secondary hover:bg-neutral-200"
              }`}
            >
              ☀ Light
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`flex-1 rounded-md px-2 py-1.5 text-caption font-medium transition-colors ${
                theme === "dark"
                  ? "bg-primary-500 text-primary-foreground"
                  : "bg-neutral-100 text-text-secondary hover:bg-neutral-200"
              }`}
            >
              ☾ Dark
            </button>
          </div>
        </div>

        {/* Network simulator */}
        <div>
          <label className="mb-1 block text-caption font-medium uppercase tracking-wider text-text-muted">
            {t("shell.dev.network")}
          </label>
          <div className="flex gap-1">
            {NETWORKS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNetwork(n)}
                className={`flex-1 rounded-md px-2 py-1.5 text-caption font-medium transition-colors ${
                  network === n
                    ? n === "offline"
                      ? "bg-semantic-danger text-danger-foreground"
                      : n === "slow"
                        ? "bg-semantic-warning text-warning-foreground"
                        : "bg-semantic-success text-success-foreground"
                    : "bg-neutral-100 text-text-secondary hover:bg-neutral-200"
                }`}
              >
                {t(`shell.dev.network.${n}` as never)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
