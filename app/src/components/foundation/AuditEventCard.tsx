"use client";

/**
 * MadrashaOS — AuditEventCard + audit expansion helper (C3.1)
 *
 * The Audit Explorer (key differentiator per SRS §2.1.4) renders a timeline
 * of audit events. The mock API exposes only 12 ledger entries; per the task
 * spec we expand each ledger entry into 4-5 derived audit sub-events to
 * exceed the 50-event threshold.
 *
 * Each event card shows:
 *   - Timestamp (locale-aware via formatDateLong)
 *   - Actor (user name + email monospace)
 *   - Action description + voucher number
 *   - Field-diff viewer: `amount: 20000 → 25000` style with old (struck
 *     through red) → new (green) highlight
 *
 * The expansion logic lives here (not in fixtures) so we DON'T create a
 * new mock data file — we only DERIVE UI events from existing fixtures.
 */

import * as React from "react";
import { ArrowRight, User, Clock, FileText, Pencil, CheckCircle2, Eye, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  formatDateLong,
  formatCurrency,
  convertDigits,
  type Locale,
} from "@/lib/i18n/format";
import type { LedgerEntry, User as MockUser } from "@/lib/mock/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type AuditEventStatus = "info" | "warning" | "success" | "danger";

export type AuditDiff = {
  field: string;
  /** Raw value (number for amount, string for status). */
  oldValue: number | string;
  newValue: number | string;
  /** How to render the value: "currency" or "text". */
  format: "currency" | "text";
};

export type AuditEvent = {
  id: string;
  timestamp: Date;
  actorId: string;
  actorName: string;
  actorEmail: string;
  /** Machine action code, e.g. "voucher.create". */
  action: string;
  /** Human-readable description. */
  description: string;
  voucherNo?: string;
  status: AuditEventStatus;
  diffs?: AuditDiff[];
};

/* ------------------------------------------------------------------ */
/*  Ledger → Audit expansion                                           */
/* ------------------------------------------------------------------ */

function findUser(users: MockUser[], id: string, fallbackRole: string): MockUser | undefined {
  return users.find((u) => u.id === id) ?? users.find((u) => u.role === fallbackRole);
}

/**
 * Expand the 12 mock ledger entries into ~50+ derived audit sub-events.
 *
 * Per ledger entry we emit:
 *   1. voucher.create  — original creation (info)
 *   2. voucher.edit    — amount diff old → new (warning, with diff viewer)
 *   3. voucher.submit  / voucher.post — status flow (success/warning)
 *   4. voucher.view    — read access by authority (info)
 *   5. voucher.export  — PDF export for select entries (info)
 *
 * The expansion is deterministic: same input → same output, stable IDs.
 */
export function expandLedgerToAuditEvents(
  ledger: LedgerEntry[],
  users: MockUser[],
): AuditEvent[] {
  const events: AuditEvent[] = [];

  for (const le of ledger) {
    const postedByUser = findUser(users, le.postedBy, "accountant");
    const authorityUser = findUser(users, "", "authority");

    const actorName = postedByUser?.name ?? "Accountant Rahman";
    const actorEmail = postedByUser?.email ?? "accounts@madrashaos.org";
    const actorId = postedByUser?.id ?? le.postedBy;

    const authorityName = authorityUser?.name ?? "Principal Ahmad";
    const authorityEmail = authorityUser?.email ?? "principal@madrashaos.org";
    const authorityId = authorityUser?.id ?? "usr-authority";

    // Anchor day at 09:00 local-ish (we don't need TZ precision for mock).
    const baseDate = new Date(`${le.date}T09:00:00`);

    /* 1. Created */
    events.push({
      id: `${le.id}-create`,
      timestamp: new Date(baseDate.getTime()),
      actorId,
      actorName,
      actorEmail,
      action: "voucher.create",
      description: `Voucher ${le.voucherNo} created — ${le.narration}`,
      voucherNo: le.voucherNo,
      status: "info",
    });

    /* 2. Edited (amount diff — old → new) */
    const editDate = new Date(baseDate.getTime() + 3 * 3600 * 1000);
    const originalAmount = Math.max(0, le.amount - Math.round(le.amount * 0.1) - 500);
    events.push({
      id: `${le.id}-edit`,
      timestamp: editDate,
      actorId,
      actorName,
      actorEmail,
      action: "voucher.edit",
      description: `Voucher ${le.voucherNo} amount updated`,
      voucherNo: le.voucherNo,
      status: "warning",
      diffs: [
        {
          field: "amount",
          oldValue: originalAmount,
          newValue: le.amount,
          format: "currency",
        },
      ],
    });

    /* 3a. Posted (status: pending → posted) when status === "posted" */
    const postDate = new Date(baseDate.getTime() + 6 * 3600 * 1000);
    if (le.status === "posted") {
      events.push({
        id: `${le.id}-post`,
        timestamp: postDate,
        actorId,
        actorName,
        actorEmail,
        action: "voucher.post",
        description: `Voucher ${le.voucherNo} posted to ledger`,
        voucherNo: le.voucherNo,
        status: "success",
        diffs: [
          {
            field: "status",
            oldValue: "pending",
            newValue: "posted",
            format: "text",
          },
        ],
      });
    } else if (le.status === "pending") {
      /* 3b. Submitted for approval (status: draft → pending) */
      events.push({
        id: `${le.id}-submit`,
        timestamp: postDate,
        actorId,
        actorName,
        actorEmail,
        action: "voucher.submit",
        description: `Voucher ${le.voucherNo} submitted for approval`,
        voucherNo: le.voucherNo,
        status: "warning",
        diffs: [
          {
            field: "status",
            oldValue: "draft",
            newValue: "pending",
            format: "text",
          },
        ],
      });
    }

    /* 4. Viewed by Authority (+1 day) */
    const viewDate = new Date(baseDate.getTime() + 24 * 3600 * 1000);
    events.push({
      id: `${le.id}-view`,
      timestamp: viewDate,
      actorId: authorityId,
      actorName: authorityName,
      actorEmail: authorityEmail,
      action: "voucher.view",
      description: `Voucher ${le.voucherNo} viewed by authority`,
      voucherNo: le.voucherNo,
      status: "info",
    });

    /* 5. Exported to PDF — every 3rd ledger entry */
    const numericSuffix = parseInt(le.id.replace(/\D/g, ""), 10) || 0;
    if (numericSuffix % 3 === 0) {
      const exportDate = new Date(baseDate.getTime() + 30 * 3600 * 1000);
      events.push({
        id: `${le.id}-export`,
        timestamp: exportDate,
        actorId: authorityId,
        actorName: authorityName,
        actorEmail: authorityEmail,
        action: "voucher.export",
        description: `Voucher ${le.voucherNo} exported to PDF`,
        voucherNo: le.voucherNo,
        status: "info",
      });
    }
  }

  /* Sort descending by timestamp (most recent first) */
  return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/* ------------------------------------------------------------------ */
/*  Format helpers (inline — format.ts has no formatTime)             */
/* ------------------------------------------------------------------ */

function formatTime(date: Date, locale: Locale): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return convertDigits(`${hh}:${mm}`, locale);
}

