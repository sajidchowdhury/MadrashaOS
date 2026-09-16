"use client";

/**
 * MadrashaOS — Theme Toggle (C0.3 upgrade)
 *
 * Now uses next-themes useTheme() for proper SSR + system preference
 * support. Adds a `variant` prop for use on colored surfaces:
 *   - "default": light background (border + card surface)
 *   - "onPrimary": transparent on the teal TopBar (primary-600 bg, white text)
 *
 * Hydration-safe: `resolvedTheme` is undefined during SSR and resolves on
 * the client — we render a same-sized placeholder while undefined to
 * avoid layout shift and hydration mismatch (no useEffect + setState needed).
 */

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

  const isDark = resolvedTheme === "dark";

  // SSR: resolvedTheme is undefined — render placeholder to avoid mismatch.
  if (resolvedTheme === undefined) {
    return <div className="h-9 w-[72px] rounded-full" aria-hidden />;
  }

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
      {isDark ? t("theme.dark") : t("theme.light")}
    </button>
  );
}
