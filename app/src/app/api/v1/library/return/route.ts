/**
 * MadrashaOS — Library Return API
 *
 * Phase B7.4
 *
 * POST /api/v1/library/return — return book (perm: library.return)
 *   Body: { issue_id, fine_amount?, notes? }
 *   Sets returned_date + status='returned'
 *   Increments available_copies
 *   Audit logged
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const returnSchema = z.object({
  issue_id: z.string().uuid(),
  fine_amount: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

export const POST = withPermission("library.return", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = returnSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const issue = await db.libraryIssue.findFirst({
    where: { id: parsed.data.issue_id, organization_id: ctx.organization_id, deleted_at: null },
    include: {
      book: { select: { id: true, title: true, accession_no: true } },
      student: { select: { id: true, name: true } },
    },
  });
  if (!issue) return errorResponse("Issue record not found", 404);

  if (issue.status === "returned") {
    return errorResponse("Book already returned", 409);
  }

  await db.$transaction(async (tx) => {
    await tx.libraryIssue.update({
      where: { id: parsed.data.issue_id },
      data: {
        returned_date: new Date(),
        status: "returned",
        fine_amount: parsed.data.fine_amount ?? 0,
        returned_to: ctx.user_id,
        notes: parsed.data.notes ?? issue.notes,
        updated_by: ctx.user_id,
      } as never,
    });

    await tx.libraryBook.update({
      where: { id: issue.book_id },
      data: { available_copies: { increment: 1 }, updated_by: ctx.user_id } as never,
    });
  });

  await db.auditLog.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      entity_type: "library_issues",
      entity_id: parsed.data.issue_id,
      action: "return",
      old_values: { status: issue.status },
      new_values: { status: "returned", book: issue.book.title, student: issue.student.name, fine: parsed.data.fine_amount ?? 0 },
      actor_id: ctx.user_id,
    } as never,
  });

  return successResponse(
    { issue_id: parsed.data.issue_id, book: issue.book.title, student: issue.student.name, status: "returned", fine: parsed.data.fine_amount ?? 0 },
    `Book "${issue.book.title}" returned by ${issue.student.name}.${parsed.data.fine_amount ? ` Fine: ৳${parsed.data.fine_amount}.` : ""}`,
  );
});
