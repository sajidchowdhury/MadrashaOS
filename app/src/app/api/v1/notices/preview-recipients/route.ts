/**
 * MadrashaOS — Notice Preview Recipients API
 *
 * Phase B8.1 — Risk R11 lock-in
 *
 * POST /api/v1/notices/preview-recipients — preview who will receive a notice
 *   Body: { audience, audience_filter? }
 *   Returns: list of recipient names + count
 *   No notice is created — this is a read-only preview
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { jsonResponse, errorResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const previewSchema = z.object({
  audience: z.enum(["all", "class", "guardians", "staff"]),
  audience_filter: z.string().optional(),
});

export async function POST(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = previewSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const data = parsed.data;
  const recipients: Array<{ id: string; name: string; name_bn?: string | null; type: string }> = [];

  if (data.audience === "all") {
    const students = await db.student.findMany({
      where: { organization_id: ctx.organization_id, deleted_at: null, status: "active" },
      select: { id: true, name: true, name_bn: true, code: true },
      take: 100, // limit for preview
    });
    recipients.push(...students.map((s) => ({ id: s.id, name: s.name, name_bn: s.name_bn, type: "student" })));
  } else if (data.audience === "staff") {
    const users = await db.user.findMany({
      where: { organization_id: ctx.organization_id, deleted_at: null, status: "active" },
      select: { id: true, name: true, name_bn: true },
    });
    recipients.push(...users.map((u) => ({ id: u.id, name: u.name, name_bn: u.name_bn, type: "staff" })));
  } else if (data.audience === "guardians") {
    if (data.audience_filter) {
      const filterParts = data.audience_filter.split("-");
      if (filterParts[0] === "class" && filterParts[1]) {
        const classLevel = filterParts[1];
        const targetClass = await db.class.findFirst({
          where: { organization_id: ctx.organization_id, level: parseInt(classLevel, 10), deleted_at: null },
          select: { id: true },
        });
        if (targetClass) {
          const students = await db.student.findMany({
            where: { class_id: targetClass.id, deleted_at: null, status: "active" },
            select: { guardian_id: true, guardian: { select: { id: true, name: true, name_bn: true } } },
            distinct: ["guardian_id"],
          });
          recipients.push(...students.map((s) => ({
            id: s.guardian!.id,
            name: s.guardian!.name,
            name_bn: s.guardian!.name_bn,
            type: "guardian",
          })));
        }
      }
    } else {
      const guardians = await db.guardian.findMany({
        where: { organization_id: ctx.organization_id, deleted_at: null },
        select: { id: true, name: true, name_bn: true },
      });
      recipients.push(...guardians.map((g) => ({ id: g.id, name: g.name, name_bn: g.name_bn, type: "guardian" })));
    }
  } else if (data.audience === "class") {
    if (data.audience_filter) {
      const filterParts = data.audience_filter.split("-");
      if (filterParts[0] === "class" && filterParts[1]) {
        const classLevel = filterParts[1];
        const targetClass = await db.class.findFirst({
          where: { organization_id: ctx.organization_id, level: parseInt(classLevel, 10), deleted_at: null },
          select: { id: true },
        });
        if (targetClass) {
          const students = await db.student.findMany({
            where: { class_id: targetClass.id, deleted_at: null, status: "active" },
            select: { id: true, name: true, name_bn: true, code: true, roll: true },
          });
          recipients.push(...students.map((s) => ({ id: s.id, name: `${s.name} (Roll: ${s.roll})`, name_bn: s.name_bn, type: "student" })));
        }
      }
    }
  }

  return jsonResponse({
    audience: data.audience,
    audience_filter: data.audience_filter,
    recipient_count: recipients.length,
    recipients: recipients.slice(0, 50), // limit display to 50 for preview
    total_count: recipients.length,
    truncated: recipients.length > 50,
    message: recipients.length > 0
      ? `${recipients.length} recipients will receive this notice.`
      : "No recipients match this audience filter.",
  });
}
