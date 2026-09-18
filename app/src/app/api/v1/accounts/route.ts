/**
 * MadrashaOS — Accounts API (Chart of Accounts)
 *
 * Phase B6.3 — Accounting (GL) API
 *
 * GET  /api/v1/accounts — list accounts (perm: accounting.ledger.view)
 * POST /api/v1/accounts — create account (perm: accounting.ledger.post)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse, parsePagination } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createAccountSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  name_bn: z.string().optional(),
  type: z.enum(["asset", "liability", "equity", "income", "expense"]),
  fund: z.enum(["general", "zakat"]).optional(),
  parent_account_id: z.string().uuid().optional(),
  is_bank: z.boolean().optional(),
  is_cash: z.boolean().optional(),
  bank_name: z.string().optional(),
  bank_account_no: z.string().optional(),
  description: z.string().optional(),
  opening_balance: z.number().optional(),
});

/** GET /api/v1/accounts — chart of accounts */
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const type = url.searchParams.get("type");
  const fund = url.searchParams.get("fund");
  const isActive = url.searchParams.get("is_active");

  const where = {
    organization_id: ctx.organization_id,
    ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}),
    deleted_at: null,
    ...(type ? { type } : {}),
    ...(fund ? { fund } : {}),
    ...(isActive === "true" ? { is_active: true } : isActive === "false" ? { is_active: false } : {}),
  };

  const [accounts, total] = await Promise.all([
    db.account.findMany({
      where,
      orderBy: [{ type: "asc" }, { code: "asc" }],
      skip,
      take,
      include: {
        parent_account: { select: { id: true, name: true, code: true } },
        _count: {
          select: {
            ledger_debits: { where: { deleted_at: null } },
            ledger_credits: { where: { deleted_at: null } },
          },
        },
      },
    }),
    db.account.count({ where }),
  ]);

  return jsonResponse({
    data: accounts.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      name_bn: a.name_bn,
      type: a.type,
      fund: a.fund,
      balance: Number(a.balance),
      currency: a.currency,
      is_active: a.is_active,
      is_bank: a.is_bank,
      is_cash: a.is_cash,
      bank_name: a.bank_name,
      bank_account_no: a.bank_account_no,
      parent_account: a.parent_account
        ? { id: a.parent_account.id, name: a.parent_account.name, code: a.parent_account.code }
        : null,
      description: a.description,
      transaction_count: a._count.ledger_debits + a._count.ledger_credits,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

/** POST /api/v1/accounts — create account */
export const POST = withPermission("accounting.ledger.post", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = createAccountSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const data = parsed.data;

  // Check code uniqueness within org
  const existing = await db.account.findFirst({
    where: { organization_id: ctx.organization_id, code: data.code, deleted_at: null },
  });
  if (existing) return errorResponse("Account with this code already exists", 409);

  const account = await db.account.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      code: data.code,
      name: data.name,
      name_bn: data.name_bn ?? null,
      type: data.type,
      fund: data.fund ?? "general",
      balance: data.opening_balance ?? 0,
      parent_account_id: data.parent_account_id ?? null,
      is_active: true,
      is_bank: data.is_bank ?? false,
      is_cash: data.is_cash ?? false,
      bank_name: data.bank_name ?? null,
      bank_account_no: data.bank_account_no ?? null,
      description: data.description ?? null,
      created_by: ctx.user_id,
    } as never,
  });

  return successResponse(account, "Account created");
});
