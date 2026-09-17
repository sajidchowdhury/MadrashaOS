"use client";

/**
 * MadrashaOS — NoticeRow (C4.3 — Communication · Notices)
 *
 * A single row in the Notices list (/notices).
 * Shows: title (with Bangla subtitle if available), audience badge,
 * recipient count, sent date, sent-by name.
 *
 * Mobile-first: stacked layout at 375px, inline row on sm+.
 *
 * Per Risk R11: each row surfaces the recipientCount so composers can
 * sanity-check audience sizes at a glance.
 */

import { Bell, Users, CalendarDays, UserCircle } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/i18n/format";
import { Badge } from "@/components/ui/badge";
import type { Notice } from "@/lib/mock/types";

export type NoticeAudienceTone = "primary" | "accent" | "success" | "neutral";

const AUDIENCE_META: Record<
  Notice["audience"],
  { label: string; tone: NoticeAudienceTone; className: string }
> = {
  all: {
    label: "All",
    tone: "primary",
    className: "bg-primary-50 text-primary-700 border-primary-500/30",
  },
  guardians: {
    label: "Guardians",
    tone: "accent",
    className: "bg-accent-50 text-accent-700 border-accent-500/30",
  },
  staff: {
    label: "Staff",
    tone: "success",
    className: "bg-success-50 text-semantic-success border-semantic-success/30",
  },
  class: {
    label: "Class-specific",
    tone: "neutral",
    className: "bg-neutral-100 text-text-primary border-border-strong",
  },
};

export function NoticeAudienceBadge({ audience }: { audience: Notice["audience"] }) {
  const meta = AUDIENCE_META[audience];
  return (
    <Badge variant="outline" className={meta.className} aria-label={`Audience: ${meta.label}`}>
      {meta.label}
    </Badge>
  );
}

export function NoticeRow({
  notice,
  sentByName,
  locale,
  onOpen,
}: {
  notice: Notice;
  sentByName: string;
  locale: Locale;
  onOpen?: (notice: Notice) => void;
}) {
  const dateLabel = formatDate(new Date(notice.sentAt), locale);
  const meta = AUDIENCE_META[notice.audience];

  return (
    <li
      data-slot="notice-row"
      className="flex flex-col gap-3 rounded-lg border border-border-default bg-surface-card p-4 transition-colors hover:bg-surface-hover sm:flex-row sm:items-start sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700">
          <Bell className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onOpen?.(notice)}
            className="text-start"
            aria-label={`Open notice ${notice.title}`}
          >
            <p className="truncate text-body font-semibold text-text-primary hover:text-primary-700">
              {notice.title}
            </p>
            {notice.titleBn && (
              <p className="truncate font-bn text-caption text-text-secondary" lang="bn">
                {notice.titleBn}
              </p>
            )}
          </button>
          <p className="mt-1 line-clamp-2 text-caption text-text-muted">{notice.body}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-text-muted">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" aria-hidden="true" />
              {dateLabel}
            </span>
            <span className="inline-flex items-center gap-1">
              <UserCircle className="h-3 w-3" aria-hidden="true" />
              {sentByName}
            </span>
            <span className="inline-flex items-center gap-1" aria-label={`${notice.recipientCount} recipients`}>
              <Users className="h-3 w-3" aria-hidden="true" />
              {notice.recipientCount} recipients
            </span>
            {notice.audience === "class" && notice.audienceFilter && (
              <Badge variant="outline" className={meta.className}>
                {notice.audienceFilter}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <NoticeAudienceBadge audience={notice.audience} />
      </div>
    </li>
  );
}
