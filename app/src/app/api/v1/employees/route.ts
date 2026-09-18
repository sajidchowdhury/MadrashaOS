/**
 * MadrashaOS — Employees API
 *
 * Phase B4.4 — People Layer: Employee API
 *
 * GET /api/v1/employees
 *   Paginated list of employees in the current org (or current branch
 *   for branch-scoped roles). Each row is joined with its linked User
 *   account so the UI can render the staff member's email + status
 *   badge without a second round-trip.
 *   Permission: employees.view
 *   Query params:
 *     page        (default 1, min 1)
 *     pageSize    (default 20, min 1, max 100)
 *     search      (substring match on name OR designation)
 *     status      (active | on-leave | resigned)
 *
 * POST /api/v1/employees
 *   Creates an Employee record linked to a freshly provisioned User
 *   account so the new staff member can sign in to MadrashaOS.
 *   Permission: employees.create
 *   Body (createEmployeeSchema):
 *     name, name_bn?, designation, phone, email, salary?,
 *     joining_date (ISO 8601), branch_id?, role_code?, temp_password?
 *
 *   - Auto-generates employee_code: EMP-{year}-{sequence padded 4}
 *   - Provisions a User row with:
 *       * organization_id / branch_id from tenant context
 *       * role_id resolved by role_code (defaults to "storekeeper" —
 *         the closest existing non-teaching staff role per the 8
 *         system role codes; the Employee.designation field carries
 *         the granular job title)
 *       * password_hash from a server-generated 12-char temp password
 *         (per SRS §6.2.3 R-S2) — returned ONCE in the create
 *         response so the admin can hand it to the new employee
 *         out-of-band. NEVER persisted in plaintext anywhere.
 *   - Returns 409 if email already exists in the org.
 *   - Returns 422 if role_code cannot be resolved in the org.
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { hashPassword, generateTempPassword } from "@/lib/auth/password";
import { createEmployeeSchema } from "@/lib/validation/schemas";
import {
  errorResponse,
  successResponse,
  paginatedResponse,
  parsePagination,
} from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/** Default role code for non-teaching staff (no "employee" RoleCode in seed). */
const DEFAULT_EMPLOYEE_ROLE = "storekeeper";

/**
 * Returns the next employee code for the current year, e.g. EMP-2026-0007.
 *
 * Strategy: count existing rows in the org whose code starts with the
 * current-year prefix, then increment. The Employee table has a
 * `@@unique([organization_id, employee_code])` constraint, so any race
 * condition will surface as a Prisma P2002 — the caller catches that
 * and returns 409.
 */
async function nextEmployeeCode(organization_id: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `EMP-${year}-`;
  const count = await db.employee.count({
    where: {
      organization_id,
      employee_code: { startsWith: prefix },
    },
  });
  const seq = (count + 1).toString().padStart(4, "0");
  return `${prefix}${seq}`;
}

