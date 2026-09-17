/**
 * MadrashaOS — Typography Audit Script (Phase C5.3 · Part 2)
 *
 * Bun-compatible zero-tofu verification script that:
 *
 *   1. Defines all public + app + dev routes to check.
 *   2. Defines all 3 locales (en, bn, ar).
 *   3. For each route × locale combination:
 *        - Constructs the URL (e.g., http://localhost:3000/students?lang=bn)
 *        - Fetches the HTML (with a matching madrasha-locale cookie so the
 *          I18nProvider hydrates with the right locale)
 *        - Scans for tofu characters: □ (U+25A1), � (U+FFFD), U+0000
 *        - Reports any tofu found with the route + locale + character context
 *   4. Also validates the locale formatters directly:
 *        - formatDate(new Date(2026, 8, 16), "bn") === "১৬-০৯-২০২৬"
 *        - formatCurrency(5000, "bn") === "৳৫,০০০"
 *        - convertDigits("123", "ar") === "١٢٣"
 *   5. Outputs a summary report:
 *        "X routes checked × 3 locales = Y combinations · Z tofu found"
 *   6. Exit code 0 if zero tofu, exit code 1 if any tofu found.
 *
 * Run with:  bun run scripts/typography-audit.ts
 *
 * The dev server must be running on http://localhost:3000 (it is, by default).
 */

import {
  formatDate,
  formatCurrency,
  convertDigits,
} from "../src/lib/i18n/format";
import type { Locale } from "../src/lib/i18n/config";

/* ------------------------------------------------------------------ *
 * CONFIG
 * ------------------------------------------------------------------ */

const BASE_URL = process.env.TYPOGRAPHY_AUDIT_BASE_URL ?? "http://localhost:3000";

const LOCALES: Locale[] = ["en", "bn", "ar"];

/** Routes to audit — public + app + dev routes. */
const ROUTES: { path: string; label: string }[] = [
  { path: "/", label: "Home (token showcase)" },
  { path: "/dashboard", label: "Dashboard" },
  { path: "/dashboard/guardian", label: "Dashboard · Guardian" },
  { path: "/dashboard/teacher", label: "Dashboard · Teacher" },
  { path: "/dashboard/accountant", label: "Dashboard · Accountant" },
  { path: "/dashboard/authority", label: "Dashboard · Authority" },
  { path: "/dashboard/storekeeper", label: "Dashboard · Storekeeper" },
  { path: "/students", label: "Students" },
  { path: "/teachers", label: "Teachers" },
  { path: "/attendance", label: "Attendance" },
  { path: "/attendance/take", label: "Attendance · Take" },
  { path: "/fees", label: "Fees" },
  { path: "/accounting", label: "Accounting" },
  { path: "/zakat", label: "Zakat" },
  { path: "/organization", label: "Organization" },
  { path: "/organization/modules", label: "Organization · Modules" },
  { path: "/rbac", label: "RBAC" },
  { path: "/audit", label: "Audit Trail" },
  { path: "/notices", label: "Notices" },
  { path: "/reports", label: "Reports" },
  { path: "/inventory", label: "Inventory" },
  { path: "/hostel", label: "Hostel" },
  { path: "/library", label: "Library" },
  { path: "/exams", label: "Exams" },
  { path: "/admission", label: "Admission" },
  { path: "/documents", label: "Documents" },
  { path: "/donations", label: "Donations" },
  { path: "/suppliers", label: "Suppliers" },
  { path: "/assets", label: "Assets" },
  { path: "/purchase", label: "Purchase" },
  { path: "/food", label: "Food" },
  { path: "/transport", label: "Transport" },
  { path: "/dev/typography", label: "Dev · Typography" },
  { path: "/dev/shell", label: "Dev · Shell" },
  { path: "/dev/data", label: "Dev · Data" },
  { path: "/dev/components", label: "Dev · Components" },
];

/* ------------------------------------------------------------------ *
 * TOFU SCANNING
 * ------------------------------------------------------------------ */

