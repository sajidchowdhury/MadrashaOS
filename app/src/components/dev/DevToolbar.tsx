"use client";

/**
 * MadrashaOS — DevToolbar (C0.4 upgrade)
 *
 * Now wired to the Zustand sessionStore:
 *   - Role selector → setRole() → re-derives permissions[]
 *   - Branch selector → setBranch()
 *   - Network simulator → setNetwork() (Risk R6 — attendance under poor connectivity)
 *
 * Language + Theme remain on their respective providers (I18nProvider +
 * next-themes) since those are also persisted separately.
 *
 * Collapses to a small "DEV" badge; expands to show all controls.
 */

import { useState } from "react";
import {
  Bug,
  ChevronUp,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useTheme } from "next-themes";
import { useSessionStore } from "@/stores/sessionStore";
import {
  ROLES,
  BRANCHES,
  NETWORK_MODES,
  ROLE_LABELS,
  BRANCH_LABELS,
  type Role,
  type Branch,
  type NetworkMode,
} from "@/stores/types";
import { locales, localeConfig, type Locale } from "@/lib/i18n/config";
import { getRolePermissions } from "@/lib/auth/role-permissions";

export function DevToolbar() {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const { role, branch, network, permissions, setRole, setBranch, setNetwork } =
    useSessionStore();
  const [expanded, setExpanded] = useState(false);

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
        <span className="ms-1 rounded-full bg-primary-500 px-1.5 py-0.5 text-[10px] font-bold">
          {ROLE_LABELS[role].native}
        </span>
      </button>
    );
  }

  /* --- Expanded: controls panel --- */
  return (
    <div className="fixed bottom-4 end-4 z-50 w-80 rounded-xl border border-border-default bg-surface-card shadow-elevation-4">
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
        {/* Role selector — wired to sessionStore */}
        <div>
          <label className="mb-1 block text-caption font-medium uppercase tracking-wider text-text-muted">
            {t("shell.dev.role")} ({permissions.length} perms)
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="w-full rounded-md border border-border-strong bg-surface-card px-3 py-1.5 text-subtitle text-text-primary focus:border-primary-500 focus:outline-none"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r].english} ({ROLE_LABELS[r].native})
              </option>
            ))}
          </select>
        </div>

        {/* Branch selector — wired to sessionStore */}
        <div>
          <label className="mb-1 block text-caption font-medium uppercase tracking-wider text-text-muted">
            {t("shell.dev.branch")}
          </label>
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value as Branch)}
            className="w-full rounded-md border border-border-strong bg-surface-card px-3 py-1.5 text-subtitle text-text-primary focus:border-primary-500 focus:outline-none"
          >
            {BRANCHES.map((b) => (
              <option key={b} value={b}>
                {BRANCH_LABELS[b]}
              </option>
            ))}
          </select>
        </div>

        {/* Language buttons — wired to I18nProvider */}
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

        {/* Theme toggle — wired to next-themes */}
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

        {/* Network simulator — wired to sessionStore */}
        <div>
          <label className="mb-1 block text-caption font-medium uppercase tracking-wider text-text-muted">
            {t("shell.dev.network")}
          </label>
          <div className="flex gap-1">
            {NETWORK_MODES.map((n: NetworkMode) => (
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

        {/* Permissions preview (truncated) */}
        <div>
          <label className="mb-1 block text-caption font-medium uppercase tracking-wider text-text-muted">
            Permissions ({permissions.length})
          </label>
          <div className="max-h-24 overflow-y-auto rounded-md border border-border-default bg-neutral-50 p-2">
            <code className="text-[10px] leading-relaxed text-text-secondary">
              {getRolePermissions(role).slice(0, 6).join(", ")}
              {permissions.length > 6 && ` … +${permissions.length - 6} more`}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
