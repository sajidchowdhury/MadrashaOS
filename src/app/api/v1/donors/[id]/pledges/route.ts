/**
 * MadrashaOS — Donor Pledge API
 *
 * POST /api/v1/donors/:id/pledges — create pledge for a donor
 * GET  /api/v1/donors/:id/pledges — list pledges for a donor
 */

import { db } from "@/lib/db";
import { getTenantContext, tenantWhere } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createPledgeSchema = z.object({
  amount: z.number().min(1),
  pledge_type: z.enum(["general", "zakat", "sadaqah"]).optional().default("general"),
  frequency: z.enum(["one_time", "monthly", "yearly"]).optional().default("one_time"),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  next_reminder: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(500).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/v1/donors/:id/pledges — list pledges */
export async function GET(_req: Request, ctx: RouteContext) {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const donor = await db.donor.findFirst({
    where: { id, ...tenantWhere(tenantCtx), deleted_at: null },
    select: { id: true },
  });
  if (!donor) return errorResponse("Donor not found", 404);

  const pledges = await db.donorPledge.findMany({
    where: { donor_id: id, deleted_at: null },
    orderBy: { created_at: "desc" },
  });

  return jsonResponse({
    data: pledges.map((p) => ({
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
  });
}

/** POST /api/v1/donors/:id/pledges — create pledge */
export const POST = withPermission("donors.create", async (req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const donor = await db.donor.findFirst({
    where: { id, ...tenantWhere(tenantCtx), deleted_at: null },
    select: { id: true, name: true, total_pledged: true },
  });
  if (!donor) return errorResponse("Donor not found", 404);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = createPledgeSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const data = parsed.data;

  const pledge = await db.donorPledge.create({
    data: {
      organization_id: tenantCtx.organization_id,
      donor_id: id,
      amount: data.amount,
      pledge_type: data.pledge_type,
      frequency: data.frequency,
      start_date: new Date(data.start_date),
      end_date: data.end_date ? new Date(data.end_date) : null,
      next_reminder: data.next_reminder ? new Date(data.next_reminder) : null,
      notes: data.notes ?? null,
      created_by: tenantCtx.user_id,
    },
  });

  // Update donor's total_pledged
  await db.donor.update({
    where: { id },
    data: { total_pledged: Number(donor.total_pledged) + data.amount },
  });

  return successResponse(
    {
      id: pledge.id,
      donor_name: donor.name,
      amount: Number(pledge.amount),
      pledge_type: pledge.pledge_type,
      frequency: pledge.frequency,
      start_date: pledge.start_date,
      status: pledge.status,
    },
    `Pledge created — ${donor.name} promised ৳${data.amount.toLocaleString()}`,
  );
});
