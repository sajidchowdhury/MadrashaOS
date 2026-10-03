/**
 * MadrashaOS — Tenant Billing: Current Subscription (Phase 4)
 *
 * GET /api/v1/billing/subscription
 *
 * Returns the current tenant's subscription + billing summary.
 * Any authenticated tenant user can view this (it's their own billing).
 *
 * Response:
 *   {
 *     plan, status, branchCount, monthlyAmountBdt (unit price),
 *     totalMonthlyBdt (branchCount × unitPrice),
 *     trialEndsAt, currentPeriodStart, currentPeriodEnd,
 *     daysUntilTrialEnds, isTrialing
 *   }
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { jsonResponse, errorResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

const UNIT_PRICE_BDT = 300; // per branch per month

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  // Fetch the org + subscription + branch count
  const [org, subscription] = await Promise.all([
    db.organization.findFirst({
      where: { id: ctx.organization_id, deleted_at: null },
      select: {
        id: true, name: true, code: true, status: true,
        trial_ends_at: true, suspended_at: true, suspended_reason: true,
      },
    }),
    db.subscription.findFirst({
      where: { organization_id: ctx.organization_id, deleted_at: null },
    }),
  ]);

  if (!org) return errorResponse("Organization not found", 404);

  // Count active branches
  const branchCount = await db.branch.count({
    where: { organization_id: ctx.organization_id, deleted_at: null, is_active: true },
  });

  const now = new Date();
  const trialEndsAt = subscription?.trial_ends_at ?? org.trial_ends_at;
  const isTrialing = trialEndsAt ? new Date(trialEndsAt) > now : false;
  const daysUntilTrialEnds = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
    : null;

  const monthlyUnit = subscription ? Number(subscription.monthly_amount_bdt) : UNIT_PRICE_BDT;
  const totalMonthly = monthlyUnit * branchCount;

  return jsonResponse({
    data: {
      organization: {
        id: org.id,
        name: org.name,
        code: org.code,
        status: org.status,
      },
      subscription: subscription
        ? {
            plan: subscription.plan,
            status: subscription.status,
            monthly_amount_bdt: monthlyUnit,
            branch_count_snapshot: subscription.branch_count_snapshot,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            trial_ends_at: subscription.trial_ends_at,
          }
        : null,
      billing: {
        unit_price_bdt: monthlyUnit,
        branch_count: branchCount,
        total_monthly_bdt: totalMonthly,
        currency: "BDT",
        trial_ends_at: trialEndsAt,
        is_trialing: isTrialing,
        days_until_trial_ends: daysUntilTrialEnds,
        pricing_rule: `${monthlyUnit} BDT × ${branchCount} branch${branchCount === 1 ? "" : "es"} = ${totalMonthly} BDT/month`,
      },
    },
  });
}
