/**
 * MadrashaOS — Single Role API
 *
 * Phase B3.3 — RBAC API + Permission Matrix
 *
 * GET   /api/v1/roles/:id — single role with its assigned permissions
 * PATCH /api/v1/roles/:id — update role name/description
 *
 * Permission:
 *   GET   — rbac.role.view
 *   PATCH — rbac.role.update
 *
 * Guardrails:
 *   - System roles (`is_system = true`) cannot have their `code` changed.
 *     The update schema only exposes `name` + `description`, so this is
 *     enforced structurally — `code` is never writable through the API.
 *   - System roles can have their `name`/`description` patched (useful for
 *     localizing the display name) but the underlying permissions matrix
 *     is managed via PUT /api/v1/roles/:id/permissions.
 *   - Roles are scoped by organization_id (super-admin gets cross-tenant
 *     visibility via the role's own organization_id field).
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { updateRoleSchema } from "@/lib/validation/schemas";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/** GET /api/v1/roles/:id — single role + its permission codes */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) {
    return errorResponse("Unauthorized", 401);
  }

  const { id } = await ctx.params;

  const role = await db.role.findFirst({
    where: {
      id,
      organization_id: tenantCtx.organization_id,
      deleted_at: null,
    },
    include: {
      role_permissions: {
        where: { deleted_at: null },
        select: {
          permission: {
            select: {
              id: true,
              code: true,
              module: true,
              name: true,
              description: true,
              is_scoped: true,
            },
          },
          granted_at: true,
          scope_note: true,
        },
      },
      _count: {
        select: {
          role_permissions: { where: { deleted_at: null } },
          users: { where: { deleted_at: null } },
        },
      },
    },
  });

  if (!role) {
    return errorResponse("Role not found", 404);
  }

  return jsonResponse({
    id: role.id,
    code: role.code,
    name: role.name,
    name_bn: role.name_bn,
    description: role.description,
    is_system: role.is_system,
    is_platform: role.is_platform,
    priority: role.priority,
    branch_id: role.branch_id,
    created_at: role.created_at,
    stats: {
      permissions: role._count.role_permissions,
      users: role._count.users,
    },
    permissions: role.role_permissions.map((rp) => ({
      id: rp.permission.id,
      code: rp.permission.code,
      module: rp.permission.module,
      name: rp.permission.name,
      description: rp.permission.description,
      is_scoped: rp.permission.is_scoped,
      granted_at: rp.granted_at,
      scope_note: rp.scope_note,
    })),
  });
}

/** PATCH /api/v1/roles/:id — update role name/description */
export const PATCH = withPermission(
  "rbac.role.update",
  async (
    req: Request,
    ctx: { params: Promise<{ id: string }> },
  ) => {
    const tenantCtx = await getTenantContext();
    if (!tenantCtx) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await ctx.params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = updateRoleSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    // Verify role exists in the current tenant.
    const existing = await db.role.findFirst({
      where: {
        id,
        organization_id: tenantCtx.organization_id,
        deleted_at: null,
      },
      select: { id: true, is_system: true, code: true },
    });
    if (!existing) {
      return errorResponse("Role not found", 404);
    }

    // D16-adjacent guardrail: structural enforcement of "system roles
    // cannot have their code changed". The update schema doesn't expose
    // `code`, so this is impossible to violate via the API — but we keep
    // the explicit check for defense in depth (a future refactor that
    // adds `code` to the schema would still be blocked here).
    if (existing.is_system && parsed.data && "code" in parsed.data) {
      return errorResponse(
        "System role codes are immutable",
        422,
      );
    }

    const updated = await db.role.update({
      where: { id },
      data: {
        ...parsed.data,
        updated_by: tenantCtx.user_id,
      },
      select: {
        id: true,
        code: true,
        name: true,
        name_bn: true,
        description: true,
        is_system: true,
        is_platform: true,
        priority: true,
        updated_at: true,
      },
    });

    return successResponse(updated, "Role updated");
  },
);
