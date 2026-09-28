/**
 * MadrashaOS — Approval Gate Helper
 *
 * Provides threshold-based approval gating for business operations.
 * When an operation exceeds a configurable threshold, it requires an
 * approved Approval row before proceeding. If no approval exists, a
 * pending approval request is automatically created.
 *
 * Usage:
 *   const gate = await checkApprovalGate(ctx, {
 *     type: "salary",
 *     title: `Salary — ${staffName} — ${month}/${year}`,
 *     amount: salaryAmount,
 *     entityType: "payroll",
 *     entityId: staffId,
 *     payload: { staff_id, month, year },
 *   });
 *   if (gate.status === "pending") return gate.response; // 202 — approval needed
 *   if (gate.status === "rejected") return gate.response; // 403 — rejected
 *   // gate.status === "approved" → proceed with the operation
 *
 * Thresholds (configurable via env, with sensible defaults):
 *   SALARY_APPROVAL_THRESHOLD   — BDT 20,000 (salaries above this need approval)
 *   DISCOUNT_APPROVAL_THRESHOLD — BDT 5,000  (scholarships above this need approval)
 *   EXPENSE_APPROVAL_THRESHOLD  — BDT 10,000 (expenses above this need approval)
 */

import { db } from "@/lib/db";
import { errorResponse } from "@/lib/api/helpers";
import type { TenantContext } from "@/lib/auth/with-tenant";

export type ApprovalGateType = "salary" | "discount" | "expense" | "purchase";

export type ApprovalGateInput = {
  type: ApprovalGateType;
  title: string;
  description?: string;
  amount: number;
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown>;
};

export type ApprovalGateResult = {
  /** "approved" → proceed with the operation */
  /** "pending" → a new approval was created; return the 202 response */
  /** "rejected" → a prior approval was rejected; return the 403 response */
  /** "below_threshold" → amount is under the threshold; proceed without approval */
  status: "approved" | "pending" | "rejected" | "below_threshold";
  approvalId?: string;
  response?: Response;
};

// --- Thresholds (env-configurable with defaults) ---
const SALARY_APPROVAL_THRESHOLD =
  Number(process.env.SALARY_APPROVAL_THRESHOLD) || 20000;
const DISCOUNT_APPROVAL_THRESHOLD =
  Number(process.env.DISCOUNT_APPROVAL_THRESHOLD) || 5000;
const EXPENSE_APPROVAL_THRESHOLD =
  Number(process.env.EXPENSE_APPROVAL_THRESHOLD) || 10000;

function getThreshold(type: ApprovalGateType): number {
  switch (type) {
    case "salary": return SALARY_APPROVAL_THRESHOLD;
    case "discount": return DISCOUNT_APPROVAL_THRESHOLD;
    case "expense": return EXPENSE_APPROVAL_THRESHOLD;
    case "purchase": return EXPENSE_APPROVAL_THRESHOLD; // same as expense
  }
}

/**
 * Checks whether an operation requires approval and whether an approved
 * approval exists. If the amount is below the threshold, returns
 * "below_threshold" (no approval needed). If above the threshold:
 *   - Looks for an existing approval matching the type + entity_id.
 *   - If approved → returns "approved" (proceed).
 *   - If rejected → returns "rejected" (block, with response).
 *   - If pending or none → creates a new pending approval request and
 *     returns "pending" (with a 202 response telling the caller to
 *     wait for approval).
 *
 * D16 (no self-approve) is enforced downstream by the approve endpoint.
 */
export async function checkApprovalGate(
  ctx: TenantContext,
  input: ApprovalGateInput,
): Promise<ApprovalGateResult> {
  const threshold = getThreshold(input.type);

  // Below threshold — no approval needed
  if (input.amount <= threshold) {
    return { status: "below_threshold" };
  }

  // Look for an existing approval for this entity + type
  const existing = await db.approval.findFirst({
    where: {
      organization_id: ctx.organization_id,
      type: input.type,
      entity_type: input.entityType,
      entity_id: input.entityId,
      deleted_at: null,
    },
    orderBy: { requested_at: "desc" },
    select: {
      id: true,
      status: true,
      requested_by: true,
      decided_by: true,
      rejection_reason: true,
    },
  });

  if (existing) {
    if (existing.status === "approved") {
      return { status: "approved", approvalId: existing.id };
    }
    if (existing.status === "rejected") {
      return {
        status: "rejected",
        approvalId: existing.id,
        response: errorResponse(
          `This ${input.type} requires approval but a prior approval request was rejected. ` +
          `Reason: ${existing.rejection_reason ?? "Not specified"}. ` +
          `Please create a new approval request or adjust the amount.`,
          403,
          {
            approval_id: existing.id,
            type: input.type,
            amount: input.amount,
            threshold,
          },
        ),
      };
    }
    // pending — return the existing pending approval
    if (existing.status === "pending") {
      return {
        status: "pending",
        approvalId: existing.id,
        response: Response.json(
          {
            success: false,
            error: `Approval required for this ${input.type} (amount ৳${input.amount.toLocaleString()} exceeds threshold ৳${threshold.toLocaleString()}). ` +
              `An approval request is already pending — ask an authorized person to approve it.`,
            data: {
              approval_id: existing.id,
              type: input.type,
              title: input.title,
              amount: input.amount,
              threshold,
              status: "pending",
            },
          },
          { status: 202 },
        ),
      };
    }
  }

  // No existing approval — create a new pending request
  const approval = await db.approval.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      type: input.type,
      title: input.title,
      description: input.description ?? null,
      amount: input.amount,
      payload: input.payload ?? {},
      status: "pending",
      requested_by: ctx.user_id,
      entity_type: input.entityType,
      entity_id: input.entityId,
      created_by: ctx.user_id,
    } as never,
    select: { id: true },
  });

  // Audit log (best-effort)
  try {
    await db.auditLog.create({
      data: {
        organization_id: ctx.organization_id,
        actor_user_id: ctx.user_id,
        action: `approval.request.${input.type}`,
        entity_type: "approvals",
        entity_id: approval.id,
        metadata: {
          type: input.type,
          title: input.title,
          amount: input.amount,
          threshold,
          entity_type: input.entityType,
          entity_id: input.entityId,
        },
      } as never,
    });
  } catch {
    // Non-fatal
  }

  return {
    status: "pending",
    approvalId: approval.id,
    response: Response.json(
      {
        success: false,
        error: `Approval required for this ${input.type} (amount ৳${input.amount.toLocaleString()} exceeds threshold ৳${threshold.toLocaleString()}). ` +
          `A new approval request has been created — ask an authorized person to approve it, then retry.`,
        data: {
          approval_id: approval.id,
          type: input.type,
          title: input.title,
          amount: input.amount,
          threshold,
          status: "pending",
        },
      },
      { status: 202 },
    ),
  };
}
