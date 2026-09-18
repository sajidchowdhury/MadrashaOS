/**
 * MadrashaOS — Attendance Sessions API
 *
 * Phase B5.2 — Attendance API (idempotent submit)
 *
 * GET  /api/v1/attendance/sessions — list sessions (perm: attendance.view)
 * POST /api/v1/attendance/sessions — create + submit records (perm: attendance.take)
 *
 * Risk R6 lock-in (Session 0.4):
 *   - Accepts Idempotency-Key header (SRS §6.5)
 *   - Default status: "present" for all students
 *   - Returns 201 on first submit; 200 + cached response on duplicate key
 *   - Optimistic local state handled client-side; this endpoint is the
 *     server-side idempotent landing point.
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse, parsePagination } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/** Zod schema for creating an attendance session with records */
const submitAttendanceSchema = z.object({
  class_id: z.string().uuid(),
  section_id: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  academic_year: z.number().int().optional(),
  period: z.string().optional(), // morning | afternoon | full
  device_id: z.string().optional(), // offline device ID (Risk R6)
  records: z.array(
    z.object({
      student_id: z.string().uuid(),
      status: z.enum(["present", "absent", "late", "leave"]).default("present"),
      note: z.string().optional(),
    }),
  ).min(1, "At least one attendance record is required"),
});

/** In-memory idempotency cache (per-process; Redis in production) */
const idempotencyCache = new Map<
  string,
  { status: number; body: unknown; expiry: number }
>();

const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours

