/**
 * MadrashaOS — SMTP Notification Provider (via nodemailer)
 *
 * Phase 4 (P4-LIBS-1)
 *
 * Sends email through any SMTP server (Gmail, Mailgun SMTP, Amazon SES
 * SMTP, self-hosted Postfix, etc.). SMS is NOT supported by this
 * provider — calling `sendSMS()` returns a failed result with a clear
 * error. Callers that need SMS should wire up a separate SMS provider
 * (the factory picks ONE provider per channel; a future refactor could
 * split into per-channel factories if needed).
 *
 * nodemailer is loaded via dynamic `await import("nodemailer")` so the
 * package is only required when this provider is actually selected
 * (`NOTIFICATION_PROVIDER=smtp`). This keeps the default dev bundle
 * slim and means teams using Resend don't need to install nodemailer.
 *
 * Env vars (all required at construction time):
 *   SMTP_HOST       — e.g. smtp.gmail.com
 *   SMTP_PORT       — e.g. 587 (STARTTLS) or 465 (implicit TLS)
 *   SMTP_SECURE     — "true" for port 465, "false" otherwise
 *   SMTP_USER       — username
 *   SMTP_PASSWORD   — password (or app-specific password)
 *   EMAIL_FROM      — default From address
 *   EMAIL_REPLY_TO  — (optional) Reply-To header
 *
 * If any required env is missing, the constructor throws immediately —
 * we fail loud at startup, not silently at first send.
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
// Types
// ---------------------------------------------------------------------------

/** Minimal nodemailer shape — only what we use. */
interface NodemailerTransporter {
  sendMail(opts: {
    from?: string;
    to?: string;
    cc?: string;
    bcc?: string;
    subject?: string;
    text?: string;
    html?: string;
    replyTo?: string;
    attachments?: Array<{
      filename: string;
      content: Buffer | Uint8Array;
      contentType?: string;
      cid?: string;
    }>;
  }): Promise<{ messageId: string }>;
  verify?(): Promise<true>;
}

interface NodemailerModule {
  createTransport(opts: {
    host: string;
    port: number;
    secure: boolean;
    auth: { user: string; pass: string };
  }): NodemailerTransporter;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class SmtpNotificationService implements INotificationService {
  readonly name = "smtp";

  private readonly host: string;
  private readonly port: number;
  private readonly secure: boolean;
  private readonly user: string;
  private readonly password: string;
  private readonly from: string;
  private readonly replyTo?: string;

  private transporter: NodemailerTransporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const portStr = process.env.SMTP_PORT;
    const secureStr = process.env.SMTP_SECURE;
    const user = process.env.SMTP_USER;
    const password = process.env.SMTP_PASSWORD;
    const from = process.env.EMAIL_FROM;
    const replyTo = process.env.EMAIL_REPLY_TO;

    const missing: string[] = [];
    if (!host) missing.push("SMTP_HOST");
    if (!portStr) missing.push("SMTP_PORT");
    if (!user) missing.push("SMTP_USER");
    if (!password) missing.push("SMTP_PASSWORD");
    if (!from) missing.push("EMAIL_FROM");

    if (missing.length > 0) {
      throw new Error(
        `[SmtpNotificationService] missing required env vars: ` +
          `${missing.join(", ")}. Set NOTIFICATION_PROVIDER="console" ` +
          `for dev, or provide the SMTP_* vars.`,
      );
    }

    this.host = host!;
    this.port = parseInt(portStr!, 10);
    if (Number.isNaN(this.port)) {
      throw new Error(
        `[SmtpNotificationService] SMTP_PORT "${portStr}" is not a number.`,
      );
    }
    this.secure = secureStr === "true";
    this.user = user!;
    this.password = password!;
    this.from = from!;
    this.replyTo = replyTo || undefined;
  }

  /**
   * Lazy-load nodemailer and create the transporter. We do this on first
   * send rather than in the constructor so the constructor stays sync
   * (and the `await import()` doesn't surprise callers).
   */
  private async getTransporter(): Promise<NodemailerTransporter> {
    if (this.transporter) return this.transporter;

    // Dynamic import — nodemailer is an optional peer dep.
    const mod = (await import("nodemailer")) as unknown as {
      default?: NodemailerModule;
    } & NodemailerModule;
    const nodemailer: NodemailerModule =
      (mod as { default?: NodemailerModule }).default ?? (mod as NodemailerModule);

    if (!nodemailer || typeof nodemailer.createTransport !== "function") {
      throw new Error(
        "[SmtpNotificationService] nodemailer is not installed. " +
          "Run `bun add nodemailer @types/nodemailer` or switch to " +
          "NOTIFICATION_PROVIDER=\"console\".",
      );
    }

    this.transporter = nodemailer.createTransport({
      host: this.host,
      port: this.port,
      secure: this.secure,
      auth: { user: this.user, pass: this.password },
    });

    return this.transporter;
  }

  async sendEmail(payload: EmailPayload): Promise<NotificationResult> {
    const attemptedAt = new Date().toISOString();
    try {
      const transporter = await this.getTransporter();

      // Resolve template if requested.
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

      const info = await transporter.sendMail({
        from: this.fromAddressString(payload.from),
        to: toAddressString(payload.to),
        cc: payload.cc ? toAddressString(payload.cc) : undefined,
        bcc: payload.bcc ? toAddressString(payload.bcc) : undefined,
        subject,
        text,
        html,
        replyTo: this.replyTo,
        attachments: payload.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
          cid: a.cid,
        })),
      });

      return {
        success: true,
        channel: "email",
        messageId: info.messageId,
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

  /**
   * SMTP providers do not handle SMS. Return a clear failure so callers
   * know to wire up a dedicated SMS provider.
   */
  async sendSMS(_payload: SMSPayload): Promise<NotificationResult> {
    return {
      success: false,
      channel: "sms",
      status: "failed",
      error:
        "SmtpNotificationService does not support SMS. " +
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

  private fromAddressString(from?: EmailPayload["from"]): string {
    if (!from) return this.from;
    if (typeof from === "string") return from;
    return formatAddress(from as EmailAddress);
  }
}

/** Render EmailAddress → "Name <addr@host>" or just "addr@host". */
function formatAddress(addr: EmailAddress): string {
  return addr.name ? `${addr.name} <${addr.to}>` : addr.to;
}

/** Render `to` (string | string[] | EmailAddress | EmailAddress[]) → CSV. */
function toAddressString(to: EmailPayload["to"]): string {
  if (typeof to === "string") return to;
  if (Array.isArray(to)) {
    return to
      .map((r) =>
        typeof r === "string" ? r : formatAddress(r as EmailAddress),
      )
      .join(",");
  }
  return formatAddress(to as EmailAddress);
}
