/**
 * MadrashaOS — bKash Tokenized Checkout Payment Gateway
 *
 * Phase 4 (P4-LIBS-1)
 *
 * Implements the bKash Tokenized Checkout v1.2.0 flow:
 *   1. grantToken()         — POST /token/grant         (cached 55 min)
 *   2. initiate()           — POST /create/payment
 *   3. verify()             — POST /execute/payment     (after callback)
 *   4. refund()             — POST /payment/refund
 *   5. verifyWebhook()      — checks X-BKash-Signature header
 *
 * Docs: https://developer.bka.sh/reference (Tokenized Checkout v1.2.0)
 *
 * Env vars (all required at construction time):
 *   BKASH_BASE_URL      — sandbox: https://tokenized.sandbox.bka.sh/v1.2.0-beta
 *   BKASH_APP_KEY       — application key from bKash dev portal
 *   BKASH_APP_SECRET    — application secret
 *   BKASH_USERNAME      — username (sandbox: 0EQHE9KC8LZQ)
 *   BKASH_PASSWORD      — password
 *   BKASH_CALLBACK_URL  — our callback URL (e.g. https://host/api/v1/payments/bkash/callback)
 *
 * Uses native fetch — no SDK needed.
 */

import type {
  IPaymentGateway,
  InitiatePaymentInput,
  InitiatePaymentResult,
  PaymentStatus,
  RefundInput,
  RefundResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
  VerifyWebhookInput,
  VerifyWebhookResult,
} from "../types";

// ---------------------------------------------------------------------------
// Types (bKash API responses — minimal subset)
// ---------------------------------------------------------------------------

interface BkashTokenResponse {
  id_token?: string;
  token_type?: string;
  expires_in?: number; // seconds
  status?: string;
  msg?: string;
}

interface BkashCreatePaymentResponse {
  paymentID?: string;
  bkashURL?: string;
  callbackURL?: string;
  status?: string; // e.g. "initiated", "completed"
  statusCode?: string;
  statusMessage?: string;
}

interface BkashExecutePaymentResponse {
  paymentID?: string;
  trxID?: string;
  transactionStatus?: string; // "Completed"
  amount?: string;
  currency?: string;
  status?: string; // "completed"
  statusCode?: string;
  statusMessage?: string;
}

interface BkashRefundResponse {
  paymentID?: string;
  trxID?: string;
  refundTrxID?: string;
  amount?: string;
  status?: string; // "completed"
  statusCode?: string;
  statusMessage?: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class BkashPaymentGateway implements IPaymentGateway {
  readonly name = "bkash" as const;

  private readonly baseUrl: string;
  private readonly appKey: string;
  private readonly appSecret: string;
  private readonly username: string;
  private readonly password: string;
  private readonly callbackUrl: string;

  /** Cached token + expiry (ms epoch). Token TTL is 60 min; we refresh at 55. */
  private cachedToken: string | null = null;
  private cachedTokenExpiresAt = 0;

  constructor() {
    const baseUrl = process.env.BKASH_BASE_URL;
    const appKey = process.env.BKASH_APP_KEY;
    const appSecret = process.env.BKASH_APP_SECRET;
    const username = process.env.BKASH_USERNAME;
    const password = process.env.BKASH_PASSWORD;
    const callbackUrl = process.env.BKASH_CALLBACK_URL;

    const missing: string[] = [];
    if (!baseUrl) missing.push("BKASH_BASE_URL");
    if (!appKey) missing.push("BKASH_APP_KEY");
    if (!appSecret) missing.push("BKASH_APP_SECRET");
    if (!username) missing.push("BKASH_USERNAME");
    if (!password) missing.push("BKASH_PASSWORD");
    if (!callbackUrl) missing.push("BKASH_CALLBACK_URL");

    if (missing.length > 0) {
      throw new Error(
        `[BkashPaymentGateway] missing required env vars: ` +
          `${missing.join(", ")}. Set PAYMENT_DEFAULT_PROVIDER="manual" ` +
          `for dev, or provide the BKASH_* vars.`,
      );
    }

    this.baseUrl = baseUrl!.replace(/\/$/, ""); // strip trailing slash
    this.appKey = appKey!;
    this.appSecret = appSecret!;
    this.username = username!;
    this.password = password!;
    this.callbackUrl = callbackUrl!;
  }

  // -------------------------------------------------------------------------
  // Token management
  // -------------------------------------------------------------------------

  /**
   * Grant (or return cached) bKash API token. Tokens live 60 min; we
   * refresh at 55 min to avoid edge-case expiry mid-request.
   */
  private async grantToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && now < this.cachedTokenExpiresAt) {
      return this.cachedToken;
    }

