/**
 * MadrashaOS — Single Teacher API
 *
 * Phase B4.3 — Guardian + Teacher API
 *
 * GET   /api/v1/teachers/:id  — teacher info + current active assignments
 * PATCH /api/v1/teachers/:id  — update teacher
 *
 * Permission: teachers.view (GET), teachers.create (PATCH)
 */

import { db } from "@/lib/db";
import { getTenantContext, tenantWhere } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { updateTeacherSchema } from "@/lib/validation/schemas";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/** GET /api/v1/teachers/:id */
export const GET = withPermission(
  "teachers.view",
  async (
    _req: Request,
    ctx: { params: Promise<{ id: string }> },
  ) => {
    const tenantCtx = await getTenantContext();
    if (!tenantCtx) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await ctx.params;

    const teacher = await db.teacher.findFirst({
      where: {
        id,
        ...tenantWhere(tenantCtx),
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        branch_id: true,
        user_id: true,
        employee_code: true,
        designation: true,
        qualification: true,
        specialization: true,
        joined_at: true,
        left_at: true,
        salary: true,
        status: true,
        phone: true,
        nid_number: true,
        photo_url: true,
        created_at: true,
        updated_at: true,
        user: {
          select: {
            id: true,
            name: true,
            name_bn: true,
            email: true,
            phone: true,
            avatar_url: true,
            avatar_initial: true,
            status: true,
          },
        },
        teacher_assignments: {
          where: { deleted_at: null, is_active: true },
          select: {
            id: true,
            academic_year: true,
            is_active: true,
            notes: true,
            created_at: true,
            class: {
              select: { id: true, name: true, name_bn: true, level: true },
            },
            section: {
              select: { id: true, name: true, room: true },
            },
            subject: {
              select: {
                id: true,
                code: true,
                name: true,
                name_bn: true,
                is_quranic: true,
              },
            },
          },
          orderBy: [
            { academic_year: "desc" },
            { class: { level: "asc" } },
            { subject: { name: "asc" } },
          ],
        },
      },
    });

    if (!teacher) {
      return errorResponse("Teacher not found", 404);
    }

    return jsonResponse({
      ...teacher,
      assignments: teacher.teacher_assignments,
      assignments_count: teacher.teacher_assignments.length,
    });
  },
);

/** PATCH /api/v1/teachers/:id */
export const PATCH = withPermission(
  "teachers.create",
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

    const parsed = updateTeacherSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const existing = await db.teacher.findFirst({
      where: {
        id,
        ...tenantWhere(tenantCtx),
        deleted_at: null,
      },
      select: { id: true, employee_code: true, status: true },
    });
    if (!existing) {
      return errorResponse("Teacher not found", 404);
    }

    // If employee_code is changing, check uniqueness within the org.
    if (
      parsed.data.employee_code &&
      parsed.data.employee_code !== existing.employee_code
    ) {
      const codeClash = await db.teacher.findFirst({
        where: {
          organization_id: tenantCtx.organization_id,
          employee_code: parsed.data.employee_code,
          deleted_at: null,
          NOT: { id },
        },
        select: { id: true },
      });
      if (codeClash) {
        return errorResponse(
          "Teacher with this employee code already exists",
          409,
        );
      }
    }

    // If status is being changed to "resigned" and no left_at was
    // supplied, set left_at to today (server time).
    const updateData: Record<string, unknown> = {
      updated_by: tenantCtx.user_id,
    };
    for (const [k, v] of Object.entries(parsed.data)) {
      if (v === undefined) continue;

      if (k === "joined_at" || k === "left_at") {
        // Zod schema accepts ISO strings; convert to Date for Prisma.
        updateData[k] = v === null ? null : new Date(v as string);
        continue;
      }

      updateData[k] = v;
    }

    if (
      parsed.data.status === "resigned" &&
      existing.status !== "resigned" &&
      !("left_at" in updateData)
    ) {
      updateData.left_at = new Date();
    }

    const updated = await db.teacher.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        employee_code: true,
        designation: true,
        qualification: true,
        specialization: true,
        joined_at: true,
        left_at: true,
        salary: true,
        status: true,
        phone: true,
        nid_number: true,
        photo_url: true,
        branch_id: true,
        updated_at: true,
      },
    });

    return successResponse(updated, "Teacher updated");
  },
);
