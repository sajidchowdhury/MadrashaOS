/**
 * MadrashaOS — Employee Password Reset API
 *
 * POST /api/v1/employees/:id/reset-password
 *   Generates a new temp password for the employee's linked User account,
 *   hashes it, saves it, and returns the plaintext ONCE.
 *   Permission: employees.create (same as creating an employee)
 *
 *   The old password is immediately invalidated — the employee must use
 *   the new temp password to log in. The admin should hand it to the
 *   employee out-of-band.
 */

import { db } from "@/lib/db";
import { getTenantContext, tenantWhere } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { errorResponse, successResponse } from "@/lib/api/helpers";
import { hashPassword, generateTempPassword } from "@/lib/auth/password";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withPermission(
  "employees.create",
  async (_req: Request, ctx: RouteContext) => {
    const tenantCtx = await getTenantContext();
    if (!tenantCtx) return errorResponse("Unauthorized", 401);
    const { id } = await ctx.params;

    // Find the employee + its linked User
    const employee = await db.employee.findFirst({
      where: {
        id,
        ...tenantWhere(tenantCtx),
        deleted_at: null,
      },
      select: {
        id: true,
        employee_code: true,
        user_id: true,
        user: {
          select: { id: true, name: true, email: true, status: true },
        },
      },
    });
    if (!employee) {
      return errorResponse("Employee not found", 404);
    }

    // Generate new temp password
    const tempPassword = generateTempPassword();
    const password_hash = await hashPassword(tempPassword);

    // Update the user's password hash
    await db.user.update({
      where: { id: employee.user_id },
      data: { password_hash },
    });

    // Audit log (best-effort)
    try {
      await db.auditLog.create({
        data: {
          organization_id: tenantCtx.organization_id,
          actor_user_id: tenantCtx.user_id,
          action: "employee.reset_password",
          entity_type: "employees",
          entity_id: employee.id,
          metadata: {
            employee_name: employee.user.name,
            employee_email: employee.user.email,
          },
        } as never,
      });
    } catch {
      // Non-fatal
    }

    return successResponse(
      {
        employee_id: employee.id,
        employee_name: employee.user.name,
        employee_code: employee.employee_code,
        email: employee.user.email,
        temp_password: tempPassword,
      },
      `Password reset for ${employee.user.name}. New temp password shown below — hand it to the employee.`,
    );
  },
);
