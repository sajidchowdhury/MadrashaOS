/**
 * MadrashaOS — Payroll API (Salary Payment + Ledger Posting)
 *
 * POST /api/v1/payroll/pay
 *   Pays a salary to an Employee or Teacher. Posts a balanced
 *   LedgerEntry (debit Salary Expense, credit Cash/Bank) + creates a
 *   PayrollRecord (payslip) row. All in one transaction.
 *
 *   Permission: accounting.ledger.post (same as posting any ledger entry)
 *
 *   Body:
 *     staff_type   — 'employee' | 'teacher'
 *     staff_id     — UUID of the Employee or Teacher row
 *     month        — 1-12 (which month the salary is for)
 *     year         — e.g. 2026
 *     amount       — net salary amount to pay (BDT)
 *     account_id   — UUID of the Cash/Bank account (credit side)
 *     deductions?  — BDT (default 0; gross = amount + deductions)
 *     notes?       — string
 *     payment_date?— ISO date (defaults to today)
 *
 *   Golden Flow (mirrors the FeePayment pattern):
 *     1. Validate staff exists in tenant
 *     2. Validate account exists + is an asset (cash/bank)
 *     3. Find a Salary Expense account (debit side) — looks for an
 *        expense account whose name contains "salary"; falls back to
 *        code "5000" (Operating Expenses); 500 if none exist
 *     4. Generate payslip_no (PAY-YYYY-NNNN) + voucher_no (JV-YYYY-NNN)
 *     5. Transaction: create PayrollRecord + LedgerEntry + update both
 *        account balances (credit Cash/Bank decreases, debit Salary
 *        Expense increases)
 *     6. Audit log entry
 *
 * GET /api/v1/payroll
 *   Lists payslips in the current tenant. Filterable by staff_type,
 *   month, year. Paginated.
 *   Permission: accounting.ledger.view
 */

