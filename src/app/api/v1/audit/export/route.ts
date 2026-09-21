/**
 * MadrashaOS — Audit Trail CSV Export API
 *
 * Task B3.4 — Audit Trail API + Field-Diff Viewer
 *
 * GET /api/v1/audit/export
 *   Streams the filtered audit-log set as a CSV file.
 *   Permission: audit.export
 *
 * Query params (same as GET /api/v1/audit):
 *   entity_type, actor_id, date_from, date_to, action
 *
 * Response:
 *   Content-Type:        text/csv; charset=utf-8
 *   Content-Disposition: attachment; filename="audit-export.csv"
 *
 * CSV columns:
 *   id, entity_type, entity_id, action, actor_name,
 *   created_at, ip_address, changes
 *
 * The `changes` column is a compact human-readable summary of the
 * field-level diff, e.g. "amount: 20000 → 25000; status: 'pending' → 'posted'".
 * For create/delete events where one side is null, the diff includes every
 * field of the non-null side.
 *
 * Limit: capped at 1000 rows per export to protect the server from
 * runaway queries. Callers needing larger exports should filter by a
 * narrower date range.
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { errorResponse } from "@/lib/api/helpers";
import {
  computeFieldDiff,
  formatDiffForCsv,
} from "@/lib/api/diff";

export const dynamic = "force-dynamic";

/** Hard cap on the number of rows returned per export. */
const MAX_EXPORT_ROWS = 1000;

/** CSV column order. */
const CSV_HEADERS = [
  "id",
  "entity_type",
  "entity_id",
  "action",
  "actor_name",
  "created_at",
  "ip_address",
  "changes",
] as const;

/** Parse an ISO date string, returning null if invalid. */
function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/** Escape a CSV cell value (RFC 4180): quote if it contains comma, quote, or newline. */
function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Build the Prisma where clause from query params (mirrors the list endpoint). */
function buildWhere(req: Request, organization_id: string) {
  const url = new URL(req.url);

  const where: {
    organization_id: string;
    deleted_at: null;
    entity_type?: string;
    actor_user_id?: string;
    action?: string;
    created_at?: { gte?: Date; lte?: Date };
  } = {
    organization_id,
    deleted_at: null,
  };

  const entityType = url.searchParams.get("entity_type");
  if (entityType) where.entity_type = entityType;

  const actorId = url.searchParams.get("actor_id");
  if (actorId) where.actor_user_id = actorId;

  const action = url.searchParams.get("action");
  if (action) where.action = action;

  const dateFrom = parseDate(url.searchParams.get("date_from"));
  const dateTo = parseDate(url.searchParams.get("date_to"));
  if (dateFrom || dateTo) {
    where.created_at = {};
    if (dateFrom) where.created_at.gte = dateFrom;
    if (dateTo) where.created_at.lte = dateTo;
  }

  return where;
}

/** GET /api/v1/audit/export — CSV download. */
export const GET = withPermission("audit.export", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) {
    return errorResponse("Unauthorized", 401);
  }

  const where = buildWhere(req, ctx.organization_id);

  const rows = await db.auditLog.findMany({
    where,
    orderBy: { created_at: "desc" },
    take: MAX_EXPORT_ROWS,
    select: {
      id: true,
      entity_type: true,
      entity_id: true,
      action: true,
      created_at: true,
      ip_address: true,
      old_values: true,
      new_values: true,
      actor: { select: { name: true } },
    },
  });

  // Build CSV.
  const lines: string[] = [CSV_HEADERS.join(",")];

  for (const row of rows) {
    const oldValues = (row.old_values ?? null) as
      | Record<string, unknown>
      | null;
    const newValues = (row.new_values ?? null) as
      | Record<string, unknown>
      | null;
    const diff = computeFieldDiff(oldValues, newValues);
    const changes = formatDiffForCsv(diff);

    lines.push(
      [
        row.id,
        row.entity_type,
        row.entity_id,
        row.action,
        row.actor?.name ?? "",
        row.created_at.toISOString(),
        row.ip_address ?? "",
        changes,
      ]
        .map(csvCell)
        .join(","),
    );
  }

  const csv = lines.join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="audit-export.csv"',
      "Cache-Control": "no-store",
      "X-Audit-Export-Rows": String(rows.length),
    },
  });
});
