/**
 * MadrashaOS — Platform Admin: List Tenants (Phase 3)
 *
 * GET /api/v1/platform/tenants
 *
 * Platform super-admin only. Lists ALL organizations (cross-tenant),
 * excluding the "Platform" org itself. Supports search + status filter.
 */

import { db } from "@/lib/db";
import { getTenantContext, isPlatformAdmin } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, parsePagination } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export const GET = withPermission("tenant.manage", async (req: Request) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const isPlatform = await isPlatformAdmin();
  if (!isPlatform) {
    return errorResponse("Forbidden — platform admin access required", 403);
  }

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const search = url.searchParams.get("search");
  const status = url.searchParams.get("status");

  // Find the Platform org so we can exclude it
  const platformOrg = await db.organization.findFirst({
    where: { code: "PLATFORM", deleted_at: null },
    select: { id: true },
  });
  const platformOrgId = platformOrg?.id ?? "";

  const where = {
    deleted_at: null,
    id: { not: platformOrgId },
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { name_bn: { contains: search, mode: "insensitive" as const } },
            { code: { contains: search.toUpperCase(), mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [tenants, total] = await Promise.all([
    db.organization.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take,
      include: {
        _count: {
          select: { branches: true, users: true },
        },
        subscription: {
          select: { status: true, plan: true, trial_ends_at: true, monthly_amount_bdt: true, branch_count_snapshot: true },
        },
      },
    }),
    db.organization.count({ where }),
  ]);

  return jsonResponse({
    data: tenants.map((t) => ({
      id: t.id,
      name: t.name,
      name_bn: t.name_bn,
      code: t.code,
      slug: t.slug,
      email: t.email,
      phone: t.phone,
      status: t.status,
      trial_ends_at: t.trial_ends_at,
      suspended_at: t.suspended_at,
      suspended_reason: t.suspended_reason,
      branch_count: t._count.branches,
      user_count: t._count.users,
      subscription: t.subscription
        ? {
            status: t.subscription.status,
            plan: t.subscription.plan,
            trial_ends_at: t.subscription.trial_ends_at,
            monthly_amount_bdt: Number(t.subscription.monthly_amount_bdt),
            branch_count_snapshot: t.subscription.branch_count_snapshot,
          }
        : null,
      created_at: t.created_at,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
});
