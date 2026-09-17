"use client";

/**
 * MadrashaOS — PDF Client Wrapper Components
 *
 * Session C5.1 — Branded PDF Templates (Task 5-a)
 *
 * @react-pdf/renderer's `PDFViewer` and `PDFDownloadLink` components are
 * browser-only — they use `Blob`, `URL.createObjectURL`, and an `<iframe>`
 * under the hood, none of which exist during SSR. Next.js 16 with
 * Turbopack would crash the build if these were imported into a Server
 * Component or rendered during SSR.
 *
 * This file exposes two safe client-side wrappers:
 *   - <PdfPreview templateId="..." />   — full-size iframe preview
 *   - <PdfDownloadButton templateId="..." /> — download link/button
 *
 * Both lazily load `@react-pdf/renderer` via `next/dynamic` with
 * `ssr: false`, so the heavy ~600 KB renderer bundle is only pulled
 * into the client chunk when the user actually opens a PDF route.
 *
 * Per Risk R13: every Document rendered by these wrappers is one of the
 * 6 branded templates from `src/lib/pdf/templates/` — they all hardcode
 * primary.500 + accent.DEFAULT + neutral.0 in their StyleSheets.
 */

import * as React from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Loader2, Download, FileText } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import {
  FeeReceipt, MarkSheet, ResultSheet,
  Certificate, LedgerStatement, OutstandingFeesReport,
  type FeeReceiptProps, type MarkSheetProps, type ResultSheetProps,
  type CertificateProps, type LedgerStatementProps, type OutstandingFeesReportProps,
} from "@/lib/pdf/templates";
import {
  getFeePayment, getBranchInfo, type TemplateId,
} from "@/lib/pdf/mockData";

/* ----------------------------------------------------------------
 * Lazy-load @react-pdf/renderer primitives (browser-only)
 * ----------------------------------------------------------------
 *
 * `next/dynamic` with `ssr: false` ensures the import happens at runtime
 * in the browser, NOT during SSR/build. This avoids the
 * "window is not defined" crash inside @react-pdf/renderer's internals.
 */
const PDFViewerLazy = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  { ssr: false, loading: () => <PdfLoadingState /> },
);

const PDFDownloadLinkLazy = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false },
);

function PdfLoadingState() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-neutral-50">
      <div className="flex flex-col items-center gap-2 text-text-muted">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-caption">Rendering PDF…</p>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------
 * Template factory — returns the right Document for a templateId
 * ---------------------------------------------------------------- */

type PdfPreviewProps = {
  templateId: TemplateId;
  locale?: Locale;
  className?: string;
  // Optional overrides for the templates that take IDs as input.
  studentId?: string;
  paymentId?: string;
  from?: string;
  to?: string;
  accountFilter?: string;
  accountName?: string;
  classId?: string;
  section?: string;
  limit?: number;
  asOfDate?: string;
  rankingEnabled?: boolean;
  position?: number;
  branchName?: string;
};

function renderDocument(props: PdfPreviewProps): React.ReactElement {
  switch (props.templateId) {
    case "fee-receipt": {
      const { payment, student } = getFeePayment(props.paymentId ?? "pay-1");
      const branchName = props.branchName ?? getBranchInfo(student.branchId).name;
      const feeReceiptProps: FeeReceiptProps = {
        payment, student, branchName, locale: props.locale,
        className: props.className,
        section: props.section,
      };
      return <FeeReceipt {...feeReceiptProps} />;
    }
    case "mark-sheet": {
      const markProps: MarkSheetProps = {
        studentId: props.studentId ?? "stu-001",
        locale: props.locale,
        rankingEnabled: props.rankingEnabled ?? true,
        position: props.position ?? 1,
      };
      return <MarkSheet {...markProps} />;
    }
    case "result-sheet": {
      const rsProps: ResultSheetProps = {
        classId: props.classId ?? "cls-5",
        section: props.section ?? "A",
        limit: props.limit ?? 10,
        locale: props.locale,
      };
      return <ResultSheet {...rsProps} />;
    }
    case "certificate": {
      const certProps: CertificateProps = {
        studentId: props.studentId ?? "stu-001",
        locale: props.locale,
      };
      return <Certificate {...certProps} />;
    }
    case "ledger-statement": {
      const lsProps: LedgerStatementProps = {
        from: props.from,
        to: props.to,
        accountFilter: props.accountFilter,
        accountName: props.accountName ?? "All Accounts",
        locale: props.locale,
      };
      return <LedgerStatement {...lsProps} />;
    }
    case "outstanding-fees": {
      const ofProps: OutstandingFeesReportProps = {
        asOfDate: props.asOfDate,
        locale: props.locale,
      };
      return <OutstandingFeesReport {...ofProps} />;
    }
    default: {
      const exhaustive: never = props.templateId;
      throw new Error(`Unknown PDF template: ${String(exhaustive)}`);
    }
  }
}

