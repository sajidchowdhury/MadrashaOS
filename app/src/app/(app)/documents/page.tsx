"use client";

/**
 * MadrashaOS — Documents Page (C4.3 — Communication · Documents)
 *
 * Document Management list per SRS §2.6.5 (Documents) with:
 *   - Document list (inline mock: 6 documents)
 *   - Table: Name, Type (PDF/Word/Image badge), Size, Category, Uploaded By,
 *            Uploaded At, Actions
 *   - "Upload Document" button (gated by IfPermission code="documents.upload")
 *     opens a dialog with:
 *       - File input (drag-drop area)
 *       - Category dropdown
 *       - VALIDATION: file > 60MB → inline error "File exceeds 60MB limit"
 *         and upload blocked
 *       - On success: "Signed URL expires in 10:00" countdown (mock timer)
 *   - "Download" button per row (gated by IfPermission code="documents.download")
 *   - FilterBar: type filter + category filter
 *
 *   Loading → no async fetch (inline mock) — instant render
 *   Empty   → EmptyState illustration="results"
 */

import * as React from "react";
import { FileArchive, Upload, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { FilterBar } from "@/components/ui/filter-bar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { IfPermission } from "@/components/auth/IfPermission";
import { PermissionDenied } from "@/components/states";
import { EmptyState } from "@/components/ui/empty-state";
import { useSessionStore } from "@/stores/sessionStore";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatDate, formatNumber } from "@/lib/i18n/format";
import { useToast } from "@/hooks/use-toast";
import {
  DocumentRowItem,
  UploadDocumentDialog,
  formatFileSize,
  type DocumentRowType,
  type DocumentType,
} from "@/components/communication";

// Inline mock documents (no new fixture file per task rules).
const MOCK_DOCUMENTS: DocumentRowType[] = [
  {
    id: "doc-1",
    name: "Mid-term Examination Result 2026.pdf",
    type: "pdf",
    sizeBytes: 245_000, // ~245 KB
    category: "Academic",
    uploadedBy: "Administrator Karim",
    uploadedAt: "2026-09-16",
  },
  {
    id: "doc-2",
    name: "Fee Collection Report — September.xlsx",
    type: "excel",
    sizeBytes: 1_180_000, // ~1.18 MB
    category: "Finance",
    uploadedBy: "Accountant Rahman",
    uploadedAt: "2026-09-15",
  },
  {
    id: "doc-3",
    name: "Madrasha Annual Calendar.docx",
    type: "word",
    sizeBytes: 410_000,
    category: "Notice",
    uploadedBy: "Principal Ahmad",
    uploadedAt: "2026-09-14",
  },
  {
    id: "doc-4",
    name: "Campus Aerial Photo.jpg",
    type: "image",
    sizeBytes: 3_245_000, // ~3.24 MB
    category: "Other",
    uploadedBy: "Administrator Karim",
    uploadedAt: "2026-09-13",
  },
  {
    id: "doc-5",
    name: "Zakat Fund Statement — Q3.pdf",
    type: "pdf",
    sizeBytes: 895_000,
    category: "Finance",
    uploadedBy: "Accountant Rahman",
    uploadedAt: "2026-09-12",
  },
  {
    id: "doc-6",
    name: "Staff Onboarding Handbook.pdf",
    type: "pdf",
    sizeBytes: 5_640_000, // ~5.64 MB
    category: "HR",
    uploadedBy: "Administrator Karim",
    uploadedAt: "2026-09-10",
  },
];

type TypeFilter = "all" | DocumentType;

const TYPE_FILTER_LABELS: { id: TypeFilter; label: string }[] = [
  { id: "all", label: "All types" },
  { id: "pdf", label: "PDF" },
  { id: "word", label: "Word" },
  { id: "excel", label: "Excel" },
  { id: "image", label: "Image" },
  { id: "other", label: "Other" },
];

const CATEGORIES = ["All categories", "Notice", "Academic", "Finance", "HR", "Inventory", "Reports", "Other"];

