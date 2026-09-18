/**
 * MadrashaOS — Audit Trail List API
 *
 * Task B3.4 — Audit Trail API + Field-Diff Viewer
 *
 * GET /api/v1/audit
 *   Paginated list of audit-log events for the current org.
 *   Permission: audit.view
 *
 * Query params:
 *   page          (default 1, min 1)
 *   pageSize      (default 20, min 1, max 100)
 *   entity_type   (e.g. students, fees, ledger_entries)
 *   actor_id      (filter by who made the change — UUID)
 *   date_from     (ISO 8601 — inclusive lower bound on created_at)
 *   date_to       (ISO 8601 — inclusive upper bound on created_at)
 *   action        (create | update | delete | branch_switch | login | ...)
 *
 * Response:
 *   {
 *     "data": [
 *       {
 *         "id": "uuid",
 *         "entity_type": "students",
 *         "entity_id": "uuid",
 *         "action": "update",
 *         "actor_id": "uuid",
 *         "actor_name": "Accountant Rahman",
 *         "created_at": "2026-09-16T14:32:00Z",
 *         "ip_address": "127.0.0.1",
 *         "summary": "Updated students abc12345"
 *       },
 *       ...
 *     ],
 *     "pagination": { "page": 1, "pageSize": 20, "total": 42, "totalPages": 3 }
 *   }
 *
 * The list view does NOT include old_values/new_values/diff — those are
 * only returned by GET /api/v1/audit/:id to keep the list payload small.
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import {
  errorResponse,
  paginatedResponse,
  parsePagination,
} from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/** Action verbs mapped to title-cased human labels for summaries. */
const ACTION_LABELS: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  branch_switch: "Switched branch for",
  login: "Logged in",
  logout: "Logged out",
  approve: "Approved",
  reject: "Rejected",
  submit: "Submitted",
  post: "Posted",
  reverse: "Reversed",
};

/** Build a human-readable summary from action + entity_type + entity_id. */
function buildSummary(
  action: string,
  entityType: string,
  entityId: string,
  diffSummary: string | null,
): string {
  if (diffSummary) return diffSummary;
  const verb = ACTION_LABELS[action] ?? action;
  const shortId = entityId.slice(0, 8);
  return `${verb} ${entityType} ${shortId}`;
}

/** Parse an ISO date string, returning null if invalid. */
function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/** GET /api/v1/audit — paginated audit-log list. */
export const GET = withPermission("audit.view", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) {
    return errorResponse("Unauthorized", 401);
  }

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);

  // Build the where clause. Audit logs are always scoped to the current
  // org; branch_id scoping is intentionally NOT applied because audit.view
  // is typically an org-wide permission and audit events often have a
  // null branch_id (login, role assignments, etc.).
  const where: {
    organization_id: string;
    deleted_at: null;
    entity_type?: string;
    actor_user_id?: string;
    action?: string;
    created_at?: { gte?: Date; lte?: Date };
  } = {
    organization_id: ctx.organization_id,
    deleted_at: null,
  };

  const entityType = url.searchParams.get("entity_type");
  if (entityType) {
    where.entity_type = entityType;
  }

  const actorId = url.searchParams.get("actor_id");
  if (actorId) {
    where.actor_user_id = actorId;
  }

  const action = url.searchParams.get("action");
  if (action) {
    where.action = action;
  }

  const dateFrom = parseDate(url.searchParams.get("date_from"));
  const dateTo = parseDate(url.searchParams.get("date_to"));
  if (dateFrom || dateTo) {
    where.created_at = {};
    if (dateFrom) where.created_at.gte = dateFrom;
    if (dateTo) where.created_at.lte = dateTo;
  }

  const [total, rows] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        entity_type: true,
        entity_id: true,
        action: true,
        actor_user_id: true,
        created_at: true,
        ip_address: true,
        diff_summary: true,
        actor: {
          select: { id: true, name: true },
        },
      },
    }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    action: row.action,
    actor_id: row.actor_user_id,
    actor_name: row.actor?.name ?? null,
    created_at: row.created_at,
    ip_address: row.ip_address,
    summary: buildSummary(
      row.action,
      row.entity_type,
      row.entity_id,
      row.diff_summary,
    ),
  }));

  return paginatedResponse(data, total, page, pageSize);
});
