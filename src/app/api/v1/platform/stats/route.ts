/**
 * MadrashaOS — Platform Admin: Stats Dashboard (Phase 3)
 *
 * GET /api/v1/platform/stats
 *
 * Platform super-admin only. Returns KPI cards for the platform dashboard:
 *   - total_tenants (excluding the Platform org itself)
 *   - active_tenants
 *   - trialing_tenants
 *   - suspended_tenants
 *   - pending_signups
 *   - total_branches (across all tenants)
 *   - total_users (across all tenants)
 *   - mrr_bdt (monthly recurring revenue = sum of monthly_amount_bdt
 *     across active subscriptions)
 */

import { db } from "@/lib/db";
import { getTenantContext, isPlatformAdmin } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export const GET = withPermission("tenant.provision", async () => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const isPlatform = await isPlatformAdmin();
  if (!isPlatform) {
    return errorResponse("Forbidden — platform admin access required", 403);
  }

  // The Platform org's ID — we exclude it from tenant counts
  const platformOrg = await db.organization.findFirst({
    where: { code: "PLATFORM", deleted_at: null },
    select: { id: true },
  });
  const platformOrgId = platformOrg?.id ?? "00000000-0000-0000-0000-000000000000";

  // Count tenants by status (exclude the Platform org itself)
  const [tenants, activeCount, trialingCount, suspendedCount, pendingSignups, branchCount, userCount, subscriptions] =
    await Promise.all([
      db.organization.count({
        where: { deleted_at: null, id: { not: platformOrgId } },
      }),
      db.organization.count({
        where: { deleted_at: null, id: { not: platformOrgId }, status: "active" },
      }),
      db.organization.count({
        where: {
          deleted_at: null,
          id: { not: platformOrgId },
          trial_ends_at: { gte: new Date() },
          status: "active",
        },
      }),
      db.organization.count({
        where: { deleted_at: null, id: { not: platformOrgId }, status: "suspended" },
      }),
      db.tenantSignupRequest.count({
        where: { deleted_at: null, status: "pending" },
      }),
      db.branch.count({
        where: { deleted_at: null, organization: { id: { not: platformOrgId }, deleted_at: null } },
      }),
      db.user.count({
        where: {
          deleted_at: null,
          organization: { id: { not: platformOrgId }, deleted_at: null },
        },
      }),
      db.subscription.findMany({
        where: { deleted_at: null, status: "active", organization: { id: { not: platformOrgId } } },
        select: { monthly_amount_bdt: true, branch_count_snapshot: true },
      }),
    ]);

  // MRR = sum of (monthly_amount_bdt × branch_count_snapshot) for active subs
  const mrrBdt = subscriptions.reduce(
    (sum, s) => sum + Number(s.monthly_amount_bdt) * (s.branch_count_snapshot || 1),
    0,
  );

  return jsonResponse({
    data: {
      total_tenants: tenants,
      active_tenants: activeCount,
      trialing_tenants: trialingCount,
      suspended_tenants: suspendedCount,
      pending_signups: pendingSignups,
      total_branches: branchCount,
      total_users: userCount,
      mrr_bdt: mrrBdt,
      active_subscriptions: subscriptions.length,
    },
  });
});
