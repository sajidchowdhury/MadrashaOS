/**
 * MadrashaOS — Approval Approve API
 *
 * Phase B8.4 — D16: "Requester cannot approve own request"
 *
 * POST /api/v1/approvals/:id/approve — approve request (perm: approval.approve)
 *   D16: if requested_by === current_user → 403 "Cannot approve your own request"
 *   Body: { note? }
 *   Sets status='approved', decided_by, decided_at, decision_note
 *   Audit logged
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const approveSchema = z.object({
  note: z.string().max(500).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withPermission("approval.approve", async (req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); } catch { body = {}; }

  const parsed = approveSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const approval = await db.approval.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
    include: { requester: { select: { id: true, name: true } } },
  });
  if (!approval) return errorResponse("Approval not found", 404);

  // D16: Requester cannot approve own request
  if (approval.requested_by === tenantCtx.user_id) {
    return errorResponse(
      "Cannot approve your own request. This is a segregation-of-duties control (Do-Not-Do D16). The server also enforces this constraint.",
      403,
      {
        approval_id: id,
        requested_by: approval.requested_by,
        current_user: tenantCtx.user_id,
        constraint: "D16 — no self-approve",
        requester_name: approval.requester.name,
      },
    );
  }

  if (approval.status !== "pending") {
    return errorResponse(`Cannot approve a request with status "${approval.status}". Only pending requests can be approved.`, 409);
  }

  await db.approval.update({
    where: { id },
    data: {
      status: "approved",
      decided_by: tenantCtx.user_id,
      decided_at: new Date(),
      decision_note: parsed.data.note ?? null,
      updated_by: tenantCtx.user_id,
    } as never,
  });

  // Audit log
  await db.auditLog.create({
    data: {
      organization_id: tenantCtx.organization_id,
      branch_id: tenantCtx.branch_id ?? null,
      entity_type: "approvals",
      entity_id: id,
      action: "approve",
      old_values: { status: "pending" },
      new_values: {
        status: "approved",
        decided_by: tenantCtx.user_id,
        note: parsed.data.note,
        requester: approval.requester.name,
        title: approval.title,
      },
      actor_user_id: tenantCtx.user_id,
    } as never,
  });

  return successResponse(
    { id, status: "approved", decided_by: tenantCtx.user_id, title: approval.title },
    `Approval "${approval.title}" approved. Requester: ${approval.requester.name}.`,
  );
});
