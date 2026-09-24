/**
 * MadrashaOS — Inventory Sale to Student API
 *
 * POST /api/v1/inventory/sell
 *   Sells an inventory item to a student. Two payment modes:
 *     - 'cash'   : paid immediately → posts a LedgerEntry (debit Cash/Bank,
 *                  credit Sale Income) + decrements stock
 *     - 'credit' : added to student's outstanding fees → creates a
 *                  FeeInstallment row (label: "Sale: {item name}")
 *                  + decrements stock + posts a LedgerEntry (debit Accounts
 *                  Receivable, credit Sale Income)
 *
 *   Permission: inventory.sale
 *
 *   Body:
 *     student_id  — UUID
 *     item_id     — UUID
 *     qty         — number > 0
 *     unit_price  — number > 0 (defaults to item.unit_cost if omitted)
 *     payment_mode — 'cash' | 'credit'
 *     account_id  — UUID (required for cash mode — Cash/Bank account)
 *     notes?      — string
 *
 * GET /api/v1/inventory/sales
 *   Lists sales records. Filterable by student_id, item_id, payment_mode.
 *   Permission: inventory.view
 */

import { db } from "@/lib/db";
import { getTenantContext, tenantWhere } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import {
  errorResponse, successResponse,
  paginatedResponse, parsePagination,
} from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const sellSchema = z.object({
  student_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  item_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  qty: z.number().min(0.01),
  unit_price: z.number().min(0).optional(),
  payment_mode: z.enum(["cash", "credit"]),
  account_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).optional(),
  notes: z.string().max(500).optional(),
});

