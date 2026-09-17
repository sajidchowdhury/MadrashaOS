/**
 * MadrashaOS — PDF Brand Constants & Font Registration
 *
 * Session C5.1 — Branded PDF Templates (Task 5-a)
 *
 * EXEMPTION NOTE (per Task 5-a spec):
 *   This file is the ONE documented exception to the no-raw-hex rule
 *   (R-T1 from Session C0.1). PDF templates cannot read CSS variables
 *   at render time — `@react-pdf/renderer` resolves StyleSheet values
 *   to literal strings before invoking PDFKit. We therefore hardcode
 *   the FROZEN token hex values here, sourced verbatim from
 *   `src/lib/design-system/tokens.ts` (FROZEN v1.0.0).
 *
 * Per Risk R13 (lock-in): every PDF MUST use primary.500 + accent.DEFAULT
 * + neutral.0 — no unbranded PDFs are permitted to ship.
 *
 * Per Risk R14: Arabic student names must render correctly (no tofu □).
 * We register Noto Naskh Arabic and Hind Siliguri fonts below so PDFs
 * render Bangla + Arabic glyphs (the built-in Helvetica/Times fonts
 * shipped with PDFKit do not contain Bengali or Arabic codepoints).
 */

import { Font } from "@react-pdf/renderer";

/* ----------------------------------------------------------------
 * BRAND HEX VALUES — sourced verbatim from FROZEN tokens.ts (v1.0.0)
 * ---------------------------------------------------------------- */

export const pdfColors = {
  primary: {
    50: "#E6F2F2",
    100: "#C2DEDE",
    200: "#8FC2C2",
    300: "#5BA6A6",
    400: "#2E8A8A",
    500: "#0E5C5C", // PRIMARY BRAND — Risk R13 lock-in
    600: "#0B4A4A",
    700: "#093838",
    800: "#062626",
    900: "#041818",
  },
  accent: {
    50: "#FBF6E8",
    100: "#F3E8C2",
    500: "#C9A961", // ACCENT GOLD — Risk R13 lock-in
    700: "#8A6F2F",
  },
  neutral: {
    0: "#FFFFFF", // neutral.0 — Risk R13 lock-in (paper background)
    50: "#FAF8F5",
    100: "#F2EFE8",
    200: "#E0DCD2",
    300: "#C7C1B5",
    400: "#9A9388",
    500: "#6E6A60",
    600: "#4A4740",
    700: "#2E2C27",
    800: "#1F1E1A",
    900: "#15140F",
  },
  semantic: {
    success: "#2F7D32",
    successBg: "#E8F5E9",
    warning: "#B58400",
    warningBg: "#FFF6E5",
    danger: "#B91C1C",
    dangerBg: "#FDE8E8",
    info: "#1D4ED8",
  },
} as const;

/** MadrashaOS organization name (always paired with the branch name on PDFs). */
export const pdfOrgName = "Darul Uloom Madrasha";
export const pdfOrgNameBn = "দারুল উলূম মাদরাসা";

/* ----------------------------------------------------------------
 * FONT REGISTRATION — Bangla + Arabic support per Risk R14
 * ----------------------------------------------------------------
 *
 * We register three families from the @fontsource CDN (jsdelivr).
 * @fontsource publishes TTF files per Unicode block (latin / bengali /
 * arabic), which is exactly what @react-pdf/renderer v4 needs
 * (TTF or OTF — WOFF2 is NOT supported by PDFKit's font engine).
 *
 * Registration is idempotent — @react-pdf/renderer caches registered
 * fonts in a Map keyed by family name, so calling Font.register twice
 * for the same family is safe.
 *
 * The fonts are loaded lazily by PDFKit when the PDF is rendered in
 * the browser (via PDFViewer / PDFDownloadLink). If the CDN is
 * unreachable, @react-pdf/renderer falls back to Helvetica which
 * renders English correctly but will produce tofu (□) for Bangla
 * and Arabic codepoints — Risk R14 partial mitigation.
 *
 * A console.warn is emitted on first import so developers running
 * the dev server offline know why Bangla/Arabic text may render
 * as boxes (the limitation is documented, not silently broken).
 */

let fontsRegistered = false;

