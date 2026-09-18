/**
 * MadrashaOS — Subjects API
 *
 * Phase B5.1 — Academic Structure API
 *
 * GET  /api/v1/subjects        — list subjects
 * POST /api/v1/subjects        — create subject (perm: academic.structure.edit)
 * GET  /api/v1/subjects/:id    — single subject
 * PATCH /api/v1/subjects/:id   — update (perm: academic.structure.edit)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse, parsePagination } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSubjectSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  name_bn: z.string().optional(),
  name_ar: z.string().optional(),
  is_quranic: z.boolean().optional(),
  category: z.string().optional(),
  full_marks: z.number().int().min(1).max(1000).optional(),
  pass_marks: z.number().int().min(0).max(500).optional(),
  display_order: z.number().int().optional(),
});

/** GET /api/v1/subjects */
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const search = url.searchParams.get("search");
  const category = url.searchParams.get("category");
  const isQuranic = url.searchParams.get("is_quranic");

  const where = {
    organization_id: ctx.organization_id,
    deleted_at: null,
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    ...(category ? { category } : {}),
    ...(isQuranic === "true" ? { is_quranic: true } : {}),
  };

  const [subjects, total] = await Promise.all([
    db.subject.findMany({ where, orderBy: [{ display_order: "asc" }, { name: "asc" }], skip, take }),
    db.subject.count({ where }),
  ]);

  return jsonResponse({
    data: subjects,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

/** POST /api/v1/subjects */
export const POST = withPermission("academic.structure.edit", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = createSubjectSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  // Check code uniqueness
  const existing = await db.subject.findFirst({
    where: { organization_id: ctx.organization_id, code: parsed.data.code, deleted_at: null },
  });
  if (existing) return errorResponse("Subject with this code already exists", 409);

  const subject = await db.subject.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      code: parsed.data.code,
      name: parsed.data.name,
      name_bn: parsed.data.name_bn ?? null,
      name_ar: parsed.data.name_ar ?? null,
      is_quranic: parsed.data.is_quranic ?? false,
      category: parsed.data.category ?? null,
      full_marks: parsed.data.full_marks ?? 100,
      pass_marks: parsed.data.pass_marks ?? 33,
      display_order: parsed.data.display_order ?? 100,
      is_active: true,
      created_by: ctx.user_id,
    } as never,
  });

  return successResponse(subject, "Subject created");
});
