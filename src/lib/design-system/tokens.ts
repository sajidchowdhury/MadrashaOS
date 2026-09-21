/**
 * MadrashaOS — Design Tokens (TypeScript constants)
 *
 * Source of truth: MadrashaOS_Session_1.1_Brand_Kit_Tokens.json v1.0.0 (FROZEN)
 * Session: C0.1 — Token Ingestion
 *
 * These typed constants mirror the CSS custom properties in
 * `src/styles/tokens.css`. Use them in TS/TSX when you need to read a token
 * value programmatically (e.g. chart colors, motion configs, math). For
 * styling, prefer the Tailwind theme keys (`bg-primary-500`, `text-display`,
 * `shadow-elevation-2`, etc.) which reference the same CSS variables.
 *
 * Consumption rule (Session 1.2 R-T1 to R-T10):
 *   Components MUST import tokens from here OR use Tailwind theme keys.
 *   Raw hex / px / hardcoded font values are FORBIDDEN.
 */

export const tokenVersion = "1.0.0" as const;
export const tokenSession = "1.1" as const;

/* ----------------------------------------------------------------
 * COLOR — Primitive
 * ---------------------------------------------------------------- */

export const primary = {
  50: "#E6F2F2",
  100: "#C2DEDE",
  200: "#8FC2C2",
  300: "#5BA6A6",
  400: "#2E8A8A",
  500: "#0E5C5C",
  600: "#0B4A4A",
  700: "#093838",
  800: "#062626",
  900: "#041818",
  DEFAULT: "#0E5C5C",
  foreground: "#FFFFFF",
} as const;

export const accent = {
  50: "#FBF6E8",
  100: "#F3E8C2",
  500: "#C9A961",
  700: "#8A6F2F",
  DEFAULT: "#C9A961",
  foreground: "#1A1814",
} as const;

export const neutral = {
  0: "#FFFFFF",
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
  950: "#0A0908",
} as const;

export const semantic = {
  success: { DEFAULT: "#2F7D32", foreground: "#FFFFFF", 50: "#E8F5E9" },
  warning: { DEFAULT: "#B58400", foreground: "#1A1814", 50: "#FFF6E5" },
  danger: { DEFAULT: "#B91C1C", foreground: "#FFFFFF", 50: "#FDE8E8" },
  info: { DEFAULT: "#1D4ED8", foreground: "#FFFFFF", 50: "#E0EBFD" },
} as const;

/* ----------------------------------------------------------------
 * TYPOGRAPHY
 * ---------------------------------------------------------------- */

export const fontFamily = {
  bangla: "'Hind Siliguri', sans-serif",
  english: "'Inter', sans-serif",
  arabic: "'Noto Naskh Arabic', serif",
  mono: "'JetBrains Mono', monospace",
  default:
    "'Inter', 'Hind Siliguri', 'Noto Naskh Arabic', sans-serif",
} as const;

export const typeScale = {
  caption: { sizePx: 12, lineHeightPx: 16, weight: 400, letterSpacing: "0.01em" },
  body: { sizePx: 14, lineHeightPx: 20, weight: 400, letterSpacing: "0" },
  subtitle: { sizePx: 16, lineHeightPx: 22, weight: 500, letterSpacing: "0" },
  title: { sizePx: 20, lineHeightPx: 28, weight: 600, letterSpacing: "-0.01em" },
  headline: { sizePx: 24, lineHeightPx: 32, weight: 700, letterSpacing: "-0.02em" },
  display: { sizePx: 32, lineHeightPx: 40, weight: 700, letterSpacing: "-0.03em" },
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

/* ----------------------------------------------------------------
 * SPACING (8pt grid — 14-step scale)
 * ---------------------------------------------------------------- */

export const spacing = {
  unitPx: 8,
  scalePx: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128],
} as const;

/* ----------------------------------------------------------------
 * RADIUS
 * ---------------------------------------------------------------- */

export const radius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  "2xl": 16,
  full: 9999,
} as const;

/* ----------------------------------------------------------------
 * ELEVATION
 * ---------------------------------------------------------------- */

export const elevation = {
  0: "none",
  1: "0 1px 2px rgba(10, 9, 8, 0.05)",
  2: "0 2px 4px rgba(10, 9, 8, 0.08)",
  3: "0 4px 8px rgba(10, 9, 8, 0.10)",
  4: "0 8px 16px rgba(10, 9, 8, 0.12)",
  5: "0 16px 32px rgba(10, 9, 8, 0.14)",
} as const;

/* ----------------------------------------------------------------
 * MOTION
 * ---------------------------------------------------------------- */

export const motion = {
  duration: {
    fast: "150ms",
    normal: "250ms",
    slow: "400ms",
  },
  easing: {
    standard: "cubic-bezier(0.4, 0, 0.2, 1)",
    decelerate: "cubic-bezier(0, 0, 0.2, 1)",
    accelerate: "cubic-bezier(0.4, 0, 1, 1)",
  },
} as const;

/* ----------------------------------------------------------------
 * BREAKPOINTS + GRID
 * ---------------------------------------------------------------- */

export const breakpoints = {
  sm: 375,
  md: 768,
  lg: 1280,
  xl: 1440,
  "2xl": 1920,
} as const;

export const grid = {
  columns: 12,
  maxWidthPx: 1280,
  gutterPx: 24,
  marginPx: 16,
} as const;

/* ----------------------------------------------------------------
 * AUDIT HELPERS (Session 1.2 — A1 to A8 checklist)
 * ---------------------------------------------------------------- */

/**
 * Returns true if a value is a raw hex color (e.g. "#0E5C5C").
 * Used by the no-raw-tokens ESLint rule (Session C0.1).
 */
export function isRawHex(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value.trim());
}

/**
 * Returns true if a value is a raw pixel value (e.g. "24px").
 * Excludes values inside var() / calc() / shadow definitions.
 */
export function isRawPx(value: string): boolean {
  return /(?<![-\d.])\b\d+(\.\d+)?px\b/.test(value);
}

/* ----------------------------------------------------------------
 * FLAT TOKEN MAP (for tooling, audit scripts, and Dev Toolbar)
 * ---------------------------------------------------------------- */

export const tokens = {
  version: tokenVersion,
  session: tokenSession,
  color: { primary, accent, neutral, semantic },
  typography: { fontFamily, typeScale, fontWeight },
  spacing,
  radius,
  elevation,
  motion,
  breakpoints,
  grid,
} as const;

export type Tokens = typeof tokens;
