/**
 * MadrashaOS — Single Module Config API
 *
 * Phase B3.2 — Module Configuration API
 *
 * GET   /api/v1/modules/:id  — single module config (any authenticated user)
 * PATCH /api/v1/modules/:id  — toggle enabled on/off
 *
 *   Permission: organization.module.toggle
 *   Body: { enabled: boolean }
 *
 *   Risk R2 lock-in: when toggling OFF a module that has active
 *   dependents (other enabled modules that require this one), the
 *   server returns 409 with `{ error, dependents: string[] }`. The
 *   frontend renders these as chips and blocks Save until the user
 *   disables the dependents first (Session 0.4 spec).
 *
 *   Example: disabling `inventory` while `hostel` and `food` are still
 *   enabled → 409 { error: "Module has active dependents",
 *                   dependents: ["hostel", "food"] }.
 *
 *   Toggling ON never triggers the dependent check — you can always
 *   enable a module (its own dependencies are advisory, surfaced as the
 *   `dependencies` array on GET for the frontend to display a hint).
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { toggleModuleSchema } from "@/lib/validation/schemas";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { getDependenciesOf, getDependentsOf } from "@/lib/modules/dependencies";

export const dynamic = "force-dynamic";

/** Shape the ModuleConfig row into the B3.2 response contract. */
function shape(c: {
  id: string;
  module_key: string;
  is_enabled: boolean;
  config: unknown;
  display_order: number;
}) {
  return {
    id: c.id,
    module_name: c.module_key,
    enabled: c.is_enabled,
    dependencies: getDependenciesOf(c.module_key),
    config: c.config,
    display_order: c.display_order,
  };
}

/** GET /api/v1/modules/:id — single module config */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) {
    return errorResponse("Unauthorized", 401);
  }

  const { id } = await ctx.params;

  const config = await db.moduleConfig.findFirst({
    where: {
      id,
      organization_id: tenantCtx.organization_id,
      branch_id: tenantCtx.branch_id,
      deleted_at: null,
    },
    select: {
      id: true,
      module_key: true,
      is_enabled: true,
      config: true,
      display_order: true,
    },
  });

  if (!config) {
    return errorResponse("Module config not found", 404);
  }

  return jsonResponse(shape(config));
}

/** PATCH /api/v1/modules/:id — toggle enabled on/off */
export const PATCH = withPermission(
  "organization.module.toggle",
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

    const parsed = toggleModuleSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const { enabled } = parsed.data;

    // Verify the module config exists and belongs to current tenant scope.
    const existing = await db.moduleConfig.findFirst({
      where: {
        id,
        organization_id: tenantCtx.organization_id,
        branch_id: tenantCtx.branch_id,
        deleted_at: null,
      },
      select: { id: true, module_key: true, is_enabled: true },
    });
    if (!existing) {
      return errorResponse("Module config not found", 404);
    }

    // No-op short-circuit: nothing to change.
    if (existing.is_enabled === enabled) {
      return successResponse(
        {
          id: existing.id,
          module_name: existing.module_key,
          enabled: existing.is_enabled,
          dependencies: getDependenciesOf(existing.module_key),
        },
        "Module unchanged",
      );
    }

    // --- Risk R2 lock-in: blocking disable when active dependents exist ---
    //
    // Only checked when toggling OFF. We invert MODULE_DEPENDENCIES to
    // find every module that declares this one as a dependency, then
    // query the DB for any of those that are currently enabled in the
    // same tenant scope. If even one is enabled, we 409 with the list
    // — the frontend renders them as chips and blocks Save until the
    // user disables them first.
    if (!enabled) {
      const dependentKeys = getDependentsOf(existing.module_key);
      if (dependentKeys.length > 0) {
        const activeDependents = await db.moduleConfig.findMany({
          where: {
            organization_id: tenantCtx.organization_id,
            branch_id: tenantCtx.branch_id,
            module_key: { in: dependentKeys },
            is_enabled: true,
            deleted_at: null,
          },
          select: { module_key: true },
        });
        if (activeDependents.length > 0) {
          return errorResponse("Module has active dependents", 409, {
            dependents: activeDependents.map((d) => d.module_key),
          });
        }
      }
    }

    const updated = await db.moduleConfig.update({
      where: { id },
      data: {
        is_enabled: enabled,
        updated_by: tenantCtx.user_id,
      },
      select: {
        id: true,
        module_key: true,
        is_enabled: true,
        config: true,
        display_order: true,
      },
    });

    return successResponse(shape(updated), "Module updated");
  },
);
