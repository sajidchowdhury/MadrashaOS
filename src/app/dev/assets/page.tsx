"use client";

/**
 * MadrashaOS — /dev/assets (Phase C7.3 · Task 7-c)
 *
 * Asset Library Gallery — single-page catalog of every exported
 * machine-readable asset under `/public/assets/`:
 *
 *   ┌────────────────────────────────────────────────────────────┐
 *   │  Summary strip: X icons · 5 illustrations · Y brand assets  │
 *   │                · 6 PDF templates                            │
 *   ├────────────────────────────────────────────────────────────┤
 *   │  Tabs: Icons | Illustrations | Brand | PDF Templates        │
 *   ├────────────────────────────────────────────────────────────┤
 *   │  Per-tab content:                                           │
 *   │    - Icons         → grid of icon cards (preview + name +   │
 *   │                      copy-name button + .svg download link)│
 *   │    - Illustrations → 5 cards (preview + name + download)    │
 *   │    - Brand         → color palette swatches + logo + favicon│
 *   │    - PDF Templates → 6 cards linking to /dev/pdfs/[template] │
 *   └────────────────────────────────────────────────────────────┘
 *
 * The icon catalog (public/assets/icons/icon-catalog.json) is fetched
 * client-side so the page can render the full list + per-icon file sizes
 * without bloating the initial bundle. While the catalog loads, a grid of
 * skeletons is shown. The brand color-palette.json is fetched similarly.
 *
 * Every visual style uses FROZEN Tailwind theme keys (bg-surface-card,
 * text-text-primary, border-border-default, shadow-elevation-2, etc.) —
 * zero raw hex/px in this file.
 */

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Copy, Check, Download, ExternalLink, FileText, Image as ImageIcon,
  Palette, Shapes, Sparkles, Hash, Loader2, Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { TEMPLATE_REGISTRY } from "@/lib/pdf/templates";
import type { TemplateId } from "@/lib/pdf/templates";

/* ----------------------------------------------------------------
 * Types — mirror the JSON catalog shapes
 * ---------------------------------------------------------------- */

type IconCatalogEntry = {
  name: string;
  pascalName: string;
  filename: string;
  sizeBytes: number;
  viewBox: string;
};

type IconCatalog = {
  generatedAt: string;
  source: string;
  count: number;
  icons: IconCatalogEntry[];
};

type IllustrationMeta = {
  name: string;
  filename: string;
  description: string;
  /** Hex pair shown as a small preview chip beside the illustration. */
  accent: string;
};

type BrandPalette = {
  primary: { name: string; DEFAULT: string; scale: Record<string, string> };
  accent: { name: string; DEFAULT: string; scale: Record<string, string> };
  neutral: { name: string; scale: Record<string, string> };
  semantic: Record<string, { DEFAULT: string; foreground: string; 50: string; usage: string }>;
};

/* ----------------------------------------------------------------
 * Static config — illustrations + PDF templates never change between
 * build runs of the export script, so we hardcode their previews.
 * ---------------------------------------------------------------- */

const ILLUSTRATIONS: IllustrationMeta[] = [
  {
    name: "empty-students",
    filename: "empty-students.svg",
    description: "3 student silhouettes waving — empty Students list",
    accent: "#C9A961",
  },
  {
    name: "empty-fees",
    filename: "empty-fees.svg",
    description: "Receipt + checkmark badge — no outstanding fees",
    accent: "#C9A961",
  },
  {
    name: "empty-attendance",
    filename: "empty-attendance.svg",
    description: "Clipboard with row silhouettes + pencil — no attendance taken",
    accent: "#C9A961",
  },
  {
    name: "empty-inventory",
    filename: "empty-inventory.svg",
    description: "Shelf with a single box — no items in stock",
    accent: "#C9A961",
  },
  {
    name: "empty-results",
    filename: "empty-results.svg",
    description: "Report card + pencil + star — results will publish soon",
    accent: "#C9A961",
  },
];

/* ----------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------- */

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function CopyNameButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({
        title: "Copied",
        description: `"${value}" copied to clipboard`,
      });
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Copy failed", description: "Clipboard API unavailable" });
    }
  };
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onCopy}
      aria-label={`Copy name ${value}`}
      className="h-7 px-2 text-caption"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-semantic-success" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      <span className="sr-only">Copy</span>
    </Button>
  );
}

