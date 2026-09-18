/**
 * MadrashaOS — Food Expense API
 *
 * Phase B7.3
 *
 * POST /api/v1/food/expense — record meal expense (perm: food.meal-plan)
 *   Posts to Food/Operating Expense account via Golden Flow (balanced ledger)
 *   Body: { amount, account_id, expense_date, narration? }
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const expenseSchema = z.object({
  amount: z.number().min(0.01),
  account_id: z.string().uuid(), // cash/bank account to pay from
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  narration: z.string().max(500).optional(),
  meal_plan_id: z.string().uuid().optional(),
});

export const POST = withPermission("food.meal-plan", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const data = parsed.data;

  // Verify source account (cash/bank)
  const sourceAccount = await db.account.findFirst({
    where: { id: data.account_id, organization_id: ctx.organization_id, deleted_at: null, is_active: true, type: "asset" },
    select: { id: true, name: true, code: true, balance: true },
  });
  if (!sourceAccount) return errorResponse("Source account not found or not an asset account", 404);

  if (Number(sourceAccount.balance) < data.amount) {
    return errorResponse(`Insufficient balance. Available: ৳${Number(sourceAccount.balance)}, Required: ৳${data.amount}`, 400);
  }

  // Find expense account (code 5000 — Operating Expenses from seed)
  const expenseAccount = await db.account.findFirst({
    where: { organization_id: ctx.organization_id, code: "5000", deleted_at: null },
    select: { id: true, name: true },
  });
  if (!expenseAccount) return errorResponse("Operating expense account not configured", 500);

  // Generate ledger voucher
  const year = new Date().getFullYear();
  const lastLedger = await db.ledgerEntry.findFirst({
    where: { voucher_no: { startsWith: `JV-${year}-` } },
    orderBy: { voucher_no: "desc" },
    select: { voucher_no: true },
  });
  const seq = lastLedger ? parseInt(lastLedger.voucher_no.split("-").pop() || "0", 10) + 1 : 1;
  const voucherNo = `JV-${year}-${seq.toString().padStart(3, "0")}`;

  // Create balanced ledger entry + update balances in transaction
  await db.$transaction(async (tx) => {
    await tx.ledgerEntry.create({
      data: {
        organization_id: ctx.organization_id,
        branch_id: ctx.branch_id ?? null,
        voucher_no: voucherNo,
        date: new Date(data.expense_date),
        narration: data.narration ?? `Food/meal expense — ${data.expense_date}`,
        debit_account_id: expenseAccount.id,   // Expense (increase)
        credit_account_id: data.account_id,     // Cash (decrease)
        amount: data.amount,
        fund: "general",
        status: "posted",
        posted_by: ctx.user_id,
        posted_at: new Date(),
        source_type: "food_expense",
        created_by: ctx.user_id,
      } as never,
    });

    // Update balances: expense increases, cash decreases
    await tx.account.update({
      where: { id: expenseAccount.id },
      data: { balance: { increment: data.amount } } as never,
    });
    await tx.account.update({
      where: { id: data.account_id },
      data: { balance: { decrement: data.amount } } as never,
    });
  });

  // Audit log
  await db.auditLog.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      entity_type: "meal_plans",
      entity_id: data.meal_plan_id ?? "expense",
      action: "record_expense",
      old_values: null,
      new_values: {
        amount: data.amount,
        source_account: sourceAccount.name,
        voucher_no: voucherNo,
        expense_date: data.expense_date,
      },
      actor_id: ctx.user_id,
    } as never,
  });

  return successResponse(
    { voucher_no: voucherNo, amount: data.amount, source_account: sourceAccount.name, expense_account: expenseAccount.name },
    `Food expense recorded — ৳${data.amount} posted to Operating Expenses via ${voucherNo}. Cash account ${sourceAccount.name} decreased.`,
  );
});
