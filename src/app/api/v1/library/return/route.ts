/**
 * MadrashaOS — Library Return API
 *
 * Phase B7.4 + Library Fines → Fees fix
 *
 * POST /api/v1/library/return — return book (perm: library.return)
 *   Body: { issue_id, fine_amount?, notes? }
 *   Sets returned_date + status='returned'
 *   Increments available_copies
 *   When fine_amount > 0:
 *     - Finds (or creates) the student's active FeePlan for the current year
 *     - Creates a FeeInstallment (label: "Library fine: {book title}")
 *       so the fine rides the student's fee stream (collectable via /fees)
 *     - Posts a balanced LedgerEntry (debit Accounts Receivable,
 *       credit Library Fine Income) so the fine is recorded in the ledger
 *   Audit logged
 */

import { db } from "@/lib/db";
import { getTenantContext, tenantWhere } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { errorResponse, successResponse } from "@/lib/api/helpers";
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
      student: { select: { id: true, name: true, code: true, branch_id: true } },
    },
  });
  if (!issue) return errorResponse("Issue record not found", 404);

  if (issue.status === "returned") {
    return errorResponse("Book already returned", 409);
  }

  const fineAmount = parsed.data.fine_amount ?? 0;

  // --- If there's a fine, prepare the ledger + fee installment ---
  let fineIncomeAccount: { id: string; code: string; name: string } | null = null;
  let arAccount: { id: string } | null = null;
  let feePlan: { id: string } | null = null;
  let voucherNo: string | null = null;

  if (fineAmount > 0) {
    // Find a Library Fine Income account
    fineIncomeAccount = await db.account.findFirst({
      where: {
        ...tenantWhere(ctx),
        type: "income",
        deleted_at: null,
        OR: [
          { name: { contains: "fine", mode: "insensitive" } },
          { name: { contains: "library", mode: "insensitive" } },
        ],
      },
      select: { id: true, code: true, name: true },
    });
    if (!fineIncomeAccount) {
      fineIncomeAccount = await db.account.findFirst({
        where: { ...tenantWhere(ctx), type: "income", deleted_at: null },
        select: { id: true, code: true, name: true },
      });
    }
    if (!fineIncomeAccount) {
      return errorResponse(
        "No income account found to post the library fine. Please create an income account (e.g. 'Library Fine Income') on the Accounting page.",
        422,
      );
    }

    // Find an Accounts Receivable / asset account for the debit side
    arAccount = await db.account.findFirst({
      where: {
        ...tenantWhere(ctx),
        type: "asset",
        deleted_at: null,
        OR: [
          { name: { contains: "receivable", mode: "insensitive" } },
          { name: { contains: "due", mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });
    if (!arAccount) {
      arAccount = await db.account.findFirst({
        where: { ...tenantWhere(ctx), type: "asset", deleted_at: null },
        select: { id: true },
      });
    }

    // Find the student's active fee plan (so we can attach the installment)
    const academicYear = new Date().getFullYear();
    feePlan = await db.feePlan.findFirst({
      where: {
        student_id: issue.student_id,
        organization_id: ctx.organization_id,
        academic_year: academicYear,
        deleted_at: null,
        status: "active",
      },
      select: { id: true },
      orderBy: { created_at: "desc" },
    });

    // Generate a voucher number for the ledger entry
    const lastLedger = await db.ledgerEntry.findFirst({
      where: {
        organization_id: ctx.organization_id,
        voucher_no: { startsWith: `JV-${academicYear}-` },
      },
      orderBy: { voucher_no: "desc" },
      select: { voucher_no: true },
    });
    const ledgerSeq = lastLedger
      ? parseInt(lastLedger.voucher_no.split("-").pop() || "0", 10) + 1
      : 1;
    voucherNo = `JV-${academicYear}-${ledgerSeq.toString().padStart(3, "0")}`;
  }

  // --- Transaction: return book + (if fine) create installment + ledger ---
  let feeInstallmentId: string | null = null;
  let ledgerEntryId: string | null = null;

  await db.$transaction(async (tx) => {
    // 1. Update the issue record
    await tx.libraryIssue.update({
      where: { id: parsed.data.issue_id },
      data: {
        returned_date: new Date(),
        status: "returned",
        fine_amount: fineAmount,
        returned_to: ctx.user_id,
        notes: parsed.data.notes ?? issue.notes,
        updated_by: ctx.user_id,
      } as never,
    });

    // 2. Increment available copies
    await tx.libraryBook.update({
      where: { id: issue.book_id },
      data: { available_copies: { increment: 1 }, updated_by: ctx.user_id } as never,
    });

    // 3. If there's a fine, create a FeeInstallment + LedgerEntry
    if (fineAmount > 0 && fineIncomeAccount && arAccount && voucherNo) {
      // Create a fee installment (so the fine rides the student's fee stream)
      if (feePlan) {
        const installment = await tx.feeInstallment.create({
          data: {
            organization_id: ctx.organization_id,
            branch_id: issue.student.branch_id ?? ctx.branch_id ?? null,
            fee_plan_id: feePlan.id,
            student_id: issue.student_id,
            label: `Library fine: ${issue.book.title}`,
            amount: fineAmount,
            due_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 15),
            status: "unpaid",
            created_by: ctx.user_id,
          } as never,
        });
        feeInstallmentId = installment.id;
      }

      // Post the ledger entry (debit AR, credit Fine Income)
      const ledger = await tx.ledgerEntry.create({
        data: {
          organization_id: ctx.organization_id,
          branch_id: issue.student.branch_id ?? ctx.branch_id ?? null,
          voucher_no: voucherNo,
          date: new Date(),
          narration: `Library fine — ${issue.book.title} → ${issue.student.name} (${issue.student.code})`,
          debit_account_id: arAccount.id,
          credit_account_id: fineIncomeAccount.id,
          amount: fineAmount,
          status: "posted",
          posted_by: ctx.user_id,
          fund: "general",
          source_type: "library_fine",
          created_by: ctx.user_id,
        } as never,
      });
      ledgerEntryId = ledger.id;

      // Update account balances (AR increases, Fine Income increases)
      await tx.account.update({
        where: { id: arAccount.id },
        data: { balance: { increment: fineAmount } } as never,
      });
      await tx.account.update({
        where: { id: fineIncomeAccount.id },
        data: { balance: { increment: fineAmount } } as never,
      });
    }
  });

  await db.auditLog.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      entity_type: "library_issues",
      entity_id: parsed.data.issue_id,
      action: "return",
      old_values: { status: issue.status },
      new_values: {
        status: "returned",
        book: issue.book.title,
        student: issue.student.name,
        fine: fineAmount,
        fee_installment_id: feeInstallmentId,
        ledger_entry_id: ledgerEntryId,
      },
      actor_user_id: ctx.user_id,
    } as never,
  });

  const fineMsg = fineAmount > 0
    ? ` Fine: ৳${fineAmount}${feeInstallmentId ? " added to student fees" : ""}.`
    : "";

  return successResponse(
    {
      issue_id: parsed.data.issue_id,
      book: issue.book.title,
      student: issue.student.name,
      status: "returned",
      fine: fineAmount,
      fee_installment_id: feeInstallmentId,
      ledger_entry_id: ledgerEntryId,
    },
    `Book "${issue.book.title}" returned by ${issue.student.name}.${fineMsg}`,
  );
});
