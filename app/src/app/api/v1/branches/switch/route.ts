/**
 * MadrashaOS — Branch Switch API
 *
 * Phase B3.1 — Organization & Multi-Branch API
 *
 * POST /api/v1/branches/switch
 *   Switches the user's active branch.
 *   Permission: organization.branch.switch (Risk R1 — opens a fresh tab context)
 *
 * Risk R1 lock-in (Session 0.4):
 *   "Switching branch opens a fresh tab; current tab keeps its context."
 *   This endpoint updates the session's branch_id on the server side.
 *   The frontend is responsible for the fresh-tab behavior.
 *
 * Body: { branch_id: string (uuid) }
 * Response: { success: true, branch: { id, code, name } }
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { switchBranchSchema } from "@/lib/validation/schemas";
import { errorResponse, successResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export const POST = withPermission("organization.branch.switch", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) {
    return errorResponse("Unauthorized", 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const parsed = switchBranchSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parsed.error.flatten());
  }

  const { branch_id } = parsed.data;

  // Verify target branch exists + belongs to current org + is active
  const branch = await db.branch.findFirst({
    where: {
      id: branch_id,
      organization_id: ctx.organization_id,
      deleted_at: null,
      is_active: true,
    },
    select: { id: true, code: true, name: true, name_bn: true },
  });

  if (!branch) {
    return errorResponse("Branch not found or inactive", 404);
  }

  // Update user's branch_id
  await db.user.update({
    where: { id: ctx.user_id },
    data: { branch_id: branch_id, updated_by: ctx.user_id },
  });

  // Log to audit trail (Risk R1: branch switch must be audited)
  await db.auditLog.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: branch_id,
      entity_type: "users",
      entity_id: ctx.user_id,
      action: "branch_switch",
      old_values: { branch_id: ctx.branch_id },
      new_values: { branch_id: branch_id },
      actor_user_id: ctx.user_id,
      ip_address: req.headers.get("x-forwarded-for") || null,
      user_agent: req.headers.get("user-agent") || null,
    } as never,
  });

  return successResponse(
    {
      id: branch.id,
      code: branch.code,
      name: branch.name,
      name_bn: branch.name_bn,
    },
    "Branch switched successfully",
  );
});
