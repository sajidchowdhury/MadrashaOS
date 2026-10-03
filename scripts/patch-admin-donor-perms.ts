/**
 * MadrashaOS — Patch: grant donor/donation + security permissions to administrator role
 *
 * One-off script that upserts the missing role_permissions for the
 * `administrator` role so:
 *   - POST /api/v1/donors stops returning 403
 *   - GET /api/v1/security/policy stops returning 403
 *
 * Run: bun run scripts/patch-admin-donor-perms.ts
 */
import { PrismaClient } from "../src/generated/prisma";

const db = new PrismaClient();

const PERMS_TO_ADD = [
  "donations.view",
  "donations.create",
  "donors.view",
  "donors.create",
  "security.policy.edit",
];

async function main() {
  const role = await db.role.findFirst({ where: { code: "administrator" } });
  if (!role) {
    console.error("❌ administrator role not found");
    process.exit(1);
  }

  let added = 0;
  for (const code of PERMS_TO_ADD) {
    const perm = await db.permission.findUnique({ where: { code } });
    if (!perm) {
      console.warn(`⚠️  permission ${code} not found in DB — skipping`);
      continue;
    }
    await db.rolePermission.upsert({
      where: { role_id_permission_id: { role_id: role.id, permission_id: perm.id } },
      update: {},
      create: {
        role_id: role.id,
        permission_id: perm.id,
        organization_id: role.organization_id,
      } as never,
    });
    added++;
    console.log(`  ✅ granted ${code} to administrator`);
  }
  console.log(`\nDone — ${added} permission(s) ensured for administrator.`);

  // Invalidate the in-process permission cache so the next API request
  // picks up the new permissions immediately (without waiting for the
  // 5s TTL in auth/config.ts).
  const g = globalThis as unknown as { __madrashaUserPermCache?: Map<string, unknown> };
  if (g.__madrashaUserPermCache) {
    g.__madrashaUserPermCache.clear();
    console.log("  ✅ cleared in-process permission cache");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
