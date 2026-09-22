/**
 * MadrashaOS — Guardian's Linked Children API
 *
 * Phase B4.3 — Guardian + Teacher API
 *
 * GET /api/v1/guardians/:id/children
 *   Returns the array of students linked to this guardian.
 *   Permission: any of [guardians.view, guardians.view.own]
 *   Scope rule:
 *     - guardians.view users see the linked students for ANY guardian
 *       in their tenant scope.
 *     - guardians.view.own users can ONLY see the children of the
 *       guardian row linked to their own User account (a 404 is
 *       returned if they try to fetch another guardian's children —
 *       defense-in-depth so they can't enumerate guardian IDs).
 */

import { db } from "@/lib/db";
import { getTenantContext, tenantWhere } from "@/lib/auth/with-tenant";
import { withAnyPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/** GET /api/v1/guardians/:id/children */
export const GET = withAnyPermission(
  ["guardians.view", "guardians.view.own"],
  async (
    _req: Request,
    ctx: { params: Promise<{ id: string }> },
  ) => {
    const tenantCtx = await getTenantContext();
    if (!tenantCtx) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await ctx.params;

    const guardian = await db.guardian.findFirst({
      where: {
        id,
        ...tenantWhere(tenantCtx),
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        user_id: true,
        student_guardians: {
          where: { deleted_at: null },
          select: {
            id: true,
            relation: true,
            is_primary: true,
            can_pickup: true,
            receive_sms: true,
            receive_email: true,
            student: {
              select: {
                id: true,
                code: true,
                name: true,
                name_bn: true,
                class_id: true,
                section_id: true,
                roll: true,
                gender: true,
                status: true,
                photo_url: true,
                class: { select: { id: true, name: true, name_bn: true } },
                section: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: [{ is_primary: "desc" }, { student: { roll: "asc" } }],
        },
      },
    });

    if (!guardian) {
      return errorResponse("Guardian not found", 404);
    }

    // Defense-in-depth scope check for guardians.view.own users.
    const isOwnOnly =
      !tenantCtx.permissions.includes("guardians.view") &&
      tenantCtx.permissions.includes("guardians.view.own");
    if (isOwnOnly && guardian.user_id !== tenantCtx.user_id) {
      // Return 404 (not 403) so an attacker can't enumerate guardian IDs.
      return errorResponse("Guardian not found", 404);
    }

    return jsonResponse({
      guardian: {
        id: guardian.id,
        name: guardian.name,
      },
      children: guardian.student_guardians.map((sg) => ({
        link_id: sg.id,
        relation: sg.relation,
        is_primary: sg.is_primary,
        can_pickup: sg.can_pickup,
        receive_sms: sg.receive_sms,
        receive_email: sg.receive_email,
        student: sg.student,
      })),
      total: guardian.student_guardians.length,
    });
  },
);