/** POST /api/v1/inventory/sell — sell item to student */
export const POST = withPermission("inventory.sale", async (req: Request) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const parsed = sellSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parsed.error.flatten());
  }

  const data = parsed.data;

  // --- Validate cash mode requires an account ---
  if (data.payment_mode === "cash" && !data.account_id) {
    return errorResponse(
      "A Cash/Bank account is required when payment_mode is 'cash'.",
      400,
    );
  }

  // --- 1. Validate the item ---
  const item = await db.inventoryItem.findFirst({
    where: {
      id: data.item_id,
      ...tenantWhere(ctx),
      deleted_at: null,
      is_active: true,
    },
    select: {
      id: true, name: true, code: true, qty_in_stock: true,
      unit_cost: true, unit: true, category: true,
    },
  });
  if (!item) {
    return errorResponse("Item not found or inactive", 404);
  }

  const currentStock = Number(item.qty_in_stock);
  if (data.qty > currentStock) {
    return errorResponse(
      `Sale exceeds stock. Available: ${currentStock} ${item.unit}, Requested: ${data.qty} ${item.unit}`,
      400,
      { available: currentStock, requested: data.qty, unit: item.unit },
    );
  }

  // --- 2. Validate the student ---
  const student = await db.student.findFirst({
    where: {
      id: data.student_id,
      ...tenantWhere(ctx),
      deleted_at: null,
    },
    select: {
      id: true, name: true, code: true, branch_id: true,
      class_id: true, section_id: true,
    },
  });
  if (!student) {
    return errorResponse("Student not found in current tenant", 404);
  }

  // --- 3. Resolve unit price (default to item.unit_cost) ---
  const unitPrice = data.unit_price ?? Number(item.unit_cost);
  if (unitPrice <= 0) {
    return errorResponse(
      "Unit price must be greater than 0. The item has no unit_cost set — provide unit_price in the request.",
      400,
    );
  }
  const totalAmount = unitPrice * data.qty;

  // --- 4. Validate the account (cash mode) ---
  let creditAccount: { id: string; code: string; name: string; type: string; balance: { toString(): string } } | null = null;
  if (data.payment_mode === "cash" && data.account_id) {
    creditAccount = await db.account.findFirst({
      where: {
        id: data.account_id,
        ...tenantWhere(ctx),
        deleted_at: null,
      },
      select: { id: true, code: true, name: true, type: true, balance: true },
    });
    if (!creditAccount) {
      return errorResponse("Payment account not found in current tenant", 404);
    }
  }

  // --- 5. Find a Sale Income account (credit side for the ledger entry) ---
  // Priority: (a) income account whose name contains "sale"
  //           (b) income account with code "4001"
  //           (c) any income account
  let saleIncomeAccount = await db.account.findFirst({
    where: {
      ...tenantWhere(ctx),
      type: "income",
      deleted_at: null,
      OR: [
        { name: { contains: "sale", mode: "insensitive" } },
        { name_bn: { contains: "বিক্রয়", mode: "insensitive" } },
      ],
    },
    select: { id: true, code: true, name: true },
  });

  if (!saleIncomeAccount) {
    saleIncomeAccount = await db.account.findFirst({
      where: {
        ...tenantWhere(ctx),
        code: "4001",
        type: "income",
        deleted_at: null,
      },
      select: { id: true, code: true, name: true },
    });
  }
  if (!saleIncomeAccount) {
    saleIncomeAccount = await db.account.findFirst({
      where: {
        ...tenantWhere(ctx),
        type: "income",
        deleted_at: null,
      },
      select: { id: true, code: true, name: true },
    });
  }
  if (!saleIncomeAccount) {
    return errorResponse(
      "No income account found. Please create an income account (e.g. 'Sale Income') on the Accounting page first.",
      422,
      { hint: "Go to /accounting → Add Account → Type: Income." },
    );
  }

  // --- 6. For credit mode: find the student's active fee plan ---
  let feePlan: { id: string } | null = null;
  if (data.payment_mode === "credit") {
    const academicYear = new Date().getFullYear();
    feePlan = await db.feePlan.findFirst({
      where: {
        student_id: student.id,
        organization_id: ctx.organization_id,
        academic_year: academicYear,
        deleted_at: null,
        status: "active",
      },
      select: { id: true },
      orderBy: { created_at: "desc" },
    });
  }

  // --- 7. Generate sale_no + voucher_no ---
  const year = new Date().getFullYear();
  const lastSale = await db.inventorySale.findFirst({
    where: {
      organization_id: ctx.organization_id,
      sale_no: { startsWith: `SALE-${year}-` },
    },
    orderBy: { sale_no: "desc" },
    select: { sale_no: true },
  });
  const saleSeq = lastSale
    ? parseInt(lastSale.sale_no.split("-").pop() || "0", 10) + 1
    : 1;
  const saleNo = `SALE-${year}-${saleSeq.toString().padStart(4, "0")}`;

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

  // --- 8. Golden Flow: create sale + ledger + (optional) installment + decrement stock ---
  const result = await db.$transaction(async (tx) => {
    // 8a. Resolve the debit account
    //   Cash mode:   debit Cash/Bank
    //   Credit mode: debit Accounts Receivable (or fall back to first asset)
    let debitAccountId: string;
    if (data.payment_mode === "cash" && creditAccount) {
      debitAccountId = creditAccount.id;
    } else {
      let arAccount = await tx.account.findFirst({
        where: {
          ...tenantWhere(ctx),
          type: "asset",
          deleted_at: null,
          OR: [
            { name: { contains: "receivable", mode: "insensitive" } },
            { name: { contains: "due", mode: "insensitive" } },
          ],
        },
        select: { id: true },
      });
      if (!arAccount) {
        arAccount = await tx.account.findFirst({
          where: {
            ...tenantWhere(ctx),
            type: "asset",
            deleted_at: null,
          },
          select: { id: true },
        });
      }
      if (!arAccount) {
        throw new Error("No asset account found for credit sale debit side.");
      }
      debitAccountId = arAccount.id;
    }

    // 8b. Create the LedgerEntry
    const ledgerEntry = await tx.ledgerEntry.create({
      data: {
        organization_id: ctx.organization_id,
        branch_id: student.branch_id ?? ctx.branch_id ?? null,
        voucher_no: voucherNo,
        date: new Date(),
        narration: `Inventory sale — ${item.name} × ${data.qty} → ${student.name} (${student.code}) — ${saleNo}`,
        debit_account_id: debitAccountId,
        credit_account_id: saleIncomeAccount!.id,
        amount: totalAmount,
        status: "posted",
        posted_by: ctx.user_id,
        fund: "general",
        source_type: "inventory_sale",
        created_by: ctx.user_id,
      } as never,
    });

    // 8c. For credit mode: create a FeeInstallment so the sale rides
    //     the student's fee stream
    let feeInstallmentId: string | null = null;
    if (data.payment_mode === "credit" && feePlan) {
      const installment = await tx.feeInstallment.create({
        data: {
          organization_id: ctx.organization_id,
          branch_id: student.branch_id ?? ctx.branch_id ?? null,
          fee_plan_id: feePlan.id,
          student_id: student.id,
          label: `Sale: ${item.name} × ${data.qty}`,
          amount: totalAmount,
          due_date: new Date(year, new Date().getMonth() + 1, 15),
          status: "unpaid",
          created_by: ctx.user_id,
        } as never,
      });
      feeInstallmentId = installment.id;
    }

    // 8d. Create the InventorySale record
    const sale = await tx.inventorySale.create({
      data: {
        organization_id: ctx.organization_id,
        branch_id: student.branch_id ?? ctx.branch_id ?? null,
        sale_no: saleNo,
        student_id: student.id,
        item_id: item.id,
        qty: data.qty,
        unit_price: unitPrice,
        total_amount: totalAmount,
        payment_mode: data.payment_mode,
        account_id: data.payment_mode === "cash" ? data.account_id ?? null : null,
        fee_installment_id: feeInstallmentId,
        ledger_entry_id: ledgerEntry.id,
        status: "completed",
        notes: data.notes ?? null,
        created_by: ctx.user_id,
      } as never,
    });

    // 8e. Decrement the item's stock
    await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        qty_in_stock: { decrement: data.qty },
        updated_by: ctx.user_id,
      } as never,
    });

    // 8f. Update account balances
    if (data.payment_mode === "cash" && creditAccount) {
      await tx.account.update({
        where: { id: creditAccount.id },
        data: { balance: { increment: totalAmount } } as never,
      });
    }
    await tx.account.update({
      where: { id: saleIncomeAccount!.id },
      data: { balance: { increment: totalAmount } } as never,
    });

    return { sale, ledgerEntry, feeInstallmentId };
  });

  // 9. Audit log (best-effort)
  try {
    await db.auditLog.create({
      data: {
        organization_id: ctx.organization_id,
        actor_user_id: ctx.user_id,
        action: "inventory.sell",
        entity_type: "inventory_sale",
        entity_id: result.sale.id,
        metadata: {
          sale_no: saleNo,
          student: student.name,
          item: item.name,
          qty: data.qty,
          total: totalAmount,
          payment_mode: data.payment_mode,
        },
      } as never,
    });
  } catch {
    // Non-fatal
  }

  return successResponse(
    {
      id: result.sale.id,
      sale_no: saleNo,
      student: { id: student.id, name: student.name, code: student.code },
      item: { id: item.id, name: item.name, code: item.code },
      qty: data.qty,
      unit_price: unitPrice,
      total_amount: totalAmount,
      payment_mode: data.payment_mode,
      account: creditAccount
        ? { id: creditAccount.id, name: creditAccount.name, code: creditAccount.code }
        : null,
      fee_installment_id: result.feeInstallmentId,
      ledger_entry_id: result.ledgerEntry.id,
      voucher_no: voucherNo,
    },
    data.payment_mode === "credit"
      ? `Sale recorded — ${item.name} × ${data.qty} → ${student.name} · ৳${totalAmount.toLocaleString()} added to fees (${saleNo})`
      : `Sale recorded — ${item.name} × ${data.qty} → ${student.name} · ৳${totalAmount.toLocaleString()} cash (${saleNo})`,
  );
});

