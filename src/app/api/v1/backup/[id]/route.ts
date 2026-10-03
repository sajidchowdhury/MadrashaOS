/**
 * MadrashaOS — Backup Delete API
 *
 * DELETE /api/v1/backup/[id] — delete a backup file + record (perm: backup.run)
 *
 * Verifies the backup belongs to the current tenant, deletes the .json.gz
 * file from the backups/ directory, soft-deletes the BackupRecord row,
 * and writes an audit log entry.
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { errorResponse, successResponse } from "@/lib/api/helpers";
import { unlink, stat } from "fs/promises";
import { join, basename } from "path";

export const dynamic = "force-dynamic";

const BACKUP_DIR = join(process.cwd(), "backups");

export const DELETE = withPermission("backup.run", async (req: Request, ctx) => {
  const tenant = await getTenantContext();
  if (!tenant) return errorResponse("Unauthorized", 401);

  // Extract the backup id from the URL (Next.js 16 — params is a Promise)
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  const backupId = segments[segments.length - 1]; // .../backup/{id}
  if (!backupId) return errorResponse("Backup id is required", 400);

  // Verify the backup belongs to this tenant
  const backup = await db.backupRecord.findFirst({
    where: {
      id: backupId,
      organization_id: tenant.organization_id,
      deleted_at: null,
    },
    select: { id: true, storage_url: true, size_bytes: true, status: true },
  });
  if (!backup) return errorResponse("Backup not found", 404);

  // Delete the physical file (if it exists)
  let fileDeleted = false;
  if (backup.storage_url) {
    const filename = basename(backup.storage_url);
    const filepath = join(BACKUP_DIR, filename);
    try {
      await stat(filepath);
      await unlink(filepath);
      fileDeleted = true;
    } catch {
      // File may have been manually removed already — that's OK
      fileDeleted = false;
    }
  }

  // Soft-delete the BackupRecord row
  await db.backupRecord.update({
    where: { id: backup.id },
    data: {
      deleted_at: new Date(),
      updated_by: tenant.user_id ?? null,
    } as never,
  });

  // Audit log
  await db.auditLog.create({
    data: {
      organization_id: tenant.organization_id,
      branch_id: tenant.branch_id ?? null,
      entity_type: "backup_records",
      entity_id: backup.id,
      action: "delete",
      old_values: {
        storage_url: backup.storage_url,
        size_bytes: backup.size_bytes ? Number(backup.size_bytes) : null,
        status: backup.status,
      } as never,
      new_values: { file_deleted: fileDeleted } as never,
      actor_user_id: tenant.user_id,
    } as never,
  });

  return successResponse(
    { id: backup.id, file_deleted: fileDeleted },
    "Backup deleted successfully",
  );
});
