/**
 * MadrashaOS — Platform Admin: List Signup Requests (Phase 1d)
 *
 * GET /api/v1/platform/signup-requests
 *
 * Platform super-admin only. Lists all tenant signup requests with
 * optional status filter + pagination.
 */

import { db } from "@/lib/db";
import { getTenantContext, isPlatformAdmin } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, parsePagination } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export const GET = withPermission("tenant.manage", async (req: Request) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  // Only platform super-admin can access this endpoint
  const isPlatform = await isPlatformAdmin();
  if (!isPlatform) {
    return errorResponse("Forbidden — platform admin access required", 403);
  }

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const status = url.searchParams.get("status"); // pending | approved | rejected | provisioned | failed

  const where = {
    deleted_at: null,
    ...(status ? { status } : {}),
  };

  const [requests, total] = await Promise.all([
    db.tenantSignupRequest.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take,
      include: {
        provisioned_org: {
          select: { id: true, name: true, code: true, status: true },
        },
        reviewer: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    db.tenantSignupRequest.count({ where }),
  ]);

  return jsonResponse({
    data: requests.map((r) => ({
      id: r.id,
      org_name: r.org_name,
      org_name_bn: r.org_name_bn,
      org_slug: r.org_slug,
      org_code: r.org_code,
      contact_name: r.contact_name,
      contact_email: r.contact_email,
      contact_phone: r.contact_phone,
      address: r.address,
      estimated_branches: r.estimated_branches,
      notes: r.notes,
      status: r.status,
      reviewed_by: r.reviewer?.name ?? null,
      reviewed_at: r.reviewed_at,
      review_note: r.review_note,
      provisioned_org: r.provisioned_org
        ? {
            id: r.provisioned_org.id,
            name: r.provisioned_org.name,
            code: r.provisioned_org.code,
            status: r.provisioned_org.status,
          }
        : null,
      created_at: r.created_at,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
});
