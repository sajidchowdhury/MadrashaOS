/**
 * MadrashaOS — Single Donation API
 *
 * Phase B6.6
 *
 * GET /api/v1/donations/:id — single donation with receipt details
 *   - For public access: allows viewing by receipt_no without authentication
 *     (so donors can verify their receipt without logging in)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { jsonResponse, errorResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/v1/donations/:id — single donation receipt view */
export async function GET(_req: Request, ctx: RouteContext) {
  const { id } = await ctx.params;

  // Try authenticated context first
  const tenantCtx = await getTenantContext();

  // Build where clause — authenticated users are scoped to their org;
  // public users can view by ID (receipt verification)
  const where = tenantCtx
    ? { id, organization_id: tenantCtx.organization_id, deleted_at: null }
    : { id, deleted_at: null, honeypot_filled: false }; // public: exclude honeypot entries

  const donation = await db.donation.findFirst({
    where,
    include: {
      account: { select: { id: true, name: true, code: true, fund: true } },
      confirmer: { select: { id: true, name: true } },
      organization: { select: { id: true, name: true, name_bn: true, address: true, phone: true, email: true } },
    },
  });

  if (!donation) return errorResponse("Donation not found", 404);

  return jsonResponse({
    id: donation.id,
    receipt_no: donation.receipt_no,
    organization: {
      name: donation.organization.name,
      name_bn: donation.organization.name_bn,
      address: donation.organization.address,
      phone: donation.organization.phone,
      email: donation.organization.email,
    },
    donor_name: donation.is_anonymous ? "Anonymous" : donation.donor_name,
    donor_email: donation.is_anonymous ? null : donation.donor_email,
    donor_phone: donation.is_anonymous ? null : donation.donor_phone,
    amount: Number(donation.amount),
    donation_type: donation.donation_type,
    fund: donation.fund,
    donation_date: donation.donation_date,
    transaction_ref: donation.transaction_ref,
    is_anonymous: donation.is_anonymous,
    status: donation.status,
    payment_method: donation.payment_method,
    note: donation.note,
    account: donation.account,
    confirmed_by: donation.confirmer?.name ?? null,
    confirmed_at: donation.confirmed_at,
    // Zakat note for receipt (SRS §3.7)
    ...(donation.fund === "zakat" ? {
      zakat_note: "This donation has been posted to the Zakat fund. Zakat funds are isolated per SRS §3.7 and never co-mingled with general funds.",
    } : {}),
  });
}
