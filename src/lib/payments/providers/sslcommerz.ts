/**
 * MadrashaOS — SSL Commerz EasyCheckout Payment Gateway
 *
 * Phase 4 (P4-LIBS-1)
 *
 * Implements the SSL Commerz EasyCheckout v4 flow:
 *   1. initiate()     — POST /gwprocess/v4/api.php
 *                       returns GatewayPageURL + sessionkey
 *   2. verify()       — POST /validator/api/validationserver.php
 *                       with val_id (from success callback URL)
 *   3. refund()       — POST /validator/api/merchantValidation.php
 *                       (simplified)
 *   4. verifyWebhook() — checks verify_key / verify_sign (simplified)
 *
 * Docs: https://developer.sslcommerz.com/
 *
 * Env vars (all required at construction time):
 *   SSLCOMMERZ_BASE_URL       — sandbox: https://sandbox-sslcommerz.com
 *   SSLCOMMERZ_STORE_ID       — store ID from SSL Commerz dashboard
 *   SSLCOMMERZ_STORE_PASSWORD — store password
 *   SSLCOMMERZ_CALLBACK_URL   — our base callback URL
 *                               (SSL Commerz appends /success, /fail, /cancel)
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
// Types (SSL Commerz API responses — minimal subset)
// ---------------------------------------------------------------------------

interface SslInitiateResponse {
  status?: string; // "SUCCESS" | "FAILED"
  failedreason?: string;
  sessionkey?: string;
  GatewayPageURL?: string;
  storeBanner?: string;
  desc?: string;
}

interface SslValidationResponse {
  status?: string; // "VALID" | "INVALID"
  tran_id?: string;
  bank_txn_id?: string;
  amount?: string;
  card_type?: string;
  card_no?: string;
  currency?: string;
  card_issuer?: string;
  card_brand?: string;
  risk_level?: string;
  status_message?: string;
}

interface SslRefundResponse {
  status?: string; // "SUCCESS" | "FAILED"
  status_message?: string;
  refund_id?: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class SslCommerzPaymentGateway implements IPaymentGateway {
  readonly name = "sslcommerz" as const;

  private readonly baseUrl: string;
  private readonly storeId: string;
  private readonly storePassword: string;
  private readonly callbackUrl: string;

  constructor() {
    const baseUrl = process.env.SSLCOMMERZ_BASE_URL;
    const storeId = process.env.SSLCOMMERZ_STORE_ID;
    const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
    const callbackUrl = process.env.SSLCOMMERZ_CALLBACK_URL;

    const missing: string[] = [];
    if (!baseUrl) missing.push("SSLCOMMERZ_BASE_URL");
    if (!storeId) missing.push("SSLCOMMERZ_STORE_ID");
    if (!storePassword) missing.push("SSLCOMMERZ_STORE_PASSWORD");
    if (!callbackUrl) missing.push("SSLCOMMERZ_CALLBACK_URL");

    if (missing.length > 0) {
      throw new Error(
        `[SslCommerzPaymentGateway] missing required env vars: ` +
          `${missing.join(", ")}. Set PAYMENT_DEFAULT_PROVIDER="manual" ` +
          `for dev, or provide the SSLCOMMERZ_* vars.`,
      );
    }

    this.baseUrl = baseUrl!.replace(/\/$/, "");
    this.storeId = storeId!;
    this.storePassword = storePassword!;
    this.callbackUrl = callbackUrl!;
  }

  // -------------------------------------------------------------------------
  // IPaymentGateway implementation
  // -------------------------------------------------------------------------

  async initiate(
    input: InitiatePaymentInput,
  ): Promise<InitiatePaymentResult> {
    // SSL Commerz requires a unique tran_id per payment — we use
    // the same {purpose}-{entityId} convention as bKash.
    const tranId = `${input.purpose}-${input.entityId}`;
    const currency = input.currency ?? "BDT";

    // SSL Commerz requires success_url, fail_url, cancel_url — all 3.
    const successUrl = `${this.callbackUrl}/success`;
    const failUrl = `${this.callbackUrl}/fail`;
    const cancelUrl = `${this.callbackUrl}/cancel`;

    const form = new URLSearchParams({
      store_id: this.storeId,
      store_passwd: this.storePassword,
      total_amount: String(input.amount),
      currency,
      tran_id: tranId,
      success_url: successUrl,
      fail_url: failUrl,
      cancel_url: cancelUrl,
      cus_name: input.customerName ?? "Customer",
      cus_email: input.customerEmail ?? "customer@madrashaos.org",
      cus_phone: input.customerPhone ?? "00000000000",
      cus_add1: input.description ?? "N/A",
      cus_city: "Dhaka",
      cus_country: "Bangladesh",
      product_name: input.purpose,
      product_category: "general",
      product_profile: "general",
    });

    const res = await fetch(`${this.baseUrl}/gwprocess/v4/api.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: form.toString(),
    });

    const data = (await res.json().catch(() => ({}))) as SslInitiateResponse;
    if (!res.ok || data.status !== "SUCCESS" || !data.sessionkey) {
      throw new Error(
        `[SslCommerzPaymentGateway] initiate failed: HTTP ${res.status} ` +
          `${data.failedreason ?? res.statusText}`,
      );
    }

    const expiresAt = new Date(
      Date.now() + 60 * 60 * 1000,
    ).toISOString();

    return {
      status: "initiated",
      // SSL Commerz calls this sessionkey — we expose it as providerPaymentId
      // for consistency across providers.
      providerPaymentId: data.sessionkey,
      redirectUrl: data.GatewayPageURL ?? "",
      expiresAt,
      raw: data,
    };
  }

  async verify(
    input: VerifyPaymentInput,
  ): Promise<VerifyPaymentResult> {
    if (!input.verificationKey) {
      throw new Error(
        "[SslCommerzPaymentGateway] verify requires verificationKey (val_id).",
      );
    }

    const form = new URLSearchParams({
      store_id: this.storeId,
      store_passwd: this.storePassword,
      val_id: input.verificationKey,
      v: "1",
      format: "json",
    });

    const res = await fetch(
      `${this.baseUrl}/validator/api/validationserver.php`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: form.toString(),
      },
    );

    const data = (await res.json().catch(() => ({}))) as SslValidationResponse;
    const status: PaymentStatus = this.mapStatus(data.status, data.risk_level);

    // Verify amount matches expected (tamper check).
    if (
      input.expectedAmount !== undefined &&
      data.amount !== undefined &&
      Number(data.amount) !== input.expectedAmount
    ) {
      return {
        status: "failed",
        transactionRef: data.tran_id,
        amount: data.amount !== undefined ? Number(data.amount) : undefined,
        metadata: input.metadata,
        raw: data,
      };
    }

    return {
      status,
      transactionRef: data.bank_txn_id ?? data.tran_id,
      amount: data.amount !== undefined ? Number(data.amount) : undefined,
      paidAt: status === "successful" ? new Date().toISOString() : undefined,
      metadata: input.metadata,
      raw: data,
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    /**
     * SSL Commerz refund API uses the merchantValidation endpoint with
     * bank_txn_id + refund_amount + refund_remarks. This is simplified —
     * the real API has separate refund initiation + refund status
     * endpoints that should be wired in production.
     */
    const form = new URLSearchParams({
      store_id: this.storeId,
      store_passwd: this.storePassword,
      bank_txn_id: input.transactionRef ?? "",
      refund_amount: String(input.amount),
      refund_remarks: input.reason ?? "Customer refund",
    });

    const res = await fetch(
      `${this.baseUrl}/validator/api/merchantValidation.php`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: form.toString(),
      },
    );

    const data = (await res.json().catch(() => ({}))) as SslRefundResponse;
    const ok = res.ok && data.status === "SUCCESS";

    return {
      status: ok ? "successful" : "failed",
      refundId: data.refund_id,
      amount: input.amount,
      error: ok ? undefined : data.status_message ?? `HTTP ${res.status}`,
      raw: data,
    };
  }

  async verifyWebhook(
    input: VerifyWebhookInput,
  ): Promise<VerifyWebhookResult> {
    /**
     * SSL Commerz callbacks include `verify_key` + `verify_sign` — a
     * sorted-key HMAC of the request params. Full verification requires
     * recomputing the HMAC using `store_passwd` as the key.
     *
     * For now: simplified — accept if both fields are present and
     * status indicates success. Production MUST replace with a real
     * HMAC check (TODO: see security audit item P4-SEC-2).
     */
    const body = input.body as {
      verify_key?: string;
      verify_sign?: string;
      status?: string;
      tran_id?: string;
      bank_txn_id?: string;
      amount?: string;
      val_id?: string;
    };

    if (!body.verify_key || !body.verify_sign) {
      return {
        valid: false,
        reason: "Missing verify_key / verify_sign in SSL Commerz callback.",
        raw: input.body,
      };
    }

    // TODO(P4-SEC-2): replace with crypto.createHmac("sha256", storePassword)
    //   .update(sortedQuerystring).digest("hex") comparison.
    console.warn(
      "[SslCommerzPaymentGateway] verifyWebhook using SIMPLIFIED " +
        "verify_key/verify_sign check — do NOT deploy to production.",
    );

    const status = this.mapStatus(body.status);
    return {
      valid: true,
      status,
      transactionRef: body.bank_txn_id ?? body.tran_id,
      amount: body.amount !== undefined ? Number(body.amount) : undefined,
      raw: input.body,
    };
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private mapStatus(raw?: string, riskLevel?: string): PaymentStatus {
    if (!raw) return "failed";
    const s = raw.toLowerCase();
    if (s === "valid" || s === "success" || s === "successful") {
      // High-risk payments should be flagged for manual review, but we
      // still report them as "successful" here — the caller can inspect
      // `raw.risk_level` to decide whether to hold for review.
      return riskLevel === "high" ? "pending" : "successful";
    }
    if (s === "pending") return "pending";
    if (s === "failed" || s === "invalid") return "failed";
    if (s === "cancelled" || s === "cancel") return "cancelled";
    if (s === "refunded") return "refunded";
    return "failed";
  }
}
