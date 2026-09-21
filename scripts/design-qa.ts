/**
 * MadrashaOS — Design QA Audit Script (Phase C7.2 · Task 7-b)
 *
 * Bun-compatible static analyzer that enforces the FROZEN design-token
 * consumption rules from `docs/DESIGN_QA_CONTRACT.md`:
 *
 *   QA-01  No hardcoded hex colors in component code.
 *          Scans every `.tsx` file under `src/components/` and `src/app/`
 *          for the regex `#[0-9a-fA-F]{3,8}` and reports violations.
 *          Excludes:
 *            - src/styles/tokens.css        (the token definitions themselves)
 *            - src/lib/pdf/templates/       (PDF templates need raw hex for
 *                                            @react-pdf/renderer StyleSheet)
 *            - src/lib/design-system/tokens.ts (the TS token constants mirror)
 *            - src/lib/pdf/brand.ts         (PDF brand palette)
 *            - scripts/                     (this file + the typography audit)
 *
 *   QA-02  No hardcoded px values for spacing inside className strings.
 *          Scans every `.tsx` file for `\b\d+px\b` inside `className="…"`
 *          or `className={…}` literals.
 *
 * Output:
 *   - Per-violation report:  path:line:col  context
 *   - Summary:              X files scanned · Y violations found
 *   - Exit code 0 if no violations, exit code 1 if any found.
 *
 * Run with:
 *   bun run qa:design
 *   bun run scripts/design-qa.ts
 *
 * The script is intentionally framework-agnostic (no React import, no
 * Next.js dependency) so it can run in any CI environment with just Bun.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";

/* ------------------------------------------------------------------ *
 * CONFIG
 * ------------------------------------------------------------------ */

const PROJECT_ROOT = process.cwd();

/** Directories to scan for .tsx / .ts component code. */
const SCAN_DIRS = ["src/components", "src/app"];

/** Globally-excluded path fragments (anywhere in the path). */
const EXCLUDED_FRAGMENTS = [
  // Token source files — these define the raw values.
  "src/styles",
  "src/lib/design-system",
  // PDF templates — they need raw hex for @react-pdf/renderer.
  "src/lib/pdf",
  // Dev scripts (this file + typography-audit.ts).
  "scripts",
  // Next.js internals.
  "node_modules",
  ".next",
  "out",
  "build",
  // Test fixtures + skills + examples.
  "examples",
  "skills",
  "tests",
  // Generated Prisma client.
  ".prisma",
];

/** Files that should be skipped outright (by basename or suffix). */
const EXCLUDED_BASENAMES = new Set([
  "tokens.css",
  "tokens.ts",
  "globals.css",
  "brand.ts",
  "next-env.d.ts",
  "postcss.config.mjs",
  "tsconfig.json",
  "eslint.config.mjs",
  "tailwind.config.ts",
  "next.config.ts",
  "Caddyfile",
]);

/* ------------------------------------------------------------------ *
 * TYPES
 * ------------------------------------------------------------------ */

type Severity = "error" | "warning";

type Violation = {
  ruleId: string;
  severity: Severity;
  path: string;
  line: number;
  column: number;
  match: string;
  context: string;
};

/* ------------------------------------------------------------------ *
 * FILE WALKING
 * ------------------------------------------------------------------ */

async function walkDir(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let s;
    try {
      s = await stat(full);
    } catch {
      continue;
    }
    if (s.isDirectory()) {
      // Skip excluded fragments.
      if (EXCLUDED_FRAGMENTS.some((f) => full.includes(sep + f) || full.replace(/\\/g, "/").includes("/" + f))) {
        continue;
      }
      // Recurse.
      const nested = await walkDir(full);
      out.push(...nested);
    } else if (s.isFile()) {
      if (EXCLUDED_BASENAMES.has(entry)) continue;
      if (entry.endsWith(".tsx") || entry.endsWith(".ts")) {
        out.push(full);
      }
    }
  }
  return out;
}

function isExcluded(absPath: string): boolean {
  const norm = absPath.replace(/\\/g, "/");
  if (EXCLUDED_BASENAMES.has(norm.split("/").pop() || "")) return true;
  return EXCLUDED_FRAGMENTS.some((f) => norm.includes("/" + f + "/") || norm.endsWith("/" + f));
}

/* ------------------------------------------------------------------ *
 * RULES
 * ------------------------------------------------------------------ */

