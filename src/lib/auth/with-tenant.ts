/**
 * MadrashaOS — Multi-Tenant Scoping Helper
 *
 * Task B2.2 — Permission Middleware
 *
 * Provides a `getTenantContext()` helper that returns the current
 * session's organization_id + branch_id + user_id so API handlers can
 * scope their Prisma queries to the current tenant.
 *
 * Per SRS §2.1.2 / §6.1 — MadrashaOS is multi-tenant: every Prisma
 * write (and most reads) MUST filter by `organization_id`. The branch
 * scope is optional for super-admin / authority roles (they can switch
 * branches at runtime) — see `organization.branch.switch` permission.
 *
 * Usage:
 *   export async function GET() {
 *     const ctx = await getTenantContext();
 *     if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
 *     const students = await db.student.findMany({
 *       where: { organization_id: ctx.organization_id, branch_id: ctx.branch_id },
 *     });
 *     ...
 *   }
 *
 * Note: super-admin has organization_id on their User row but may also
 * need cross-tenant visibility (tenant.provision / tenant.manage).
 * Super-admin handlers should bypass tenant scoping; the helpers below
 * do NOT enforce this — they simply return what the session carries.
 */

import { getServerSession } from "next-auth";

import { authConfig } from "@/lib/auth/config";

/**
 * Tenant context derived from the session JWT.
 * `branch_id` may be null for org-level roles (super-admin, authority).
 */
export interface TenantContext {
  /** UUID of the current organization (always present for non-platform roles). */
  organization_id: string;
  /** UUID of the current branch (null for org-level roles). */
  branch_id: string | null;
  /** UUID of the authenticated user. */
  user_id: string;
  /** Role code (e.g. "administrator", "teacher"). */
  role: string;
  /** Permission codes granted to the current role. */
  permissions: string[];
}

/**
 * Returns the tenant context for the current request, or null if no
 * session exists / the session is MFA-pending.
 *
 * This is a server-only helper — it calls `getServerSession()` which
 * reads the encrypted NextAuth cookie via the Node.js runtime.
 */
export async function getTenantContext(): Promise<TenantContext | null> {
  const session = await getServerSession(authConfig);
  if (!session?.user) return null;
  if (session.user.mfa_pending) return null;
  return {
    organization_id: session.user.organization_id,
    branch_id: session.user.branch_id,
    user_id: session.user.id,
    role: session.user.role,
    permissions: session.user.permissions ?? [],
  };
}

/**
 * Convenience: returns true if the current session has the given permission.
 * Useful for conditional logic inside handlers that already passed the
 * `withPermission` gate but need a finer-grained check (e.g. showing
 * an extra column for users with `students.notes.view`).
 */
export async function hasPermission(code: string): Promise<boolean> {
  const ctx = await getTenantContext();
  if (!ctx) return false;
  return ctx.permissions.includes(code);
}

/**
 * Returns true if the current session is a platform super-admin (SaaS operator).
 * These users live in the "Platform" org and have the `tenant.manage` permission.
 * They are NOT scoped to a single tenant — their handlers must filter by an
 * explicit orgId from the URL.
 */
export async function isPlatformAdmin(): Promise<boolean> {
  const ctx = await getTenantContext();
  if (!ctx) return false;
  return ctx.role === "super-admin";
}

/**
 * Convenience: returns a Prisma `where` clause fragment scoped to the
 * current tenant. Spread it into your handler's query:
 *
 *   const ctx = await getTenantContext();
 *   const students = await db.student.findMany({
 *     where: { ...tenantWhere(ctx), status: "active" },
 *   });
 *
 * Super-admin (role === "super-admin") gets an empty fragment so they
 * see ALL tenants — they have the `tenant.manage` permission per the
 * role-permissions.ts map.
 */
export function tenantWhere(ctx: TenantContext): {
  organization_id: string;
  branch_id?: string | null;
} {
  if (ctx.role === "super-admin") {
    // Phase 0 fix (G2): Super-admin is the PLATFORM OPERATOR (SaaS company).
    // They must see across ALL tenants — return an empty fragment so no
    // org constraint is applied. Platform-admin handlers MUST filter
    // explicitly by a URL-derived orgId (e.g. /api/v1/platform/tenants/:orgId).
    // Returning { organization_id: ctx.organization_id } here was a bug —
    // it constrained super-admin to the "Platform" org only.
    return {} as { organization_id: string; branch_id?: string | null };
  }
  // Authority role may have null branch_id (org-level) — let them see
  // all branches in their org.
  if (ctx.role === "authority" && !ctx.branch_id) {
    return { organization_id: ctx.organization_id };
  }
  return {
    organization_id: ctx.organization_id,
    branch_id: ctx.branch_id,
  };
}
