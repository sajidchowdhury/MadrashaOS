"use client";

/**
 * MadrashaOS — /dev/pdfs/[template] (C5.1 — single PDF preview)
 *
 * Renders one branded PDF template full-size via @react-pdf/renderer's
 * <PDFViewer> so the user can review the layout, print, or download.
 *
 * The template name is read from the URL via useParams and matched
 * against the TEMPLATE_REGISTRY. Invalid template IDs render a
 * fallback card with a link back to /dev/pdfs.
 */

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { TEMPLATE_REGISTRY, type TemplateId } from "@/lib/pdf/templates";
import {
  PdfPreview, PdfDownloadButton,
} from "@/components/pdf/PdfPreview";

const VALID_IDS = new Set<TemplateId>([
  "fee-receipt", "mark-sheet", "result-sheet",
  "certificate", "ledger-statement", "outstanding-fees",
]);

export default function DevPdfTemplatePage() {
  const params = useParams<{ template: string }>();
  const { locale } = useI18n();
  const templateParam = params?.template ?? "";

  const isValid = VALID_IDS.has(templateParam as TemplateId);
  const templateId = (isValid ? templateParam : "fee-receipt") as TemplateId;
  const meta = TEMPLATE_REGISTRY.find((m) => m.id === templateId);

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-4">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Button asChild variant="ghost" size="sm" className="mb-2 h-auto p-0 text-text-secondary hover:text-text-primary">
              <Link href="/dev/pdfs">
                <ArrowLeft className="h-4 w-4" />
                Back to PDF showcase
              </Link>
            </Button>
            <h1 className="text-display font-bold text-text-primary">
              {meta?.title ?? "Unknown template"}
            </h1>
            <p className="mt-1 text-body text-text-secondary">
              {meta?.description ?? `Template ID: ${templateParam}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PdfDownloadButton
              templateId={templateId}
              locale={locale}
              label="Download PDF"
              variant="default"
              size="default"
              icon="download"
            />
            <Button
              variant="outline"
              size="default"
              onClick={() => window.print()}
            >
              <ExternalLink className="h-4 w-4" />
              Print
            </Button>
          </div>
        </header>

        {/* Invalid template warning */}
        {!isValid && (
          <div className="rounded-lg border border-semantic-warning/40 bg-warning-50 p-4 text-body text-text-primary">
            <p className="font-semibold text-semantic-warning">Unknown template</p>
            <p className="mt-1 text-caption text-text-secondary">
              No PDF template matches <code className="font-mono">{templateParam}</code>.
              Falling back to the fee-receipt template below. Valid IDs are:
              {" "}
              <code className="font-mono">fee-receipt</code>,
              {" "}
              <code className="font-mono">mark-sheet</code>,
              {" "}
              <code className="font-mono">result-sheet</code>,
              {" "}
              <code className="font-mono">certificate</code>,
              {" "}
              <code className="font-mono">ledger-statement</code>,
              {" "}
              <code className="font-mono">outstanding-fees</code>.
            </p>
          </div>
        )}

        {/* PDF preview */}
        <div className="overflow-hidden rounded-xl border border-border-default bg-surface-card shadow-elevation-2">
          <div className="border-b border-border-default bg-neutral-50 px-4 py-2">
            <p className="text-caption font-mono text-text-muted">
              {templateId}.pdf · rendered inline via @react-pdf/renderer
            </p>
          </div>
          <div className="h-[80vh] min-h-[600px] w-full bg-neutral-100">
            <PdfPreview templateId={templateId} locale={locale} />
          </div>
        </div>
      </div>
    </div>
  );
}
