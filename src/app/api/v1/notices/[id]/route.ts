/**
 * MadrashaOS — Single Notice API
 *
 * Phase B8.1
 *
 * GET   /api/v1/notices/:id — single notice
 * PATCH /api/v1/notices/:id — update notice (perm: notices.compose)
 * DELETE /api/v1/notices/:id — soft delete (perm: notices.compose)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateNoticeSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  title_bn: z.string().optional(),
  body: z.string().min(1).max(5000).optional(),
  body_bn: z.string().optional(),
  audience: z.enum(["all", "class", "guardians", "staff"]).optional(),
  audience_filter: z.string().optional(),
  category: z.enum(["admission", "holiday", "event", "exam", "general"]).optional(),
  is_pinned: z.boolean().optional(),
  expires_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(["draft", "scheduled", "sent"]).optional(),
  attachment_url: z.string().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/v1/notices/:id */
export async function GET(_req: Request, ctx: RouteContext) {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const notice = await db.notice.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
    include: {
      sender: { select: { id: true, name: true, name_bn: true } },
    },
  });

  if (!notice) return errorResponse("Notice not found", 404);

  return jsonResponse({
    id: notice.id,
    title: notice.title,
    title_bn: notice.title_bn,
    body: notice.body,
    body_bn: notice.body_bn,
    audience: notice.audience,
    audience_filter: notice.audience_filter,
    recipient_count: notice.recipient_count,
    category: notice.category,
    sent_by: notice.sender.name,
    sent_by_bn: notice.sender.name_bn,
    sent_at: notice.sent_at,
    is_pinned: notice.is_pinned,
    expires_at: notice.expires_at,
    status: notice.status,
    attachment_url: notice.attachment_url,
    created_at: notice.created_at,
  });
}

/** PATCH /api/v1/notices/:id */
export const PATCH = withPermission("notices.compose", async (req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = updateNoticeSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const existing = await db.notice.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
  });
  if (!existing) return errorResponse("Notice not found", 404);

  // If status is changing to "sent" and wasn't before, set sent_at
  const isSendingNow = parsed.data.status === "sent" && existing.status !== "sent";

  const updated = await db.notice.update({
    where: { id },
    data: {
      ...parsed.data,
      ...(isSendingNow ? { sent_at: new Date() } : {}),
      expires_at: parsed.data.expires_at ? new Date(parsed.data.expires_at) : undefined,
      updated_by: tenantCtx.user_id,
    } as never,
  });

  return successResponse(updated, isSendingNow ? "Notice sent." : "Notice updated.");
});

/** DELETE /api/v1/notices/:id — soft delete */
export const DELETE = withPermission("notices.compose", async (_req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const existing = await db.notice.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
  });
  if (!existing) return errorResponse("Notice not found", 404);

  await db.notice.update({
    where: { id },
    data: { deleted_at: new Date(), updated_by: tenantCtx.user_id } as never,
  });

  return successResponse(null, "Notice deleted (soft)");
});
