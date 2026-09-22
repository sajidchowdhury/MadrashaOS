/**
 * MadrashaOS — Role Permission Verification Endpoint
 *
 * Task B2.4 — 8 Roles + Permissions Seeded (verification)
 *
 * GET /api/v1/auth/verify-roles
 *
 * Dev-only endpoint that verifies the B1.4 seed script correctly seeded
 * all 8 roles + 110+ permissions + RolePermission junction rows.
 *
 * Returns a per-role table of permission counts alongside the expected
 * count from `src/lib/auth/role-permissions.ts` (single source of truth).
 *
 * Response 200:
 *   {
 *     "total_permissions": 110,
 *     "total_role_permission_links": 207,
 *     "roles": [
 *       { "code": "super-admin", "perm_count": 27, "expected": 27, "ok": true },
 *       { "code": "authority", "perm_count": 47, "expected": 47, "ok": true },
 *       ...
 *     ],
 *     "expected_totals": {
 *       "super-admin": 27, "authority": 47, "administrator": 58,
 *       "accountant": 32, "teacher": 13, "storekeeper": 12,
 *       "guardian": 11, "student": 7
 *     }
 *   }
 *
 * Note: This endpoint intentionally bypasses the standard session check
 * — it lives under /api/v1 so the middleware DOES require a session.
 * To verify the seed without a session, the dev can hit the DB directly
 * via Prisma Studio or run `bunx prisma db seed` + look at the logs.
 *
 * The route itself does NOT call getSession — it relies entirely on the
 * middleware (which gates /api/v1/* on a session) for the auth check.
 */

import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { ROLE_PERMISSIONS } from "@/lib/auth/role-permissions";
import type { Role } from "@/stores/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Expected counts per role (from src/lib/auth/role-permissions.ts). */
const EXPECTED: Record<Role, number> = {
  "super-admin": ROLE_PERMISSIONS["super-admin"].length,
  authority: ROLE_PERMISSIONS.authority.length,
  administrator: ROLE_PERMISSIONS.administrator.length,
  accountant: ROLE_PERMISSIONS.accountant.length,
  teacher: ROLE_PERMISSIONS.teacher.length,
  storekeeper: ROLE_PERMISSIONS.storekeeper.length,
  guardian: ROLE_PERMISSIONS.guardian.length,
  student: ROLE_PERMISSIONS.student.length,
};

export async function GET() {
  // Aggregate permission counts per role.
  //
  // We use Prisma's groupBy + count over the role_permissions junction,
  // joined via the role.code lookup.
  const roles = await db.role.findMany({
    where: { deleted_at: null },
    select: {
      code: true,
      _count: { select: { role_permissions: { where: { deleted_at: null } } } },
    },
  });

  // Aggregate total permission catalog + total junction rows.
  const [totalPerms, totalLinks] = await Promise.all([
    db.permission.count({ where: { deleted_at: null } }),
    db.rolePermission.count({ where: { deleted_at: null } }),
  ]);

  const roleRows = roles.map((r) => {
    const code = r.code as Role;
    const expected = EXPECTED[code] ?? 0;
    const got = r._count.role_permissions;
    return {
      code: r.code,
      perm_count: got,
      expected,
      ok: got === expected,
    };
  });

  // Sort by the canonical role order for readability.
  const roleOrder: Role[] = [
    "super-admin",
    "authority",
    "administrator",
    "accountant",
    "teacher",
    "storekeeper",
    "guardian",
    "student",
  ];
  roleRows.sort((a, b) => {
    const ai = roleOrder.indexOf(a.code as Role);
    const bi = roleOrder.indexOf(b.code as Role);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const allOk = roleRows.every((r) => r.ok);

  return NextResponse.json({
    ok: allOk,
    total_permissions: totalPerms,
    total_role_permission_links: totalLinks,
    roles: roleRows,
    expected_totals: EXPECTED,
    checked_at: new Date().toISOString(),
  });
}
