/**
 * MadrashaOS — Classes API
 *
 * Phase B5.1 — Academic Structure API
 *
 * GET  /api/v1/classes        — list classes (with sections)
 * POST /api/v1/classes        — create class (perm: academic.structure.edit)
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse, parsePagination } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createClassSchema = z.object({
  name: z.string().min(1).max(255),
  name_bn: z.string().min(1).max(255),
  level: z.number().int().min(1).max(15),
  stream: z.string().optional(),
  display_order: z.number().int().optional(),
});

/** GET /api/v1/classes — list with sections */
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const url = new URL(req.url);
  const { page, pageSize, skip, take } = parsePagination(url);
  const search = url.searchParams.get("search");
  const branchId = url.searchParams.get("branch_id") || ctx.branch_id;

  const where = {
    organization_id: ctx.organization_id,
    branch_id: branchId ?? undefined,
    deleted_at: null,
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [classes, total] = await Promise.all([
    db.class.findMany({
      where,
      orderBy: [{ level: "asc" }, { display_order: "asc" }],
      skip,
      take,
      include: {
        sections: {
          where: { deleted_at: null, is_active: true },
          orderBy: { name: "asc" },
          select: {
            id: true, name: true, capacity: true, room: true, is_active: true,
          },
        },
        _count: { select: { students: { where: { deleted_at: null } } } },
      },
    }),
    db.class.count({ where }),
  ]);

  return jsonResponse({
    data: classes.map((c) => ({
      id: c.id,
      name: c.name,
      name_bn: c.name_bn,
      level: c.level,
      stream: c.stream,
      display_order: c.display_order,
      is_active: c.is_active,
      sections: c.sections,
      student_count: c._count.students,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

/** POST /api/v1/classes — create class */
export const POST = withPermission("academic.structure.edit", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = createClassSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  // Check name uniqueness within org+branch
  const existing = await db.class.findFirst({
    where: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? undefined,
      name: parsed.data.name,
      deleted_at: null,
    },
  });
  if (existing) return errorResponse("Class with this name already exists", 409);

  const newClass = await db.class.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      name: parsed.data.name,
      name_bn: parsed.data.name_bn,
      level: parsed.data.level,
      stream: parsed.data.stream ?? null,
      display_order: parsed.data.display_order ?? 100,
      is_active: true,
      created_by: ctx.user_id,
    },
  });

  return successResponse(newClass, "Class created");
});
