/**
 * MadrashaOS — Exam Publish API
 *
 * Phase B5.3 — Examination API
 *
 * POST   /api/v1/exams/:id/publish — publish exam (locks paper; perm: exams.publish)
 * DELETE /api/v1/exams/:id/publish — unpublish exam (perm: exams.publish)
 *
 * Publishing locks the exam: no more marks can be entered or modified.
 * Unpublishing unlocks it (for corrections) but logs the action.
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/v1/exams/:id/publish — publish exam */
export const POST = withPermission("exams.publish", async (_req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const exam = await db.exam.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
    select: { id: true, status: true, name: true, full_marks: true, pass_marks: true },
  });
  if (!exam) return errorResponse("Exam not found", 404);

  if (exam.status === "published") {
    return errorResponse("Exam is already published", 409);
  }

  // Check if any marks have been entered
  const marksCount = await db.mark.count({
    where: { exam_id: id, deleted_at: null },
  });
  if (marksCount === 0) {
    return errorResponse("Cannot publish an exam with no marks entered", 400);
  }

  // Publish: set status + lock
  await db.exam.update({
    where: { id },
    data: {
      status: "published",
      published_by: tenantCtx.user_id,
      published_at: new Date(),
      updated_by: tenantCtx.user_id,
    } as never,
  });

  // Audit log
  await db.auditLog.create({
    data: {
      organization_id: tenantCtx.organization_id,
      branch_id: tenantCtx.branch_id ?? null,
      entity_type: "exams",
      entity_id: id,
      action: "publish",
      old_values: { status: exam.status },
      new_values: { status: "published", published_by: tenantCtx.user_id },
      actor_id: tenantCtx.user_id,
    } as never,
  });

  return successResponse(
    { exam_id: id, status: "published", marks_count: marksCount },
    `Exam "${exam.name}" published — paper locked. ${marksCount} marks finalized.`,
  );
});

/** DELETE /api/v1/exams/:id/publish — unpublish (unlock for corrections) */
export const DELETE = withPermission("exams.publish", async (_req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const exam = await db.exam.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
    select: { id: true, status: true, name: true },
  });
  if (!exam) return errorResponse("Exam not found", 404);

  if (exam.status !== "published") {
    return errorResponse("Exam is not published", 409);
  }

  // Unpublish: revert to active
  await db.exam.update({
    where: { id },
    data: {
      status: "active",
      published_by: null,
      published_at: null,
      updated_by: tenantCtx.user_id,
    } as never,
  });

  // Audit log
  await db.auditLog.create({
    data: {
      organization_id: tenantCtx.organization_id,
      branch_id: tenantCtx.branch_id ?? null,
      entity_type: "exams",
      entity_id: id,
      action: "unpublish",
      old_values: { status: "published" },
      new_values: { status: "active" },
      actor_id: tenantCtx.user_id,
    } as never,
  });

  return successResponse(
    { exam_id: id, status: "active" },
    `Exam "${exam.name}" unpublished — marks can now be modified.`,
  );
});
