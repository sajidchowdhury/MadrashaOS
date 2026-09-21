/**
 * MadrashaOS — Single Employee API
 *
 * Phase B4.4 — People Layer: Employee API
 *
 * GET    /api/v1/employees/:id  — single employee info + linked user
 * PATCH  /api/v1/employees/:id  — update employee fields
 * DELETE /api/v1/employees/:id  — soft delete (sets status='resigned'
 *                                 + deleted_at; also DISABLES the linked
 *                                 User account so resigned staff cannot
 *                                 log in per SRS §2.2.6)
 *
 * Tenant scoping:
 *   - Every query filters by `organization_id` from the session.
 *   - Branch-scoped roles (administrator/accountant/teacher/storekeeper)
 *     only see employees in their own branch.
 *   - Authority (org-level) + super-admin see all branches in their org.
 *
 * Permission gate:
 *   - GET    → employees.view
 *   - PATCH  → employees.create (same as POST — the create permission
 *             doubles as the write permission per the BACKEND plan)
 *   - DELETE → employees.create
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { updateEmployeeSchema } from "@/lib/validation/schemas";
import {
  jsonResponse,
  errorResponse,
  successResponse,
} from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

/**
 * Builds a tenant-scoped Prisma `where` clause fragment for a single
 * Employee lookup. Branch roles (non-authority, non-super-admin) get
 * a branch_id constraint so they can't read across branches.
 */
function employeeWhere(
  ctx: NonNullable<Awaited<ReturnType<typeof getTenantContext>>>,
  id: string,
): { id: string; organization_id: string; deleted_at: null; branch_id?: string } {
  const where: {
    id: string;
    organization_id: string;
    deleted_at: null;
    branch_id?: string;
  } = {
    id,
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

  return where;
}

/** GET /api/v1/employees/:id */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) {
    return errorResponse("Unauthorized", 401);
  }

  const { id } = await ctx.params;

  const employee = await db.employee.findFirst({
    where: employeeWhere(tenantCtx, id),
    select: {
      id: true,
      employee_code: true,
      designation: true,
      department: true,
      joined_at: true,
      left_at: true,
      salary: true,
      status: true,
      phone: true,
      nid_number: true,
      photo_url: true,
      created_at: true,
      updated_at: true,
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
          avatar_initial: true,
          mfa_enabled: true,
          last_login_at: true,
          last_login_ip: true,
          role: {
            select: { id: true, code: true, name: true },
          },
        },
      },
    },
  });

  if (!employee) {
    return errorResponse("Employee not found", 404);
  }

  return jsonResponse({
    id: employee.id,
    employee_code: employee.employee_code,
    name: employee.user.name,
    name_bn: employee.user.name_bn,
    email: employee.user.email,
    designation: employee.designation,
    department: employee.department,
    phone: employee.phone ?? employee.user.phone,
    salary: employee.salary ? Number(employee.salary) : null,
    joined_at: employee.joined_at,
    left_at: employee.left_at,
    status: employee.status,
    nid_number: employee.nid_number,
    photo_url: employee.photo_url,
    branch: employee.branch,
    user: {
      id: employee.user.id,
      status: employee.user.status,
      avatar_url: employee.user.avatar_url,
      avatar_initial: employee.user.avatar_initial,
      mfa_enabled: employee.user.mfa_enabled,
      last_login_at: employee.user.last_login_at,
      last_login_ip: employee.user.last_login_ip,
      role: employee.user.role,
    },
    created_at: employee.created_at,
    updated_at: employee.updated_at,
  });
}

