/**
 * MadrashaOS — Approvals API
 *
 * Phase B8.4 — Approvals API (no self-approve)
 *
 * GET  /api/v1/approvals — list approvals (perm: approval.view)
 * POST /api/v1/approvals — create approval request (any authenticated user)
 *
 * GET  /api/v1/approvals/pending — pending approvals for current user (perm: approval.view)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse, parsePagination } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createApprovalSchema = z.object({
  type: z.enum(["expense", "purchase", "discount", "admission"]),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  amount: z.number().min(0).optional(),
  payload: z.record(z.unknown()).optional(),
  entity_type: z.string().optional(),
  entity_id: z.string().uuid().optional(),
  expires_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** GET /api/v1/approvals — list all approvals */
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const type = url.searchParams.get("type");
  const status = url.searchParams.get("status");
  const requestedBy = url.searchParams.get("requested_by");

  const where = {
    organization_id: ctx.organization_id,
    ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}),
    deleted_at: null,
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...(requestedBy ? { requested_by: requestedBy } : {}),
  };

  const [approvals, total] = await Promise.all([
    db.approval.findMany({
      where,
      orderBy: { requested_at: "desc" },
      skip, take,
      include: {
        requester: { select: { id: true, name: true, name_bn: true } },
        decider: { select: { id: true, name: true, name_bn: true } },
        delegate: { select: { id: true, name: true, name_bn: true } },
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
      decided_by: a.decider?.name ?? null,
      decided_by_bn: a.decider?.name_bn ?? null,
      decided_at: a.decided_at,
      decision_note: a.decision_note,
      rejection_reason: a.rejection_reason,
      delegated_to: a.delegate?.name ?? null,
      delegated_to_bn: a.delegate?.name_bn ?? null,
      expires_at: a.expires_at,
      entity_type: a.entity_type,
      entity_id: a.entity_id,
      is_self_request: a.requested_by === ctx.user_id,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

/** POST /api/v1/approvals — create approval request */
export const POST = withPermission("approval.view", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = createApprovalSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const data = parsed.data;

  const approval = await db.approval.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      type: data.type,
      title: data.title,
      description: data.description ?? null,
      amount: data.amount ?? null,
      payload: data.payload ?? {},
      status: "pending",
      requested_by: ctx.user_id,
      expires_at: data.expires_at ? new Date(data.expires_at) : null,
      entity_type: data.entity_type ?? null,
      entity_id: data.entity_id ?? null,
      created_by: ctx.user_id,
    } as never,
  });

  // Audit log
  await db.auditLog.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      entity_type: "approvals",
      entity_id: approval.id,
      action: "request",
      old_values: null,
      new_values: { type: data.type, title: data.title, amount: data.amount, status: "pending" },
      actor_id: ctx.user_id,
    } as never,
  });

  return successResponse(
    { id: approval.id, type: data.type, title: data.title, status: "pending" },
    `Approval request created — "${data.title}". Awaiting approval from authorized personnel.`,
  );
});
