/**
 * MadrashaOS — Locale-Aware Formatters
 *
 * Session C0.2 — Multi-Language Font Stack & RTL Pipeline
 *
 * Implements per-locale:
 *   - Digit conversion (western → Bangla / Arabic-Indic numerals)
 *   - Date formatting (dd-MM-yyyy with locale numerals)
 *   - Date formatting long (e.g. "16 September 2026" / "১৬ সেপ্টেম্বর ২০২৬")
 *   - Number formatting (grouped thousands with locale numerals)
 *   - Currency formatting (৳ BDT symbol + locale numerals)
 *   - Percentage formatting
 *
 * Per SRS §2.6.6 / Risk R14: Bangla dates must render as "১৬-০৯-২০২৬"
 * with zero tofu (□) across all three scripts.
 *
 * Manual digit conversion is used (instead of Intl.NumberFormat with
 * bn-BD/ar-SA) to guarantee consistent output across Node/Bun ICU versions.
 */

import type { Locale } from "./config";

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

/**
 * Replace all western digits (0–9) in a string with the locale's numerals.
 * Non-digit characters are preserved.
 */
export function convertDigits(str: string, locale: Locale): string {
  if (locale === "bn") {
    return str.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
  }
  if (locale === "ar") {
    return str.replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)]);
  }
  return str;
}

/**
 * Format a date as dd-MM-yyyy with locale-specific numerals.
 * Example: 2026-09-16 → "16-09-2026" (en) / "১৬-০৯-২০২৬" (bn) / "١٦-٠٩-٢٠٢٦" (ar)
 */
export function formatDate(date: Date, locale: Locale): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return convertDigits(`${dd}-${mm}-${yyyy}`, locale);
}

/**
 * Localized month names per locale.
 */
const MONTH_NAMES: Record<Locale, string[]> = {
  en: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ],
  bn: [
    "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
    "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
  ],
  ar: [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
  ],
};

/**
 * Format a date with a long, human-readable pattern.
 * Example: "16 September 2026" (en) / "১৬ সেপ্টেম্বর ২০২৬" (bn) / "١٦ سبتمبر ٢٠٢٦" (ar)
 */
export function formatDateLong(date: Date, locale: Locale): string {
  const day = convertDigits(String(date.getDate()), locale);
  const month = MONTH_NAMES[locale][date.getMonth()];
  const year = convertDigits(String(date.getFullYear()), locale);
  return `${day} ${month} ${year}`;
}

/**
 * Format a number with grouped thousands and locale-specific numerals.
 * Example: 1234567 → "1,234,567" (en) / "১২,৩৪,৫৬৭" (bn) / "١٬٢٣٤٬٥٦٧" (ar)
 *
 * Uses Intl.NumberFormat('en-US') for grouping then converts digits, to
 * keep grouping consistent (Bangla uses the lakh/crore system in practice,
 * but for this design system showcase we keep western grouping + bn digits
 * for visual simplicity — the real app can switch to bn-BD grouping later).
 */
export function formatNumber(value: number, locale: Locale): string {
  const grouped = new Intl.NumberFormat("en-US").format(value);
  return convertDigits(grouped, locale);
}

/**
 * Format a BDT currency amount with locale-specific numerals.
 * Example: 5000 → "৳5,000" (en) / "৳৫,০০০" (bn) / "৳٥٬٠٠٠" (ar)
 *
 * The ৳ (Bengali Taka sign, U+09F3) is used for all three locales since
 * it is the official currency symbol for BDT and renders in both Inter
 * and Hind Siliguri. For Arabic locale, the ৳ is followed by the amount
 * with RTL ordering handled by the `dir` attribute on the parent.
 */
export function formatCurrency(amount: number, locale: Locale): string {
  const num = formatNumber(amount, locale);
  return `৳${num}`;
}

/**
 * Format a percentage value with locale-specific numerals.
 * Example: 42.5 → "42.5%" (en) / "৪২.৫%" (bn) / "٤٢.٥%" (ar)
 */
export function formatPercent(value: number, locale: Locale): string {
  const str = convertDigits(String(value), locale);
  return `${str}%`;
}
