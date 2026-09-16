/**
 * MadrashaOS — Mock Fixtures: Fees + Ledger + Accounts + Attendance + Inventory + Notices + Approvals
 *
 * Session C0.4 — Mock-Data Layer & Seeding
 *
 * Realistic seed data sized to populate every screen in Phases C2–C4:
 *   - 40 fee plans (1 per student, 3 installments each = 120 installments)
 *   - 8 fee payments (mock recent receipts)
 *   - 12 ledger entries (1 month of activity)
 *   - 8 accounts (incl. isolated Zakat fund per SRS §3.7 / C6)
 *   - 4 attendance sessions (Class 5-A across 4 days, including today)
 *   - 10 inventory items (3 low-stock)
 *   - 5 notices (mixed audiences)
 *   - 6 approvals (mixed types, 3 pending)
 */

import type {
  FeePlan,
  FeePayment,
  LedgerEntry,
  Account,
  AttendanceSession,
  InventoryItem,
  Notice,
  Approval,
  FixtureCounts,
} from "../types";
import { students } from "./students";
import { branches } from "./organization";

/* ---------------- FEE PLANS + PAYMENTS ---------------- */

export const feePlans: FeePlan[] = students.map((s, i) => ({
  id: `fp-${(i + 1).toString().padStart(3, "0")}`,
  studentId: s.id,
  academicYear: 2026,
  installments: [
    {
      id: `inst-${i}-1`,
      label: "January 2026",
      amount: 1500,
      dueDate: "2026-01-10",
      paid: i < 30, // 75% paid
      paidDate: i < 30 ? "2026-01-08" : undefined,
      receiptNo: i < 30 ? `RCP-2026-${(i + 1).toString().padStart(4, "0")}` : undefined,
    },
    {
      id: `inst-${i}-2`,
      label: "March 2026",
      amount: 1500,
      dueDate: "2026-03-10",
      paid: i < 20, // 50% paid
      paidDate: i < 20 ? "2026-03-05" : undefined,
      receiptNo: i < 20 ? `RCP-2026-${(1000 + i).toString().padStart(4, "0")}` : undefined,
    },
    {
      id: `inst-${i}-3`,
      label: "June 2026",
      amount: 1500,
      dueDate: "2026-06-10",
      paid: false,
    },
  ],
}));

export const feePayments: FeePayment[] = [
  { id: "pay-1", studentId: "stu-001", installmentId: "inst-0-2", amount: 1500, method: "cash", accountId: "acc-cash", receiptNo: "RCP-2026-1001", collectedBy: "usr-accountant", collectedAt: "2026-09-16" },
  { id: "pay-2", studentId: "stu-002", installmentId: "inst-1-2", amount: 1500, method: "cash", accountId: "acc-cash", receiptNo: "RCP-2026-1002", collectedBy: "usr-accountant", collectedAt: "2026-09-15" },
  { id: "pay-3", studentId: "stu-003", installmentId: "inst-2-2", amount: 1500, method: "bank", accountId: "acc-bank", receiptNo: "RCP-2026-1003", collectedBy: "usr-accountant", collectedAt: "2026-09-14" },
  { id: "pay-4", studentId: "stu-004", installmentId: "inst-3-2", amount: 1500, method: "mobile", accountId: "acc-mobile", receiptNo: "RCP-2026-1004", collectedBy: "usr-accountant", collectedAt: "2026-09-13" },
  { id: "pay-5", studentId: "stu-005", installmentId: "inst-4-2", amount: 1500, method: "cash", accountId: "acc-cash", receiptNo: "RCP-2026-1005", collectedBy: "usr-accountant", collectedAt: "2026-09-12" },
  { id: "pay-6", studentId: "stu-006", installmentId: "inst-5-2", amount: 1500, method: "cash", accountId: "acc-cash", receiptNo: "RCP-2026-1006", collectedBy: "usr-accountant", collectedAt: "2026-09-11" },
  { id: "pay-7", studentId: "stu-007", installmentId: "inst-6-2", amount: 1500, method: "bank", accountId: "acc-bank", receiptNo: "RCP-2026-1007", collectedBy: "usr-accountant", collectedAt: "2026-09-10" },
  { id: "pay-8", studentId: "stu-008", installmentId: "inst-7-2", amount: 1500, method: "cash", accountId: "acc-cash", receiptNo: "RCP-2026-1008", collectedBy: "usr-accountant", collectedAt: "2026-09-09" },
];

/* ---------------- ACCOUNTS + LEDGER ---------------- */

