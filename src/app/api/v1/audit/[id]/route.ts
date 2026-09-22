/**
 * MadrashaOS — Single Audit Event API (with field-diff)
 *
 * Task B3.4 — Audit Trail API + Field-Diff Viewer
 *
 * GET /api/v1/audit/:id
 *   Returns a single audit-log event with full metadata + the computed
 *   field-level diff between `old_values` and `new_values`.
 *
 *   Permission: audit.view
 *
 * Response:
 *   {
 *     "id": "uuid",
 *     "entity_type": "students",
 *     "entity_id": "uuid",
 *     "action": "update",
 *     "actor_id": "uuid",
 *     "actor_name": "Accountant Rahman",
 *     "actor_email": "accounts@madrashaos.org",
 *     "created_at": "2026-09-16T14:32:00Z",
 *     "ip_address": "127.0.0.1",
 *     "user_agent": "Mozilla/5.0...",
 *     "old_values": { "amount": 20000, "status": "pending" },
 *     "new_values": { "amount": 25000, "status": "posted" },
 *     "diff": [
 *       { "field": "amount", "old": 20000, "new": 25000 },
 *       { "field": "status", "old": "pending", "new": "posted" }
 *     ]
 *   }
 *
 * The `diff` array is computed server-side via `computeFieldDiff()`
 * (see src/lib/api/diff.ts) so the client receives a flat list of
 * changed fields with their old and new values — no client-side diffing
 * required.
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse } from "@/lib/api/helpers";
import { computeFieldDiff } from "@/lib/api/diff";

export const dynamic = "force-dynamic";

/** GET /api/v1/audit/:id — single audit event with field-diff. */
export const GET = withPermission(
  "audit.view",
  async (
    _req: Request,
    ctx: { params: Promise<{ id: string }> },
  ) => {
    const tenantCtx = await getTenantContext();
    if (!tenantCtx) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await ctx.params;

    const row = await db.auditLog.findFirst({
      where: {
        id,
        organization_id: tenantCtx.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        entity_type: true,
        entity_id: true,
        action: true,
        actor_user_id: true,
        created_at: true,
        ip_address: true,
        user_agent: true,
        old_values: true,
        new_values: true,
        actor: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!row) {
      return errorResponse("Audit event not found", 404);
    }

    // Prisma stores Json columns as `JsonValue`. Cast to the shape the
    // diff helper expects — the values are always either objects or null
    // (per the AuditLog schema: `old_values Json?` / `new_values Json?`).
    const oldValues = (row.old_values ?? null) as
      | Record<string, unknown>
      | null;
    const newValues = (row.new_values ?? null) as
      | Record<string, unknown>
      | null;

    const diff = computeFieldDiff(oldValues, newValues);

    return jsonResponse({
      id: row.id,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      action: row.action,
      actor_id: row.actor_user_id,
      actor_name: row.actor?.name ?? null,
      actor_email: row.actor?.email ?? null,
      created_at: row.created_at,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      old_values: oldValues,
      new_values: newValues,
      diff,
    });
  },
);
