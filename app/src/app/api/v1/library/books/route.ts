/**
 * MadrashaOS — Library Books API
 *
 * Phase B7.4 — Library + Transport API
 *
 * GET  /api/v1/library/books — list books (perm: library.view)
 * POST /api/v1/library/books — create book (perm: library.issue)
 * GET  /api/v1/library/books/:id — single with issue history
 * PATCH /api/v1/library/books/:id — update
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse, parsePagination } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createBookSchema = z.object({
  accession_no: z.string().min(1).max(50),
  title: z.string().min(1).max(500),
  title_bn: z.string().optional(),
  title_ar: z.string().optional(),
  author: z.string().max(255).optional(),
  category: z.string().optional(),
  isbn: z.string().max(20).optional(),
  total_copies: z.number().int().min(1).default(1),
  purchase_price: z.number().min(0).optional(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  shelf_location: z.string().max(100).optional(),
  description: z.string().optional(),
});

/** GET /api/v1/library/books */
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const search = url.searchParams.get("search");
  const category = url.searchParams.get("category");
  const available = url.searchParams.get("available");

  const where = {
    organization_id: ctx.organization_id,
    ...(ctx.branch_id ? { branch_id: ctx.branch_id } : {}),
    deleted_at: null,
    ...(search ? {
      OR: [
        { title: { contains: search, mode: "insensitive" as const } },
        { author: { contains: search, mode: "insensitive" as const } },
        { accession_no: { contains: search, mode: "insensitive" as const } },
      ],
    } : {}),
    ...(category ? { category } : {}),
    ...(available === "true" ? { available_copies: { gt: 0 } } : {}),
  };

  const [books, total] = await Promise.all([
    db.libraryBook.findMany({ where, orderBy: { title: "asc" }, skip, take }),
    db.libraryBook.count({ where }),
  ]);

  return jsonResponse({
    data: books.map((b) => ({
      id: b.id, accession_no: b.accession_no, title: b.title, title_bn: b.title_bn, title_ar: b.title_ar,
      author: b.author, category: b.category, isbn: b.isbn,
      total_copies: b.total_copies, available_copies: b.available_copies,
      purchase_price: Number(b.purchase_price), shelf_location: b.shelf_location, is_active: b.is_active,
      is_available: b.available_copies > 0,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

/** POST /api/v1/library/books */
export const POST = withPermission("library.issue", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = createBookSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const existing = await db.libraryBook.findFirst({
    where: { organization_id: ctx.organization_id, accession_no: parsed.data.accession_no, deleted_at: null },
  });
  if (existing) return errorResponse("Book with this accession number already exists", 409);

  const book = await db.libraryBook.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      accession_no: parsed.data.accession_no,
      title: parsed.data.title,
      title_bn: parsed.data.title_bn ?? null,
      title_ar: parsed.data.title_ar ?? null,
      author: parsed.data.author ?? null,
      category: parsed.data.category ?? null,
      isbn: parsed.data.isbn ?? null,
      total_copies: parsed.data.total_copies,
      available_copies: parsed.data.total_copies,
      purchase_price: parsed.data.purchase_price ?? 0,
      purchase_date: parsed.data.purchase_date ? new Date(parsed.data.purchase_date) : null,
      shelf_location: parsed.data.shelf_location ?? null,
      description: parsed.data.description ?? null,
      is_active: true,
      created_by: ctx.user_id,
    } as never,
  });

  return successResponse(book, "Book added to library");
});
