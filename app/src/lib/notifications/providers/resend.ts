/**
 * MadrashaOS — Resend Notification Provider
 *
 * Phase 4 (P4-LIBS-1)
 *
 * Sends email through the Resend HTTP API (https://resend.com).
 * No SDK dependency — uses plain `fetch` with the REST endpoint
 * `POST https://api.resend.com/emails`.
 *
 * SMS is NOT supported by Resend — `sendSMS()` returns a clear failure
 * (same approach as the SMTP provider).
 *
 * Env vars:
 *   RESEND_API_KEY  — required (sk_...)
 *   EMAIL_FROM      — required default From ("Name <addr@host>")
 *
 * If either is missing, the constructor throws at startup so the
 * misconfiguration is caught immediately rather than on first send.
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

const RESEND_API_URL = "https://api.resend.com/emails";

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ResendNotificationService implements INotificationService {
  readonly name = "resend";

  private readonly apiKey: string;
  private readonly from: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;

    const missing: string[] = [];
    if (!apiKey) missing.push("RESEND_API_KEY");
    if (!from) missing.push("EMAIL_FROM");

    if (missing.length > 0) {
      throw new Error(
        `[ResendNotificationService] missing required env vars: ` +
          `${missing.join(", ")}. Set NOTIFICATION_PROVIDER="console" ` +
          `for dev, or provide the Resend creds.`,
      );
    }

    this.apiKey = apiKey!;
    this.from = from!;
  }

  async sendEmail(payload: EmailPayload): Promise<NotificationResult> {
    const attemptedAt = new Date().toISOString();
    try {
      let subject = payload.subject;
      let html = payload.html;
      let text = payload.text;
      if (payload.templateId) {
        const rendered = renderTemplate(
          payload.templateId,
          payload.templateVars ?? {},
        );
        subject = rendered.subject;
        html = rendered.html ?? html;
        text = rendered.text ?? text;
      }

      const body: Record<string, unknown> = {
        from: this.resolveFrom(payload.from),
        to: toAddressArray(payload.to),
        subject,
      };
      if (payload.cc) body.cc = toAddressArray(payload.cc);
      if (payload.bcc) body.bcc = toAddressArray(payload.bcc);
      if (html) body.html = html;
      if (text) body.text = text;
      if (payload.attachments?.length) {
        body.attachments = payload.attachments.map((a) => ({
          filename: a.filename,
          content:
            a.content instanceof Buffer
              ? a.content.toString("base64")
              : Buffer.from(a.content).toString("base64"),
        }));
      }

      const res = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
      };

      if (!res.ok) {
        return {
          success: false,
          channel: "email",
          status: "failed",
          error:
            data.message ??
            `Resend API returned HTTP ${res.status} ${res.statusText}`,
          attemptedAt,
        };
      }

      return {
        success: true,
        channel: "email",
        messageId: data.id,
        status: "sent",
        attemptedAt,
      };
    } catch (err) {
      return {
        success: false,
        channel: "email",
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        attemptedAt,
      };
    }
  }

  /** Resend does not support SMS. */
  async sendSMS(_payload: SMSPayload): Promise<NotificationResult> {
    return {
      success: false,
      channel: "sms",
      status: "failed",
      error:
        "ResendNotificationService does not support SMS. " +
        "Set SMS_PROVIDER to a SMS-capable provider.",
      attemptedAt: new Date().toISOString(),
    };
  }

  async sendBulkEmail(
    payloads: EmailPayload[],
  ): Promise<BulkNotificationResult> {
    const results: NotificationResult[] = [];
    for (const p of payloads) {
      results.push(await this.sendEmail(p));
    }
    const succeeded = results.filter((r) => r.success).length;
    return {
      total: results.length,
      succeeded,
      failed: results.length - succeeded,
      results,
    };
  }

  async sendBulkSMS(
    payloads: SMSPayload[],
  ): Promise<BulkNotificationResult> {
    const results: NotificationResult[] = [];
    for (const p of payloads) {
      results.push(await this.sendSMS(p));
    }
    const succeeded = results.filter((r) => r.success).length;
    return {
      total: results.length,
      succeeded,
      failed: results.length - succeeded,
      results,
    };
  }

  async notifyGuardian(guardian: {
    name?: string;
    email?: string;
    phone?: string;
    channels?: ("email" | "sms")[];
    payload: EmailPayload | SMSPayload;
  }): Promise<NotificationResult[]> {
    const channels = guardian.channels ?? ["email"];
    const out: NotificationResult[] = [];

    if (
      channels.includes("email") &&
      guardian.email &&
      "subject" in guardian.payload
    ) {
      out.push(
        await this.sendEmail({
          ...(guardian.payload as EmailPayload),
          to: guardian.email,
        }),
      );
    }
    if (channels.includes("sms") && guardian.phone) {
      out.push(await this.sendSMS({} as SMSPayload));
    }
    return out;
  }

  renderTemplate(
    templateId: string,
    vars?: Record<string, string | number | undefined | null>,
  ) {
    return renderTemplate(templateId, vars ?? {});
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private resolveFrom(from?: EmailPayload["from"]): string {
    if (!from) return this.from;
    if (typeof from === "string") return from;
    return formatAddress(from as EmailAddress);
  }
}

// ---------------------------------------------------------------------------
// Helpers (module-level — shared with smtp provider pattern)
// ---------------------------------------------------------------------------

function formatAddress(addr: EmailAddress): string {
  return addr.name ? `${addr.name} <${addr.to}>` : addr.to;
}

function toAddressArray(
  to: EmailPayload["to"],
): string[] {
  if (typeof to === "string") return [to];
  if (Array.isArray(to)) {
    return to.map((r) =>
      typeof r === "string" ? r : formatAddress(r as EmailAddress),
    );
  }
  return [formatAddress(to as EmailAddress)];
}
