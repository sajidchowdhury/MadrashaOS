"use client";

/**
 * MadrashaOS — Theme Provider (React 19 / Next.js 16 fix)
 *
 * Replaces next-themes to eliminate the React 19 dev-mode warning:
 *   "Encountered a script tag while rendering React component"
 *
 * next-themes injects a raw <script> inside the component tree for
 * anti-FOUC. React 19 warns about this because scripts rendered inside
 * React components are not executed on the client. The script DOES
 * execute from SSR HTML, but the warning is noise.
 *
 * This provider:
 *   1. Uses next/script (strategy="beforeInteractive") for the anti-FOUC
 *      script — this is the Next.js-blessed way to inject pre-hydration
 *      scripts without React 19 warnings.
 *   2. Provides the same useTheme() API as next-themes ({ theme,
 *      resolvedTheme, setTheme }) so consumer files need only change
 *      their import path.
 *
 * Usage:
 *   import { ThemeProvider, useTheme } from "@/components/theme-provider";
 *   // In layout: <ThemeProvider>...</ThemeProvider>
 *   // In components: const { resolvedTheme, setTheme } = useTheme();
 */

import * as React from "react";
import Script from "next/script";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme | undefined;
  resolvedTheme: ResolvedTheme | undefined;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = React.createContext<ThemeContextValue>({
  theme: undefined,
  resolvedTheme: undefined,
  setTheme: () => {},
});

// --- Anti-FOUC script (runs before paint, no React warning) ---
// Reads localStorage 'theme' or falls back to system preference, then
// sets the 'dark' class on <html> accordingly. Stringified + injected
// via next/script strategy="beforeInteractive" so it runs before React
// hydration without triggering the React 19 script-tag warning.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;if(!t||t==='system'){t=m?'dark':'light'}if(t==='dark'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}window.__theme=t}catch(e){}})()`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme | undefined>(undefined);
  const [resolvedTheme, setResolvedTheme] = React.useState<ResolvedTheme | undefined>(undefined);

  // On mount: read the current theme (set by the anti-FOUC script or localStorage)
  React.useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    const initial = stored ?? "system";
    setThemeState(initial);

    const getResolved = (): ResolvedTheme => {
      if (initial === "system") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
      return initial;
    };

    setResolvedTheme(getResolved());

    // Listen for system preference changes when in "system" mode
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        const resolved = mediaQuery.matches ? "dark" : "light";
        setResolvedTheme(resolved);
        document.documentElement.classList.toggle("dark", resolved === "dark");
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = React.useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);

    const resolved: ResolvedTheme =
      newTheme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : newTheme;

    setResolvedTheme(resolved);
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, []);

  return (
    <>
      {/* Anti-FOUC script — runs before paint via next/script, no React 19 warning */}
      <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
        {children}
      </ThemeContext.Provider>
    </>
  );
}

/** useTheme — same API as next-themes for drop-in replacement */
export function useTheme() {
  return React.useContext(ThemeContext);
}
