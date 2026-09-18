/**
 * MadrashaOS — Document Download API (Signed URL)
 *
 * Phase B8.2
 *
 * GET /api/v1/documents/:id — single document info
 * GET /api/v1/documents/:id/download — download with signed URL
 *   - Generates a time-limited signed URL (10-minute expiry — SRS §2.6.2)
 *   - Increments download_count
 *   - Returns redirect to signed URL OR JSON with signed URL
 *
 * PATCH /api/v1/documents/:id — update document metadata (perm: documents.upload)
 * DELETE /api/v1/documents/:id — soft delete (perm: documents.upload)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

// Signed URL expiry: 10 minutes (SRS §2.6.2)
const SIGNED_URL_EXPIRY_MS = 10 * 60 * 1000;

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Generate a signed URL for a document.
 * Format: /api/v1/documents/{id}/download?token={sha256_of_id+expiry}&expires={expiry_timestamp}
 */
function generateSignedUrl(docId: string, storageUrl: string): { url: string; expiresAt: Date } {
  const expiresAt = new Date(Date.now() + SIGNED_URL_EXPIRY_MS);
  const expiryTimestamp = expiresAt.getTime();
  const signature = createHash("sha256")
    .update(`${docId}:${expiryTimestamp}:${process.env.NEXTAUTH_SECRET || "dev-secret"}`)
    .digest("hex")
    .substring(0, 32);

  return {
    url: `${storageUrl}?token=${signature}&expires=${expiryTimestamp}`,
    expiresAt,
  };
}

/**
 * Verify a signed URL token.
 */
function verifySignedUrl(docId: string, token: string, expires: number): boolean {
  // Check expiry
  if (Date.now() > expires) return false;

  // Verify signature
  const expectedSignature = createHash("sha256")
    .update(`${docId}:${expires}:${process.env.NEXTAUTH_SECRET || "dev-secret"}`)
    .digest("hex")
    .substring(0, 32);

  return token === expectedSignature;
}

/** GET /api/v1/documents/:id — single document info */
export async function GET(req: Request, ctx: RouteContext) {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const url = new URL(req.url);
  const download = url.searchParams.get("download") === "true";

  const doc = await db.document.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
    include: { uploader: { select: { id: true, name: true, name_bn: true } } },
  });

  if (!doc) return errorResponse("Document not found", 404);

  // If download=true, generate signed URL
  if (download) {
    const { url: signedUrl, expiresAt } = generateSignedUrl(doc.id, doc.storage_url);

    // Increment download count
    await db.document.update({
      where: { id },
      data: { download_count: { increment: 1 } } as never,
    });

    // Audit log
    await db.auditLog.create({
      data: {
        organization_id: tenantCtx.organization_id,
        branch_id: tenantCtx.branch_id ?? null,
        entity_type: "documents",
        entity_id: id,
        action: "download",
        old_values: null,
        new_values: { name: doc.name, download_count: doc.download_count + 1 },
        actor_id: tenantCtx.user_id,
      } as never,
    });

    return jsonResponse({
      id: doc.id,
      name: doc.name,
      signed_url: signedUrl,
      expires_at: expiresAt.toISOString(),
      expires_in_seconds: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
      message: `Signed URL generated. Expires in 10 minutes.`,
    });
  }

  // Regular info response
  return jsonResponse({
    id: doc.id,
    name: doc.name,
    original_filename: doc.original_filename,
    mime_type: doc.mime_type,
    type: doc.type,
    size_bytes: Number(doc.size_bytes),
    size_display: formatFileSize(Number(doc.size_bytes)),
    storage_url: doc.storage_url,
    sha256: doc.sha256,
    visibility: doc.visibility,
    tags: doc.tags,
    description: doc.description,
    uploaded_by: doc.uploader.name,
    uploaded_by_bn: doc.uploader.name_bn,
    uploaded_at: doc.uploaded_at,
    download_count: doc.download_count,
    expires_at: doc.expires_at,
  });
}

/** PATCH /api/v1/documents/:id — update metadata */
export const PATCH = withPermission("documents.upload", async (req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const schema = z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).optional(),
    visibility: z.enum(["public", "staff", "authority"]).optional(),
    tags: z.array(z.string()).optional(),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const existing = await db.document.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
  });
  if (!existing) return errorResponse("Document not found", 404);

  const updated = await db.document.update({
    where: { id },
    data: { ...parsed.data, updated_by: tenantCtx.user_id } as never,
  });

  return successResponse(updated, "Document updated");
});

/** DELETE /api/v1/documents/:id — soft delete */
export const DELETE = withPermission("documents.upload", async (_req: Request, ctx: RouteContext) => {
  const tenantCtx = await getTenantContext();
  if (!tenantCtx) return errorResponse("Unauthorized", 401);
  const { id } = await ctx.params;

  const existing = await db.document.findFirst({
    where: { id, organization_id: tenantCtx.organization_id, deleted_at: null },
  });
  if (!existing) return errorResponse("Document not found", 404);

  await db.document.update({
    where: { id },
    data: { deleted_at: new Date(), updated_by: tenantCtx.user_id } as never,
  });

  return successResponse(null, "Document deleted (soft). File retained on disk.");
});

/** Format file size to human-readable string */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}
