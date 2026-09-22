/**
 * MadrashaOS — Single Admission API
 *
 * Phase B4.2 — Admission API (Kanban + pipeline + register)
 *
 * GET    /api/v1/admissions/:id  — single admission with all fields
 * PATCH  /api/v1/admissions/:id  — update applicant / contact / class fields
 *
 * Permissions:
 *   GET    — admission.view
 *   PATCH  — admission.view (any staff who can see an application can edit
 *            the applicant data; status mutations go through /status).
 */

import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { getTenantContext, tenantWhere } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { updateAdmissionSchema } from "@/lib/validation/schemas";
import {
  jsonResponse,
  errorResponse,
  successResponse,
} from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/** GET /api/v1/admissions/:id — single admission. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) {
    return errorResponse("Unauthorized", 401);
  }

  const { id } = await ctx.params;

  const admission = await db.admission.findFirst({
    where: {
      id,
      ...tenantWhere(tenantCtx),
      deleted_at: null,
    },
    select: {
      id: true,
      applicant_name: true,
      applicant_name_bn: true,
      parent_name: true,
      parent_phone: true,
      parent_email: true,
      desired_class: true,
      desired_program: true,
      previous_education: true,
      notes: true,
      status: true,
      student_id: true,
      requested_by: true,
      decided_by: true,
      decided_at: true,
      rejection_reason: true,
      submitted_at: true,
      form_source: true,
      created_at: true,
      updated_at: true,
      requester: { select: { id: true, name: true } },
      decider: { select: { id: true, name: true } },
      student: {
        select: {
          id: true,
          code: true,
          name: true,
          name_bn: true,
          class_id: true,
        },
      },
    },
  });

  if (!admission) {
    return errorResponse("Admission not found", 404);
  }

  return jsonResponse({
    id: admission.id,
    applicant_name: admission.applicant_name,
    applicant_name_bn: admission.applicant_name_bn,
    guardian_name: admission.parent_name,
    phone: admission.parent_phone,
    email: admission.parent_email,
    desired_class: admission.desired_class,
    desired_program: admission.desired_program,
    previous_education: admission.previous_education,
    notes: admission.notes,
    status: admission.status,
    student_id: admission.student_id,
    requested_by: admission.requested_by,
    decided_by: admission.decided_by,
    decided_at: admission.decided_at,
    rejection_reason: admission.rejection_reason,
    submitted_at: admission.submitted_at,
    form_source: admission.form_source,
    created_at: admission.created_at,
    updated_at: admission.updated_at,
    requester: admission.requester,
    decider: admission.decider,
    student: admission.student,
  });
}

/** PATCH /api/v1/admissions/:id — update applicant fields. */
export const PATCH = withPermission(
  "admission.view",
  async (
    req: Request,
    ctx: { params: Promise<{ id: string }> },
  ) => {
    const tenantCtx = await getTenantContext();
    if (!tenantCtx) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await ctx.params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = updateAdmissionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const data = parsed.data;

    // Verify the admission exists in the current tenant scope.
    const existing = await db.admission.findFirst({
      where: {
        id,
        ...tenantWhere(tenantCtx),
        deleted_at: null,
      },
      select: { id: true, status: true },
    });
    if (!existing) {
      return errorResponse("Admission not found", 404);
    }

    // Block applicant-data edits once the admission is `registered` —
    // after registration the student record is the source of truth and
    // edits should go through PATCH /api/v1/students/:id instead.
    if (existing.status === "registered") {
      return errorResponse(
        "Cannot edit a registered admission — update the student record instead",
        409,
      );
    }

    // If desired_class_id is being changed, verify the new class exists.
    if (data.desired_class_id) {
      const klass = await db.class.findFirst({
        where: {
          id: data.desired_class_id,
          organization_id: tenantCtx.organization_id,
          deleted_at: null,
        },
        select: { id: true },
      });
      if (!klass) {
        return errorResponse(
          "Desired class not found in current organization",
          404,
        );
      }
    }

    // Build the update payload — map body field names → Admission column
    // names (the body uses `guardian_name` / `guardian_phone` / `phone` /
    // `email`, the schema uses `parent_name` / `parent_phone` / `parent_email`).
    const updateData: Prisma.AdmissionUpdateInput = {};
    if (data.applicant_name !== undefined) {
      updateData.applicant_name = data.applicant_name;
    }
    if (data.applicant_name_bn !== undefined) {
      updateData.applicant_name_bn = data.applicant_name_bn;
    }
    if (data.guardian_name !== undefined) {
      updateData.parent_name = data.guardian_name;
    }
    if (data.guardian_phone !== undefined) {
      updateData.parent_phone = data.guardian_phone;
    }
    if (data.phone !== undefined) {
      // `phone` in the body is the family's primary contact — maps to
      // parent_phone (overwrites guardian_phone if both are sent; this
      // is intentional — they're the same field conceptually).
      updateData.parent_phone = data.phone;
    }
    if (data.email !== undefined) {
      // Empty string clears the email; otherwise validate via Zod schema.
      updateData.parent_email = data.email === "" ? null : data.email;
    }
    if (data.desired_class_id !== undefined) {
      updateData.desired_class = data.desired_class_id;
    }
    if (data.previous_education !== undefined) {
      updateData.previous_education = data.previous_education as Prisma.InputJsonValue;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }
    updateData.updated_by = tenantCtx.user_id;

    const updated = await db.admission.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        applicant_name: true,
        applicant_name_bn: true,
        parent_name: true,
        parent_phone: true,
        parent_email: true,
        desired_class: true,
        previous_education: true,
        notes: true,
        status: true,
        updated_at: true,
      },
    });

    return successResponse(
      {
        id: updated.id,
        applicant_name: updated.applicant_name,
        applicant_name_bn: updated.applicant_name_bn,
        guardian_name: updated.parent_name,
        phone: updated.parent_phone,
        email: updated.parent_email,
        desired_class: updated.desired_class,
        previous_education: updated.previous_education,
        notes: updated.notes,
        status: updated.status,
        updated_at: updated.updated_at,
      },
      "Admission updated",
    );
  },
);
