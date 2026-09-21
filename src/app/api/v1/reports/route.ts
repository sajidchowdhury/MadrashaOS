/**
 * MadrashaOS — Reports API
 *
 * Phase B8.3 — Reports API (filtered + async export)
 *
 * GET  /api/v1/reports — list reports (perm: reports.view)
 *   Finance reports require reports.finance.view (D3 — Teacher gets 403)
 *
 * POST /api/v1/reports/generate — generate report (async job)
 *   Body: { report_type, format, parameters }
 *   Finance reports require reports.finance.view
 *   Creates Report job (status: queued)
 *   Returns job ID for polling via GET /api/v1/jobs/:id (SRS §6.5)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { jsonResponse, errorResponse, parsePagination } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

// Report types that require finance permission (D3 — Do-Not-Do)
const FINANCE_REPORT_TYPES = ["finance", "fees", "ledger", "zakat", "donations"];

/** GET /api/v1/reports — list reports */
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const reportType = url.searchParams.get("report_type");
  const status = url.searchParams.get("status");

  const where = {
    organization_id: ctx.organization_id,
    ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}),
    deleted_at: null,
    // D3: filter out finance reports if user lacks reports.finance.view
    ...(ctx.permissions && !ctx.permissions.includes("reports.finance.view")
      ? { is_finance: false }
      : {}),
    ...(reportType ? { report_type: reportType } : {}),
    ...(status ? { status } : {}),
  };

  const [reports, total] = await Promise.all([
    db.report.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip, take,
      include: {
        generator: { select: { id: true, name: true, name_bn: true } },
      },
    }),
    db.report.count({ where }),
  ]);

  return jsonResponse({
    data: reports.map((r) => ({
      id: r.id,
      name: r.name,
      report_type: r.report_type,
      parameters: r.parameters,
      format: r.format,
      storage_url: r.storage_url,
      status: r.status,
      size_bytes: r.size_bytes ? Number(r.size_bytes) : null,
      row_count: r.row_count,
      generated_by: r.generator.name,
      started_at: r.started_at,
      completed_at: r.completed_at,
      error_message: r.error_message,
      expires_at: r.expires_at,
      is_finance: r.is_finance,
      created_at: r.created_at,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}
