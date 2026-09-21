/**
 * MadrashaOS — Single Approval API
 *
 * Phase B8.4
 *
 * GET /api/v1/approvals/:id — single approval with full details
 * PATCH /api/v1/approvals/:id — update (only for pending; requester only)
 * DELETE /api/v1/approvals/:id — soft delete (requester only; only if pending)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/v1/approvals/:id */
export async function GET(_req: Request, ctx: RouteContext) {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const approval = await db.approval.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
    include: {
      requester: { select: { id: true, name: true, name_bn: true } },
      decider: { select: { id: true, name: true, name_bn: true } },
      delegate: { select: { id: true, name: true, name_bn: true } },
    },
  });

  if (!approval) return errorResponse("Approval not found", 404);

  return jsonResponse({
    id: approval.id,
    type: approval.type,
    title: approval.title,
    description: approval.description,
    amount: approval.amount ? Number(approval.amount) : null,
    payload: approval.payload,
    status: approval.status,
    requested_by: approval.requester.name,
    requested_by_bn: approval.requester.name_bn,
    requested_at: approval.requested_at,
    decided_by: approval.decider?.name ?? null,
    decided_by_bn: approval.decider?.name_bn ?? null,
    decided_at: approval.decided_at,
    decision_note: approval.decision_note,
    rejection_reason: approval.rejection_reason,
    delegated_to: approval.delegate?.name ?? null,
    delegated_to_bn: approval.delegate?.name_bn ?? null,
    expires_at: approval.expires_at,
    entity_type: approval.entity_type,
    entity_id: approval.entity_id,
    // D16 flags for frontend
    is_self_request: approval.requested_by === tenantCtx.user_id,
    can_approve: approval.requested_by !== tenantCtx.user_id && approval.status === "pending",
    can_reject: approval.requested_by !== tenantCtx.user_id && approval.status === "pending",
    can_delegate: approval.status === "pending",
    can_cancel: approval.requested_by === tenantCtx.user_id && approval.status === "pending",
  });
}

/** DELETE /api/v1/approvals/:id — cancel (requester only; only if pending) */
export async function DELETE(_req: Request, ctx: RouteContext) {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const approval = await db.approval.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
  });
  if (!approval) return errorResponse("Approval not found", 404);

  // Only the requester can cancel
  if (approval.requested_by !== tenantCtx.user_id) {
    return errorResponse("Only the original requester can cancel this approval.", 403);
  }

  if (approval.status !== "pending") {
    return errorResponse(`Cannot cancel a request with status "${approval.status}". Only pending requests can be cancelled.`, 409);
  }

  await db.approval.update({
    where: { id },
    data: {
      deleted_at: new Date(),
      status: "rejected",
      rejection_reason: "Cancelled by requester",
      decided_by: tenantCtx.user_id,
      decided_at: new Date(),
      updated_by: tenantCtx.user_id,
    } as never,
  });

  await db.auditLog.create({
    data: {
      organization_id: tenantCtx.organization_id,
      branch_id: tenantCtx.branch_id ?? null,
      entity_type: "approvals",
      entity_id: id,
      action: "cancel",
      old_values: { status: "pending" },
      new_values: { status: "rejected", reason: "Cancelled by requester" },
      actor_id: tenantCtx.user_id,
    } as never,
  });

  return successResponse(null, "Approval request cancelled.");
}
