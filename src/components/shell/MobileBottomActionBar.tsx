"use client";

/**
 * MadrashaOS — MobileBottomActionBar (C4.1)
 *
 * Mobile-only fixed bottom action bar (md:hidden) shown on the three key
 * mobile-first screens where a primary CTA lives:
 *   - /attendance/take     → "Submit Attendance"
 *   - /exams/[id]/marks    → "Save Marks"
 *   - /fees                → "Collect Payment"
 *
 * Each page already has its own sticky action bar inside its content area
 * (the page-level bar carries the actual submit/save logic). This shell-level
 * bar is a *mobile-only* persistent CTA that:
 *   - gives the user an always-visible affordance at the bottom of the
 *     viewport (no need to scroll to find the page-level bar)
 *   - emits a `madrasha:mobile-cta` CustomEvent on click so any listener
 *     on the page can hook in (e.g. to trigger the same onClick handler)
 *   - falls back to scrolling the page-level primary button into view if
 *     no listener intercepts (looks for [data-mobile-cta-target] first,
 *     then scrolls the page content to its sticky bottom bar)
 *
 * It only renders when:
 *   - the pathname matches one of the three target routes (or starts with
 *     /exams/ and ends with /marks)
 *   - and there is no `prefers-reduced-motion` conflict (still renders, but
 *     the scroll behavior respects the media query automatically)
 *
 * Hidden on md+ via Tailwind's md:hidden — desktops rely on the page-level
 * sticky bars which already work fine in a wide viewport.
 */

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Send,
  Save,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type CTAConfig = {
  label: string;
  icon: LucideIcon;
};

const DEFAULT_CTA: CTAConfig = {
  label: "Action",
  icon: Send,
};

function resolveCTA(pathname: string): CTAConfig | null {
  if (!pathname) return null;
  // /attendance/take
  if (pathname === "/attendance/take") {
    return { label: "Submit Attendance", icon: Send };
  }
  // /exams/[id]/marks
  if (
    pathname.startsWith("/exams/") &&
    pathname.endsWith("/marks")
  ) {
    return { label: "Save Marks", icon: Save };
  }
  // /fees
  if (pathname === "/fees" || pathname.startsWith("/fees/")) {
    return { label: "Collect Payment", icon: Wallet };
  }
  return null;
}

export function MobileBottomActionBar({ pathname }: { pathname: string }) {
  const cta = useMemo(() => resolveCTA(pathname), [pathname]);
  const { toast } = useToast();
  // Track whether the page-level sticky bar is already in view — if so,
  // hide our shell-level bar to avoid stacking duplicates on small screens.
  const [pageBarVisible, setPageBarVisible] = useState(false);

  useEffect(() => {
    if (!cta) {
      return;
    }
    // The page-level sticky bars use the marker class `data-mobile-cta-anchor`.
    // We observe whether any such anchor is intersecting the viewport's bottom
    // 96px (the height of our bar). If yes, we hide the shell-level bar to
    // avoid stacking two bars on top of each other.
    //
    // The observer's first callback fires synchronously after `observe()` is
    // called (per the IntersectionObserver spec) so the initial visibility
    // state is set without a flash on route change.
    const anchors = Array.from(
      document.querySelectorAll<HTMLElement>("[data-mobile-cta-anchor]"),
    );
    if (anchors.length === 0) {
      // No anchor on this page → keep the shell bar visible.
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const anyVisible = entries.some((e) => e.isIntersecting);
        setPageBarVisible(anyVisible);
      },
      {
        rootMargin: "0px 0px 96px 0px",
        threshold: 0,
      },
    );
    anchors.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [cta, pathname]);

  if (!cta) return null;

  const Icon = cta.icon;

  function handleClick() {
    // 1. Dispatch a custom event that page-level sticky bars can listen for
    //    to trigger their own onClick handler (the page-level bar carries
    //    the actual submit/save logic; this shell bar is a UX hint).
    window.dispatchEvent(
      new CustomEvent("madrasha:mobile-cta", {
        detail: { route: pathname },
      }),
    );

    // 2. Scroll the page-level primary button into view as a fallback UX.
    const target = document.querySelector<HTMLElement>(
      "[data-mobile-cta-target]",
    );
    if (target) {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
      // Subtle highlight so the user notices where the action lives.
      target.classList.add("ring-2", "ring-accent-500");
      window.setTimeout(() => {
        target.classList.remove("ring-2", "ring-accent-500");
      }, 1200);
      return;
    }

    // 3. No target on the page — show a friendly hint toast.
    toast({
      title: cta!.label,
      description: "Scroll down to complete the action.",
    });
  }

  return (
    <div
      role="region"
      aria-label="Mobile quick action"
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-border-default bg-surface-card p-3 shadow-elevation-2 md:hidden ${
        pageBarVisible ? "translate-y-full" : "translate-y-0"
      } transition-transform duration-normal ease-standard`}
    >
      <Button
        type="button"
        onClick={handleClick}
        className="h-11 w-full text-subtitle"
        size="lg"
        aria-label={cta.label}
      >
        <Icon className="h-4 w-4" />
        {cta.label}
      </Button>
    </div>
  );
}
