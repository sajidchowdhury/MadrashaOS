/**
 * MadrashaOS — Backup Download API
 *
 * GET /api/v1/backup/[id]/download — stream a .json.gz backup file
 * (perm: backup.run)
 *
 * Verifies the backup belongs to the current tenant, reads the file from
 * the backups/ directory, and streams it with the correct Content-Type
 * and Content-Disposition headers so the browser downloads it.
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { errorResponse } from "@/lib/api/helpers";
import { readFile, stat } from "fs/promises";
import { join, basename } from "path";

export const dynamic = "force-dynamic";

const BACKUP_DIR = join(process.cwd(), "backups");

export const GET = withPermission("backup.run", async (req: Request, ctx) => {
  const tenant = await getTenantContext();
  if (!tenant) return errorResponse("Unauthorized", 401);

  // Extract the backup id from the URL (Next.js 16 — params is a Promise)
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  const backupId = segments[segments.length - 2]; // .../backup/{id}/download
  if (!backupId) return errorResponse("Backup id is required", 400);

  // Verify the backup belongs to this tenant
  const backup = await db.backupRecord.findFirst({
    where: {
      id: backupId,
      organization_id: tenant.organization_id,
      deleted_at: null,
    },
    select: { id: true, storage_url: true, status: true },
  });
  if (!backup) return errorResponse("Backup not found", 404);

  if (backup.status !== "completed") {
    return errorResponse("Backup is not available for download (status: " + backup.status + ")", 400);
  }

  // The filename is the last segment of storage_url
  if (!backup.storage_url) return errorResponse("Backup file path missing", 500);
  const filename = basename(backup.storage_url);
  const filepath = join(BACKUP_DIR, filename);

  // Verify the file exists
  try {
    const stats = await stat(filepath);
    if (!stats.isFile()) return errorResponse("Backup file not found on disk", 404);
  } catch {
    return errorResponse("Backup file not found on disk", 404);
  }

  // Read + stream the file
  const fileBuffer = await readFile(filepath);
  const headers = new Headers({
    "Content-Type": "application/gzip",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Length": String(fileBuffer.length),
  });

  return new Response(fileBuffer, { status: 200, headers });
});
