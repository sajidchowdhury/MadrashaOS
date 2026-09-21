/**
 * MadrashaOS — Database Connection Verification
 *
 * Session B0.1 — PostgreSQL Setup + Connection
 *
 * Run this script to verify that:
 *   1. PostgreSQL is running (via Docker)
 *   2. The DATABASE_URL environment variable is set
 *   3. Prisma can connect to the database
 *   4. A simple query executes successfully
 *
 * Usage: bun run scripts/verify-db.ts
 */

import { PrismaClient } from "../src/generated/prisma";

async function main() {
  console.log("══════════════════════════════════════════════════");
  console.log("  MadrashaOS — Database Verification (B0.1)");
  console.log("══════════════════════════════════════════════════");
  console.log("");

  // 1. Check DATABASE_URL
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL is not set");
    console.error("   Create a .env file with: DATABASE_URL=postgresql://...");
    process.exit(1);
  }
  console.log(`✓ DATABASE_URL: ${dbUrl.replace(/:[^:@]+@/, ":***@")}`);

  // 2. Connect
  const prisma = new PrismaClient();
  console.log("⏳ Connecting to PostgreSQL...");

  try {
    await prisma.$connect();
    console.log("✓ Connected successfully");
    console.log("");

    // 3. Run a simple query
    const result = await prisma.$queryRaw`SELECT version() as version, NOW() as timestamp`;
    const row = (result as Array<{ version: string; timestamp: Date }>)[0];
    console.log("✅ PostgreSQL Version:");
    console.log(`   ${row.version}`);
    console.log("");
    console.log("✅ Current Timestamp:");
    console.log(`   ${row.timestamp.toISOString()}`);
    console.log("");

    // 4. List tables (should be empty or have only _prisma_migrations)
    const tables = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    ` as Array<{ tablename: string }>;
    console.log(`✅ Tables in 'public' schema (${tables.length}):`);
    for (const t of tables) {
      console.log(`   - ${t.tablename}`);
    }

    console.log("");
    console.log("══════════════════════════════════════════════════");
    console.log("  ✅ Database verification PASSED");
    console.log("══════════════════════════════════════════════════");
  } catch (error) {
    console.error("");
    console.error("❌ Database verification FAILED");
    console.error("");
    console.error("Error:", error instanceof Error ? error.message : String(error));
    console.error("");
    console.error("Troubleshooting:");
    console.error("  1. Is Docker running?   → docker ps");
    console.error("  2. Is PostgreSQL up?     → bun run db:up");
    console.error("  3. Is .env configured?   → check DATABASE_URL");
    console.error("  4. View logs:           → bun run db:logs");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
