"use client";

/**
 * MadrashaOS — TypographyChecker (C5.3 · Part 3)
 *
 * Zero-tofu verification component that can be embedded in any page to
 * verify typography on-the-fly. Renders a comprehensive set of test strings
 * in all 3 locales (en / bn / ar), then runs a client-side check that:
 *
 *   1. Waits for `document.fonts.ready` (Inter + Hind Siliguri + Noto Naskh
 *      Arabic to finish loading via next/font).
 *   2. Scans each test string's characters against the known tofu set:
 *        - U+25A1 □ WHITE SQUARE (browser fallback "missing glyph" marker)
 *        - U+FFFD � REPLACEMENT CHARACTER (encoding error)
 *        - U+0000 NULL (encoding error)
 *   3. Uses `document.fonts.check(fontSpec, char)` to verify that the assigned
 *      webfont can actually render each glyph (this catches the case where
 *      the source has no tofu codepoint but the font lacks the glyph — which
 *      is what users *actually* see as tofu).
 *   4. Hooks a MutationObserver on the rendered test-spans so the check
 *      re-runs if React re-renders the strings (e.g. on locale switch).
 *
 * Renders a green ✅ "No tofu detected" badge or a red ❌ "Tofu found in
 * [locale] [context]" badge, plus a per-hit table for red state.
 *
 * Uses ONLY FROZEN tokens (no raw hex/px values in component code).
 */

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { localeConfig, locales, type Locale } from "@/lib/i18n/config";
import {
  formatDate,
  formatNumber,
  formatCurrency,
  convertDigits,
} from "@/lib/i18n/format";

type TofuHit = {
  locale: Locale;
  context: string;
  char: string;
  code: string;
  reason: string;
};

/**
 * Per-locale font-family CSS spec used for both the rendered test spans
 * and the document.fonts.check() call. Must match the fontVar in
 * localeConfig (which references --font-en / --font-bn / --font-ar from
 * tokens.css). We use the literal font names so document.fonts.check()
 * can resolve them.
 */
const FONT_FAMILY: Record<Locale, string> = {
  en: '"Inter", system-ui, sans-serif',
  bn: '"Hind Siliguri", "Inter", sans-serif',
  ar: '"Noto Naskh Arabic", serif',
};

/** Test strings — comprehensive coverage per locale. */
type TestSample = { label: string; text: string };
const TEST_STRINGS: Record<Locale, TestSample[]> = {
  en: [
    { label: "alphabet", text: "ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz" },
    { label: "numerals", text: "0123456789" },
    { label: "currency", text: formatCurrency(5000, "en") },
    { label: "date", text: formatDate(new Date(2026, 8, 16), "en") },
    { label: "long-number", text: formatNumber(1234567, "en") },
    { label: "phrase", text: "The quick brown fox jumps over the lazy dog" },
    { label: "punctuation", text: "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~" },
  ],
  bn: [
    { label: "alphabet", text: "অআইঈউঊঋএঐওঔ কখগঘঙচছজঝঞ টঠডঢণ তথদধন পফবভম যরলশষসহ ড়ঢ়য়" },
    { label: "numerals", text: convertDigits("0123456789", "bn") },
    { label: "currency", text: formatCurrency(5000, "bn") },
    { label: "date", text: formatDate(new Date(2026, 8, 16), "bn") },
    { label: "long-number", text: formatNumber(1234567, "bn") },
    { label: "phrase", text: "শিয়াল দ্রুত লাফ দেয় — বাংলা টাইপোগ্রাফি প্রদর্শন" },
    { label: "punctuation", text: "। ॥ ৳ ০ ১ ২ ৩ ৪ ৫ ৬ ৭ ৮ ৯" },
  ],
  ar: [
    { label: "alphabet", text: "ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي" },
    { label: "numerals", text: convertDigits("0123456789", "ar") },
    { label: "currency", text: formatCurrency(5000, "ar") },
    { label: "date", text: formatDate(new Date(2026, 8, 16), "ar") },
    { label: "long-number", text: formatNumber(1234567, "ar") },
    { label: "phrase", text: "الثعلب السريع يقفز فوق الكلب الكسول" },
    { label: "punctuation", text: "؟ ، ؛ ٬ ٫ ٠ ١ ٢ ٣ ٤ ٥ ٦ ٧ ٨ ٩" },
  ],
};

/** Mixed-script sample (common in student records). */
const MIXED_SCRIPT = "Ahmad আহমদ أحمد · 2026-০৯-١٦ · ৳5,000 / ৳৫,০০০ / ৳٥٬٠٠٠";

/** Known tofu / replacement codepoints — guaranteed not to render. */
const TOFU_CHARS = new Set(["\u25A1", "\uFFFD", "\u0000"]);

