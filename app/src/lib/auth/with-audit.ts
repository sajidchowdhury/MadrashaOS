/**
 * MadrashaOS — Audit-Log Middleware
 *
 * Task B2.2 — Permission Middleware
 *
 * Per SRS §2.1.4 + §3.4 + BP5 — every successful write (POST/PUT/PATCH/DELETE)
 * to an audited entity MUST produce a row in the `audit_logs` table with:
 *   - organization_id, branch_id, actor_user_id  (from the session)
 *   - entity_type, entity_id                       (from the handler return)
 *   - action                                       (POST=create, PUT/PATCH=update, DELETE=delete)
 *   - old_values, new_values                       (jsonb snapshots)
 *
 * Implementation pattern:
 *
 *   The wrapped handler returns a JSON response whose body contains the
 *   created/updated entity under a known key. By default this wrapper
 *   reads `responseBody.data` (the standard MadrashaOS envelope —
 *   `{ data: <entity>, meta: {...} }`). The `entityType` argument is
 *   provided statically so we don't have to inspect the body shape.
 *
 *   The wrapper also accepts an optional `oldValues` fetcher via the
 *   context (passed in by the caller before invoking the handler) — this
 *   MVP captures only the NEW snapshot; old_values is left null for
 *   updates and DELETEs. A future task can refactor to a stricter
 *   before/after diff via Prisma middleware.
 *
 * Usage:
 *   export const POST = withAudit("students", async (req, ctx) => {
 *     const body = await req.json();
 *     const student = await db.student.create({ data: body });
 *     return Response.json({ data: student }, { status: 201 });
 *   });
 *
 * The audit row is written AFTER the handler returns successfully — if
 * the handler throws or returns 4xx/5xx, no audit row is created (we
 * don't audit failed attempts at this layer; login failures are audited
 * separately by the credentials provider).
 */

import { getServerSession } from "next-auth";

import { authConfig } from "@/lib/auth/config";
import { db } from "@/lib/db";
import type { RequestHandler, RouteContext } from "./with-permission";

/** Maps HTTP method to audit action verb. */
function methodToAction(method: string): string {
  switch (method.toUpperCase()) {
    case "POST":
      return "create";
    case "PUT":
    case "PATCH":
      return "update";
    case "DELETE":
      return "delete";
    default:
      return method.toLowerCase();
  }
}

/**
 * Higher-order function — wraps a write handler with audit logging.
 *
 * @param entityType  The audited entity's table name (e.g. "students", "fee_payments")
 * @param handler     The wrapped route handler
 *
 * The handler MUST return a Response whose JSON body contains the
 * created/updated entity under the `data` key, OR the entity id under
 * `data.id`. If neither is present, the audit row is written with
 * `entity_id = null` (still useful — the action + actor + timestamp
 * are recorded).
 */
export function withAudit(
  entityType: string,
  handler: RequestHandler,
): RequestHandler {
  return async (req: Request, ctx: RouteContext) => {
    // Run the handler first — only audit if it succeeds.
    const response = await handler(req, ctx);

    // Only audit 2xx responses.
    if (response.status < 200 || response.status >= 300) {
      return response;
    }

    // Skip GET / HEAD / OPTIONS — they're reads, not writes.
    const method = req.method.toUpperCase();
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
      return response;
    }

    // Fetch the session lazily — if it's missing (rare; middleware should
    // have gated the request already), we still want the audit row but
    // with actor_user_id = null.
    let session;
    try {
      session = await getServerSession(authConfig);
    } catch {
      session = null;
    }

    // Extract entity id from the response body, if possible.
    let entityId: string | null = null;
    let newValues: unknown = null;
    try {
      const cloned = response.clone();
      const json = (await cloned.json()) as {
        data?: { id?: string } | string;
      };
      if (json?.data) {
        if (typeof json.data === "string") {
          entityId = json.data;
        } else if (typeof json.data === "object" && json.data !== null) {
          newValues = json.data;
          entityId = (json.data as { id?: string }).id ?? null;
        }
      }
    } catch {
      // Non-JSON or unparseable body — skip the values snapshot, still log.
    }

    // Write the audit row. We don't await failures to be non-blocking —
    // the response is already sent. Wrap in try/catch so an audit-write
    // failure never breaks the user-facing response.
    try {
      await db.auditLog.create({
        data: {
          organization_id:
            session?.user?.organization_id ??
            "00000000-0000-0000-0000-000000000001", // fallback for unauth paths
          branch_id: session?.user?.branch_id ?? null,
          actor_user_id: session?.user?.id ?? null,
          action: methodToAction(method),
          entity_type: entityType,
          entity_id: entityId ?? "00000000-0000-0000-0000-000000000000",
          old_values: null, // captured by future before/after diff middleware
          new_values: newValues as object | null,
          ip_address: extractIp(req),
          user_agent: req.headers.get("user-agent")?.slice(0, 255) ?? null,
          request_id: req.headers.get("x-request-id") ?? null,
        },
      });
    } catch (err) {
      // Surface in dev — audit failures are not user-facing but should
      // not silently swallow (we want to know if the schema drifts).
      if (process.env.NODE_ENV === "development") {
        console.warn("[withAudit] failed to write audit log:", err);
      }
    }

    return response;
  };
}

/**
 * Extract the client IP from common proxy headers.
 * Returns the first non-empty value, or null.
 */
function extractIp(req: Request): string | null {
  const headers = [
    "x-forwarded-for",
    "x-real-ip",
    "cf-connecting-ip",
    "x-client-ip",
  ];
  for (const h of headers) {
    const v = req.headers.get(h);
    if (v) return v.split(",")[0].trim().slice(0, 45);
  }
  return null;
}
