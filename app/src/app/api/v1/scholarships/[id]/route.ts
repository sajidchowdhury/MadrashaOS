/**
 * MadrashaOS — Single Scholarship API
 *
 * Phase B6.2
 *
 * GET   /api/v1/scholarships/:id — single scholarship
 * PATCH /api/v1/scholarships/:id — update (blocked if active/closed)
 * DELETE /api/v1/scholarships/:id — soft delete (revoke)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateScholarshipSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: z.enum(["full", "partial"]).optional(),
  percentage: z.number().min(0).max(100).optional(),
  amount_per_year: z.number().min(0).optional(),
  fund_source: z.enum(["general", "zakat", "donation"]).optional(),
  note: z.string().optional(),
  expires_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(["pending", "approved", "active", "closed", "revoked"]).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/v1/scholarships/:id */
export async function GET(_req: Request, ctx: RouteContext) {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const scholarship = await db.scholarship.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
    include: {
      student: {
        select: {
          id: true, name: true, name_bn: true, code: true, roll: true,
          class: { select: { name: true, name_bn: true } },
        },
      },
      approver: { select: { id: true, name: true, name_bn: true } },
    },
  });

  if (!scholarship) return errorResponse("Scholarship not found", 404);

  return jsonResponse({
    id: scholarship.id,
    student: scholarship.student,
    name: scholarship.name,
    type: scholarship.type,
    percentage: Number(scholarship.percentage),
    amount_per_year: Number(scholarship.amount_per_year),
    fund_source: scholarship.fund_source,
    academic_year: scholarship.academic_year,
    status: scholarship.status,
    approved_by: scholarship.approver?.name ?? null,
    approved_at: scholarship.approved_at,
    note: scholarship.note,
    expires_at: scholarship.expires_at,
    is_pending: scholarship.status === "pending",
  });
}

/** PATCH /api/v1/scholarships/:id */
export const PATCH = withPermission("scholarship.view", async (req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = updateScholarshipSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const existing = await db.scholarship.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
  });
  if (!existing) return errorResponse("Scholarship not found", 404);

  // Block updates if scholarship is closed or revoked
  if (existing.status === "closed" || existing.status === "revoked") {
    return errorResponse(`Cannot modify a ${existing.status} scholarship`, 409);
  }

  const updated = await db.scholarship.update({
    where: { id },
    data: {
      ...parsed.data,
      expires_at: parsed.data.expires_at ? new Date(parsed.data.expires_at) : undefined,
      updated_by: tenantCtx.user_id,
    } as never,
  });

  return successResponse(updated, "Scholarship updated");
});

/** DELETE /api/v1/scholarships/:id — soft delete (revoke) */
export const DELETE = withPermission("scholarship.view", async (_req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const existing = await db.scholarship.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
  });
  if (!existing) return errorResponse("Scholarship not found", 404);

  // Revoke: set status to "revoked" + soft delete
  await db.scholarship.update({
    where: { id },
    data: {
      status: "revoked",
      deleted_at: new Date(),
      updated_by: tenantCtx.user_id,
    } as never,
  });

  // If the scholarship was active, reverse the fee plan scholarship_amount
  if (existing.status === "active" && Number(existing.amount_per_year) > 0) {
    const feePlan = await db.feePlan.findFirst({
      where: { student_id: existing.student_id, academic_year: existing.academic_year, deleted_at: null },
    });
    if (feePlan) {
      const newScholarshipAmount = Math.max(0, Number(feePlan.scholarship_amount) - Number(existing.amount_per_year));
      const newNetPayable = Number(feePlan.total_amount) - newScholarshipAmount;
      await db.feePlan.update({
        where: { id: feePlan.id },
        data: {
          scholarship_amount: newScholarshipAmount,
          net_payable: newNetPayable,
          updated_by: tenantCtx.user_id,
        } as never,
      });
    }
  }

  return successResponse(null, "Scholarship revoked and reversed from fee plan");
});
