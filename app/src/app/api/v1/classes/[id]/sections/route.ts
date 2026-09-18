/**
 * MadrashaOS — Sections API (under a class)
 *
 * Phase B5.1 — Academic Structure API
 *
 * GET  /api/v1/classes/:id/sections — list sections for a class
 * POST /api/v1/classes/:id/sections — create section (perm: academic.structure.edit)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSectionSchema = z.object({
  name: z.string().min(1).max(50),
  capacity: z.number().int().min(1).max(100).optional(),
  teacher_id: z.string().uuid().optional(),
  room: z.string().max(100).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/v1/classes/:id/sections */
export async function GET(_req: Request, ctx: RouteContext) {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id: classId } = await ctx.params;

  const sections = await db.section.findMany({
    where: { class_id: classId, organization_id: tenantCtx.organization_id, deleted_at: null },
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, capacity: true, room: true, is_active: true,
      teacher_id: true,
      _count: { select: { students: { where: { deleted_at: null, status: "active" } } } },
    },
  });

  return jsonResponse({ data: sections, total: sections.length });
}

/** POST /api/v1/classes/:id/sections */
export const POST = withPermission("academic.structure.edit", async (req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id: classId } = await ctx.params;

  // Verify class exists
  const cls = await db.class.findFirst({
    where: { id: classId, organization_id: tenantCtx.organization_id, deleted_at: null },
  });
  if (!cls) return errorResponse("Class not found", 404);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = createSectionSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  // Check section name uniqueness within class
  const existing = await db.section.findFirst({
    where: { class_id: classId, name: parsed.data.name, deleted_at: null },
  });
  if (existing) return errorResponse("Section with this name already exists in this class", 409);

  const section = await db.section.create({
    data: {
      organization_id: tenantCtx.organization_id,
      branch_id: cls.branch_id ?? null,
      class_id: classId,
      name: parsed.data.name,
      capacity: parsed.data.capacity ?? 40,
      teacher_id: parsed.data.teacher_id ?? null,
      room: parsed.data.room ?? null,
      is_active: true,
      created_by: tenantCtx.user_id,
    },
  });

  return successResponse(section, "Section created");
});