/** Characters that count as tofu — "missing glyph" markers. */
const TOFU_REGEX = /[\u25A1\uFFFD\u0000]/g;

type TofuHit = {
  route: string;
  label: string;
  locale: Locale;
  url: string;
  char: string;
  code: string;
  snippet: string;
};

function scanHtml(html: string): { char: string; code: string; snippet: string }[] {
  const hits: { char: string; code: string; snippet: string }[] = [];
  let m: RegExpExecArray | null;
  TOFU_REGEX.lastIndex = 0;
  while ((m = TOFU_REGEX.exec(html)) !== null) {
    const ch = m[0];
    const cp = ch.codePointAt(0);
    const code = cp !== undefined
      ? `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`
      : "—";
    const start = Math.max(0, m.index - 40);
    const end = Math.min(html.length, m.index + 40);
    const snippet = html
      .slice(start, end)
      .replace(/\s+/g, " ")
      .trim();
    hits.push({ char: ch, code, snippet });
  }
  return hits;
}

/* ------------------------------------------------------------------ *
 * FORMATTER VALIDATION
 * ------------------------------------------------------------------ */

type FormatterCheck = {
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
};

function validateFormatters(): FormatterCheck[] {
  const checks: FormatterCheck[] = [];

  // Bangla date format
  const bnDate = formatDate(new Date(2026, 8, 16), "bn");
  checks.push({
    name: 'formatDate(new Date(2026, 8, 16), "bn")',
    expected: "১৬-০৯-২০২৬",
    actual: bnDate,
    passed: bnDate === "১৬-০৯-২০২৬",
  });

  // Bangla currency rendering
  const bnCurrency = formatCurrency(5000, "bn");
  checks.push({
    name: 'formatCurrency(5000, "bn")',
    expected: "৳৫,০০০",
    actual: bnCurrency,
    passed: bnCurrency === "৳৫,০০০",
  });

  // Arabic-Indic numerals
  const arDigits = convertDigits("123", "ar");
  checks.push({
    name: 'convertDigits("123", "ar")',
    expected: "١٢٣",
    actual: arDigits,
    passed: arDigits === "١٢٣",
  });

  return checks;
}

/* ------------------------------------------------------------------ *
 * MAIN
 * ------------------------------------------------------------------ */

async function fetchRoute(
  routePath: string,
  locale: Locale,
): Promise<{ status: number | null; html: string; error?: string }> {
  const url = `${BASE_URL}${routePath}?lang=${locale}`;
  try {
    const res = await fetch(url, {
      headers: {
        // Send the locale cookie so the I18nProvider hydrates with the right
        // locale on the client (server-side rendering still uses defaultLocale).
        Cookie: `madrasha-locale=${locale}`,
        Accept: "text/html,*/*",
      },
      redirect: "manual",
    });
    const html = await res.text();
    return { status: res.status, html };
  } catch (e) {
    return { status: null, html: "", error: (e as Error).message };
  }
}