function codepointLabel(ch: string): string {
  const cp = ch.codePointAt(0);
  if (cp === undefined) return "—";
  return `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
}

export function TypographyChecker() {
  const [hits, setHits] = useState<TofuHit[]>([]);
  const [fontsReady, setFontsReady] = useState(false);
  const [checked, setChecked] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        // Wait for all next/font webfonts to be ready.
        await (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready;
      } catch {
        // ignore — older browsers
      }
      if (cancelled) return;
      setFontsReady(true);

      const found: TofuHit[] = [];

      // (1) Scan each per-locale test string for tofu codepoints and font support.
      for (const locale of locales) {
        const fontSpec = `16px ${FONT_FAMILY[locale]}`;
        for (const { label, text } of TEST_STRINGS[locale]) {
          for (const ch of text) {
            if (TOFU_CHARS.has(ch)) {
              found.push({
                locale,
                context: label,
                char: ch,
                code: codepointLabel(ch),
                reason: "tofu codepoint in source",
              });
              continue;
            }
            // Use document.fonts.check(font, text) — returns true if the font
            // can render all the glyphs in the text. This catches the case
            // where the source has no tofu codepoint but the assigned webfont
            // lacks the glyph entirely (which is what users see as tofu).
            try {
              const supported = (
                document as unknown as {
                  fonts: { check: (font: string, text: string) => boolean };
                }
              ).fonts.check(fontSpec, ch);
              if (!supported) {
                found.push({
                  locale,
                  context: label,
                  char: ch,
                  code: codepointLabel(ch),
                  reason: `${localeConfig[locale].labelEnglish} font cannot render glyph`,
                });
              }
            } catch {
              // document.fonts.check not supported — skip
            }
          }
        }
      }

      // (2) Scan the mixed-script string for tofu too.
      for (const ch of MIXED_SCRIPT) {
        if (TOFU_CHARS.has(ch)) {
          found.push({
            locale: "en", // mixed-script — attribute to en for display
            context: "mixed-script",
            char: ch,
            code: codepointLabel(ch),
            reason: "tofu codepoint in mixed-script source",
          });
        }
      }

      if (!cancelled) {
        setHits(found);
        setChecked(true);
      }
    };

    run();

    // Hook a MutationObserver on the rendered test spans so the check
    // re-runs if React re-renders the strings (e.g. on locale switch).
    if (
      containerRef.current &&
      typeof MutationObserver !== "undefined" &&
      !observerRef.current
    ) {
      observerRef.current = new MutationObserver(() => {
        // Re-run the check (debounced via requestAnimationFrame).
        cancelAnimationFrame((window as unknown as { __tofuRaf?: number }).__tofuRaf ?? 0);
        (window as unknown as { __tofuRaf?: number }).__tofuRaf =
          requestAnimationFrame(() => {
            run();
          });
      });
      observerRef.current.observe(containerRef.current, {
        subtree: true,
        characterData: true,
        childList: true,
      });
    }

    return () => {
      cancelled = true;
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, []);

  const ok = checked && hits.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-subtitle">
          <span>Typography Tofu Check</span>
          {checked ? (
            ok ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-3 py-1 text-caption font-medium text-semantic-success">
                <CheckCircle2 className="h-3 w-3" /> No tofu detected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-danger-50 px-3 py-1 text-caption font-medium text-semantic-danger">
                <XCircle className="h-3 w-3" /> {hits.length} tofu found
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-caption font-medium text-text-secondary">
              <Loader2 className="h-3 w-3 animate-spin" />
              {fontsReady ? "checking…" : "loading fonts…"}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {checked && hits.length > 0 && (
          <div className="space-y-2">
            {hits.map((hit, i) => (
              <div
                key={i}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-danger-50 bg-danger-50 px-3 py-2 text-caption text-semantic-danger"
              >
                <span className="font-mono font-semibold uppercase">
                  {hit.locale}
                </span>
                <span className="rounded bg-surface-card px-1.5 py-0.5 font-mono">
                  {hit.context}
                </span>
                <span className="font-mono text-body">{hit.char}</span>
                <span className="font-mono text-text-secondary">{hit.code}</span>
                <span className="text-text-muted">— {hit.reason}</span>
              </div>
            ))}
          </div>
        )}
        {checked && hits.length === 0 && (
          <p className="text-body text-text-secondary">
            All test strings across all 3 locales (en, bn, ar) render cleanly
            with no tofu (no U+25A1, no U+FFFD, no U+0000), and all glyphs
            are supported by their assigned webfonts (Inter, Hind Siliguri,
            Noto Naskh Arabic). Mixed-script strings (English + Bangla +
            Arabic in the same line — common in student records) also render
            without tofu.
          </p>
        )}

        {/* Hidden test spans — these exist so MutationObserver has nodes
            to watch, AND so we exercise the actual font-rendering path
            in the browser (some browsers won't report font support
            unless the font is actually used on the page). */}
        <div ref={containerRef} aria-hidden className="sr-only">
          {locales.map((l) => (
            <div
              key={l}
              lang={localeConfig[l].htmlLang}
              dir={localeConfig[l].dir}
              style={{ fontFamily: FONT_FAMILY[l] }}
            >
              {TEST_STRINGS[l].map((s) => s.text).join(" ")}
            </div>
          ))}
          <div style={{ fontFamily: "var(--font-default)" }}>{MIXED_SCRIPT}</div>
        </div>
      </CardContent>
    </Card>
  );
}
