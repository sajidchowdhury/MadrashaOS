/**
 * MadrashaOS — Guardians API
 *
 * Phase B4.3 — Guardian + Teacher API
 *
 * GET /api/v1/guardians
 *   Lists guardians in the current tenant.
 *   Permission: any of [guardians.view, guardians.view.own]
 *   Scope rule:
 *     - users with `guardians.view` see ALL guardians in the org (scoped
 *       by branch_id per `tenantWhere`)
 *     - users with ONLY `guardians.view.own` see ONLY the guardian row
 *       linked to their own User account (via Guardian.user_id)
 *   Query params: page, pageSize, search (matches name or phone)
 *
 * POST /api/v1/guardians
 *   Creates a new guardian (admin creates guardians when adding students).
 *   Permission: students.create
 */

import { db } from "@/lib/db";
import { getTenantContext, tenantWhere } from "@/lib/auth/with-tenant";
import { withPermission, withAnyPermission } from "@/lib/auth/with-permission";
import { createGuardianSchema } from "@/lib/validation/schemas";
import {
  errorResponse,
  successResponse,
  paginatedResponse,
  parsePagination,
} from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/** GET /api/v1/guardians — list guardians */
export const GET = withAnyPermission(
  ["guardians.view", "guardians.view.own"],
  async (req: Request) => {
    const ctx = await getTenantContext();
    if (!ctx) {
      return errorResponse("Unauthorized", 401);
    }

    const url = new URL(req.url);
    const { page, pageSize, skip, take } = parsePagination(url);
    const search = url.searchParams.get("search")?.trim();

    // Scope decision: users with ONLY `guardians.view.own` (and not the
    // full `guardians.view`) are restricted to their own Guardian record.
    const isOwnOnly =
      !ctx.permissions.includes("guardians.view") &&
      ctx.permissions.includes("guardians.view.own");

    // Build the Prisma where-clause incrementally.
    // Base = tenant scoping (organization_id [+ branch_id for non-org roles])
    // + soft-delete filter.
    const where: Record<string, unknown> = {
      ...tenantWhere(ctx),
      deleted_at: null,
    };

    if (isOwnOnly) {
      // Guardian-role user → only see their own Guardian row.
      where.user_id = ctx.user_id;
    }

    if (search) {
      // Case-insensitive name OR phone match (Prisma `mode: insensitive`
      // is supported on Postgres for string fields).
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { name_bn: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, guardians] = await Promise.all([
      db.guardian.count({ where }),
      db.guardian.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take,
        select: {
          id: true,
          name: true,
          name_bn: true,
          phone: true,
          email: true,
          occupation: true,
          relation: true,
          is_primary: true,
          user_id: true,
          branch_id: true,
          created_at: true,
          _count: {
            select: {
              student_guardians: {
                where: { deleted_at: null },
              },
            },
          },
        },
      }),
    ]);

    const data = guardians.map((g) => ({
      id: g.id,
      name: g.name,
      name_bn: g.name_bn,
      phone: g.phone,
      email: g.email,
      occupation: g.occupation,
      relation: g.relation,
      is_primary: g.is_primary,
      user_id: g.user_id,
      branch_id: g.branch_id,
      children_count: g._count.student_guardians,
      created_at: g.created_at,
    }));

    return paginatedResponse(data, total, page, pageSize);
  },
);

/** POST /api/v1/guardians — create guardian (perm: students.create) */
export const POST = withPermission("students.create", async (req: Request) => {
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

  const parsed = createGuardianSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parsed.error.flatten());
  }

  const data = parsed.data;

  // Guardian has @@unique([organization_id, phone]) — pre-flight check
  // to return a clean 409 instead of surfacing Prisma P2002.
  const existing = await db.guardian.findFirst({
    where: {
      organization_id: ctx.organization_id,
      phone: data.phone,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existing) {
    return errorResponse(
      "Guardian with this phone number already exists",
      409,
    );
  }

  // If a user_id is supplied, verify the User exists + belongs to the
  // current tenant. Also enforce the 1:1 invariant (Guardian.user_id is
  // @unique — a User can be linked to at most one Guardian row).
  if (data.user_id) {
    const linkedUser = await db.user.findFirst({
      where: {
        id: data.user_id,
        organization_id: ctx.organization_id,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (!linkedUser) {
      return errorResponse("Linked User not found in current tenant", 404);
    }

    const alreadyLinked = await db.guardian.findFirst({
      where: { user_id: data.user_id, deleted_at: null },
      select: { id: true },
    });
    if (alreadyLinked) {
      return errorResponse(
        "User is already linked to another Guardian",
        409,
      );
    }
  }

  // If a branch_id is supplied, verify it belongs to the current org.
  if (data.branch_id) {
    const branch = await db.branch.findFirst({
      where: {
        id: data.branch_id,
        organization_id: ctx.organization_id,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (!branch) {
      return errorResponse("Branch not found in current organization", 404);
    }
  }

  const guardian = await db.guardian.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: data.branch_id ?? ctx.branch_id,
      name: data.name,
      name_bn: data.name_bn,
      phone: data.phone,
      email: data.email,
      occupation: data.occupation,
      relation: data.relation,
      nid_number: data.nid_number,
      annual_income: data.annual_income,
      is_primary: data.is_primary ?? true,
      address: data.address,
      user_id: data.user_id,
      created_by: ctx.user_id,
    },
    select: {
      id: true,
      organization_id: true,
      branch_id: true,
      name: true,
      name_bn: true,
      phone: true,
      email: true,
      occupation: true,
      relation: true,
      nid_number: true,
      annual_income: true,
      is_primary: true,
      address: true,
      user_id: true,
      created_at: true,
      updated_at: true,
    },
  });

  return successResponse(guardian, "Guardian created");
});
