/**
 * MadrashaOS — Modules API
 *
 * Phase B3.2 — Module Configuration API
 *
 * GET /api/v1/modules
 *   Lists all module configs for the current org+branch.
 *   Returns: array of { id, module_name, enabled, dependencies: string[] }
 *   Permission: any authenticated user (session has organization_id).
 *
 * The `dependencies` field on each item lists the modules THIS module
 * requires (e.g. hostel → ["inventory"]). Used by the frontend to
 * render a "Requires: Inventory" hint next to the toggle. The inverse
 * direction — "who depends on me?" — is checked server-side on PATCH
 * (see [id]/route.ts, Risk R2).
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { jsonResponse, errorResponse } from "@/lib/api/helpers";
import { getDependenciesOf } from "@/lib/modules/dependencies";

export const dynamic = "force-dynamic";

/** GET /api/v1/modules — list module configs for the current tenant scope */
export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx) {
    return errorResponse("Unauthorized", 401);
  }

  // ModuleConfig rows are scoped to (organization_id, branch_id) — the
  // unique constraint is [organization_id, branch_id, module_key].
  // For org-level roles (authority / super-admin acting org-wide),
  // branch_id is null and we match the org-level rows.
  const configs = await db.moduleConfig.findMany({
    where: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id,
      deleted_at: null,
    },
    orderBy: [{ display_order: "asc" }, { module_key: "asc" }],
    select: {
      id: true,
      module_key: true,
      is_enabled: true,
      config: true,
      display_order: true,
    },
  });

  // Shape per B3.2 spec: { id, module_name, enabled, dependencies }
  // `module_name` mirrors `module_key` (the canonical identifier used
  // across moduleTree, permissions, and the dependency map).
  const data = configs.map((c) => ({
    id: c.id,
    module_name: c.module_key,
    enabled: c.is_enabled,
    dependencies: getDependenciesOf(c.module_key),
    config: c.config,
    display_order: c.display_order,
  }));

  return jsonResponse(data);
}
