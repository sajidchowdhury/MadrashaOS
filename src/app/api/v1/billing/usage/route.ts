/**
 * MadrashaOS — Tenant Billing: Usage History (Phase 4)
 *
 * GET /api/v1/billing/usage
 *
 * Returns the last 12 months of UsageSnapshot rows for the current tenant.
 * Used by the billing page to show a usage trend chart/table.
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { jsonResponse, errorResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  // Fetch last 12 months of usage snapshots
  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setMonth(twelveWeeksAgo.getMonth() - 12);

  const snapshots = await db.usageSnapshot.findMany({
    where: {
      organization_id: ctx.organization_id,
      snapshot_date: { gte: twelveWeeksAgo },
    },
    orderBy: { snapshot_date: "desc" },
    take: 365, // max 1 per day
  });

  return jsonResponse({
    data: snapshots.map((s) => ({
      id: s.id,
      snapshot_date: s.snapshot_date,
      branch_count: s.branch_count,
      student_count: s.student_count,
      user_count: s.user_count,
      storage_bytes: s.storage_bytes ? Number(s.storage_bytes) : null,
    })),
    count: snapshots.length,
  });
}
