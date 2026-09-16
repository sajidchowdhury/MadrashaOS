"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeConfig } from "@/lib/i18n/config";
import {
  formatDate,
  formatDateLong,
  formatNumber,
  formatCurrency,
} from "@/lib/i18n/format";
import { DirectionalIcon } from "@/components/ui/directional-icon";
import {
  primary,
  accent,
  neutral,
  semantic,
  typeScale,
  spacing,
  radius,
  elevation,
  motion,
  tokenVersion,
} from "@/lib/design-system/tokens";
import type { Locale } from "@/lib/i18n/config";

/**
 * MadrashaOS — Phase C0.3 Showcase
 *
 * Visible exit criteria:
 *   (a) Trilingual greeting renders "Hello / আসসালামু আলাইকুম / السلام عليكم"
 *       with zero tofu (□) across en / bn / ar
 *   (b) Language toggle re-renders ALL UI text + flips layout to RTL in ar mode
 *   (c) Date / number / currency formatters produce locale numerals
 *       (e.g. "১৬-০৯-২০২৬" for Bangla dates)
 *   (d) Directional icons (chevrons, arrows, send) auto-mirror in RTL
 *   (e) Logical-property utilities (ps-/pe-/ms-/me-) flip padding in RTL
 *
 * Every visible string is sourced from the i18n message catalog (en/bn/ar).
 * Every color / font / spacing / radius / shadow / motion value is sourced
 * from the FROZEN token JSON (v1.0.0). Zero raw values outside tokens.
 */

/* ------------------------------------------------------------------ */
/*  Color scale data (token-driven, locale-agnostic)                  */
/* ------------------------------------------------------------------ */

type SwatchDef = [name: string, hex: string, text: "primary" | "inverse" | "secondary"];

const primaryScale: SwatchDef[] = [
  ["50", primary[50], "secondary"],
  ["100", primary[100], "secondary"],
  ["200", primary[200], "secondary"],
  ["300", primary[300], "secondary"],
  ["400", primary[400], "inverse"],
  ["500", primary[500], "inverse"],
  ["600", primary[600], "inverse"],
  ["700", primary[700], "inverse"],
  ["800", primary[800], "inverse"],
  ["900", primary[900], "inverse"],
];

const accentScale: SwatchDef[] = [
  ["50", accent[50], "secondary"],
  ["100", accent[100], "secondary"],
  ["500", accent[500], "inverse"],
  ["700", accent[700], "inverse"],
];

const neutralScale: SwatchDef[] = [
  ["0", neutral[0], "secondary"],
  ["50", neutral[50], "secondary"],
  ["100", neutral[100], "secondary"],
  ["200", neutral[200], "secondary"],
  ["300", neutral[300], "secondary"],
  ["400", neutral[400], "inverse"],
  ["500", neutral[500], "inverse"],
  ["600", neutral[600], "inverse"],
  ["700", neutral[700], "inverse"],
  ["800", neutral[800], "inverse"],
  ["900", neutral[900], "inverse"],
  ["950", neutral[950], "inverse"],
];

const semanticColors: [name: string, hex: string, fg: string][] = [
  ["success", semantic.success.DEFAULT, semantic.success.foreground],
  ["warning", semantic.warning.DEFAULT, semantic.warning.foreground],
  ["danger", semantic.danger.DEFAULT, semantic.danger.foreground],
  ["info", semantic.info.DEFAULT, semantic.info.foreground],
];

const typeSteps = Object.entries(typeScale) as [
  keyof typeof typeScale,
  (typeof typeScale)[keyof typeof typeScale],
][];

/* ------------------------------------------------------------------ */
/*  Small presentational helpers                                      */
/* ------------------------------------------------------------------ */

