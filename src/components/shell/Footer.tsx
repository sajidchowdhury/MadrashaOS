"use client";

/**
 * MadrashaOS — Footer (v1.0 — simplified)
 *
 * Sticky footer with `mt-auto` to push to viewport bottom on short content.
 * Shows only the copyright text — clean and minimal.
 */

import { useI18n } from "@/lib/i18n/I18nProvider";

export function Footer({ className = "" }: { className?: string }) {
  const { t } = useI18n();

  return (
    <footer
      className={`border-t border-border-default bg-surface-card px-4 py-3 md:px-6 ${className}`}
    >
      <div className="mx-auto flex max-w-[var(--grid-max-width)] items-center justify-center">
        <p className="text-caption text-text-secondary">
          {t("shell.footer.rights")}
        </p>
      </div>
    </footer>
  );
}
