/**
 * MadrashaOS — Single Branch API
 *
 * Phase B3.1 — Organization & Multi-Branch API
 *
 * GET    /api/v1/branches/:id  — single branch info
 * PATCH  /api/v1/branches/:id  — update branch
 * DELETE /api/v1/branches/:id  — soft-delete branch (sets deleted_at)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { updateBranchSchema } from "@/lib/validation/schemas";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/** GET /api/v1/branches/:id */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) {
    return errorResponse("Unauthorized", 401);
  }

  const { id } = await ctx.params;

  const branch = await db.branch.findFirst({
    where: {
      id,
      organization_id: tenantCtx.organization_id,
      deleted_at: null,
    },
    include: {
      _count: {
        select: {
          users: true,
          students: true,
          classes: true,
        },
      },
    },
  });

  if (!branch) {
    return errorResponse("Branch not found", 404);
  }

  return jsonResponse({
    id: branch.id,
    code: branch.code,
    name: branch.name,
    name_bn: branch.name_bn,
    address: branch.address,
    phone: branch.phone,
    email: branch.email,
    established_year: branch.established_year,
    is_active: branch.is_active,
    latitude: branch.latitude,
    longitude: branch.longitude,
    created_at: branch.created_at,
    stats: {
      users: branch._count.users,
      students: branch._count.students,
      classes: branch._count.classes,
    },
  });
}

/** PATCH /api/v1/branches/:id */
export const PATCH = withPermission(
  "organization.branch.create",
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

    const parsed = updateBranchSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    // Verify branch belongs to current org
    const existing = await db.branch.findFirst({
      where: {
        id,
        organization_id: tenantCtx.organization_id,
        deleted_at: null,
      },
    });
    if (!existing) {
      return errorResponse("Branch not found", 404);
    }

    const updated = await db.branch.update({
      where: { id },
      data: {
        ...parsed.data,
        updated_by: tenantCtx.user_id,
      },
    });

    return successResponse(updated, "Branch updated");
  },
);

/** DELETE /api/v1/branches/:id — soft delete */
export const DELETE = withPermission(
  "organization.branch.create",
  async (
    _req: Request,
    ctx: { params: Promise<{ id: string }> },
  ) => {
    const tenantCtx = await getTenantContext();
    if (!tenantCtx) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await ctx.params;

    // Verify branch belongs to current org + not already deleted
    const existing = await db.branch.findFirst({
      where: {
        id,
        organization_id: tenantCtx.organization_id,
        deleted_at: null,
      },
    });
    if (!existing) {
      return errorResponse("Branch not found", 404);
    }

    // Check if branch has active users/students (prevent deletion if not empty)
    const userCount = await db.user.count({
      where: { branch_id: id, deleted_at: null, status: "active" },
    });
    if (userCount > 0) {
      return errorResponse(
        `Cannot delete branch with ${userCount} active users. Transfer or disable them first.`,
        409,
      );
    }

    // Soft delete
    await db.branch.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        is_active: false,
        updated_by: tenantCtx.user_id,
      },
    });

    return successResponse(null, "Branch deleted (soft)");
  },
);
