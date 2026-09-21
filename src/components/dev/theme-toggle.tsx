"use client";

/**
 * MadrashaOS — Theme Toggle (Session 10.4 fix)
 *
 * Uses next-themes useTheme() for proper SSR + system preference support.
 *
 * Hydration-safe: Uses a `mounted` state pattern (standard for next-themes)
 * to ensure the server and client render the same element type. Before
 * mount, the button renders with empty content (same element, no mismatch).
 * After mount, the resolved theme determines the icon/label.
 */

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function ThemeToggle({
  variant = "default",
  className = "",
}: {
  variant?: "default" | "onPrimary";
  className?: string;
}) {
  const { t } = useI18n();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  const variantClass =
    variant === "onPrimary"
      ? "border-primary-500 bg-primary-600 text-primary-100 hover:bg-primary-500 hover:text-primary-foreground"
      : "border-border-default bg-surface-card text-text-primary hover:bg-surface-hover";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`rounded-full border px-4 py-2 text-subtitle shadow-elevation-1 transition-colors ${variantClass} ${className}`}
      aria-pressed={isDark}
      aria-label={t("theme.label")}
    >
      {mounted ? (isDark ? t("theme.dark") : t("theme.light")) : ""}
    </button>
  );
}
