/**
 * MadrashaOS — Single Student API
 *
 * Task B4.1 — Student API (CRUD + promotion + history)
 *
 * GET    /api/v1/students/:id
 *   Full profile: student row + class + section + all guardians
 *   (with relation/primary flag) + fee-plan summary (total / paid /
 *   balance per academic_year).
 *   Permission: students.view
 *
 * PATCH  /api/v1/students/:id
 *   Partial update of mutable profile fields. `code` is NOT editable
 *   (see updateStudentSchema docblock). Status transitions go through
 *   this endpoint too, but the soft-delete (status="withdrawn" +
 *   deleted_at) is the dedicated DELETE flow below.
 *   Permission: students.update
 *
 * DELETE /api/v1/students/:id
 *   Soft delete — sets status="withdrawn" + deleted_at = now().
 *   The student row is preserved (audit trail, historical fee records,
 *   marks, attendance). Hard delete is reserved for the future super-
 *   admin "GDPR purge" tooling (out of scope for B4.1).
 *   Permission: students.update
 */

import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { getTenantContext, tenantWhere } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { updateStudentSchema } from "@/lib/validation/schemas";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/** Shape of the `where` clause used to scope a single student to the tenant. */
function scopedWhere(ctx: Parameters<typeof tenantWhere>[0], id: string) {
  return { id, ...tenantWhere(ctx), deleted_at: null };
}

