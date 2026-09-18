/**
 * MadrashaOS — Role Permission Assignment API
 *
 * Phase B3.3 — RBAC API + Permission Matrix
 *
 * GET /api/v1/roles/:id/permissions
 *   Lists all permission codes currently assigned to the role.
 *   Permission: rbac.role.view
 *
 * PUT /api/v1/roles/:id/permissions
 *   Replaces the role's full permission set with the supplied list.
 *   Permission: rbac.permission.assign
 *   Body: { permission_codes: string[] }
 *
 *   Semantics: full replace (not patch). After the call, the role has
 *   EXACTLY the permissions in `permission_codes` — existing assignments
 *   not in the new list are soft-deleted (deleted_at set), and new
 *   assignments are created. The DB junction `@@unique([role_id,
 *   permission_id])` is respected — we resurrect soft-deleted rows
 *   rather than INSERT-collide.
 *
 *   Validation:
 *     - Every code in `permission_codes` must exist in the Permission
 *       table (no orphan assignments). 422 with `{ invalid_codes: [] }`
 *       if any are unknown.
 *     - The role must exist in the current tenant. 404 if not.
 *     - System roles ARE mutable here (the spec lets admins re-tune the
 *       default role→permission map per-tenant); the seed remains the
 *       source of truth for new tenants, but per-tenant overrides go
 *       through this endpoint.
 *
 *   Audit: each create/restore writes `granted_by` = current user.
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { assignPermissionsSchema } from "@/lib/validation/schemas";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/** GET /api/v1/roles/:id/permissions — list permissions for a role */
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
    select: {
      id: true,
      code: true,
      name: true,
      is_system: true,
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
          granted_by: true,
          scope_note: true,
        },
        orderBy: [{ permission: { module: "asc" } }, { permission: { code: "asc" } }],
      },
    },
  });

  if (!role) {
    return errorResponse("Role not found", 404);
  }

  return jsonResponse({
    role: {
      id: role.id,
      code: role.code,
      name: role.name,
      is_system: role.is_system,
    },
    permissions: role.role_permissions.map((rp) => ({
      id: rp.permission.id,
      code: rp.permission.code,
      module: rp.permission.module,
      name: rp.permission.name,
      description: rp.permission.description,
      is_scoped: rp.permission.is_scoped,
      granted_at: rp.granted_at,
      granted_by: rp.granted_by,
      scope_note: rp.scope_note,
    })),
    total: role.role_permissions.length,
  });
}

/** PUT /api/v1/roles/:id/permissions — replace permission set */
export const PUT = withPermission(
  "rbac.permission.assign",
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

    const parsed = assignPermissionsSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    // De-duplicate the incoming list (a frontend checkbox matrix can
    // occasionally send duplicates if the user toggles rapidly).
    const requestedCodes = Array.from(new Set(parsed.data.permission_codes));

    // Verify the role exists in the current tenant.
    const role = await db.role.findFirst({
      where: {
        id,
        organization_id: tenantCtx.organization_id,
        deleted_at: null,
      },
      select: { id: true, code: true, name: true, is_system: true },
    });
    if (!role) {
      return errorResponse("Role not found", 404);
    }

    // Validate every requested code exists in the Permission table.
    // We do a single findMany against the unique `code` column.
    const existingPerms = await db.permission.findMany({
      where: {
        code: { in: requestedCodes },
        deleted_at: null,
      },
      select: { id: true, code: true },
    });

    const existingCodes = new Set(existingPerms.map((p) => p.code));
    const invalidCodes = requestedCodes.filter((c) => !existingCodes.has(c));
    if (invalidCodes.length > 0) {
      return errorResponse(
        "Some permission codes are not in the catalog",
        422,
        { invalid_codes: invalidCodes },
      );
    }

    // Snapshot current assignments (so we can compute the diff for the
    // response + audit later — Phase B3 audit hooks into this naturally).
    const currentAssignments = await db.rolePermission.findMany({
      where: { role_id: role.id, deleted_at: null },
      select: { id: true, permission_id: true, deleted_at: true },
    });

    const currentPermIds = new Set(
      currentAssignments.map((a) => a.permission_id),
    );
    const requestedPermIds = new Set(existingPerms.map((p) => p.id));

    const toRemove = currentAssignments.filter(
      (a) => !requestedPermIds.has(a.permission_id),
    );
    const toAdd = existingPerms.filter((p) => !currentPermIds.has(p.id));

    // Wrap in a transaction: soft-delete the removed rows + insert the
    // new rows atomically. If anything fails, the role's matrix is left
    // untouched.
    await db.$transaction(async (tx) => {
      // 1. Soft-delete removed assignments.
      if (toRemove.length > 0) {
        await tx.rolePermission.updateMany({
          where: { id: { in: toRemove.map((r) => r.id) } },
          data: {
            deleted_at: new Date(),
            updated_by: tenantCtx.user_id,
          },
        });
      }

      // 2. Insert new assignments. Use upsert against the
      //    @@unique([role_id, permission_id]) so a previously
      //    soft-deleted row is resurrected (deleted_at cleared) instead
      //    of triggering a P2002 unique-constraint violation.
      if (toAdd.length > 0) {
        await Promise.all(
          toAdd.map((p) =>
            tx.rolePermission.upsert({
              where: {
                role_id_permission_id: {
                  role_id: role.id,
                  permission_id: p.id,
                },
              },
              update: {
                deleted_at: null,
                granted_by: tenantCtx.user_id,
                granted_at: new Date(),
                updated_by: tenantCtx.user_id,
              },
              create: {
                organization_id: tenantCtx.organization_id,
                branch_id: tenantCtx.branch_id,
                role_id: role.id,
                permission_id: p.id,
                granted_by: tenantCtx.user_id,
                created_by: tenantCtx.user_id,
              },
            }),
          ),
        );
      }
    });

    // Read back the freshly-reconciled set so the response reflects DB
    // truth (not the input — keeps the contract honest even if some
    // inserts were silently upserts).
    const finalAssignments = await db.rolePermission.findMany({
      where: { role_id: role.id, deleted_at: null },
      select: {
        permission: { select: { code: true } },
        granted_at: true,
      },
    });

    return successResponse(
      {
        role: {
          id: role.id,
          code: role.code,
          name: role.name,
          is_system: role.is_system,
        },
        permission_codes: finalAssignments.map((a) => a.permission.code),
        stats: {
          assigned: finalAssignments.length,
          added: toAdd.length,
          removed: toRemove.length,
        },
      },
      `Permission set updated (${toAdd.length} added, ${toRemove.length} removed)`,
    );
  },
);
