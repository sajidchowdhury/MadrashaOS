/**
 * MadrashaOS — Permissions Catalog API
 *
 * Phase B3.3 — RBAC API + Permission Matrix
 *
 * GET /api/v1/permissions
 *   Lists all 110+ permission codes from the global Permission table.
 *   Permission: any authenticated user (needed by the RBAC matrix grid
 *   so non-admin roles can still SEE the catalog even though they can't
 *   assign it — frontend hides the Save button if the user lacks
 *   `rbac.permission.assign`).
 *
 *   Returns: array of {
 *     code, module, name, description,
 *     is_scoped,           // true for *.own / *.public permissions
 *     constraint,          // optional note for UI tooltip (D16 etc.)
 *   }
 *
 * The `constraint` field carries server-derived hints for known Do-Not-Do
 * rules so the frontend can render tooltips without hardcoding them:
 *
 *   approval.approve  →  "Requester cannot approve their own request
 *                         (Do-Not-Do D16)."
 *
 *   (Add more entries here as the matrix grows.)
 *
 * `is_scoped` is derived from the code suffix — `*.view.own`,
 * `*.create.own`, and `*.create.public` are scoped permissions per
 * SRS §2.1.3 (RBAC scope rules). The seed script doesn't populate the
 * DB column yet, so we override it here at response time.
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { jsonResponse, errorResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/**
 * Server-derived constraints for known Do-Not-Do rules.
 * Frontend renders this string as a tooltip on the matching matrix row.
 *
 * Source: SRS §3.4 — Do-Not-Do list (D1..D24).
 */
const PERMISSION_CONSTRAINTS: Record<string, string> = {
  // D16: prevents the classic self-approval abuse — a user with
  // approval.approve can't greenlight a request they themselves filed.
  "approval.approve":
    "Requester cannot approve their own request (Do-Not-Do D16). " +
    "The system MUST reject any approval attempt where the approver " +
    "is also the requester.",
};

/** Returns true for scoped permission codes (suffix `.own` or `.public`). */
function isScopedCode(code: string): boolean {
  return code.endsWith(".own") || code.endsWith(".public");
}

/** GET /api/v1/permissions — full catalog (any authenticated user). */
export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx) {
    return errorResponse("Unauthorized", 401);
  }

  const permissions = await db.permission.findMany({
    where: { deleted_at: null },
    orderBy: [{ module: "asc" }, { code: "asc" }],
    select: {
      id: true,
      code: true,
      module: true,
      name: true,
      description: true,
      is_scoped: true,
    },
  });

  const data = permissions.map((p) => ({
    id: p.id,
    code: p.code,
    module: p.module,
    name: p.name,
    description: p.description,
    // Override the DB column at response time — the seed doesn't populate
    // it yet but the catalog clearly distinguishes scoped permissions.
    is_scoped: p.is_scoped || isScopedCode(p.code),
    // Server-derived constraint note for known Do-Not-Do rules (D16).
    constraint: PERMISSION_CONSTRAINTS[p.code] ?? null,
  }));

  return jsonResponse({
    data,
    total: data.length,
    // Frontend can group by module for the matrix grid columns.
    modules: Array.from(new Set(data.map((p) => p.module))).sort(),
  });
}
