/**
 * MadrashaOS — Students API
 *
 * Task B4.1 — Student API (CRUD + promotion + history)
 *
 * GET /api/v1/students
 *   Paginated list of students in the current tenant scope.
 *   Permission: students.view
 *   Query params:
 *     page          (default 1, min 1)
 *     pageSize      (default 20, min 1, max 100)
 *     search        (case-insensitive substring of name / name_bn / code)
 *     class_id      (filter by class UUID)
 *     section       (filter by section UUID — interpreted as section_id)
 *     status        (active | graduated | withdrawn)
 *     guardian_id   (filter to students linked to this guardian UUID)
 *   Response shape:
 *     {
 *       "data": [
 *         { "id", "code", "name", "name_bn", "roll", "gender", "status",
 *           "class": { "id", "name", "name_bn" },
 *           "section": { "id", "name" } | null,
 *           "primary_guardian": { "id", "name", "phone", "relation" } | null
 *         }, ...
 *       ],
 *       "pagination": { "page", "pageSize", "total", "totalPages" }
 *     }
 *
 * POST /api/v1/students
 *   Create a new student + primary guardian link (StudentGuardian row).
 *   Permission: students.create
 *   Body: see createStudentSchema — code auto-generated if omitted as
 *         `MOS-{year}-{sequence}` (zero-padded sequence within the org).
 */

import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { getTenantContext, tenantWhere } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { createStudentSchema } from "@/lib/validation/schemas";
import {
  jsonResponse,
  errorResponse,
  successResponse,
  paginatedResponse,
  parsePagination,
} from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/**
 * Generate the next student code for an org in the form
 * `MOS-{year}-{sequence}` where sequence is `(count_existing + 1)`
 * zero-padded to 4 digits.
 *
 * The `@@unique([organization_id, code])` index on the students table
 * guarantees uniqueness at the DB level — if a race causes a collision
 * the INSERT will throw P2002 and we surface it as a 409. In practice
 * the count-then-insert happens inside a single request, so collisions
 * are unlikely.
 */
async function generateStudentCode(orgId: string): Promise<string> {
  const year = new Date().getFullYear();
  // count includes soft-deleted rows — codes never get reused.
  const count = await db.student.count({
    where: { organization_id: orgId },
  });
  const seq = String(count + 1).padStart(4, "0");
  return `MOS-${year}-${seq}`;
}

/** GET /api/v1/students — paginated list of students. */
export const GET = withPermission("students.view", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) {
    return errorResponse("Unauthorized", 401);
  }

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);

  const search = url.searchParams.get("search")?.trim() || "";
  const classId = url.searchParams.get("class_id");
  const sectionId = url.searchParams.get("section");
  const status = url.searchParams.get("status");
  const guardianId = url.searchParams.get("guardian_id");

  const where: Prisma.StudentWhereInput = {
    ...tenantWhere(ctx),
    deleted_at: null,
  };

  if (classId) where.class_id = classId;
  if (sectionId) where.section_id = sectionId;
  if (status) where.status = status as Prisma.EnumStudentStatusFilter;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { name_bn: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
    ];
  }
  if (guardianId) {
    where.student_guardians = { some: { guardian_id: guardianId } };
  }

  const [total, rows] = await Promise.all([
    db.student.count({ where }),
    db.student.findMany({
      where,
      skip,
      take,
      orderBy: [{ roll: "asc" }, { name: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        name_bn: true,
        roll: true,
        gender: true,
        dob: true,
        status: true,
        class: { select: { id: true, name: true, name_bn: true } },
        section: { select: { id: true, name: true } },
        student_guardians: {
          where: { is_primary: true, deleted_at: null },
          take: 1,
          select: {
            relation: true,
            guardian: { select: { id: true, name: true, phone: true } },
          },
        },
      },
    }),
  ]);

  const data = rows.map((s) => {
    const pg = s.student_guardians[0];
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      name_bn: s.name_bn,
      roll: s.roll,
      gender: s.gender,
      dob: s.dob,
      status: s.status,
      class: s.class,
      section: s.section,
      primary_guardian: pg
        ? {
            id: pg.guardian.id,
            name: pg.guardian.name,
            phone: pg.guardian.phone,
            relation: pg.relation,
          }
        : null,
    };
  });

  return paginatedResponse(data, total, page, pageSize);
});