export const accounts: Account[] = [
  { id: "acc-cash", code: "1000", name: "Cash on Hand", type: "asset", fund: "general", balance: 245000, branchId: "br-dhaka" },
  { id: "acc-bank", code: "1010", name: "Bank — Sonali", type: "asset", fund: "general", balance: 845000, branchId: "br-dhaka" },
  { id: "acc-mobile", code: "1020", name: "Mobile Wallet (bKash)", type: "asset", fund: "general", balance: 18500, branchId: "br-dhaka" },
  { id: "acc-income-fees", code: "4000", name: "Fee Income", type: "income", fund: "general", balance: 180000, branchId: "br-dhaka" },
  { id: "acc-expense", code: "5000", name: "Operating Expenses", type: "expense", fund: "general", balance: 95000, branchId: "br-dhaka" },
  { id: "acc-zakat-fund", code: "3000", name: "Zakat Fund", type: "liability", fund: "zakat", balance: 125000, branchId: "br-dhaka" },
  { id: "acc-donation", code: "4100", name: "Donation Income", type: "income", fund: "general", balance: 42000, branchId: "br-dhaka" },
  { id: "acc-salary", code: "5100", name: "Salary Expense", type: "expense", fund: "general", balance: 320000, branchId: "br-dhaka" },
];

export const ledgerEntries: LedgerEntry[] = [
  { id: "le-1", voucherNo: "JV-2026-001", date: "2026-09-16", narration: "Fee collection — January batch", debitAccount: "acc-cash", creditAccount: "acc-income-fees", amount: 45000, branchId: "br-dhaka", postedBy: "usr-accountant", status: "posted" },
  { id: "le-2", voucherNo: "JV-2026-002", date: "2026-09-15", narration: "Maintenance expense — electrical repair", debitAccount: "acc-expense", creditAccount: "acc-cash", amount: 12000, branchId: "br-dhaka", postedBy: "usr-accountant", status: "posted" },
  { id: "le-3", voucherNo: "JV-2026-003", date: "2026-09-15", narration: "Salary payment — teaching staff", debitAccount: "acc-salary", creditAccount: "acc-bank", amount: 285000, branchId: "br-dhaka", postedBy: "usr-accountant", status: "posted" },
  { id: "le-4", voucherNo: "JV-2026-004", date: "2026-09-14", narration: "Bank transfer — Cash→Bank", debitAccount: "acc-bank", creditAccount: "acc-cash", amount: 50000, branchId: "br-dhaka", postedBy: "usr-accountant", status: "posted" },
  { id: "le-5", voucherNo: "JV-2026-005", date: "2026-09-14", narration: "Zakat distribution — 5 needy students", debitAccount: "acc-zakat-fund", creditAccount: "acc-cash", amount: 15000, branchId: "br-dhaka", postedBy: "usr-accountant", status: "posted" },
  { id: "le-6", voucherNo: "JV-2026-006", date: "2026-09-13", narration: "Donation received — anonymous", debitAccount: "acc-cash", creditAccount: "acc-donation", amount: 5000, branchId: "br-dhaka", postedBy: "usr-accountant", status: "posted" },
  { id: "le-7", voucherNo: "JV-2026-007", date: "2026-09-13", narration: "Library books purchase", debitAccount: "acc-expense", creditAccount: "acc-cash", amount: 8500, branchId: "br-dhaka", postedBy: "usr-accountant", status: "pending" },
  { id: "le-8", voucherNo: "JV-2026-008", date: "2026-09-12", narration: "Transport fuel — September", debitAccount: "acc-expense", creditAccount: "acc-cash", amount: 3000, branchId: "br-dhaka", postedBy: "usr-accountant", status: "posted" },
  { id: "le-9", voucherNo: "JV-2026-009", date: "2026-09-12", narration: "Food expense — hostel meals", debitAccount: "acc-expense", creditAccount: "acc-cash", amount: 18000, branchId: "br-dhaka", postedBy: "usr-accountant", status: "posted" },
  { id: "le-10", voucherNo: "JV-2026-010", date: "2026-09-11", narration: "Asset disposal — old computer", debitAccount: "acc-expense", creditAccount: "acc-cash", amount: 0, branchId: "br-dhaka", postedBy: "usr-administrator", status: "posted" },
  { id: "le-11", voucherNo: "JV-2026-011", date: "2026-09-11", narration: "Mobile banking deposit", debitAccount: "acc-bank", creditAccount: "acc-mobile", amount: 15000, branchId: "br-dhaka", postedBy: "usr-accountant", status: "posted" },
  { id: "le-12", voucherNo: "JV-2026-012", date: "2026-09-10", narration: "Purchase — stationery from ABC Supplier", debitAccount: "acc-expense", creditAccount: "acc-cash", amount: 22000, branchId: "br-dhaka", postedBy: "usr-accountant", status: "pending" },
];

