/**
 * MadrashaOS — Bulk Fee Plan API (Class-wise)
 *
 * POST /api/v1/fees/plans/bulk
 *   Creates fee plans for ALL students in a given class for an academic
 *   year. This is the typical madrasha workflow: the fee structure
 *   (monthly tuition + hostel + bus + others) is the same for every
 *   student in a class, so admins set it once and apply it class-wide.
 *
 *   Permission: fees.plan.edit
 *
 *   Body:
 *     class_id       — UUID of the class
 *     academic_year  — e.g. 2026
 *     monthly_tuition — BDT per month (tuition fee, required)
 *     hostel_fee     — BDT per month (optional, default 0)
 *     bus_fee        — BDT per month (optional, default 0)
 *     other_fee      — BDT per month (optional, default 0)
 *     other_label    — label for the "other" fee (e.g. "Exam fee")
 *     months         — number of monthly installments (1-12, default 12)
 *     start_month    — 1-12 (default 1 = January)
 *
 *   For each student in the class who does NOT already have a plan for
 *   that academic year, this creates:
 *     - 1 FeePlan row (total = monthly_total × months)
 *     - N FeeInstallment rows (one per month, labeled "January 2026",
 *       "February 2026", …), each with amount = monthly_total
 *
 *   Students who already have a plan for that year are SKIPPED (not
 *   overwritten) — per-student overrides survive a re-bulk.
 *
 *   Response:
 *     { created: N, skipped: M, total_students: T, class_name: "..." }
 */

import { db } from "@/lib/db";
import { getTenantContext, tenantWhere } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const bulkFeePlanSchema = z.object({
  class_id: z.string().uuid(),
  academic_year: z.number().int().min(2020).max(2050),
  monthly_tuition: z.number().min(0),
  hostel_fee: z.number().min(0).optional().default(0),
  bus_fee: z.number().min(0).optional().default(0),
  other_fee: z.number().min(0).optional().default(0),
  other_label: z.string().max(100).optional(),
  months: z.number().int().min(1).max(12).optional().default(12),
  start_month: z.number().int().min(1).max(12).optional().default(1),
});

export const POST = withPermission("fees.plan.edit", async (req: Request) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const parsed = bulkFeePlanSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parsed.error.flatten());
  }

  const data = parsed.data;

  // Monthly total per student = tuition + hostel + bus + others
  const monthlyTotal =
    data.monthly_tuition + data.hostel_fee + data.bus_fee + data.other_fee;

  if (monthlyTotal <= 0) {
    return errorResponse(
      "At least one fee component must be greater than 0.",
      400,
    );
  }

  // Verify the class exists in the current tenant
  const klass = await db.class.findFirst({
    where: {
      id: data.class_id,
      ...tenantWhere(ctx),
      deleted_at: null,
    },
    select: { id: true, name: true },
  });
  if (!klass) {
    return errorResponse("Class not found in current tenant", 404);
  }

  // Find all active students in this class
  const students = await db.student.findMany({
    where: {
      class_id: data.class_id,
      ...tenantWhere(ctx),
      deleted_at: null,
      status: "active",
    },
    select: { id: true, name: true, code: true, branch_id: true },
  });

  if (students.length === 0) {
    return errorResponse(
      `No active students found in ${klass.name}.`,
      404,
    );
  }

  // Find students who already have a fee plan for this academic year —
  // we skip them so re-running bulk doesn't overwrite per-student overrides.
  const existingPlans = await db.feePlan.findMany({
    where: {
      class_id: undefined, // FeePlan has no class_id; we match by student
      organization_id: ctx.organization_id,
      academic_year: data.academic_year,
      deleted_at: null,
      student_id: { in: students.map((s) => s.id) },
    },
    select: { student_id: true },
  });
  const studentsWithPlans = new Set(existingPlans.map((p) => p.student_id));

  const toCreate = students.filter((s) => !studentsWithPlans.has(s.id));

  if (toCreate.length === 0) {
    return successResponse(
      {
        created: 0,
        skipped: students.length,
        total_students: students.length,
        class_name: klass.name,
      },
      `All ${students.length} students in ${klass.name} already have fee plans for ${data.academic_year}.`,
    );
  }

  // Build installment rows (same for every student in this bulk run)
  const installments: { label: string; amount: number; due_date: Date }[] = [];
  for (let i = 0; i < data.months; i++) {
    const monthIdx = (data.start_month - 1 + i) % 12;
    const yearOffset = Math.floor((data.start_month - 1 + i) / 12);
    const monthName = MONTH_NAMES[monthIdx];
    const year = data.academic_year + yearOffset;
    installments.push({
      label: `${monthName} ${year}`,
      amount: monthlyTotal,
      due_date: new Date(year, monthIdx, 15),
    });
  }

  const totalAmount = monthlyTotal * data.months;

  // Build a human-readable notes string listing the components
  const componentParts: string[] = [];
  if (data.monthly_tuition > 0) componentParts.push(`Tuition: ৳${data.monthly_tuition}/mo`);
  if (data.hostel_fee > 0) componentParts.push(`Hostel: ৳${data.hostel_fee}/mo`);
  if (data.bus_fee > 0) componentParts.push(`Bus: ৳${data.bus_fee}/mo`);
  if (data.other_fee > 0) {
    componentParts.push(`${data.other_label ?? "Other"}: ৳${data.other_fee}/mo`);
  }
  const notes = `Monthly: ৳${monthlyTotal} × ${data.months} months. Components: ${componentParts.join(", ")}`;

  // Create all plans + installments in a transaction
  const created = await db.$transaction(async (tx) => {
    let count = 0;
    for (const student of toCreate) {
      const plan = await tx.feePlan.create({
        data: {
          organization_id: ctx.organization_id,
          branch_id: student.branch_id ?? ctx.branch_id ?? null,
          student_id: student.id,
          academic_year: data.academic_year,
          total_amount: totalAmount,
          scholarship_amount: 0,
          net_payable: totalAmount,
          installment_count: data.months,
          status: "active",
          notes,
          created_by: ctx.user_id,
        } as never,
      });

      for (const inst of installments) {
        await tx.feeInstallment.create({
          data: {
            organization_id: ctx.organization_id,
            branch_id: student.branch_id ?? ctx.branch_id ?? null,
            fee_plan_id: plan.id,
            student_id: student.id,
            label: inst.label,
            amount: inst.amount,
            due_date: inst.due_date,
            status: "unpaid",
            created_by: ctx.user_id,
          } as never,
        });
      }
      count++;
    }
    return count;
  });

  return successResponse(
    {
      created,
      skipped: studentsWithPlans.size,
      total_students: students.length,
      class_name: klass.name,
      monthly_total: monthlyTotal,
      total_per_student: totalAmount,
    },
    `Created ${created} fee plan(s) for ${klass.name} · ৳${monthlyTotal}/mo × ${data.months} months`,
  );
});
