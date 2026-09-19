/**
 * MadrashaOS — NotificationService Factory
 *
 * Phase 4 (P4-LIBS-1)
 *
 * Selects a notification provider based on `NOTIFICATION_PROVIDER` env
 * var (default: "console") and caches the singleton on `globalThis` so
 * Next.js dev-mode hot reloads don't create duplicate instances.
 *
 * Supported providers:
 *   - "console"  → ConsoleNotificationService (dev default, logs to stdout)
 *   - "smtp"     → SmtpNotificationService (nodemailer, lazy-loaded)
 *   - "resend"   → ResendNotificationService (Resend HTTP API)
 *
 * `notifyEntity()` is the safe wrapper used by API routes — it swallows
 * delivery errors so a notification failure NEVER crashes the API route
 * that triggered it. The original error is logged via `console.error`.
 */

import type {
  EmailPayload,
  INotificationService,
  NotificationChannel,
  SMSPayload,
} from "./types";
import { ConsoleNotificationService } from "./providers/console";
import { SmtpNotificationService } from "./providers/smtp";
import { ResendNotificationService } from "./providers/resend";

// Re-export the public API surface — callers should import from
// "@/lib/notifications" rather than reaching into sub-paths.
export * from "./types";
export { renderTemplate, listTemplateIds } from "./templates";
export { ConsoleNotificationService } from "./providers/console";
export { SmtpNotificationService } from "./providers/smtp";
export { ResendNotificationService } from "./providers/resend";

export type NotificationProviderName = "console" | "smtp" | "resend";

// ---------------------------------------------------------------------------
// Singleton cache (survives HMR)
// ---------------------------------------------------------------------------

const globalForNotifications = globalThis as unknown as {
  __madrashaNotificationService?: INotificationService;
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Get the configured notification service singleton.
 *
 * Selection logic:
 *   1. If a cached instance exists on globalThis, return it.
 *   2. Read `NOTIFICATION_PROVIDER` env var (default "console").
 *   3. Construct the matching provider. SMTP/Resend will THROW if
 *      their required env vars are missing — this surfaces config
 *      errors at first use rather than mid-flight.
 *   4. Cache on globalThis (dev only — production is fine either way).
 */
export function getNotificationService(): INotificationService {
  if (globalForNotifications.__madrashaNotificationService) {
    return globalForNotifications.__madrashaNotificationService;
  }

  const provider = (process.env.NOTIFICATION_PROVIDER ?? "console").toLowerCase();

  let svc: INotificationService;
  switch (provider) {
    case "console":
      svc = new ConsoleNotificationService();
      break;
    case "smtp":
      svc = new SmtpNotificationService();
      break;
    case "resend":
      svc = new ResendNotificationService();
      break;
    default:
      throw new Error(
        `[NotificationService] unknown NOTIFICATION_PROVIDER="${provider}". ` +
          `Valid values: console, smtp, resend.`,
      );
  }

  globalForNotifications.__madrashaNotificationService = svc;
  return svc;
}

/**
 * Force-reset the cached singleton — used in tests after swapping env
 * vars. Not intended for production use.
 */
export function __resetNotificationServiceForTests(): void {
  globalForNotifications.__madrashaNotificationService = undefined;
}

// ---------------------------------------------------------------------------
// Safe wrapper
// ---------------------------------------------------------------------------

/**
 * Send a notification WITHOUT letting a delivery failure crash the
 * caller. This is the recommended entry point for API routes —
 * notifications are best-effort and should never roll back a
 * successful business operation.
 *
 * Errors are logged via `console.error` with the `[NotificationService]`
 * prefix so they're greppable in the dev log.
 *
 * Example:
 *   await notifyEntity("email", {
 *     to: guardian.email,
 *     templateId: "fee-payment-confirmation",
 *     templateVars: { receiptNo, studentName, amount, ... },
 *     subject: "Payment Confirmation",
 *   });
 */
export async function notifyEntity(
  channel: NotificationChannel,
  payload: EmailPayload | SMSPayload,
): Promise<void> {
  try {
    const svc = getNotificationService();
    if (channel === "email") {
      await svc.sendEmail(payload as EmailPayload);
    } else {
      await svc.sendSMS(payload as SMSPayload);
    }
  } catch (err) {
    console.error(
      "[NotificationService] delivery failed (non-blocking):",
      err,
    );
  }
}