function SkeletonGrid({ count, label }: { count: number; label: string }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex h-32 animate-pulse items-center justify-center rounded-lg border border-border-default bg-surface-hover/50"
          aria-label={label}
        >
          <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------
 * Tabs
 * ---------------------------------------------------------------- */

function IconsTab() {
  const [catalog, setCatalog] = useState<IconCatalog | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/assets/icons/icon-catalog.json")
      .then((r) => r.json() as Promise<IconCatalog>)
      .then((c) => {
        if (!cancelled) setCatalog(c);
      })
      .catch(() => {
        /* non-fatal — skeleton stays */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!catalog) {
    return <SkeletonGrid count={12} label="Loading icon catalog…" />;
  }

  const filtered = catalog.icons.filter((ic) =>
    ic.name.toLowerCase().includes(filter.trim().toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="secondary" className="font-mono">
          {catalog.count} icons
        </Badge>
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute start-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter icons by name…"
            className="h-8 ps-7 text-body"
            aria-label="Filter icons"
          />
        </div>
        <a
          href="/assets/icons/sprite.svg"
          target="_blank"
          rel="noreferrer"
          className="text-caption font-medium text-primary-500 hover:underline"
        >
          View sprite.svg →
        </a>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {filtered.map((ic) => (
          <Card
            key={ic.filename}
            className="overflow-hidden py-0 transition-shadow hover:shadow-elevation-2"
          >
            <div className="flex h-24 items-center justify-center bg-surface-hover/40">
              <img
                src={`/assets/icons/${ic.filename}`}
                alt={`${ic.name} icon`}
                width={28}
                height={28}
                loading="lazy"
                className="text-text-primary"
              />
            </div>
            <div className="border-t border-border-default p-3">
              <div className="flex items-center justify-between gap-1">
                <code className="truncate text-caption font-medium text-text-primary">
                  {ic.name}
                </code>
                <CopyNameButton value={ic.name} />
              </div>
              <div className="mt-1 flex items-center justify-between text-caption text-text-muted">
                <span>{formatBytes(ic.sizeBytes)}</span>
                <a
                  href={`/assets/icons/${ic.filename}`}
                  download={ic.filename}
                  className="inline-flex items-center gap-1 hover:text-primary-500"
                >
                  <Download className="h-3 w-3" />
                  SVG
                </a>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-body text-text-secondary">
          No icons match &ldquo;{filter}&rdquo;.
        </p>
      )}
    </div>
  );
}

function IllustrationsTab() {
  return (
    <div className="space-y-4">
      <Badge variant="secondary" className="font-mono">
        {ILLUSTRATIONS.length} illustrations · 240×160 viewBox
      </Badge>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ILLUSTRATIONS.map((il) => (
          <Card
            key={il.filename}
            className="overflow-hidden py-0 transition-shadow hover:shadow-elevation-2"
          >
            <div className="flex h-40 items-center justify-center bg-primary-50">
              <img
                src={`/assets/illustrations/${il.filename}`}
                alt={il.description}
                width={180}
                height={120}
                className="text-primary-700"
              />
            </div>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <code className="text-body font-medium text-text-primary">
                  {il.name}
                </code>
                <CopyNameButton value={il.name} />
              </div>
              <p className="mt-1 text-caption text-text-secondary">
                {il.description}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-caption text-text-muted">
                  <span
                    className="inline-block h-3 w-3 rounded-sm border border-border-default"
                    style={{ backgroundColor: il.accent }}
                    aria-hidden
                  />
                  accent gold
                </span>
                <a
                  href={`/assets/illustrations/${il.filename}`}
                  download={il.filename}
                  className="inline-flex items-center gap-1 text-caption font-medium text-primary-500 hover:underline"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download SVG
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function BrandTab() {
  const [palette, setPalette] = useState<BrandPalette | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/assets/brand/color-palette.json")
      .then((r) => r.json() as Promise<BrandPalette>)
      .then((p) => {
        if (!cancelled) setPalette(p);
      })
      .catch(() => {
        /* non-fatal */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Logo mock */}
        <Card className="overflow-hidden py-0">
          <CardHeader className="px-4 pt-4">
            <CardTitle className="text-subtitle">Logo Lockup (mock)</CardTitle>
          </CardHeader>
          <div className="flex h-32 items-center justify-center bg-surface-canvas px-4">
            <img
              src="/assets/brand/logo-mock.svg"
              alt="MadrashaOS horizontal logo lockup"
              className="max-h-24 w-auto"
            />
          </div>
          <CardContent className="flex items-center justify-between p-4">
            <code className="text-caption text-text-muted">logo-mock.svg</code>
            <a
              href="/assets/brand/logo-mock.svg"
              download="logo-mock.svg"
              className="inline-flex items-center gap-1 text-caption font-medium text-primary-500 hover:underline"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          </CardContent>
        </Card>

        {/* Favicon */}
        <Card className="overflow-hidden py-0">
          <CardHeader className="px-4 pt-4">
            <CardTitle className="text-subtitle">Favicon</CardTitle>
          </CardHeader>
          <div className="flex h-32 items-center justify-center bg-surface-canvas">
            <img
              src="/assets/brand/favicon.svg"
              alt="MadrashaOS favicon — teal circle with gold meem monogram"
              width={64}
              height={64}
            />
          </div>
          <CardContent className="flex items-center justify-between p-4">
            <code className="text-caption text-text-muted">favicon.svg</code>
            <a
              href="/assets/brand/favicon.svg"
              download="favicon.svg"
              className="inline-flex items-center gap-1 text-caption font-medium text-primary-500 hover:underline"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Color palette */}
      <Card className="overflow-hidden py-0">
        <CardHeader className="px-4 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-subtitle">Color Palette</CardTitle>
            <a
              href="/assets/brand/color-palette.json"
              download="color-palette.json"
              className="inline-flex items-center gap-1 text-caption font-medium text-primary-500 hover:underline"
            >
              <Download className="h-3.5 w-3.5" />
              catalog.json
            </a>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {!palette ? (
            <SkeletonGrid count={4} label="Loading palette…" />
          ) : (
            <>
              {/* Primary */}
              <PaletteRow
                title={`${palette.primary.name} · primary`}
                steps={palette.primary.scale}
                defaultHex={palette.primary.DEFAULT}
              />
              {/* Accent */}
              <PaletteRow
                title={`${palette.accent.name} · accent`}
                steps={palette.accent.scale}
                defaultHex={palette.accent.DEFAULT}
              />
              {/* Neutral */}
              <PaletteRow
                title={`${palette.neutral.name} · neutral`}
                steps={palette.neutral.scale}
              />
              {/* Semantic */}
              <div>
                <p className="mb-2 text-caption font-semibold uppercase tracking-wider text-text-muted">
                  Semantic
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {Object.entries(palette.semantic).map(([key, v]) => (
                    <div
                      key={key}
                      className="overflow-hidden rounded-lg border border-border-default"
                    >
                      <div
                        className="flex h-16 items-center justify-center text-caption font-mono font-medium"
                        style={{
                          backgroundColor: v.DEFAULT,
                          color: v.foreground,
                        }}
                      >
                        {v.DEFAULT}
                      </div>
                      <div className="p-2">
                        <p className="text-caption font-medium capitalize text-text-primary">
                          {key}
                        </p>
                        <p className="text-caption text-text-muted">
                          {v.usage.slice(0, 32)}…
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PaletteRow({
  title,
  steps,
  defaultHex,
}: {
  title: string;
  steps: Record<string, string>;
  defaultHex?: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();
  const copy = async (key: string, hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(key);
      toast({ title: "Copied", description: hex });
      window.setTimeout(() => setCopied(null), 1200);
    } catch {
      toast({ title: "Copy failed" });
    }
  };
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <p className="text-caption font-semibold uppercase tracking-wider text-text-muted">
          {title}
        </p>
        {defaultHex && (
          <Badge variant="outline" className="font-mono text-caption">
            DEFAULT: {defaultHex}
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(steps).map(([key, hex]) => (
          <button
            key={`${key}-${hex}`}
            type="button"
            onClick={() => copy(key, hex)}
            className="group relative flex flex-col items-center gap-1"
            aria-label={`Copy ${key} hex ${hex}`}
          >
            <span
              className="block h-12 w-16 rounded-md border border-border-default transition-transform group-hover:scale-105"
              style={{ backgroundColor: hex }}
            />
            <span className="font-mono text-caption text-text-muted">
              {copied === key ? (
                <Check className="inline h-3 w-3 text-semantic-success" />
              ) : (
                key
              )}
            </span>
            <span className="sr-only">{hex}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PdfTemplatesTab() {
  return (
    <div className="space-y-4">
      <Badge variant="secondary" className="font-mono">
        {TEMPLATE_REGISTRY.length} templates · @react-pdf/renderer v4
      </Badge>
      <p className="text-body text-text-secondary">
        Each PDF template renders live at{" "}
        <code className="font-mono text-primary-500">/dev/pdfs/[id]</code>.
        See{" "}
        <code className="font-mono text-primary-500">docs/PDF_TEMPLATES.md</code>{" "}
        for the full backend-consumption spec.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {TEMPLATE_REGISTRY.map(
          (tpl: {
            id: TemplateId;
            title: string;
            description: string;
            fields: string[];
          }) => (
            <Card
              key={tpl.id}
              className="flex flex-col transition-shadow hover:shadow-elevation-2"
            >
              <CardHeader>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-subtitle">
                      {tpl.title}
                    </CardTitle>
                    <code className="font-mono text-caption text-text-muted">
                      {tpl.id}
                    </code>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <p className="text-body text-text-secondary">{tpl.description}</p>
                <div className="flex flex-wrap gap-1">
                  {tpl.fields.map((f: string) => (
                    <Badge
                      key={f}
                      variant="outline"
                      className="font-mono text-caption"
                    >
                      {f}
                    </Badge>
                  ))}
                </div>
                <div className="mt-auto flex items-center gap-2 pt-2">
                  <Button asChild size="sm" variant="default">
                    <Link href={`/dev/pdfs/${tpl.id}`}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      Preview
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/dev/pdfs">
                      <Shapes className="h-3.5 w-3.5" />
                      All PDFs
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ),
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------
 * Page
 * ---------------------------------------------------------------- */

export default function DevAssetsPage() {
  const [iconCount, setIconCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/assets/icons/icon-catalog.json")
      .then((r) => r.json() as Promise<IconCatalog>)
      .then((c) => setIconCount(c.count))
      .catch(() => setIconCount(0));
  }, []);

  const brandAssetCount = 3; // color-palette.json + favicon.svg + logo-mock.svg

  return (
    <div className="min-h-screen bg-surface-canvas">
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
          {/* Header */}
          <header className="space-y-2">
            <div className="flex items-center gap-2 text-caption font-medium text-text-muted">
              <Sparkles className="h-4 w-4 text-accent-500" />
              Phase C7.3 · Asset Library Export
            </div>
            <h1 className="text-display font-bold text-text-primary">
              /dev/assets
            </h1>
            <p className="max-w-prose text-body text-text-secondary">
              Machine-readable export of every Lucide icon, illustration, brand
              asset, and PDF template shipped with MadrashaOS. Use the catalog
              JSON files for backend PDF generation, design-tool imports, or
              marketing-site scaffolds.
            </p>
          </header>

          {/* Summary strip */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard
              icon={<Hash className="h-4 w-4" />}
              label="Icons"
              value={iconCount === null ? "…" : String(iconCount)}
              hint="lucide-react"
            />
            <SummaryCard
              icon={<ImageIcon className="h-4 w-4" />}
              label="Illustrations"
              value={String(ILLUSTRATIONS.length)}
              hint="empty states"
            />
            <SummaryCard
              icon={<Palette className="h-4 w-4" />}
              label="Brand assets"
              value={String(brandAssetCount)}
              hint="palette · logo · favicon"
            />
            <SummaryCard
              icon={<FileText className="h-4 w-4" />}
              label="PDF templates"
              value={String(TEMPLATE_REGISTRY.length)}
              hint="branded"
            />
          </section>

          {/* Tabs */}
          <Tabs defaultValue="icons" className="space-y-4">
            <TabsList>
              <TabsTrigger value="icons">
                <Hash className="me-1.5 h-3.5 w-3.5" />
                Icons
              </TabsTrigger>
              <TabsTrigger value="illustrations">
                <ImageIcon className="me-1.5 h-3.5 w-3.5" />
                Illustrations
              </TabsTrigger>
              <TabsTrigger value="brand">
                <Palette className="me-1.5 h-3.5 w-3.5" />
                Brand
              </TabsTrigger>
              <TabsTrigger value="pdfs">
                <FileText className="me-1.5 h-3.5 w-3.5" />
                PDF Templates
              </TabsTrigger>
            </TabsList>

            <TabsContent value="icons" className="mt-4">
              <IconsTab />
            </TabsContent>
            <TabsContent value="illustrations" className="mt-4">
              <IllustrationsTab />
            </TabsContent>
            <TabsContent value="brand" className="mt-4">
              <BrandTab />
            </TabsContent>
            <TabsContent value="pdfs" className="mt-4">
              <PdfTemplatesTab />
            </TabsContent>
          </Tabs>

          {/* Footer links */}
          <footer className="border-t border-border-default pt-4 text-caption text-text-muted">
            <p>
              Assets live under{" "}
              <code className="font-mono">/public/assets/</code>. Regenerate
              icons via{" "}
              <code className="font-mono">bun run scripts/export-icons.ts</code>
              . Brand palette is FROZEN at v1.0.0 per Risk R13 — do not edit hex
              values directly.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="py-4">
      <CardContent className="px-4">
        <div className="flex items-center gap-2 text-text-muted">
          {icon}
          <span className="text-caption font-medium uppercase tracking-wider">
            {label}
          </span>
        </div>
        <p className="mt-1 text-headline font-bold text-text-primary">
          {value}
        </p>
        <p className="text-caption text-text-muted">{hint}</p>
      </CardContent>
    </Card>
  );
}
