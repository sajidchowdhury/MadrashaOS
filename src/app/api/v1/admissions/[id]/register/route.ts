/**
 * MadrashaOS — Admission Register (Convert to Student) API
 *
 * Phase B4.2 — Admission API (Kanban + pipeline + register)
 *
 * POST /api/v1/admissions/:id/register
 *   Convert an approved Admission application into a fully-enrolled Student.
 *   Permission: admission.approve
 *
 *   Body (registerStudentSchema, all fields optional):
 *     { gender?: "male" | "female", dob?: ISO 8601, roll?: number }
 *
 *   Delegates to the shared `convertAdmissionToStudent()` helper which:
 *     - Auto-generates student code: MOS-{year}-{seq4}
 *     - Creates Student record (from applicant data)
 *     - Creates StudentGuardian junction row (primary, with default
 *       receive_sms=true, can_pickup=true)
 *     - Creates StudentHistory row (action="admitted" — Risk R4 timeline
 *       bootstrap chip for the promotion wizard)
 *     - Creates / reuses Guardian record (matched by org + parent_phone)
 *     - Creates / reuses User account for the guardian (matched by
 *       org + email; if no email on file, synthesizes a deterministic
 *       placeholder from the parent_phone so the unique constraint holds)
 *     - Creates FeePlan with 3 installments (default BDT 12,000 total,
 *       BDT 4,000 per installment, due dates spaced 4 months apart)
 *     - Flips Admission.status to "registered", sets student_id,
 *       stamps decided_by + decided_at
 *     - All writes are atomic (`db.$transaction`)
 *     - Idempotent: if the admission is already registered, returns the
 *       existing student_id + fee_plan_id + user_id without re-creating
 *
 *   Response shape:
 *     {
 *       "success": true,
 *       "message": "Student registered successfully",
 *       "data": {
 *         "admission_id": "uuid",
 *         "student_id": "uuid",
 *         "fee_plan_id": "uuid",
 *         "user_id": "uuid",
 *         "guardian_id": "uuid",
 *         "student_code": "MOS-2026-0042",
 *         "user_created": true,
 *         "temp_password": "Hk9mQp2tRwXc"  // one-time view, only when user_created
 *       }
 *     }
 *
 *   Status codes:
 *     200 — registration successful (or idempotent re-registration)
 *     401 — unauthenticated (middleware gate)
 *     403 — missing admission.approve permission
 *     404 — admission or desired class not found
 *     409 — admission not in "approved" status (must advance through /status first)
 *     422 — admission missing desired_class, or Guardian role not seeded
 *     500 — unexpected error (DB constraint, transaction rollback)
 */

import { db } from "@/lib/db";
import { getTenantContext, tenantWhere } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { registerStudentSchema } from "@/lib/validation/schemas";
import { convertAdmissionToStudent } from "@/lib/admissions/register";
import { errorResponse, successResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/** POST /api/v1/admissions/:id/register — convert to student. */
export const POST = withPermission(
  "admission.approve",
  async (
    req: Request,
    ctx: { params: Promise<{ id: string }> },
  ) => {
    const tenantCtx = await getTenantContext();
    if (!tenantCtx) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await ctx.params;

    // Body is optional — defaults (gender=male, dob=today-10y, roll=auto)
    // are applied inside the helper when fields are absent.
    let body: unknown = {};
    if (req.headers.get("content-length")) {
      try {
        body = await req.json();
      } catch {
        return errorResponse("Invalid JSON body", 400);
      }
    }

    const parsed = registerStudentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    // Pre-flight: verify the admission exists in the current tenant scope
    // so we can return a clean 404 BEFORE entering the transaction.
    // (The helper also checks this, but the early check gives a cleaner
    // error path for the most common failure case.)
    const admission = await db.admission.findFirst({
      where: {
        id,
        ...tenantWhere(tenantCtx),
        deleted_at: null,
      },
      select: { id: true, status: true },
    });
    if (!admission) {
      return errorResponse("Admission not found", 404);
    }

    try {
      const result = await convertAdmissionToStudent(
        id,
        tenantCtx.organization_id,
        tenantCtx.branch_id,
        tenantCtx.user_id,
        {
          gender: parsed.data.gender,
          dob: parsed.data.dob,
          roll: parsed.data.roll,
        },
      );

      return successResponse(
        {
          admission_id: id,
          student_id: result.student_id,
          fee_plan_id: result.fee_plan_id,
          user_id: result.user_id,
          guardian_id: result.guardian_id,
          student_code: result.student_code,
          user_created: result.user_created,
          // One-time view of the temp password when a NEW User was
          // provisioned. Matches the B4.4 employees POST pattern.
          // Per SRS §6.2.3 R-S3: NEVER logged, NEVER returned by any
          // other endpoint, NEVER serialized into the JWT/session.
          ...(result.user_created && result.temp_password
            ? { temp_password: result.temp_password }
            : {}),
        },
        result.message,
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown registration error";

      // Map known helper errors to HTTP status codes.
      if (message === "Admission not found") {
        return errorResponse("Admission not found", 404);
      }
      if (message === "Admission has no desired_class set") {
        return errorResponse(message, 422);
      }
      if (message === "Desired class not found") {
        return errorResponse(message, 404);
      }
      if (message.startsWith("Guardian role not configured")) {
        return errorResponse(message, 422);
      }
      if (message.startsWith("Cannot register admission with status")) {
        return errorResponse(message, 409, {
          hint: "Advance the admission through the /status endpoint first: applied → interviewed → approved.",
        });
      }
      if (message.startsWith("Invalid dob")) {
        return errorResponse(message, 400);
      }

      // Prisma P2002 — unique constraint violation (rare race on the
      // auto-generated student_code; the count-then-insert window is
      // tiny but non-zero under concurrent requests).
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        return errorResponse(
          "Student code collision — please retry the registration",
          409,
        );
      }

      // Unknown error — log full detail server-side, return generic 500
      // to the client to avoid leaking internals.
      console.error("[admissions/register] conversion failed:", err);
      return errorResponse("Failed to register student", 500);
    }
  },
);
