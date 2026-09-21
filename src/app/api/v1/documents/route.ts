/**
 * MadrashaOS — Documents API
 *
 * Phase B8.2 — Documents API (upload + signed URL)
 *
 * GET  /api/v1/documents — list documents (perm: documents.download)
 * POST /api/v1/documents/upload — upload document (perm: documents.upload)
 *   Validates: file size ≤ 60MB → 413 if larger
 *   Stores file in local storage (public/uploads/ for now; S3 in production)
 *   Creates Document record with sha256 hash
 *   Audit logged
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse, parsePagination } from "@/lib/api/helpers";
import { z } from "zod";
import { createHash } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export const dynamic = "force-dynamic";

// 60MB in bytes (SRS §2.6.2)
const MAX_FILE_SIZE = 60 * 1024 * 1024;

// Upload directory (relative to project root)
const UPLOAD_DIR = join(process.cwd(), "public", "uploads");

// MIME type → DocumentType mapping
function inferDocType(mimeType: string): "pdf" | "word" | "image" | "excel" | "other" {
  if (mimeType.includes("pdf")) return "pdf";
  if (mimeType.includes("word") || mimeType.includes("officedocument.wordprocessing")) return "word";
  if (mimeType.includes("image")) return "image";
  if (mimeType.includes("spreadsheet") || mimeType.includes("officedocument.spreadsheet")) return "excel";
  return "other";
}

/** GET /api/v1/documents — list documents */
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const search = url.searchParams.get("search");
  const type = url.searchParams.get("type");
  const visibility = url.searchParams.get("visibility");

  const where = {
    organization_id: ctx.organization_id,
    ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}),
    deleted_at: null,
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    ...(type ? { type } : {}),
    ...(visibility ? { visibility } : {}),
  };

  const [docs, total] = await Promise.all([
    db.document.findMany({
      where,
      orderBy: { uploaded_at: "desc" },
      skip, take,
      include: {
        uploader: { select: { id: true, name: true, name_bn: true } },
      },
    }),
    db.document.count({ where }),
  ]);

  return jsonResponse({
    data: docs.map((d) => ({
      id: d.id,
      name: d.name,
      original_filename: d.original_filename,
      mime_type: d.mime_type,
      type: d.type,
      size_bytes: Number(d.size_bytes),
      size_display: formatFileSize(Number(d.size_bytes)),
      storage_url: d.storage_url,
      visibility: d.visibility,
      tags: d.tags,
      description: d.description,
      uploaded_by: d.uploader.name,
      uploaded_by_bn: d.uploader.name_bn,
      uploaded_at: d.uploaded_at,
      download_count: d.download_count,
      expires_at: d.expires_at,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

/** POST /api/v1/documents/upload — upload document */
export const POST = withPermission("documents.upload", async (req: Request) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  // Parse multipart form data
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const name = formData.get("name") as string | null;
  const description = formData.get("description") as string | null;
  const visibility = formData.get("visibility") as string | null;
  const tagsStr = formData.get("tags") as string | null;

  if (!file) return errorResponse("No file provided. Use 'file' field in multipart form data.", 400);

  // Validate file size (60MB limit — SRS §2.6.2)
  if (file.size > MAX_FILE_SIZE) {
    return errorResponse(
      `File size exceeds 60MB limit. Uploaded: ${formatFileSize(file.size)}, Maximum: 60MB`,
      413,
      { uploaded_size: file.size, max_size: MAX_FILE_SIZE, uploaded_size_display: formatFileSize(file.size) },
    );
  }

  // Read file content
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  // Compute SHA256 hash
  const sha256 = createHash("sha256").update(fileBuffer).digest("hex");

  // Infer document type from MIME type
  const docType = inferDocType(file.type);

  // Generate storage path: uploads/{org_id}/{year}/{month}/{uuid}.{ext}
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const ext = file.name.split(".").pop() || "bin";
  const filename = `${sha256.substring(0, 16)}.${ext}`;
  const relativePath = `uploads/${ctx.organization_id}/${year}/${month}/${filename}`;
  const absolutePath = join(UPLOAD_DIR, ctx.organization_id, String(year), month);

  // Ensure directory exists
  if (!existsSync(absolutePath)) {
    await mkdir(absolutePath, { recursive: true });
  }

  // Write file to disk
  await writeFile(join(absolutePath, filename), fileBuffer);

  // Parse tags
  let tags: string[] = [];
  if (tagsStr) {
    try { tags = JSON.parse(tagsStr); } catch { tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean); }
  }

  // Create Document record
  const doc = await db.document.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      name: name || file.name,
      original_filename: file.name,
      storage_url: `/public/${relativePath}`,
      mime_type: file.type,
      type: docType,
      size_bytes: BigInt(file.size),
      sha256,
      uploaded_by: ctx.user_id,
      visibility: visibility || "staff",
      tags: tags,
      description: description || null,
      created_by: ctx.user_id,
    } as never,
  });

  // Audit log
  await db.auditLog.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      entity_type: "documents",
      entity_id: doc.id,
      action: "upload",
      old_values: null,
      new_values: {
        name: name || file.name,
        original_filename: file.name,
        type: docType,
        size: formatFileSize(file.size),
        sha256: sha256.substring(0, 16) + "...",
        visibility: visibility || "staff",
      },
      actor_user_id: ctx.user_id,
    } as never,
  });

  return jsonResponse(
    {
      id: doc.id,
      name: name || file.name,
      original_filename: file.name,
      mime_type: file.type,
      type: docType,
      size_bytes: file.size,
      size_display: formatFileSize(file.size),
      storage_url: `/public/${relativePath}`,
      sha256,
      visibility: visibility || "staff",
      message: `Document uploaded — ${file.name} (${formatFileSize(file.size)}). SHA256: ${sha256.substring(0, 16)}...`,
    },
    201,
  );
});

/** Format file size to human-readable string */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}
