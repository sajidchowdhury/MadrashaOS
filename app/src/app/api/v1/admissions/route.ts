/**
 * MadrashaOS — Admissions API (list + create)
 *
 * Phase B4.2 — Admission API (Kanban + pipeline + register)
 *
 * GET /api/v1/admissions
 *   Paginated list of admission applications in the current tenant scope.
 *   Permission: admission.view
 *   Query params:
 *     page        (default 1, min 1)
 *     pageSize    (default 20, min 1, max 100)
 *     status      (applied | interviewed | approved | registered | rejected)
 *     class_id    (filter by desired_class UUID — stored as string on Admission)
 *   Response shape:
 *     {
 *       "data": [
 *         { "id", "applicant_name", "applicant_name_bn", "parent_name",
 *           "parent_phone", "desired_class", "status", "submitted_at",
 *           "student_id", "decided_by", "decided_at" }, ...
 *       ],
 *       "pagination": { "page", "pageSize", "total", "totalPages" }
 *     }
 *
 * POST /api/v1/admissions
 *   Submit a new application. Any staff member with admission.view can
 *   create one (e.g. a front-desk operator taking a walk-in application
 *   over the phone). Public-form submissions are out of scope for B4.2
 *   (they'd hit a separate unauthenticated endpoint with a different
 *   permission contract).
 *   Permission: admission.view
 *   Body (createAdmissionSchema):
 *     applicant_name, applicant_name_bn?, phone, email?, desired_class_id,
 *     previous_education?, guardian_name, guardian_phone
 *   - Body `desired_class_id` is validated against the Class table
 *     (must exist in the current org).
 *   - Body `phone` + `email` are mapped to Admission.parent_phone +
 *     parent_email respectively (the schema only has parent-side contact
 *     fields; applicant_phone is not stored separately).
 *   - Body `guardian_name` + `guardian_phone` map to Admission.parent_name
 *     + parent_phone.
 *   - Sets status="applied", form_source="office", requested_by=current user.
 */

import { Prisma, AdmissionStatus } from "@/generated/prisma";
import { db } from "@/lib/db";
import { getTenantContext, tenantWhere } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { createAdmissionSchema } from "@/lib/validation/schemas";
import {
  errorResponse,
  successResponse,
  paginatedResponse,
  parsePagination,
} from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/** GET /api/v1/admissions — paginated list. */
export const GET = withPermission("admission.view", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) {
    return errorResponse("Unauthorized", 401);
  }

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);

  const status = url.searchParams.get("status");
  const classId = url.searchParams.get("class_id");

  const where: Prisma.AdmissionWhereInput = {
    ...tenantWhere(ctx),
    deleted_at: null,
  };

  if (status) {
    // Validate against the AdmissionStatus enum — Prisma will reject
    // unknown values at runtime, but we surface a clean 400 here so
    // the frontend gets a helpful error instead of a Prisma crash.
    const valid = [
      "applied",
      "interviewed",
      "approved",
      "registered",
      "rejected",
    ];
    if (!valid.includes(status)) {
      return errorResponse(
        `Invalid status filter. Must be one of: ${valid.join(", ")}`,
        400,
      );
    }
    where.status = status as AdmissionStatus;
  }

  if (classId) {
    // desired_class is a free-form String on Admission (not a UUID FK),
    // so we do an exact string match — works for UUIDs we stored at POST
    // time and for legacy class-name strings from older seeds.
    where.desired_class = classId;
  }

  const [total, rows] = await Promise.all([
    db.admission.count({ where }),
    db.admission.findMany({
      where,
      skip,
      take,
      orderBy: { submitted_at: "desc" },
      select: {
        id: true,
        applicant_name: true,
        applicant_name_bn: true,
        parent_name: true,
        parent_phone: true,
        parent_email: true,
        desired_class: true,
        previous_education: true,
        status: true,
        student_id: true,
        requested_by: true,
        decided_by: true,
        decided_at: true,
        rejection_reason: true,
        submitted_at: true,
        form_source: true,
        notes: true,
      },
    }),
  ]);

  const data = rows.map((r) => ({
    id: r.id,
    applicant_name: r.applicant_name,
    applicant_name_bn: r.applicant_name_bn,
    guardian_name: r.parent_name,
    phone: r.parent_phone,
    email: r.parent_email,
    desired_class: r.desired_class,
    previous_education: r.previous_education,
    status: r.status,
    student_id: r.student_id,
    requested_by: r.requested_by,
    decided_by: r.decided_by,
    decided_at: r.decided_at,
    rejection_reason: r.rejection_reason,
    submitted_at: r.submitted_at,
    form_source: r.form_source,
    notes: r.notes,
  }));

  return paginatedResponse(data, total, page, pageSize);
});

/** POST /api/v1/admissions — create new application. */
export const POST = withPermission("admission.view", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) {
    return errorResponse("Unauthorized", 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const parsed = createAdmissionSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parsed.error.flatten());
  }

  const data = parsed.data;

  // Verify the desired_class_id references a real Class in the current org.
  const klass = await db.class.findFirst({
    where: {
      id: data.desired_class_id,
      organization_id: ctx.organization_id,
      deleted_at: null,
    },
    select: { id: true, name: true },
  });
  if (!klass) {
    return errorResponse("Desired class not found in current organization", 404);
  }

  // Previous-education JSON — Zod's z.record(z.string(), z.unknown())
  // yields Record<string, unknown>; cast through Prisma.InputJsonValue for
  // the typed Prisma client (the cast is a no-op at runtime).
  const previousEducation = data.previous_education
    ? (data.previous_education as Prisma.InputJsonValue)
    : Prisma.JsonNull;

  // Merge the body `phone` + `email` into parent_phone + parent_email
  // (see file header for the rationale — Admission only has parent-side
  // contact fields).
  const admission = await db.admission.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id,
      applicant_name: data.applicant_name,
      applicant_name_bn: data.applicant_name_bn ?? null,
      parent_name: data.guardian_name,
      parent_phone: data.guardian_phone,
      parent_email: data.email ?? null,
      // Store the class UUID as a string — see schema note in
      // lib/validation/schemas.ts (the Admission table models desired_class
      // as a free-form String, not a UUID FK).
      desired_class: data.desired_class_id,
      previous_education: previousEducation,
      status: "applied",
      requested_by: ctx.user_id,
      decided_by: null,
      form_source: "office",
      created_by: ctx.user_id,
    },
    select: {
      id: true,
      applicant_name: true,
      applicant_name_bn: true,
      parent_name: true,
      parent_phone: true,
      parent_email: true,
      desired_class: true,
      previous_education: true,
      status: true,
      submitted_at: true,
      form_source: true,
    },
  });

  return successResponse(
    {
      id: admission.id,
      applicant_name: admission.applicant_name,
      applicant_name_bn: admission.applicant_name_bn,
      guardian_name: admission.parent_name,
      phone: admission.parent_phone,
      email: admission.parent_email,
      desired_class: admission.desired_class,
      desired_class_name: klass.name,
      previous_education: admission.previous_education,
      status: admission.status,
      submitted_at: admission.submitted_at,
      form_source: admission.form_source,
    },
    "Admission application submitted",
  );
});
