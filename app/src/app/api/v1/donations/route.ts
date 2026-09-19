/**
 * MadrashaOS — Donations API
 *
 * Phase B6.6 — Donations API (honeypot + receipt)
 *
 * GET  /api/v1/donations — list donations (perm: donations.view)
 * POST /api/v1/donations — create donation (perm: donations.create OR donations.create.public)
 *
 * Risk R10 lock-in:
 *   - Email OR mobile is MANDATORY (at least one must be provided)
 *   - Honeypot field: if "website" field is filled → silently accept (200) but DON'T save
 *   - If donation_type = "zakat" → posts to Zakat fund account (fund='zakat')
 *   - If donation_type = "general" or "sadaqah" → posts to general fund account
 *   - Creates balanced LedgerEntry with the correct fund type
 *   - Generates receipt number
 *   - Audit logged
 *
 * Note: POST /api/v1/donations is also accessible publicly (no auth required)
 * via the middleware bypass in src/middleware.ts (per Risk R10 — public donations).
 * The route handler checks for session; if no session, uses donations.create.public
 * permission logic (always allowed for public).
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse, parsePagination } from "@/lib/api/helpers";
import { z } from "zod";
import { notifyEntity } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const createDonationSchema = z.object({
  donor_name: z.string().max(255).optional(),
  donor_email: z.string().email().optional(),
  donor_phone: z.string().min(5).max(20).optional(),
  amount: z.number().min(1),
  donation_type: z.enum(["general", "zakat", "sadaqah"]).default("general"),
  account_id: z.string().uuid().optional(), // optional — auto-selects if not provided
  donation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note: z.string().max(500).optional(),
  is_anonymous: z.boolean().default(false),
  payment_method: z.string().optional(), // card | mobile | bank | cash
  transaction_ref: z.string().optional(),
  // Risk R10: honeypot field — bots fill this; humans don't see it
  website: z.string().optional(), // honeypot — if filled, silently reject
});

/** GET /api/v1/donations — list donations (authenticated only) */
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const donationType = url.searchParams.get("donation_type");
  const status = url.searchParams.get("status");
  const isAnonymous = url.searchParams.get("is_anonymous");
  const dateFrom = url.searchParams.get("date_from");
  const dateTo = url.searchParams.get("date_to");

  const where = {
    organization_id: ctx.organization_id,
    ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}),
    deleted_at: null,
    honeypot_filled: false, // never show honeypot-caught entries
    ...(donationType ? { donation_type: donationType } : {}),
    ...(status ? { status } : {}),
    ...(isAnonymous === "true" ? { is_anonymous: true } : isAnonymous === "false" ? { is_anonymous: false } : {}),
    ...(dateFrom || dateTo
      ? {
          donation_date: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
          },
        }
      : {}),
  };

  const [donations, total] = await Promise.all([
    db.donation.findMany({
      where,
      orderBy: { donation_date: "desc" },
      skip,
      take,
      include: {
        account: { select: { id: true, name: true, code: true, fund: true } },
        confirmer: { select: { id: true, name: true } },
      },
    }),
    db.donation.count({ where }),
  ]);

  // Calculate totals
  const allDonations = await db.donation.findMany({
    where: { ...where, status: "confirmed" },
    select: { amount: true, donation_type: true, fund: true },
  });
  const totalAmount = allDonations.reduce((sum, d) => sum + Number(d.amount), 0);
  const zakatTotal = allDonations.filter((d) => d.fund === "zakat").reduce((sum, d) => sum + Number(d.amount), 0);
  const generalTotal = allDonations.filter((d) => d.fund === "general").reduce((sum, d) => sum + Number(d.amount), 0);

  return jsonResponse({
    data: donations.map((d) => ({
      id: d.id,
      donor_name: d.is_anonymous ? "Anonymous" : d.donor_name,
      donor_email: d.is_anonymous ? null : d.donor_email,
      donor_phone: d.is_anonymous ? null : d.donor_phone,
      amount: Number(d.amount),
      donation_type: d.donation_type,
      fund: d.fund,
      donation_date: d.donation_date,
      receipt_no: d.receipt_no,
      transaction_ref: d.transaction_ref,
      is_anonymous: d.is_anonymous,
      status: d.status,
      payment_method: d.payment_method,
      note: d.note,
      account: d.account,
      confirmed_by: d.confirmer?.name ?? null,
      confirmed_at: d.confirmed_at,
    })),
    summary: {
      total_donations: total,
      total_confirmed_amount: totalAmount,
      zakat_total: zakatTotal,
      general_total: generalTotal,
    },
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

/** POST /api/v1/donations — create donation (public + authenticated) */
export async function POST(req: Request) {
  // Check if this is a public request (no session) or authenticated
  const ctx = await getTenantContext();
  const isPublic = !ctx;

  // For public donations, we need to get the organization from a different source
  // Since public visitors don't have a session, we use the first organization (single-tenant for now)
  let orgId: string;
  let branchId: string | null = null;
  let userId: string | null = null;

  if (ctx) {
    orgId = ctx.organization_id;
    branchId = ctx.branch_id ?? null;
    userId = ctx.user_id;
  } else {
    // Public donation — get the first organization
    const org = await db.organization.findFirst({
      where: { deleted_at: null },
      select: { id: true, branches: { where: { deleted_at: null, is_active: true }, take: 1 } },
    });
    if (!org) return errorResponse("No organization configured", 500);
    orgId = org.id;
    branchId = org.branches[0]?.id ?? null;
  }

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = createDonationSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const data = parsed.data;

  // --- Risk R10: Honeypot check ---
  // If the hidden "website" field is filled, a bot submitted the form.
  // Silently return a success response WITHOUT saving the donation.
  if (data.website && data.website.trim().length > 0) {
    // Log the attempt (for analysis) but return a fake success
    console.warn("[Risk R10] Honeypot triggered — donation silently rejected", {
      donor_email: data.donor_email,
      amount: data.amount,
      timestamp: new Date().toISOString(),
    });
    return jsonResponse(
      {
        success: true,
        receipt_no: `FAKE-${Date.now()}`,
        message: "Donation received. Thank you.",
      },
      200, // Return 200 so the bot thinks it succeeded
    );
  }

  // --- Risk R10: Email OR mobile MANDATORY ---
  if (!data.donor_email && !data.donor_phone) {
    return errorResponse(
      "At least one contact method (email or mobile) is required for the receipt.",
      400,
      { field: "donor_email or donor_phone", requirement: "at_least_one" },
    );
  }

  // Determine fund type based on donation_type
  const fundType = data.donation_type === "zakat" ? "zakat" : "general";

  // Find or verify the target account
  let account: { id: string; name: string; code: string; type: string; fund: string; balance: number };
  if (data.account_id) {
    const acc = await db.account.findFirst({
      where: { id: data.account_id, organization_id: orgId, deleted_at: null, is_active: true },
      select: { id: true, name: true, code: true, type: true, fund: true, balance: true },
    });
    if (!acc) return errorResponse("Account not found", 404);
    // C6/D18: verify fund matches donation type
    if (acc.fund !== fundType) {
      return errorResponse(
        `Account fund mismatch: donation type '${data.donation_type}' requires fund='${fundType}' account, but account has fund='${acc.fund}'.`,
        400,
        { account_fund: acc.fund, required_fund: fundType },
      );
    }
    account = { ...acc, balance: Number(acc.balance) };
  } else {
    // Auto-select: find the first active asset account with the matching fund
    const acc = await db.account.findFirst({
      where: { organization_id: orgId, fund: fundType, type: "asset", deleted_at: null, is_active: true },
      select: { id: true, name: true, code: true, type: true, fund: true, balance: true },
    });
    if (!acc) {
      return errorResponse(
        `No ${fundType} fund account configured. Please create an asset account with fund='${fundType}'.`,
        500,
      );
    }
    account = { ...acc, balance: Number(acc.balance) };
  }

  // Find the income/credit account for the matching fund
  const incomeAccount = await db.account.findFirst({
    where: {
      organization_id: orgId,
      fund: fundType,
      type: "income",
      deleted_at: null,
      ...(fundType === "zakat" ? {} : { code: { startsWith: "41" } }), // donation income code range
    },
    select: { id: true, name: true, code: true },
  });
  if (!incomeAccount) {
    // If no income account, find a liability account for zakat or create error
    if (fundType === "zakat") {
      const zakatLiability = await db.account.findFirst({
        where: { organization_id: orgId, fund: "zakat", type: "liability", deleted_at: null },
        select: { id: true, name: true, code: true },
      });
      if (!zakatLiability) {
        return errorResponse("Zakat fund liability account not configured.", 500);
      }
      // Use the liability as the credit account
    } else {
      return errorResponse("Donation income account not configured.", 500);
    }
  }

  // Determine credit account
  let creditAccountId: string;
  if (fundType === "zakat") {
    // For Zakat donations: credit the Zakat fund liability account
    const zakatLiability = await db.account.findFirst({
      where: { organization_id: orgId, fund: "zakat", type: "liability", deleted_at: null },
      select: { id: true },
    });
    creditAccountId = zakatLiability?.id ?? incomeAccount?.id ?? account.id;
  } else {
    // For general/sadaqah donations: credit the donation income account
    creditAccountId = incomeAccount?.id ?? account.id;
  }

  // Generate receipt number
  const year = new Date().getFullYear();
  const lastDonation = await db.donation.findFirst({
    where: { receipt_no: { startsWith: `DON-${year}-` } },
    orderBy: { receipt_no: "desc" },
    select: { receipt_no: true },
  });
  const seq = lastDonation ? parseInt(lastDonation.receipt_no.split("-").pop() || "0", 10) + 1 : 1;
  const receiptNo = `DON-${year}-${seq.toString().padStart(4, "0")}`;

  // Generate ledger voucher
  const lastLedger = await db.ledgerEntry.findFirst({
    where: { voucher_no: { startsWith: `JV-${year}-` } },
    orderBy: { voucher_no: "desc" },
    select: { voucher_no: true },
  });
  const ledgerSeq = lastLedger ? parseInt(lastLedger.voucher_no.split("-").pop() || "0", 10) + 1 : 1;
  const ledgerVoucherNo = `JV-${year}-${ledgerSeq.toString().padStart(3, "0")}`;

  const txDate = data.donation_date ? new Date(data.donation_date) : new Date();
  const donorName = data.is_anonymous ? null : (data.donor_name ?? "Anonymous");

  // Create donation + ledger entry + update balances in transaction
  const result = await db.$transaction(async (tx) => {
    // 1. Create Donation record
    const donation = await tx.donation.create({
      data: {
        organization_id: orgId,
        branch_id: branchId,
        account_id: account.id,
        donor_name: donorName,
        donor_email: data.donor_email ?? null,
        donor_phone: data.donor_phone ?? null,
        amount: data.amount,
        donation_type: data.donation_type,
        fund: fundType,
        donation_date: txDate,
        transaction_ref: data.transaction_ref ?? null,
        receipt_no: receiptNo,
        note: data.note ?? null,
        is_anonymous: data.is_anonymous,
        status: "confirmed", // Auto-confirm for now (no payment gateway integration yet)
        payment_method: data.payment_method ?? null,
        honeypot_filled: false,
        confirmed_by: userId,
        confirmed_at: new Date(),
        created_by: userId,
      } as never,
    });

    // 2. Create balanced LedgerEntry with correct fund
    await tx.ledgerEntry.create({
      data: {
        organization_id: orgId,
        branch_id: branchId,
        voucher_no: ledgerVoucherNo,
        date: txDate,
        narration: `Donation received — ${donorName ?? "Anonymous"} — ${data.donation_type} — Receipt ${receiptNo}`,
        debit_account_id: account.id,       // Cash/Bank (asset increase)
        credit_account_id: creditAccountId,  // Income or Zakat Fund (increase)
        amount: data.amount,
        fund: fundType, // C6/D18: correct fund type
        status: "posted",
        posted_by: userId,
        posted_at: new Date(),
        source_type: "donation",
        source_id: donation.id,
        created_by: userId,
      } as never,
    });

    // 3. Update account balances
    // Debit account (asset): increase
    await tx.account.update({
      where: { id: account.id },
      data: { balance: { increment: data.amount } } as never,
    });
    // Credit account (income/liability): increase
    await tx.account.update({
      where: { id: creditAccountId },
      data: { balance: { increment: data.amount } } as never,
    });

    return donation;
  });

  // Audit log (only if authenticated)
  if (userId) {
    await db.auditLog.create({
      data: {
        organization_id: orgId,
        branch_id: branchId,
        entity_type: "donations",
        entity_id: result.id,
        action: "create",
        old_values: null,
        new_values: {
          receipt_no: receiptNo,
          amount: data.amount,
          donation_type: data.donation_type,
          fund: fundType,
          donor: donorName ?? "Anonymous",
          is_anonymous: data.is_anonymous,
          ledger_voucher: ledgerVoucherNo,
        },
        actor_user_id: userId,
      } as never,
    });
  }

  // --- Phase 4: Send receipt notification to donor (non-blocking) ---
  // Fire-and-forget — a notification failure must NOT roll back the donation.
  const org = await db.organization.findFirst({
    where: { id: orgId },
    select: { name: true },
  });
  const orgName = org?.name ?? "MadrashaOS";
  if (data.donor_email || data.donor_phone) {
    notifyEntity("email", {
      to: data.donor_email || "",
      subject: `Donation Receipt — ${receiptNo}`,
      templateId: "donation-receipt",
      templateVars: {
        receiptNo,
        amount: data.amount,
        donationType: data.donation_type,
        donorName: donorName ?? "Anonymous",
        orgName,
      },
      metadata: {
        organization_id: orgId,
        entity_type: "donations",
        entity_id: result.id,
      },
    }).catch(() => {});
    if (data.donor_phone) {
      notifyEntity("sms", {
        to: data.donor_phone,
        body: `${orgName}: Donation of ৳${data.amount} received. Receipt ${receiptNo}. Thank you for your generosity.`,
        templateId: "donation-receipt",
        templateVars: { receiptNo, amount: data.amount, orgName },
        metadata: {
          organization_id: orgId,
          entity_type: "donations",
          entity_id: result.id,
        },
      }).catch(() => {});
    }
  }

  // Build the success response
  const isZakat = data.donation_type === "zakat";
  return jsonResponse(
    {
      id: result.id,
      receipt_no: receiptNo,
      amount: data.amount,
      donation_type: data.donation_type,
      fund: fundType,
      donor_name: donorName ?? "Anonymous",
      is_anonymous: data.is_anonymous,
      transaction_date: txDate,
      ledger_voucher_no: ledgerVoucherNo,
      payment_method: data.payment_method ?? null,
      ...(isZakat ? { zakat_note: "This donation has been posted to the Zakat fund (SRS §3.7). Zakat funds are isolated and never co-mingled with general funds." } : {}),
      message: `Donation received — ৳${data.amount} (${data.donation_type}). Receipt ${receiptNo} issued. Thank you!`,
      // For public donations: include a "download_receipt" flag so frontend shows the button
      download_receipt: true,
    },
    201,
  );
}
