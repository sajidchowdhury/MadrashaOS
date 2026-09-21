/**
 * MadrashaOS — PDF Mock Data Builders
 *
 * Session C5.1 — Branded PDF Templates (Task 5-a)
 *
 * Shared mock data for the 6 branded PDF templates. Re-uses the existing
 * fixture layer (students, feePayments, feePlans, ledgerEntries, accounts)
 * and adds PDF-specific computed shapes (subject marks, exam metadata,
 * running-balance ledger rows, outstanding-installment rows).
 *
 * All builders are pure functions — no side effects, no network calls.
 */

import {
  feePayments,
  feePlans,
  ledgerEntries,
  accounts,
} from "@/lib/mock/fixtures";
import { students } from "@/lib/mock/fixtures/students";
import { branches } from "@/lib/mock/fixtures/organization";
import type {
  FeePayment, FeePlan, LedgerEntry, Account, Student, Branch,
} from "@/lib/mock/types";
import type { Locale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/i18n/format";

/* ----------------------------------------------------------------
 * Types — PDF-specific view models
 * ---------------------------------------------------------------- */

export type PdfBranchInfo = {
  name: string;
  nameBn: string;
  address: string;
  phone: string;
};

export type PdfSubjectMark = {
  id: string;
  name: string;
  nameBn: string;
  fullMarks: number;
  obtained: number;
};

export type PdfExamInfo = {
  id: string;
  name: string;
  nameBn: string;
  className: string;
  section: string;
  date: string;
};

export type PdfStudentInfo = {
  id: string;
  code: string;
  name: string;
  nameBn: string;
  nameAr?: string;
  className: string;
  section: string;
  roll: number;
};

export type PdfResultRow = {
  roll: number;
  name: string;
  nameBn: string;
  marks: number;
  grade: string;
  gpa: number;
};

export type PdfLedgerRow = {
  date: string;
  voucherNo: string;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
};

/* ----------------------------------------------------------------
 * Builders
 * ---------------------------------------------------------------- */

export function getBranchInfo(branchId: string = "br-dhaka"): PdfBranchInfo {
  const branch: Branch | undefined = branches.find((b) => b.id === branchId)
    ?? branches[0];
  return {
    name: branch.name,
    nameBn: branch.nameBn,
    address: branch.address,
    phone: branch.phone,
  };
}

/** Lookup a student by ID; falls back to the first student. */
export function getStudentInfo(studentId: string): PdfStudentInfo {
  const s: Student | undefined = students.find((st) => st.id === studentId);
  const fallback = s ?? students[0];
  return {
    id: fallback.id,
    code: fallback.code,
    name: fallback.name,
    nameBn: fallback.nameBn,
    nameAr: fallback.nameAr,
    className: fallback.classId.replace("cls-", "Class "),
    section: fallback.section,
    roll: fallback.roll,
  };
}

/** Mock exam metadata for the MarkSheet + ResultSheet templates. */
export function getExamInfo(opts?: {
  examId?: string;
  classId?: string;
  section?: string;
}): PdfExamInfo {
  const id = opts?.examId ?? "exam-mid-2026";
  const className = opts?.classId?.replace("cls-", "Class ") ?? "Class 5";
  const section = opts?.section ?? "A";
  return {
    id,
    name: "Mid-term Examination 2026",
    nameBn: "মধ্যমেয়াদী পরীক্ষা ২০২৬",
    className,
    section,
    date: "2026-09-15",
  };
}

/** Mock subject marks for the MarkSheet template.
 *  Per task spec: Quran, Hadith, Fiqh, Arabic, Bangla, English (6 subjects).
 *  Marks are deterministic per student code so the same student always
 *  produces the same mark sheet. */
export function getSubjectMarks(student: PdfStudentInfo): PdfSubjectMark[] {
  // Deterministic seed from student code (e.g. MOS-2026-003 → 3)
  const seed = parseInt(student.code.split("-").pop() ?? "1", 10) || 1;
  const base = 70 + ((seed * 7) % 25); // base 70–94
  const subjects: Array<Omit<PdfSubjectMark, "obtained">> = [
    { id: "sub-quran", name: "Quran & Tajweed", nameBn: "কুরআন ও তাজবিদ", fullMarks: 100 },
    { id: "sub-hadith", name: "Hadith Studies", nameBn: "হাদিস শিক্ষা", fullMarks: 100 },
    { id: "sub-fiqh", name: "Fiqh", nameBn: "ফিকহ", fullMarks: 100 },
    { id: "sub-arabic", name: "Arabic Language", nameBn: "আরবি ভাষা", fullMarks: 100 },
    { id: "sub-bangla", name: "Bangla Language", nameBn: "বাংলা ভাষা", fullMarks: 100 },
    { id: "sub-english", name: "English Language", nameBn: "ইংরেজি ভাষা", fullMarks: 100 },
  ];
  return subjects.map((s, i) => {
    // Each subject gets a slightly different mark within ±6 of the base.
    const offset = ((seed + i * 3) % 13) - 6;
    const obtained = Math.max(50, Math.min(98, base + offset));
    return { ...s, obtained };
  });
}

/** Lookup a fee payment by ID; falls back to the first payment. */
export function getFeePayment(paymentId: string): {
  payment: FeePayment;
  plan: FeePlan | undefined;
  student: Student;
} {
  const payment: FeePayment | undefined = feePayments.find((p) => p.id === paymentId)
    ?? feePayments[0];
  const student: Student | undefined = students.find((s) => s.id === payment.studentId);
  const plan: FeePlan | undefined = feePlans.find((p) => p.studentId === payment.studentId);
  return {
    payment,
    plan,
    student: student ?? students[0],
  };
}

/** Ledger rows with running balance, sorted chronologically. */
export function getLedgerRows(opts?: {
  from?: string;
  to?: string;
  accountFilter?: string;
}): { rows: PdfLedgerRow[]; openingBalance: number; closingBalance: number } {
  const { from, to, accountFilter } = opts ?? {};
  const filtered = ledgerEntries
    .filter((e) => {
      if (from && e.date < from) return false;
      if (to && e.date > to) return false;
      if (accountFilter && e.debitAccount !== accountFilter && e.creditAccount !== accountFilter) {
        return false;
      }
      return true;
    })
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  // Opening balance is the cumulative balance BEFORE the first filtered
  // entry — for the demo we use 0 since the demo period is the start
  // of the accounting month.
  const openingBalance = 0;
  let running = openingBalance;
  const rows: PdfLedgerRow[] = filtered.map((e) => {
    running += e.amount;
    return {
      date: e.date,
      voucherNo: e.voucherNo,
      narration: e.narration,
      debit: e.debitAccount.startsWith("acc-") ? e.amount : 0,
      credit: e.creditAccount.startsWith("acc-") ? e.amount : 0,
      balance: running,
    };
  });
  return {
    rows,
    openingBalance,
    closingBalance: running,
  };
}

/** Lookup account by ID. */
export function getAccount(accountId: string): Account | undefined {
  return accounts.find((a) => a.id === accountId);
}

/** Outstanding installments: scan all fee plans and collect unpaid ones. */
export function getOutstandingInstallments(): Array<{
  student: Student;
  plan: FeePlan;
  installment: FeePlan["installments"][number];
  daysOverdue: number;
}> {
  const today = new Date("2026-09-16");
  const out: Array<{
    student: Student;
    plan: FeePlan;
    installment: FeePlan["installments"][number];
    daysOverdue: number;
  }> = [];
  for (const plan of feePlans) {
    const student = students.find((s) => s.id === plan.studentId);
    if (!student) continue;
    for (const inst of plan.installments) {
      if (inst.paid) continue;
      const due = new Date(inst.dueDate);
      const daysOverdue = Math.floor(
        (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24),
      );
      out.push({ student, plan, installment: inst, daysOverdue });
    }
  }
  return out;
}

/** Top-N students by class+section for the ResultSheet (mock marks). */
export function getResultRows(opts?: {
  classId?: string;
  section?: string;
  limit?: number;
}): PdfResultRow[] {
  const classId = opts?.classId ?? "cls-5";
  const section = opts?.section ?? "A";
  const limit = opts?.limit ?? 10;
  const list = students.filter(
    (s) => s.classId === classId && s.section === section,
  ).slice(0, limit);
  return list.map((s) => {
    const seed = parseInt(s.code.split("-").pop() ?? "1", 10) || 1;
    const marks = 480 + ((seed * 11) % 100); // 480–579 of 600
    const avg = marks / 6;
    const grade =
      avg >= 80 ? "A+" :
      avg >= 70 ? "A" :
      avg >= 60 ? "A-" :
      avg >= 50 ? "B" :
      avg >= 40 ? "C" : "F";
    const gpa =
      avg >= 80 ? 5.0 :
      avg >= 70 ? 4.0 :
      avg >= 60 ? 3.5 :
      avg >= 50 ? 3.0 :
      avg >= 40 ? 2.0 : 0.0;
    return {
      roll: s.roll,
      name: s.name,
      nameBn: s.nameBn,
      marks,
      grade,
      gpa,
    };
  }).sort((a, b) => b.marks - a.marks);
}

/** Locale-aware date helper for PDF templates. */
export function formatPdfDate(date: Date | string, locale: Locale): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDate(d, locale);
}