/** GET /api/v1/inventory/sales — list sales */
export const GET = withPermission("inventory.view", async (req: Request) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);

  const studentId = url.searchParams.get("student_id");
  const itemId = url.searchParams.get("item_id");
  const paymentMode = url.searchParams.get("payment_mode");

  const where = {
    organization_id: ctx.organization_id,
    ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}),
    deleted_at: null,
    ...(studentId ? { student_id: studentId } : {}),
    ...(itemId ? { item_id: itemId } : {}),
    ...(paymentMode ? { payment_mode: paymentMode } : {}),
  };

  const [total, sales] = await Promise.all([
    db.inventorySale.count({ where }),
    db.inventorySale.findMany({
      where,
      orderBy: { sold_at: "desc" },
      skip,
      take,
      include: {
        student: { select: { id: true, name: true, code: true } },
        item: { select: { id: true, name: true, code: true } },
      },
    }),
  ]);

  const data = sales.map((s) => ({
    id: s.id,
    sale_no: s.sale_no,
    student_id: s.student_id,
    student_name: s.student.name,
    student_code: s.student.code,
    item_id: s.item_id,
    item_name: s.item.name,
    item_code: s.item.code,
    qty: Number(s.qty),
    unit_price: Number(s.unit_price),
    total_amount: Number(s.total_amount),
    payment_mode: s.payment_mode,
    account_id: s.account_id,
    fee_installment_id: s.fee_installment_id,
    ledger_entry_id: s.ledger_entry_id,
    status: s.status,
    notes: s.notes,
    sold_at: s.sold_at,
  }));

  return paginatedResponse(data, total, page, pageSize);
});
