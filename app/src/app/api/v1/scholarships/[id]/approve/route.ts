/**
 * MadrashaOS — Scholarship Approve API
 *
 * Phase B6.2
 *
 * POST /api/v1/scholarships/:id/approve — approve a pending scholarship (perm: scholarship.approve)
 *   Body: { action: "approve" | "reject", note?: string }
 *
 * Risk R8 lock-in:
 *   - Only pending scholarships can be approved/rejected
 *   - On approve: status → "active", updates fee plan scholarship_amount
 *   - On reject: status → "revoked", no fee plan changes
 *   - Audit logged
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const approveSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/v1/scholarships/:id/approve */
export const POST = withPermission("scholarship.approve", async (req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = approveSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const existing = await db.scholarship.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
    include: {
      student: { select: { id: true, code: true, name: true } },
    },
  });
  if (!existing) return errorResponse("Scholarship not found", 404);

  // Only pending scholarships can be approved/rejected
  if (existing.status !== "pending") {
    return errorResponse(`Cannot ${parsed.data.action} a scholarship with status "${existing.status}". Only pending scholarships can be approved/rejected.`, 409);
  }

  if (parsed.data.action === "approve") {
    // --- Approve: set status to "active" + update fee plan ---
    await db.$transaction(async (tx) => {
      await tx.scholarship.update({
        where: { id },
        data: {
          status: "active",
          approved_by: tenantCtx.user_id,
          approved_at: new Date(),
          note: parsed.data.note ?? existing.note,
          updated_by: tenantCtx.user_id,
        } as never,
      });

      // Update fee plan scholarship_amount
      const feePlan = await tx.feePlan.findFirst({
        where: { student_id: existing.student_id, academic_year: existing.academic_year, deleted_at: null },
      });
      if (feePlan) {
        const newScholarshipAmount = Number(feePlan.scholarship_amount) + Number(existing.amount_per_year);
        const newNetPayable = Number(feePlan.total_amount) - newScholarshipAmount;
        await tx.feePlan.update({
          where: { id: feePlan.id },
          data: {
            scholarship_amount: newScholarshipAmount,
            net_payable: Math.max(0, newNetPayable),
            updated_by: tenantCtx.user_id,
          } as never,
        });
      }
    });

    // Audit log
    await db.auditLog.create({
      data: {
        organization_id: tenantCtx.organization_id,
        branch_id: tenantCtx.branch_id ?? null,
        entity_type: "scholarships",
        entity_id: id,
        action: "approve",
        old_values: { status: "pending" },
        new_values: { status: "active", approved_by: tenantCtx.user_id },
        actor_id: tenantCtx.user_id,
      } as never,
    });

    return successResponse(
      {
        id,
        status: "active",
        student_code: existing.student.code,
        amount_per_year: Number(existing.amount_per_year),
      },
      `Scholarship approved for ${existing.student.name}. Fee plan updated with ৳${Number(existing.amount_per_year)} discount.`,
    );
  } else {
    // --- Reject: set status to "revoked" ---
    await db.scholarship.update({
      where: { id },
      data: {
        status: "revoked",
        note: parsed.data.note ?? existing.note,
        updated_by: tenantCtx.user_id,
      } as never,
    });

    // Audit log
    await db.auditLog.create({
      data: {
        organization_id: tenantCtx.organization_id,
        branch_id: tenantCtx.branch_id ?? null,
        entity_type: "scholarships",
        entity_id: id,
        action: "reject",
        old_values: { status: "pending" },
        new_values: { status: "revoked" },
        actor_id: tenantCtx.user_id,
      } as never,
    });

    return successResponse(
      { id, status: "revoked" },
      `Scholarship rejected for ${existing.student.name}. No fee plan changes.`,
    );
  }
});
