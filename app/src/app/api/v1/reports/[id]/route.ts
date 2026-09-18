/**
 * MadrashaOS — Single Report API + Download
 *
 * Phase B8.3
 *
 * GET /api/v1/reports/:id — report status + metadata
 * GET /api/v1/reports/:id/download — download report data (JSON/CSV)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { jsonResponse, errorResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/v1/reports/:id — report status */
export async function GET(req: Request, ctx: RouteContext) {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const url = new URL(req.url);
  const download = url.searchParams.get("download") === "true";

  const report = await db.report.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
    include: { generator: { select: { id: true, name: true } } },
  });

  if (!report) return errorResponse("Report not found", 404);

  // D3: Finance reports require reports.finance.view
  if (report.is_finance && (!tenantCtx.permissions || !tenantCtx.permissions.includes("reports.finance.view"))) {
    return errorResponse("You don't have access to this finance report.", 403);
  }

  if (download) {
    if (report.status !== "completed") {
      return errorResponse(`Report is not ready. Current status: ${report.status}`, 409);
    }

    // Re-generate the report data (in production, this would read from stored file)
    // For now, return the report metadata + parameters
    const reportData = {
      report_id: report.id,
      name: report.name,
      report_type: report.report_type,
      parameters: report.parameters,
      generated_by: report.generator.name,
      generated_at: report.completed_at,
      row_count: report.row_count,
      format: report.format,
    };

    if (report.format === "csv") {
      // Return CSV header (actual data would be regenerated from parameters)
      const csvHeader = "id,name,report_type,status,row_count,generated_by,completed_at\n";
      const csvRow = `${report.id},${report.name},${report.report_type},${report.status},${report.row_count},${report.generator.name},${report.completed_at?.toISOString()}\n`;
      return new Response(csvHeader + csvRow, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${report.name}.csv"`,
        },
      });
    }

    return jsonResponse({
      ...reportData,
      download_note: "In production, this endpoint returns the stored file. In this MVP, it returns metadata.",
    });
  }

  return jsonResponse({
    id: report.id,
    name: report.name,
    report_type: report.report_type,
    parameters: report.parameters,
    format: report.format,
    storage_url: report.storage_url,
    status: report.status,
    size_bytes: report.size_bytes ? Number(report.size_bytes) : null,
    row_count: report.row_count,
    generated_by: report.generator.name,
    started_at: report.started_at,
    completed_at: report.completed_at,
    error_message: report.error_message,
    expires_at: report.expires_at,
    is_finance: report.is_finance,
    created_at: report.created_at,
    download_url: report.status === "completed" ? `/api/v1/reports/${report.id}?download=true` : null,
  });
}
