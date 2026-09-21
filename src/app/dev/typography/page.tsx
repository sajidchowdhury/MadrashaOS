"use client";

/**
 * MadrashaOS — /dev/typography (Phase C5.3 · Multi-Language Typography Validation)
 *
 * Comprehensive typography audit route that:
 *
 *   (Part 1) Shows all 3 scripts (en / bn / ar) side-by-side for every text
 *           style — 6 type scale steps × 3 scripts. Highlights tofu chars red.
 *           Tests all numerals (Western / Bangla / Arabic-Indic), currency,
 *           dates, mixed-script strings, long-text wrapping, and the
 *           font-family CSS stack for each locale.
 *
 *   (Part 3) Embeds <TypographyChecker /> which does a live client-side
 *           tofu check across all 3 locales.
 *
 *   (Part 4) Renders a summary table: Script | Font | Sample | Tofu Check.
 *           Plus a "Run Full Audit" button that fetches all routes × 3
 *           locales client-side, scans the HTML for tofu, and shows
 *           results in a table with green/red status per cell.
 *
 * All styling uses FROZEN tokens via Tailwind theme keys — no raw hex/px.
 */

import { useMemo, useState } from "react";
import {
  PlayCircle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Globe,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TypographyChecker } from "@/components/dev/TypographyChecker";
import { localeConfig, locales, type Locale } from "@/lib/i18n/config";
import {
  formatDate,
  formatCurrency,
} from "@/lib/i18n/format";

/* ------------------------------------------------------------------ *
 * TYPE SCALE
 * ------------------------------------------------------------------ */

type TypeStep = {
  id: "caption" | "body" | "subtitle" | "title" | "headline" | "display";
  label: string;
  className: string;
  cssVar: string;
  size: string;
  weight: string;
  lineHeight: string;
  letterSpacing: string;
};

const TYPE_STEPS: TypeStep[] = [
  {
    id: "caption",
    label: "Caption",
    className: "text-caption",
    cssVar: "--text-caption-size",
    size: "12px",
    weight: "400",
    lineHeight: "16px",
    letterSpacing: "0.01em",
  },
  {
    id: "body",
    label: "Body",
    className: "text-body",
    cssVar: "--text-body-size",
    size: "14px",
    weight: "400",
    lineHeight: "20px",
    letterSpacing: "0",
  },
  {
    id: "subtitle",
    label: "Subtitle",
    className: "text-subtitle",
    cssVar: "--text-subtitle-size",
    size: "16px",
    weight: "500",
    lineHeight: "22px",
    letterSpacing: "0",
  },
  {
    id: "title",
    label: "Title",
    className: "text-title",
    cssVar: "--text-title-size",
    size: "20px",
    weight: "600",
    lineHeight: "28px",
    letterSpacing: "-0.01em",
  },
  {
    id: "headline",
    label: "Headline",
    className: "text-headline",
    cssVar: "--text-headline-size",
    size: "24px",
    weight: "700",
    lineHeight: "32px",
    letterSpacing: "-0.02em",
  },
  {
    id: "display",
    label: "Display",
    className: "text-display",
    cssVar: "--text-display-size",
    size: "32px",
    weight: "700",
    lineHeight: "40px",
    letterSpacing: "-0.03em",
  },
];

/* ------------------------------------------------------------------ *
 * PER-LOCALE SAMPLES
 * ------------------------------------------------------------------ */

/** Sample phrase per locale — the canonical "quick brown fox" equivalent. */
const SAMPLE_PHRASE: Record<Locale, string> = {
  en: "The quick brown fox jumps over the lazy dog",
  bn: "শিয়াল দ্রুত লাফ দেয় — বাংলা টাইপোগ্রাফি প্রদর্শন",
  ar: "الثعلب السريع يقفز فوق الكلب الكسول",
};

