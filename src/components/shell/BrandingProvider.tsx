"use client";

/**
 * MadrashaOS — Branding Provider (Phase 5)
 *
 * Fetches the current tenant's branding settings on mount and applies:
 *   - CSS variable `--brand-primary` (used by the app shell for primary color)
 *   - Document title (display name + "MadrashaOS")
 *   - Favicon (if set)
 *
 * Mounted at the app layout level so every page gets the branding.
 * Uses a 5-minute SWR-style revalidation (re-fetches on window focus).
 *
 * Falls back silently if the API fails (keeps the default teal branding).
 */

import * as React from "react";
import type { OrgSettings } from "@/lib/tenant/org-settings";
import { DEFAULT_PRIMARY_COLOR } from "@/lib/tenant/org-settings";

type BrandingData = {
  organization: { id: string; name: string; name_bn: string; code: string };
  settings: OrgSettings;
};

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = React.useState<BrandingData | null>(null);

  const fetchBranding = React.useCallback(async () => {
    try {
      const res = await fetch("/api/v1/organizations/settings", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setBranding(json.data);
      }
    } catch {
      // Silent fail — keep default branding
    }
  }, []);

  React.useEffect(() => {
    fetchBranding();
    // Re-fetch on window focus (in case branding was changed in another tab)
    const onFocus = () => fetchBranding();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchBranding]);

  // Apply CSS variable for primary color
  React.useEffect(() => {
    const primaryColor = branding?.settings?.branding?.primaryColor || DEFAULT_PRIMARY_COLOR;
    const root = document.documentElement;
    // Set the CSS variable that the app shell uses for primary branding
    root.style.setProperty("--brand-primary", primaryColor);
    // Also set the HSL components for Tailwind's primary color system
    const hsl = hexToHsl(primaryColor);
    if (hsl) {
      root.style.setProperty("--brand-primary-h", String(hsl.h));
      root.style.setProperty("--brand-primary-s", `${hsl.s}%`);
      root.style.setProperty("--brand-primary-l", `${hsl.l}%`);
    }
  }, [branding]);

  // Apply document title + favicon
  React.useEffect(() => {
    const displayName = branding?.settings?.branding?.displayName;
    const orgName = branding?.organization?.name ?? "MadrashaOS";
    document.title = displayName || orgName ? `${displayName || orgName} — MadrashaOS` : "MadrashaOS";

    const faviconUrl = branding?.settings?.branding?.faviconUrl;
    if (faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = faviconUrl;
    }
  }, [branding]);

  return <>{children}</>;
}

/** Convert hex (#0F766E) to HSL {h, s, l} for Tailwind CSS variables */
function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const cleaned = hex.replace("#", "");
  if (cleaned.length === 3) {
    // Expand #RGB → #RRGGBB
    const r = cleaned[0] + cleaned[0];
    const g = cleaned[1] + cleaned[1];
    const b = cleaned[2] + cleaned[2];
    return rgbToHsl(
      parseInt(r, 16) / 255,
      parseInt(g, 16) / 255,
      parseInt(b, 16) / 255,
    );
  }
  if (cleaned.length === 6) {
    return rgbToHsl(
      parseInt(cleaned.slice(0, 2), 16) / 255,
      parseInt(cleaned.slice(2, 4), 16) / 255,
      parseInt(cleaned.slice(4, 6), 16) / 255,
    );
  }
  return null;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}