async function main() {
  console.log("");
  console.log("  MadrashaOS · Typography Audit (Phase C5.3)");
  console.log("  ==========================================");
  console.log(`  Base URL: ${BASE_URL}`);
  console.log(`  Routes:   ${ROUTES.length}`);
  console.log(`  Locales:  ${LOCALES.length} (en, bn, ar)`);
  console.log("");

  /* ---- Phase 1: Formatter validation ---- */
  console.log("  Phase 1 · Formatter validation");
  console.log("  -------------------------------");
  const formatterChecks = validateFormatters();
  let formattersPassed = 0;
  for (const c of formatterChecks) {
    const status = c.passed ? "✅ PASS" : "❌ FAIL";
    console.log(`  ${status}  ${c.name}`);
    console.log(`           expected: ${c.expected}`);
    console.log(`           actual:   ${c.actual}`);
    if (c.passed) formattersPassed++;
  }
  console.log("");
  console.log(
    `  → ${formattersPassed}/${formatterChecks.length} formatter checks passed`,
  );
  console.log("");

  /* ---- Phase 2: HTML tofu scan ---- */
  console.log("  Phase 2 · Route × locale tofu scan");
  console.log("  ----------------------------------");

  const hits: TofuHit[] = [];
  let cellsOk = 0;
  let cellsError = 0;
  let cellsChecked = 0;
  const totalCells = ROUTES.length * LOCALES.length;

  for (const route of ROUTES) {
    for (const locale of LOCALES) {
      cellsChecked++;
      const url = `${BASE_URL}${route.path}?lang=${locale}`;
      const { status, html, error } = await fetchRoute(route.path, locale);

      if (error || status === null) {
        cellsError++;
        console.log(
          `  ❌ ERROR  ${route.path.padEnd(34)}  ${locale}  →  ${error}`,
        );
        continue;
      }

      if (status >= 400) {
        cellsError++;
        console.log(
          `  ⚠  HTTP ${status}  ${route.path.padEnd(28)}  ${locale}`,
        );
        continue;
      }

      const found = scanHtml(html);
      if (found.length === 0) {
        cellsOk++;
        // Only log every 10th cell to keep output readable.
        if (cellsChecked % 10 === 0 || cellsChecked === totalCells) {
          console.log(
            `  ✅ OK     ${route.path.padEnd(34)}  ${locale}  (${cellsChecked}/${totalCells})`,
          );
        }
      } else {
        for (const f of found) {
          hits.push({
            route: route.path,
            label: route.label,
            locale,
            url,
            char: f.char,
            code: f.code,
            snippet: f.snippet,
          });
        }
        console.log(
          `  ❌ TOFU   ${route.path.padEnd(34)}  ${locale}  →  ${found.length} hit(s)`,
        );
        for (const f of found.slice(0, 3)) {
          console.log(
            `           ${f.code}  "${f.snippet}"`,
          );
        }
      }
    }
  }

  /* ---- Phase 3: Summary ---- */
  console.log("");
  console.log("  Phase 3 · Summary");
  console.log("  -----------------");
  console.log(
    `  Routes checked: ${ROUTES.length} × ${LOCALES.length} locales = ${totalCells} combinations`,
  );
  console.log(`  Cells OK:        ${cellsOk}`);
  console.log(`  Cells error:     ${cellsError}`);
  console.log(`  Cells with tofu: ${hits.length > 0 ? hits.length : 0}`);
  console.log(
    `  Formatters:      ${formattersPassed}/${formatterChecks.length} passed`,
  );
  console.log("");

  if (hits.length > 0) {
    console.log("  Tofu hits (full detail):");
    for (const h of hits) {
      console.log(`    [${h.locale}] ${h.route}`);
      console.log(`      URL:     ${h.url}`);
      console.log(`      Char:    ${h.char}  (${h.code})`);
      console.log(`      Snippet: "${h.snippet}"`);
    }
    console.log("");
  }

  const tofuTotal = hits.length;
  const allFormattersPass = formattersPassed === formatterChecks.length;
  const pass = tofuTotal === 0 && allFormattersPass && cellsError === 0;

  console.log(
    `  ${ROUTES.length} routes checked × ${LOCALES.length} locales = ${totalCells} combinations · ${tofuTotal} tofu found`,
  );
  console.log("");

  if (pass) {
    console.log("  ✅ Typography audit PASSED — zero tofu across all routes.");
    process.exit(0);
  } else {
    if (tofuTotal > 0) {
      console.log(`  ❌ Typography audit FAILED — ${tofuTotal} tofu characters found.`);
    } else if (!allFormattersPass) {
      console.log("  ❌ Typography audit FAILED — formatter validation failed.");
    } else if (cellsError > 0) {
      console.log(`  ❌ Typography audit FAILED — ${cellsError} cells had HTTP/fetch errors.`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Typography audit crashed:", err);
  process.exit(2);
});
