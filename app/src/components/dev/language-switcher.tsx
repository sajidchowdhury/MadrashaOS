"use client";

/**
 * MadrashaOS — Language Switcher (C0.3 upgrade)
 *
 * Added `variant` prop for use on colored surfaces:
 *   - "default": light background (border + card surface, teal active button)
 *   - "onPrimary": transparent on the teal TopBar (primary-600 container,
 *     accent-gold active button for contrast against the teal)
 *
 * Wired to the I18nProvider via useI18n() — switching persists to the
 * `madrasha-locale` cookie and flips <html> dir for Arabic (RTL).
 */

import { useI18n } from "@/lib/i18n/I18nProvider";
import { locales, localeConfig, type Locale } from "@/lib/i18n/config";

export function LanguageSwitcher({
  variant = "default",
  className = "",
}: {
  variant?: "default" | "onPrimary";
  className?: string;
}) {
  const { locale, setLocale } = useI18n();

  const containerClass =
    variant === "onPrimary"
      ? "border-primary-500 bg-primary-600"
      : "border-border-default bg-surface-card";

  const inactiveClass =
    variant === "onPrimary"
      ? "text-primary-100 hover:text-primary-foreground"
      : "text-text-secondary hover:text-text-primary";

  const activeClass =
    variant === "onPrimary"
      ? "bg-accent-500 text-accent-foreground"
      : "bg-primary-500 text-primary-foreground";

  return (
    <div
      role="group"
      aria-label="Language switcher"
      className={`inline-flex items-center rounded-full border p-1 shadow-elevation-1 ${containerClass} ${className}`}
    >
      {locales.map((l: Locale) => {
        const cfg = localeConfig[l];
        const isActive = locale === l;
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l)}
            className={`rounded-full px-3 py-1 text-caption transition-colors md:px-4 md:py-1.5 md:text-subtitle ${
              isActive ? activeClass : inactiveClass
            }`}
            aria-pressed={isActive}
            aria-label={`Switch to ${cfg.labelEnglish}`}
          >
            {cfg.labelNative}
          </button>
        );
      })}
    </div>
  );
}
