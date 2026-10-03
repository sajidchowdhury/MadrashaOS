/**
 * MadrashaOS — Backup Restore API
 *
 * POST /api/v1/backup/[id]/restore — restore the DB from a backup file
 * (perm: backup.run)
 *
 * Flow:
 *   1. Verify the backup belongs to the current tenant + is "completed"
 *   2. Read + gunzip + parse the .json.gz file
 *   3. Validate the backup's organization_id matches the current tenant
 *   4. In a single db.$transaction (atomic — all or nothing):
 *      a. DELETE all tenant-scoped rows in REVERSE dependency order
 *         (children before parents; self-ref tables in 2 passes)
 *      b. INSERT rows in FORWARD dependency order (parents before children)
 *         using createMany in batches of 500
 *      c. Write an audit log entry
 *   5. Return a summary (tables restored, rows inserted, duration)
 *
 * Tables that are NEVER touched: permission, idempotencyRecord, backupRecord,
 * auditLog. The organization row is UPSERTED (not deleted + re-inserted).
 *
 * On failure, the transaction rolls back completely and a `restore_failed`
 * audit log entry is written outside the transaction.
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { errorResponse, successResponse } from "@/lib/api/helpers";
import { readFile, stat } from "fs/promises";
import { join, basename } from "path";
import { gunzipSync } from "zlib";
import {
  RESTORE_ORDER, SKIP_DELETE, SKIP_INSERT, UPSERT_MODELS,
  SELF_REF_TABLES, coerceRow, chunk,
} from "@/lib/backup/restore-order";

export const dynamic = "force-dynamic";

const BACKUP_DIR = join(process.cwd(), "backups");
const BATCH_SIZE = 500;

/** A Prisma transaction client with dynamic model access. */
type Tx = typeof db;

