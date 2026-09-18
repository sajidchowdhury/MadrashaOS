/**
 * MadrashaOS — Single Ledger Entry API
 *
 * Phase B6.3
 *
 * GET   /api/v1/ledger/:id — single entry with account details
 * PATCH /api/v1/ledger/:id — approve/reject pending entry (perm: accounting.ledger.post)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateEntrySchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/v1/ledger/:id */
export async function GET(_req: Request, ctx: RouteContext) {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const entry = await db.ledgerEntry.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
    include: {
      debit_account: { select: { id: true, name: true, code: true, type: true, fund: true } },
      credit_account: { select: { id: true, name: true, code: true, type: true, fund: true } },
      poster: { select: { id: true, name: true } },
      approver: { select: { id: true, name: true } },
    },
  });

  if (!entry) return errorResponse("Ledger entry not found", 404);

  return jsonResponse({
    id: entry.id,
    voucher_no: entry.voucher_no,
    date: entry.date,
    narration: entry.narration,
    debit_account: entry.debit_account,
    credit_account: entry.credit_account,
    amount: Number(entry.amount),
    fund: entry.fund,
    status: entry.status,
    posted_by: entry.poster?.name ?? null,
    posted_at: entry.posted_at,
    approved_by: entry.approver?.name ?? null,
    source_type: entry.source_type,
    is_reversed: entry.is_reversed,
  });
}

/** PATCH /api/v1/ledger/:id — approve/reject pending entry */
export const PATCH = withPermission("accounting.ledger.post", async (req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = updateEntrySchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const entry = await db.ledgerEntry.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
    include: {
      debit_account: { select: { id: true, name: true, type: true, balance: true } },
      credit_account: { select: { id: true, name: true, type: true, balance: true } },
    },
  });
  if (!entry) return errorResponse("Ledger entry not found", 404);

  if (entry.status !== "pending") {
    return errorResponse(`Cannot ${parsed.data.action} an entry with status "${entry.status}". Only pending entries can be approved/rejected.`, 409);
  }

  if (parsed.data.action === "approve") {
    // --- Approve: post the entry + update account balances ---
    await db.$transaction(async (tx) => {
      await tx.ledgerEntry.update({
        where: { id },
        data: {
          status: "posted",
          posted_by: tenantCtx.user_id,
          posted_at: new Date(),
          approved_by: tenantCtx.user_id,
          updated_by: tenantCtx.user_id,
        } as never,
      });

      // Update account balances
      const amount = Number(entry.amount);
      const debitDelta = (entry.debit_account.type === "asset" || entry.debit_account.type === "expense")
        ? amount : -amount;
      await tx.account.update({
        where: { id: entry.debit_account_id },
        data: { balance: { increment: debitDelta } } as never,
      });

      const creditDelta = (entry.credit_account.type === "asset" || entry.credit_account.type === "expense")
        ? -amount : amount;
      await tx.account.update({
        where: { id: entry.credit_account_id },
        data: { balance: { increment: creditDelta } } as never,
      });
    });

    return successResponse(
      { id, status: "posted" },
      `Entry approved and posted. Account balances updated.`,
    );
  } else {
    // --- Reject: set status to rejected ---
    await db.ledgerEntry.update({
      where: { id },
      data: {
        status: "rejected",
        approved_by: tenantCtx.user_id,
        updated_by: tenantCtx.user_id,
      } as never,
    });

    return successResponse(
      { id, status: "rejected" },
      `Entry rejected. No account balance changes.`,
    );
  }
});