/**
 * QA-01 — No raw hex colors.
 * Matches `#RGB`, `#RRGGBB`, `#RRGGBBAA` (case-insensitive).
 * Skips matches inside comments (// or /* or * ) — they're informational.
 */
const HEX_REGEX = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;

/**
 * QA-02 — No raw px values inside className strings.
 * We pull `className="…"` and `className={…}` substrings first, then
 * flag any `\b\d+px\b` inside them.
 *
 * We deliberately do NOT flag px values in inline `style={{ … }}`
 * objects when they're inside a JS expression — those are typically
 * dynamic measurements (e.g. `top: rect.top + "px"`), which are exempt
 * per the contract. We only flag px inside the className attribute
 * itself, where a Tailwind utility should be used.
 */
const CLASSNAME_STRING_REGEX = /className\s*=\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g;
const CLASSNAME_EXPR_REGEX = /className\s*=\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
const PX_REGEX = /\b(\d+(?:\.\d+)?)px\b/g;

function lineOf(str: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < str.length; i++) {
    if (str.charCodeAt(i) === 10) line++;
  }
  return line;
}

function columnOf(str: string, offset: number): number {
  let col = 1;
  for (let i = offset - 1; i >= 0; i--) {
    if (str.charCodeAt(i) === 10) break;
    col++;
  }
  return col;
}

function contextOf(str: string, offset: number, len: number): string {
  const start = Math.max(0, offset - 30);
  const end = Math.min(str.length, offset + len + 30);
  return str
    .slice(start, end)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Strip JS comments (line + block) so we don't flag hex inside
 * documentation comments.
 */
function stripComments(src: string): string {
  // Replace line comments.
  let out = src.replace(/\/\/[^\n]*/g, "");
  // Replace block comments. (Conservative — does not handle every
  // edge case, but enough for this audit.)
  out = out.replace(/\/\*[\s\S]*?\*\//g, "");
  return out;
}

/* ------------------------------------------------------------------ *
 * SCANNERS
 * ------------------------------------------------------------------ */

function scanHex(src: string, absPath: string): Violation[] {
  const out: Violation[] = [];
  const stripped = stripComments(src);
  HEX_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = HEX_REGEX.exec(stripped)) !== null) {
    const line = lineOf(stripped, m.index);
    const col = columnOf(stripped, m.index);
    out.push({
      ruleId: "QA-01",
      severity: "error",
      path: absPath,
      line,
      column: col,
      match: m[0],
      context: contextOf(stripped, m.index, m[0].length),
    });
  }
  return out;
}