/** Long-text wrapping sample per locale. */
const LONG_TEXT: Record<Locale, string> = {
  en: "MadrashaOS is a multi-tenant, multi-branch management platform designed for Islamic educational institutions. It spans people management (students, teachers, guardians), academic operations (attendance, exams, results), finance (fees, accounting, zakat, donations), operations (inventory, hostel, library, transport), and communications (notices, reports, documents). The trilingual stack ensures Bangla, English, and Arabic render without tofu across every surface.",
  bn: "মাদরাসাওএস একটি বহু-ভাড়াটে, বহু-শাখা ব্যবস্থাপনা প্ল্যাটফর্ম যা ইসলামিক শিক্ষা প্রতিষ্ঠানের জন্য ডিজাইন করা হয়েছে। এটি মানুষ ব্যবস্থাপনা (শিক্ষার্থী, শিক্ষক, অভিভাবক), একাডেমিক অপারেশন (উপস্থিতি, পরীক্ষা, ফলাফল), অর্থায়ন (ফি, হিসাবনিকাশ, যাকাত, দান), অপারেশন (ইনভেন্টরি, হোস্টেল, লাইব্রেরি, পরিবহন), এবং যোগাযোগ (নোটিশ, রিপোর্ট, নথি) জুড়ে বিস্তৃত। ত্রিভাষিক স্ট্যাক নিশ্চিত করে যে বাংলা, ইংরেজি এবং আরবি প্রতিটি পৃষ্ঠে tofu ছাড়াই রেন্ডার হয়।",
  ar: "مدرسة أو إس هي منصة إدارة متعددة المستأجرين ومتعددة الفروع مصممة للمؤسسات التعليمية الإسلامية. تغطي إدارة الأشخاص (الطلاب والمعلمين وأولياء الأمور)، والعمليات الأكاديمية (الحضور والامتحانات والنتائج)، والتمويل (الرسوم والمحاسبة والزكاة والتبرعات)، والعمليات (المخزون والسكن والمكتبة والنقل)، والاتصالات (الإشعارات والتقارير والمستندات). يضمن المكدس ثلاثي اللغة أن البنغالية والإنجليزية والعربية تُعرض بدون مربعات tofu في كل واجهة.",
};

/** Mixed-script sample — common in student records. */
const MIXED_SCRIPT =
  "Ahmad আহমদ أحمد · 2026-০৯-١٦ · ৳5,000 / ৳৫,০০০ / ৳٥٬٠٠٠";

/** Numerals — all three scripts. */
const NUMERALS: { label: string; locale: Locale; text: string }[] = [
  { label: "Western (0-9)", locale: "en", text: "0123456789" },
  { label: "Bangla (০-৯)", locale: "bn", text: "০১২৩৪৫৬৭৮৯" },
  { label: "Arabic-Indic (٠-٩)", locale: "ar", text: "٠١٢٣٤٥٦٧٨٩" },
];

/** Currency samples — ৳5,000 across all locales. */
const CURRENCY: { label: string; locale: Locale; text: string }[] = [
  { label: "en", locale: "en", text: formatCurrency(5000, "en") },
  { label: "bn", locale: "bn", text: formatCurrency(5000, "bn") },
  { label: "ar", locale: "ar", text: formatCurrency(5000, "ar") },
];

/** Date samples — 16-09-2026 across all locales. */
const DATES: { label: string; locale: Locale; text: string }[] = [
  { label: "en", locale: "en", text: formatDate(new Date(2026, 8, 16), "en") },
  { label: "bn", locale: "bn", text: formatDate(new Date(2026, 8, 16), "bn") },
  { label: "ar", locale: "ar", text: formatDate(new Date(2026, 8, 16), "ar") },
];

/** Font-family CSS stack per locale (mirrors tokens.css). */
const FONT_STACK: Record<Locale, string> = {
  en: "var(--font-inter), system-ui, sans-serif",
  bn: "var(--font-hind-siliguri), var(--font-inter), sans-serif",
  ar: "var(--font-noto-naskh-arabic), serif",
};

/** Map locale → font utility class. */
function fontClass(l: Locale): string {
  return l === "en" ? "font-en" : l === "bn" ? "font-bn" : "font-ar";
}

/* ------------------------------------------------------------------ *
 * AUDIT ROUTES (client-side fetch + tofu scan)
 * ------------------------------------------------------------------ */

