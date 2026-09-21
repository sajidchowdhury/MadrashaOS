/**
 * MadrashaOS — Backup API (Session 8.4)
 *
 * GET  /api/v1/backup — list backup records (perm: backup.run)
 * POST /api/v1/backup — run a manual pg_dump backup (perm: backup.run)
 *
 * The POST handler executes pg_dump via child_process.exec, stores the
 * .sql.gz file in backups/, and creates a BackupRecord row.
 *
 * In production, use a cron job + pg_dump (see scripts/backup.sh).
 * This API endpoint is for manual/on-demand backups from the UI.
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse, parsePagination } from "@/lib/api/helpers";
import { exec } from "child_process";
import { promisify } from "util";
import { mkdir, stat } from "fs/promises";
import { join } from "path";
import { createHash } from "crypto";

const execAsync = promisify(exec);

export const dynamic = "force-dynamic";

const BACKUP_DIR = join(process.cwd(), "backups");

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

/** POST /api/v1/backup — run a manual backup */
export const POST = withPermission("backup.run", async () => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  // Create backup directory if it doesn't exist
  await mkdir(BACKUP_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `madrashaos_${timestamp}.sql.gz`;
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
    // Execute pg_dump (DATABASE_URL is read from env)
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL not set");

    // Use pg_dump with gzip compression
    const cmd = `pg_dump "${dbUrl}" | gzip > "${filepath}"`;
    await execAsync(cmd, { timeout: 120000 }); // 2 min timeout

    // Get file size
    const stats = await stat(filepath);
    const sizeBytes = BigInt(stats.size);

    // Compute SHA256 checksum
    const { exec } = await import("child_process");
    const { stdout: hash } = await promisify(exec)(`sha256sum "${filepath}" | cut -d' ' -f1`);

    // Update the record
    const updated = await db.backupRecord.update({
      where: { id: record.id },
      data: {
        status: "completed",
        size_bytes: sizeBytes,
        storage_url: `/backups/${filename}`,
        storage_type: "local",
        checksum_sha256: hash.trim() || null,
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
        new_values: { filename, size_bytes: Number(sizeBytes), status: "completed" } as never,
        actor_user_id: ctx.user_id,
      } as never,
    });

    return successResponse(
      {
        id: updated.id,
        filename,
        size_bytes: Number(sizeBytes),
        status: "completed",
        storage_url: `/backups/${filename}`,
        message: `Backup completed — ${filename} (${(Number(sizeBytes) / 1_000_000).toFixed(1)} MB)`,
      },
      "Backup completed successfully",
    );
  } catch (err) {
    // Mark the record as failed
    await db.backupRecord.update({
      where: { id: record.id },
      data: {
        status: "failed",
        error_message: err instanceof Error ? err.message : "Unknown error",
        completed_at: new Date(),
      } as never,
    });

    return errorResponse(
      `Backup failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      500,
    );
  }
});
