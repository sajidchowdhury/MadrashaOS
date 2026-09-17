"use client";

/**
 * MadrashaOS — DocumentRow (C4.3 — Communication · Documents)
 *
 * A single row in the Documents table.
 * Shows: Name, Type (PDF/Word/Image badge), Size, Category, Uploaded By,
 * Uploaded At, Actions (Download).
 *
 * The Download button is gated by IfPermission code="documents.download" at
 * the row level (so viewers without download permission see no action).
 */

import * as React from "react";
import { Download, FileText, FileImage, FileType, FileSpreadsheet } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { formatDate, formatNumber } from "@/lib/i18n/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { IfPermission } from "@/components/auth/IfPermission";

export type DocumentType = "pdf" | "word" | "excel" | "image" | "other";

export type DocumentRowType = {
  id: string;
  name: string;
  type: DocumentType;
  sizeBytes: number;
  category: string;
  uploadedBy: string;
  uploadedAt: string; // ISO date
};

const TYPE_META: Record<
  DocumentType,
  { label: string; tone: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pdf: {
    label: "PDF",
    tone: "bg-danger-50 text-semantic-danger border-semantic-danger/30",
    icon: FileText,
  },
  word: {
    label: "Word",
    tone: "bg-primary-50 text-primary-700 border-primary-500/30",
    icon: FileText,
  },
  excel: {
    label: "Excel",
    tone: "bg-success-50 text-semantic-success border-semantic-success/30",
    icon: FileSpreadsheet,
  },
  image: {
    label: "Image",
    tone: "bg-accent-50 text-accent-700 border-accent-500/30",
    icon: FileImage,
  },
  other: {
    label: "File",
    tone: "bg-neutral-100 text-text-primary border-border-strong",
    icon: FileType,
  },
};

/**
 * Format a byte size into KB/MB with locale-aware numerals.
 * < 1024 bytes → "512 B"; < 1MB → "245 KB"; else "2.4 MB".
 */
export function formatFileSize(bytes: number, locale: Locale): string {
  if (bytes < 1024) {
    return `${formatNumber(bytes, locale)} B`;
  }
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    const rounded = kb >= 100 ? Math.round(kb) : Math.round(kb * 10) / 10;
    return `${formatNumber(rounded, locale)} KB`;
  }
  const mb = bytes / (1024 * 1024);
  const rounded = mb >= 100 ? Math.round(mb) : Math.round(mb * 10) / 10;
  return `${formatNumber(rounded, locale)} MB`;
}

export function DocumentRowItem({
  doc,
  locale,
  onDownload,
}: {
  doc: DocumentRowType;
  locale: Locale;
  onDownload: (doc: DocumentRowType) => void;
}) {
  const meta = TYPE_META[doc.type];
  const TypeIcon = meta.icon;
  const dateLabel = formatDate(new Date(doc.uploadedAt), locale);
  const sizeLabel = formatFileSize(doc.sizeBytes, locale);

  return (
    <TableRow data-slot="document-row">
      <TableCell className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-neutral-100">
            <TypeIcon className="h-4 w-4 text-text-secondary" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-body font-medium text-text-primary">{doc.name}</p>
            <p className="text-caption text-text-muted sm:hidden">{sizeLabel}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="px-4 py-3">
        <Badge variant="outline" className={meta.tone}>
          {meta.label}
        </Badge>
      </TableCell>
      <TableCell className="hidden px-4 py-3 font-mono text-caption text-text-secondary sm:table-cell">
        {sizeLabel}
      </TableCell>
      <TableCell className="px-4 py-3 text-body text-text-secondary">
        {doc.category}
      </TableCell>
      <TableCell className="px-4 py-3 text-body text-text-secondary">
        {doc.uploadedBy}
      </TableCell>
      <TableCell className="px-4 py-3 text-caption text-text-muted">
        {dateLabel}
      </TableCell>
      <TableCell className="px-4 py-3 text-end">
        <IfPermission
          code="documents.download"
          fallback={
            <span className="text-caption text-text-muted">View only</span>
          }
        >
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDownload(doc)}
            aria-label={`Download ${doc.name}`}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Download</span>
          </Button>
        </IfPermission>
      </TableCell>
    </TableRow>
  );
}
