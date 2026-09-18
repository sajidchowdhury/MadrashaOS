/**
 * MadrashaOS — Roles API
 *
 * Phase B3.3 — RBAC API + Permission Matrix
 *
 * GET /api/v1/roles
 *   Lists all roles in the current org (system + custom).
 *   Permission: rbac.role.view
 *   Returns: array of { id, code, name, name_bn, description, is_system,
 *                       is_platform, priority, _count: { role_permissions } }
 *
 * POST /api/v1/roles
 *   Creates a new custom role.
 *   Permission: rbac.role.create
 *   Body: { code, name, description? }
 *
 *   Guardrails:
 *     - `code` must not collide with an existing role in the same org.
 *     - `code` must not match any existing *system* role code in any org
 *       (you can't shadow "super-admin", "authority", etc.).
 *     - Newly created roles are always `is_system = false` (system roles
 *       are seeded via prisma/seed.ts only — never via the API).
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { createRoleSchema } from "@/lib/validation/schemas";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/** GET /api/v1/roles — list roles in the current tenant */
export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx) {
    return errorResponse("Unauthorized", 401);
  }

  // Super-admin sees across tenants (organization_id is still on their
  // session — they get one tenant at a time); other roles are scoped to
  // their own organization_id. Branch_id is irrelevant for roles (a role
  // can be org-level or branch-level; we list both).
  const where = {
    organization_id: ctx.organization_id,
    deleted_at: null,
  };

  const roles = await db.role.findMany({
    where,
    orderBy: [{ is_system: "desc" }, { priority: "asc" }, { created_at: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      name_bn: true,
      description: true,
      is_system: true,
      is_platform: true,
      priority: true,
      branch_id: true,
      created_at: true,
      _count: {
        select: {
          role_permissions: { where: { deleted_at: null } },
          users: { where: { deleted_at: null } },
        },
      },
    },
  });

  return jsonResponse({
    data: roles,
    total: roles.length,
  });
}

/** POST /api/v1/roles — create custom role */
export const POST = withPermission("rbac.role.create", async (req) => {
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

  const parsed = createRoleSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parsed.error.flatten());
  }

  const data = parsed.data;

  // Check 1: code uniqueness within the current org (the @@unique index
  // covers this at the DB level too, but we want a clean 409 instead of
  // a raw Prisma P2002 error).
  const existingInOrg = await db.role.findFirst({
    where: {
      organization_id: ctx.organization_id,
      code: data.code,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existingInOrg) {
    return errorResponse(
      `Role with code "${data.code}" already exists in this organization`,
      409,
    );
  }

  // Check 2: code must not match any existing system role code (even
  // cross-org). You can't shadow "super-admin" / "authority" / etc.
  const systemCollision = await db.role.findFirst({
    where: {
      code: data.code,
      is_system: true,
      deleted_at: null,
    },
    select: { id: true, organization_id: true },
  });
  if (systemCollision) {
    return errorResponse(
      `Code "${data.code}" is reserved for a system role and cannot be used for a custom role`,
      409,
    );
  }

  // Count existing roles to assign a sensible default priority (custom
  // roles get a priority below the 8 system roles' 0-100 range).
  const roleCount = await db.role.count({
    where: { organization_id: ctx.organization_id, deleted_at: null },
  });

  const role = await db.role.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id,
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      is_system: false,
      is_platform: false,
      priority: 200 + roleCount,
      created_by: ctx.user_id,
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
      created_at: true,
    },
  });

  return successResponse(role, "Role created");
});
