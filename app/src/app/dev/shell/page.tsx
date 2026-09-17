"use client";

/**
 * MadrashaOS — /dev/shell (C4.4 — Responsive Breakpoint Spec)
 *
 * Documents the responsive behavior of the global app shell at 4 viewport
 * sizes (375 / 768 / 1280 / 1440) side by side using live iframe previews.
 *
 * Each preview is a real iframe loading `/` so the actual shell (TopBar +
 * SideNav + Footer) renders inside it — at the viewport width we set via the
 * iframe's `width` attribute (with `min-width` to opt out of the parent's
 * responsive shrink). The outer card frames the iframe to a fixed device width.
 *
 * Below the previews:
 *   - A breakpoint token table listing the 5 FROZEN breakpoint variables
 *     from the design system (--breakpoint-sm / md / lg / xl / 2xl)
 *   - An elements-appear/hide grid showing which shell elements are visible
 *     at each breakpoint
 *
 * This is a documentation route — no business logic, no mutations, no stores.
 */

import { useState } from "react";
import {
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  ExternalLink,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type BreakpointId = "sm" | "md" | "lg" | "xl";

type BreakpointSpec = {
  id: BreakpointId;
  label: string;
  widthPx: number;
  heightPx: number;
  icon: typeof Smartphone;
  /** Tailwind min-width prefix that activates at this breakpoint. */
  tailwindPrefix: string;
  description: string;
};

const BREAKPOINTS: BreakpointSpec[] = [
  {
    id: "sm",
    label: "Mobile",
    widthPx: 375,
    heightPx: 480,
    icon: Smartphone,
    tailwindPrefix: "sm:",
    description:
      "Mobile-first base. Hamburger drawer for nav, no SideNav, single-column layouts, stacked KPI cards, sticky mobile bottom action bar on key screens.",
  },
  {
    id: "md",
    label: "Tablet",
    widthPx: 768,
    heightPx: 500,
    icon: Tablet,
    tailwindPrefix: "md:",
    description:
      "SideNav becomes visible (collapsible). TopBar shows search bar. Footer switches to row layout. Mobile bottom action bar hidden.",
  },
  {
    id: "lg",
    label: "Desktop",
    widthPx: 1280,
    heightPx: 540,
    icon: Laptop,
    tailwindPrefix: "lg:",
    description:
      "Branch + academic year switchers visible in the TopBar. Multi-column grids (lg:grid-cols-2 / 3). Max content width capped at 1280px (grid-max-width token).",
  },
  {
    id: "xl",
    label: "Wide",
    widthPx: 1440,
    heightPx: 540,
    icon: Monitor,
    tailwindPrefix: "xl:",
    description:
      "User name visible next to the avatar in the TopBar. Content centered with comfortable side gutters. No layout shift beyond this — fluid up to 1920px (2xl).",
  },
];

/** Which shell elements are visible at each breakpoint. */
const SHELL_ELEMENTS: {
  name: string;
  sm: boolean;
  md: boolean;
  lg: boolean;
  xl: boolean;
}[] = [
  { name: "Hamburger menu button", sm: true, md: false, lg: false, xl: false },
  { name: "Brand name (MadrashaOS)", sm: false, md: true, lg: true, xl: true },
  { name: "Branch switcher", sm: false, md: false, lg: true, xl: true },
  { name: "Academic year switcher", sm: false, md: false, lg: true, xl: true },
  { name: "Search bar", sm: false, md: true, lg: true, xl: true },
  { name: "Language switcher", sm: true, md: true, lg: true, xl: true },
  { name: "Theme toggle", sm: true, md: true, lg: true, xl: true },
  { name: "Notifications bell", sm: true, md: true, lg: true, xl: true },
  { name: "User avatar", sm: true, md: true, lg: true, xl: true },
  { name: "User name (label)", sm: false, md: false, lg: false, xl: true },
  { name: "SideNav (collapsible)", sm: false, md: true, lg: true, xl: true },
  { name: "Mobile bottom action bar", sm: true, md: false, lg: false, xl: false },
  { name: "Footer row layout", sm: false, md: true, lg: true, xl: true },
];

/** Token listing — mirrors the FROZEN tokens.css values for transparency. */
const TOKEN_TABLE: { name: string; value: string; note: string }[] = [
  { name: "--breakpoint-sm", value: "375px", note: "Mobile-first base (iPhone SE)" },
  { name: "--breakpoint-md", value: "768px", note: "Tablet / iPad portrait" },
  { name: "--breakpoint-lg", value: "1280px", note: "Desktop / max grid width" },
  { name: "--breakpoint-xl", value: "1440px", note: "Wide desktop / laptop+" },
  { name: "--breakpoint-2xl", value: "1920px", note: "Wide displays (1080p+)" },
  { name: "--grid-max-width", value: "1280px", note: "Content capped past lg" },
  { name: "--grid-gutter", value: "24px", note: "Inter-column gutter" },
  { name: "--grid-margin", value: "16px", note: "Mobile page edge padding" },
];

export default function ShellBreakpointSpecPage() {
  const [activeBp, setActiveBp] = useState<BreakpointId>("sm");

  return (
    <div className="bg-surface-canvas">
      <div className="mx-auto max-w-[var(--grid-max-width)] px-4 py-8 md:px-8 md:py-12">
        {/* Page header */}
        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary-200 bg-primary-50 text-primary-700">
              Phase C4.4
            </Badge>
            <Badge variant="outline">Tokens v1.0.0 · FROZEN</Badge>
          </div>
          <h1 className="mt-3 text-display font-bold text-text-primary">
            Responsive Breakpoint Spec
          </h1>
          <p className="mt-2 max-w-2xl text-body text-text-secondary">
            The global app shell renders at 4 viewport widths (375 / 768 / 1280 / 1440).
            Each preview below is a live iframe loading{" "}
            <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-caption">/</code>{" "}
            so you can see how the TopBar + SideNav + Footer respond at that exact pixel width.
          </p>
        </header>

        {/* Breakpoint selector — quick scroll-to preview */}
        <nav
          aria-label="Jump to breakpoint preview"
          className="mb-6 flex flex-wrap gap-2"
        >
          {BREAKPOINTS.map((bp) => {
            const Icon = bp.icon;
            const isActive = activeBp === bp.id;
            return (
              <button
                key={bp.id}
                type="button"
                onClick={() => {
                  setActiveBp(bp.id);
                  document
                    .getElementById(`bp-${bp.id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-caption font-medium transition-colors ${
                  isActive
                    ? "border-primary-500 bg-primary-500 text-primary-foreground"
                    : "border-border-strong bg-surface-card text-text-secondary hover:bg-surface-hover"
                }`}
                aria-pressed={isActive}
              >
                <Icon className="h-4 w-4" />
                <span className="font-mono">{bp.widthPx}px</span>
                <span className="hidden sm:inline">· {bp.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Live previews — 4 viewport widths side by side */}
        <section
          aria-label="Live shell previews at 4 viewport widths"
          className="mb-12 grid gap-6 md:grid-cols-2"
        >
          {BREAKPOINTS.map((bp) => (
            <BreakpointPreview key={bp.id} bp={bp} />
          ))}
        </section>

        {/* Elements appear/hide grid */}
        <section className="mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-subtitle">
                <Info className="h-4 w-4 text-primary-500" />
                Shell elements by breakpoint
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] border-collapse">
                  <thead>
                    <tr className="border-b border-border-default bg-neutral-50">
                      <th className="px-3 py-2 text-start text-caption font-medium uppercase tracking-wider text-text-muted">
                        Element
                      </th>
                      {BREAKPOINTS.map((bp) => (
                        <th
                          key={bp.id}
                          className="px-3 py-2 text-center text-caption font-medium uppercase tracking-wider text-text-muted"
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-mono">{bp.widthPx}</span>
                            <span className="text-[10px] normal-case text-text-muted">
                              {bp.label}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SHELL_ELEMENTS.map((el) => (
                      <tr
                        key={el.name}
                        className="border-b border-border-default last:border-b-0"
                      >
                        <td className="px-3 py-2 text-body text-text-primary">
                          {el.name}
                        </td>
                        {[el.sm, el.md, el.lg, el.xl].map((visible, idx) => (
                          <td key={idx} className="px-3 py-2 text-center">
                            <span
                              className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                                visible
                                  ? "bg-success-50 text-semantic-success"
                                  : "bg-neutral-100 text-text-muted"
                              }`}
                              aria-label={visible ? "visible" : "hidden"}
                            >
                              {visible ? "✓" : "—"}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-caption text-text-muted">
                ✓ visible · — hidden. The shell uses Tailwind responsive
                prefixes (<code className="font-mono">sm:</code> /{" "}
                <code className="font-mono">md:</code> /{" "}
                <code className="font-mono">lg:</code> /{" "}
                <code className="font-mono">xl:</code>) mapped to the FROZEN
                breakpoint tokens.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Token table */}
        <section className="mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-subtitle">
                Breakpoint &amp; grid tokens (FROZEN v1.0.0)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[36rem] border-collapse">
                  <thead>
                    <tr className="border-b border-border-default bg-neutral-50">
                      <th className="px-3 py-2 text-start text-caption font-medium uppercase tracking-wider text-text-muted">
                        Token
                      </th>
                      <th className="px-3 py-2 text-start text-caption font-medium uppercase tracking-wider text-text-muted">
                        Value
                      </th>
                      <th className="px-3 py-2 text-start text-caption font-medium uppercase tracking-wider text-text-muted">
                        Note
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {TOKEN_TABLE.map((row) => (
                      <tr
                        key={row.name}
                        className="border-b border-border-default last:border-b-0"
                      >
                        <td className="px-3 py-2 font-mono text-caption text-primary-700">
                          {row.name}
                        </td>
                        <td className="px-3 py-2 font-mono text-body text-text-primary">
                          {row.value}
                        </td>
                        <td className="px-3 py-2 text-body text-text-secondary">
                          {row.note}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-caption text-text-muted">
                Source:{" "}
                <code className="font-mono">src/styles/tokens.css</code> —
                primitive layer (FROZEN, do not edit). Tailwind v4 theme bridge
                in <code className="font-mono">src/app/globals.css</code>{" "}
                exposes these as responsive utilities.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className="border-t border-border-default pt-6 text-center">
          <p className="text-caption text-text-secondary">
            Phase C4.1 + C4.4 · Global Shell Hi-Fi Polish + Mobile Shell · 4
            breakpoints documented.
          </p>
        </footer>
      </div>
    </div>
  );
}

/* --- Breakpoint preview card with live iframe --- */

function BreakpointPreview({ bp }: { bp: BreakpointSpec }) {
  const Icon = bp.icon;
  return (
    <Card id={`bp-${bp.id}`} className="scroll-mt-4 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary-500" />
          <CardTitle className="text-subtitle">
            {bp.label}{" "}
            <span className="font-mono text-caption text-text-muted">
              · {bp.widthPx}px
            </span>
          </CardTitle>
        </div>
        <Button asChild variant="ghost" size="sm" className="text-caption">
          <a href="/" target="_blank" rel="noreferrer">
            <ExternalLink className="h-3 w-3" />
            Open
          </a>
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="mb-3 text-caption text-text-secondary">{bp.description}</p>
        {/* Device frame — centers the iframe at the exact viewport width. */}
        <div
          className="mx-auto overflow-hidden rounded-lg border border-border-strong bg-surface-canvas shadow-elevation-2"
          style={{ width: bp.widthPx, maxWidth: "100%", height: bp.heightPx }}
          role="img"
          aria-label={`${bp.label} preview at ${bp.widthPx}px viewport width`}
        >
          <iframe
            src="/"
            title={`${bp.label} (${bp.widthPx}px) live preview`}
            loading="lazy"
            className="h-full w-full border-0 bg-surface-canvas"
            style={{ width: bp.widthPx, minWidth: bp.widthPx }}
          />
        </div>
        <p className="mt-2 text-center text-caption text-text-muted">
          Tailwind prefix: <code className="font-mono">{bp.tailwindPrefix}</code>
        </p>
      </CardContent>
    </Card>
  );
}