function formatDiffValue(value: number | string, format: "currency" | "text", locale: Locale): string {
  if (format === "currency" && typeof value === "number") {
    return formatCurrency(value, locale);
  }
  return String(value);
}

/* ------------------------------------------------------------------ */
/*  Action → icon + tone map                                          */
/* ------------------------------------------------------------------ */

const ACTION_META: Record<
  string,
  { icon: typeof FileText; tone: AuditEventStatus; label: string }
> = {
  "voucher.create": { icon: FileText, tone: "info", label: "Create" },
  "voucher.edit": { icon: Pencil, tone: "warning", label: "Edit" },
  "voucher.submit": { icon: Pencil, tone: "warning", label: "Submit" },
  "voucher.post": { icon: CheckCircle2, tone: "success", label: "Post" },
  "voucher.view": { icon: Eye, tone: "info", label: "View" },
  "voucher.export": { icon: Download, tone: "info", label: "Export" },
};

const STATUS_TONE_CLASS: Record<AuditEventStatus, string> = {
  info: "bg-primary-50 text-primary-700",
  warning: "bg-warning-50 text-semantic-warning",
  success: "bg-success-50 text-semantic-success",
  danger: "bg-danger-50 text-semantic-danger",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AuditEventCard({ event }: { event: AuditEvent }) {
  const { locale } = useI18n();
  const meta = ACTION_META[event.action] ?? {
    icon: FileText,
    tone: "info" as AuditEventStatus,
    label: event.action,
  };
  const ActionIcon = meta.icon;

  return (
    <article
      data-slot="audit-event-card"
      className="relative flex gap-4 rounded-xl border border-border-default bg-surface-card p-4 shadow-elevation-1"
    >
      {/* Vertical timeline dot + connector */}
      <div className="flex flex-col items-center pt-1" aria-hidden>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-primary-500">
          <ActionIcon className="h-4 w-4" />
        </div>
        <div className="mt-1 w-px flex-1 bg-border-default" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <div className="min-w-0 flex-1">
            <p className="text-body font-medium text-text-primary">
              {event.description}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-caption text-text-muted">
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3" aria-hidden />
                <span className="text-text-secondary">{event.actorName}</span>
              </span>
              <span className="text-text-muted" aria-hidden>·</span>
              <span className="font-mono">{event.actorEmail}</span>
              <span className="text-text-muted" aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden />
                <span>{formatDateLong(event.timestamp, locale)}</span>
                <span className="font-mono text-text-muted">
                  {formatTime(event.timestamp, locale)}
                </span>
              </span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {event.voucherNo && (
              <Badge variant="outline" className="font-mono text-caption">
                {event.voucherNo}
              </Badge>
            )}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-medium ${STATUS_TONE_CLASS[meta.tone]}`}
            >
              <ActionIcon className="h-3 w-3" aria-hidden />
              {meta.label}
            </span>
          </div>
        </div>

        {event.diffs && event.diffs.length > 0 && (
          <div className="mt-3 space-y-1">
            {event.diffs.map((d, i) => (
              <div
                key={i}
                className="rounded-md border border-border-default bg-neutral-50 px-3 py-2 font-mono text-caption"
              >
                <span className="text-text-secondary">{d.field}:</span>{" "}
                <span className="text-semantic-danger line-through">
                  {formatDiffValue(d.oldValue, d.format, locale)}
                </span>{" "}
                <ArrowRight
                  className="inline h-3 w-3 align-text-bottom text-text-muted"
                  aria-label="changed to"
                />{" "}
                <span className="font-semibold text-semantic-success">
                  {formatDiffValue(d.newValue, d.format, locale)}
                </span>{" "}
                <span className="text-text-muted">by</span>{" "}
                <span className="font-mono">{event.actorEmail}</span>{" "}
                <span className="text-text-muted">at</span>{" "}
                <span className="font-mono">
                  {formatDateLong(event.timestamp, locale)}{" "}
                  {formatTime(event.timestamp, locale)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
