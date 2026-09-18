/**
 * MadrashaOS — Branches API
 *
 * Phase B3.1 — Organization & Multi-Branch API
 *
 * GET /api/v1/branches
 *   Lists all branches in the current org.
 *   Permission: any authenticated user.
 *
 * POST /api/v1/branches
 *   Creates a new branch.
 *   Permission: organization.branch.create
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { createBranchSchema } from "@/lib/validation/schemas";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/** GET /api/v1/branches — list branches */
export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx) {
    return errorResponse("Unauthorized", 401);
  }

  const branches = await db.branch.findMany({
    where: {
      organization_id: ctx.organization_id,
      deleted_at: null,
    },
    orderBy: { created_at: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      name_bn: true,
      address: true,
      phone: true,
      email: true,
      established_year: true,
      is_active: true,
      latitude: true,
      longitude: true,
      created_at: true,
    },
  });

  return jsonResponse({ data: branches, total: branches.length });
}

/** POST /api/v1/branches — create branch */
export const POST = withPermission("organization.branch.create", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) {
    return errorResponse("Unauthorized", 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const parsed = createBranchSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parsed.error.flatten());
  }

  const data = parsed.data;

  // Check code uniqueness within org
  const existing = await db.branch.findFirst({
    where: {
      organization_id: ctx.organization_id,
      code: data.code,
      deleted_at: null,
    },
  });
  if (existing) {
    return errorResponse("Branch with this code already exists", 409);
  }

  const branch = await db.branch.create({
    data: {
      organization_id: ctx.organization_id,
      code: data.code,
      name: data.name,
      name_bn: data.name_bn,
      address: data.address ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      established_year: data.established_year ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      is_active: true,
      created_by: ctx.user_id,
    },
  });

  return successResponse(branch, "Branch created");
});
