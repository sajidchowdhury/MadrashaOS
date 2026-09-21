/**
 * MadrashaOS — i18n Locale Configuration
 *
 * Session C0.2 — Multi-Language Font Stack & RTL Pipeline
 *
 * Three first-class locales per SRS §10.6 / §2.6.6:
 *   en (English) — default, LTR, Inter font
 *   bn (Bangla)  — LTR, Hind Siliguri font
 *   ar (Arabic)  — RTL, Noto Naskh Arabic font
 *
 * The `dir` field drives `document.documentElement.dir`.
 * The `fontVar` field references the CSS variable from tokens.css.
 */

export const locales = ["en", "bn", "ar"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export type LocaleConfig = {
  /** Native label shown in the language switcher (e.g. "বাংলা") */
  labelNative: string;
  /** English label (e.g. "Bangla") */
  labelEnglish: string;
  /** Text direction */
  dir: "ltr" | "rtl";
  /** BCP-47 tag for Intl APIs */
  bcp47: string;
  /** html lang attribute value */
  htmlLang: string;
  /** CSS font-family variable from tokens.css */
  fontVar: string;
  /** Numeral system used */
  numerals: "western" | "bangla" | "arabic-indic";
};

export const localeConfig: Record<Locale, LocaleConfig> = {
  en: {
    labelNative: "English",
    labelEnglish: "English",
    dir: "ltr",
    bcp47: "en-US",
    htmlLang: "en",
    fontVar: "var(--font-en)",
    numerals: "western",
  },
  bn: {
    labelNative: "বাংলা",
    labelEnglish: "Bangla",
    dir: "ltr",
    bcp47: "bn-BD",
    htmlLang: "bn",
    fontVar: "var(--font-bn)",
    numerals: "bangla",
  },
  ar: {
    labelNative: "العربية",
    labelEnglish: "Arabic",
    dir: "rtl",
    bcp47: "ar-SA",
    htmlLang: "ar",
    fontVar: "var(--font-ar)",
    numerals: "arabic-indic",
  },
};

/** Cookie name storing the user's locale preference (1-year TTL). */
export const LOCALE_COOKIE = "madrasha-locale";

/**
 * Parse a locale value from an unknown source (cookie, header, query).
 * Falls back to `defaultLocale` if the value is not a valid locale key.
 */
export function parseLocale(value: string | null | undefined): Locale {
  if (value && (locales as readonly string[]).includes(value)) {
    return value as Locale;
  }
  return defaultLocale;
}