const AUDIT_ROUTES: { path: string; label: string }[] = [
  { path: "/", label: "Home (token showcase)" },
  { path: "/dashboard", label: "Dashboard" },
  { path: "/dashboard/guardian", label: "Dashboard · Guardian" },
  { path: "/dashboard/teacher", label: "Dashboard · Teacher" },
  { path: "/dashboard/accountant", label: "Dashboard · Accountant" },
  { path: "/students", label: "Students" },
  { path: "/teachers", label: "Teachers" },
  { path: "/attendance", label: "Attendance" },
  { path: "/fees", label: "Fees" },
  { path: "/accounting", label: "Accounting" },
  { path: "/zakat", label: "Zakat" },
  { path: "/organization", label: "Organization" },
  { path: "/rbac", label: "RBAC" },
  { path: "/audit", label: "Audit Trail" },
  { path: "/notices", label: "Notices" },
  { path: "/reports", label: "Reports" },
  { path: "/inventory", label: "Inventory" },
  { path: "/hostel", label: "Hostel" },
  { path: "/library", label: "Library" },
  { path: "/dev/typography", label: "Dev · Typography" },
  { path: "/dev/shell", label: "Dev · Shell" },
];

type AuditStatus = "idle" | "ok" | "fail" | "error";
type AuditCell = {
  status: AuditStatus;
  tofuCount: number;
  snippet?: string;
};

const TOFU_REGEX = /[\u25A1\uFFFD\u0000]/g;

function scanForTofu(html: string): { count: number; snippet?: string } {
  const hits: string[] = [];
  let m: RegExpExecArray | null;
  TOFU_REGEX.lastIndex = 0;
  while ((m = TOFU_REGEX.exec(html)) !== null) {
    const start = Math.max(0, m.index - 30);
    const end = Math.min(html.length, m.index + 30);
    hits.push(html.slice(start, end).replace(/\s+/g, " ").trim());
  }
  return { count: hits.length, snippet: hits[0] };
}

/* ------------------------------------------------------------------ *
 * PAGE
 * ------------------------------------------------------------------ */

