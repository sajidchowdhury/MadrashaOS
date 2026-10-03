/**
 * MadrashaOS — Backup API (Session 8.4, rewritten cross-platform)
 *
 * GET  /api/v1/backup — list backup records (perm: backup.run)
 * POST /api/v1/backup — run a manual backup (perm: backup.run)
 *
 * The POST handler creates a backup by:
 *   1. Querying all Prisma tables (tenant-scoped)
 *   2. Serializing to JSON
 *   3. Compressing with Node's built-in zlib (gzip)
 *   4. Writing a .json.gz file to backups/
 *   5. Computing SHA256 with Node's built-in crypto
 *
 * This is cross-platform (Windows / Linux / macOS) — does NOT depend on
 * pg_dump, gzip, sha256sum, or cut being installed on the host.
 *
 * In production, you can also use pg_dump via scripts/backup.sh on Linux,
 * but this API endpoint works everywhere without external binaries.
 */

import { db } from "@/lib/db";
import { getTenantContext, tenantWhere } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse, parsePagination } from "@/lib/api/helpers";
import { mkdir, writeFile, stat } from "fs/promises";
import { join } from "path";
import { gzipSync } from "zlib";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

const BACKUP_DIR = join(process.cwd(), "backups");

/**
 * All Prisma model names (from prisma/schema.prisma).
 * Used to iterate over every table for the JSON dump.
 *
 * NOTE: keep this in sync with the schema when adding new models.
 */
const ALL_MODELS = [
  "organization", "branch", "user", "role", "permission", "rolePermission",
  "auditLog", "moduleConfig", "securityPolicy", "backupRecord",
  "class", "section", "student", "guardian", "studentGuardian",
  "teacher", "employee", "employeeAdvance", "payrollRecord", "admission",
  "teacherAssignment", "subject", "routine", "attendanceSession", "attendanceRecord",
  "exam", "mark", "result", "studentHistory",
  "account", "feePlan", "feeInstallment", "feePayment", "scholarship",
  "ledgerEntry", "cashBankTransfer", "zakatTransaction",
  "donation", "donor", "donorPledge",
  "inventoryItem", "inventorySale", "purchase", "purchaseItem", "supplier",
  "asset", "hostelRoom", "hostelBed", "mealPlan",
  "libraryBook", "libraryIssue", "vehicle", "fuelLog",
  "notice", "document", "report", "approval", "idempotencyRecord",
] as const;

