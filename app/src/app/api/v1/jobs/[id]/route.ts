/**
 * MadrashaOS — Async Job Status API
 *
 * Phase B8.3 — Reports API (async export per SRS §6.5)
 *
 * GET /api/v1/jobs/:id — poll job status
 *   Returns: { id, status, progress?, result?, error? }
 *
 * Used for polling long-running report generation jobs (SRS §6.5).
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { jsonResponse, errorResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  // Look up as a Report job (reports are the primary async job type)
  const report = await db.report.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
    select: {
      id: true,
      name: true,
      status: true,
      started_at: true,
      completed_at: true,
      error_message: true,
      row_count: true,
      storage_url: true,
      format: true,
      is_finance: true,
    },
  });

  if (!report) return errorResponse("Job not found", 404);

  // D3: Finance reports require reports.finance.view
  if (report.is_finance && (!tenantCtx.permissions || !tenantCtx.permissions.includes("reports.finance.view"))) {
    return errorResponse("You don't have access to this job.", 403);
  }

  const isCompleted = report.status === "completed";
  const isFailed = report.status === "failed";

  return jsonResponse({
    job_id: report.id,
    job_type: "report",
    name: report.name,
    status: report.status,
    started_at: report.started_at,
    completed_at: report.completed_at,
    error: report.error_message,
    result: isCompleted ? {
      row_count: report.row_count,
      download_url: report.storage_url,
      format: report.format,
    } : null,
    // Polling hint for client
    poll_interval_ms: 2000,
    message: isCompleted
      ? "Job completed successfully."
      : isFailed
        ? `Job failed: ${report.error_message}`
        : "Job is running. Poll again in 2 seconds.",
  });
}