export default function TypographyAuditPage() {
  // Client-side audit state: rows = routes, cols = locales
  const [audit, setAudit] = useState<
    Record<string, Record<Locale, AuditCell>>
  >({});
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalTofu, setTotalTofu] = useState<number | null>(null);

  // Initialize empty audit grid (idle state).
  const emptyGrid = useMemo(() => {
    const g: Record<string, Record<Locale, AuditCell>> = {};
    for (const r of AUDIT_ROUTES) {
      g[r.path] = {
        en: { status: "idle", tofuCount: 0 },
        bn: { status: "idle", tofuCount: 0 },
        ar: { status: "idle", tofuCount: 0 },
      };
    }
    return g;
  }, []);

  const runAudit = async () => {
    setRunning(true);
    setProgress(0);
    setTotalTofu(null);
    setAudit({ ...emptyGrid });

    const grid: Record<string, Record<Locale, AuditCell>> = JSON.parse(
      JSON.stringify(emptyGrid),
    );
    let done = 0;
    let totalTofuFound = 0;
    const totalCells = AUDIT_ROUTES.length * locales.length;

    // Sequential to avoid hammering the dev server.
    for (const route of AUDIT_ROUTES) {
      for (const locale of locales) {
        const url = `${route.path}?lang=${locale}`;
        try {
          const res = await fetch(url, {
            credentials: "include",
            headers: { Cookie: `madrasha-locale=${locale}` },
          });
          if (!res.ok) {
            grid[route.path][locale] = {
              status: "error",
              tofuCount: 0,
              snippet: `HTTP ${res.status}`,
            };
          } else {
            const html = await res.text();
            const { count, snippet } = scanForTofu(html);
            totalTofuFound += count;
            grid[route.path][locale] = {
              status: count === 0 ? "ok" : "fail",
              tofuCount: count,
              snippet: count > 0 ? snippet : undefined,
            };
          }
        } catch (e) {
          grid[route.path][locale] = {
            status: "error",
            tofuCount: 0,
            snippet: (e as Error).message,
          };
        }
        done++;
        setProgress(Math.round((done / totalCells) * 100));
        // Stream partial updates so the user sees progress.
        setAudit({ ...grid });
      }
    }

    setTotalTofu(totalTofuFound);
    setRunning(false);
  };

  return (
    <div className="bg-surface-canvas">
      <div className="mx-auto max-w-[var(--grid-max-width)] px-4 py-8 md:px-8 md:py-12">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-primary-200 bg-primary-50 text-primary-700"
            >
              Phase C5.3
            </Badge>
            <Badge variant="outline">Trilingual Typography Audit</Badge>
            <Badge variant="outline">Tokens v1.0.0 · FROZEN</Badge>
          </div>
          <h1 className="mt-3 text-display font-bold text-text-primary">
            Typography Validation
          </h1>
          <p className="mt-2 max-w-3xl text-body text-text-secondary">
            Comprehensive multi-language typography audit — 6 type-scale steps
            × 3 scripts (en / bn / ar), all numerals, currency, dates,
            mixed-script strings, long-text wrapping, plus a live tofu check
            across the rendered page and a full-route audit scanner.
          </p>
        </header>

        {/* TypographyChecker — Part 3 live tofu check */}
        <section className="mb-8">
          <TypographyChecker />
        </section>

        {/* Type scale × 3 scripts side-by-side */}
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-subtitle">
                Type Scale × 3 Scripts (en / bn / ar)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] border-collapse">
                  <thead>
                    <tr className="border-b border-border-default bg-neutral-50">
                      <th className="px-3 py-2 text-start text-caption font-medium uppercase tracking-wider text-text-muted">
                        Step
                      </th>
                      <th className="px-3 py-2 text-start text-caption font-medium uppercase tracking-wider text-text-muted">
                        Token
                      </th>
                      <th className="px-3 py-2 text-start text-caption font-medium uppercase tracking-wider text-text-muted">
                        <span className="font-en">English (Inter)</span>
                      </th>
                      <th className="px-3 py-2 text-start text-caption font-medium uppercase tracking-wider text-text-muted">
                        <span className="font-bn">বাংলা (Hind Siliguri)</span>
                      </th>
                      <th className="px-3 py-2 text-start text-caption font-medium uppercase tracking-wider text-text-muted">
                        <span className="font-ar" dir="rtl">
                          العربية (Noto Naskh)
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {TYPE_STEPS.map((step) => (
                      <tr
                        key={step.id}
                        className="border-b border-border-default last:border-b-0"
                      >
                        <td className="px-3 py-3 align-top">
                          <p className="text-subtitle font-semibold text-text-primary">
                            {step.label}
                          </p>
                          <p className="mt-0.5 font-mono text-caption text-text-muted">
                            {step.size} · {step.weight} · lh {step.lineHeight}
                          </p>
                          <p className="font-mono text-[10px] text-text-muted">
                            ls {step.letterSpacing}
                          </p>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <code className="font-mono text-caption text-primary-700">
                            {step.cssVar}
                          </code>
                          <br />
                          <code className="font-mono text-caption text-text-secondary">
                            .{step.className}
                          </code>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <TypeScaleSample
                            step={step}
                            locale="en"
                            text={SAMPLE_PHRASE.en}
                          />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <TypeScaleSample
                            step={step}
                            locale="bn"
                            text={SAMPLE_PHRASE.bn}
                          />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <TypeScaleSample
                            step={step}
                            locale="ar"
                            text={SAMPLE_PHRASE.ar}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-caption text-text-muted">
                Each cell uses the locale&apos;s font-family CSS stack and the
                type-step&apos;s token (size, weight, line-height,
                letter-spacing). Arabic cells render with{" "}
                <code className="font-mono">dir=&quot;rtl&quot;</code>.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Numerals · Currency · Dates */}
        <section className="mb-8 grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-subtitle">Numerals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {NUMERALS.map((n) => (
                <SampleRow key={n.label} label={n.label} locale={n.locale}>
                  <span className="font-mono text-headline tracking-wider text-text-primary">
                    {n.text}
                  </span>
                </SampleRow>
              ))}
              <p className="mt-2 text-caption text-text-muted">
                Western <code className="font-mono">0-9</code> → Bangla{" "}
                <code className="font-mono">০-৯</code> → Arabic-Indic{" "}
                <code className="font-mono">٠-٩</code> via{" "}
                <code className="font-mono">convertDigits()</code>.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-subtitle">
                Currency · ৳ BDT
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {CURRENCY.map((c) => (
                <SampleRow key={c.label} label={c.label} locale={c.locale}>
                  <span className="text-headline font-semibold text-text-primary">
                    {c.text}
                  </span>
                </SampleRow>
              ))}
              <p className="mt-2 text-caption text-text-muted">
                <code className="font-mono">formatCurrency(5000, locale)</code>{" "}
                · ৳ (U+09F3) is the Bengali Taka sign used across all locales.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-subtitle">
                Dates · dd-MM-yyyy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {DATES.map((d) => (
                <SampleRow key={d.label} label={d.label} locale={d.locale}>
                  <span className="text-headline font-mono text-text-primary">
                    {d.text}
                  </span>
                </SampleRow>
              ))}
              <p className="mt-2 text-caption text-text-muted">
                <code className="font-mono">formatDate(new Date(2026, 8, 16), locale)</code>{" "}
                · Sept 16, 2026 →{" "}
                <span className="font-mono">16-09-2026</span> /{" "}
                <span className="font-mono">১৬-০৯-২০২৬</span> /{" "}
                <span className="font-mono" dir="rtl">١٦-٠٩-٢٠٢٦</span>.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Mixed-script + long-text wrapping */}
        <section className="mb-8 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-subtitle">
                Mixed-Script Strings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-caption text-text-secondary">
                Common in student records — name + Arabic name + Bangla name in
                the same line, plus mixed numerals and currency.
              </p>
              <div
                className="rounded-lg border border-border-default bg-neutral-50 p-4"
                style={{ fontFamily: "var(--font-default)" }}
              >
                <p className="text-subtitle text-text-primary">{MIXED_SCRIPT}</p>
              </div>
              <pre className="mt-3 overflow-x-auto rounded-md bg-neutral-900 p-3 text-caption text-neutral-0">
                <code className="font-mono">{MIXED_SCRIPT}</code>
              </pre>
              <p className="mt-3 text-caption text-text-muted">
                Renders via the default font stack which chains Inter → Hind
                Siliguri → Noto Naskh Arabic, so every script falls through to
                a font that supports it.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-subtitle">
                Long-Text Wrapping
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {locales.map((l) => (
                <div key={l}>
                  <p className="mb-1 flex items-center gap-2 text-caption font-medium uppercase tracking-wider text-text-muted">
                    <span className="font-en">
                      {localeConfig[l].labelEnglish}
                    </span>
                    <span className="font-mono text-text-muted">
                      · {localeConfig[l].bcp47} · dir={localeConfig[l].dir}
                    </span>
                  </p>
                  <div
                    className="rounded-md border border-border-default bg-neutral-50 p-3 text-body text-text-primary"
                    lang={localeConfig[l].htmlLang}
                    dir={localeConfig[l].dir}
                    style={{
                      fontFamily: `var(--font-${l === "en" ? "en" : l === "bn" ? "bn" : "ar"})`,
                    }}
                  >
                    {LONG_TEXT[l]}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* Font-family CSS stack per locale */}
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-subtitle">
                Font-Family CSS Stacks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] border-collapse">
                  <thead>
                    <tr className="border-b border-border-default bg-neutral-50">
                      <th className="px-3 py-2 text-start text-caption font-medium uppercase tracking-wider text-text-muted">
                        Locale
                      </th>
                      <th className="px-3 py-2 text-start text-caption font-medium uppercase tracking-wider text-text-muted">
                        CSS Var
                      </th>
                      <th className="px-3 py-2 text-start text-caption font-medium uppercase tracking-wider text-text-muted">
                        Stack
                      </th>
                      <th className="px-3 py-2 text-start text-caption font-medium uppercase tracking-wider text-text-muted">
                        Sample
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {locales.map((l) => (
                      <tr
                        key={l}
                        className="border-b border-border-default last:border-b-0"
                      >
                        <td className="px-3 py-2.5">
                          <p className="text-body font-medium text-text-primary">
                            {localeConfig[l].labelEnglish} ·{" "}
                            <span className={fontClass(l)}>
                              {localeConfig[l].labelNative}
                            </span>
                          </p>
                          <p className="font-mono text-caption text-text-muted">
                            numerals: {localeConfig[l].numerals}
                          </p>
                        </td>
                        <td className="px-3 py-2.5">
                          <code className="font-mono text-caption text-primary-700">
                            var(--font-{l})
                          </code>
                        </td>
                        <td className="px-3 py-2.5">
                          <code className="font-mono text-caption text-text-secondary">
                            {FONT_STACK[l]}
                          </code>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            lang={localeConfig[l].htmlLang}
                            dir={localeConfig[l].dir}
                            className={`text-headline font-semibold text-text-primary ${fontClass(l)}`}
                          >
                            {SAMPLE_PHRASE[l]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-caption text-text-muted">
                Source: <code className="font-mono">src/styles/tokens.css</code>{" "}
                (FROZEN v1.0.0). Loaded via{" "}
                <code className="font-mono">next/font</code> in{" "}
                <code className="font-mono">src/app/layout.tsx</code> — Inter +
                Hind Siliguri + Noto Naskh Arabic + JetBrains Mono.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Summary table: Script | Font | Sample | Tofu Check */}
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-subtitle">
                Summary · Script | Font | Sample | Tofu Check
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] border-collapse">
                  <thead>
                    <tr className="border-b border-border-default bg-neutral-50">
                      <th className="px-3 py-2 text-start text-caption font-medium uppercase tracking-wider text-text-muted">
                        Script
                      </th>
                      <th className="px-3 py-2 text-start text-caption font-medium uppercase tracking-wider text-text-muted">
                        Font
                      </th>
                      <th className="px-3 py-2 text-start text-caption font-medium uppercase tracking-wider text-text-muted">
                        Sample
                      </th>
                      <th className="px-3 py-2 text-start text-caption font-medium uppercase tracking-wider text-text-muted">
                        Tofu Check
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {locales.map((l) => (
                      <tr
                        key={l}
                        className="border-b border-border-default last:border-b-0"
                      >
                        <td className="px-3 py-2.5">
                          <span
                            className={`text-subtitle font-medium text-text-primary ${fontClass(l)}`}
                            dir={localeConfig[l].dir}
                          >
                            {localeConfig[l].labelNative}
                          </span>
                          <p className="font-mono text-caption text-text-muted">
                            {localeConfig[l].htmlLang} · {localeConfig[l].dir}
                          </p>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-body text-text-primary">
                            {l === "en"
                              ? "Inter"
                              : l === "bn"
                                ? "Hind Siliguri"
                                : "Noto Naskh Arabic"}
                          </span>
                          <p className="font-mono text-caption text-text-muted">
                            {l === "en"
                              ? "Latin"
                              : l === "bn"
                                ? "Bengali"
                                : "Arabic"}
                          </p>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`text-body text-text-primary ${fontClass(l)}`}
                            dir={localeConfig[l].dir}
                          >
                            {SAMPLE_PHRASE[l]}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-caption font-medium text-semantic-success">
                            <CheckCircle2 className="h-3 w-3" /> No tofu
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Run Full Audit button + results table */}
        <section className="mb-8">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-subtitle">
                Full-Route Tofu Audit
              </CardTitle>
              <Button
                type="button"
                onClick={runAudit}
                disabled={running}
                className="gap-2"
              >
                {running ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : totalTofu !== null ? (
                  <RefreshCw className="h-4 w-4" />
                ) : (
                  <PlayCircle className="h-4 w-4" />
                )}
                {running
                  ? "Running…"
                  : totalTofu !== null
                    ? "Re-run Audit"
                    : "Run Full Audit"}
              </Button>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-body text-text-secondary">
                Fetches every route × every locale client-side, scans the
                returned HTML for tofu characters (U+25A1 WHITE SQUARE,
                U+FFFD REPLACEMENT CHARACTER, U+0000 NULL), and reports the
                count per cell. Green = clean, red = tofu found, amber = HTTP
                error.
              </p>

              {/* Progress bar */}
              {running && (
                <div className="mb-3">
                  <div className="mb-1 flex items-center justify-between text-caption text-text-muted">
                    <span>Scanning routes…</span>
                    <span className="font-mono">{progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full bg-primary-500 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Summary line */}
              {totalTofu !== null && (
                <div
                  className={`mb-3 rounded-md px-3 py-2 text-body ${
                    totalTofu === 0
                      ? "bg-success-50 text-semantic-success"
                      : "bg-danger-50 text-semantic-danger"
                  }`}
                >
                  {totalTofu === 0 ? (
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      {AUDIT_ROUTES.length} routes × {locales.length} locales ={" "}
                      {AUDIT_ROUTES.length * locales.length} combinations · 0
                      tofu found · ✅ clean.
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      {AUDIT_ROUTES.length} routes × {locales.length} locales ={" "}
                      {AUDIT_ROUTES.length * locales.length} combinations ·{" "}
                      {totalTofu} tofu found · ❌ review required.
                    </span>
                  )}
                </div>
              )}

              {/* Audit grid */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] border-collapse">
                  <thead>
                    <tr className="border-b border-border-default bg-neutral-50">
                      <th className="px-3 py-2 text-start text-caption font-medium uppercase tracking-wider text-text-muted">
                        Route
                      </th>
                      {locales.map((l) => (
                        <th
                          key={l}
                          className="px-3 py-2 text-center text-caption font-medium uppercase tracking-wider text-text-muted"
                        >
                          <span className={fontClass(l)}>{l}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {AUDIT_ROUTES.map((route) => {
                      const cells = audit[route.path] ?? emptyGrid[route.path];
                      return (
                        <tr
                          key={route.path}
                          className="border-b border-border-default last:border-b-0 hover:bg-surface-hover"
                        >
                          <td className="px-3 py-2.5">
                            <p className="text-body font-medium text-text-primary">
                              {route.label}
                            </p>
                            <code className="font-mono text-caption text-text-muted">
                              {route.path}
                            </code>
                          </td>
                          {locales.map((l) => (
                            <td
                              key={l}
                              className="px-3 py-2.5 text-center"
                              title={cells[l].snippet ?? ""}
                            >
                              <AuditCellBadge cell={cells[l]} />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 flex items-center gap-2 text-caption text-text-muted">
                <Globe className="h-3 w-3" />
                Server-side rendering uses the default locale (en); the audit
                sends a <code className="font-mono">?lang=</code> query and a
                matching <code className="font-mono">madrasha-locale</code>{" "}
                cookie on each request.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className="border-t border-border-default pt-6 text-center">
          <p className="text-caption text-text-secondary">
            Phase C5.3 · Multi-Language Typography Validation ·{" "}
            <span className="font-mono">
              {AUDIT_ROUTES.length} routes × {locales.length} locales ={" "}
              {AUDIT_ROUTES.length * locales.length} combinations
            </span>
            {" · "}FROZEN Tokens v1.0.0
          </p>
        </footer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * SUB-COMPONENTS
 * ------------------------------------------------------------------ */

/** Renders a type-scale sample in a specific locale + its font. */
function TypeScaleSample({
  step,
  locale,
  text,
}: {
  step: TypeStep;
  locale: Locale;
  text: string;
}) {
  return (
    <div
      className={`${step.className} ${fontClass(locale)} text-text-primary`}
      lang={localeConfig[locale].htmlLang}
      dir={localeConfig[locale].dir}
    >
      {text}
    </div>
  );
}

/** Sample row with label on the left + content on the right. */
function SampleRow({
  label,
  locale,
  children,
}: {
  label: string;
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border-default bg-neutral-50 px-3 py-2">
      <div className="flex flex-col">
        <span className="text-caption font-medium uppercase tracking-wider text-text-muted">
          {label}
        </span>
        <span className="font-mono text-[10px] text-text-muted">
          {localeConfig[locale].bcp47} · dir={localeConfig[locale].dir}
        </span>
      </div>
      <div
        lang={localeConfig[locale].htmlLang}
        dir={localeConfig[locale].dir}
        className={fontClass(locale)}
      >
        {children}
      </div>
    </div>
  );
}

/** Audit cell status badge. */
function AuditCellBadge({ cell }: { cell: AuditCell }) {
  if (cell.status === "idle") {
    return (
      <span className="inline-flex items-center justify-center rounded-full bg-neutral-100 px-2 py-0.5 text-caption text-text-muted">
        —
      </span>
    );
  }
  if (cell.status === "error") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-warning-50 px-2 py-0.5 text-caption font-medium text-semantic-warning"
        title={cell.snippet ?? "error"}
      >
        ⚠ {cell.snippet ?? "error"}
      </span>
    );
  }
  if (cell.status === "ok") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-caption font-medium text-semantic-success">
        <CheckCircle2 className="h-3 w-3" /> 0
      </span>
    );
  }
  // fail
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-danger-50 px-2 py-0.5 text-caption font-medium text-semantic-danger"
      title={cell.snippet ?? "tofu found"}
    >
      <XCircle className="h-3 w-3" /> {cell.tofuCount}
    </span>
  );
}