/* ---------------- ATTENDANCE (Class 5-A across 4 days) ---------------- */

export const attendanceSessions: AttendanceSession[] = [
  {
    id: "att-1", classId: "cls-5", section: "A", date: "2026-09-13", takenBy: "usr-teacher",
    records: students.filter((s) => s.classId === "cls-5" && s.section === "A").map((s, i) => ({
      studentId: s.id,
      status: i % 7 === 0 ? "absent" : i % 11 === 0 ? "late" : "present",
    })),
  },
  {
    id: "att-2", classId: "cls-5", section: "A", date: "2026-09-14", takenBy: "usr-teacher",
    records: students.filter((s) => s.classId === "cls-5" && s.section === "A").map((s, i) => ({
      studentId: s.id,
      status: i % 5 === 0 ? "absent" : i % 9 === 0 ? "leave" : "present",
    })),
  },
  {
    id: "att-3", classId: "cls-5", section: "A", date: "2026-09-15", takenBy: "usr-teacher",
    records: students.filter((s) => s.classId === "cls-5" && s.section === "A").map((s, i) => ({
      studentId: s.id,
      status: i % 11 === 0 ? "absent" : i % 13 === 0 ? "late" : "present",
    })),
  },
  {
    id: "att-4", classId: "cls-5", section: "A", date: "2026-09-16", takenBy: "usr-teacher",
    records: students.filter((s) => s.classId === "cls-5" && s.section === "A").map((s, i) => ({
      studentId: s.id,
      status: i % 13 === 0 ? "absent" : "present",
    })),
  },
];

/* ---------------- INVENTORY (3 low-stock for dashboard alert) ---------------- */

export const inventoryItems: InventoryItem[] = [
  { id: "inv-1", code: "STN-001", name: "Notebook (200pg)", nameBn: "খাতা (২০০ পৃষ্ঠা)", category: "Stationery", unit: "pcs", qtyInStock: 245, reorderLevel: 50, branchId: "br-dhaka" },
  { id: "inv-2", code: "STN-002", name: "Pen (Blue)", nameBn: "কলম (নীল)", category: "Stationery", unit: "pcs", qtyInStock: 32, reorderLevel: 50, branchId: "br-dhaka" },
  { id: "inv-3", code: "STN-003", name: "Pencil", nameBn: "পেন্সিল", category: "Stationery", unit: "pcs", qtyInStock: 180, reorderLevel: 60, branchId: "br-dhaka" },
  { id: "inv-4", code: "STN-004", name: "Eraser", nameBn: "ইরেজার", category: "Stationery", unit: "pcs", qtyInStock: 95, reorderLevel: 40, branchId: "br-dhaka" },
  { id: "inv-5", code: "FOD-001", name: "Rice (Sella)", nameBn: "চাল (সেলা)", category: "Food", unit: "kg", qtyInStock: 145, reorderLevel: 50, branchId: "br-dhaka" },
  { id: "inv-6", code: "FOD-002", name: "Lentils (Masoor)", nameBn: "মসুর ডাল", category: "Food", unit: "kg", qtyInStock: 28, reorderLevel: 30, branchId: "br-dhaka" },
  { id: "inv-7", code: "FOD-003", name: "Cooking Oil", nameBn: "রান্নার তেল", category: "Food", unit: "ltr", qtyInStock: 65, reorderLevel: 20, branchId: "br-dhaka" },
  { id: "inv-8", code: "CLN-001", name: "Detergent", nameBn: "ডিটারজেন্ট", category: "Cleaning", unit: "kg", qtyInStock: 12, reorderLevel: 15, branchId: "br-dhaka" },
  { id: "inv-9", code: "CLN-002", name: "Floor Cleaner", nameBn: "ফ্লোর ক্লিনার", category: "Cleaning", unit: "ltr", qtyInStock: 28, reorderLevel: 10, branchId: "br-dhaka" },
  { id: "inv-10", code: "MED-001", name: "First Aid Kit", nameBn: "ফার্স্ট এইড কিট", category: "Medical", unit: "set", qtyInStock: 8, reorderLevel: 5, branchId: "br-dhaka" },
];

/* ---------------- NOTICES ---------------- */