/** GET /api/v1/students/:id — full student profile. */
export const GET = withPermission(
  "students.view",
  async (_req, { params }) => {
    const ctx = await getTenantContext();
    if (!ctx) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await params;

    const student = await db.student.findFirst({
      where: scopedWhere(ctx, id),
      include: {
        class: { select: { id: true, name: true, name_bn: true, level: true, stream: true } },
        section: { select: { id: true, name: true } },
        student_guardians: {
          where: { deleted_at: null },
          orderBy: [{ is_primary: "desc" }, { created_at: "asc" }],
          select: {
            id: true,
            relation: true,
            is_primary: true,
            can_pickup: true,
            guardian: {
              select: {
                id: true,
                name: true,
                name_bn: true,
                phone: true,
                email: true,
                occupation: true,
              },
            },
          },
        },
        fee_plans: {
          where: { deleted_at: null },
          orderBy: { academic_year: "desc" },
          select: {
            id: true,
            academic_year: true,
            total_amount: true,
            scholarship_amount: true,
            net_payable: true,
            installment_count: true,
            status: true,
            fee_installments: {
              where: { deleted_at: null },
              select: {
                amount: true,
                amount_paid: true,
                penalty: true,
                discount: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!student) {
      return errorResponse("Student not found", 404);
    }

    // Aggregate fee_plan summary: total billed, total paid, balance.
    // `fee_plans[].fee_installments[]` is the granular breakdown —
    // we sum across all of them per academic_year for the dashboard card.
    const fee_plans = student.fee_plans.map((fp) => {
      const totalBilled = fp.fee_installments.reduce(
        (sum, i) => sum.add(i.amount).add(i.penalty).sub(i.discount),
        new Prisma.Decimal(0),
      );
      const totalPaid = fp.fee_installments.reduce(
        (sum, i) => sum.add(i.amount_paid),
        new Prisma.Decimal(0),
      );
      const balance = totalBilled.sub(totalPaid);
      return {
        id: fp.id,
        academic_year: fp.academic_year,
        total_amount: fp.total_amount.toString(),
        scholarship_amount: fp.scholarship_amount.toString(),
        net_payable: fp.net_payable.toString(),
        installment_count: fp.installment_count,
        status: fp.status,
        summary: {
          billed: totalBilled.toString(),
          paid: totalPaid.toString(),
          balance: balance.toString(),
          installments_total: fp.fee_installments.length,
          installments_paid: fp.fee_installments.filter(
            (i) => i.status === "paid",
          ).length,
        },
      };
    });

    return jsonResponse({
      id: student.id,
      code: student.code,
      name: student.name,
      name_bn: student.name_bn,
      name_ar: student.name_ar,
      class_id: student.class_id,
      section_id: student.section_id,
      roll: student.roll,
      gender: student.gender,
      dob: student.dob,
      blood_group: student.blood_group,
      present_address: student.present_address,
      permanent_address: student.permanent_address,
      phone: student.phone,
      email: student.email,
      admitted_at: student.admitted_at,
      status: student.status,
      special_notes: student.special_notes,
      photo_url: student.photo_url,
      previous_school: student.previous_school,
      blood_donor: student.blood_donor,
      created_at: student.created_at,
      updated_at: student.updated_at,
      class: student.class,
      section: student.section,
      guardians: student.student_guardians.map((sg) => ({
        id: sg.id,
        guardian_id: sg.guardian.id,
        name: sg.guardian.name,
        name_bn: sg.guardian.name_bn,
        phone: sg.guardian.phone,
        email: sg.guardian.email,
        occupation: sg.guardian.occupation,
        relation: sg.relation,
        is_primary: sg.is_primary,
        can_pickup: sg.can_pickup,
      })),
      fee_plans,
    });
  },
);

/** PATCH /api/v1/students/:id — partial update. */
export const PATCH = withPermission(
  "students.update",
  async (req, { params }) => {
    const ctx = await getTenantContext();
    if (!ctx) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = updateStudentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const existing = await db.student.findFirst({
      where: scopedWhere(ctx, id),
      select: { id: true, section_id: true, roll: true, class_id: true },
    });
    if (!existing) {
      return errorResponse("Student not found", 404);
    }

    const data = parsed.data;

    // If section_id or roll is changing, re-validate the
    // `@@unique([section_id, roll])` constraint.
    const newSectionId = data.section_id ?? existing.section_id;
    const newRoll = data.roll ?? existing.roll;
    if (newSectionId && (data.section_id !== undefined || data.roll !== undefined)) {
      const clash = await db.student.findFirst({
        where: {
          section_id: newSectionId,
          roll: newRoll,
          id: { not: id },
          deleted_at: null,
        },
        select: { id: true },
      });
      if (clash) {
        return errorResponse(
          `Roll number ${newRoll} already taken in this section`,
          409,
        );
      }
    }

    // If class_id is changing, verify the new class belongs to the org.
    if (data.class_id && data.class_id !== existing.class_id) {
      const klass = await db.class.findFirst({
        where: {
          id: data.class_id,
          organization_id: ctx.organization_id,
          deleted_at: null,
        },
        select: { id: true },
      });
      if (!klass) {
        return errorResponse(
          "Class not found in current organization",
          404,
        );
      }
    }

    // If section_id is changing, verify it belongs to the (new or existing)
    // class in the org.
    const effectiveClassId = data.class_id ?? existing.class_id;
    if (data.section_id && data.section_id !== existing.section_id) {
      const section = await db.section.findFirst({
        where: {
          id: data.section_id,
          organization_id: ctx.organization_id,
          class_id: effectiveClassId,
          deleted_at: null,
        },
        select: { id: true },
      });
      if (!section) {
        return errorResponse(
          "Section not found in current organization / class",
          404,
        );
      }
    }

    // Build the update payload — only fields that are present in the
    // PATCH body. Prisma accepts `undefined` as "skip", so spreading
    // the parsed data is safe.
    const updated = await db.student.update({
      where: { id },
      data: {
        ...data,
        updated_by: ctx.user_id,
      },
      select: {
        id: true,
        code: true,
        name: true,
        name_bn: true,
        name_ar: true,
        class_id: true,
        section_id: true,
        roll: true,
        gender: true,
        dob: true,
        blood_group: true,
        present_address: true,
        permanent_address: true,
        phone: true,
        email: true,
        status: true,
        special_notes: true,
        photo_url: true,
        previous_school: true,
        blood_donor: true,
        updated_at: true,
      },
    });

    return successResponse(updated, "Student updated");
  },
);

/** DELETE /api/v1/students/:id — soft delete (withdrawn). */
export const DELETE = withPermission(
  "students.update",
  async (_req, { params }) => {
    const ctx = await getTenantContext();
    if (!ctx) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await params;

    const existing = await db.student.findFirst({
      where: scopedWhere(ctx, id),
      select: {
        id: true,
        status: true,
        deleted_at: true,
        class_id: true,
        section_id: true,
      },
    });
    if (!existing) {
      return errorResponse("Student not found", 404);
    }

    if (existing.deleted_at) {
      return errorResponse("Student already deleted", 409);
    }

    // Soft delete: mark withdrawn + set deleted_at. We do NOT touch the
    // StudentHistory rows — those are immutable (Risk R4 timeline panel
    // is fed from history, and the withdrawn student's past chips must
    // remain visible to admins).
    await db.student.update({
      where: { id },
      data: {
        status: "withdrawn",
        deleted_at: new Date(),
        updated_by: ctx.user_id,
      },
    });

    // Append a `withdrawn` StudentHistory entry so the timeline shows the
    // withdrawal as a final chip — consistent with the audit narrative.
    // `to_class_id` is required (NOT NULL) in the schema, so we mirror
    // the student's current class_id (the withdrawal doesn't move them
    // to a new class, it just closes their enrollment).
    await db.studentHistory.create({
      data: {
        organization_id: ctx.organization_id,
        branch_id: ctx.branch_id,
        student_id: id,
        academic_year: new Date().getFullYear(),
        from_class_id: existing.class_id,
        from_section_id: existing.section_id,
        to_class_id: existing.class_id,
        to_section_id: existing.section_id,
        action: "withdrawn",
        remark: "Student withdrawn (soft delete)",
        effective_date: new Date(),
        action_by: ctx.user_id,
        created_by: ctx.user_id,
      },
    });

    return successResponse(null, "Student withdrawn (soft delete)");
  },
);