/** GET /api/v1/backup — list backup records */
export const GET = withPermission("backup.run", async (req: Request) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);

  const where = {
    organization_id: ctx.organization_id,
    deleted_at: null,
  };

  const [backups, total] = await Promise.all([
    db.backupRecord.findMany({
      where,
      orderBy: { started_at: "desc" },
      skip,
      take,
    }),
    db.backupRecord.count({ where }),
  ]);

  return jsonResponse({
    data: backups.map((b) => ({
      id: b.id,
      backup_type: b.backup_type,
      status: b.status,
      size_bytes: b.size_bytes ? Number(b.size_bytes) : null,
      storage_url: b.storage_url,
      triggered_by: b.triggered_by,
      started_at: b.started_at,
      completed_at: b.completed_at,
      error_message: b.error_message,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
});

/** POST /api/v1/backup — run a manual backup (cross-platform, no pg_dump) */
export const POST = withPermission("backup.run", async () => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  // Create backup directory if it doesn't exist
  await mkdir(BACKUP_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `madrashaos_${timestamp}.json.gz`;
  const filepath = join(BACKUP_DIR, filename);

  // Create a BackupRecord (status: running)
  const record = await db.backupRecord.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      backup_type: "manual",
      status: "running",
      triggered_by: ctx.user_id ?? null,
      started_at: new Date(),
      created_by: ctx.user_id ?? null,
    } as never,
  });

  try {
    // --- Dump all tables via Prisma (tenant-scoped where applicable) ---
    const dump: Record<string, unknown[]> = {};
    const tenantScoped = tenantWhere(ctx);
    let totalRows = 0;

    for (const modelName of ALL_MODELS) {
      // db is typed; cast to allow dynamic model access
      const model = (db as Record<string, { findMany?: (args?: unknown) => Promise<unknown[]> } | undefined>)[modelName];
      if (!model || typeof model.findMany !== "function") continue;

      // Tenant-scoped tables get a where clause; others (organization, branch,
      // role, permission) are global reference data and should be included
      // without org filtering.
      const isTenantScoped =
        modelName !== "organization" &&
        modelName !== "branch" &&
        modelName !== "role" &&
        modelName !== "permission" &&
        modelName !== "idempotencyRecord";

      const where = isTenantScoped
        ? { organization_id: ctx.organization_id }
        : {};

      const rows = await model.findMany({ where, take: 10000 });
      dump[modelName] = rows;
      totalRows += rows.length;
    }

    // --- Serialize + compress (cross-platform: no external gzip) ---
    // Prisma returns BigInt (for BigInt columns) and Decimal (for Decimal
    // columns) which JSON.stringify can't handle by default. Use a custom
    // replacer that converts them to strings (preserving precision).
    const jsonSafeReplacer = (_key: string, value: unknown): unknown => {
      if (typeof value === "bigint") return value.toString();
      if (value && typeof value === "object" && "toString" in value) {
        // Prisma Decimal objects expose a toString() → "123.45"
        const proto = Object.getPrototypeOf(value);
        const ctorName = proto?.constructor?.name ?? "";
        if (ctorName === "PrismaDecimal" || ctorName === "Decimal") {
          return String(value);
        }
      }
      if (value instanceof Date) return value.toISOString();
      return value;
    };

    const jsonStr = JSON.stringify(
      {
        _meta: {
          version: 1,
          format: "madrashaos-json-dump",
          exported_at: new Date().toISOString(),
          organization_id: ctx.organization_id,
          branch_id: ctx.branch_id,
          row_count: totalRows,
          table_count: Object.keys(dump).length,
        },
        data: dump,
      },
      jsonSafeReplacer,
      0, // no pretty-print → smaller file
    );

    const compressed = gzipSync(Buffer.from(jsonStr, "utf-8"));
    await writeFile(filepath, compressed);

    // Get file size
    const stats = await stat(filepath);
    const sizeBytes = BigInt(stats.size);

    // Compute SHA256 (cross-platform: uses Node's crypto, not sha256sum)
    const hash = createHash("sha256").update(compressed).digest("hex");

    // Update the record
    const updated = await db.backupRecord.update({
      where: { id: record.id },
      data: {
        status: "completed",
        size_bytes: sizeBytes,
        storage_url: `/api/v1/backup/${record.id}/download`,
        storage_type: "local",
        checksum_sha256: hash,
        completed_at: new Date(),
        updated_by: ctx.user_id ?? null,
      } as never,
    });

    // Audit log
    await db.auditLog.create({
      data: {
        organization_id: ctx.organization_id,
        branch_id: ctx.branch_id ?? null,
        entity_type: "backup_records",
        entity_id: record.id,
        action: "create",
        old_values: null,
        new_values: {
          filename,
          size_bytes: Number(sizeBytes),
          row_count: totalRows,
          tables: Object.keys(dump).length,
          status: "completed",
          format: "json-gz",
        } as never,
        actor_user_id: ctx.user_id,
      } as never,
    });

    const sizeMB = (Number(sizeBytes) / 1_000_000).toFixed(2);
    return successResponse(
      {
        id: updated.id,
        filename,
        size_bytes: Number(sizeBytes),
        row_count: totalRows,
        tables: Object.keys(dump).length,
        status: "completed",
        storage_url: `/backups/${filename}`,
        format: "json-gz",
        message: `Backup completed — ${filename} (${sizeMB} MB, ${totalRows} rows from ${Object.keys(dump).length} tables)`,
      },
      "Backup completed successfully",
    );
  } catch (err) {
    // Mark the record as failed
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    await db.backupRecord.update({
      where: { id: record.id },
      data: {
        status: "failed",
        error_message: errMsg,
        completed_at: new Date(),
      } as never,
    });

    return errorResponse(`Backup failed: ${errMsg}`, 500);
  }
});
