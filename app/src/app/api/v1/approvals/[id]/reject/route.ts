/**
 * MadrashaOS — Approval Reject API
 *
 * Phase B8.4 — D16: "Requester cannot approve own request" (also applies to reject)
 *
 * POST /api/v1/approvals/:id/reject — reject request (perm: approval.reject)
 *   D16: if requested_by === current_user → 403 "Cannot reject your own request"
 *   Body: { rejection_reason, note? }
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const rejectSchema = z.object({
  rejection_reason: z.string().min(1).max(500),
  note: z.string().max(500).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withPermission("approval.reject", async (req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = rejectSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const approval = await db.approval.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
    include: { requester: { select: { id: true, name: true } } },
  });
  if (!approval) return errorResponse("Approval not found", 404);

  // D16: Requester cannot reject own request either
  if (approval.requested_by === tenantCtx.user_id) {
    return errorResponse(
      "Cannot reject your own request. This is a segregation-of-duties control (Do-Not-Do D16).",
      403,
      { approval_id: id, constraint: "D16 — no self-reject", requester_name: approval.requester.name },
    );
  }

  if (approval.status !== "pending") {
    return errorResponse(`Cannot reject a request with status "${approval.status}". Only pending requests can be rejected.`, 409);
  }

  await db.approval.update({
    where: { id },
    data: {
      status: "rejected",
      decided_by: tenantCtx.user_id,
      decided_at: new Date(),
      rejection_reason: parsed.data.rejection_reason,
      decision_note: parsed.data.note ?? null,
      updated_by: tenantCtx.user_id,
    } as never,
  });

  await db.auditLog.create({
    data: {
      organization_id: tenantCtx.organization_id,
      branch_id: tenantCtx.branch_id ?? null,
      entity_type: "approvals",
      entity_id: id,
      action: "reject",
      old_values: { status: "pending" },
      new_values: {
        status: "rejected",
        rejection_reason: parsed.data.rejection_reason,
        decided_by: tenantCtx.user_id,
        requester: approval.requester.name,
        title: approval.title,
      },
      actor_id: tenantCtx.user_id,
    } as never,
  });

  return successResponse(
    { id, status: "rejected", rejection_reason: parsed.data.rejection_reason, title: approval.title },
    `Approval "${approval.title}" rejected. Reason: ${parsed.data.rejection_reason}`,
  );
});
