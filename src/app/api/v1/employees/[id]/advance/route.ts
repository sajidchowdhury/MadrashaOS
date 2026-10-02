/**
 * MadrashaOS — Employee Advance API
 *
 * POST /api/v1/employees/:id/advance
 *   Gives an advance payment to an employee/teacher.
 *   Creates a LedgerEntry (debit Salary Advance asset, credit Cash/Bank)
 *   + an EmployeeAdvance record.
 *   Permission: accounting.ledger.post (same as payroll)
 *
 * GET /api/v1/employees/:id/advance
 *   Lists pending advances for the employee.
 */

import { db } from "@/lib/db";
import { getTenantContext, tenantWhere } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { errorResponse, successResponse, jsonResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const advanceSchema = z.object({
  amount: z.number().min(1),
  reason: z.string().max(500).optional(),
  advance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  account_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  notes: z.string().max(500).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/v1/employees/:id/advance — give advance */
export const POST = withPermission(
  "accounting.ledger.post",
  async (req: Request, ctx: RouteContext) => {
    const tenantCtx = await getTenantContext();
    if (!tenantCtx) return errorResponse("Unauthorized", 401);
    const { id: employeeId } = await ctx.params;

    let body: unknown;
    try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

    const parsed = advanceSchema.safeParse(body);
    if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

    const data = parsed.data;

    // Find the employee + linked user
    const employee = await db.employee.findFirst({
      where: { id: employeeId, ...tenantWhere(tenantCtx), deleted_at: null },
      select: {
        id: true,
        user_id: true,
        branch_id: true,
        user: { select: { id: true, name: true } },
      },
    });
    if (!employee) return errorResponse("Employee not found", 404);

    // Validate the account (asset)
    const account = await db.account.findFirst({
      where: { id: data.account_id, ...tenantWhere(tenantCtx), deleted_at: null, type: "asset" },
      select: { id: true, name: true },
    });
    if (!account) return errorResponse("Payment account not found (must be a Cash/Bank asset account)", 404);

    // Find or create a "Salary Advance" asset account (debit side)
    let advanceAccount = await db.account.findFirst({
      where: {
        ...tenantWhere(tenantCtx),
        type: "asset",
        deleted_at: null,
        OR: [
          { name: { contains: "advance", mode: "insensitive" } },
          { name: { contains: "Salary Advance", mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });

    if (!advanceAccount) {
      // Fall back to any asset account (the advance will be tracked via the
      // EmployeeAdvance record, not just the ledger)
      advanceAccount = await db.account.findFirst({
        where: { ...tenantWhere(tenantCtx), type: "asset", deleted_at: null },
        select: { id: true },
      });
    }

    const advanceDate = data.advance_date ? new Date(data.advance_date) : new Date();
    const year = new Date().getFullYear();
    const voucherNo = `JV-${year}-${Date.now().toString().slice(-6)}`;

    // Transaction: create ledger entry + advance record
    const result = await db.$transaction(async (tx) => {
      // 1. Create LedgerEntry (debit Salary Advance, credit Cash/Bank)
      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          organization_id: tenantCtx.organization_id,
          branch_id: employee.branch_id ?? tenantCtx.branch_id ?? null,
          voucher_no: voucherNo,
          date: advanceDate,
          narration: `Advance payment — ${employee.user.name} — ৳${data.amount}${data.reason ? ` (${data.reason})` : ""}`,
          debit_account_id: advanceAccount!.id,
          credit_account_id: data.account_id,
          amount: data.amount,
          status: "posted",
          posted_by: tenantCtx.user_id,
          fund: "general",
          source_type: "employee_advance",
          created_by: tenantCtx.user_id,
        } as never,
      });

      // 2. Create EmployeeAdvance record
      const advance = await tx.employeeAdvance.create({
        data: {
          organization_id: tenantCtx.organization_id,
          branch_id: employee.branch_id ?? tenantCtx.branch_id ?? null,
          staff_type: "employee",
          staff_id: employee.id,
          user_id: employee.user_id,
          amount: data.amount,
          advance_date: advanceDate,
          reason: data.reason ?? null,
          status: "pending",
          ledger_entry_id: ledgerEntry.id,
          notes: data.notes ?? null,
          created_by: tenantCtx.user_id,
        } as never,
      });

      return { advance, ledgerEntry };
    });

    // Audit log
    try {
      await db.auditLog.create({
        data: {
          organization_id: tenantCtx.organization_id,
          actor_user_id: tenantCtx.user_id,
          action: "employee.advance",
          entity_type: "employee_advances",
          entity_id: result.advance.id,
          metadata: {
            employee_name: employee.user.name,
            amount: data.amount,
            reason: data.reason,
          },
        } as never,
      });
    } catch {
      // Non-fatal
    }

    return successResponse(
      {
        id: result.advance.id,
        employee_name: employee.user.name,
        amount: data.amount,
        advance_date: advanceDate,
        reason: data.reason ?? null,
        status: "pending",
        voucher_no: voucherNo,
      },
      `Advance of ৳${data.amount.toLocaleString()} given to ${employee.user.name}. Will be deducted from next salary.`,
    );
  },
);

/** GET /api/v1/employees/:id/advance — list advances for an employee */
export async function GET(_req: Request, ctx: RouteContext) {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id: employeeId } = await ctx.params;

  const advances = await db.employeeAdvance.findMany({
    where: {
      staff_id: employeeId,
      organization_id: tenantCtx.organization_id,
      deleted_at: null,
    },
    orderBy: { advance_date: "desc" },
    select: {
      id: true,
      amount: true,
      advance_date: true,
      reason: true,
      status: true,
      deduction_month: true,
      deduction_year: true,
      notes: true,
      created_at: true,
    },
  });

  return jsonResponse({
    data: advances.map((a) => ({
      id: a.id,
      amount: Number(a.amount),
      advance_date: a.advance_date,
      reason: a.reason,
      status: a.status,
      deduction_month: a.deduction_month,
      deduction_year: a.deduction_year,
      notes: a.notes,
      created_at: a.created_at,
    })),
  });
}