/* ----------------------------------------------------------------
 * <PdfPreview /> — full-size iframe preview (used by /dev/pdfs/[template])
 * ---------------------------------------------------------------- */

export function PdfPreview(props: PdfPreviewProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <PdfLoadingState />;
  }

  const doc = renderDocument(props);
  const title = `MadrashaOS · ${props.templateId}`;

  return (
    <div className="h-full w-full">
      <PDFViewerLazy
        // show="auto" lets the browser use its native PDF toolbar.
        show
        style={{ width: "100%", height: "100%", border: "none", minHeight: "70vh" }}
        title={title}
      >
        {doc}
      </PDFViewerLazy>
    </div>
  );
}

/* ----------------------------------------------------------------
 * <PdfDownloadButton /> — a shadcn Button that triggers a download
 * ---------------------------------------------------------------- */

type PdfDownloadButtonProps = PdfPreviewProps & {
  label?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  fileName?: string;
  icon?: "download" | "print" | "file";
  buttonClassName?: string;
};

export function PdfDownloadButton({
  label = "Download PDF",
  variant = "outline",
  size = "sm",
  fileName,
  icon = "download",
  buttonClassName,
  ...rest
}: PdfDownloadButtonProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const Icon = icon === "print" ? Loader2
    : icon === "file" ? FileText
      : Download;

  // Before mount (SSR + first paint), show a disabled placeholder Button
  // so the layout doesn't jump when the lazy PDFDownloadLink arrives.
  if (!mounted) {
    return (
      <Button variant={variant} size={size} className={buttonClassName} disabled>
        <Icon className="h-4 w-4" />
        {label}
      </Button>
    );
  }

  const doc = renderDocument(rest);
  const fallbackFileName = fileName ?? `madrashaos-${rest.templateId}.pdf`;

  return (
    <PDFDownloadLinkLazy
      document={doc}
      fileName={fallbackFileName}
      aria-label={label}
      style={{ textDecoration: "none", display: "inline-flex" }}
    >
      {({ loading }: { loading?: boolean }) => (
        <Button
          variant={variant}
          size={size}
          className={buttonClassName}
          disabled={loading}
          aria-label={label}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Icon className="h-4 w-4" />
          )}
          {label}
        </Button>
      )}
    </PDFDownloadLinkLazy>
  );
}

/* ----------------------------------------------------------------
 * <PdfThumbnailPreview /> — small inline preview for the /dev/pdfs grid
 * ----------------------------------------------------------------
 *
 * Renders the PDF inside a small bordered <iframe> so the showcase page
 * can show all 6 templates at once without 6 full-size downloads.
 */

export function PdfThumbnailPreview(props: PdfPreviewProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="aspect-[1/1.414] w-full rounded-md border border-border-default bg-neutral-50">
        <PdfLoadingState />
      </div>
    );
  }

  const doc = renderDocument(props);
  const title = `MadrashaOS · ${props.templateId}`;

  return (
    <div className="aspect-[1/1.414] w-full overflow-hidden rounded-md border border-border-default bg-neutral-0">
      <PDFViewerLazy
        show={false}
        style={{ width: "100%", height: "100%", border: "none" }}
        title={title}
      >
        {doc}
      </PDFViewerLazy>
    </div>
  );
}
