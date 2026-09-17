/**
 * MadrashaOS — Asset Library Export Script (Phase C7.3 · Task 7-c)
 *
 * Bun-compatible script that:
 *   1. Walks every .ts/.tsx file under src/ (excluding node_modules)
 *      and extracts every named import from `lucide-react`.
 *   2. For each discovered icon, imports the icon component from
 *      `lucide-react` and renders it to a static SVG string via
 *      `react-dom/server.renderToStaticMarkup`.
 *   3. Writes one file per icon to `public/assets/icons/<kebab-name>.svg`
 *      with a normalized header (xmlns, viewBox, width/height=24, stroke
 *      defaults to currentColor so the SVG inherits brand color).
 *   4. Builds `public/assets/icons/sprite.svg` — a single file with all
 *      icons concatenated as `<symbol>` elements (referenced via
 *      `<svg><use href="/assets/icons/sprite.svg#icon-name"/></svg>`).
 *   5. Builds `public/assets/icons/icon-catalog.json` — a manifest of
 *      { name, pascalName, filename, sizeBytes, viewBox } entries.
 *
 * Run with:  bun run scripts/export-icons.ts
 *
 * Why this is data-only (no design-token concerns):
 *   The exported SVG/JSON files contain raw `currentColor` references
 *   (the icons) or raw hex values (catalog metadata) — these are
 *   machine-readable DATA files, not React components, so they are
 *   exempt from the no-raw-tokens rule (R-T1 from Session C0.1) the
 *   same way `src/lib/pdf/brand.ts` is (see header there).
 */

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname, basename, sep } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import * as Lucide from "lucide-react";

/* ----------------------------------------------------------------
 * CONFIG
 * ---------------------------------------------------------------- */

const SRC_ROOT = join(process.cwd(), "src");
const OUT_DIR = join(process.cwd(), "public", "assets", "icons");

/* ----------------------------------------------------------------
 * STEP 1 — walk src/ and extract lucide-react named imports
 * ----------------------------------------------------------------
 *
 * Scans every .ts/.tsx file. Recognizes both single-line and multi-line
 * import statements:
 *
 *   import { Bug, ChevronUp, Play } from "lucide-react";
 *   import {
 *     ChevronLeft,
 *     ChevronRight,
 *     ArrowLeft as ArrowLeftIcon,  // alias — we record the original name
 *     type LucideIcon,              // type-only — skipped
 *   } from "lucide-react";
 *
 * The captured set is the unique list of PASCAL icon names actually
 * consumed by the application. Type-only imports + alias specifiers
 * are correctly resolved to the underlying export name.
 */

async function walk(dir: string, files: string[] = []): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, files);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

/** Extract every lucide-react named import (resolving aliases)
 *  from a single source file. Returns a Set of PASCAL names. */
function extractLucideImports(source: string): Set<string> {
  const out = new Set<string>();
  // Match: import { ... } from "lucide-react";  (single or multi-line)
  const importRe = /import\s*\{([^}]*)\}\s*from\s*["']lucide-react["']/g;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(source)) !== null) {
    const body = m[1]!;
    // Split on commas, trim, handle aliases, skip type-only
    for (let raw of body.split(",")) {
      raw = raw.trim();
      if (!raw) continue;
      if (raw.startsWith("type ")) continue;          // type-only
      if (/^type\b/.test(raw)) continue;
      // Strip inline comments
      raw = raw.replace(/\/\*.*?\*\//g, "").replace(/\/\/.*$/g, "").trim();
      if (!raw) continue;
      // Handle alias: `Foo as Bar` → underlying name is Foo
      const aliasMatch = raw.match(/^([A-Za-z][A-Za-z0-9]*)\s+as\s+([A-Za-z][A-Za-z0-9]*)$/);
      const name = aliasMatch ? aliasMatch[1]! : raw;
      // Validate it's a PascalCase identifier
      if (/^[A-Z][A-Za-z0-9]*$/.test(name)) {
        out.add(name);
      }
    }
  }
  return out;
}

/* ----------------------------------------------------------------
 * STEP 2 — render each icon to SVG via react-dom/server
 * ----------------------------------------------------------------
 *
 * Each Lucide icon component renders a complete <svg> element with
 * width/height = size (default 24). We render at size=24, then post-
 * process the markup to:
 *   - drop the `aria-hidden="true"` (so the file works in both
 *     decorative and labelled contexts)
 *   - drop the lucide className (the sprite use-case wants a clean svg)
 *   - keep stroke="currentColor" so the SVG inherits brand color
 */

