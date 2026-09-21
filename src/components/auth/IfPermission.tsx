"use client";

/**
 * MadrashaOS — IfPermission + IfField (Session 2.4)
 *
 * Permission-aware UI wrappers implementing SRS §5.1 "hide, don't disable":
 *   - <IfPermission code="fees.payment.create"> — renders children only if
 *     the current session has the permission; otherwise renders fallback
 *     (default: null — i.e. hidden)
 *   - <IfField code="students.notes.view"> — alias for field-level visibility
 *
 * The server still enforces authorization; these wrappers only control
 * client-side UI visibility.
 */

import { useSessionStore } from "@/stores/sessionStore";

export function IfPermission({
  code,
  fallback = null,
  children,
}: {
  code: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const hasPermission = useSessionStore((s) => s.permissions.includes(code));
  return <>{hasPermission ? children : fallback}</>;
}

/** Alias for field-level permission checks (same behavior). */
export function IfField({
  code,
  fallback = null,
  children,
}: {
  code: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <IfPermission code={code} fallback={fallback}>
      {children}
    </IfPermission>
  );
}
