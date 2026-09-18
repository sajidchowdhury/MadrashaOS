/**
 * MadrashaOS — Transport Fuel/Expense Log API
 *
 * Phase B7.4
 *
 * GET  /api/v1/transport/fuel — list fuel/maintenance logs (perm: transport.view)
 * POST /api/v1/transport/fuel — record fuel/maintenance expense (perm: transport.record-expense)
 *   Golden Flow: posts balanced LedgerEntry (debit Operating Expenses, credit Cash/Bank)
 *   Updates vehicle current_value if maintenance/repair
 *   Audit logged
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse, parsePagination } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const fuelLogSchema = z.object({
  vehicle_id: z.string().uuid(),
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  liters: z.number().min(0).optional(), // only for fuel type
  amount: z.number().min(0.01),
  odometer_reading: z.number().int().optional(),
  fuel_station: z.string().max(255).optional(),
  payment_method: z.enum(["cash", "bank", "mobile"]).default("cash"),
  log_type: z.enum(["fuel", "maintenance", "repair"]).default("fuel"),
  note: z.string().max(500).optional(),
  account_id: z.string().uuid(), // cash/bank account to pay from
});

/** GET /api/v1/transport/fuel */
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const vehicleId = url.searchParams.get("vehicle_id");
  const logType = url.searchParams.get("log_type");
  const dateFrom = url.searchParams.get("date_from");
  const dateTo = url.searchParams.get("date_to");

  const where = {
    organization_id: ctx.organization_id,
    ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}),
    deleted_at: null,
    ...(vehicleId ? { vehicle_id: vehicleId } : {}),
    ...(logType ? { log_type: logType } : {}),
    ...(dateFrom || dateTo
      ? { log_date: { ...(dateFrom ? { gte: new Date(dateFrom) } : {}), ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}) } }
      : {}),
  };

  const [logs, total] = await Promise.all([
    db.fuelLog.findMany({
      where,
      orderBy: { log_date: "desc" },
      skip, take,
      include: {
        vehicle: { select: { id: true, registration_no: true, type: true, model: true } },
        logger: { select: { id: true, name: true } },
      },
    }),
    db.fuelLog.count({ where }),
  ]);

  // Cost summary
  const allLogs = await db.fuelLog.findMany({ where: { ...where, deleted_at: null }, select: { amount: true, log_type: true } });
  const fuelTotal = allLogs.filter((l) => l.log_type === "fuel").reduce((s, l) => s + Number(l.amount), 0);
  const maintenanceTotal = allLogs.filter((l) => l.log_type === "maintenance" || l.log_type === "repair").reduce((s, l) => s + Number(l.amount), 0);

  return jsonResponse({
    data: logs.map((l) => ({
      id: l.id,
      vehicle: l.vehicle,
      log_date: l.log_date,
      liters: Number(l.liters),
      amount: Number(l.amount),
      odometer_reading: l.odometer_reading,
      fuel_station: l.fuel_station,
      payment_method: l.payment_method,
      log_type: l.log_type,
      logged_by: l.logger.name,
      note: l.note,
    })),
    summary: { total_logs: total, fuel_cost: fuelTotal, maintenance_cost: maintenanceTotal, grand_total: fuelTotal + maintenanceTotal },
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

/** POST /api/v1/transport/fuel — record fuel/maintenance expense (Golden Flow) */
export const POST = withPermission("transport.record-expense", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = fuelLogSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const data = parsed.data;

  // Verify vehicle exists
  const vehicle = await db.vehicle.findFirst({
    where: { id: data.vehicle_id, organization_id: ctx.organization_id, deleted_at: null },
    select: { id: true, registration_no: true, type: true, current_value: true },
  });
  if (!vehicle) return errorResponse("Vehicle not found", 404);

  // Verify source account
  const sourceAccount = await db.account.findFirst({
    where: { id: data.account_id, organization_id: ctx.organization_id, deleted_at: null, is_active: true, type: "asset" },
    select: { id: true, name: true, balance: true },
  });
  if (!sourceAccount) return errorResponse("Source account not found", 404);

  if (Number(sourceAccount.balance) < data.amount) {
    return errorResponse(`Insufficient balance. Available: ৳${Number(sourceAccount.balance)}, Required: ৳${data.amount}`, 400);
  }

  // Find expense account (code 5000)
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

  // Create fuel log + ledger entry + update balances in transaction
  await db.$transaction(async (tx) => {
    // 1. Create FuelLog
    await tx.fuelLog.create({
      data: {
        organization_id: ctx.organization_id,
        branch_id: ctx.branch_id ?? null,
        vehicle_id: data.vehicle_id,
        log_date: new Date(data.log_date),
        liters: data.liters ?? 0,
        amount: data.amount,
        odometer_reading: data.odometer_reading ?? null,
        fuel_station: data.fuel_station ?? null,
        payment_method: data.payment_method,
        log_type: data.log_type,
        logged_by: ctx.user_id,
        note: data.note ?? null,
        created_by: ctx.user_id,
      } as never,
    });

    // 2. Create balanced LedgerEntry
    await tx.ledgerEntry.create({
      data: {
        organization_id: ctx.organization_id,
        branch_id: ctx.branch_id ?? null,
        voucher_no: voucherNo,
        date: new Date(data.log_date),
        narration: data.note ?? `${data.log_type} — ${vehicle.registration_no} — ৳${data.amount}`,
        debit_account_id: expenseAccount.id,
        credit_account_id: data.account_id,
        amount: data.amount,
        fund: "general",
        status: "posted",
        posted_by: ctx.user_id,
        posted_at: new Date(),
        source_type: "transport_expense",
        created_by: ctx.user_id,
      } as never,
    });

    // 3. Update account balances
    await tx.account.update({
      where: { id: expenseAccount.id },
      data: { balance: { increment: data.amount } } as never,
    });
    await tx.account.update({
      where: { id: data.account_id },
      data: { balance: { decrement: data.amount } } as never,
    });

    // 4. Update vehicle current_value if maintenance/repair
    if (data.log_type === "maintenance" || data.log_type === "repair") {
      await tx.vehicle.update({
        where: { id: data.vehicle_id },
        data: { current_value: { increment: data.amount }, updated_by: ctx.user_id } as never,
      });
    }
  });

  await db.auditLog.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      entity_type: "fuel_logs",
      entity_id: data.vehicle_id,
      action: data.log_type,
      old_values: null,
      new_values: { vehicle: vehicle.registration_no, amount: data.amount, log_type: data.log_type, voucher: voucherNo },
      actor_id: ctx.user_id,
    } as never,
  });

  return successResponse(
    { vehicle: vehicle.registration_no, amount: data.amount, log_type: data.log_type, voucher_no: voucherNo, source_account: sourceAccount.name },
    `${data.log_type === "fuel" ? "Fuel" : data.log_type} expense recorded — ৳${data.amount} for ${vehicle.registration_no}. Ledger posted (${voucherNo}). Vehicle cost + expense account updated.`,
  );
});