function scanPxInClassName(src: string, absPath: string): Violation[] {
  const out: Violation[] = [];

  // Strategy: find every className="…" / className='…' / className={`…`} and
  // scan inside it. Also catch className={clsx("…", "…")} patterns by
  // finding string literals inside the className={…} expression.

  // (a) Static string className attributes.
  CLASSNAME_STRING_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CLASSNAME_STRING_REGEX.exec(src)) !== null) {
    const value = m[1] ?? m[2] ?? m[3] ?? "";
    if (!value) continue;
    PX_REGEX.lastIndex = 0;
    let p: RegExpExecArray | null;
    while ((p = PX_REGEX.exec(value)) !== null) {
      // Compute the absolute offset in src.
      const valueOffset = m.index + m[0].indexOf(value);
      const absOffset = valueOffset + p.index;
      out.push({
        ruleId: "QA-02",
        severity: "error",
        path: absPath,
        line: lineOf(src, absOffset),
        column: columnOf(src, absOffset),
        match: p[0],
        context: contextOf(src, absOffset, p[0].length),
      });
    }
  }

  // (b) Expression className attributes (className={…}). We scan for
  // any string literal inside the expression body so we catch
  // className={clsx("p-2px", cond && "px-3")} patterns.
  CLASSNAME_EXPR_REGEX.lastIndex = 0;
  let e: RegExpExecArray | null;
  while ((e = CLASSNAME_EXPR_REGEX.exec(src)) !== null) {
    const body = e[1] ?? "";
    if (!body) continue;
    // Find every string literal in the expression body.
    const stringLiteralRegex = /(?:["'`])([^"'`]*)(?:["'`])/g;
    let s: RegExpExecArray | null;
    while ((s = stringLiteralRegex.exec(body)) !== null) {
      const litValue = s[1] ?? "";
      if (!litValue) continue;
      PX_REGEX.lastIndex = 0;
      let p: RegExpExecArray | null;
      while ((p = PX_REGEX.exec(litValue)) !== null) {
        // Compute absolute offset of the px match within src.
        // s.index is within body; e.index + offset of body within e[0] + s.index + p.index.
        const bodyOffset = e.index + e[0].indexOf(body);
        const litOffset = bodyOffset + s.index + 1; // +1 to skip the opening quote
        const absOffset = litOffset + p.index;
        out.push({
          ruleId: "QA-02",
          severity: "error",
          path: absPath,
          line: lineOf(src, absOffset),
          column: columnOf(src, absOffset),
          match: p[0],
          context: contextOf(src, absOffset, p[0].length),
        });
      }
    }
  }

  return out;
}

/* ------------------------------------------------------------------ *
 * MAIN
 * ------------------------------------------------------------------ */

async function main() {
  console.log("");
  console.log("  MadrashaOS · Design QA Audit (Phase C7.2 · Task 7-b)");
  console.log("  ====================================================");
  console.log(`  Project root: ${PROJECT_ROOT}`);
  console.log(`  Scan dirs:    ${SCAN_DIRS.join(", ")}`);
  console.log(`  Excluded:     ${EXCLUDED_FRAGMENTS.join(", ")}`);
  console.log("");

  // Collect files.
  const files: string[] = [];
  for (const dir of SCAN_DIRS) {
    const absDir = join(PROJECT_ROOT, dir);
    const found = await walkDir(absDir);
    files.push(...found);
  }

  console.log(`  Files to scan: ${files.length}`);
  console.log("");

  // Scan each file.
  const violations: Violation[] = [];
  let scannedFiles = 0;
  for (const file of files) {
    if (isExcluded(file)) continue;
    let src: string;
    try {
      src = await readFile(file, "utf8");
    } catch (err) {
      console.log(`  ⚠  SKIP (read error)  ${file}  →  ${(err as Error).message}`);
      continue;
    }
    scannedFiles++;
    const hexHits = scanHex(src, file);
    const pxHits = scanPxInClassName(src, file);
    violations.push(...hexHits, ...pxHits);
  }

  // Report.
  console.log("  Phase 1 · Scan results");
  console.log("  ----------------------");
  console.log(`  Files scanned:    ${scannedFiles}`);
  console.log(`  Total violations: ${violations.length}`);
  console.log("");

  if (violations.length > 0) {
    // Group by rule.
    const byRule = new Map<string, Violation[]>();
    for (const v of violations) {
      const arr = byRule.get(v.ruleId) ?? [];
      arr.push(v);
      byRule.set(v.ruleId, arr);
    }
    for (const [ruleId, list] of byRule) {
      console.log(`  ${ruleId}  (${list.length} violation${list.length === 1 ? "" : "s"})`);
      for (const v of list.slice(0, 200)) {
        const rel = relative(PROJECT_ROOT, v.path).replace(/\\/g, "/");
        console.log(`    ${rel}:${v.line}:${v.column}  ${v.match}`);
        console.log(`      ${v.context}`);
      }
      if (list.length > 200) {
        console.log(`    … and ${list.length - 200} more`);
      }
      console.log("");
    }
  }

  // Summary.
  console.log("  Phase 2 · Summary");
  console.log("  -----------------");
  const qa01 = violations.filter((v) => v.ruleId === "QA-01").length;
  const qa02 = violations.filter((v) => v.ruleId === "QA-02").length;
  console.log(`  QA-01 (raw hex):            ${qa01} violation${qa01 === 1 ? "" : "s"}`);
  console.log(`  QA-02 (raw px in className): ${qa02} violation${qa02 === 1 ? "" : "s"}`);
  console.log(`  Files scanned:              ${scannedFiles}`);
  console.log("");

  if (violations.length === 0) {
    console.log("  ✅ Design QA audit PASSED — zero raw hex / px violations.");
    process.exit(0);
  } else {
    console.log(`  ❌ Design QA audit FAILED — ${violations.length} violation(s) found.`);
    console.log("     See docs/DESIGN_QA_CONTRACT.md (QA-01, QA-02) for the rules.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Design QA audit crashed:", err);
  process.exit(2);
});
