/**
 * MadrashaOS — Idempotency-Key Middleware
 *
 * Task B2.2 — Permission Middleware
 *
 * Per SRS §6.5 — the `/api/v1/donations` POST endpoint (and any other
 * write endpoint with external side effects — payments, etc.) MUST be
 * idempotent on retry. The client sends an `Idempotency-Key` header;
 * if the same key is replayed within 24h, the original response is
 * returned without re-executing the handler.
 *
 * Implementation note: this MVP uses an in-memory Map keyed by the
 * Idempotency-Key. In production, swap to Redis (see TODO) — the Map
 * is per-process and resets on server restart, which is acceptable
 * for the dev sandbox but not for production.
 *
 * The cache stores:
 *   - status code
 *   - response body (JSON-serializable)
 *   - headers (Content-Type only — others may leak)
 *   - expiry timestamp (now + 24h)
 *
 * Cache eviction: lazy — entries are checked on read and skipped if
 * expired. A periodic sweep is not needed in the sandbox.
 *
 * Usage:
 *   export const POST = withIdempotency(async (req, ctx) => {
 *     const body = await req.json();
 *     ... create donation ...
 *     return Response.json({ id: donation.id }, { status: 201 });
 *   });
 *
 * The wrapper only enforces idempotency on POST/PUT/PATCH/DELETE.
 * GET requests bypass the cache (they're naturally idempotent).
 */

import type { RequestHandler, RouteContext } from "./with-permission";

/** Idempotency cache TTL: 24 hours (SRS §6.5). */
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

/** Header name carrying the idempotency key. */
export const IDEMPOTENCY_HEADER = "Idempotency-Key";

interface CachedResponse {
  status: number;
  body: unknown;
  contentType: string;
  expiresAt: number;
}

/** In-memory cache — see file header re: Redis upgrade path. */
const cache = new Map<string, CachedResponse>();

/**
 * Internal: lazily sweep expired entries to bound memory growth.
 * Called on every cache miss — O(n) but only on misses, and the
 * Map is bounded by the request volume over the TTL window.
 */
function sweepExpired(now: number): void {
  for (const [key, entry] of cache) {
    if (entry.expiresAt < now) cache.delete(key);
  }
}

/**
 * Higher-order function — wraps a route handler so that if the request
 * carries an `Idempotency-Key` header, repeated requests with the
 * same key receive the original response (within the 24h TTL).
 *
 * If the request method is GET (no side effects) OR no Idempotency-Key
 * header is sent, the handler runs normally with no caching.
 */
export function withIdempotency(handler: RequestHandler): RequestHandler {
  return async (req: Request, ctx: RouteContext) => {
    // GET / HEAD / OPTIONS — naturally idempotent, bypass the cache.
    const method = req.method.toUpperCase();
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
      return handler(req, ctx);
    }

    const key = req.headers.get(IDEMPOTENCY_HEADER);
    if (!key) return handler(req, ctx);

    // Cache hit?
    const now = Date.now();
    sweepExpired(now);
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now) {
      return new Response(JSON.stringify(cached.body), {
        status: cached.status,
        headers: {
          "Content-Type": cached.contentType,
          "X-Idempotent-Replay": "true",
        },
      });
    }

    // Cache miss — run the handler, capture the response, cache it.
    const response = await handler(req, ctx);

    // Only cache successful + client-error responses — server errors
    // (5xx) are NOT cached so the client can retry with the same key.
    if (response.status >= 500) return response;

    let body: unknown = null;
    const contentType = response.headers.get("Content-Type") ?? "application/json";
    try {
      // Clone before reading so the original body is still consumable.
      body = await response.clone().json();
    } catch {
      // Non-JSON response — fall back to text.
      try {
        body = await response.clone().text();
      } catch {
        body = null;
      }
    }

    cache.set(key, {
      status: response.status,
      body,
      contentType,
      expiresAt: now + IDEMPOTENCY_TTL_MS,
    });

    return response;
  };
}