/** PATCH /api/v1/employees/:id */
export const PATCH = withPermission(
  "employees.create",
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

    const parsed = updateEmployeeSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.flatten());
    }

    const data = parsed.data;

    // Verify the employee exists in the current tenant scope.
    const existing = await db.employee.findFirst({
      where: employeeWhere(tenantCtx, id),
      select: {
        id: true,
        user_id: true,
        organization_id: true,
        branch_id: true,
      },
    });
    if (!existing) {
      return errorResponse("Employee not found", 404);
    }

    // If branch_id is being changed, verify the new branch belongs to
    // the current org. Allow null (unassign from a branch).
    if (data.branch_id !== undefined && data.branch_id !== null) {
      const branch = await db.branch.findFirst({
        where: {
          id: data.branch_id,
          organization_id: tenantCtx.organization_id,
          deleted_at: null,
        },
        select: { id: true },
      });
      if (!branch) {
        return errorResponse(
          "Branch not found in current organization",
          404,
        );
      }
    }

    // Email uniqueness check — if email is being changed, ensure no
    // other user in the org already has it.
    if (data.email !== undefined) {
      const emailCollision = await db.user.findFirst({
        where: {
          organization_id: tenantCtx.organization_id,
          email: data.email,
          id: { not: existing.user_id },
          deleted_at: null,
        },
        select: { id: true },
      });
      if (emailCollision) {
        return errorResponse(
          "A user with this email already exists in the organization",
          409,
        );
      }
    }

    // Split the patch into User-side and Employee-side fields.
    const userUpdate: {
      name?: string;
      name_bn?: string | null;
      email?: string;
      phone?: string | null;
      updated_by?: string;
    } = {};

    const employeeUpdate: {
      designation?: string;
      phone?: string | null;
      salary?: number;
      joined_at?: Date;
      branch_id?: string | null;
      department?: string | null;
      nid_number?: string | null;
      photo_url?: string | null;
      status?: string;
      left_at?: Date | null;
      updated_by?: string;
    } = {};

    if (data.name !== undefined) userUpdate.name = data.name;
    if (data.name_bn !== undefined) userUpdate.name_bn = data.name_bn ?? null;
    if (data.email !== undefined) userUpdate.email = data.email;
    if (data.phone !== undefined) {
      userUpdate.phone = data.phone;
      employeeUpdate.phone = data.phone;
    }
    if (data.designation !== undefined)
      employeeUpdate.designation = data.designation;
    if (data.salary !== undefined) employeeUpdate.salary = data.salary;
    if (data.joining_date !== undefined) {
      const d = new Date(data.joining_date);
      if (Number.isNaN(d.getTime())) {
        return errorResponse(
          "Invalid joining_date — must be ISO 8601",
          400,
        );
      }
      employeeUpdate.joined_at = d;
    }
    if (data.branch_id !== undefined)
      employeeUpdate.branch_id = data.branch_id;
    if (data.department !== undefined)
      employeeUpdate.department = data.department;
    if (data.nid_number !== undefined)
      employeeUpdate.nid_number = data.nid_number;
    if (data.photo_url !== undefined)
      employeeUpdate.photo_url = data.photo_url;
    if (data.status !== undefined) {
      employeeUpdate.status = data.status;
      // Set left_at when transitioning to "resigned" (if not already set).
      if (data.status === "resigned") {
        employeeUpdate.left_at = new Date();
      }
    }

    try {
      const updated = await db.$transaction(async (tx) => {
        if (Object.keys(userUpdate).length > 0) {
          userUpdate.updated_by = tenantCtx.user_id;
          await tx.user.update({
            where: { id: existing.user_id },
            data: userUpdate,
          });
        }
        employeeUpdate.updated_by = tenantCtx.user_id;
        return tx.employee.update({
          where: { id },
          data: employeeUpdate,
          select: {
            id: true,
            employee_code: true,
            designation: true,
            department: true,
            joined_at: true,
            left_at: true,
            salary: true,
            status: true,
            phone: true,
            nid_number: true,
            photo_url: true,
            updated_at: true,
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
                updated_at: true,
              },
            },
          },
        });
      });

      return successResponse(
        {
          id: updated.id,
          employee_code: updated.employee_code,
          name: updated.user.name,
          name_bn: updated.user.name_bn,
          email: updated.user.email,
          designation: updated.designation,
          department: updated.department,
          phone: updated.phone ?? updated.user.phone,
          salary: updated.salary ? Number(updated.salary) : null,
          joined_at: updated.joined_at,
          left_at: updated.left_at,
          status: updated.status,
          nid_number: updated.nid_number,
          photo_url: updated.photo_url,
          branch: updated.branch,
          user: {
            id: updated.user.id,
            status: updated.user.status,
          },
          updated_at: updated.updated_at,
        },
        "Employee updated",
      );
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        return errorResponse(
          "Email already in use by another user in this organization",
          409,
        );
      }
      throw err;
    }
  },
);

/** DELETE /api/v1/employees/:id — soft delete + disable linked User */
export const DELETE = withPermission(
  "employees.create",
  async (
    _req: Request,
    ctx: { params: Promise<{ id: string }> },
  ) => {
    const tenantCtx = await getTenantContext();
    if (!tenantCtx) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await ctx.params;

    const existing = await db.employee.findFirst({
      where: employeeWhere(tenantCtx, id),
      select: {
        id: true,
        user_id: true,
        status: true,
        deleted_at: true,
      },
    });
    if (!existing) {
      return errorResponse("Employee not found", 404);
    }

    // Idempotent — if already soft-deleted, return success without
    // re-writing (matches the branches DELETE behavior on re-invocation).
    if (existing.deleted_at) {
      return successResponse(null, "Employee already deleted (soft)");
    }

    // Soft delete the Employee AND disable the linked User account so
    // the resigned staff member cannot log in (per SRS §2.2.6).
    // Run both updates in a transaction so partial failures (e.g. DB
    // connection drop between the two writes) leave neither row in
    // an inconsistent state.
    const now = new Date();
    await db.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id },
        data: {
          status: "resigned",
          left_at: now,
          deleted_at: now,
          updated_by: tenantCtx.user_id,
        },
      });

      await tx.user.update({
        where: { id: existing.user_id },
        data: {
          status: "disabled",
          updated_by: tenantCtx.user_id,
        },
      });
    });

    return successResponse(
      {
        id,
        status: "resigned",
        deleted_at: now,
        user_disabled: true,
      },
      "Employee resigned; linked user account disabled (cannot log in)",
    );
  },
);
