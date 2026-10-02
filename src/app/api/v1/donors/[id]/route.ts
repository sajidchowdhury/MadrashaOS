/**
 * MadrashaOS — Single Donor API
 *
 * GET    /api/v1/donors/:id — single donor with pledges + donation history
 * PATCH  /api/v1/donors/:id — update donor
 * DELETE /api/v1/donors/:id — soft delete
 */

import { db } from "@/lib/db";
import { getTenantContext, tenantWhere } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateDonorSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  name_bn: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().max(255).optional(),
  address: z.string().max(1000).optional(),
  donor_type: z.enum(["regular", "one_time", "zakat_donor", "sadaqah_donor"]).optional(),
  notes: z.string().max(1000).optional(),
  is_active: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/v1/donors/:id */
export async function GET(_req: Request, ctx: RouteContext) {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const donor = await db.donor.findFirst({
    where: { id, ...tenantWhere(tenantCtx), deleted_at: null },
    include: {
      pledges: {
        where: { deleted_at: null },
        orderBy: { created_at: "desc" },
      },
      donations: {
        where: { deleted_at: null },
        orderBy: { donation_date: "desc" },
        take: 10,
        select: {
          id: true,
          amount: true,
          donation_type: true,
          fund: true,
          donation_date: true,
          status: true,
          payment_method: true,
        },
      },
    },
  });

  if (!donor) return errorResponse("Donor not found", 404);

  return jsonResponse({
    id: donor.id,
    name: donor.name,
    name_bn: donor.name_bn,
    phone: donor.phone,
    email: donor.email,
    address: donor.address,
    donor_type: donor.donor_type,
    total_donated: Number(donor.total_donated),
    total_pledged: Number(donor.total_pledged),
    notes: donor.notes,
    is_active: donor.is_active,
    pledges: donor.pledges.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      pledge_type: p.pledge_type,
      frequency: p.frequency,
      start_date: p.start_date,
      end_date: p.end_date,
      amount_received: Number(p.amount_received),
      next_reminder: p.next_reminder,
      status: p.status,
      notes: p.notes,
    })),
    recent_donations: donor.donations.map((d) => ({
      id: d.id,
      amount: Number(d.amount),
      donation_type: d.donation_type,
      fund: d.fund,
      donation_date: d.donation_date,
      status: d.status,
      payment_method: d.payment_method,
    })),
  });
}

/** PATCH /api/v1/donors/:id */
export const PATCH = withPermission("donors.create", async (req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = updateDonorSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const existing = await db.donor.findFirst({
    where: { id, ...tenantWhere(tenantCtx), deleted_at: null },
  });
  if (!existing) return errorResponse("Donor not found", 404);

  const updated = await db.donor.update({
    where: { id },
    data: { ...parsed.data, updated_by: tenantCtx.user_id },
  });

  return successResponse(updated, "Donor updated");
});

/** DELETE /api/v1/donors/:id — soft delete */
export const DELETE = withPermission("donors.create", async (_req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const existing = await db.donor.findFirst({
    where: { id, ...tenantWhere(tenantCtx), deleted_at: null },
  });
  if (!existing) return errorResponse("Donor not found", 404);

  await db.donor.update({
    where: { id },
    data: { deleted_at: new Date(), is_active: false, updated_by: tenantCtx.user_id },
  });

  return successResponse(null, "Donor deleted (soft)");
});