import { db } from "@/lib/db";
import { getTenantContext, tenantWhere } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import {
  jsonResponse, errorResponse, successResponse,
  paginatedResponse, parsePagination,
} from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const paySalarySchema = z.object({
  staff_type: z.enum(["employee", "teacher"]),
  staff_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2050),
  amount: z.number().positive("Amount must be greater than 0"),
  account_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  deductions: z.number().min(0).optional().default(0),
  notes: z.string().max(500).optional(),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** POST /api/v1/payroll/pay — pay salary */
export const POST = withPermission("accounting.ledger.post", async (req: Request) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const parsed = paySalarySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parsed.error.flatten());
  }

  const data = parsed.data;

  // --- 1. Resolve the staff (Employee or Teacher) ---
  const staffTable = data.staff_type === "teacher" ? db.teacher : db.employee;
  const staff = await (staffTable as typeof db.employee).findFirst({
    where: {
      id: data.staff_id,
      ...tenantWhere(ctx),
      deleted_at: null,
    } as never,
    select: {
      id: true,
      employee_code: true,
      designation: true,
      salary: true,
      status: true,
      user_id: true,
      branch_id: true,
      user: { select: { id: true, name: true, name_bn: true, email: true } },
    } as never,
  });

  if (!staff) {
    return errorResponse(
      `${data.staff_type === "teacher" ? "Teacher" : "Employee"} not found in current tenant`,
      404,
    );
  }

  if (staff.status !== "active") {
    return errorResponse(
      `Cannot pay salary: staff status is '${staff.status}' (must be 'active').`,
      409,
    );
  }

  // --- 2. Validate the credit account (Cash/Bank) ---
  const creditAccount = await db.account.findFirst({
    where: {
      id: data.account_id,
      ...tenantWhere(ctx),
      deleted_at: null,
    },
    select: { id: true, code: true, name: true, type: true, balance: true, fund: true },
  });
  if (!creditAccount) {
    return errorResponse("Account not found in current tenant", 404);
  }
  if (creditAccount.type !== "asset") {
    return errorResponse(
      "The payment account must be an asset account (Cash or Bank). " +
      `Selected account '${creditAccount.name}' is type '${creditAccount.type}'.`,
      400,
    );
  }

  // --- 3. Find the Salary Expense account (debit side) ---
  // Priority: (a) expense account whose name contains "salary"
  //           (b) expense account with code "5000" (Operating Expenses)
  //           (c) any expense account
  //           (d) error — user must create an expense account first
  let salaryExpenseAccount = await db.account.findFirst({
    where: {
      ...tenantWhere(ctx),
      type: "expense",
      deleted_at: null,
      OR: [
        { name: { contains: "salary", mode: "insensitive" } },
        { name_bn: { contains: "বেতন", mode: "insensitive" } },
      ],
    },
    select: { id: true, code: true, name: true },
  });

  if (!salaryExpenseAccount) {
    salaryExpenseAccount = await db.account.findFirst({
      where: {
        ...tenantWhere(ctx),
        code: "5000",
        type: "expense",
        deleted_at: null,
      },
      select: { id: true, code: true, name: true },
    });
  }

  if (!salaryExpenseAccount) {
    salaryExpenseAccount = await db.account.findFirst({
      where: {
        ...tenantWhere(ctx),
        type: "expense",
        deleted_at: null,
      },
      select: { id: true, code: true, name: true },
    });
  }

  if (!salaryExpenseAccount) {
    return errorResponse(
      "No Salary Expense account found. Please create an expense account " +
      "(e.g. 'Salary Expense' or 'Operating Expenses') on the Accounting page first.",
      422,
      {
        hint: "Go to /accounting → Add Account → Type: Expense.",
      },
    );
  }

  // --- 4. Check for duplicate payslip (one per staff per month/year) ---
  const existingPayslip = await db.payrollRecord.findFirst({
    where: {
      organization_id: ctx.organization_id,
      staff_type: data.staff_type,
      staff_id: data.staff_id,
      month: data.month,
      year: data.year,
      deleted_at: null,
    },
    select: { id: true, payslip_no: true },
  });
  if (existingPayslip) {
    return errorResponse(
      `Salary already paid for ${staff.user.name} for ${MONTH_NAMES[data.month - 1]} ${data.year} ` +
      `(payslip ${existingPayslip.payslip_no}).`,
      409,
      { existing_payslip_id: existingPayslip.id },
    );
  }

  // --- 5. Generate payslip_no (PAY-YYYY-NNNN) + voucher_no (JV-YYYY-NNN) ---
  const year = data.year;
  const lastPayslip = await db.payrollRecord.findFirst({
    where: {
      organization_id: ctx.organization_id,
      payslip_no: { startsWith: `PAY-${year}-` },
    },
    orderBy: { payslip_no: "desc" },
    select: { payslip_no: true },
  });
  const payslipSeq = lastPayslip
    ? parseInt(lastPayslip.payslip_no.split("-").pop() || "0", 10) + 1
    : 1;
  const payslipNo = `PAY-${year}-${payslipSeq.toString().padStart(4, "0")}`;

  const lastLedger = await db.ledgerEntry.findFirst({
    where: {
      organization_id: ctx.organization_id,
      voucher_no: { startsWith: `JV-${year}-` },
    },
    orderBy: { voucher_no: "desc" },
    select: { voucher_no: true },
  });
  const ledgerSeq = lastLedger
    ? parseInt(lastLedger.voucher_no.split("-").pop() || "0", 10) + 1
    : 1;
  const voucherNo = `JV-${year}-${ledgerSeq.toString().padStart(3, "0")}`;

  const grossSalary = data.amount + data.deductions;
  const netSalary = data.amount;
  const paymentDate = data.payment_date ? new Date(data.payment_date) : new Date();

  const monthLabel = `${MONTH_NAMES[data.month - 1]} ${data.year}`;

  // --- 6. Golden Flow: create payslip + ledger entry + update balances ---
  const result = await db.$transaction(async (tx) => {
    // 6a. Create the LedgerEntry (debit Salary Expense, credit Cash/Bank)
    const ledgerEntry = await tx.ledgerEntry.create({
      data: {
        organization_id: ctx.organization_id,
        branch_id: staff.branch_id ?? ctx.branch_id ?? null,
        voucher_no: voucherNo,
        date: paymentDate,
        narration: `Salary payment — ${staff.user.name} — ${monthLabel} — Payslip ${payslipNo}`,
        debit_account_id: salaryExpenseAccount!.id,
        credit_account_id: data.account_id,
        amount: netSalary,
        status: "posted",
        posted_by: ctx.user_id,
        fund: creditAccount.fund ?? "general",
        source_type: "salary",
        created_by: ctx.user_id,
      } as never,
    });

    // 6b. Create the PayrollRecord (payslip)
    const payslip = await tx.payrollRecord.create({
      data: {
        organization_id: ctx.organization_id,
        branch_id: staff.branch_id ?? ctx.branch_id ?? null,
        payslip_no: payslipNo,
        staff_type: data.staff_type,
        staff_id: data.staff_id,
        user_id: staff.user_id,
        month: data.month,
        year: data.year,
        gross_salary: grossSalary,
        deductions: data.deductions,
        net_salary: netSalary,
        payment_date: paymentDate,
        account_id: data.account_id,
        ledger_entry_id: ledgerEntry.id,
        status: "paid",
        notes: data.notes ?? null,
        created_by: ctx.user_id,
      } as never,
    });

    // 6c. Update account balances:
    //   - Credit account (Cash/Bank): an asset, decreases on credit.
    //     For simplicity we decrement the stored balance (assets carry
    //     a positive balance; paying out reduces it).
    //   - Debit account (Salary Expense): an expense, increases on debit.
    //     We increment the stored balance (expenses accumulate).
    await tx.account.update({
      where: { id: data.account_id },
      data: { balance: { decrement: netSalary } } as never,
    });
    await tx.account.update({
      where: { id: salaryExpenseAccount!.id },
      data: { balance: { increment: netSalary } } as never,
    });

    return { payslip, ledgerEntry };
  });

  // 7. Write audit log (best-effort, non-blocking)
  try {
    await db.auditLog.create({
      data: {
        organization_id: ctx.organization_id,
        actor_user_id: ctx.user_id,
        action: "payroll.pay",
        entity_type: "payroll_record",
        entity_id: result.payslip.id,
        metadata: {
          payslip_no: payslipNo,
          staff_name: staff.user.name,
          staff_type: data.staff_type,
          month: data.month,
          year: data.year,
          net_salary: netSalary,
          account: creditAccount.name,
        },
      } as never,
    });
  } catch {
    // Non-fatal — audit log failure shouldn't roll back the payment.
  }

  return successResponse(
    {
      id: result.payslip.id,
      payslip_no: payslipNo,
      staff_name: staff.user.name,
      staff_type: data.staff_type,
      month: data.month,
      year: data.year,
      gross_salary: grossSalary,
      deductions: data.deductions,
      net_salary: netSalary,
      payment_date: paymentDate,
      account: {
        id: creditAccount.id,
        name: creditAccount.name,
        code: creditAccount.code,
      },
      salary_expense_account: {
        id: salaryExpenseAccount.id,
        name: salaryExpenseAccount.name,
        code: salaryExpenseAccount.code,
      },
      ledger_entry_id: result.ledgerEntry.id,
      voucher_no: voucherNo,
    },
    `Salary paid — ${staff.user.name} — ${monthLabel} — ৳${netSalary.toLocaleString()} (Payslip ${payslipNo})`,
  );
});

