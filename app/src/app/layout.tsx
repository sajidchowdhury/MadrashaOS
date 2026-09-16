import type { Metadata } from "next";
import { Inter, Hind_Siliguri, Noto_Naskh_Arabic, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { QueryProvider } from "@/lib/query/QueryProvider";
import { AppShell } from "@/components/shell/AppShell";
import { DevToolbar } from "@/components/dev/DevToolbar";

/**
 * MadrashaOS — Root Layout (Session C0.4)
 *
 * Wraps the entire app in:
 *   1. next/font: 4 trilingual fonts (Inter / Hind Siliguri / Noto Naskh Arabic / JetBrains Mono)
 *   2. ThemeProvider (next-themes): light/dark/system with class attribute
 *   3. I18nProvider: locale state + t() + dir + cookie persistence
 *   4. QueryProvider: TanStack Query client + cache
 *   5. AppShell: TopBar + SideNav + main + sticky Footer
 *   6. DevToolbar: floating dev controls (role / branch / language / theme / network)
 *
 * The <html suppressHydrationWarning> suppresses the theme class mismatch
 * that next-themes injects on the client (SSR renders without a class to
 * avoid FOUC).
 */

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
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
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider>
            <QueryProvider>
              <AppShell>{children}</AppShell>
              <DevToolbar />
            </QueryProvider>
          </I18nProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
