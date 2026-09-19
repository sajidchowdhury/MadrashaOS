/**
 * MadrashaOS — Scholarships API
 *
 * Phase B6.2 — Scholarship & Discount API
 *
 * GET  /api/v1/scholarships — list scholarships (perm: scholarship.view)
 * POST /api/v1/scholarships — create scholarship/discount (perm: scholarship.view)
 *
 * Risk R8 lock-in:
 *   - Above-threshold discounts auto-route to approval queue (status: "pending")
 *   - Below-threshold discounts auto-approve (status: "active")
 *   - Threshold: percentage >= 50% OR amount_per_year >= 10000 → pending
 *   - Pending scholarships shown as striped/greyed rows with status chip (frontend)
 *   - Active scholarships shown as solid rows (frontend)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse, parsePagination } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Risk R8: threshold for auto-approval routing
const DISCOUNT_THRESHOLD_PERCENTAGE = 50;
const DISCOUNT_THRESHOLD_AMOUNT = 10000;

const createScholarshipSchema = z.object({
  student_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  name: z.string().min(1).max(255),
  type: z.enum(["full", "partial"]).default("partial"),
  percentage: z.number().min(0).max(100).optional(),
  amount_per_year: z.number().min(0).optional(),
  fund_source: z.enum(["general", "zakat", "donation"]).default("general"),
  academic_year: z.number().int().optional(),
  note: z.string().optional(),
  expires_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** GET /api/v1/scholarships — list scholarships */
export const GET = withPermission("scholarship.view", async (req: Request) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const studentId = url.searchParams.get("student_id");
  const status = url.searchParams.get("status");
  const fundSource = url.searchParams.get("fund_source");
  const academicYear = url.searchParams.get("academic_year")
    ? parseInt(url.searchParams.get("academic_year")!, 10)
    : undefined;

  const where = {
    organization_id: ctx.organization_id,
    ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}),
    deleted_at: null,
    ...(studentId ? { student_id } : {}),
    ...(status ? { status } : {}),
    ...(fundSource ? { fund_source: fundSource } : {}),
    ...(academicYear ? { academic_year: academicYear } : {}),
  };

  const [scholarships, total] = await Promise.all([
    db.scholarship.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take,
      include: {
        student: { select: { id: true, name: true, name_bn: true, code: true, roll: true } },
        approver: { select: { id: true, name: true } },
      },
    }),
    db.scholarship.count({ where }),
  ]);

  return jsonResponse({
    data: scholarships.map((s) => ({
      id: s.id,
      student_id: s.student_id,
      student_name: s.student.name,
      student_name_bn: s.student.name_bn,
      student_code: s.student.code,
      roll: s.student.roll,
      name: s.name,
      type: s.type,
      percentage: Number(s.percentage),
      amount_per_year: Number(s.amount_per_year),
      fund_source: s.fund_source,
      academic_year: s.academic_year,
      status: s.status,
      approved_by: s.approver?.name ?? null,
      approved_at: s.approved_at,
      note: s.note,
      expires_at: s.expires_at,
      // Risk R8: flag for frontend rendering (pending = striped/greyed)
      is_pending: s.status === "pending",
      needs_approval: s.status === "pending",
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
});

/** POST /api/v1/scholarships — create scholarship (Risk R8: auto-route to approval) */
export const POST = withPermission("scholarship.view", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = createScholarshipSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const data = parsed.data;
  const academicYear = data.academic_year ?? new Date().getFullYear();

  // Verify student exists
  const student = await db.student.findFirst({
    where: { id: data.student_id, organization_id: ctx.organization_id, deleted_at: null },
    select: { id: true, branch_id: true, code: true, name: true },
  });
  if (!student) return errorResponse("Student not found", 404);

  // Calculate values
  const percentage = data.percentage ?? 0;
  const amountPerYear = data.amount_per_year ?? 0;

  // Risk R8: check if discount exceeds threshold → route to approval queue
  const exceedsThreshold =
    percentage >= DISCOUNT_THRESHOLD_PERCENTAGE ||
    amountPerYear >= DISCOUNT_THRESHOLD_AMOUNT;

  const initialStatus = exceedsThreshold ? "pending" : "active";

  // If type is "full", set percentage to 100
  const finalPercentage = data.type === "full" ? 100 : percentage;

  const scholarship = await db.scholarship.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: student.branch_id ?? ctx.branch_id ?? null,
      student_id: data.student_id,
      name: data.name,
      type: data.type,
      percentage: finalPercentage,
      amount_per_year: amountPerYear,
      fund_source: data.fund_source,
      academic_year: academicYear,
      status: initialStatus,
      note: data.note ?? null,
      expires_at: data.expires_at ? new Date(data.expires_at) : null,
      // Auto-approve if below threshold (no approval needed)
      approved_by: exceedsThreshold ? null : ctx.user_id,
      approved_at: exceedsThreshold ? null : new Date(),
      created_by: ctx.user_id,
    } as never,
  });

  // If auto-approved (below threshold), update the fee plan's scholarship_amount
  if (!exceedsThreshold) {
    const feePlan = await db.feePlan.findFirst({
      where: { student_id: data.student_id, academic_year: academicYear, deleted_at: null },
    });
    if (feePlan) {
      const newScholarshipAmount = Number(feePlan.scholarship_amount) + amountPerYear;
      const newNetPayable = Number(feePlan.total_amount) - newScholarshipAmount;
      await db.feePlan.update({
        where: { id: feePlan.id },
        data: {
          scholarship_amount: newScholarshipAmount,
          net_payable: Math.max(0, newNetPayable),
          updated_by: ctx.user_id,
        } as never,
      });
    }
  }

  // Audit log
  await db.auditLog.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: student.branch_id ?? ctx.branch_id ?? null,
      entity_type: "scholarships",
      entity_id: scholarship.id,
      action: "create",
      old_values: null,
      new_values: {
        student_id: data.student_id,
        student_code: student.code,
        type: data.type,
        percentage: finalPercentage,
        amount_per_year: amountPerYear,
        status: initialStatus,
        routed_to_approval: exceedsThreshold,
      },
      actor_user_id: ctx.user_id,
    } as never,
  });

  return jsonResponse(
    {
      id: scholarship.id,
      student_id: data.student_id,
      student_code: student.code,
      name: data.name,
      type: data.type,
      percentage: finalPercentage,
      amount_per_year: amountPerYear,
      fund_source: data.fund_source,
      status: initialStatus,
      message: exceedsThreshold
        ? `Scholarship created — routed to approval queue (percentage ${finalPercentage}% ≥ ${DISCOUNT_THRESHOLD_PERCENTAGE}% threshold).`
        : `Scholarship created and auto-approved (${finalPercentage}% < ${DISCOUNT_THRESHOLD_PERCENTAGE}% threshold). Fee plan updated.`,
    },
    201,
  );
});