/** GET /api/v1/payroll — list payslips */
export const GET = withPermission("accounting.ledger.view", async (req: Request) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);

  const staffType = url.searchParams.get("staff_type");
  const month = url.searchParams.get("month") ? parseInt(url.searchParams.get("month")!, 10) : undefined;
  const year = url.searchParams.get("year") ? parseInt(url.searchParams.get("year")!, 10) : undefined;

  const where = {
    organization_id: ctx.organization_id,
    ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}),
    deleted_at: null,
    ...(staffType ? { staff_type: staffType } : {}),
    ...(month ? { month } : {}),
    ...(year ? { year } : {}),
  };

  const [total, payslips] = await Promise.all([
    db.payrollRecord.count({ where }),
    db.payrollRecord.findMany({
      where,
      orderBy: [{ year: "desc" }, { month: "desc" }, { created_at: "desc" }],
      skip,
      take,
      include: {
        user: { select: { id: true, name: true, name_bn: true, email: true } },
      },
    }),
  ]);

  const data = payslips.map((p) => ({
    id: p.id,
    payslip_no: p.payslip_no,
    staff_type: p.staff_type,
    staff_id: p.staff_id,
    user_id: p.user_id,
    staff_name: p.user.name,
    staff_name_bn: p.user.name_bn,
    month: p.month,
    year: p.year,
    gross_salary: Number(p.gross_salary),
    deductions: Number(p.deductions),
    net_salary: Number(p.net_salary),
    payment_date: p.payment_date,
    account_id: p.account_id,
    ledger_entry_id: p.ledger_entry_id,
    status: p.status,
    notes: p.notes,
    created_at: p.created_at,
  }));

  return paginatedResponse(data, total, page, pageSize);
});