export default function DocumentsPage() {
  const { locale } = useI18n();
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const canView = hasPermission("documents.download");
  const { toast } = useToast();

  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("All categories");
  const [search, setSearch] = React.useState("");
  const [uploadOpen, setUploadOpen] = React.useState(false);

  const filtered = React.useMemo(() => {
    return MOCK_DOCUMENTS.filter((d) => {
      if (typeFilter !== "all" && d.type !== typeFilter) return false;
      if (categoryFilter !== "All categories" && d.category !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!d.name.toLowerCase().includes(q) && !d.uploadedBy.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [typeFilter, categoryFilter, search]);

  if (!canView) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <PermissionDenied resource="Documents" />
        </div>
      </div>
    );
  }

  const activeFilters =
    (typeFilter !== "all" ? 1 : 0) +
    (categoryFilter !== "All categories" ? 1 : 0) +
    (search.trim() ? 1 : 0);

  const clearFilters = () => {
    setTypeFilter("all");
    setCategoryFilter("All categories");
    setSearch("");
  };

  const totalSize = MOCK_DOCUMENTS.reduce((s, d) => s + d.sizeBytes, 0);

  const handleDownload = (doc: DocumentRowType) => {
    toast({
      title: "Download started",
      description: `${doc.name} · ${formatFileSize(doc.sizeBytes, locale)}`,
    });
  };

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-display font-bold text-text-primary">Documents</h1>
            <p className="mt-1 text-body text-text-secondary">
              Manage shared documents. Uploads are validated against a 60&nbsp;MB limit; signed URLs expire in 10 minutes.
            </p>
          </div>
          <IfPermission code="documents.upload">
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4" />
              Upload Document
            </Button>
          </IfPermission>
        </header>

        {/* KPI strip */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border-default bg-surface-card p-4">
            <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
              Total Documents
            </p>
            <p className="mt-1 font-mono text-display font-bold text-primary-500">
              {formatNumber(MOCK_DOCUMENTS.length, locale)}
            </p>
          </div>
          <div className="rounded-lg border border-border-default bg-surface-card p-4">
            <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
              Total Size
            </p>
            <p className="mt-1 font-mono text-display font-bold text-accent-500">
              {formatFileSize(totalSize, locale)}
            </p>
          </div>
          <div className="rounded-lg border border-border-default bg-surface-card p-4">
            <p className="text-caption font-medium uppercase tracking-wider text-text-muted">
              Categories
            </p>
            <p className="mt-1 font-mono text-display font-bold text-text-primary">
              {formatNumber(new Set(MOCK_DOCUMENTS.map((d) => d.category)).size, locale)}
            </p>
          </div>
        </div>

        {/* FilterBar */}
        <FilterBar activeCount={activeFilters} onClear={activeFilters > 0 ? clearFilters : undefined}>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
            <SelectTrigger size="sm" className="w-36" aria-label="Filter by type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_FILTER_LABELS.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger size="sm" className="w-44" aria-label="Filter by category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              placeholder="Search by name or uploader…"
              className="h-8 ps-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search documents"
            />
          </div>
        </FilterBar>

        {/* Body */}
        {filtered.length === 0 ? (
          <EmptyState
            illustration="results"
            title="No documents found"
            description={search || typeFilter !== "all" || categoryFilter !== "All categories"
              ? "Adjust your filters to see more."
              : "Upload your first document to share it with the team."}
            action={
              <IfPermission code="documents.upload">
                <Button onClick={() => setUploadOpen(true)}>
                  <Upload className="h-4 w-4" />
                  Upload Document
                </Button>
              </IfPermission>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border-default bg-surface-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50">
                    <TableHead className="px-4">Name</TableHead>
                    <TableHead className="px-4">Type</TableHead>
                    <TableHead className="hidden px-4 sm:table-cell">Size</TableHead>
                    <TableHead className="px-4">Category</TableHead>
                    <TableHead className="px-4">Uploaded By</TableHead>
                    <TableHead className="px-4">Uploaded At</TableHead>
                    <TableHead className="px-4 text-end">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((d) => (
                    <DocumentRowItem
                      key={d.id}
                      doc={d}
                      locale={locale}
                      onDownload={handleDownload}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {filtered.length > 0 && (
          <p className="text-caption text-text-muted">
            Showing {formatNumber(filtered.length, locale)} of {formatNumber(MOCK_DOCUMENTS.length, locale)} documents ·
            Total filtered size: {formatFileSize(filtered.reduce((s, d) => s + d.sizeBytes, 0), locale)}.
          </p>
        )}

        {/* Footer note about upload policy */}
        <div className="flex items-start gap-2 rounded-lg border border-border-default bg-surface-card p-3">
          <FileArchive className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
          <p className="text-caption text-text-secondary">
            Uploads are validated against a 60&nbsp;MB limit. Signed URLs for downloads
            expire after 10 minutes per the security policy (SRS §2.6.5). Last refreshed: {formatDate(new Date(), locale)}.
          </p>
        </div>
      </div>

      {/* Upload dialog */}
      <UploadDocumentDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}
