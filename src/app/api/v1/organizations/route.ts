/**
 * MadrashaOS — Organizations API
 *
 * Phase B3.1 — Organization & Multi-Branch API
 *
 * GET /api/v1/organizations
 *   Returns the current user's organization info.
 *   Permission: any authenticated user (session has organization_id).
 *
 * PATCH /api/v1/organizations
 *   Updates the current user's organization.
 *   Permission: organization.config.view
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { updateOrganizationSchema } from "@/lib/validation/schemas";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/** GET /api/v1/organizations — current org info */
export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx) {
    return errorResponse("Unauthorized", 401);
  }

  const org = await db.organization.findFirst({
    where: { id: ctx.organization_id, deleted_at: null },
    include: {
      branches: {
        where: { deleted_at: null },
        orderBy: { created_at: "asc" },
      },
    },
  });

  if (!org) {
    return errorResponse("Organization not found", 404);
  }

  return jsonResponse({
    id: org.id,
    name: org.name,
    name_bn: org.name_bn,
    slug: org.slug,
    phone: org.phone,
    email: org.email,
    address: org.address,
    logo_url: org.logo_url,
    website_url: org.website_url,
    established_year: org.established_year,
    settings: org.settings,
    branches: org.branches.map((b) => ({
      id: b.id,
      code: b.code,
      name: b.name,
      name_bn: b.name_bn,
      address: b.address,
      phone: b.phone,
      email: b.email,
      established_year: b.established_year,
      is_active: b.is_active,
    })),
  });
}

/** PATCH /api/v1/organizations — update org */
export const PATCH = withPermission("organization.config.edit", async (req) => {
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

  const parsed = updateOrganizationSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parsed.error.flatten());
  }

  const updated = await db.organization.update({
    where: { id: ctx.organization_id },
    data: parsed.data,
    select: {
      id: true,
      name: true,
      name_bn: true,
      slug: true,
      phone: true,
      email: true,
      address: true,
      logo_url: true,
      website_url: true,
      established_year: true,
      settings: true,
      updated_at: true,
    },
  });

  return successResponse(updated, "Organization updated");
});
