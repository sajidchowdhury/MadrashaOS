/**
 * MadrashaOS — PaymentGateway Types
 *
 * Phase 4 (P4-LIBS-1) — Pluggable Payment Library
 *
 * Provider-agnostic interfaces for initiating, verifying, and refunding
 * payments across multiple Bangladeshi payment gateways (bKash, SSL
 * Commerz) plus a Manual provider for cash/cheque/bank transfers.
 *
 * The factory in `src/lib/payments/index.ts` selects a provider per
 * payment (or defaults to `PAYMENT_DEFAULT_PROVIDER`) and caches
 * instances in a Map so a single gateway instance is reused across
 * hot-reloads.
 *
 * Status flow (canonical across all providers):
 *   initiated → pending → successful | failed | cancelled
 *                       ↘ refunded (terminal after successful)
 */

// ---------------------------------------------------------------------------
// Provider + enum types
// ---------------------------------------------------------------------------

export type GatewayProvider = "bkash" | "sslcommerz" | "manual";

/**
 * Why the payment is being collected. Drives the merchant invoice
 * number prefix and (potentially) reconciliation grouping in the
 * ledger.
 */
export type PaymentPurpose =
  | "fee_payment"
  | "donation"
  | "scholarship_disburse"
  | "zakat_disburse"
  | "fee_refund";

/**
 * Canonical payment status — every provider must map its raw status
 * onto this enum in `verify()` / `initiate()`.
 *
 *   initiated  — payment request created, customer not yet redirected
 *   pending    — customer redirected, gateway awaiting confirmation
 *   successful — gateway confirmed funds captured
 *   failed     — gateway rejected / customer cancelled at gateway
 *   cancelled  — cancelled before customer reached gateway
 *   refunded   — funds returned to customer
 */
export type PaymentStatus =
  | "initiated"
  | "pending"
  | "successful"
  | "failed"
  | "cancelled"
  | "refunded";

// ---------------------------------------------------------------------------
// Initiate payment
// ---------------------------------------------------------------------------

/**
 * Input to `IPaymentGateway.initiate()`.
 *
 * `entityId` is the foreign key on the calling domain object (e.g.
 * fee_invoice_id, donation_id). It's combined with `purpose` to build
 * a unique merchant invoice number.
 */
export interface InitiatePaymentInput {
  /** The reason for this payment — drives invoice number prefix. */
  purpose: PaymentPurpose;
  /** Foreign key on the calling domain object (invoice_id, donation_id, etc.). */
  entityId: string;
  /** Amount in BDT minor units (taka, not poisha). */
  amount: number;
  /** ISO 4217 currency — currently always "BDT" but kept for forward compat. */
  currency?: string;
  /** Customer display name. */
  customerName?: string;
  /** Customer email (some gateways require). */
  customerEmail?: string;
  /** Customer phone (bKash requires this to be a valid Bangladeshi number). */
  customerPhone?: string;
  /** Product description shown on the gateway's hosted page. */
  description?: string;
  /** Free-form metadata persisted alongside the payment record. */
  metadata?: Record<string, unknown>;
}

/**
 * Result of `initiate()`.
 *
 * `redirectUrl` — for hosted-checkout gateways (bKash, SSL Commerz),
 * the URL the frontend should navigate to (or open in a new tab).
 * For manual payments, this is empty (no redirect).
 *
 * `providerPaymentId` — the gateway's own ID for this payment (bKash
 * `paymentID`, SSL Commerz `sessionkey`). Stored on the payment row
 * so `verify()` can look it up later.
 */
export interface InitiatePaymentResult {
  status: "initiated";
  providerPaymentId: string;
  redirectUrl: string;
  expiresAt: string; // ISO 8601 — gateway sessions expire (typically 1h)
  raw?: unknown; // raw gateway response for debugging
}

// ---------------------------------------------------------------------------
// Verify payment
// ---------------------------------------------------------------------------

/**
 * Input to `verify()`. Either `providerPaymentId` (for bKash execute)
 * or `verificationKey` (for SSL Commerz `val_id`) must be provided.
 */
export interface VerifyPaymentInput {
  /** The provider's payment ID returned by `initiate()`. */
  providerPaymentId?: string;
  /** SSL Commerz val_id from the success callback URL. */
  verificationKey?: string;
  /** The amount we EXPECT to have been paid — used to detect tampering. */
  expectedAmount?: number;
  /** Free-form metadata echoed back from the gateway callback. */
  metadata?: Record<string, unknown>;
}

/**
 * Result of `verify()`. `status` is the canonical enum — the
 * implementation is responsible for mapping gateway-specific statuses
 * (e.g. bKash "completed" → "successful").
 */
export interface VerifyPaymentResult {
  status: PaymentStatus;
  /** Gateway transaction reference (bKash trxID, SSL Commerz bank_txn_id). */
  transactionRef?: string;
  /** The amount the gateway reports was captured. */
  amount?: number;
  /** ISO 8601 timestamp the gateway reports the payment was made. */
  paidAt?: string;
  /** Free-form metadata echoed from the gateway. */
  metadata?: Record<string, unknown>;
  raw?: unknown;
}

// ---------------------------------------------------------------------------
// Refund
// ---------------------------------------------------------------------------

export interface RefundInput {
  providerPaymentId: string;
  /** Transaction reference from the original successful payment. */
  transactionRef?: string;
  /** Amount to refund — defaults to the full original amount. */
  amount: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface RefundResult {
  status: "successful" | "failed" | "pending";
  refundId?: string;
  amount?: number;
  error?: string;
  raw?: unknown;
}

// ---------------------------------------------------------------------------
// Webhook verification
// ---------------------------------------------------------------------------

/**
 * Input to `verifyWebhook()`. The gateway delivers an async callback
 * after the customer completes payment; we must verify it's authentic
 * before trusting the payload.
 */
export interface VerifyWebhookInput {
  /** Raw HTTP headers (lowercased keys). */
  headers: Record<string, string>;
  /** Raw (unparsed) request body — used for HMAC signature verification. */
  rawBody: string;
  /** Parsed body (gateway-specific shape). */
  body: Record<string, unknown>;
}

export interface VerifyWebhookResult {
  valid: boolean;
  /** If valid, the canonical payment status to update our DB with. */
  status?: PaymentStatus;
  /** If valid, the gateway's transaction reference. */
  transactionRef?: string;
  /** If valid, the captured amount. */
  amount?: number;
  /** If invalid, the reason (for logging). */
  reason?: string;
  raw?: unknown;
}

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

/**
 * `IPaymentGateway` — implemented by every payment provider.
 *
 * All methods are async (HTTP I/O). The Manual provider is the only
 * one that returns synchronously-resolved results.
 */
export interface IPaymentGateway {
  /** Provider identifier ("bkash", "sslcommerz", "manual"). */
  readonly name: GatewayProvider;

  /**
   * Create a new payment session. Returns a redirect URL (for hosted
   * gateways) and the provider's payment ID to persist.
   */
  initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;

  /**
   * Verify (execute/capture) a payment after the customer returns from
   * the gateway. Maps the raw gateway response onto the canonical
   * `PaymentStatus` enum.
   */
  verify(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;

  /**
   * Refund a previously successful payment. Partial refunds are
   * supported by gateways that allow them.
   */
  refund(input: RefundInput): Promise<RefundResult>;

  /**
   * Verify the authenticity of an async webhook callback. Returns
   * `{ valid: false }` if the signature doesn't match.
   */
  verifyWebhook(input: VerifyWebhookInput): Promise<VerifyWebhookResult>;
}
