/**
 * MadrashaOS — Single Subject API
 *
 * Phase B5.1
 *
 * GET   /api/v1/subjects/:id  — single subject
 * PATCH /api/v1/subjects/:id  — update (perm: academic.structure.edit)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateSubjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  name_bn: z.string().optional(),
  name_ar: z.string().optional(),
  is_quranic: z.boolean().optional(),
  category: z.string().optional(),
  full_marks: z.number().int().min(1).max(1000).optional(),
  pass_marks: z.number().int().min(0).max(500).optional(),
  display_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/v1/subjects/:id */
export async function GET(_req: Request, ctx: RouteContext) {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const subject = await db.subject.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
    include: {
      _count: { select: { exams: true, marks: true, routines: true, teacher_assignments: true } },
    },
  });

  if (!subject) return errorResponse("Subject not found", 404);

  return jsonResponse({
    ...subject,
    stats: {
      exams: subject._count.exams,
      marks: subject._count.marks,
      routines: subject._count.routines,
      assignments: subject._count.teacher_assignments,
    },
  });
}

/** PATCH /api/v1/subjects/:id */
export const PATCH = withPermission("academic.structure.edit", async (req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = updateSubjectSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const existing = await db.subject.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
  });
  if (!existing) return errorResponse("Subject not found", 404);

  const updated = await db.subject.update({
    where: { id },
    data: { ...parsed.data, updated_by: tenantCtx.user_id } as never,
  });

  return successResponse(updated, "Subject updated");
});
