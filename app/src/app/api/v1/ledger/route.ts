/**
 * MadrashaOS — Ledger Entries API
 *
 * Phase B6.3 — Accounting (GL) API
 *
 * GET  /api/v1/ledger — list entries with running balance (perm: accounting.ledger.view)
 * POST /api/v1/ledger — post entry (perm: accounting.ledger.post)
 *   Golden Flow §3.6: validates debit_amount === credit_amount (single-entry format:
 *   one debit account + one credit account + one amount = balanced)
 *   - If amount > threshold → status='pending' (routes to approval queue)
 *   - If amount ≤ threshold → status='posted' (immediate; updates account balances)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse, parsePagination } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Threshold for auto-posting vs pending (Risk: large expenses need approval)
const POST_THRESHOLD = 25000;

const createLedgerEntrySchema = z.object({
  voucher_no: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  narration: z.string().min(1).max(1000),
  debit_account_id: z.string().uuid(),
  credit_account_id: z.string().uuid(),
  amount: z.number().min(0.01),
  fund: z.enum(["general", "zakat"]).optional(),
  source_type: z.string().optional(),
  source_id: z.string().uuid().optional(),
  notes: z.string().optional(),
});

/** GET /api/v1/ledger — list entries with running balance */
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const accountId = url.searchParams.get("account_id");
  const status = url.searchParams.get("status");
  const dateFrom = url.searchParams.get("date_from");
  const dateTo = url.searchParams.get("date_to");
  const fund = url.searchParams.get("fund");

  const where = {
    organization_id: ctx.organization_id,
    ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}),
    deleted_at: null,
    is_reversed: false,
    ...(status ? { status } : {}),
    ...(fund ? { fund } : {}),
    ...(dateFrom || dateTo
      ? {
          date: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
          },
        }
      : {}),
    ...(accountId
      ? {
          OR: [{ debit_account_id: accountId }, { credit_account_id: accountId }],
        }
      : {}),
  };

  const [entries, total] = await Promise.all([
    db.ledgerEntry.findMany({
      where,
      orderBy: [{ date: "desc" }, { created_at: "desc" }],
      skip,
      take,
      include: {
        debit_account: { select: { id: true, name: true, code: true, type: true } },
        credit_account: { select: { id: true, name: true, code: true, type: true } },
        poster: { select: { id: true, name: true } },
      },
    }),
    db.ledgerEntry.count({ where }),
  ]);

  // Compute running balance for the filtered account (if account_id specified)
  let runningBalance = 0;
  if (accountId) {
    const account = await db.account.findFirst({
      where: { id: accountId, organization_id: ctx.organization_id },
      select: { balance: true, type: true },
    });
    if (account) {
      // Start from the account's current balance and walk backwards
      runningBalance = Number(account.balance);
    }
  }

  // Build response with running balance (reverse chronological → chronological for calc)
  const chronological = [...entries].reverse();
  const entriesWithBalance = chronological.map((e) => {
    if (accountId) {
      if (e.debit_account_id === accountId) {
        // Debit to this account: increase for assets/expenses, decrease for liabilities/income
        const acc = e.debit_account;
      if (acc.type === "asset" || acc.type === "expense") {
        runningBalance += Number(e.amount);
      } else {
        runningBalance -= Number(e.amount);
      }
      } else if (e.credit_account_id === accountId) {
        // Credit to this account: decrease for assets/expenses, increase for liabilities/income
        const acc = e.credit_account;
        if (acc.type === "asset" || acc.type === "expense") {
          runningBalance -= Number(e.amount);
        } else {
          runningBalance += Number(e.amount);
        }
      }
    }
    return {
      id: e.id,
      voucher_no: e.voucher_no,
      date: e.date,
      narration: e.narration,
      debit_account: e.debit_account,
      credit_account: e.credit_account,
      amount: Number(e.amount),
      fund: e.fund,
      status: e.status,
      posted_by: e.poster?.name ?? null,
      posted_at: e.posted_at,
      source_type: e.source_type,
      is_reversed: e.is_reversed,
      ...(accountId ? { running_balance: Math.round(runningBalance * 100) / 100 } : {}),
    };
  });

  // Reverse back to desc order for response
  entriesWithBalance.reverse();

  return jsonResponse({
    data: entriesWithBalance,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    ...(accountId ? { running_balance_final: Math.round(runningBalance * 100) / 100 } : {}),
  });
}

