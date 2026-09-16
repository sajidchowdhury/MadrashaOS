"use client";

/**
 * MadrashaOS — I18n React Provider
 *
 * Session C0.2 — Multi-Language Font Stack & RTL Pipeline
 *
 * Provides:
 *   - `locale` (current Locale)
 *   - `setLocale` (switcher — persists to cookie + updates <html> dir/lang)
 *   - `t(key, params?)` (message lookup with {param} interpolation)
 *   - `dir` (current text direction — "ltr" or "rtl")
 *
 * Usage:
 *   const { locale, setLocale, t, dir } = useI18n();
 *   t("hero.greeting")               // → "Assalamu Alaikum"
 *   t("app.subtitle", { version })   // → "Design System · Tokens v1.0.0 · Phase C0.2"
 *
 * The provider reads the initial locale from the `madrasha-locale` cookie
 * on mount, falls back to `defaultLocale` if absent/invalid, and persists
 * every change back to the cookie (1-year TTL) + the <html> element's
 * `lang` and `dir` attributes.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  defaultLocale,
  localeConfig,
  LOCALE_COOKIE,
  parseLocale,
  type Locale,
} from "./config";
import { messages, type MessageKey } from "./messages";

type I18nContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  // Lazy initializer reads the cookie on the client during hydration.
  // SSR renders with defaultLocale; client hydrates with the cookie
  // value. The <html suppressHydrationWarning> in layout.tsx suppresses
  // the lang/dir attribute mismatch warning for the first paint.
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof document !== "undefined") {
      const match = document.cookie.match(
        new RegExp(`${LOCALE_COOKIE}=([^;]+)`),
      );
      return parseLocale(match?.[1] ?? null);
    }
    return defaultLocale;
  });

  // Sync <html> lang + dir + cookie whenever locale changes.
  // This effect updates an external system (the DOM + cookie), not
  // React state, so it complies with the react-hooks/set-state-in-effect rule.
  useEffect(() => {
    const cfg = localeConfig[locale];
    document.documentElement.lang = cfg.htmlLang;
    document.documentElement.dir = cfg.dir;
    document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
  }, []);

  const t = useCallback(
    (key: MessageKey, params?: Record<string, string | number>) => {
      let msg =
        (messages[locale][key] ?? messages.en[key] ?? String(key)) as string;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          msg = msg.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return msg;
    },
    [locale],
  );

  return (
    <I18nContext.Provider
      value={{ locale, setLocale, t, dir: localeConfig[locale].dir }}
    >
      {children}
    </I18nContext.Provider>
  );
}

/**
 * Consume the i18n context. Must be called inside <I18nProvider>.
 * Throws a helpful error if used outside the provider (dev-time safety).
 */
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within <I18nProvider>");
  }
  return ctx;
}
