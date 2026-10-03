/**
 * MadrashaOS — Platform Admin: Tenant Detail + Suspend/Reactivate (Phase 3)
 *
 * GET    /api/v1/platform/tenants/[orgid]       — detail (org + branches + user count + subscription)
 * PATCH  /api/v1/platform/tenants/[orgid]       — edit tenant (name, contact info, code)
 * POST   /api/v1/platform/tenants/[orgid]/suspend   — suspend tenant (status → "suspended")
 * POST   /api/v1/platform/tenants/[orgid]/activate  — reactivate tenant (status → "active")
 *
 * Platform super-admin only.
 */

import { db } from "@/lib/db";
import { getTenantContext, isPlatformAdmin } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

/** GET /api/v1/platform/tenants/[orgid] — tenant detail */
export const GET = withPermission("tenant.manage", async (req: Request) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const isPlatform = await isPlatformAdmin();
  if (!isPlatform) return errorResponse("Forbidden — platform admin access required", 403);

  // Extract orgId from the URL
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  const orgId = segments[segments.length - 1];

  const org = await db.organization.findFirst({
    where: { id: orgId, deleted_at: null },
    include: {
      branches: {
        where: { deleted_at: null },
        select: { id: true, name: true, code: true, is_active: true, phone: true, email: true },
      },
      subscription: true,
      _count: {
        select: { users: true, students: true, ledger_entries: true },
      },
    },
  });

  if (!org) return errorResponse("Tenant not found", 404);
  if (org.code === "PLATFORM") return errorResponse("Cannot view the Platform org via this endpoint", 400);

  return jsonResponse({
    data: {
      id: org.id,
      name: org.name,
      name_bn: org.name_bn,
      code: org.code,
      slug: org.slug,
      email: org.email,
      phone: org.phone,
      address: org.address,
      status: org.status,
      trial_ends_at: org.trial_ends_at,
      suspended_at: org.suspended_at,
      suspended_reason: org.suspended_reason,
      settings: org.settings,
      created_at: org.created_at,
      branches: org.branches,
      branch_count: org.branches.length,
      user_count: org._count.users,
      student_count: org._count.students,
      ledger_entry_count: org._count.ledger_entries,
      subscription: org.subscription
        ? {
            id: org.subscription.id,
            plan: org.subscription.plan,
            status: org.subscription.status,
            monthly_amount_bdt: Number(org.subscription.monthly_amount_bdt),
            branch_count_snapshot: org.subscription.branch_count_snapshot,
            current_period_start: org.subscription.current_period_start,
            current_period_end: org.subscription.current_period_end,
            trial_ends_at: org.subscription.trial_ends_at,
          }
        : null,
    },
  });
});

const patchSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  name_bn: z.string().max(255).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(1000).optional(),
  code: z.string().min(4).max(10).optional(),
});

/** PATCH /api/v1/platform/tenants/[orgid] — edit tenant metadata */
export const PATCH = withPermission("tenant.manage", async (req: Request) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const isPlatform = await isPlatformAdmin();
  if (!isPlatform) return errorResponse("Forbidden — platform admin access required", 403);

  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  const orgId = segments[segments.length - 1];

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());
  const data = parsed.data;

  // If changing the code, check uniqueness
  if (data.code) {
    const codeUpper = data.code.toUpperCase();
    const existing = await db.organization.findFirst({
      where: { code: codeUpper, id: { not: orgId }, deleted_at: null },
      select: { id: true },
    });
    if (existing) return errorResponse(`Code "${codeUpper}" is already used by another organization`, 409);
    data.code = codeUpper;
  }

  const updated = await db.organization.update({
    where: { id: orgId },
    data: { ...data, updated_by: ctx.user_id },
  });

  // Audit log
  await db.auditLog.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      entity_type: "organizations",
      entity_id: orgId,
      action: "update",
      old_values: null,
      new_values: data as never,
      actor_user_id: ctx.user_id,
    } as never,
  });

  return jsonResponse({
    data: {
      id: updated.id,
      name: updated.name,
      code: updated.code,
      status: updated.status,
    },
  });
});
