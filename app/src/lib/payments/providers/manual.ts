/**
 * MadrashaOS — Manual Payment Gateway
 *
 * Phase 4 (P4-LIBS-1)
 *
 * For cash, bank transfers, and cheques — payments collected outside
 * any electronic gateway. The system records the payment manually
 * (with receipt number, mode, and optional reference) and trusts the
 * operator who entered it.
 *
 * This is the default provider (`PAYMENT_DEFAULT_PROVIDER="manual"`)
 * and the right choice for dev — no external API calls, no creds, no
 * network.
 *
 * Behaviour:
 *   - `initiate()`  → status "initiated", providerPaymentId "manual-{uuid}"
 *   - `verify()`    → always "successful" (operator is trusted)
 *   - `refund()`    → always "successful" (just records the refund)
 *   - `verifyWebhook()` → always `{ valid: false }` (manual has no webhooks)
 */

import { randomUUID } from "crypto";

import type {
  IPaymentGateway,
  InitiatePaymentInput,
  InitiatePaymentResult,
  RefundInput,
  RefundResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
  VerifyWebhookInput,
  VerifyWebhookResult,
} from "../types";

export class ManualPaymentGateway implements IPaymentGateway {
  readonly name = "manual" as const;

  async initiate(
    input: InitiatePaymentInput,
  ): Promise<InitiatePaymentResult> {
    const id = `manual-${randomUUID()}`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    return {
      status: "initiated",
      providerPaymentId: id,
      // Manual payments have no hosted-checkout URL — the operator
      // collects the cash/cheque/bank transfer out-of-band.
      redirectUrl: "",
      expiresAt,
      raw: {
        purpose: input.purpose,
        entityId: input.entityId,
        amount: input.amount,
        currency: input.currency ?? "BDT",
        mode: "manual",
      },
    };
  }

  async verify(
    input: VerifyPaymentInput,
  ): Promise<VerifyPaymentResult> {
    // Manual payments are trusted on entry — the operator who recorded
    // the payment is responsible for confirming the cash/cheque was
    // received. We always return "successful".
    return {
      status: "successful",
      transactionRef: `manual-${randomUUID()}`,
      amount: input.expectedAmount,
      paidAt: new Date().toISOString(),
      metadata: input.metadata,
      raw: {
        providerPaymentId: input.providerPaymentId,
        verificationKey: input.verificationKey,
        trusted: true,
      },
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    return {
      status: "successful",
      refundId: `manual-refund-${randomUUID()}`,
      amount: input.amount,
      raw: {
        providerPaymentId: input.providerPaymentId,
        reason: input.reason,
      },
    };
  }

  async verifyWebhook(
    _input: VerifyWebhookInput,
  ): Promise<VerifyWebhookResult> {
    // Manual payments have no webhook callbacks — there is nothing to
    // verify. Return invalid so callers know to skip webhook handling.
    return {
      valid: false,
      reason: "ManualPaymentGateway does not support webhooks.",
    };
  }
}