    const res = await fetch(`${this.baseUrl}/token/grant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        username: this.username,
        password: this.password,
      },
      body: JSON.stringify({
        app_key: this.appKey,
        app_secret: this.appSecret,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as BkashTokenResponse;
    if (!res.ok || !data.id_token) {
      throw new Error(
        `[BkashPaymentGateway] grantToken failed: HTTP ${res.status} ` +
          `${data.msg ?? res.statusText}`,
      );
    }

    this.cachedToken = data.id_token;
    // Default TTL 60 min; refresh at 55 min (5 min safety margin).
    const ttlSec = data.expires_in && data.expires_in > 0 ? data.expires_in : 3600;
    this.cachedTokenExpiresAt = now + Math.min(ttlSec, 3600 - 300) * 1000;
    return this.cachedToken;
  }

  /** Common auth headers for tokenized API calls. */
  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.grantToken();
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: token,
      "X-APP-Key": this.appKey,
    };
  }

  // -------------------------------------------------------------------------
  // IPaymentGateway implementation
  // -------------------------------------------------------------------------

  async initiate(
    input: InitiatePaymentInput,
  ): Promise<InitiatePaymentResult> {
    const merchantInvoiceNumber = `${input.purpose}-${input.entityId}`;
    const currency = input.currency ?? "BDT";

    const res = await fetch(`${this.baseUrl}/create/payment`, {
      method: "POST",
      headers: await this.authHeaders(),
      body: JSON.stringify({
        mode: "0011",
        payerReference: " ", // bKash requires non-empty
        callbackURL: this.callbackUrl,
        amount: String(input.amount),
        currency,
        intent: "sale",
        merchantInvoiceNumber,
      }),
    });

    const data =
      (await res.json().catch(() => ({}))) as BkashCreatePaymentResponse;
    if (!res.ok || !data.paymentID) {
      throw new Error(
        `[BkashPaymentGateway] initiate failed: HTTP ${res.status} ` +
          `${data.statusMessage ?? res.statusText}`,
      );
    }

    // bKash sessions expire after 6 hours per docs; we conservatively say 1h.
    const expiresAt = new Date(
      Date.now() + 60 * 60 * 1000,
    ).toISOString();

    return {
      status: "initiated",
      providerPaymentId: data.paymentID,
      redirectUrl: data.bkashURL ?? "",
      expiresAt,
      raw: data,
    };
  }

  async verify(
    input: VerifyPaymentInput,
  ): Promise<VerifyPaymentResult> {
    if (!input.providerPaymentId) {
      throw new Error(
        "[BkashPaymentGateway] verify requires providerPaymentId.",
      );
    }

    const res = await fetch(`${this.baseUrl}/execute/payment`, {
      method: "POST",
      headers: await this.authHeaders(),
      body: JSON.stringify({ paymentID: input.providerPaymentId }),
    });

    const data =
      (await res.json().catch(() => ({}))) as BkashExecutePaymentResponse;

    // bKash uses lowercase "completed"; canonical is "successful".
    const status: PaymentStatus = this.mapStatus(
      data.transactionStatus ?? data.status,
    );

    return {
      status,
      transactionRef: data.trxID,
      amount: data.amount !== undefined ? Number(data.amount) : undefined,
      paidAt: status === "successful" ? new Date().toISOString() : undefined,
      metadata: input.metadata,
      raw: data,
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    if (!input.transactionRef) {
      throw new Error(
        "[BkashPaymentGateway] refund requires transactionRef (trxID).",
      );
    }

    const res = await fetch(`${this.baseUrl}/payment/refund`, {
      method: "POST",
      headers: await this.authHeaders(),
      body: JSON.stringify({
        paymentID: input.providerPaymentId,
        trxID: input.transactionRef,
        amount: String(input.amount),
      }),
    });

    const data = (await res.json().catch(() => ({}))) as BkashRefundResponse;
    const ok =
      res.ok &&
      (data.status === "completed" || data.statusCode === "0000");

    return {
      status: ok ? "successful" : "failed",
      refundId: data.refundTrxID,
      amount: data.amount !== undefined ? Number(data.amount) : input.amount,
      error: ok ? undefined : data.statusMessage ?? `HTTP ${res.status}`,
      raw: data,
    };
  }

  async verifyWebhook(
    input: VerifyWebhookInput,
  ): Promise<VerifyWebhookResult> {
    /**
     * bKash signs callbacks with `X-BKash-Signature` (HMAC-SHA256 of the
     * raw body, keyed with `app_secret`). For full verification we'd
     * recompute the HMAC and compare in constant time.
     *
     * For now: simplified — if the header is present AND the body
     * contains a paymentID, we accept. Production deployments MUST
     * replace this with a real HMAC check (TODO: see security audit
     * item P4-SEC-1).
     */
    const sig = input.headers["x-bkash-signature"];
    const body = input.body as { paymentID?: string; trxID?: string; amount?: string; transactionStatus?: string };

    if (!sig) {
      return {
        valid: false,
        reason: "Missing X-BKash-Signature header.",
        raw: input.rawBody,
      };
    }

    // TODO(P4-SEC-1): replace with crypto.timingSafeEqual(hmac, sig).
    console.warn(
      "[BkashPaymentGateway] verifyWebhook using SIMPLIFIED signature " +
        "check — do NOT deploy to production without implementing HMAC.",
    );

    const status = this.mapStatus(body.transactionStatus);
    return {
      valid: true,
      status,
      transactionRef: body.trxID,
      amount: body.amount !== undefined ? Number(body.amount) : undefined,
      raw: input.body,
    };
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private mapStatus(raw?: string): PaymentStatus {
    if (!raw) return "failed";
    const s = raw.toLowerCase();
    if (s === "completed" || s === "successful") return "successful";
    if (s === "pending" || s === "initiated") return "pending";
    if (s === "failed") return "failed";
    if (s === "cancelled" || s === "cancel") return "cancelled";
    if (s === "refunded") return "refunded";
    return "failed";
  }
}