/** GET /api/v1/attendance/sessions — list sessions */
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const classId = url.searchParams.get("class_id");
  const sectionId = url.searchParams.get("section_id");
  const date = url.searchParams.get("date");
  const academicYear = url.searchParams.get("academic_year")
    ? parseInt(url.searchParams.get("academic_year")!, 10)
    : undefined;

  const where = {
    organization_id: ctx.organization_id,
    ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}),
    deleted_at: null,
    ...(classId ? { class_id: classId } : {}),
    ...(sectionId ? { section_id: sectionId } : {}),
    ...(date ? { date: new Date(date) } : {}),
    ...(academicYear ? { academic_year: academicYear } : {}),
  };

  const [sessions, total] = await Promise.all([
    db.attendanceSession.findMany({
      where,
      orderBy: { date: "desc" },
      skip,
      take,
      include: {
        class: { select: { id: true, name: true, name_bn: true } },
        section: { select: { id: true, name: true } },
        taken_by_user: { select: { id: true, name: true, name_bn: true } },
        _count: { select: { attendance_records: true } },
      },
    }),
    db.attendanceSession.count({ where }),
  ]);

  return jsonResponse({
    data: sessions.map((s) => ({
      id: s.id,
      class_id: s.class_id,
      class_name: s.class.name,
      section_id: s.section_id,
      section_name: s.section?.name ?? null,
      date: s.date,
      academic_year: s.academic_year,
      period: s.period,
      taken_by: s.taken_by,
      taken_by_name: s.taken_by_user.name,
      submitted_at: s.submitted_at,
      is_locked: s.is_locked,
      device_id: s.device_id,
      sync_status: s.sync_status,
      total_present: s.total_present,
      total_absent: s.total_absent,
      record_count: s._count.attendance_records,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

/** POST /api/v1/attendance/sessions — create + submit records (idempotent) */
export const POST = withPermission("attendance.take", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  // --- Idempotency check ---
  const idempotencyKey = req.headers.get("idempotency-key");
  if (idempotencyKey) {
    const cached = idempotencyCache.get(idempotencyKey);
    if (cached && cached.expiry > Date.now()) {
      // Return cached response (200, not 201 — this is a replay)
      return jsonResponse(cached.body, 200, {
        "X-Idempotent-Replay": "true",
        "X-Idempotency-Key": idempotencyKey,
      });
    }
  }

  // --- Parse body ---
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const parsed = submitAttendanceSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parsed.error.flatten());
  }

  const data = parsed.data;
  const academicYear = data.academic_year ?? new Date().getFullYear();
  const period = data.period ?? "full";

  // --- Check for existing session (same class + section + date + period) ---
  const existing = await db.attendanceSession.findFirst({
    where: {
      organization_id: ctx.organization_id,
      class_id: data.class_id,
      section_id: data.section_id ?? null,
      date: new Date(data.date),
      period,
      academic_year: academicYear,
      deleted_at: null,
    },
    include: { attendance_records: true },
  });

  if (existing) {
    // Session already exists — return it (idempotent behavior)
    const responseBody = {
      id: existing.id,
      class_id: existing.class_id,
      section_id: existing.section_id,
      date: existing.date,
      academic_year: existing.academic_year,
      period: existing.period,
      taken_by: existing.taken_by,
      submitted_at: existing.submitted_at,
      is_locked: existing.is_locked,
      total_present: existing.total_present,
      total_absent: existing.total_absent,
      record_count: existing.attendance_records.length,
      message: "Attendance already submitted for this class/date/period",
    };

    // Cache if idempotency key provided
    if (idempotencyKey) {
      idempotencyCache.set(idempotencyKey, {
        status: 200,
        body: responseBody,
        expiry: Date.now() + IDEMPOTENCY_TTL,
      });
    }

    return jsonResponse(responseBody, 200, {
      "X-Idempotent-Replay": "true",
    });
  }

  // --- Create session + records in a transaction ---
  const totalPresent = data.records.filter((r) => r.status === "present").length;
  const totalAbsent = data.records.filter((r) => r.status === "absent").length;

  const session = await db.$transaction(async (tx) => {
    // Create the session
    const newSession = await tx.attendanceSession.create({
      data: {
        organization_id: ctx.organization_id,
        branch_id: ctx.branch_id ?? null,
        class_id: data.class_id,
        section_id: data.section_id ?? null,
        date: new Date(data.date),
        taken_by: ctx.user_id,
        academic_year: academicYear,
        period,
        submitted_at: new Date(),
        is_locked: false,
        device_id: data.device_id ?? null,
        sync_status: "synced",
        total_present: totalPresent,
        total_absent: totalAbsent,
        created_by: ctx.user_id,
      } as never,
    });

    // Create all records in bulk
    await tx.attendanceRecord.createMany({
      data: data.records.map((r) => ({
        organization_id: ctx.organization_id,
        branch_id: ctx.branch_id ?? null,
        session_id: newSession.id,
        student_id: r.student_id,
        status: r.status,
        note: r.note ?? null,
        recorded_by: ctx.user_id,
        created_by: ctx.user_id,
      })) as never,
    });

    return newSession;
  });

  // --- Audit log ---
  await db.auditLog.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      entity_type: "attendance_sessions",
      entity_id: session.id,
      action: "create",
      old_values: null,
      new_values: {
        class_id: data.class_id,
        section_id: data.section_id,
        date: data.date,
        total_records: data.records.length,
        total_present: totalPresent,
        total_absent: totalAbsent,
      },
      actor_id: ctx.user_id,
      ip_address: req.headers.get("x-forwarded-for") || null,
      user_agent: req.headers.get("user-agent") || null,
    } as never,
  });

  const responseBody = {
    id: session.id,
    class_id: session.class_id,
    section_id: session.section_id,
    date: session.date,
    academic_year: session.academic_year,
    period: session.period,
    taken_by: session.taken_by,
    submitted_at: session.submitted_at,
    is_locked: session.is_locked,
    total_present: totalPresent,
    total_absent: totalAbsent,
    record_count: data.records.length,
    message: `Attendance submitted — ${totalPresent} Present, ${totalAbsent} Absent`,
  };

  // --- Cache for idempotency ---
  if (idempotencyKey) {
    idempotencyCache.set(idempotencyKey, {
      status: 201,
      body: responseBody,
      expiry: Date.now() + IDEMPOTENCY_TTL,
    });
  }

  return jsonResponse(responseBody, 201);
});
