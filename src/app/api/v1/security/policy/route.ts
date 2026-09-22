/**
 * MadrashaOS — Security Policy API (Session 8.4)
 *
 * GET  /api/v1/security/policy — read the org's security policy
 * PUT  /api/v1/security/policy — update the org's security policy
 *   Permission: security.policy.edit
 *
 * The SecurityPolicy table is seeded with sensible defaults. If no row
 * exists for the org (e.g. org created before this feature), one is
 * created on first GET.
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updatePolicySchema = z.object({
  mfa_required: z.boolean().optional(),
  password_expiry_days: z.number().int().min(1).max(365).optional(),
  session_ttl_minutes: z.number().int().min(5).max(1440).optional(),
  ip_allowlist: z.array(z.string()).optional(),
  password_min_length: z.number().int().min(6).max(128).optional(),
  failed_login_lockout_threshold: z.number().int().min(1).max(20).optional(),
  failed_login_lockout_minutes: z.number().int().min(1).max(1440).optional(),
});

/** GET /api/v1/security/policy */
export const GET = withPermission("security.policy.edit", async () => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let policy = await db.securityPolicy.findFirst({
    where: {
      organization_id: ctx.organization_id,
      deleted_at: null,
    },
  });

  // Create default policy if none exists
  if (!policy) {
    policy = await db.securityPolicy.create({
      data: {
        organization_id: ctx.organization_id,
        branch_id: ctx.branch_id ?? null,
        created_by: ctx.user_id ?? null,
      } as never,
    });
  }

  return jsonResponse({
    id: policy.id,
    mfa_required: policy.mfa_required,
    password_expiry_days: policy.password_expiry_days,
    session_ttl_minutes: policy.session_ttl_minutes,
    ip_allowlist: policy.ip_allowlist,
    password_min_length: policy.password_min_length,
    failed_login_lockout_threshold: policy.failed_login_lockout_threshold,
    failed_login_lockout_minutes: policy.failed_login_lockout_minutes,
  });
});

/** PUT /api/v1/security/policy */
export const PUT = withPermission("security.policy.edit", async (req: Request) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = updatePolicySchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const data = parsed.data;

  // Find or create the policy
  let policy = await db.securityPolicy.findFirst({
    where: { organization_id: ctx.organization_id, deleted_at: null },
  });

  if (!policy) {
    policy = await db.securityPolicy.create({
      data: {
        organization_id: ctx.organization_id,
        branch_id: ctx.branch_id ?? null,
        created_by: ctx.user_id ?? null,
        ...data,
      } as never,
    });
  } else {
    policy = await db.securityPolicy.update({
      where: { id: policy.id },
      data: {
        ...data,
        updated_by: ctx.user_id ?? null,
      } as never,
    });
  }

  // Audit log
  await db.auditLog.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      entity_type: "security_policies",
      entity_id: policy.id,
      action: "update",
      old_values: null,
      new_values: data as never,
      actor_user_id: ctx.user_id,
    } as never,
  });

  return jsonResponse({
    id: policy.id,
    mfa_required: policy.mfa_required,
    password_expiry_days: policy.password_expiry_days,
    session_ttl_minutes: policy.session_ttl_minutes,
    ip_allowlist: policy.ip_allowlist,
    message: "Security policy updated.",
  });
});
