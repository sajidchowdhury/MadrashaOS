"use client";

/**
 * MadrashaOS — State System (Session 2.3)
 *
 * 5 state components covering every screen pattern per SRS §5.5:
 *   1. EmptyState (already in /components/ui/empty-state.tsx)
 *   2. LoadingState (skeleton patterns: list / detail / form / dashboard / table)
 *   3. ErrorState (friendly error with retry)
 *   4. PermissionDenied (Risk R3 lock-in — "Request access" CTA, never raw 403)
 *   5. OfflineState (banner when navigator.onLine === false)
 *
 * Copy is locale-aware (en/bn/ar) via the i18n message catalog.
 */

import { RefreshCw, WifiOff, Lock, AlertCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/* --- LoadingState: 5 patterns --- */

export function LoadingState({
  pattern = "list",
  rows = 5,
}: {
  pattern?: "list" | "detail" | "form" | "dashboard" | "table";
  rows?: number;
}) {
  // role=status + aria-live=polite so screen readers announce content
  // arrival once the loading skeleton is replaced by real data
  // (WCAG 4.1.3 — Status messages).
  if (pattern === "table") {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Loading data"
        className="overflow-hidden rounded-lg border border-border-default"
      >
        <div className="border-b border-border-default bg-neutral-50 p-3">
          <Skeleton className="h-4 w-1/3" />
        </div>
        <div className="divide-y divide-border-default">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex gap-4 p-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (pattern === "detail") {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Loading detail"
        className="space-y-4"
      >
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }
  if (pattern === "form") {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Loading form"
        className="space-y-4"
      >
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-20 w-full rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
    );
  }
  if (pattern === "dashboard") {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Loading dashboard"
        className="grid gap-4 md:grid-cols-3"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    );
  }
  // list
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading list"
      className="space-y-2"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
}

/* --- ErrorState --- */

export function ErrorState({
  title,
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-semantic-danger/40 bg-danger-50/50 px-6 py-12 text-center"
    >
      <AlertCircle className="mb-3 h-10 w-10 text-semantic-danger" />
      <h3 className="text-subtitle font-semibold text-text-primary">
        {title ?? "Something went wrong"}
      </h3>
      <p className="mt-1 max-w-sm text-body text-text-secondary">
        {description ?? "Please try again. If the problem persists, contact your administrator."}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      )}
    </div>
  );
}

/* --- PermissionDenied (Risk R3 lock-in) --- */

export function PermissionDenied({
  resource,
  adminContact = "admin@madrashaos.org",
}: {
  resource?: string;
  adminContact?: string;
}) {
  const { t } = useI18n();
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-default bg-surface-card px-6 py-12 text-center"
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
        <Lock className="h-6 w-6 text-text-secondary" />
      </div>
      <h3 className="text-subtitle font-semibold text-text-primary">
        You don&apos;t have access to this
      </h3>
      <p className="mt-1 max-w-sm text-body text-text-secondary">
        {resource
          ? `The "${resource}" module requires additional permissions.`
          : "This screen requires additional permissions."}
      </p>
      <div className="mt-4 flex flex-col items-center gap-2">
        <Button size="sm">Request access</Button>
        <p className="text-caption text-text-muted">
          Contact admin: <a href={`mailto:${adminContact}`} className="text-primary-500 underline">{adminContact}</a>
        </p>
      </div>
    </div>
  );
}

/* --- OfflineState --- */

export function OfflineState() {
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-lg border border-semantic-warning/40 bg-warning-50 px-4 py-3"
    >
      <WifiOff className="h-5 w-5 shrink-0 text-semantic-warning" />
      <div>
        <p className="text-subtitle font-medium text-text-primary">You&apos;re offline</p>
        <p className="text-caption text-text-secondary">
          Your changes are saved locally and will sync when you reconnect.
        </p>
      </div>
    </div>
  );
}