/** POST /api/v1/ledger — post balanced entry (Golden Flow §3.6) */
export const POST = withPermission("accounting.ledger.post", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = createLedgerEntrySchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const data = parsed.data;

  // Golden Flow: debit account must differ from credit account
  if (data.debit_account_id === data.credit_account_id) {
    return errorResponse("Debit and credit accounts must be different", 400);
  }

  // Verify both accounts exist + belong to tenant
  const [debitAccount, creditAccount] = await Promise.all([
    db.account.findFirst({
      where: { id: data.debit_account_id, organization_id: ctx.organization_id, deleted_at: null },
      select: { id: true, name: true, code: true, type: true, balance: true, fund: true },
    }),
    db.account.findFirst({
      where: { id: data.credit_account_id, organization_id: ctx.organization_id, deleted_at: null },
      select: { id: true, name: true, code: true, type: true, balance: true, fund: true },
    }),
  ]);

  if (!debitAccount) return errorResponse("Debit account not found", 404);
  if (!creditAccount) return errorResponse("Credit account not found", 404);

  // C6/D18: Zakat fund isolation — both accounts must have the same fund type
  if (debitAccount.fund !== creditAccount.fund) {
    return errorResponse(
      "Fund isolation violation: debit and credit accounts must belong to the same fund (general or zakat). Cannot mix Zakat and general funds.",
      400,
      { debit_fund: debitAccount.fund, credit_fund: creditAccount.fund },
    );
  }

  // Generate voucher number if not provided
  let voucherNo = data.voucher_no;
  if (!voucherNo) {
    const year = new Date().getFullYear();
    const lastEntry = await db.ledgerEntry.findFirst({
      where: { voucher_no: { startsWith: `JV-${year}-` } },
      orderBy: { voucher_no: "desc" },
      select: { voucher_no: true },
    });
    const seq = lastEntry ? parseInt(lastEntry.voucher_no.split("-").pop() || "0", 10) + 1 : 1;
    voucherNo = `JV-${year}-${seq.toString().padStart(3, "0")}`;
  }

  // Check voucher uniqueness
  const existingVoucher = await db.ledgerEntry.findFirst({
    where: { voucher_no: voucherNo, organization_id: ctx.organization_id, deleted_at: null },
  });
  if (existingVoucher) return errorResponse("Voucher number already exists", 409);

  // Determine status: pending if amount exceeds threshold
  const status = data.amount >= POST_THRESHOLD ? "pending" : "posted";

  // Create entry + update account balances (if posted) in transaction
  const entry = await db.$transaction(async (tx) => {
    const newEntry = await tx.ledgerEntry.create({
      data: {
        organization_id: ctx.organization_id,
        branch_id: ctx.branch_id ?? null,
        voucher_no: voucherNo,
        date: new Date(data.date),
        narration: data.narration,
        debit_account_id: data.debit_account_id,
        credit_account_id: data.credit_account_id,
        amount: data.amount,
        fund: data.fund ?? debitAccount.fund,
        status,
        posted_by: status === "posted" ? ctx.user_id : null,
        posted_at: status === "posted" ? new Date() : null,
        source_type: data.source_type ?? "manual",
        source_id: data.source_id ?? null,
        created_by: ctx.user_id,
      } as never,
    });

    // Only update account balances if entry is posted (not pending)
    if (status === "posted") {
      // Debit: increase assets/expenses, decrease liabilities/equity/income
      const debitDelta = (debitAccount.type === "asset" || debitAccount.type === "expense")
        ? data.amount
        : -data.amount;
      await tx.account.update({
        where: { id: data.debit_account_id },
        data: { balance: { increment: debitDelta } } as never,
      });

      // Credit: decrease assets/expenses, increase liabilities/equity/income
      const creditDelta = (creditAccount.type === "asset" || creditAccount.type === "expense")
        ? -data.amount
        : data.amount;
      await tx.account.update({
        where: { id: data.credit_account_id },
        data: { balance: { increment: creditDelta } } as never,
      });
    }

    return newEntry;
  });

  // Audit log
  await db.auditLog.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      entity_type: "ledger_entries",
      entity_id: entry.id,
      action: "create",
      old_values: null,
      new_values: {
        voucher_no: voucherNo,
        debit_account: debitAccount.name,
        credit_account: creditAccount.name,
        amount: data.amount,
        status,
        routed_to_approval: status === "pending",
      },
      actor_id: ctx.user_id,
    } as never,
  });

  return jsonResponse(
    {
      id: entry.id,
      voucher_no: voucherNo,
      date: data.date,
      narration: data.narration,
      debit_account: { id: debitAccount.id, name: debitAccount.name, code: debitAccount.code },
      credit_account: { id: creditAccount.id, name: creditAccount.name, code: creditAccount.code },
      amount: data.amount,
      fund: data.fund ?? debitAccount.fund,
      status,
      message: status === "pending"
        ? `Entry created as pending — amount ৳${data.amount} exceeds threshold ৳${POST_THRESHOLD}. Routed to approval queue.`
        : `Entry posted — ৳${data.amount} debited from ${debitAccount.name}, credited to ${creditAccount.name}. Account balances updated.`,
    },
    201,
  );
});
