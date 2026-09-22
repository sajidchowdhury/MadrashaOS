// Every page in MadrashaOS is database-driven (auth, RBAC, tenant scoping)
// so no page can be statically prerendered at build time.
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Inter, Hind_Siliguri, Noto_Naskh_Arabic, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { QueryProvider } from "@/lib/query/QueryProvider";

/**
 * MadrashaOS — Root Layout (Phase C5.2 restructure)
 *
 * The root layout now provides ONLY shared global providers + fonts:
 *   1. next/font: 4 trilingual fonts (Inter / Hind Siliguri / Noto Naskh Arabic / JetBrains Mono)
 *   2. ThemeProvider (next-themes): light/dark/system with class attribute
 *   3. I18nProvider: locale state + t() + dir + cookie persistence
 *   4. QueryProvider: TanStack Query client + cache
 *   5. Toaster (mounted once globally)
 *
 * Route-group layouts add their own chrome:
 *   - `(app)/layout.tsx`  → AppShell + DevToolbar (authenticated back-office)
 *   - `(public)/layout.tsx` → PublicLayout (public website, no shell)
 *
 * The legacy `/` showcase page + the `/dev/*` routes live OUTSIDE both route
 * groups, so they get no chrome from a group layout (intentional — the
 * showcase already renders its own page-level chrome and the /dev routes
 * are tooling pages that don't need the AppShell).
 *
 * The <html suppressHydrationWarning> suppresses the theme class mismatch
 * that next-themes injects on the client (SSR renders without a class to
 * avoid FOUC).
 */

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  // NOTE: do NOT add style: ["normal", "italic"] here — Turbopack dev mode
  // cannot reliably resolve the Inter italic variant and logs:
  //   "Could not resolve font for Inter, fontWeight 400, fontStyle italic"
  // The italic variant is provided by the @font-face rule in globals.css.
});

const hindSiliguri = Hind_Siliguri({
  variable: "--font-hind-siliguri",
  subsets: ["bengali"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const notoNaskhArabic = Noto_Naskh_Arabic({
  variable: "--font-noto-naskh-arabic",
  subsets: ["arabic"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MadrashaOS — UI/UX Design System",
  description:
    "MadrashaOS — multi-tenant, multi-branch Madrasha Management & ERP. Trilingual (Bangla / English / Arabic) UI/UX design system showcase.",
  keywords: [
    "MadrashaOS",
    "Madrasha ERP",
    "Design System",
    "Tailwind CSS",
    "Next.js",
    "shadcn/ui",
  ],
  authors: [{ name: "MadrashaOS UI/UX Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${hindSiliguri.variable} ${notoNaskhArabic.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider>
            <QueryProvider>{children}</QueryProvider>
          </I18nProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
