/**
 * MadrashaOS — Notices API
 *
 * Phase B8.1 — Notices API (audience + recipient count)
 *
 * GET  /api/v1/notices — list notices (perm: notices.view)
 * POST /api/v1/notices — compose + send notice (perm: notices.compose + notices.send)
 *
 * Risk R11 lock-in:
 *   - Returns recipient_count based on audience selection
 *   - "Preview recipients" available via GET /api/v1/notices/preview-recipients
 *   - audience: all | class | guardians | staff
 *   - audience_filter: e.g. "class-5" or "section-5-A" (for class/guardians audience)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse, parsePagination } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createNoticeSchema = z.object({
  title: z.string().min(1).max(255),
  title_bn: z.string().optional(),
  body: z.string().min(1).max(5000),
  body_bn: z.string().optional(),
  audience: z.enum(["all", "class", "guardians", "staff"]).default("all"),
  audience_filter: z.string().optional(), // e.g. "class-5" or "section-5-A"
  category: z.enum(["admission", "holiday", "event", "exam", "general"]).default("general"),
  is_pinned: z.boolean().default(false),
  expires_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  attachment_url: z.string().optional(),
  status: z.enum(["draft", "scheduled", "sent"]).default("sent"),
  scheduled_at: z.string().optional(),
});

/** GET /api/v1/notices — list notices */
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const audience = url.searchParams.get("audience");
  const category = url.searchParams.get("category");
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search");

  const where = {
    organization_id: ctx.organization_id,
    ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}),
    deleted_at: null,
    ...(audience ? { audience } : {}),
    ...(category ? { category } : {}),
    ...(status ? { status } : {}),
    ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [notices, total] = await Promise.all([
    db.notice.findMany({
      where,
      orderBy: [{ is_pinned: "desc" }, { sent_at: "desc" }, { created_at: "desc" }],
      skip, take,
      include: {
        sender: { select: { id: true, name: true, name_bn: true } },
      },
    }),
    db.notice.count({ where }),
  ]);

  return jsonResponse({
    data: notices.map((n) => ({
      id: n.id,
      title: n.title,
      title_bn: n.title_bn,
      body: n.body,
      body_bn: n.body_bn,
      audience: n.audience,
      audience_filter: n.audience_filter,
      recipient_count: n.recipient_count,
      category: n.category,
      sent_by: n.sender.name,
      sent_by_bn: n.sender.name_bn,
      sent_at: n.sent_at,
      is_pinned: n.is_pinned,
      expires_at: n.expires_at,
      status: n.status,
      attachment_url: n.attachment_url,
      created_at: n.created_at,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

/** POST /api/v1/notices — compose + send notice */
export const POST = withPermission("notices.compose", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = createNoticeSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const data = parsed.data;

  // Validate audience_filter is provided when audience is "class" or "guardians"
  if ((data.audience === "class" || data.audience === "guardians") && !data.audience_filter) {
    return errorResponse(
      `audience_filter is required when audience is "${data.audience}". Example: "class-5" or "section-5-A".`,
      400,
      { audience: data.audience, required_field: "audience_filter" },
    );
  }

  // --- Risk R11: compute recipient_count based on audience ---
  let recipientCount = 0;

  if (data.audience === "all") {
    // All active students
    recipientCount = await db.student.count({
      where: { organization_id: ctx.organization_id, deleted_at: null, status: "active" },
    });
  } else if (data.audience === "staff") {
    // All active staff users
    recipientCount = await db.user.count({
      where: { organization_id: ctx.organization_id, deleted_at: null, status: "active" },
    });
  } else if (data.audience === "guardians") {
    if (data.audience_filter) {
      // Guardians of students in a specific class/section
      const filterParts = data.audience_filter.split("-");
      // e.g. "class-5" or "section-5-A"
      if (filterParts[0] === "class" && filterParts[1]) {
        const classLevel = filterParts[1];
        const targetClass = await db.class.findFirst({
          where: {
            organization_id: ctx.organization_id,
            level: parseInt(classLevel, 10),
            deleted_at: null,
          },
          select: { id: true },
        });
        if (targetClass) {
          // Count distinct guardians linked to students in this class
          const students = await db.student.findMany({
            where: { class_id: targetClass.id, deleted_at: null, status: "active" },
            select: { guardian_id: true },
            distinct: ["guardian_id"],
          });
          recipientCount = students.length;
        }
      } else {
        // All guardians
        recipientCount = await db.guardian.count({
          where: { organization_id: ctx.organization_id, deleted_at: null },
        });
      }
    } else {
      // All guardians
      recipientCount = await db.guardian.count({
        where: { organization_id: ctx.organization_id, deleted_at: null },
      });
    }
  } else if (data.audience === "class") {
    if (data.audience_filter) {
      const filterParts = data.audience_filter.split("-");
      if (filterParts[0] === "class" && filterParts[1]) {
        const classLevel = filterParts[1];
        const targetClass = await db.class.findFirst({
          where: {
            organization_id: ctx.organization_id,
            level: parseInt(classLevel, 10),
            deleted_at: null,
          },
          select: { id: true },
        });
        if (targetClass) {
          recipientCount = await db.student.count({
            where: { class_id: targetClass.id, deleted_at: null, status: "active" },
          });
        }
      } else if (filterParts[0] === "section" && filterParts[1] && filterParts[2]) {
        const classLevel = filterParts[1];
        const sectionName = filterParts[2];
        const targetClass = await db.class.findFirst({
          where: {
            organization_id: ctx.organization_id,
            level: parseInt(classLevel, 10),
            deleted_at: null,
          },
          select: { id: true, sections: { where: { deleted_at: null, name: sectionName }, select: { id: true } } },
        });
        const targetSection = targetClass?.sections[0];
        if (targetSection) {
          recipientCount = await db.student.count({
            where: { class_id: targetClass!.id, section_id: targetSection.id, deleted_at: null, status: "active" },
          });
        }
      }
    }
  }

  // Check if user has notices.send permission for status='sent'
  if (data.status === "sent") {
    // Verify the user has notices.send permission
    const session = await getServerSession(authConfig);
    if (!session?.permissions?.includes("notices.send")) {
      return errorResponse("You don't have permission to send notices. Save as draft instead.", 403);
    }
  }

  // Create the notice
  const notice = await db.notice.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      title: data.title,
      title_bn: data.title_bn ?? null,
      body: data.body,
      body_bn: data.body_bn ?? null,
      audience: data.audience,
      audience_filter: data.audience_filter ?? null,
      recipient_count: recipientCount,
      category: data.category,
      sent_by: ctx.user_id,
      sent_at: data.status === "sent" ? new Date() : null,
      is_pinned: data.is_pinned,
      expires_at: data.expires_at ? new Date(data.expires_at) : null,
      status: data.status,
      attachment_url: data.attachment_url ?? null,
      created_by: ctx.user_id,
    } as never,
  });

  // Audit log
  await db.auditLog.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      entity_type: "notices",
      entity_id: notice.id,
      action: data.status === "sent" ? "send" : "create_draft",
      old_values: null,
      new_values: {
        title: data.title,
        audience: data.audience,
        audience_filter: data.audience_filter,
        recipient_count: recipientCount,
        status: data.status,
      },
      actor_id: ctx.user_id,
    } as never,
  });

  return jsonResponse(
    {
      id: notice.id,
      title: data.title,
      audience: data.audience,
      audience_filter: data.audience_filter,
      recipient_count: recipientCount,
      status: data.status,
      message: data.status === "sent"
        ? `Notice sent to ${recipientCount} recipients.`
        : `Notice saved as draft. ${recipientCount} recipients will receive it when sent.`,
    },
    201,
  );
});

// Import needed for permission check
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth/config";
