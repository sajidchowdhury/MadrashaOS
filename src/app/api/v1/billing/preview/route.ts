/**
 * MadrashaOS — Tenant Billing: Pricing Preview (Phase 4)
 *
 * POST /api/v1/billing/preview
 *
 * "What-if" calculator: given an input branch count, returns the
 * monthly amount. Used by the billing page UI to show pricing for
 * different branch counts.
 *
 * Body: { branchCount: number }
 * Response: { unitPriceBdt, branchCount, totalMonthlyBdt, pricingRule }
 */

import { getTenantContext } from "@/lib/auth/with-tenant";
import { jsonResponse, errorResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const UNIT_PRICE_BDT = 300;

const previewSchema = z.object({
  branchCount: z.number().int().min(1).max(100),
});

export async function POST(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = previewSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const { branchCount } = parsed.data;
  const total = UNIT_PRICE_BDT * branchCount;

  return jsonResponse({
    data: {
      unit_price_bdt: UNIT_PRICE_BDT,
      branch_count: branchCount,
      total_monthly_bdt: total,
      currency: "BDT",
      pricing_rule: `${UNIT_PRICE_BDT} BDT × ${branchCount} branch${branchCount === 1 ? "" : "es"} = ${total} BDT/month`,
    },
  });
}
