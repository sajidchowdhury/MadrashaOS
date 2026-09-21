/**
 * MadrashaOS — Single Guardian API
 *
 * Phase B4.3 — Guardian + Teacher API
 *
 * GET    /api/v1/guardians/:id  — single guardian info + linked students array
 * PATCH  /api/v1/guardians/:id  — update guardian
 * DELETE /api/v1/guardians/:id  — soft-delete guardian (sets deleted_at)
 *
 * Permission gate:
 *   - GET    → any of [guardians.view, guardians.view.own]
 *              (a guardians.view.own user can only fetch their OWN row)
 *   - PATCH  → students.create
 *   - DELETE → students.create
 */

import { db } from "@/lib/db";
import { getTenantContext, tenantWhere } from "@/lib/auth/with-tenant";
import { withPermission, withAnyPermission } from "@/lib/auth/with-permission";
import { updateGuardianSchema } from "@/lib/validation/schemas";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/** GET /api/v1/guardians/:id */
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
      include: {
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
                status: true,
                photo_url: true,
              },
            },
          },
          orderBy: [{ is_primary: "desc" }, { created_at: "asc" }],
        },
      },
    });

    if (!guardian) {
      return errorResponse("Guardian not found", 404);
    }

    // Scope enforcement for guardians.view.own users: they can only
    // fetch the guardian row linked to their own User account. This is
    // a defense-in-depth check on top of the permission gate.
    const isOwnOnly =
      !tenantCtx.permissions.includes("guardians.view") &&
      tenantCtx.permissions.includes("guardians.view.own");
    if (isOwnOnly && guardian.user_id !== tenantCtx.user_id) {
      return errorResponse("Guardian not found", 404);
    }

    return jsonResponse({
      id: guardian.id,
      organization_id: guardian.organization_id,
      branch_id: guardian.branch_id,
      name: guardian.name,
      name_bn: guardian.name_bn,
      phone: guardian.phone,
      email: guardian.email,
      occupation: guardian.occupation,
      relation: guardian.relation,
      nid_number: guardian.nid_number,
      annual_income: guardian.annual_income,
      is_primary: guardian.is_primary,
      address: guardian.address,
      user_id: guardian.user_id,
      created_at: guardian.created_at,
      updated_at: guardian.updated_at,
      children: guardian.student_guardians.map((sg) => ({
        link_id: sg.id,
        relation: sg.relation,
        is_primary: sg.is_primary,
        can_pickup: sg.can_pickup,
        receive_sms: sg.receive_sms,
        receive_email: sg.receive_email,
        student: sg.student,
      })),
    });
  },
);

/** PATCH /api/v1/guardians/:id */
export const PATCH = withPermission(
  "students.create",
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

    const parsed = updateGuardianSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    // Verify guardian belongs to current tenant.
    const existing = await db.guardian.findFirst({
      where: {
        id,
        ...tenantWhere(tenantCtx),
        deleted_at: null,
      },
      select: { id: true, phone: true, user_id: true },
    });
    if (!existing) {
      return errorResponse("Guardian not found", 404);
    }

    // If phone is being changed, check uniqueness within the org.
    if (parsed.data.phone && parsed.data.phone !== existing.phone) {
      const phoneClash = await db.guardian.findFirst({
        where: {
          organization_id: tenantCtx.organization_id,
          phone: parsed.data.phone,
          deleted_at: null,
          NOT: { id },
        },
        select: { id: true },
      });
      if (phoneClash) {
        return errorResponse(
          "Guardian with this phone number already exists",
          409,
        );
      }
    }

    // If linking a user_id for the first time or changing it, enforce 1:1.
    if (
      parsed.data.user_id !== undefined &&
      parsed.data.user_id !== existing.user_id
    ) {
      if (parsed.data.user_id) {
        const alreadyLinked = await db.guardian.findFirst({
          where: {
            user_id: parsed.data.user_id,
            deleted_at: null,
            NOT: { id },
          },
          select: { id: true },
        });
        if (alreadyLinked) {
          return errorResponse(
            "User is already linked to another Guardian",
            409,
          );
        }
      }
    }

    // Branch the update payload so we don't write undefined values
    // (Prisma treats undefined as "skip", but being explicit makes the
    // audit story cleaner).
    const updateData: Record<string, unknown> = {
      updated_by: tenantCtx.user_id,
    };
    for (const [k, v] of Object.entries(parsed.data)) {
      if (v !== undefined) updateData[k] = v;
    }

    const updated = await db.guardian.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        name_bn: true,
        phone: true,
        email: true,
        occupation: true,
        relation: true,
        nid_number: true,
        annual_income: true,
        is_primary: true,
        address: true,
        user_id: true,
        branch_id: true,
        updated_at: true,
      },
    });

    return successResponse(updated, "Guardian updated");
  },
);

/** DELETE /api/v1/guardians/:id — soft delete */
export const DELETE = withPermission(
  "students.create",
  async (
    _req: Request,
    ctx: { params: Promise<{ id: string }> },
  ) => {
    const tenantCtx = await getTenantContext();
    if (!tenantCtx) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await ctx.params;

    const existing = await db.guardian.findFirst({
      where: {
        id,
        ...tenantWhere(tenantCtx),
        deleted_at: null,
      },
      select: { id: true },
    });
    if (!existing) {
      return errorResponse("Guardian not found", 404);
    }

    // Soft-delete the guardian AND all StudentGuardian links in one
    // transaction — keeps the junction table consistent so orphaned
    // active links don't show up in future student→guardian queries.
    await db.$transaction(async (tx) => {
      await tx.studentGuardian.updateMany({
        where: { guardian_id: id, deleted_at: null },
        data: {
          deleted_at: new Date(),
          updated_by: tenantCtx.user_id,
        },
      });
      await tx.guardian.update({
        where: { id },
        data: {
          deleted_at: new Date(),
          is_primary: false,
          updated_by: tenantCtx.user_id,
        },
      });
    });

    return successResponse(null, "Guardian deleted (soft)");
  },
);
