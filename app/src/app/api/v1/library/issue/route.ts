/**
 * MadrashaOS — Library Issue API
 *
 * Phase B7.4
 *
 * POST /api/v1/library/issue — issue book to student (perm: library.issue)
 *   Validates: available_copies > 0 → 409 if none available
 *   Decrements available_copies
 *   Creates LibraryIssue record
 *   Audit logged
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse, successResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const issueSchema = z.object({
  book_id: z.string().uuid(),
  student_id: z.string().uuid(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(500).optional(),
});

export const POST = withPermission("library.issue", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = issueSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const book = await db.libraryBook.findFirst({
    where: { id: parsed.data.book_id, organization_id: ctx.organization_id, deleted_at: null, is_active: true },
    select: { id: true, title: true, accession_no: true, available_copies: true },
  });
  if (!book) return errorResponse("Book not found", 404);

  if (book.available_copies <= 0) {
    return errorResponse(
      `No copies available for "${book.title}". All ${book.accession_no} copies are issued.`,
      409,
      { book_title: book.title, available: 0 },
    );
  }

  const student = await db.student.findFirst({
    where: { id: parsed.data.student_id, organization_id: ctx.organization_id, deleted_at: null },
    select: { id: true, name: true, code: true },
  });
  if (!student) return errorResponse("Student not found", 404);

  // Issue book + decrement available copies in transaction
  const issue = await db.$transaction(async (tx) => {
    const newIssue = await tx.libraryIssue.create({
      data: {
        organization_id: ctx.organization_id,
        branch_id: ctx.branch_id ?? null,
        book_id: parsed.data.book_id,
        student_id: parsed.data.student_id,
        issue_date: new Date(),
        due_date: new Date(parsed.data.due_date),
        status: "issued",
        issued_by: ctx.user_id,
        notes: parsed.data.notes ?? null,
        created_by: ctx.user_id,
      } as never,
    });

    await tx.libraryBook.update({
      where: { id: parsed.data.book_id },
      data: { available_copies: { decrement: 1 }, updated_by: ctx.user_id } as never,
    });

    return newIssue;
  });

  await db.auditLog.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      entity_type: "library_issues",
      entity_id: issue.id,
      action: "issue",
      old_values: { available_copies: book.available_copies },
      new_values: { book: book.title, student: student.name, available_copies: book.available_copies - 1 },
      actor_user_id: ctx.user_id,
    } as never,
  });

  return successResponse(
    { issue_id: issue.id, book: book.title, student: student.name, due_date: parsed.data.due_date, available_copies: book.available_copies - 1 },
    `Book "${book.title}" issued to ${student.name}. Due: ${parsed.data.due_date}. ${book.available_copies - 1} copies remaining.`,
  );
});
