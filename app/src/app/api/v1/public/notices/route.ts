/**
 * MadrashaOS — Public Notices API (Session 8.5)
 *
 * GET /api/v1/public/notices — list public notices (NO AUTH REQUIRED)
 *
 * Returns only notices with:
 *   - status = "sent" (draft/pending notices are never public)
 *   - audience includes "public" (not staff-only notices)
 *
 * This endpoint is bypassed by the middleware (added to the public routes
 * list) so public visitors can read notices without logging in.
 */

import { db } from "@/lib/db";
import { jsonResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/** GET /api/v1/public/notices — public notices list */
export async function GET(req: Request) {
  // Use the first organization (single-tenant for now)
  const org = await db.organization.findFirst({
    where: { deleted_at: null },
    select: { id: true },
  });
  if (!org) return jsonResponse({ data: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } });

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10)));
  const skip = (page - 1) * pageSize;

  const where = {
    organization_id: org.id,
    deleted_at: null,
    status: "sent" as const,
    audience: "all" as const, // "all" means everyone including public (per NoticeAudience enum)
  };

  const [notices, total] = await Promise.all([
    db.notice.findMany({
      where,
      orderBy: { sent_at: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        title: true,
        title_bn: true,
        body: true,
        body_bn: true,
        category: true,
        audience: true,
        sent_at: true,
        is_pinned: true,
        attachment_url: true,
      },
    }),
    db.notice.count({ where }),
  ]);

  return jsonResponse({
    data: notices.map((n) => ({
      id: n.id,
      title: n.title,
      titleBn: n.title_bn,
      body: n.body,
      bodyBn: n.body_bn,
      category: n.category || "General",
      audience: n.audience,
      date: n.sent_at,
      isPinned: n.is_pinned,
      attachmentUrl: n.attachment_url,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}