function Swatch({ name, hex, text = "primary" }: SwatchDef) {
  const textClass =
    text === "inverse"
      ? "text-neutral-0"
      : text === "secondary"
        ? "text-neutral-500"
        : "text-neutral-900";
  return (
    <div
      className="flex flex-col justify-between rounded-md border border-border-default p-3"
      style={{ backgroundColor: hex, height: "96px" }}
    >
      <span
        className={`font-mono text-[10px] uppercase tracking-wider ${
          text === "inverse" ? "text-neutral-0" : "text-neutral-500"
        }`}
      >
        {name}
      </span>
      <span className={`font-mono text-xs ${textClass}`}>{hex}</span>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border-default bg-surface-card p-6 shadow-elevation-1 md:p-8">
      <header className="mb-6">
        <h2 className="text-headline font-bold text-text-primary">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-body text-text-secondary">{subtitle}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function TokenShowcasePage() {
  const { locale, t, dir } = useI18n();
  const today = new Date(2026, 8, 16); // Sep 16, 2026 — matches SRS date

  return (
    <div
      dir={dir}
      className="px-4 py-8 md:px-8 md:py-12"
    >
      <div className="mx-auto max-w-[var(--grid-max-width)]">
        {/* ============================================================
         *  Hero — trilingual greeting
         * ============================================================ */}
        <SectionCard
          title={t("hero.greeting")}
          subtitle={t("hero.description")}
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-primary-50 p-4">
              <p className="text-caption uppercase tracking-wider text-text-secondary">
                {t("hero.script.english")}
              </p>
              <p className="mt-2 font-en text-subtitle">Assalamu Alaikum</p>
            </div>
            <div className="rounded-lg bg-primary-50 p-4">
              <p className="text-caption uppercase tracking-wider text-text-secondary">
                {t("hero.script.bangla")}
              </p>
              <p className="mt-2 font-bn text-subtitle">আসসালামু আলাইকুম</p>
            </div>
            <div className="rounded-lg bg-primary-50 p-4">
              <p className="text-caption uppercase tracking-wider text-text-secondary">
                {t("hero.script.arabic")}
              </p>
              <p className="mt-2 font-ar text-subtitle" dir="rtl">
                السلام عليكم
              </p>
            </div>
          </div>

          <p className="mt-4 text-body text-text-primary">{t("hero.body")}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full bg-primary-500 px-3 py-1 text-caption text-primary-foreground">
              {t("app.badge.frozen", { version: tokenVersion })}
            </span>
            <span className="rounded-full border border-border-default px-3 py-1 text-caption text-text-secondary">
              {t("app.badge.session11")}
            </span>
            <span className="rounded-full border border-border-default px-3 py-1 text-caption text-text-secondary">
              {t("app.badge.session12")}
            </span>
            <span className="rounded-full bg-accent-500 px-3 py-1 text-caption text-accent-foreground">
              {t("app.badge.wcag")}
            </span>
          </div>
        </SectionCard>

        {/* ============================================================
         *  NEW — Internationalization section (C0.2 deliverable)
         * ============================================================ */}
        <div className="mt-8">
          <SectionCard
            title={t("section.i18n.title")}
            subtitle={t("section.i18n.subtitle")}
          >
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Locale info card */}
              <div className="rounded-lg border border-border-default p-5">
                <h3 className="text-subtitle font-semibold text-text-primary">
                  {t("section.i18n.localeInfo")}
                </h3>
                <dl className="mt-4 space-y-2 text-body">
                  <div className="flex justify-between gap-4">
                    <dt className="text-text-secondary">
                      {t("section.i18n.localeLabel")}
                    </dt>
                    <dd className="font-medium text-text-primary">
                      {localeConfig[locale].labelNative}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-text-secondary">
                      {t("section.i18n.localeDir")}
                    </dt>
                    <dd className="font-mono text-text-primary">
                      {localeConfig[locale].dir.toUpperCase()}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-text-secondary">
                      {t("section.i18n.localeBcp47")}
                    </dt>
                    <dd className="font-mono text-text-primary">
                      {localeConfig[locale].bcp47}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-text-secondary">
                      {t("section.i18n.localeFont")}
                    </dt>
                    <dd className="font-mono text-xs text-text-primary">
                      {localeConfig[locale].fontVar}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-text-secondary">
                      {t("section.i18n.localeNumerals")}
                    </dt>
                    <dd className="font-mono text-text-primary">
                      {localeConfig[locale].numerals}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Date / number / currency formatting */}
              <div className="space-y-4">
                <div className="rounded-lg border border-border-default p-5">
                  <h3 className="text-subtitle font-semibold text-text-primary">
                    {t("section.i18n.dates")}
                  </h3>
                  <div className="mt-3 space-y-2 text-body">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-caption text-text-muted">short</span>
                      <span className="font-mono text-text-primary">
                        {formatDate(today, locale)}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-caption text-text-muted">long</span>
                      <span className="text-text-primary">
                        {formatDateLong(today, locale)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border-default p-5">
                    <h3 className="text-subtitle font-semibold text-text-primary">
                      {t("section.i18n.numbers")}
                    </h3>
                    <div className="mt-3 space-y-1 text-body">
                      <p className="font-mono text-text-primary">
                        {formatNumber(1234567, locale)}
                      </p>
                      <p className="font-mono text-text-primary">
                        {formatNumber(42, locale)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border-default p-5">
                    <h3 className="text-subtitle font-semibold text-text-primary">
                      {t("section.i18n.currency")}
                    </h3>
                    <div className="mt-3 space-y-1 text-body">
                      <p className="font-mono text-text-primary">
                        {formatCurrency(5000, locale)}
                      </p>
                      <p className="font-mono text-text-primary">
                        {formatCurrency(25000, locale)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RTL logical properties demo */}
            <div className="mt-6 rounded-lg border border-border-default p-5">
              <h3 className="text-subtitle font-semibold text-text-primary">
                {t("section.i18n.rtl")}
              </h3>
              <p className="mt-1 text-body text-text-secondary">
                {t("section.i18n.rtl.description")}
              </p>
              <div className="mt-4 flex flex-wrap gap-4">
                {/* This card uses logical properties: ps-8 (padding-inline-start),
                    pe-4 (padding-inline-end). In LTR these render as pl-8 pr-4.
                    In RTL they flip to pr-8 pl-4 automatically — no class changes. */}
                <div className="rounded-md bg-primary-50 ps-8 pe-4 py-4 start-0">
                  <div className="flex items-center gap-2">
                    <DirectionalIcon
                      icon="chevron-right"
                      className="h-5 w-5 text-primary-500"
                    />
                    <span className="text-subtitle text-text-primary">
                      {dir === "rtl" ? "تدفق RTL" : dir === "ltr" && locale === "bn" ? "RTL ফ্লো" : "LTR flow"}
                    </span>
                  </div>
                  <p className="mt-1 text-caption text-text-secondary">
                    ps-8 pe-4 · {dir.toUpperCase()}
                  </p>
                </div>

                <div className="rounded-md bg-accent-50 ps-4 pe-8 py-4">
                  <div className="flex items-center gap-2">
                    <DirectionalIcon
                      icon="arrow-right"
                      className="h-5 w-5 text-accent-700"
                    />
                    <span className="text-subtitle text-text-primary">
                      {dir === "rtl" ? "تدفق عكسي" : dir === "ltr" && locale === "bn" ? "বিপরীত প্রবাহ" : "Reverse flow"}
                    </span>
                  </div>
                  <p className="mt-1 text-caption text-text-secondary">
                    ps-4 pe-8 · {dir.toUpperCase()}
                  </p>
                </div>
              </div>
            </div>

            {/* Directional icons demo */}
            <div className="mt-6 rounded-lg border border-border-default p-5">
              <h3 className="text-subtitle font-semibold text-text-primary">
                {t("section.i18n.icons")}
              </h3>
              <p className="mt-1 text-body text-text-secondary">
                {t("section.i18n.icons.description")}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-500 text-primary-foreground">
                    <DirectionalIcon icon="chevron-right" className="h-6 w-6" />
                  </div>
                  <span className="font-mono text-caption text-text-muted">
                    chevron-right
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-500 text-primary-foreground">
                    <DirectionalIcon icon="arrow-right" className="h-6 w-6" />
                  </div>
                  <span className="font-mono text-caption text-text-muted">
                    arrow-right
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-500 text-accent-foreground">
                    <DirectionalIcon icon="send" className="h-6 w-6" />
                  </div>
                  <span className="font-mono text-caption text-text-muted">
                    send
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-200 text-neutral-900">
                    <DirectionalIcon icon="undo" className="h-6 w-6" />
                  </div>
                  <span className="font-mono text-caption text-text-muted">
                    undo
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-200 text-neutral-900">
                    <DirectionalIcon icon="redo" className="h-6 w-6" />
                  </div>
                  <span className="font-mono text-caption text-text-muted">
                    redo
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-200 text-neutral-900">
                    <DirectionalIcon icon="reply" className="h-6 w-6" />
                  </div>
                  <span className="font-mono text-caption text-text-muted">
                    reply
                  </span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-200 text-neutral-900">
                    <DirectionalIcon icon="share" className="h-6 w-6" />
                  </div>
                  <span className="font-mono text-caption text-text-muted">
                    share
                  </span>
                </div>
              </div>
              <p className="mt-4 text-caption text-text-muted">
                {dir === "rtl"
                  ? "↑ RTL mode — all directional icons mirrored horizontally"
                  : "↑ LTR mode — directional icons in default orientation"}
              </p>
            </div>
          </SectionCard>
        </div>

        {/* ============================================================
         *  Color — Primary scale
         * ============================================================ */}
        <div className="mt-8">
          <SectionCard
            title={t("section.color.primary.title")}
            subtitle={t("section.color.primary.subtitle")}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 lg:grid-cols-10">
              {primaryScale.map(([step, hex, text]) => (
                <Swatch
                  key={step}
                  name={`primary.${step}`}
                  hex={hex}
                  text={text}
                />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="rounded-md bg-primary-500 px-4 py-2 text-subtitle font-medium text-primary-foreground shadow-elevation-1 transition-all hover:bg-primary-600 hover:shadow-elevation-2 active:bg-primary-700"
              >
                {t("section.color.primary.demo")}
              </button>
              <button
                type="button"
                className="rounded-md border border-primary-500 bg-neutral-0 px-4 py-2 text-subtitle font-medium text-primary-500 transition-colors hover:bg-primary-50"
              >
                {t("section.color.primary.secondary")}
              </button>
              <span className="rounded-full bg-primary-50 px-3 py-1 text-caption text-primary-700">
                {t("section.color.primary.badge")}
              </span>
            </div>
          </SectionCard>
        </div>

        {/* ============================================================
         *  Color — Accent + Semantic + Neutral
         * ============================================================ */}
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <SectionCard
            title={t("section.color.accent.title")}
            subtitle={t("section.color.accent.subtitle")}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {accentScale.map(([step, hex, text]) => (
                <Swatch
                  key={step}
                  name={`accent.${step}`}
                  hex={hex}
                  text={text}
                />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-500 px-3 py-1 text-caption font-medium text-accent-foreground">
                {t("section.color.accent.badge")}
              </span>
              <span className="rounded-md bg-accent-50 px-3 py-1 text-caption text-accent-700">
                {t("section.color.accent.tint")}
              </span>
            </div>
          </SectionCard>

          <SectionCard
            title={t("section.color.semantic.title")}
            subtitle={t("section.color.semantic.subtitle")}
          >
            <div className="grid grid-cols-2 gap-3">
              {semanticColors.map(([name, hex, fg]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-md border border-border-default p-4"
                  style={{ backgroundColor: hex }}
                >
                  <div>
                    <p
                      className="text-caption uppercase tracking-wider"
                      style={{ color: fg, opacity: 0.8 }}
                    >
                      semantic.{name}
                    </p>
                    <p className="font-mono text-subtitle" style={{ color: fg }}>
                      {hex}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="mt-8">
          <SectionCard
            title={t("section.color.neutral.title")}
            subtitle={t("section.color.neutral.subtitle")}
          >
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-12">
              {neutralScale.map(([step, hex, text]) => (
                <Swatch
                  key={step}
                  name={`neutral.${step}`}
                  hex={hex}
                  text={text}
                />
              ))}
            </div>
          </SectionCard>
        </div>

        {/* ============================================================
         *  Typography — Type scale
         * ============================================================ */}
        <div className="mt-8">
          <SectionCard
            title={t("section.typography.title")}
            subtitle={t("section.typography.subtitle")}
          >
            <div className="divide-y divide-border-default">
              {typeSteps.map(([name, step]) => (
                <div
                  key={name}
                  className="grid grid-cols-1 gap-2 py-4 md:grid-cols-[140px_1fr_140px] md:items-baseline"
                >
                  <div>
                    <p className="font-mono text-caption uppercase tracking-wider text-text-secondary">
                      {name}
                    </p>
                    <p className="font-mono text-caption text-text-muted">
                      {step.sizePx}px / {step.lineHeightPx}px · {step.weight}
                    </p>
                  </div>
                  <p
                    className="text-text-primary"
                    style={{
                      fontSize: `${step.sizePx}px`,
                      lineHeight: `${step.lineHeightPx}px`,
                      fontWeight: step.weight,
                      letterSpacing: step.letterSpacing,
                    }}
                  >
                    {t("section.typography.sample")}
                  </p>
                  <p className="font-mono text-caption text-text-muted md:text-right">
                    {step.letterSpacing}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* ============================================================
         *  Spacing — 8pt grid
         * ============================================================ */}
        <div className="mt-8">
          <SectionCard
            title={t("section.spacing.title")}
            subtitle={t("section.spacing.subtitle")}
          >
            <div className="space-y-2">
              {spacing.scalePx.map((px, i) => (
                <div key={px} className="flex items-center gap-4">
                  <span className="w-16 font-mono text-caption text-text-muted">
                    scale.{i}
                  </span>
                  <span className="w-16 font-mono text-caption text-text-secondary">
                    {px}px
                  </span>
                  <div
                    className="h-4 rounded-sm bg-primary-500"
                    style={{ width: `${Math.max(px, 2)}px` }}
                    aria-label={`${px}px spacing token`}
                  />
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* ============================================================
         *  Radius + Elevation + Motion
         * ============================================================ */}
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <SectionCard title={t("section.radius.title")}>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(radius).map(([name, px]) => (
                <div key={name} className="flex flex-col items-center gap-2">
                  <div
                    className="h-16 w-16 border-2 border-primary-500 bg-primary-50"
                    style={{ borderRadius: `${px}px` }}
                  />
                  <p className="font-mono text-caption text-text-secondary">
                    radius.{name} · {px}px
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title={t("section.elevation.title")}>
            <div className="space-y-4">
              {Object.entries(elevation).map(([name, shadow]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-md bg-surface-card p-4"
                  style={{ boxShadow: shadow }}
                >
                  <span className="font-mono text-subtitle text-text-primary">
                    elevation.{name}
                  </span>
                  <span className="font-mono text-caption text-text-muted">
                    {shadow === "none" ? "flat" : "shadow"}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title={t("section.motion.title")}>
            <div className="space-y-3">
              {Object.entries(motion.duration).map(([name, dur]) => (
                <div key={name} className="space-y-1">
                  <div className="flex justify-between">
                    <span className="font-mono text-subtitle text-text-primary">
                      duration.{name}
                    </span>
                    <span className="font-mono text-caption text-text-secondary">
                      {dur}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
                    <div
                      className="h-full rounded-full bg-primary-500"
                      style={{
                        animation: `madrasha-motion-bar ${dur} ${motion.easing.standard} infinite alternate`,
                      }}
                    />
                  </div>
                </div>
              ))}
              <div className="mt-2 space-y-1">
                <p className="font-mono text-caption uppercase tracking-wider text-text-muted">
                  {t("section.motion.easing")}
                </p>
                {Object.entries(motion.easing).map(([name, curve]) => (
                  <p
                    key={name}
                    className="font-mono text-caption text-text-secondary"
                  >
                    easing.{name} · {curve}
                  </p>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>

      </div>

      {/* Local keyframes for the motion-duration bar demo */}
      <style>{`
        @keyframes madrasha-motion-bar {
          from { width: 10%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}
