/**
 * MadrashaOS — PaymentGateway Factory
 *
 * Phase 4 (P4-LIBS-1)
 *
 * Selects a payment provider per request (or defaults to
 * `PAYMENT_DEFAULT_PROVIDER` env var, default "manual") and caches
 * each constructed instance in a Map so a single gateway object is
 * reused per provider across hot-reloads.
 *
 * Supported providers:
 *   - "manual"      → ManualPaymentGateway (dev default, cash/bank/cheque)
 *   - "bkash"       → BkashPaymentGateway (bKash Tokenized Checkout v1.2.0)
 *   - "sslcommerz"  → SslCommerzPaymentGateway (SSL Commerz EasyCheckout v4)
 *
 * Why cache per-provider (rather than a single singleton like the
 * notification lib)? Because a single MadrashaOS tenant may use bKash
 * for student fees AND manual for zakat disbursements in the same
 * request cycle — caching per-provider avoids re-constructing
 * (re-authenticating) bKash every time.
 */

import type { GatewayProvider, IPaymentGateway } from "./types";
import { ManualPaymentGateway } from "./providers/manual";
import { BkashPaymentGateway } from "./providers/bkash";
import { SslCommerzPaymentGateway } from "./providers/sslcommerz";

// Re-export the public API surface — callers should import from
// "@/lib/payments" rather than reaching into sub-paths.
export * from "./types";
export { ManualPaymentGateway } from "./providers/manual";
export { BkashPaymentGateway } from "./providers/bkash";
export { SslCommerzPaymentGateway } from "./providers/sslcommerz";

// ---------------------------------------------------------------------------
// Singleton cache (per-provider)
// ---------------------------------------------------------------------------

const cache = new Map<GatewayProvider, IPaymentGateway>();

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Get a payment gateway instance for the requested provider.
 *
 *   - If `provider` is omitted, reads `PAYMENT_DEFAULT_PROVIDER` env
 *     (default "manual").
 *   - Instances are cached per-provider in a Map — subsequent calls
 *     return the same instance (preserves bKash token cache, etc).
 *   - If the provider's required env vars are missing, the constructor
 *     throws — surfaced at first use rather than mid-flight.
 */
export function getPaymentGateway(
  provider?: GatewayProvider,
): IPaymentGateway {
  const resolved: GatewayProvider =
    provider ??
    (process.env.PAYMENT_DEFAULT_PROVIDER as GatewayProvider) ??
    "manual";

  const cached = cache.get(resolved);
  if (cached) return cached;

  let gw: IPaymentGateway;
  switch (resolved) {
    case "manual":
      gw = new ManualPaymentGateway();
      break;
    case "bkash":
      gw = new BkashPaymentGateway();
      break;
    case "sslcommerz":
      gw = new SslCommerzPaymentGateway();
      break;
    default: {
      // Exhaustiveness check — if GatewayProvider grows, TS will flag
      // the missing case here at compile time.
      const _exhaustive: never = resolved;
      throw new Error(
        `[PaymentGateway] unknown provider "${String(_exhaustive)}". ` +
          `Valid values: manual, bkash, sslcommerz.`,
      );
    }
  }

  cache.set(resolved, gw);
  return gw;
}

/**
 * Force-reset the cache — used in tests after swapping env vars.
 * Not intended for production use.
 */
export function __resetPaymentGatewaysForTests(): void {
  cache.clear();
}
