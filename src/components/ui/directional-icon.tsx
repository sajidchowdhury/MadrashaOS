"use client";

/**
 * MadrashaOS — DirectionalIcon
 *
 * Session C0.2 — Multi-Language Font Stack & RTL Pipeline
 *
 * Wraps a Lucide icon and auto-mirrors it horizontally when the current
 * locale is RTL (Arabic). Uses the `[dir="rtl"] .icon-directional`
 * selector defined in globals.css AND a React-side `scale-x-[-1]` class
 * for double-coverage (CSS for static icons, React for SSR-safe initial
 * render).
 *
 * Per Session 1.4 iconography spec, directional icons include:
 *   nav-chevron-left/right, nav-arrow-left/right, act-send, act-undo, act-redo
 *
 * Non-directional icons (check, x, plus, minus, settings, etc.) should
 * use the regular <Icon> component — they never mirror.
 *
 * Usage:
 *   <DirectionalIcon icon="chevron-right" className="h-4 w-4" />
 *   <DirectionalIcon icon="arrow-left" />
 */

import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Send,
  Undo2,
  Redo2,
  Reply,
  Share,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

export type DirectionalIconName =
  | "chevron-left"
  | "chevron-right"
  | "arrow-left"
  | "arrow-right"
  | "send"
  | "undo"
  | "redo"
  | "reply"
  | "share";

const ICON_MAP: Record<DirectionalIconName, LucideIcon> = {
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  send: Send,
  undo: Undo2,
  redo: Redo2,
  reply: Reply,
  share: Share,
};

type DirectionalIconProps = {
  icon: DirectionalIconName;
  className?: string;
  size?: number;
  "aria-label"?: string;
};

/**
 * Render a Lucide icon that auto-mirrors in RTL locales.
 * The `data-directional="true"` attribute triggers the CSS rule in
 * globals.css: `[dir="rtl"] [data-directional="true"] { transform: scaleX(-1); }`
 */
export function DirectionalIcon({
  icon,
  className = "",
  size,
  "aria-label": ariaLabel,
}: DirectionalIconProps) {
  const { dir } = useI18n();
  const Icon = ICON_MAP[icon];
  const isRtl = dir === "rtl";

  return (
    <Icon
      className={`${className} ${isRtl ? "scale-x-[-1]" : ""}`.trim()}
      size={size}
      data-directional="true"
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
    />
  );
}
