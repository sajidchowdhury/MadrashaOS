/**
 * MadrashaOS — Branch Switch API
 *
 * Phase B3.1 — Organization & Multi-Branch API
 * P6.2 — JWT refresh fix (Session 6.2)
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
 * P6.2 JWT refresh:
 *   The NextAuth JWT (stateless, 15-min TTL) caches `branch_id` at sign-in.
 *   Without intervention, the JWT keeps the OLD branch_id until it expires
 *   — so all `tenantWhere(ctx)` calls scope to the old branch.
 *   Fix: after `User.branch_id` is updated, this route calls
 *   `invalidateUserBranchCache(user_id)` so the `jwt` callback in
 *   `src/lib/auth/config.ts` re-reads the new branch_id from the DB on the
 *   very next request. The client (`src/components/shell/TopBar.tsx`)
 *   also calls `window.location.reload()` after success to force a fresh
 *   session fetch + TanStack cache reset.
 *
 * Body: { branch_id: string (uuid) }
 * Response: { success: true, message, data: { id, code, name, name_bn } }
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { invalidateUserBranchCache } from "@/lib/auth/config";
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

  // P6.2: Invalidate the in-memory branch cache so the very next request
  // from this user picks up the new branch_id from the DB. The `jwt`
  // callback in src/lib/auth/config.ts re-reads branch_id on every call,
  // but coalesces parallel requests via a 5s cache — this invalidation
  // ensures the cache doesn't serve the stale old branch_id after a switch.
  invalidateUserBranchCache(ctx.user_id);

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
    "Branch switched successfully. Your session will refresh on the next request.",
  );
});
