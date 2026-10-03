/**
 * MadrashaOS — Platform Admin: Billing Overview (Phase 4)
 *
 * GET /api/v1/platform/billing
 *
 * Platform super-admin only. Returns a platform-wide billing summary:
 *   - total_mrr_bdt (sum of monthly_amount × branch_count across active subs)
 *   - trialing_count
 *   - active_count
 *   - suspended_count
 *   - per-tenant breakdown (name, code, plan, status, branches, monthly)
 */

import { db } from "@/lib/db";
import { getTenantContext, isPlatformAdmin } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export const GET = withPermission("tenant.manage", async () => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const isPlatform = await isPlatformAdmin();
  if (!isPlatform) return errorResponse("Forbidden — platform admin access required", 403);

  // Find the Platform org to exclude it
  const platformOrg = await db.organization.findFirst({
    where: { code: "PLATFORM", deleted_at: null },
    select: { id: true },
  });
  const platformOrgId = platformOrg?.id ?? "";

  // Fetch all tenant orgs with their subscriptions + branch counts
  const orgs = await db.organization.findMany({
    where: { deleted_at: null, id: { not: platformOrgId } },
    include: {
      subscription: true,
      _count: { select: { branches: true } },
    },
    orderBy: { created_at: "desc" },
  });

  const tenants = orgs.map((o) => {
    const sub = o.subscription;
    const branchCount = sub?.branch_count_snapshot ?? o._count.branches;
    const unitPrice = sub ? Number(sub.monthly_amount_bdt) : 300;
    const monthlyTotal = unitPrice * branchCount;
    return {
      id: o.id,
      name: o.name,
      code: o.code,
      status: o.status,
      plan: sub?.plan ?? "none",
      subscription_status: sub?.status ?? "none",
      branch_count: branchCount,
      unit_price_bdt: unitPrice,
      monthly_total_bdt: monthlyTotal,
      trial_ends_at: sub?.trial_ends_at ?? o.trial_ends_at,
      created_at: o.created_at,
    };
  });

  // Compute totals
  const activeTenants = tenants.filter((t) => t.status === "active");
  const trialingTenants = tenants.filter((t) => {
    const trialEnd = t.trial_ends_at ? new Date(t.trial_ends_at) : null;
    return trialEnd && trialEnd > new Date();
  });
  const suspendedTenants = tenants.filter((t) => t.status === "suspended");
  const totalMrr = activeTenants.reduce((sum, t) => sum + t.monthly_total_bdt, 0);

  return jsonResponse({
    data: {
      summary: {
        total_tenants: tenants.length,
        active_count: activeTenants.length,
        trialing_count: trialingTenants.length,
        suspended_count: suspendedTenants.length,
        total_mrr_bdt: totalMrr,
        currency: "BDT",
      },
      tenants,
    },
  });
});
