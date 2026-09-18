/**
 * MadrashaOS — Approval Delegate API
 *
 * Phase B8.4 — Risk R15: "Approval delegation (OOO — out of office)"
 *
 * POST /api/v1/approvals/:id/delegate — delegate approval to another user (perm: approval.delegate)
 *   Body: { delegate_to_user_id, note? }
 *   Sets delegated_to on the approval record
 *   The delegated user can then approve/reject on behalf of the original approver
 *   Audit logged
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const delegateSchema = z.object({
  delegate_to_user_id: z.string().uuid(),
  note: z.string().max(500).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withPermission("approval.delegate", async (req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = delegateSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const approval = await db.approval.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
    include: { requester: { select: { id: true, name: true } } },
  });
  if (!approval) return errorResponse("Approval not found", 404);

  if (approval.status !== "pending") {
    return errorResponse(`Cannot delegate a request with status "${approval.status}". Only pending requests can be delegated.`, 409);
  }

  // Verify the delegate user exists + is in the same org
  const delegateUser = await db.user.findFirst({
    where: {
      id: parsed.data.delegate_to_user_id,
      organization_id: tenantCtx.organization_id,
      deleted_at: null,
      status: "active",
    },
    select: { id: true, name: true, name_bn: true },
  });
  if (!delegateUser) return errorResponse("Delegate user not found or inactive", 404);

  // D16: Cannot delegate to the requester themselves
  if (parsed.data.delegate_to_user_id === approval.requested_by) {
    return errorResponse(
      "Cannot delegate approval to the original requester. This violates segregation of duties (D16).",
      403,
      { delegate_to: parsed.data.delegate_to_user_id, requested_by: approval.requested_by },
    );
  }

  await db.approval.update({
    where: { id },
    data: {
      delegated_to: parsed.data.delegate_to_user_id,
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
      action: "delegate",
      old_values: { delegated_to: approval.delegated_to ?? null },
      new_values: {
        delegated_to: parsed.data.delegate_to_user_id,
        delegate_name: delegateUser.name,
        note: parsed.data.note,
        title: approval.title,
      },
      actor_id: tenantCtx.user_id,
    } as never,
  });

  return successResponse(
    {
      id,
      title: approval.title,
      delegated_to: delegateUser.name,
      delegated_to_bn: delegateUser.name_bn,
      status: "pending (delegated)",
    },
    `Approval "${approval.title}" delegated to ${delegateUser.name}. They can now approve or reject on your behalf.`,
  );
});
