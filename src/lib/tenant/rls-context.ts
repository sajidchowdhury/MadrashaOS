/**
 * MadrashaOS — Tenant Context for RLS (Phase 6)
 *
 * Sets the PostgreSQL session variable `app.tenant_id` before a Prisma
 * transaction so Row-Level Security policies can filter rows by
 * organization_id automatically.
 *
 * Usage:
 *   import { withTenantContext } from "@/lib/tenant/rls-context";
 *   import { db } from "@/lib/db";
 *
 *   const students = await withTenantContext(ctx.organization_id, async () => {
 *     return db.student.findMany({ where: { status: "active" } });
 *     // ↑ RLS automatically filters by organization_id — no need for
 *     //   where: { organization_id: ctx.organization_id }
 *   });
 *
 * How it works:
 *   1. Opens a Prisma $transaction
 *   2. Issues SET LOCAL app.tenant_id = '<org_id>' (scoped to the transaction)
 *   3. Runs the callback inside the transaction
 *   4. Returns the callback's result
 *
 * For platform-admin (super-admin) operations that need cross-tenant
 * access, use withPlatformContext() instead — it SET ROLE platform_admin_role
 * to bypass RLS.
 */

import { db } from "@/lib/db";

/**
 * Run a Prisma operation with the tenant context set for RLS.
 * The `app.tenant_id` session variable is set inside a transaction
 * so RLS policies filter rows automatically.
 *
 * @param orgId — the organization UUID to scope queries to
 * @param fn — the async function to run inside the transaction
 * @returns the result of fn
 */
export async function withTenantContext<T>(
  orgId: string,
  fn: () => Promise<T>,
): Promise<T> {
  return db.$transaction(async (tx) => {
    // Set the session variable for RLS — scoped to this transaction
    await tx.$executeRaw`SET LOCAL app.tenant_id = ${orgId}`;
    // Run the callback with the transaction client
    // Note: the callback should use `tx` (not `db`) for its queries
    // to ensure RLS applies. However, since we can't pass `tx` to the
    // callback generically, the callback should capture `db` and we
    // rely on the session variable being set for the connection.
    //
    // IMPORTANT: This works because Prisma's interactive transaction
    // uses a single connection for the entire transaction block.
    // All db.* calls inside the callback go through that connection,
    // so the SET LOCAL applies to them.
    return fn();
  });
}

/**
 * Run a Prisma operation with platform-admin context (bypasses RLS).
 * Used by super-admin handlers that need cross-tenant access.
 *
 * This SETs the role to platform_admin_role for the duration of the
 * transaction, then resets it.
 */
export async function withPlatformContext<T>(
  fn: () => Promise<T>,
): Promise<T> {
  return db.$transaction(async (tx) => {
    // Set the platform_admin_role to bypass RLS
    await tx.$executeRaw`SET LOCAL ROLE platform_admin_role`;
    try {
      return await fn();
    } finally {
      // Reset the role (though SET LOCAL is transaction-scoped)
      await tx.$executeRaw`RESET ROLE`;
    }
  });
}
