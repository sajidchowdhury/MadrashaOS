/**
 * MadrashaOS — Idempotency-Key Middleware (Phase 4 — DB-backed)
 *
 * Per SRS §6.5 — write endpoints with external side effects (payments,
 * donations, etc.) MUST be idempotent on retry. The client sends an
 * `Idempotency-Key` header; if the same key is replayed within 24h,
 * the original response is returned without re-executing the handler.
 *
 * Phase 4 change: replaced the in-memory Map with a Postgres-backed
 * `IdempotencyRecord` table so idempotency:
 *   - survives server restarts
 *   - works across multiple instances (serverless-safe)
 *   - is shared between all processes
 *
 * The table stores:
 *   - key (unique — the Idempotency-Key header value)
 *   - method + path (for debugging)
 *   - status_code + response_body + content_type (the replay payload)
 *   - expires_at (now + 24h — lazy sweep on read)
 *
 * Usage:
 *   export const POST = withIdempotency(async (req, ctx) => {
 *     const body = await req.json();
 *     ... create donation ...
 *     return Response.json({ id: donation.id }, { status: 201 });
 *   });
 *
 * GET / HEAD / OPTIONS bypass the cache (naturally idempotent).
 * 5xx responses are NOT cached (so the client can retry with the same key).
 */

import type { RequestHandler, RouteContext } from "./with-permission";
import { db } from "@/db";

/** Idempotency cache TTL: 24 hours (SRS §6.5). */
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

/** Header name carrying the idempotency key. */
export const IDEMPOTENCY_HEADER = "Idempotency-Key";

/** Fraction of requests that also trigger a sweep of expired rows. */
const SWEEP_PROBABILITY = 0.05; // ~5% of cache misses sweep expired rows

/**
 * Higher-order function — wraps a route handler so that if the request
 * carries an `Idempotency-Key` header, repeated requests with the same
 * key receive the original response (within the 24h TTL).
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

    // --- Cache hit? (DB lookup) ---
    const existing = await db.idempotencyRecord.findUnique({
      where: { key },
    });

    if (existing) {
      // Expired entry — treat as cache miss (will be overwritten below).
      if (existing.expires_at.getTime() > Date.now()) {
        // Valid cache hit — replay the original response.
        return new Response(JSON.stringify(existing.response_body), {
          status: existing.status_code,
          headers: {
            "Content-Type": existing.content_type,
            "X-Idempotent-Replay": "true",
          },
        });
      }
    }

    // --- Cache miss — run the handler, capture the response, cache it. ---
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
      try {
        body = await response.clone().text();
      } catch {
        body = null;
      }
    }

    const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS);
    const url = new URL(req.url);

    // Upsert: handles both first-write AND overwriting an expired entry.
    try {
      await db.idempotencyRecord.upsert({
        where: { key },
        create: {
          key,
          method,
          path: url.pathname,
          status_code: response.status,
          response_body: body as never,
          content_type: contentType,
          expires_at: expiresAt,
        },
        update: {
          method,
          path: url.pathname,
          status_code: response.status,
          response_body: body as never,
          content_type: contentType,
          expires_at: expiresAt,
        },
      });
    } catch (err) {
      // If another concurrent request with the same key won the race,
      // that's fine — the client gets the original response either way.
      console.warn("[withIdempotency] failed to persist idempotency record:", err);
    }

    // --- Lazy sweep: occasionally clean up expired rows. ---
    if (Math.random() < SWEEP_PROBABILITY) {
      try {
        await db.idempotencyRecord.deleteMany({
          where: { expires_at: { lt: new Date() } },
        });
      } catch {
        // Non-critical — sweep failure doesn't affect the request.
      }
    }

    return response;
  };
}
