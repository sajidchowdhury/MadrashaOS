/**
 * MadrashaOS — Donor API
 *
 * GET  /api/v1/donors — list donors (perm: donors.view)
 * POST /api/v1/donors — create donor (perm: donors.create)
 */

import { db } from "@/lib/db";
import { getTenantContext, tenantWhere } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse, parsePagination } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createDonorSchema = z.object({
  name: z.string().min(1).max(255),
  name_bn: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().max(255).optional(),
  address: z.string().max(1000).optional(),
  donor_type: z.enum(["regular", "one_time", "zakat_donor", "sadaqah_donor"]).optional().default("regular"),
  notes: z.string().max(1000).optional(),
});

/** GET /api/v1/donors — list donors */
export const GET = withPermission("donors.view", async (req: Request) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const search = url.searchParams.get("search");
  const donorType = url.searchParams.get("donor_type");

  const where = {
    ...tenantWhere(ctx),
    deleted_at: null,
    ...(search ? {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { phone: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    } : {}),
    ...(donorType ? { donor_type: donorType } : {}),
  };

  const [donors, total] = await Promise.all([
    db.donor.findMany({
      where,
      orderBy: [{ total_donated: "desc" }, { created_at: "desc" }],
      skip, take,
      include: {
        _count: { select: { donations: true, pledges: true } },
      },
    }),
    db.donor.count({ where }),
  ]);

  return jsonResponse({
    data: donors.map((d) => ({
      id: d.id,
      name: d.name,
      name_bn: d.name_bn,
      phone: d.phone,
      email: d.email,
      address: d.address,
      donor_type: d.donor_type,
      total_donated: Number(d.total_donated),
      total_pledged: Number(d.total_pledged),
      notes: d.notes,
      is_active: d.is_active,
      donation_count: d._count.donations,
      pledge_count: d._count.pledges,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
});

/** POST /api/v1/donors — create donor */
export const POST = withPermission("donors.create", async (req: Request) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = createDonorSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const data = parsed.data;

  // Check for duplicate phone or email
  if (data.phone) {
    const existing = await db.donor.findFirst({
      where: { ...tenantWhere(ctx), phone: data.phone, deleted_at: null },
      select: { id: true, name: true },
    });
    if (existing) return errorResponse(`Donor with phone ${data.phone} already exists: ${existing.name}`, 409);
  }

  const donor = await db.donor.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      name: data.name,
      name_bn: data.name_bn ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      address: data.address ?? null,
      donor_type: data.donor_type,
      notes: data.notes ?? null,
      created_by: ctx.user_id,
    },
    select: { id: true, name: true, phone: true, email: true, donor_type: true },
  });

  return successResponse(donor, "Donor created");
});
