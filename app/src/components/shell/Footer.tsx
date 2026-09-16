"use client";

/**
 * MadrashaOS — Footer
 *
 * Session C0.3 — Theme Provider & Global Shell Skeleton
 *
 * Sticky footer with `mt-auto` to push to viewport bottom on short content
 * (per project UI rule). Shows:
 *   - copyright / rights text (locale-aware)
 *   - token version + source attribution
 *   - current locale indicator
 *
 * In RTL mode, the flex row reverses automatically via logical-property
 * utilities (ms-auto / me-auto).
 */

import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeConfig } from "@/lib/i18n/config";
import { tokenVersion } from "@/lib/design-system/tokens";

export function Footer({ className = "" }: { className?: string }) {
  const { t, locale } = useI18n();
  const cfg = localeConfig[locale];

  return (
    <footer
      className={`border-t border-border-default bg-surface-card px-4 py-3 md:px-6 ${className}`}
    >
      <div className="mx-auto flex max-w-[var(--grid-max-width)] flex-col gap-1 text-caption md:flex-row md:items-center md:justify-between">
        <p className="text-text-secondary">{t("shell.footer.rights")}</p>
        <div className="flex items-center gap-3">
          <span className="font-mono text-text-muted">
            v{tokenVersion} · {cfg.bcp47} · {cfg.dir.toUpperCase()}
          </span>
          <span className="font-mono text-text-muted">·</span>
          <span className="text-text-muted">Phase C0.3</span>
        </div>
      </div>
    </footer>
  );
}
