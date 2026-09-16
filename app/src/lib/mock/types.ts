/**
 * MadrashaOS — Mock Data Types
 *
 * Session C0.4 — Mock-Data Layer & Seeding
 *
 * Domain types for the mock data layer. These types are written to match
 * the future Prisma schema (SRS Part 7 — snake_case tables, uuid PKs,
 * organization_id + branch_id columns, soft-delete, decimal money).
 *
 * When the backend ships its OpenAPI 3.1 spec, the generated client will
 * produce identical types and the swap is a one-file change.
 */

export type ID = string;
export type ISODate = string; // "2026-09-16"
export type Money = number; // BDT amount in taka (not paisa)

export type Branch = {
  id: ID;
  code: "dhaka" | "chittagong" | "sylhet";
  name: string;
  nameBn: string;
  address: string;
  phone: string;
  establishedYear: number;
};

export type Organization = {
  id: ID;
  name: string;
  nameBn: string;
  branches: Branch[];
};

export type User = {
  id: ID;
  role: string; // matches Role type from stores/types.ts
  name: string;
  nameBn: string;
  email: string;
  phone: string;
  branchId: ID;
  avatarInitial: string;
};

export type Guardian = {
  id: ID;
  name: string;
  nameBn: string;
  phone: string;
  email: string;
  occupation: string;
  branchId: ID;
};

export type Student = {
  id: ID;
  code: string; // e.g. "MOS-2026-001"
  name: string;
  nameBn: string;
  nameAr?: string;
  classId: ID;
  section: string;
  guardianId: ID;
  branchId: ID;
  roll: number;
  gender: "male" | "female";
  dob: ISODate;
  admittedAt: ISODate;
  status: "active" | "graduated" | "withdrawn";
};

export type Class = {
  id: ID;
  name: string; // e.g. "Class 5"
  nameBn: string;
  level: number;
  branchId: ID;
  sections: string[]; // ["A", "B"]
};

export type FeePlan = {
  id: ID;
  studentId: ID;
  academicYear: number;
  installments: FeeInstallment[];
};

export type FeeInstallment = {
  id: ID;
  label: string; // "March 2026"
  amount: Money;
  dueDate: ISODate;
  paid: boolean;
  paidDate?: ISODate;
  receiptNo?: string;
};

export type FeePayment = {
  id: ID;
  studentId: ID;
  installmentId: ID;
  amount: Money;
  method: "cash" | "bank" | "mobile";
  accountId: ID;
  receiptNo: string;
  collectedBy: ID; // user id
  collectedAt: ISODate;
};

export type LedgerEntry = {
  id: ID;
  voucherNo: string;
  date: ISODate;
  narration: string;
  debitAccount: string;
  creditAccount: string;
  amount: Money;
  branchId: ID;
  postedBy: ID;
  status: "posted" | "pending" | "rejected";
};

export type Account = {
  id: ID;
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "income" | "expense";
  fund?: "general" | "zakat"; // C6: Zakat fund isolation
  balance: Money;
  branchId: ID;
};

export type AttendanceSession = {
  id: ID;
  classId: ID;
  section: string;
  date: ISODate;
  takenBy: ID; // teacher user id
  records: AttendanceRecord[];
};

export type AttendanceRecord = {
  studentId: ID;
  status: "present" | "absent" | "late" | "leave";
};

export type InventoryItem = {
  id: ID;
  code: string;
  name: string;
  nameBn: string;
  category: string;
  unit: string;
  qtyInStock: number;
  reorderLevel: number;
  branchId: ID;
};

export type Notice = {
  id: ID;
  title: string;
  titleBn: string;
  body: string;
  bodyBn: string;
  audience: "all" | "class" | "guardians" | "staff";
  audienceFilter?: string; // e.g. "class-5"
  recipientCount: number;
  sentBy: ID;
  sentAt: ISODate;
  branchId: ID;
};

export type Approval = {
  id: ID;
  type: "expense" | "purchase" | "discount" | "admission";
  title: string;
  amount?: Money;
  requestedBy: ID;
  requestedAt: ISODate;
  status: "pending" | "approved" | "rejected";
  decidedBy?: ID;
  decidedAt?: ISODate;
  branchId: ID;
};

/** Aggregate counts for the /dev/data debug route. */
export type FixtureCounts = {
  organizations: number;
  branches: number;
  users: number;
  students: number;
  classes: number;
  guardians: number;
  feePlans: number;
  feePayments: number;
  ledgerEntries: number;
  accounts: number;
  attendanceSessions: number;
  inventoryItems: number;
  notices: number;
  approvals: number;
};
