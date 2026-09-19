/**
 * MadrashaOS — NotificationService Types
 *
 * Phase 4 (P4-LIBS-1) — Pluggable Notification Library
 *
 * Provider-agnostic interfaces for sending email and SMS. Every concrete
 * provider (Console, SMTP, Resend, future SMS gateway) implements
 * `INotificationService` so that callers (API routes, webhooks, cron
 * jobs) never need to know which transport is wired up.
 *
 * The factory in `src/lib/notifications/index.ts` selects a provider
 * from the `NOTIFICATION_PROVIDER` env var and caches a singleton —
 * so the same provider instance is reused across hot-reloads.
 *
 * Bangla content: payloads accept arbitrary strings; we do NOT
 * transliterate or encode. Inline HTML is allowed in `html`.
 */

// ---------------------------------------------------------------------------
// Primitive types
// ---------------------------------------------------------------------------

export type NotificationChannel = "email" | "sms";

/** A single email recipient (display name optional). */
export interface EmailAddress {
  to: string;
  name?: string;
}

/** A file attached to an email. `content` is raw bytes (Buffer or Uint8Array). */
export interface EmailAttachment {
  filename: string;
  content: Buffer | Uint8Array;
  contentType?: string;
  cid?: string; // inline content-id for embedded images
}

/**
 * Email payload — channel-agnostic. Either `text` or `html` (or both)
 * should be provided. If `templateId` is set, the template engine renders
 * subject/html/text from `templateVars` and overrides the inline fields.
 */
export interface EmailPayload {
  to: string | string[] | EmailAddress | EmailAddress[];
  cc?: string | string[] | EmailAddress | EmailAddress[];
  bcc?: string | string[] | EmailAddress | EmailAddress[];
  from?: string | EmailAddress;
  subject: string;
  text?: string;
  html?: string;
  /** Template ID — looked up in the registry (templates.ts). */
  templateId?: string;
  /** Vars substituted into the template. */
  templateVars?: Record<string, string | number | undefined | null>;
  attachments?: EmailAttachment[];
  /** Free-form metadata passed through to the provider (e.g. tenantId, userId). */
  metadata?: Record<string, unknown>;
}

/** SMS payload — single recipient, single body. */
export interface SMSPayload {
  to: string;
  body: string;
  templateId?: string;
  templateVars?: Record<string, string | number | undefined | null>;
  metadata?: Record<string, unknown>;
}

/**
 * Result of a single notification attempt.
 *
 * `status` is the provider-agnostic status:
 *   - "sent"      — accepted by the provider (delivery not yet confirmed)
 *   - "queued"    — accepted but provider is batching
 *   - "delivered" — provider confirmed delivery (rare for SMS gateways)
 *   - "failed"    — provider rejected; see `error`
 */
export interface NotificationResult {
  success: boolean;
  channel: NotificationChannel;
  messageId?: string;
  status: "sent" | "queued" | "delivered" | "failed";
  error?: string;
  attemptedAt: string; // ISO 8601
}

/** Aggregated result for bulk sends. */
export interface BulkNotificationResult {
  total: number;
  succeeded: number;
  failed: number;
  results: NotificationResult[];
}

/**
 * Rendered template — returned by `renderTemplate()`.
 * Either `html` or `text` may be undefined if a template only defines
 * one of them (rare; most define both for MIME multipart).
 */
export interface RenderedTemplate {
  subject: string;
  html?: string;
  text?: string;
}

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

/**
 * `INotificationService` — implemented by every provider.
 *
 * All methods are async because every real provider performs I/O
 * (HTTP, SMTP socket, etc.). The Console provider is the only one
 * that resolves synchronously.
 */
export interface INotificationService {
  /** Provider identifier (e.g. "console", "smtp", "resend"). */
  readonly name: string;

  /** Send a single email. */
  sendEmail(payload: EmailPayload): Promise<NotificationResult>;

  /** Send a single SMS. */
  sendSMS(payload: SMSPayload): Promise<NotificationResult>;

  /**
   * Send the same email body to N recipients. Providers may use a
   * bulk API (e.g. Resend batch endpoint) for efficiency.
   */
  sendBulkEmail(payloads: EmailPayload[]): Promise<BulkNotificationResult>;

  /** Send the same SMS body to N recipients. */
  sendBulkSMS(payloads: SMSPayload[]): Promise<BulkNotificationResult>;

  /**
   * Convenience: notify a guardian via their preferred channel.
   * `guardian` carries the contact info; the implementation decides
   * whether to send email, SMS, or both based on `guardian.channels`.
   */
  notifyGuardian(guardian: {
    name?: string;
    email?: string;
    phone?: string;
    channels?: NotificationChannel[];
    payload: EmailPayload | SMSPayload;
  }): Promise<NotificationResult[]>;

  /**
   * Render a template by ID with the given vars. Returns the
   * subject/html/text triple. If the template ID is unknown, throws
   * with a clear error (callers should catch).
   */
  renderTemplate(
    templateId: string,
    vars?: Record<string, string | number | undefined | null>,
  ): RenderedTemplate;
}
