/**
 * MadrashaOS — Outstanding Fees Report API
 *
 * Phase B6.1 — Fees API
 *
 * GET /api/v1/fees/outstanding — outstanding fees report
 *   Permission: fees.view
 *   Risk R12: returns "as of [timestamp]" with each figure
 *   Returns: total outstanding amount + per-student breakdown with
 *   overdue/pending installments
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { jsonResponse, errorResponse, parsePagination } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/** GET /api/v1/fees/outstanding — outstanding fees report (Risk R12) */
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const classId = url.searchParams.get("class_id");
  const academicYear = url.searchParams.get("academic_year")
    ? parseInt(url.searchParams.get("academic_year")!, 10)
    : new Date().getFullYear();

  // Find all unpaid/partial installments
  const where = {
    organization_id: ctx.organization_id,
    ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}),
    deleted_at: null,
    is_paid: false,
    status: { in: ["unpaid", "partial", "overdue"] },
  };

  // Get installments with student info
  const [installments, total] = await Promise.all([
    db.feeInstallment.findMany({
      where,
      orderBy: { due_date: "asc" },
      skip,
      take,
      include: {
        student: {
          select: {
            id: true, name: true, name_bn: true, code: true, roll: true,
            class: { select: { id: true, name: true, name_bn: true } },
            section: { select: { name: true } },
          },
        },
      },
    }),
    db.feeInstallment.count({ where }),
  ]);

  // Filter by class_id if provided
  const filtered = classId
    ? installments.filter((i) => i.student.class.id === classId)
    : installments;

  // Group by student
  const studentMap = new Map<string, {
    student_id: string;
    student_name: string;
    student_name_bn: string;
    student_code: string;
    roll: number;
    class_name: string;
    section_name: string | null;
    installments: Array<{
      id: string;
      label: string;
      amount: number;
      amount_paid: number;
      outstanding: number;
      due_date: string;
      status: string;
    }>;
    total_outstanding: number;
    overdue_count: number;
  }>();

  let grandTotalOutstanding = 0;

  for (const inst of filtered) {
    const studentId = inst.student_id;
    if (!studentMap.has(studentId)) {
      studentMap.set(studentId, {
        student_id: studentId,
        student_name: inst.student.name,
        student_name_bn: inst.student.name_bn,
        student_code: inst.student.code,
        roll: inst.student.roll,
        class_name: inst.student.class.name,
        section_name: inst.student.section?.name ?? null,
        installments: [],
        total_outstanding: 0,
        overdue_count: 0,
      });
    }
    const entry = studentMap.get(studentId)!;
    const outstanding = Number(inst.amount) - Number(inst.amount_paid);
    const isOverdue = new Date(inst.due_date) < new Date() && !inst.is_paid;
    entry.installments.push({
      id: inst.id,
      label: inst.label,
      amount: Number(inst.amount),
      amount_paid: Number(inst.amount_paid),
      outstanding,
      due_date: inst.due_date.toISOString().split("T")[0],
      status: isOverdue ? "overdue" : inst.status,
    });
    entry.total_outstanding += outstanding;
    entry.overdue_count += isOverdue ? 1 : 0;
    grandTotalOutstanding += outstanding;
  }

  const studentList = Array.from(studentMap.values()).sort(
    (a, b) => b.total_outstanding - a.total_outstanding,
  );

  // Paginate the student list
  const paginatedStudents = studentList.slice(skip, skip + take);

  return jsonResponse({
    as_of: new Date().toISOString(),
    academic_year: academicYear,
    summary: {
      total_students_with_outstanding: studentList.length,
      total_installments_outstanding: filtered.length,
      total_amount_outstanding: Math.round(grandTotalOutstanding * 100) / 100,
      total_overdue_installments: studentList.reduce((sum, s) => sum + s.overdue_count, 0),
    },
    data: paginatedStudents,
    pagination: {
      page,
      pageSize,
      total: studentList.length,
      totalPages: Math.ceil(studentList.length / pageSize),
    },
  });
}