/* ----------------------------------------------------------------
 * TEMPLATE REGISTRY — used by /dev/pdfs and /dev/pdfs/[template]
 * ---------------------------------------------------------------- */

export type TemplateId =
  | "fee-receipt"
  | "mark-sheet"
  | "result-sheet"
  | "certificate"
  | "ledger-statement"
  | "outstanding-fees";

export type TemplateMeta = {
  id: TemplateId;
  title: string;
  description: string;
  /** Fields used by the template (informational — for the dev showcase). */
  fields: string[];
};

export const TEMPLATE_REGISTRY: TemplateMeta[] = [
  {
    id: "fee-receipt",
    title: "Fee Receipt",
    description:
      "Branded fee-collection receipt with installment table, amount-in-words, and signature line.",
    fields: ["Receipt No", "Date", "Student name", "Class / Section", "Method", "Amount in words"],
  },
  {
    id: "mark-sheet",
    title: "Mark Sheet",
    description:
      "Individual student mark sheet with 6 subjects, GPA, and conditional position (Risk R7).",
    fields: ["Student info", "Subjects table", "GPA", "Position (optional)", "Signatures"],
  },
  {
    id: "result-sheet",
    title: "Result Sheet",
    description:
      "Class-wide result sheet ranking 10 students by total marks with summary statistics.",
    fields: ["Roll", "Student Name", "Marks", "Grade", "GPA", "Summary row"],
  },
  {
    id: "certificate",
    title: "Completion Certificate",
    description:
      "Decorative completion certificate with gold border, watermark, and Phase 3 placeholder seal.",
    fields: ["Student name", "Class", "Date", "Principal signature", "Madrasha seal"],
  },
  {
    id: "ledger-statement",
    title: "Ledger Statement",
    description:
      "Running-balance ledger statement over a date range with opening + closing balances.",
    fields: ["Opening balance", "Voucher table", "Running balance", "Closing balance"],
  },
  {
    id: "outstanding-fees",
    title: "Outstanding Fees Report",
    description:
      "Outstanding fees report listing all unpaid installments with total due (Risk R12 as-of date).",
    fields: ["Student", "Code", "Class", "Installment", "Amount", "Due date"],
  },
];
