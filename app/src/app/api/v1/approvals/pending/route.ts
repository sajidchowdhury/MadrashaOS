/**
 * MadrashaOS — Pending Approvals API
 *
 * Phase B8.4
 *
 * GET /api/v1/approvals/pending — pending approvals for current user (perm: approval.view)
 *   Excludes approvals requested BY the current user (D16 — can't approve own request)
 *   Only shows approvals where user is the designated approver (or all pending if authority role)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, parsePagination } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export const GET = withPermission("approval.view", async (req: Request) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);

  // D16: Show pending approvals NOT requested by the current user
  const where = {
    organization_id: ctx.organization_id,
    ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}),
    deleted_at: null,
    status: "pending",
    requested_by: { not: ctx.user_id }, // D16 — exclude self-requests
    // Also include approvals delegated to this user
    OR: [
      { delegated_to: null }, // unassigned — any approver can take
      { delegated_to: ctx.user_id }, // specifically delegated to me
    ],
  };

  const [approvals, total] = await Promise.all([
    db.approval.findMany({
      where,
      orderBy: { requested_at: "desc" },
      skip, take,
      include: {
        requester: { select: { id: true, name: true, name_bn: true } },
        delegate: { select: { id: true, name: true } },
      },
    }),
    db.approval.count({ where }),
  ]);

  return jsonResponse({
    data: approvals.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      description: a.description,
      amount: a.amount ? Number(a.amount) : null,
      status: a.status,
      requested_by: a.requester.name,
      requested_by_bn: a.requester.name_bn,
      requested_at: a.requested_at,
      expires_at: a.expires_at,
      delegated_to: a.delegate?.name ?? null,
      entity_type: a.entity_type,
      entity_id: a.entity_id,
      can_approve: a.requested_by !== ctx.user_id, // D16 — can't approve own request
    })),
    summary: {
      total_pending: total,
      can_approve: approvals.filter((a) => a.requested_by !== ctx.user_id).length,
      delegated_to_me: approvals.filter((a) => a.delegated_to === ctx.user_id).length,
    },
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
});
