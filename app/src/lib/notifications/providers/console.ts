/**
 * MadrashaOS — Console Notification Provider (DEV)
 *
 * Phase 4 (P4-LIBS-1)
 *
 * The default dev provider. Logs every notification to stdout in a
 * structured, greppable format and resolves with `success: true`.
 *
 * This is what `NOTIFICATION_PROVIDER="console"` (the default) routes to.
 * It is also the safest provider for tests — no network, no API keys,
 * no rate limits.
 *
 * Output format (one line per call):
 *   [NOTIFICATION:email] to=<addr> subject="<subj>" template=<id|-> metadata=<json|->
 *   [NOTIFICATION:sms]   to=<addr> body="<body>" metadata=<json|->
 */

import type {
  BulkNotificationResult,
  EmailAddress,
  EmailPayload,
  INotificationService,
  NotificationResult,
  SMSPayload,
} from "../types";
import { renderTemplate } from "../templates";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalize `to` field to a comma-separated string of addresses. */
function normalizeRecipients(
  to: EmailPayload["to"],
): string {
  if (typeof to === "string") return to;
  if (Array.isArray(to)) {
    return to
      .map((r) =>
        typeof r === "string" ? r : (r as EmailAddress).to,
      )
      .join(",");
  }
  // Single EmailAddress object
  return (to as EmailAddress).to;
}

function nowIso(): string {
  return new Date().toISOString();
}

function consoleMessageId(): string {
  return `console-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ConsoleNotificationService implements INotificationService {
  readonly name = "console";

  async sendEmail(payload: EmailPayload): Promise<NotificationResult> {
    const to = normalizeRecipients(payload.to);

    // If a templateId is provided, render it (so dev can preview the
    // rendered subject/body in the log).
    let subject = payload.subject;
    if (payload.templateId) {
      try {
        const rendered = renderTemplate(
          payload.templateId,
          payload.templateVars ?? {},
        );
        subject = rendered.subject;
      } catch {
        // If template is unknown, fall through to the literal subject.
      }
    }

    const metadataStr = payload.metadata
      ? JSON.stringify(payload.metadata)
      : "-";

    console.log(
      `[NOTIFICATION:email] to=${to} subject="${subject}" ` +
        `template=${payload.templateId ?? "-"} metadata=${metadataStr}`,
    );

    return {
      success: true,
      channel: "email",
      messageId: consoleMessageId(),
      status: "sent",
      attemptedAt: nowIso(),
    };
  }

  async sendSMS(payload: SMSPayload): Promise<NotificationResult> {
    const metadataStr = payload.metadata
      ? JSON.stringify(payload.metadata)
      : "-";

    console.log(
      `[NOTIFICATION:sms] to=${payload.to} body="${payload.body}" ` +
        `metadata=${metadataStr}`,
    );

    return {
      success: true,
      channel: "sms",
      messageId: consoleMessageId(),
      status: "sent",
      attemptedAt: nowIso(),
    };
  }

  async sendBulkEmail(
    payloads: EmailPayload[],
  ): Promise<BulkNotificationResult> {
    const results: NotificationResult[] = [];
    for (const p of payloads) {
      results.push(await this.sendEmail(p));
    }
    return aggregateBulk(results);
  }

  async sendBulkSMS(
    payloads: SMSPayload[],
  ): Promise<BulkNotificationResult> {
    const results: NotificationResult[] = [];
    for (const p of payloads) {
      results.push(await this.sendSMS(p));
    }
    return aggregateBulk(results);
  }

  async notifyGuardian(guardian: {
    name?: string;
    email?: string;
    phone?: string;
    channels?: ("email" | "sms")[];
    payload: EmailPayload | SMSPayload;
  }): Promise<NotificationResult[]> {
    const channels = guardian.channels ?? ["email", "sms"];
    const out: NotificationResult[] = [];

    if (
      channels.includes("email") &&
      guardian.email &&
      "subject" in guardian.payload
    ) {
      const emailPayload: EmailPayload = {
        ...(guardian.payload as EmailPayload),
        to: guardian.email,
      };
      out.push(await this.sendEmail(emailPayload));
    }

    if (
      channels.includes("sms") &&
      guardian.phone &&
      "body" in guardian.payload
    ) {
      const smsPayload: SMSPayload = {
        ...(guardian.payload as SMSPayload),
        to: guardian.phone,
      };
      out.push(await this.sendSMS(smsPayload));
    }

    return out;
  }

  renderTemplate(
    templateId: string,
    vars?: Record<string, string | number | undefined | null>,
  ) {
    return renderTemplate(templateId, vars ?? {});
  }
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function aggregateBulk(
  results: NotificationResult[],
): BulkNotificationResult {
  const succeeded = results.filter((r) => r.success).length;
  return {
    total: results.length,
    succeeded,
    failed: results.length - succeeded,
    results,
  };
}