export const notices: Notice[] = [
  { id: "ntc-1", title: "Result Publication — Mid-term", titleBn: "মধ্যমেয়াদী ফলাফল প্রকাশ", body: "Mid-term results will be published on 20 September 2026.", bodyBn: "মধ্যমেয়াদী ফলাফল ২০ সেপ্টেম্বর ২০২৬ তারিখে প্রকাশিত হবে।", audience: "guardians", recipientCount: 40, sentBy: "usr-administrator", sentAt: "2026-09-15", branchId: "br-dhaka" },
  { id: "ntc-2", title: "Holiday — Eid Milad", titleBn: "ছুটি — ঈদে মিলাদ", body: "The madrasha will remain closed on 18 September 2026.", bodyBn: "১৮ সেপ্টেম্বর ২০২৬ তারিখে মাদরাসা বন্ধ থাকবে।", audience: "all", recipientCount: 40, sentBy: "usr-administrator", sentAt: "2026-09-14", branchId: "br-dhaka" },
  { id: "ntc-3", title: "Fee Payment Reminder", titleBn: "ফি পরিশোধ রিমাইন্ডার", body: "Please clear the March 2026 installment by 10 September.", bodyBn: "অনুগ্রহ করে ১০ সেপ্টেম্বরের মধ্যে মার্চ ২০২৬ কিস্তি পরিশোধ করুন।", audience: "guardians", audienceFilter: "class-5", recipientCount: 22, sentBy: "usr-accountant", sentAt: "2026-09-13", branchId: "br-dhaka" },
  { id: "ntc-4", title: "Parent-Teacher Meeting", titleBn: "অভিভাবক-শিক্ষক সভা", body: "PTM scheduled for 25 September 2026 at 10 AM.", bodyBn: "২৫ সেপ্টেম্বর ২০২৬ সকাল ১০টায় অভিভাবক-শিক্ষক সভা অনুষ্ঠিত হবে।", audience: "guardians", recipientCount: 40, sentBy: "usr-authority", sentAt: "2026-09-12", branchId: "br-dhaka" },
  { id: "ntc-5", title: "Staff Meeting", titleBn: "স্টাফ সভা", body: "Monthly staff meeting on 30 September at 2 PM in the conference room.", bodyBn: "৩০ সেপ্টেম্বর বিকাল ২টায় কনফারেন্স রুমে মাসিক স্টাফ সভা।", audience: "staff", recipientCount: 6, sentBy: "usr-administrator", sentAt: "2026-09-11", branchId: "br-dhaka" },
];

/* ---------------- APPROVALS ---------------- */

export const approvals: Approval[] = [
  { id: "apr-1", type: "expense", title: "Library books purchase — ৳8,500", amount: 8500, requestedBy: "usr-accountant", requestedAt: "2026-09-13", status: "pending", branchId: "br-dhaka" },
  { id: "apr-2", type: "purchase", title: "Stationery from ABC Supplier — ৳22,000", amount: 22000, requestedBy: "usr-accountant", requestedAt: "2026-09-10", status: "pending", branchId: "br-dhaka" },
  { id: "apr-3", type: "discount", title: "Fee discount — Student MOS-2026-005 — 50%", amount: 750, requestedBy: "usr-accountant", requestedAt: "2026-09-12", status: "pending", branchId: "br-dhaka" },
  { id: "apr-4", type: "expense", title: "Maintenance expense — ৳25,000", amount: 25000, requestedBy: "usr-accountant", requestedAt: "2026-09-08", status: "approved", decidedBy: "usr-authority", decidedAt: "2026-09-09", branchId: "br-dhaka" },
  { id: "apr-5", type: "admission", title: "Admission — new applicant MOS-2026-041", requestedBy: "usr-administrator", requestedAt: "2026-09-07", status: "approved", decidedBy: "usr-authority", decidedAt: "2026-09-08", branchId: "br-dhaka" },
  { id: "apr-6", type: "purchase", title: "Sports equipment — ৳15,000", amount: 15000, requestedBy: "usr-storekeeper", requestedAt: "2026-09-05", status: "rejected", decidedBy: "usr-authority", decidedAt: "2026-09-06", branchId: "br-dhaka" },
];

/* ---------------- COUNTS (for /dev/data route) ---------------- */

export const fixtureCounts: FixtureCounts = {
  organizations: 1,
  branches: branches.length,
  users: 8,
  students: students.length,
  classes: 4,
  guardians: 8,
  feePlans: feePlans.length,
  feePayments: feePayments.length,
  ledgerEntries: ledgerEntries.length,
  accounts: accounts.length,
  attendanceSessions: attendanceSessions.length,
  inventoryItems: inventoryItems.length,
  notices: notices.length,
  approvals: approvals.length,
};
