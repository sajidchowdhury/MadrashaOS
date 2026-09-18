/**
 * MadrashaOS — Teachers API
 *
 * Phase B4.3 — Guardian + Teacher API
 *
 * GET /api/v1/teachers
 *   Lists teachers in the current tenant, with assignment count.
 *   Permission: teachers.view
 *   Query params: page, pageSize, search (matches name / employee_code /
 *                 specialization / designation)
 *
 * POST /api/v1/teachers
 *   Creates a Teacher record linked to an existing User account.
 *   Permission: teachers.create
 *   Body: { user_id, employee_code, designation?, qualification?, ... }
 *   The User must already exist in the current tenant (created via the
 *   User/Admin API). The Teacher ↔ User relation is 1:1 (Teacher.user_id
 *   is @unique).
 */

import { db } from "@/lib/db";
import { getTenantContext, tenantWhere } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { createTeacherSchema } from "@/lib/validation/schemas";
import {
  errorResponse,
  successResponse,
  paginatedResponse,
  parsePagination,
} from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/** GET /api/v1/teachers — list teachers */
export const GET = withPermission("teachers.view", async (req: Request) => {
  const ctx = await getTenantContext();
  if (!ctx) {
    return errorResponse("Unauthorized", 401);
  }

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const search = url.searchParams.get("search")?.trim();
  const status = url.searchParams.get("status")?.trim();

  const where: Record<string, unknown> = {
    ...tenantWhere(ctx),
    deleted_at: null,
  };

  if (status) {
    where.status = status;
  }

  if (search) {
    // Search across the teacher's employee_code + specialization +
    // designation, AND the linked User's name/email/phone (joined).
    where.OR = [
      { employee_code: { contains: search, mode: "insensitive" } },
      { specialization: { contains: search, mode: "insensitive" } },
      { designation: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      {
        user: {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { name_bn: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  const [total, teachers] = await Promise.all([
    db.teacher.count({ where }),
    db.teacher.findMany({
      where,
      orderBy: [{ joined_at: "desc" }, { created_at: "desc" }],
      skip,
      take,
      select: {
        id: true,
        employee_code: true,
        designation: true,
        qualification: true,
        specialization: true,
        joined_at: true,
        salary: true,
        status: true,
        phone: true,
        photo_url: true,
        branch_id: true,
        user_id: true,
        user: {
          select: {
            id: true,
            name: true,
            name_bn: true,
            email: true,
            phone: true,
            avatar_url: true,
            avatar_initial: true,
          },
        },
        _count: {
          select: {
            teacher_assignments: {
              where: { is_active: true, deleted_at: null },
            },
          },
        },
      },
    }),
  ]);

  const data = teachers.map((t) => ({
    id: t.id,
    employee_code: t.employee_code,
    name: t.user.name,
    name_bn: t.user.name_bn,
    email: t.user.email,
    phone: t.phone ?? t.user.phone,
    designation: t.designation,
    qualification: t.qualification,
    specialization: t.specialization,
    joined_at: t.joined_at,
    salary: t.salary,
    status: t.status,
    photo_url: t.photo_url ?? t.user.avatar_url,
    avatar_initial: t.user.avatar_initial,
    branch_id: t.branch_id,
    user_id: t.user_id,
    active_assignments: t._count.teacher_assignments,
  }));

  return paginatedResponse(data, total, page, pageSize);
});

/** POST /api/v1/teachers — create teacher */
export const POST = withPermission("teachers.create", async (req: Request) => {
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

  const parsed = createTeacherSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parsed.error.flatten());
  }

  const data = parsed.data;

  // Verify the User exists in the current tenant.
  const user = await db.user.findFirst({
    where: {
      id: data.user_id,
      organization_id: ctx.organization_id,
      deleted_at: null,
    },
    select: { id: true, name: true, name_bn: true, email: true, phone: true },
  });
  if (!user) {
    return errorResponse("Linked User not found in current tenant", 404);
  }

  // Pre-flight: employee_code must be unique within the org
  // (@@unique([organization_id, employee_code])).
  const codeClash = await db.teacher.findFirst({
    where: {
      organization_id: ctx.organization_id,
      employee_code: data.employee_code,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (codeClash) {
    return errorResponse(
      "Teacher with this employee code already exists",
      409,
    );
  }

  // Pre-flight: Teacher.user_id is @unique — a User can be linked to at
  // most one Teacher row (1:1 invariant). Even soft-deleted rows are
  // excluded so a re-hire of the same user creates a fresh Teacher row.
  const alreadyTeacher = await db.teacher.findFirst({
    where: { user_id: data.user_id, deleted_at: null },
    select: { id: true, employee_code: true },
  });
  if (alreadyTeacher) {
    return errorResponse(
      "User is already linked to a Teacher record",
      409,
      { teacher_id: alreadyTeacher.id, employee_code: alreadyTeacher.employee_code },
    );
  }

  // If a branch_id is supplied, verify it belongs to the current org.
  if (data.branch_id) {
    const branch = await db.branch.findFirst({
      where: {
        id: data.branch_id,
        organization_id: ctx.organization_id,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (!branch) {
      return errorResponse("Branch not found in current organization", 404);
    }
  }

  const teacher = await db.teacher.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: data.branch_id ?? ctx.branch_id,
      user_id: data.user_id,
      employee_code: data.employee_code,
      designation: data.designation,
      qualification: data.qualification,
      specialization: data.specialization,
      joined_at: new Date(data.joined_at),
      salary: data.salary,
      status: data.status,
      phone: data.phone,
      nid_number: data.nid_number,
      photo_url: data.photo_url,
      created_by: ctx.user_id,
    },
    select: {
      id: true,
      organization_id: true,
      branch_id: true,
      user_id: true,
      employee_code: true,
      designation: true,
      qualification: true,
      specialization: true,
      joined_at: true,
      salary: true,
      status: true,
      phone: true,
      nid_number: true,
      photo_url: true,
      created_at: true,
      updated_at: true,
    },
  });

  return successResponse(teacher, "Teacher created");
});