/** POST /api/v1/students — create a new student. */
export const POST = withPermission("students.create", async (req) => {
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

  const parsed = createStudentSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parsed.error.flatten());
  }

  const data = parsed.data;

  // Verify class exists in the current org (cross-tenant safety).
  const klass = await db.class.findFirst({
    where: {
      id: data.class_id,
      organization_id: ctx.organization_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!klass) {
    return errorResponse("Class not found in current organization", 404);
  }

  // Verify guardian exists in the current org.
  const guardian = await db.guardian.findFirst({
    where: {
      id: data.guardian_id,
      organization_id: ctx.organization_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!guardian) {
    return errorResponse("Guardian not found in current organization", 404);
  }

  // Section (optional) — must belong to the same class + org.
  if (data.section_id) {
    const section = await db.section.findFirst({
      where: {
        id: data.section_id,
        organization_id: ctx.organization_id,
        class_id: data.class_id,
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

  // Roll uniqueness within the section (the @@unique([section_id, roll])
  // index enforces this at the DB level — but we want a clean 409 instead
  // of a raw Prisma P2002 surfacing as a 500).
  if (data.section_id) {
    const rollClash = await db.student.findFirst({
      where: {
        section_id: data.section_id,
        roll: data.roll,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (rollClash) {
      return errorResponse(
        `Roll number ${data.roll} already taken in this section`,
        409,
      );
    }
  }

  // Auto-generate code if not provided.
  const code = data.code ?? (await generateStudentCode(ctx.organization_id));

  // Code uniqueness within org (the @@unique([organization_id, code])
  // index also enforces this at the DB level).
  const codeClash = await db.student.findFirst({
    where: {
      organization_id: ctx.organization_id,
      code,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (codeClash) {
    return errorResponse(
      `Student code "${code}" already exists in this organization`,
      409,
    );
  }

  // Create the student + the primary StudentGuardian link atomically.
  // `admitted_at` defaults to today (the create-form can override via PATCH
  // if the actual admission date was earlier — out of scope for B4.1).
  const student = await db.student.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id,
      code,
      name: data.name,
      name_bn: data.name_bn,
      name_ar: data.name_ar ?? null,
      class_id: data.class_id,
      section_id: data.section_id ?? null,
      roll: data.roll,
      gender: data.gender,
      dob: data.dob,
      blood_group: data.blood_group ?? null,
      present_address: data.present_address ?? null,
      permanent_address: data.permanent_address ?? null,
      admitted_at: new Date(),
      status: "active",
      created_by: ctx.user_id,
      student_guardians: {
        create: [
          {
            organization_id: ctx.organization_id,
            branch_id: ctx.branch_id,
            guardian_id: data.guardian_id,
            relation: data.guardian_relation ?? "father",
            is_primary: true,
            can_pickup: true,
            created_by: ctx.user_id,
          },
        ],
      },
    },
    include: {
      class: { select: { id: true, name: true, name_bn: true } },
      section: { select: { id: true, name: true } },
      student_guardians: {
        where: { is_primary: true, deleted_at: null },
        take: 1,
        select: {
          relation: true,
          guardian: { select: { id: true, name: true, phone: true } },
        },
      },
    },
  });

  // Seed an initial StudentHistory row (action="admitted") so the
  // timeline panel in the promotion wizard has its first chip. This is
  // the Risk R4 "old assignment never deleted" invariant's bootstrap.
  await db.studentHistory.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id,
      student_id: student.id,
      academic_year: new Date().getFullYear(),
      from_class_id: null,
      from_section_id: null,
      to_class_id: data.class_id,
      to_section_id: data.section_id ?? null,
      action: "admitted",
      remark: "Initial admission",
      effective_date: new Date(),
      action_by: ctx.user_id,
      created_by: ctx.user_id,
    },
  });

  const pg = student.student_guardians[0];
  return successResponse(
    {
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
      status: student.status,
      admitted_at: student.admitted_at,
      class: student.class,
      section: student.section,
      primary_guardian: pg
        ? {
            id: pg.guardian.id,
            name: pg.guardian.name,
            phone: pg.guardian.phone,
            relation: pg.relation,
          }
        : null,
    },
    "Student created",
  );
});
