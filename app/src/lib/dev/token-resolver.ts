/**
 * MadrashaOS — Token Reference Resolver (Phase C7.1)
 *
 * Resolves dotted token paths (e.g. "color.primary.500") against the FROZEN
 * token system in src/lib/design-system/tokens.ts. Used by the per-component
 * detail page to render a "Token References" table with values + color swatches.
 *
 * The resolver walks the object tree segment by segment. Numeric segments
 * (like "500") are coerced so they index into the integer-keyed color scales.
 */

import { tokens } from "@/lib/design-system/tokens";

export type TokenKind =
  | "color"
  | "size"
  | "shadow"
  | "duration"
  | "easing"
  | "font"
  | "generic";

export interface ResolvedToken {
  /** Original dotted path, e.g. "color.primary.500" */
  path: string;
  /** Raw value (string for colors/shadows/durations; number for sizes). */
  value: string;
  /** Display string — colors get "#RRGGBB", sizes get "{n}px", durations stay as-is. */
  display: string;
  /** Token kind — drives swatch rendering. */
  kind: TokenKind;
  /** True if the path could not be resolved. */
  notFound: boolean;
}

/* ------------------------------------------------------------------ */
/*  Resolver                                                           */
/* ------------------------------------------------------------------ */

function walk(root: unknown, segments: string[]): unknown {
  let cursor: unknown = root;
  for (const seg of segments) {
    if (cursor == null) return undefined;
    if (typeof cursor !== "object") return undefined;
    // Try direct property access first (handles "foreground", "DEFAULT").
    const record = cursor as Record<string, unknown>;
    if (seg in record) {
      cursor = record[seg];
      continue;
    }
    // Try numeric coercion (handles "500" → 500 for color scales).
    const numeric = Number(seg);
    if (!Number.isNaN(numeric) && numeric in record) {
      cursor = record[numeric];
      continue;
    }
    return undefined;
  }
  return cursor;
}

function classify(path: string, value: unknown): TokenKind {
  if (typeof value === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value.trim())) {
    return "color";
  }
  if (path.startsWith("elevation.")) return "shadow";
  if (path.startsWith("motion.duration.")) return "duration";
  if (path.startsWith("motion.easing.")) return "easing";
  if (path.startsWith("fontFamily.") || path.includes("fontFamily")) return "font";
  if (path.startsWith("radius.") || path.startsWith("spacing.") || path.startsWith("breakpoints.") || path.startsWith("grid.")) {
    return "size";
  }
  if (path.startsWith("typeScale.")) return "size";
  return "generic";
}

function toDisplay(value: unknown, kind: TokenKind): string {
  if (value == null) return "(unknown)";
  if (typeof value === "number") {
    // Spacing/radius/breakpoint numbers are px values.
    if (kind === "size") return `${value}px`;
    return String(value);
  }
  if (typeof value === "string") {
    return value;
  }
  // Object (e.g. a nested group like `primary` without DEFAULT) — stringify keys.
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "(object)";
    }
  }
  return String(value);
}

export function resolveToken(path: string): ResolvedToken {
  const segments = path.split(".");
  const value = walk(tokens, segments);
  if (value === undefined) {
    return {
      path,
      value: "",
      display: "(not found)",
      kind: "generic",
      notFound: true,
    };
  }
  const kind = classify(path, value);
  return {
    path,
    value: typeof value === "string" ? value : String(value),
    display: toDisplay(value, kind),
    kind,
    notFound: false,
  };
}

export function resolveTokens(paths: string[]): ResolvedToken[] {
  return paths.map(resolveToken);
}

/* ------------------------------------------------------------------ */
/*  Semantic → primitive resolver (for "color.surface.card" etc.)    */
/* ------------------------------------------------------------------ */
/*
 * The semantic token layer (e.g. --color-surface-card) is defined in
 * tokens.css as an alias to a primitive (e.g. --color-neutral-0). The TS
 * `tokens` object only contains primitives + semantic groups (success/
 * warning/danger/info), not the surface aliases. To support resolving
 * paths like "color.surface.card" or "color.text.primary", we maintain a
 * small lookup table here that mirrors tokens.css.
 *
 * If a path doesn't resolve via the primitive tree, we try the semantic
 * surface/text/border map below.
 */

const SEMANTIC_SURFACE_MAP: Record<string, string> = {
  "color.surface.canvas": "color.neutral.50",
  "color.surface.card": "color.neutral.0",
  "color.surface.hover": "color.primary.50",
  "color.surface.selected": "color.primary.50",
  "color.text.primary": "color.neutral.900",
  "color.text.secondary": "color.neutral.500",
  "color.text.muted": "color.neutral.400",
  "color.text.inverse": "color.neutral.0",
  "color.text.link": "color.primary.500",
  "color.border.default": "color.neutral.200",
  "color.border.strong": "color.neutral.300",
  "color.border.focus": "color.primary.500",
};

export function resolveTokenWithSemantic(path: string): ResolvedToken {
  // Try semantic surface map first (it aliases to a primitive path).
  const aliased = SEMANTIC_SURFACE_MAP[path];
  if (aliased) {
    const prim = resolveToken(aliased);
    return {
      ...prim,
      path, // keep the original (semantic) path in the table
      display: prim.notFound ? "(not found)" : `${prim.display} → ${aliased}`,
    };
  }
  return resolveToken(path);
}

export function resolveTokensWithSemantic(paths: string[]): ResolvedToken[] {
  return paths.map(resolveTokenWithSemantic);
}
