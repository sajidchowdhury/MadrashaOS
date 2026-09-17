"use client";

/**
 * MadrashaOS — /dev/pdfs (C5.1 — Branded PDF Templates showcase)
 *
 * A grid of 6 cards, one per branded PDF template. Each card shows:
 *   - Template name + description (from TEMPLATE_REGISTRY)
 *   - A small thumbnail preview rendered via <PdfThumbnailPreview />
 *     (PDFViewer with `show={false}` so the toolbar is hidden)
 *   - "Preview PDF" button → /dev/pdfs/[template]
 *   - "Download PDF" button → triggers PDFDownloadLink
 *
 * Per Risk R13 (lock-in): every Document rendered here uses
 * primary.500 + accent.DEFAULT + neutral.0. The showcase itself is
 * unbranded chrome around the branded PDFs.
 */

import * as React from "react";
import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { TEMPLATE_REGISTRY, type TemplateId } from "@/lib/pdf/templates";
import {
  PdfThumbnailPreview, PdfDownloadButton,
} from "@/components/pdf/PdfPreview";

export default function DevPdfsPage() {
  const { locale } = useI18n();

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-display font-bold text-text-primary">
            /dev/pdfs — Branded PDF Templates
          </h1>
          <p className="mt-1 text-body text-text-secondary">
            Six branded PDF templates per SRS §2.4.x and §2.5.x. Every PDF
            uses primary.500 (#0E5C5C) + accent (#C9A961) + neutral.0
            (#FFFFFF) per Risk R13 lock-in.
          </p>
        </header>

        {/* Risk callouts */}
        <div className="grid gap-3 sm:grid-cols-3">
          <RiskChip
            label="Risk R13"
            value="Brand lock-in"
            detail="All PDFs use the FROZEN palette."
            tone="primary"
          />
          <RiskChip
            label="Risk R14"
            value="Arabic + Bangla glyphs"
            detail="NotoNaskhArabic + HindSiliguri registered."
            tone="accent"
          />
          <RiskChip
            label="Risk R7"
            value="Conditional position"
            detail="MarkSheet omits rank if disabled."
            tone="warning"
          />
        </div>

        {/* Template grid */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {TEMPLATE_REGISTRY.map((meta) => (
            <TemplateCard
              key={meta.id}
              meta={meta}
              locale={locale}
            />
          ))}
        </div>

        {/* Footer notes */}
        <section className="rounded-xl border border-border-default bg-surface-card p-6 shadow-elevation-1">
          <h2 className="text-headline font-bold text-text-primary">Implementation notes</h2>
          <ul className="mt-3 space-y-2 text-body text-text-secondary">
            <li>
              <strong className="text-text-primary">Brand hex exception:</strong> PDF
              StyleSheets cannot read CSS variables at render time, so the
              FROZEN token hex values are hardcoded in
              <code className="ms-1 rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-caption text-primary-700">src/lib/pdf/brand.ts</code>
              (the one documented exception to the no-raw-hex rule).
            </li>
            <li>
              <strong className="text-text-primary">Font loading:</strong> Bangla +
              Arabic fonts are loaded lazily from the @fontsource CDN (jsdelivr)
              on first PDF render. If the CDN is offline, PDFs fall back to
              Helvetica which renders English correctly but produces tofu (□)
              for non-Latin glyphs — Risk R14 partial mitigation.
            </li>
            <li>
              <strong className="text-text-primary">Trigger buttons:</strong> Look
              for &quot;Print Receipt&quot; on <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-caption text-primary-700">/fees</code>,
              &quot;Download Statement&quot; on <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-caption text-primary-700">/accounting</code>,
              and &quot;Download Mark Sheet&quot; on each student profile.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------
 * TemplateCard — thumbnail + actions per template
 * ---------------------------------------------------------------- */

function TemplateCard({
  meta, locale,
}: {
  meta: (typeof TEMPLATE_REGISTRY)[number];
  locale: ReturnType<typeof useI18n>["locale"];
}) {
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-border-default bg-surface-card p-5 shadow-elevation-1">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-subtitle font-semibold text-text-primary">
            {meta.title}
          </h3>
          <p className="mt-1 text-caption font-mono text-text-muted">
            {meta.id}
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-500 text-neutral-0">
          <FileText className="h-4 w-4" />
        </div>
      </div>

      {/* Description */}
      <p className="text-caption text-text-secondary">
        {meta.description}
      </p>

      {/* Thumbnail */}
      <div className="overflow-hidden rounded-md border border-border-default shadow-elevation-2">
        <PdfThumbnailPreview templateId={meta.id as TemplateId} locale={locale} />
      </div>

      {/* Fields list */}
      <div className="flex flex-wrap gap-1.5">
        {meta.fields.map((f) => (
          <span
            key={f}
            className="rounded-full bg-neutral-50 px-2 py-0.5 text-caption font-mono text-text-secondary"
          >
            {f}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-auto flex items-center gap-2 pt-2">
        <Button asChild size="sm" variant="default">
          <Link href={`/dev/pdfs/${meta.id}`}>
            <ArrowRight className="h-4 w-4" />
            Preview PDF
          </Link>
        </Button>
        <PdfDownloadButton
          templateId={meta.id as TemplateId}
          locale={locale}
          label="Download"
          variant="outline"
          size="sm"
          icon="download"
        />
      </div>
    </article>
  );
}

/* ----------------------------------------------------------------
 * RiskChip — small colored info chip for the risk-callout grid
 * ---------------------------------------------------------------- */

function RiskChip({
  label, value, detail, tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "primary" | "accent" | "warning";
}) {
  const toneClasses = {
    primary: "border-primary-200 bg-primary-50",
    accent: "border-accent-100 bg-accent-50",
    warning: "border-semantic-warning/40 bg-warning-50",
  }[tone];

  return (
    <div className={`rounded-lg border p-4 ${toneClasses}`}>
      <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
        {label}
      </p>
      <p className="mt-1 text-subtitle font-bold text-text-primary">{value}</p>
      <p className="mt-0.5 text-caption text-text-secondary">{detail}</p>
    </div>
  );
}