function renderIcon(name: string): string {
  const Component = (Lucide as unknown as Record<string, React.ComponentType<Record<string, unknown>>>)[name];
  if (!Component) {
    throw new Error(`Lucide icon "${name}" not found in lucide-react exports`);
  }
  const element = React.createElement(Component, {
    size: 24,
    strokeWidth: 2,
    color: "currentColor",
  });
  const markup = renderToStaticMarkup(element);
  // Sanitize: drop class attribute + aria-hidden
  return markup
    .replace(/\sclass="[^"]*"/g, "")
    .replace(/\saria-hidden="[^"]*"/g, "")
    .replace(/>\s+</g, "><")
    .trim();
}

/** Derive the kebab-case filename for a PascalCase icon name.
 *  e.g. "LayoutDashboard" → "layout-dashboard"
 *       "CheckCircle2"    → "check-circle-2"
 *       "BarChart3"       → "bar-chart-3"
 *       "FileImage"       → "file-image" */
function kebab(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")          // aB  → a-B, 0B → 0-B
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")       // ABc → A-Bc
    .replace(/([a-zA-Z])(\d)/g, "$1-$2")             // a2  → a-2  (digit suffix)
    .toLowerCase();
}

/** Extract the inner content (children) of an <svg>...</svg> tag
 *  for use inside a <symbol> element. */
function svgInner(svg: string): string {
  const m = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  return m ? m[1]!.trim() : "";
}

/** Extract the viewBox attribute from an <svg> tag. */
function svgViewBox(svg: string): string {
  const m = svg.match(/viewBox="([^"]+)"/);
  return m ? m[1]! : "0 0 24 24";
}

/* ----------------------------------------------------------------
 * STEP 3 — main
 * ---------------------------------------------------------------- */

async function main() {
  console.log("[export-icons] Walking src/ to discover lucide-react imports…");

  const files = await walk(SRC_ROOT);
  const allNames = new Set<string>();
  let scanned = 0;
  for (const file of files) {
    scanned++;
    const src = await readFile(file, "utf8");
    const names = extractLucideImports(src);
    for (const n of names) allNames.add(n);
  }
  console.log(
    `[export-icons] Scanned ${scanned} .ts/.tsx files; found ${allNames.size} unique Lucide icons.`,
  );

  // Ensure output dir exists
  if (!existsSync(OUT_DIR)) {
    await mkdir(OUT_DIR, { recursive: true });
  }

  // Render each icon → write file + collect metadata
  type Entry = {
    name: string;        // kebab-case file stem (e.g. "layout-dashboard")
    pascalName: string;  // PascalCase export name (e.g. "LayoutDashboard")
    filename: string;    // "layout-dashboard.svg"
    sizeBytes: number;
    viewBox: string;
  };
  const entries: Entry[] = [];
  const symbols: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" style="display:none;">`];

  const sortedNames = Array.from(allNames).sort();
  let ok = 0;
  let skipped = 0;
  for (const name of sortedNames) {
    let svg: string;
    try {
      svg = renderIcon(name);
    } catch (err) {
      console.warn(`[export-icons] SKIP "${name}": ${(err as Error).message}`);
      skipped++;
      continue;
    }
    const kebabName = kebab(name);
    const filename = `${kebabName}.svg`;
    const fullPath = join(OUT_DIR, filename);
    await writeFile(fullPath, `${svg}\n`, "utf8");
    const sizeBytes = Buffer.byteLength(svg + "\n", "utf8");
    const viewBox = svgViewBox(svg);
    entries.push({ name: kebabName, pascalName: name, filename, sizeBytes, viewBox });

    // Append <symbol> for the sprite
    const inner = svgInner(svg);
    symbols.push(
      `  <symbol id="icon-${kebabName}" viewBox="${viewBox}">${inner}</symbol>`,
    );
    ok++;
  }
  symbols.push("</svg>");
  await writeFile(join(OUT_DIR, "sprite.svg"), `${symbols.join("\n")}\n`, "utf8");

  // Catalog JSON
  const catalog = {
    generatedAt: new Date().toISOString(),
    source: "MadrashaOS · src/ (lucide-react v0.525.0)",
    count: entries.length,
    icons: entries,
  };
  await writeFile(
    join(OUT_DIR, "icon-catalog.json"),
    JSON.stringify(catalog, null, 2) + "\n",
    "utf8",
  );

  console.log(
    `[export-icons] ✅ Wrote ${ok} icons, ${skipped} skipped. Output: ${OUT_DIR}`,
  );
  console.log(
    `[export-icons]    sprite.svg (${symbols.length} lines) + icon-catalog.json (${entries.length} entries).`,
  );
}

main().catch((err) => {
  console.error("[export-icons] FATAL:", err);
  process.exit(1);
});