/** GET /api/v1/employees — list */
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx) {
    return errorResponse("Unauthorized", 401);
  }

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);

  const search = url.searchParams.get("search")?.trim() || null;
  const status = url.searchParams.get("status")?.trim() || null;

  // Tenant scoping — super-admin sees all orgs; authority sees all
  // branches in their org; branch roles see only their own branch.
  const where: {
    organization_id: string;
    branch_id?: string;
    deleted_at: null;
    OR?: Array<
      | { designation?: { contains: string; mode: "insensitive" } }
      | { user?: { name?: { contains: string; mode: "insensitive" } } }
      | { user?: { email?: { contains: string; mode: "insensitive" } } }
    >;
    status?: string;
  } = {
    organization_id: ctx.organization_id,
    deleted_at: null,
  };

  if (
    ctx.role !== "super-admin" &&
    !(ctx.role === "authority" && !ctx.branch_id)
  ) {
    if (ctx.branch_id) {
      where.branch_id = ctx.branch_id;
    }
  }

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { designation: { contains: search, mode: "insensitive" } },
      { user: { name: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [total, rows] = await Promise.all([
    db.employee.count({ where }),
    db.employee.findMany({
      where,
      skip,
      take,
      orderBy: [{ created_at: "desc" }],
      select: {
        id: true,
        employee_code: true,
        designation: true,
        department: true,
        joined_at: true,
        salary: true,
        status: true,
        phone: true,
        photo_url: true,
        created_at: true,
        branch: {
          select: { id: true, name: true, code: true },
        },
        user: {
          select: {
            id: true,
            name: true,
            name_bn: true,
            email: true,
            phone: true,
            status: true,
            avatar_url: true,
            last_login_at: true,
          },
        },
      },
    }),
  ]);

  const data = rows.map((r) => ({
    id: r.id,
    employee_code: r.employee_code,
    name: r.user.name,
    name_bn: r.user.name_bn,
    email: r.user.email,
    designation: r.designation,
    department: r.department,
    phone: r.phone ?? r.user.phone,
    salary: r.salary ? Number(r.salary) : null,
    joined_at: r.joined_at,
    status: r.status,
    photo_url: r.photo_url,
    branch: r.branch,
    user: {
      id: r.user.id,
      status: r.user.status,
      last_login_at: r.user.last_login_at,
    },
    created_at: r.created_at,
  }));

  return paginatedResponse(data, total, page, pageSize);
}

/** POST /api/v1/employees — create employee + linked user */
export const POST = withPermission("employees.create", async (req) => {
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

  const parsed = createEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parsed.error.flatten());
  }

  const data = parsed.data;

  // Resolve branch_id — prefer the request body, fall back to the
  // acting user's branch_id (so a branch admin can omit it).
  const branch_id = data.branch_id ?? ctx.branch_id ?? null;

  // If a branch was specified, verify it belongs to the current org.
  if (branch_id) {
    const branch = await db.branch.findFirst({
      where: {
        id: branch_id,
        organization_id: ctx.organization_id,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (!branch) {
      return errorResponse("Branch not found in current organization", 404);
    }
  }

  // Email must be unique per org (users.@unique([organization_id, email])).
  const existingUser = await db.user.findFirst({
    where: {
      organization_id: ctx.organization_id,
      email: data.email,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existingUser) {
    return errorResponse(
      "A user with this email already exists in the organization",
      409,
    );
  }

  // Resolve role — defaults to "storekeeper" (closest non-teaching staff
  // role per the 8 system RoleCodes). User-provided role_code overrides.
  const roleCode = data.role_code ?? DEFAULT_EMPLOYEE_ROLE;
  const role = await db.role.findFirst({
    where: {
      organization_id: ctx.organization_id,
      code: roleCode,
      deleted_at: null,
    },
    select: { id: true, code: true },
  });
  if (!role) {
    return errorResponse(
      `Role '${roleCode}' not found in current organization`,
      422,
      {
        hint: `Provide a valid 'role_code' or omit it to default to '${DEFAULT_EMPLOYEE_ROLE}'.`,
      },
    );
  }

  // Generate employee code + temp password.
  const employee_code = await nextEmployeeCode(ctx.organization_id);
  const tempPassword = data.temp_password ?? generateTempPassword();
  const password_hash = await hashPassword(tempPassword);

  // Avatar initials (2-char uppercased) — same convention as seed.ts.
  const avatar_initial = data.name.trim().slice(0, 2).toUpperCase() || null;

  // Parse joining_date — Employee.joined_at is @db.Date (no time).
  const joinedAtDate = new Date(data.joining_date);
  if (Number.isNaN(joinedAtDate.getTime())) {
    return errorResponse("Invalid joining_date — must be ISO 8601", 400);
  }

  try {
    // Create User + Employee in a transaction so a failure in either
    // step rolls both back (avoids orphaned User rows with no Employee
    // profile, and vice-versa).
    const created = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          organization_id: ctx.organization_id,
          branch_id: branch_id,
          role_id: role.id,
          name: data.name,
          name_bn: data.name_bn ?? null,
          email: data.email,
          phone: data.phone,
          password_hash,
          avatar_initial,
          status: "active",
          mfa_enabled: false,
          created_by: ctx.user_id,
        },
        select: { id: true },
      });

      const employee = await tx.employee.create({
        data: {
          organization_id: ctx.organization_id,
          branch_id: branch_id,
          user_id: user.id,
          employee_code,
          designation: data.designation,
          joined_at: joinedAtDate,
          salary: data.salary ?? null,
          status: "active",
          phone: data.phone,
          created_by: ctx.user_id,
        },
        select: {
          id: true,
          employee_code: true,
          designation: true,
          department: true,
          joined_at: true,
          salary: true,
          status: true,
          phone: true,
          photo_url: true,
          created_at: true,
        },
      });

      return { user_id: user.id, employee };
    });

    return successResponse(
      {
        id: created.employee.id,
        user_id: created.user_id,
        employee_code: created.employee.employee_code,
        name: data.name,
        name_bn: data.name_bn ?? null,
        email: data.email,
        designation: created.employee.designation,
        department: created.employee.department,
        phone: created.employee.phone,
        salary: created.employee.salary
          ? Number(created.employee.salary)
          : null,
        joined_at: created.employee.joined_at,
        status: created.employee.status,
        branch_id: branch_id,
        role_code: role.code,
        // One-time view of the plaintext temp password — NOT persisted
        // in plaintext anywhere. The admin must hand it to the new
        // employee out-of-band (SRS §6.2.3 R-S3: never logged, never
        // returned by any other endpoint).
        temp_password: tempPassword,
        created_at: created.employee.created_at,
      },
      "Employee created",
    );
  } catch (err: unknown) {
    // Prisma P2002 — unique constraint violation (e.g. another request
    // raced us to the same employee_code or email).
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return errorResponse(
        "Employee code or email collision — please retry",
        409,
      );
    }
    throw err;
  }
});