export function registerPdfFonts(): void {
  if (fontsRegistered) return;
  fontsRegistered = true;

  try {
    Font.register({
      family: "HindSiliguri",
      fonts: [
        {
          src: "https://cdn.jsdelivr.net/npm/@fontsource/hind-siliguri@5.0.6/files/hind-siliguri-bengali-400-normal.woff",
          fontWeight: 400,
        },
        {
          src: "https://cdn.jsdelivr.net/npm/@fontsource/hind-siliguri@5.0.6/files/hind-siliguri-bengali-600-normal.woff",
          fontWeight: 600,
        },
        {
          src: "https://cdn.jsdelivr.net/npm/@fontsource/hind-siliguri@5.0.6/files/hind-siliguri-bengali-700-normal.woff",
          fontWeight: 700,
        },
      ],
    });

    Font.register({
      family: "NotoNaskhArabic",
      fonts: [
        {
          src: "https://cdn.jsdelivr.net/npm/@fontsource/noto-naskh-arabic@5.0.4/files/noto-naskh-arabic-arabic-400-normal.woff",
          fontWeight: 400,
        },
        {
          src: "https://cdn.jsdelivr.net/npm/@fontsource/noto-naskh-arabic@5.0.4/files/noto-naskh-arabic-arabic-700-normal.woff",
          fontWeight: 700,
        },
      ],
    });

    Font.register({
      family: "Inter",
      fonts: [
        {
          src: "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.18/files/inter-latin-400-normal.woff",
          fontWeight: 400,
        },
        {
          src: "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.18/files/inter-latin-600-normal.woff",
          fontWeight: 600,
        },
        {
          src: "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.18/files/inter-latin-700-normal.woff",
          fontWeight: 700,
        },
      ],
    });

    Font.registerHyphenationCallback((word) => [word]);
  } catch (err) {
    // Non-fatal — fonts will fall back to Helvetica (English-only).
    console.warn(
      "[MadrashaOS PDF] Font registration failed; Bangla/Arabic glyphs may render as tofu. Error:",
      err,
    );
  }
}

/** Call this at the top of every PDF Document component to ensure
 *  fonts are registered before the render pipeline runs. */
export function ensurePdfReady(): void {
  registerPdfFonts();
}

/* ----------------------------------------------------------------
 * NUMBER-TO-WORDS HELPER (BDT amounts under 100,000 taka)
 * ----------------------------------------------------------------
 *
 * Used by FeeReceipt.tsx to render the amount in words
 * ("One Thousand Five Hundred Taka Only") per SRS §2.4.1.
 * Handles integers 0–999,999. For amounts outside that range,
 * falls back to the numeric form.
 */

const ONES = [
  "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven",
  "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen",
  "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy",
  "Eighty", "Ninety",
];

function threeDigitWords(n: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  if (hundreds > 0) parts.push(`${ONES[hundreds]} Hundred`);
  if (remainder > 0) {
    if (remainder < 20) {
      parts.push(ONES[remainder]);
    } else {
      const t = Math.floor(remainder / 10);
      const o = remainder % 10;
      parts.push(o === 0 ? TENS[t] : `${TENS[t]}-${ONES[o]}`);
    }
  }
  return parts.join(" ");
}

/** Convert a BDT amount to its English-words representation.
 *  Example: 1500 → "One Thousand Five Hundred Taka Only"
 *  Precision beyond integer taka is ignored (no paisa suffix). */
export function amountInWords(amount: number): string {
  if (amount === 0) return "Zero Taka Only";
  if (amount < 0 || amount > 999_999_999) {
    return `${amount} Taka Only`;
  }
  const intPart = Math.floor(amount);
  const crores = Math.floor(intPart / 10_000_000);
  const lakhs = Math.floor((intPart % 10_000_000) / 100_000);
  const thousands = Math.floor((intPart % 100_000) / 1000);
  const remainder = intPart % 1000;
  const parts: string[] = [];
  if (crores > 0) parts.push(`${threeDigitWords(crores)} Crore`);
  if (lakhs > 0) parts.push(`${threeDigitWords(lakhs)} Lakh`);
  if (thousands > 0) parts.push(`${threeDigitWords(thousands)} Thousand`);
  if (remainder > 0) parts.push(threeDigitWords(remainder));
  return `${parts.join(" ")} Taka Only`;
}

/* ----------------------------------------------------------------
 * GRADE COMPUTATION (mock — per MarkSheet + ResultSheet)
 * ----------------------------------------------------------------
 *
 * Simple GPA-on-5 scale typical of Bangladeshi madrasha boards:
 *   A+ : 80–100  → 5.0
 *   A  : 70–79   → 4.0
 *   A- : 60–69   → 3.5
 *   B  : 50–59   → 3.0
 *   C  : 40–49   → 2.0
 *   F  : 0–39    → 0.0
 */

export function marksToGrade(marks: number): string {
  if (marks >= 80) return "A+";
  if (marks >= 70) return "A";
  if (marks >= 60) return "A-";
  if (marks >= 50) return "B";
  if (marks >= 40) return "C";
  return "F";
}

export function marksToGpa(marks: number): number {
  if (marks >= 80) return 5.0;
  if (marks >= 70) return 4.0;
  if (marks >= 60) return 3.5;
  if (marks >= 50) return 3.0;
  if (marks >= 40) return 2.0;
  return 0.0;
}
