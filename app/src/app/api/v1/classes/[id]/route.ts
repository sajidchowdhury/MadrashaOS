/**
 * MadrashaOS — Single Class API
 *
 * Phase B5.1 — Academic Structure API
 *
 * GET   /api/v1/classes/:id  — single class with sections + student count
 * PATCH /api/v1/classes/:id  — update class (perm: academic.structure.edit)
 * DELETE /api/v1/classes/:id — soft delete (perm: academic.structure.edit)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateClassSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  name_bn: z.string().min(1).max(255).optional(),
  level: z.number().int().min(1).max(15).optional(),
  stream: z.string().optional(),
  display_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/v1/classes/:id */
export async function GET(_req: Request, ctx: RouteContext) {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);

  const { id } = await ctx.params;

  const cls = await db.class.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
    include: {
      sections: {
        where: { deleted_at: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true, capacity: true, room: true, teacher_id: true, is_active: true },
      },
      _count: { select: { students: { where: { deleted_at: null } }, routines: true, exams: true } },
    },
  });

  if (!cls) return errorResponse("Class not found", 404);

  return jsonResponse({
    id: cls.id,
    name: cls.name,
    name_bn: cls.name_bn,
    level: cls.level,
    stream: cls.stream,
    display_order: cls.display_order,
    is_active: cls.is_active,
    sections: cls.sections,
    stats: { students: cls._count.students, routines: cls._count.routines, exams: cls._count.exams },
  });
}

/** PATCH /api/v1/classes/:id */
export const PATCH = withPermission("academic.structure.edit", async (req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = updateClassSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const existing = await db.class.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
  });
  if (!existing) return errorResponse("Class not found", 404);

  const updated = await db.class.update({
    where: { id },
    data: { ...parsed.data, updated_by: tenantCtx.user_id },
  });

  return successResponse(updated, "Class updated");
});

/** DELETE /api/v1/classes/:id — soft delete */
export const DELETE = withPermission("academic.structure.edit", async (_req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const existing = await db.class.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
  });
  if (!existing) return errorResponse("Class not found", 404);

  // Check if class has active students
  const studentCount = await db.student.count({
    where: { class_id: id, deleted_at: null, status: "active" },
  });
  if (studentCount > 0) {
    return errorResponse(`Cannot delete class with ${studentCount} active students. Transfer them first.`, 409);
  }

  await db.class.update({
    where: { id },
    data: { deleted_at: new Date(), is_active: false, updated_by: tenantCtx.user_id },
  });

  return successResponse(null, "Class deleted (soft)");
});
