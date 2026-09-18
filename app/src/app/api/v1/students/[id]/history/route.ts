/**
 * MadrashaOS — Student Promotion History API
 *
 * Task B4.1 — Student API (CRUD + promotion + history)
 *
 * GET /api/v1/students/:id/history
 *   Promotion / assignment timeline for a single student.
 *   Permission: students.view
 *
 *   Returns the StudentHistory rows for this student, newest first
 *   (ordered by effective_date DESC, then created_at DESC). Each row
 *   is shaped as a timeline chip:
 *
 *     {
 *       "id": "uuid",
 *       "action": "admitted" | "promoted" | "demoted" | "transferred" |
 *                 "graduated" | "withdrawn" | "re-enrolled",
 *       "from_class": { "id", "name", "name_bn" } | null,  // null on admission
 *       "from_section": { "id", "name" } | null,
 *       "to_class": { "id", "name", "name_bn" },
 *       "to_section": { "id", "name" } | null,
 *       "effective_date": "2026-01-01",
 *       "reason": "string",            // = StudentHistory.remark
 *       "academic_year": 2026,
 *       "action_by": { "id", "name" } | null,
 *       "created_at": "2026-01-01T10:00:00Z"
 *     }
 *
 *   Risk R4 (Promotion Wizard History Lock-in):
 *     The frontend's promotion wizard renders this array as a vertical
 *     timeline panel on the right side of the screen. Each entry is a
 *     "past chip" — never deleted, even after the student is withdrawn
 *     or re-enrolled elsewhere. New promotions append to this list;
 *     none of the existing rows are mutated or removed.
 */

import { db } from "@/lib/db";
import { getTenantContext, tenantWhere } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/** GET /api/v1/students/:id/history — promotion history timeline. */
export const GET = withPermission(
  "students.view",
  async (_req, { params }) => {
    const ctx = await getTenantContext();
    if (!ctx) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await params;

    // First verify the student exists in the current tenant — without
    // this, an attacker could probe arbitrary UUIDs and learn whether
    // a student with that ID exists by inspecting whether history is
    // returned (404 vs empty array). The findFirst against the tenant-
    // scoped where-clause ensures cross-tenant reads return 404.
    const student = await db.student.findFirst({
      where: { id, ...tenantWhere(ctx), deleted_at: null },
      select: {
        id: true,
        code: true,
        name: true,
        class_id: true,
        section_id: true,
      },
    });
    if (!student) {
      return errorResponse("Student not found", 404);
    }

    // History rows are scoped to the student + org. We do NOT filter
    // out `deleted_at IS NULL` rows here — the Risk R4 invariant says
    // history rows are NEVER deleted, so deleted_at should always be
    // NULL. But if a future admin ever soft-deletes a history row
    // (e.g. to redact an erroneous entry), the timeline should still
    // show the canonical version — hence we intentionally include all
    // rows and let the frontend decide whether to render a "redacted"
    // chip for soft-deleted entries.
    const rows = await db.studentHistory.findMany({
      where: {
        student_id: id,
        organization_id: ctx.organization_id,
      },
      orderBy: [{ effective_date: "desc" }, { created_at: "desc" }],
      select: {
        id: true,
        action: true,
        academic_year: true,
        remark: true,
        effective_date: true,
        created_at: true,
        from_class: { select: { id: true, name: true, name_bn: true } },
        to_class: { select: { id: true, name: true, name_bn: true } },
        from_section: { select: { id: true, name: true } },
        to_section: { select: { id: true, name: true } },
        actioner: { select: { id: true, name: true } },
      },
    });

    const data = rows.map((r) => ({
      id: r.id,
      action: r.action,
      from_class: r.from_class,
      from_section: r.from_section,
      to_class: r.to_class,
      to_section: r.to_section,
      effective_date: r.effective_date,
      reason: r.remark,
      academic_year: r.academic_year,
      action_by: r.actioner
        ? { id: r.actioner.id, name: r.actioner.name }
        : null,
      created_at: r.created_at,
    }));

    return jsonResponse({
      student: {
        id: student.id,
        code: student.code,
        name: student.name,
        current_class_id: student.class_id,
        current_section_id: student.section_id,
      },
      timeline: data,
      total: data.length,
    });
  },
);
