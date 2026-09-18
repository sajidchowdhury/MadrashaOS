/**
 * MadrashaOS — Admission Status Move API
 *
 * Phase B4.2 — Admission API (Kanban + pipeline + register)
 *
 * PATCH /api/v1/admissions/:id/status
 *   Move an admission application between pipeline stages.
 *   Permission: admission.approve (covers interview, approve, register,
 *   reject — anyone who can make a decision can also advance the stages).
 *
 *   Body (updateAdmissionStatusSchema):
 *     { status: "interviewed" | "approved" | "registered" | "rejected",
 *       rejection_reason?: string }
 *
 *   Valid transitions (AdmissionStatus enum — see prisma/schema.prisma):
 *     applied     → interviewed | rejected
 *     interviewed → approved    | rejected
 *     approved    → registered  | rejected
 *     registered  → (terminal — no further moves allowed)
 *     rejected    → (terminal — no further moves allowed)
 *
 *   - `rejection_reason` is REQUIRED when status === "rejected" (400 otherwise).
 *   - When status === "registered", the route delegates to the shared
 *     `convertAdmissionToStudent()` helper which atomically creates the
 *     Student + Guardian + User + FeePlan + StudentHistory rows and flips
 *     the admission to `registered`. The response then carries the
 *     student_id + fee_plan_id + user_id so the client can navigate to
 *     the new student profile.
 *
 *   Response shape:
 *     - For non-register transitions:
 *         { "success": true, "message": "Status moved to X",
 *           "data": { "id", "previous_status", "status", "decided_at" } }
 *     - For status === "registered":
 *         { "success": true, "message": "Student registered successfully",
 *           "data": { "id", "previous_status", "status",
 *                     "student_id", "fee_plan_id", "user_id", "student_code",
 *                     "user_created", "temp_password?" } }
 */

import { db } from "@/lib/db";
import { getTenantContext, tenantWhere } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { updateAdmissionStatusSchema } from "@/lib/validation/schemas";
import { convertAdmissionToStudent } from "@/lib/admissions/register";
import { errorResponse, successResponse } from "@/lib/api/helpers";
import type { AdmissionStatus } from "@/generated/prisma";

export const dynamic = "force-dynamic";

/**
 * Allowed forward edges per AdmissionStatus. The pipeline is intentionally
 * linear (applied → interviewed → approved → registered) with `rejected`
 * reachable from any non-terminal state. `registered` and `rejected` are
 * terminal — once the row is in either, no further moves are allowed.
 */
const TRANSITIONS: Record<AdmissionStatus, AdmissionStatus[]> = {
  applied: ["interviewed", "rejected"],
  interviewed: ["approved", "rejected"],
  approved: ["registered", "rejected"],
  registered: [],
  rejected: [],
};

/** PATCH /api/v1/admissions/:id/status — move between pipeline stages. */
export const PATCH = withPermission(
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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const parsed = updateAdmissionStatusSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const { status: nextStatus, rejection_reason } = parsed.data;

    // Fetch the admission (tenant-scoped).
    const admission = await db.admission.findFirst({
      where: {
        id,
        ...tenantWhere(tenantCtx),
        deleted_at: null,
      },
      select: { id: true, status: true, parent_name: true },
    });
    if (!admission) {
      return errorResponse("Admission not found", 404);
    }

    const currentStatus = admission.status as AdmissionStatus;

    // Terminal-state guard — once registered or rejected, no further moves.
    if (TRANSITIONS[currentStatus].length === 0) {
      return errorResponse(
        `Admission is in terminal status "${currentStatus}" — no further transitions allowed`,
        409,
        { current_status: currentStatus },
      );
    }

    // Validate the transition against the allowed-edges map.
    const allowed = TRANSITIONS[currentStatus];
    if (!allowed.includes(nextStatus as AdmissionStatus)) {
      return errorResponse(
        `Invalid transition: "${currentStatus}" → "${nextStatus}". Allowed: ${allowed.join(", ")}`,
        409,
        { current_status: currentStatus, attempted: nextStatus, allowed },
      );
    }

    // Rejection requires a reason.
    if (nextStatus === "rejected" && !rejection_reason?.trim()) {
      return errorResponse(
        "rejection_reason is required when moving to status 'rejected'",
        400,
      );
    }

    // ---- Special path: registration ------------------------------------
    // When moving to "registered", delegate to the shared helper which
    // atomically creates the Student + Guardian + User + FeePlan rows
    // AND flips the admission status. We don't update the admission
    // here — the helper does it inside its transaction.
    if (nextStatus === "registered") {
      let result;
      try {
        result = await convertAdmissionToStudent(
          admission.id,
          tenantCtx.organization_id,
          tenantCtx.branch_id,
          tenantCtx.user_id,
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
          return errorResponse(message, 409);
        }
        // P2002 — unique constraint violation (rare race on student_code).
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
        // Unknown error — surface a generic 500 to avoid leaking internals.
        console.error("[admissions/status] registration failed:", err);
        return errorResponse("Failed to register student", 500);
      }

      return successResponse(
        {
          id: admission.id,
          previous_status: currentStatus,
          status: "registered" as AdmissionStatus,
          student_id: result.student_id,
          fee_plan_id: result.fee_plan_id,
          user_id: result.user_id,
          guardian_id: result.guardian_id,
          student_code: result.student_code,
          user_created: result.user_created,
          // One-time view of the temp password when a new User was
          // provisioned (matches the B4.4 employees POST pattern).
          ...(result.user_created && result.temp_password
            ? { temp_password: result.temp_password }
            : {}),
        },
        result.message,
      );
    }

    // ---- Standard path: interview / approve / reject -------------------
    const updateData: {
      status: AdmissionStatus;
      decided_by?: string;
      decided_at?: Date;
      rejection_reason?: string | null;
      updated_by: string;
    } = {
      status: nextStatus as AdmissionStatus,
      decided_by: tenantCtx.user_id,
      decided_at: new Date(),
      updated_by: tenantCtx.user_id,
    };

    if (nextStatus === "rejected") {
      updateData.rejection_reason = rejection_reason ?? null;
    } else {
      // Clear any stale rejection_reason if the row is being moved
      // forward again (e.g. re-applied after a rejection — though the
      // transition map currently forbids that, this is future-proofing).
      updateData.rejection_reason = null;
    }

    const updated = await db.admission.update({
      where: { id: admission.id },
      data: updateData,
      select: {
        id: true,
        status: true,
        decided_by: true,
        decided_at: true,
        rejection_reason: true,
      },
    });

    return successResponse(
      {
        id: updated.id,
        previous_status: currentStatus,
        status: updated.status,
        decided_by: updated.decided_by,
        decided_at: updated.decided_at,
        rejection_reason: updated.rejection_reason,
      },
      `Status moved to ${updated.status}`,
    );
  },
);