export const POST = withPermission("backup.run", async (req: Request) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const startTime = Date.now();

  // Extract the backup id from the URL (.../backup/{id}/restore)
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  const backupId = segments[segments.length - 2]; // .../backup/{id}/restore
  if (!backupId) return errorResponse("Backup id is required", 400);

  // Verify the backup belongs to this tenant
  const backup = await db.backupRecord.findFirst({
    where: {
      id: backupId,
      organization_id: ctx.organization_id,
      deleted_at: null,
    },
    select: { id: true, storage_url: true, status: true, started_at: true, checksum_sha256: true },
  });
  if (!backup) return errorResponse("Backup not found", 404);

  if (backup.status !== "completed") {
    return errorResponse(`Backup is not available (status: ${backup.status})`, 400);
  }

  // Resolve the filename (same logic as the download route)
  let filename: string;
  if (backup.storage_url && backup.storage_url.startsWith("/backups/")) {
    filename = basename(backup.storage_url);
  } else {
    const ts = backup.started_at.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    filename = `madrashaos_${ts}.json.gz`;
  }
  const filepath = join(BACKUP_DIR, filename);

  // Verify the file exists
  try {
    const stats = await stat(filepath);
    if (!stats.isFile()) return errorResponse("Backup file not found on disk", 404);
  } catch {
    return errorResponse("Backup file not found on disk", 404);
  }

  // Read + decompress + parse
  let parsed: { _meta: { version?: number; organization_id?: string }; data: Record<string, unknown[]> };
  try {
    const compressed = await readFile(filepath);
    const jsonBuffer = gunzipSync(compressed);
    parsed = JSON.parse(jsonBuffer.toString("utf-8"));
  } catch {
    return errorResponse("Backup file is corrupt or truncated", 400);
  }

  // Validate backup meta
  if (parsed._meta?.version !== 1) {
    return errorResponse(`Unsupported backup format version: ${parsed._meta?.version ?? "unknown"}`, 400);
  }
  if (parsed._meta.organization_id && parsed._meta.organization_id !== ctx.organization_id) {
    // Don't reveal that another tenant's backup exists — return 404
    return errorResponse("Backup not found", 404);
  }

  // --- Atomic restore transaction ---
  try {
    const result = await db.$transaction(
      async (tx) => {
        let tablesRestored = 0;
        let rowsInserted = 0;
        const skippedTables: string[] = [];

        // 1. DELETE in REVERSE dependency order (children before parents)
        for (const modelName of [...RESTORE_ORDER].reverse()) {
          if (SKIP_DELETE.has(modelName)) {
            skippedTables.push(modelName);
            continue;
          }
          const model = (tx as Record<string, { deleteMany?: (args: unknown) => Promise<unknown> } | undefined>)[modelName];
          if (!model || typeof model.deleteMany !== "function") continue;

          // Self-referential tables: delete children (non-null self-FK) first
          const selfFk = SELF_REF_TABLES[modelName];
          if (selfFk) {
            await model.deleteMany({
              where: { organization_id: ctx.organization_id, [selfFk]: { not: null } },
            });
            await model.deleteMany({
              where: { organization_id: ctx.organization_id, [selfFk]: null },
            });
          } else {
            await model.deleteMany({
              where: { organization_id: ctx.organization_id },
            });
          }
        }

        // 2. INSERT in FORWARD dependency order (parents before children)
        for (const modelName of RESTORE_ORDER) {
          if (SKIP_INSERT.has(modelName)) continue;

          const model = (tx as Record<string, { createMany?: (args: unknown) => Promise<{ count: number }> } | undefined>)[modelName];
          if (!model || typeof model.createMany !== "function") continue;

          const rawRows = parsed.data[modelName] ?? [];
          if (rawRows.length === 0) continue;

          // Upsert single-row tables (organization)
          if (UPSERT_MODELS.has(modelName)) {
            const row = coerceRow(modelName, rawRows[0] as Record<string, unknown>);
            await model.upsert({
              where: { id: row.id },
              create: row,
              update: row,
            });
            tablesRestored++;
            rowsInserted++;
            continue;
          }

          // Self-referential tables: insert parents (null self-FK) first,
          // then children (non-null self-FK)
          const selfFk = SELF_REF_TABLES[modelName];
          let rowsToInsert: Record<string, unknown>[];
          if (selfFk) {
            const nulls = (rawRows as Record<string, unknown>[])
              .filter((r) => !r[selfFk])
              .map((r) => coerceRow(modelName, r));
            const nonNulls = (rawRows as Record<string, unknown>[])
              .filter((r) => !!r[selfFk])
              .map((r) => coerceRow(modelName, r));
            rowsToInsert = [...nulls, ...nonNulls];
          } else {
            rowsToInsert = (rawRows as Record<string, unknown>[])
              .map((r) => coerceRow(modelName, r));
          }

          // Bulk insert in batches
          for (const batch of chunk(rowsToInsert, BATCH_SIZE)) {
            const created = await model.createMany({ data: batch, skipDuplicates: false });
            rowsInserted += Number(created.count);
          }
          tablesRestored++;
        }

        // 3. Write the restore audit log entry (inside the transaction
        //    so it survives — but it's also the last action, so a failure
        //    here rolls back the whole restore)
        await tx.auditLog.create({
          data: {
            organization_id: ctx.organization_id,
            branch_id: ctx.branch_id ?? null,
            entity_type: "backup_records",
            entity_id: backup.id,
            action: "restore",
            old_values: null,
            new_values: {
              restored_at: new Date().toISOString(),
              backup_id: backup.id,
              backup_started_at: backup.started_at.toISOString(),
              tables_restored: tablesRestored,
              rows_inserted: rowsInserted,
              skipped_tables: skippedTables,
              duration_ms: Date.now() - startTime,
              triggered_by: ctx.user_id,
            } as never,
            actor_user_id: ctx.user_id,
          } as never,
        });

        return { tablesRestored, rowsInserted, skippedTables };
      },
      { timeout: 300_000, maxWait: 60_000 }, // 5 min timeout for large restores
    );

    const durationMs = Date.now() - startTime;
    return successResponse(
      {
        id: backup.id,
        restored_at: new Date().toISOString(),
        tables_restored: result.tablesRestored,
        rows_inserted: result.rowsInserted,
        skipped_tables: result.skippedTables,
        duration_ms: durationMs,
        message: `Restore completed — ${result.rowsInserted} rows from ${result.tablesRestored} tables restored in ${(durationMs / 1000).toFixed(1)}s`,
      },
      "Restore completed successfully",
    );
  } catch (err) {
    // The transaction rolled back — the DB is unchanged.
    const errMsg = err instanceof Error ? err.message : "Unknown error";

    // Write a `restore_failed` audit log OUTSIDE the transaction (so it survives)
    await db.auditLog
      .create({
        data: {
          organization_id: ctx.organization_id,
          branch_id: ctx.branch_id ?? null,
          entity_type: "backup_records",
          entity_id: backup.id,
          action: "restore_failed",
          old_values: null,
          new_values: {
            error: errMsg,
            duration_ms: Date.now() - startTime,
            triggered_by: ctx.user_id,
          } as never,
          actor_user_id: ctx.user_id,
        } as never,
      })
      .catch(() => {}); // don't let an audit-log failure mask the real error

    return errorResponse(
      `Restore failed: ${errMsg}. The database was NOT modified (transaction rolled back).`,
      500,
    );
  }
});
