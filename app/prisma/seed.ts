/**
 * MadrashaOS — Database Seed Script
 *
 * Phase B1.4 — Seed Data
 *
 * Seeds the PostgreSQL database with the same data the mock fixtures
 * contain, so the UI looks identical after the swap from mockApi to
 * the real database.
 *
 * Seed data:
 *   - 1 Organization (Darul Uloom Madrasha) + 3 Branches
 *   - 8 Users (1 per persona) with hashed passwords
 *   - 8 Roles + 110+ Permissions + RolePermission junction
 *   - 4 Classes + 8 Sections
 *   - 8 Guardians + 40 Students (with bn/en/ar names)
 *   - 40 FeePlans (3 installments each = 120 installments)
 *   - 8 FeePayments (recent receipts)
 *   - 8 Accounts (incl. isolated Zakat fund per SRS §3.7 / C6)
 *   - 12 LedgerEntries (1 month of activity, 2 pending)
 *   - 4 AttendanceSessions (Class 5-A across 4 days)
 *   - 10 InventoryItems (3 low-stock)
 *   - 5 Notices + 6 Approvals
 *
 * Usage: bunx prisma db seed
 *   Or: bun run prisma/seed.ts
 */

import { PrismaClient, Gender, StudentStatus, AttendanceStatus, LedgerStatus, AccountType, FundType, FeeMethod, ApprovalType, ApprovalStatus, NoticeAudience } from "../src/generated/prisma";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

/* ============================================================
 *  Helper: generate UUIDs (deterministic for seed reproducibility)
 * ============================================================ */

// Simple deterministic ID generator (not crypto-secure — seed data only)
let idCounter = 0;
function seedId(prefix: string): string {
  idCounter++;
  return `${prefix}-${idCounter.toString().padStart(4, "0")}`;
}

// Pre-allocated IDs for entities referenced by FK
const IDS = {
  org: "00000000-0000-0000-0000-000000000001",
  branchDhaka: "00000000-0000-0000-0000-000000000010",
  branchCtg: "00000000-0000-0000-0000-000000000011",
  branchSyl: "00000000-0000-0000-0000-000000000012",
  // Users (8 personas)
  userSuperAdmin: "00000000-0000-0000-0001-000000000001",
  userAuthority: "00000000-0000-0000-0001-000000000002",
  userAdministrator: "00000000-0000-0000-0001-000000000003",
  userAccountant: "00000000-0000-0000-0001-000000000004",
  userTeacher: "00000000-0000-0000-0001-000000000005",
  userStorekeeper: "00000000-0000-0000-0001-000000000006",
  userGuardian: "00000000-0000-0000-0001-000000000007",
  userStudent: "00000000-0000-0000-0001-000000000008",
  // Roles
  roleSuperAdmin: "00000000-0000-0000-0002-000000000001",
  roleAuthority: "00000000-0000-0000-0002-000000000002",
  roleAdministrator: "00000000-0000-0000-0002-000000000003",
  roleAccountant: "00000000-0000-0000-0002-000000000004",
  roleTeacher: "00000000-0000-0000-0002-000000000005",
  roleStorekeeper: "00000000-0000-0000-0002-000000000006",
  roleGuardian: "00000000-0000-0000-0002-000000000007",
  roleStudent: "00000000-0000-0000-0002-000000000008",
  // Classes
  class1: "00000000-0000-0000-0003-000000000001",
  class3: "00000000-0000-0000-0003-000000000002",
  class5: "00000000-0000-0000-0003-000000000003",
  class8: "00000000-0000-0000-0003-000000000004",
  // Accounts
  accCash: "00000000-0000-0000-0004-000000000001",
  accBank: "00000000-0000-0000-0004-000000000002",
  accMobile: "00000000-0000-0000-0004-000000000003",
  accIncomeFees: "00000000-0000-0000-0004-000000000004",
  accExpense: "00000000-0000-0000-0004-000000000005",
  accZakatFund: "00000000-0000-0000-0004-000000000006",
  accDonation: "00000000-0000-0000-0004-000000000007",
  accSalary: "00000000-0000-0000-0004-000000000008",
} as const;

/* ============================================================
 *  Permission codes (from src/lib/auth/permissions.ts)
 * ============================================================ */

const PERMISSION_CODES = [
  // Foundation
  "organization.branch.switch", "organization.branch.create", "organization.config.view",
  "organization.module.toggle", "rbac.role.view", "rbac.role.create", "rbac.role.update",
  "rbac.permission.assign", "audit.view", "audit.export", "security.policy.edit",
  "backup.run", "backup.restore",
  // People
  "students.view", "students.create", "students.update", "students.promote",
  "students.notes.view", "students.notes.edit", "admission.view", "admission.approve",
  "admission.reject", "guardians.view", "guardians.view.own", "teachers.view",
  "teachers.create", "teachers.assign", "employees.view", "employees.create",
  // Academic
  "academic.structure.view", "academic.structure.edit", "attendance.view",
  "attendance.take", "attendance.view.own", "exams.view", "exams.enter-marks",
  "exams.publish", "results.view", "results.view.own", "results.generate",
  // Finance
  "fees_view", "fees.payment.create", "fees.payment.create.own", "fees.plan.view",
  "fees.plan.edit", "scholarship.view", "scholarship.approve", "accounting.ledger.view",
  "accounting.ledger.post", "cashbank.transfer", "zakat.view", "zakat.receive",
  "zakat.distribute", "donations.view", "donations.create", "donations.create.public",
  // Operations
  "inventory.view", "inventory.receive", "inventory.issue", "purchase.view",
  "purchase.create", "purchase.approve", "suppliers.view", "assets.view",
  "assets.transfer", "assets.dispose", "hostel.view", "hostel.allocate",
  "food.meal-plan", "library.view", "library.issue", "library.return",
  "transport.view", "transport.record-expense",
  // Communication & Platform
  "notices.view", "notices.compose", "notices.send", "documents.upload",
  "documents.download", "reports.view", "reports.finance.view", "reports.finance.export",
  "dashboard.view", "dashboard.view.authority", "dashboard.view.accountant",
  "dashboard.view.teacher", "dashboard.view.storekeeper", "dashboard.view.guardian",
  "pdf.generate", "approval.view", "approval.approve", "approval.reject",
  "approval.delegate",
  // Platform-level
  "tenant.provision", "tenant.manage",
];

// Fix: use dotted codes as in the frontend (replace underscore with dot)
const PERM_CODES = PERMISSION_CODES.map((c) => c.replace(/^fees_/, "fees."));

/* ============================================================
 *  Role → Permission mapping (from src/lib/auth/role-permissions.ts)
 * ============================================================ */

const ROLE_PERMS: Record<string, string[]> = {
  "super-admin": [
    "organization.branch.switch", "organization.branch.create", "organization.config.view",
    "organization.module.toggle", "rbac.role.view", "rbac.role.create", "rbac.role.update",
    "rbac.permission.assign", "audit.view", "audit.export", "security.policy.edit",
    "backup.run", "backup.restore", "tenant.provision", "tenant.manage",
    "dashboard.view", "notices.view", "notices.compose", "notices.send",
    "documents.upload", "documents.download", "reports.view", "approval.view",
    "approval.approve", "approval.reject", "approval.delegate", "pdf.generate",
  ],
  authority: [
    "organization.branch.switch", "organization.config.view", "rbac.role.view",
    "audit.view", "audit.export", "students.view", "students.notes.view",
    "admission.view", "admission.approve", "admission.reject", "guardians.view",
    "teachers.view", "academic.structure.view", "attendance.view", "exams.view",
    "results.view", "results.generate", "fees.view", "fees.plan.view",
    "scholarship.view", "scholarship.approve", "accounting.ledger.view",
    "zakat.view", "donations.view", "inventory.view", "purchase.view",
    "purchase.approve", "suppliers.view", "assets.view", "hostel.view",
    "library.view", "transport.view", "notices.view", "notices.compose",
    "notices.send", "documents.upload", "documents.download", "reports.view",
    "reports.finance.view", "reports.finance.export", "dashboard.view",
    "dashboard.view.authority", "pdf.generate", "approval.view", "approval.approve",
    "approval.reject", "approval.delegate",
  ],
  administrator: [
    "organization.branch.switch", "organization.config.view", "organization.module.toggle",
    "rbac.role.view", "rbac.role.create", "rbac.role.update", "rbac.permission.assign",
    "audit.view", "backup.run", "students.view", "students.create", "students.update",
    "students.promote", "students.notes.view", "students.notes.edit", "admission.view",
    "admission.approve", "admission.reject", "guardians.view", "teachers.view",
    "teachers.create", "teachers.assign", "employees.view", "employees.create",
    "academic.structure.view", "academic.structure.edit", "attendance.view",
    "exams.view", "results.view", "results.generate", "fees.view", "fees.plan.view",
    "fees.plan.edit", "scholarship.view", "accounting.ledger.view", "inventory.view",
    "purchase.view", "suppliers.view", "assets.view", "assets.transfer", "assets.dispose",
    "hostel.view", "hostel.allocate", "food.meal-plan", "library.view", "library.issue",
    "library.return", "transport.view", "transport.record-expense", "notices.view",
    "notices.compose", "notices.send", "documents.upload", "documents.download",
    "reports.view", "dashboard.view", "pdf.generate", "approval.view",
  ],
  accountant: [
    "students.view", "guardians.view", "fees.view", "fees.payment.create",
    "fees.plan.view", "fees.plan.edit", "scholarship.view", "scholarship.approve",
    "accounting.ledger.view", "accounting.ledger.post", "cashbank.transfer",
    "zakat.view", "zakat.receive", "zakat.distribute", "donations.view",
    "donations.create", "suppliers.view", "inventory.view", "purchase.view",
    "purchase.create", "assets.view", "transport.view", "transport.record-expense",
    "notices.view", "documents.upload", "documents.download", "reports.view",
    "reports.finance.view", "reports.finance.export", "dashboard.view",
    "dashboard.view.accountant", "pdf.generate", "approval.view",
  ],
  teacher: [
    "students.view", "guardians.view", "academic.structure.view", "attendance.view",
    "attendance.view.own", "attendance.take", "exams.view", "exams.enter-marks",
    "results.view", "notices.view", "documents.download", "dashboard.view",
    "dashboard.view.teacher",
  ],
  storekeeper: [
    "inventory.view", "inventory.receive", "inventory.issue", "purchase.view",
    "purchase.create", "suppliers.view", "assets.view", "notices.view",
    "documents.upload", "documents.download", "dashboard.view",
    "dashboard.view.storekeeper",
  ],
  guardian: [
    "guardians.view.own", "attendance.view.own", "results.view.own", "fees.view",
    "fees.payment.create.own", "fees.plan.view", "notices.view", "documents.download",
    "dashboard.view", "dashboard.view.guardian", "pdf.generate",
  ],
  student: [
    "attendance.view.own", "results.view.own", "fees.view", "fees.plan.view",
    "notices.view", "documents.download", "dashboard.view",
  ],
};

/* ============================================================
 *  Student name pools (from mock fixtures)
 * ============================================================ */

const FIRST_NAMES_EN = [
  "Ahmad", "Fatima", "Muhammad", "Aisha", "Omar", "Khadija", "Bilal", "Zainab",
  "Yusuf", "Maryam", "Hamza", "Hafsa", "Ibrahim", "Amina", "Ismail", "Ruqayyah",
  "Daud", "Sara", "Sulaiman", "Hawa", "Musa", "Lubaba", "Isa", "Maymunah",
  "Yahya", "Safiya", "Zakariya", "Sumayya", "Tariq", "Asma", "Khalid", "Nusaybah",
  "Salman", "Umm", "Jafar", "Kulthum", "Hasan", "Rayhana", "Husain", "Umm",
];
const FIRST_NAMES_BN = [
  "আহমদ", "ফাতিমা", "মুহাম্মদ", "আয়েশা", "ওমর", "খাদিজা", "বিলাল", "জয়নব",
  "ইউসুফ", "মরিয়ম", "হামজা", "হাফসা", "ইব্রাহিম", "আমিনা", "ইসমাঈল", "রুকাইয়া",
  "দাউদ", "সারা", "সুলাইমান", "হাওয়া", "মুসা", "লুবাবা", "ঈসা", "মাইমুনা",
  "ইয়াহইয়া", "সাফিয়া", "জাকারিয়া", "সুমাইয়া", "তারিক", "আসমা", "খালিদ", "নুসাইবা",
  "সালমান", "উম্ম", "জাফর", "কুলসুম", "হাসান", "রায়হানা", "হুসাইন", "উম্ম",
];
const SURNAMES = ["Hossain", "Akter", "Rahman", "Chowdhury", "Begum", "Ahmed", "Islam", "Khan"];
const SURNAMES_BN = ["হোসেন", "আক্তার", "রহমান", "চৌধুরী", "বেগম", "আহমেদ", "ইসলাম", "খান"];

function generateStudents(): Array<{
  code: string; name: string; name_bn: string; name_ar?: string;
  classId: string; section: string; guardianId: string; roll: number;
  gender: Gender; dob: string; admittedAt: string;
}> {
  const students: Array<{
    code: string; name: string; name_bn: string; name_ar?: string;
    classId: string; section: string; guardianId: string; roll: number;
    gender: Gender; dob: string; admittedAt: string;
  }> = [];
  let roll = 1;
  // Class 1 Section A — 8 students
  for (let i = 0; i < 8; i++) {
    students.push(makeStudent(i, roll++, IDS.class1, "A", "g-1"));
  }
  // Class 3 Section A — 10 students
  for (let i = 8; i < 18; i++) {
    students.push(makeStudent(i, roll++, IDS.class3, "A", "g-2"));
  }
  // Class 5 Section A — 12 students (the famous Class 5-A)
  for (let i = 18; i < 30; i++) {
    students.push(makeStudent(i, roll++, IDS.class5, "A", "g-3"));
  }
  // Class 5 Section B — 10 students
  for (let i = 30; i < 40; i++) {
    students.push(makeStudent(i, roll++, IDS.class5, "B", "g-4"));
  }
  return students;
}

function makeStudent(
  i: number, roll: number, classId: string, section: string, _guardianKey: string,
) {
  const gender: Gender = i % 2 === 0 ? "male" : "female";
  const firstEn = FIRST_NAMES_EN[i % FIRST_NAMES_EN.length];
  const firstBn = FIRST_NAMES_BN[i % FIRST_NAMES_BN.length];
  const surname = SURNAMES[i % SURNAMES.length];
  const surnameBn = SURNAMES_BN[i % SURNAMES_BN.length];
  const year = 2010 + (i % 6);
  const month = ((i % 12) + 1).toString().padStart(2, "0");
  const day = ((i % 28) + 1).toString().padStart(2, "0");
  return {
    code: `MOS-2026-${(i + 1).toString().padStart(3, "0")}`,
    name: `${firstEn} ${surname}`,
    name_bn: `${firstBn} ${surnameBn}`,
    name_ar: i % 4 === 0 ? `${firstEn} بن ${surname}` : undefined,
    classId,
    section,
    guardianId: _guardianKey,
    roll,
    gender,
    dob: `${year}-${month}-${day}`,
    admittedAt: "2026-01-15",
  };
}

/* ============================================================
 *  Main seed function
 * ============================================================ */

async function main() {
  console.log("🌱 MadrashaOS — Database Seed (Phase B1.4)");
  console.log("===========================================\n");

  // --- 1. Organization ---
  console.log("[1/14] Creating organization...");
  const org = await prisma.organization.upsert({
    where: { id: IDS.org },
    update: {},
    create: {
      id: IDS.org,
      name: "Darul Uloom Madrasha",
      name_bn: "দারুল উলূম মাদরাসা",
      slug: "darul-uloom-madrasha",
      phone: "+880 2 9661234",
      email: "info@madrashaos.org",
      address: "123 Mirpur Road, Dhanmondi, Dhaka 1209",
      established_year: 1998,
      settings: { locale: "en", currency: "BDT", academicYearStart: "January" } as any,
    } as any,
  });
  console.log(`  ✅ Organization: ${org.name}`);

  // --- 2. Branches ---
  console.log("\n[2/14] Creating branches...");
  const branches = await Promise.all([
    prisma.branch.upsert({
      where: { id: IDS.branchDhaka },
      update: {},
      create: {
        id: IDS.branchDhaka, organization_id: org.id,
        code: "dhaka", name: "Dhaka Main Branch", name_bn: "ঢাকা মূল শাখা",
        address: "123 Mirpur Road, Dhanmondi, Dhaka 1209",
        phone: "+880 2 9661234", email: "dhaka@madrashaos.org",
        established_year: 1998, is_active: true,
      } as any,
    }),
    prisma.branch.upsert({
      where: { id: IDS.branchCtg },
      update: {},
      create: {
        id: IDS.branchCtg, organization_id: org.id,
        code: "chittagong", name: "Chittagong Branch", name_bn: "চট্টগ্রাম শাখা",
        address: "45 Agrabad Commercial Area, Chittagong 4100",
        phone: "+880 31 2545678", email: "ctg@madrashaos.org",
        established_year: 2005, is_active: true,
      } as any,
    }),
    prisma.branch.upsert({
      where: { id: IDS.branchSyl },
      update: {},
      create: {
        id: IDS.branchSyl, organization_id: org.id,
        code: "sylhet", name: "Sylhet Branch", name_bn: "সিলেট শাখা",
        address: "78 Zindabazar, Sylhet 3100",
        phone: "+880 821 712345", email: "sylhet@madrashaos.org",
        established_year: 2012, is_active: true,
      } as any,
    }),
  ]);
  console.log(`  ✅ ${branches.length} branches created`);

  // --- 3. Roles ---
  console.log("\n[3/14] Creating roles...");
  const roleData = [
    { id: IDS.roleSuperAdmin, code: "super-admin", name: "Super Admin", description: "Platform operator with full access" },
    { id: IDS.roleAuthority, code: "authority", name: "Authority (Principal)", description: "Madrasha head/principal — all-branch read + approve" },
    { id: IDS.roleAdministrator, code: "administrator", name: "Administrator", description: "Office admin — tenant-wide CRUD except financial posting" },
    { id: IDS.roleAccountant, code: "accountant", name: "Accountant", description: "Finance CRUD; cannot edit student academic info" },
    { id: IDS.roleTeacher, code: "teacher", name: "Teacher", description: "Own classes + sections; no financial data" },
    { id: IDS.roleStorekeeper, code: "storekeeper", name: "Storekeeper", description: "Inventory + purchase CRUD; no finance or student data" },
    { id: IDS.roleGuardian, code: "guardian", name: "Guardian (Parent)", description: "Read-only on own linked children" },
    { id: IDS.roleStudent, code: "student", name: "Student", description: "Read-only on own records only" },
  ];
  for (const r of roleData) {
    await prisma.role.upsert({
      where: { id: r.id },
      update: {},
      create: { ...r, organization_id: org.id, is_system: true },
    } as any);
  }
  console.log(`  ✅ ${roleData.length} roles created`);

  // --- 4. Permissions ---
  console.log("\n[4/14] Creating permissions...");
  for (const code of PERM_CODES) {
    const [mod, resource, action] = code.split(".");
    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: {
        code,
        module: mod || "general",
        name: `${resource || "all"}.${action || "view"}`,
        description: `${action || "view"} permission for ${resource || "all"} in ${mod || "general"}`,
      } as any,
    });
  }
  console.log(`  ✅ ${PERM_CODES.length} permissions created`);

  // --- 5. Role-Permission junction ---
  console.log("\n[5/14] Creating role-permission assignments...");
  const roleIdMap: Record<string, string> = {
    "super-admin": IDS.roleSuperAdmin,
    authority: IDS.roleAuthority,
    administrator: IDS.roleAdministrator,
    accountant: IDS.roleAccountant,
    teacher: IDS.roleTeacher,
    storekeeper: IDS.roleStorekeeper,
    guardian: IDS.roleGuardian,
    student: IDS.roleStudent,
  };
  let permCount = 0;
  for (const [roleCode, perms] of Object.entries(ROLE_PERMS)) {
    const roleId = roleIdMap[roleCode];
    for (const permCode of perms) {
      const perm = await prisma.permission.findUnique({ where: { code: permCode } });
      if (perm && roleId) {
        await prisma.rolePermission.upsert({
          where: { role_id_permission_id: { role_id: roleId, permission_id: perm.id } },
          update: {},
          create: { role_id: roleId, permission_id: perm.id, organization_id: org.id } as any,
        });
        permCount++;
      }
    }
  }
  console.log(`  ✅ ${permCount} role-permission assignments created`);

  // --- 6. Users (8 personas) ---
  console.log("\n[6/14] Creating users (with hashed passwords)...");
  const passwordHash = await bcrypt.hash("password123", 10);
  const usersData = [
    { id: IDS.userSuperAdmin, role_id: IDS.roleSuperAdmin, name: "Super Admin", name_bn: "সুপার অ্যাডমিন", email: "superadmin@madrashaos.org", phone: "+880 1711 000001", branch_id: IDS.branchDhaka },
    { id: IDS.userAuthority, role_id: IDS.roleAuthority, name: "Principal Ahmad", name_bn: "অধ্যক্ষ আহমদ", email: "principal@madrashaos.org", phone: "+880 1711 000002", branch_id: IDS.branchDhaka },
    { id: IDS.userAdministrator, role_id: IDS.roleAdministrator, name: "Administrator Karim", name_bn: "প্রশাসক করিম", email: "admin@madrashaos.org", phone: "+880 1711 000003", branch_id: IDS.branchDhaka },
    { id: IDS.userAccountant, role_id: IDS.roleAccountant, name: "Accountant Rahman", name_bn: "হিসাবরক্ষক রহমান", email: "accounts@madrashaos.org", phone: "+880 1711 000004", branch_id: IDS.branchDhaka },
    { id: IDS.userTeacher, role_id: IDS.roleTeacher, name: "Teacher Bilal", name_bn: "শিক্ষক বিলাল", email: "bilal@madrashaos.org", phone: "+880 1711 000005", branch_id: IDS.branchDhaka },
    { id: IDS.userStorekeeper, role_id: IDS.roleStorekeeper, name: "Storekeeper Yusuf", name_bn: "স্টোরকিপার ইউসুফ", email: "store@madrashaos.org", phone: "+880 1711 000006", branch_id: IDS.branchDhaka },
    { id: IDS.userGuardian, role_id: IDS.roleGuardian, name: "Guardian Omar", name_bn: "অভিভাবক ওমর", email: "omar.parent@example.com", phone: "+880 1711 000007", branch_id: IDS.branchDhaka },
    { id: IDS.userStudent, role_id: IDS.roleStudent, name: "Student Fatima", name_bn: "ছাত্রী ফাতিমা", email: "fatima@student.madrashaos.org", phone: "+880 1711 000008", branch_id: IDS.branchDhaka },
  ];
  for (const u of usersData) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: {
        ...u,
        organization_id: org.id,
        password_hash: passwordHash,
        status: "active",
        mfa_enabled: false,
      } as any,
    });
  }
  console.log(`  ✅ ${usersData.length} users created (password: "password123" for all)`);

  // --- 7. Classes + Sections ---
  console.log("\n[7/14] Creating classes and sections...");
  const classData = [
    { id: IDS.class1, name: "Class 1", name_bn: "প্রথম শ্রেণী", level: 1, sections: ["A", "B"] },
    { id: IDS.class3, name: "Class 3", name_bn: "তৃতীয় শ্রেণী", level: 3, sections: ["A"] },
    { id: IDS.class5, name: "Class 5", name_bn: "পঞ্চম শ্রেণী", level: 5, sections: ["A", "B"] },
    { id: IDS.class8, name: "Class 8", name_bn: "অষ্টম শ্রেণী", level: 8, sections: ["A"] },
  ];
  for (const c of classData) {
    await prisma.class.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id, organization_id: org.id, branch_id: IDS.branchDhaka,
        name: c.name, name_bn: c.name_bn, level: c.level,
      } as any,
    });
    for (const secName of c.sections) {
      await prisma.section.upsert({
        where: { id: `${c.id}-sec-${secName}` },
        update: {},
        create: {
          id: `${c.id}-sec-${secName}`, organization_id: org.id,
          class_id: c.id, name: secName,
        } as any,
      });
    }
  }
  console.log(`  ✅ ${classData.length} classes + ${classData.reduce((s, c) => s + c.sections.length, 0)} sections created`);

  // --- 8. Guardians ---
  console.log("\n[8/14] Creating guardians...");
  const guardianData = [
    { name: "Omar Faruq", name_bn: "ওমর ফারুক", phone: "+880 1711 000007", email: "omar.parent@example.com", occupation: "Business" },
    { name: "Aisha Begum", name_bn: "আয়েশা বেগম", phone: "+880 1711 000010", email: "aisha.parent@example.com", occupation: "Teacher" },
    { name: "Bilal Ahmed", name_bn: "বিলাল আহমেদ", phone: "+880 1711 000011", email: "bilal.parent@example.com", occupation: "Engineer" },
    { name: "Khadija Sultana", name_bn: "খাদিজা সুলতানা", phone: "+880 1711 000012", email: "khadija.parent@example.com", occupation: "Doctor" },
    { name: "Yusuf Khan", name_bn: "ইউসুফ খান", phone: "+880 1711 000013", email: "yusuf.parent@example.com", occupation: "Govt Service" },
    { name: "Zainab Akter", name_bn: "জয়নব আক্তার", phone: "+880 1711 000014", email: "zainab.parent@example.com", occupation: "Homemaker" },
    { name: "Hamza Rahman", name_bn: "হামজা রহমান", phone: "+880 1711 000015", email: "hamza.parent@example.com", occupation: "Business" },
    { name: "Maryam Chowdhury", name_bn: "মরিয়ম চৌধুরী", phone: "+880 1711 000016", email: "maryam.parent@example.com", occupation: "NGO Worker" },
  ];
  const guardianIds: string[] = [];
  for (let i = 0; i < guardianData.length; i++) {
    const g = guardianData[i];
    const gid = `00000000-0000-0000-0005-${(i + 1).toString().padStart(12, "0")}`;
    guardianIds.push(gid);
    await prisma.guardian.upsert({
      where: { id: gid },
      update: {},
      create: {
        id: gid, organization_id: org.id, branch_id: IDS.branchDhaka,
        name: g.name, name_bn: g.name_bn, phone: g.phone, email: g.email,
        occupation: g.occupation,
      } as any,
    });
  }
  console.log(`  ✅ ${guardianData.length} guardians created`);

  // --- 9. Students (40) ---
  console.log("\n[9/14] Creating 40 students...");
  const studentData = generateStudents();
  const studentIds: string[] = [];
  for (let i = 0; i < studentData.length; i++) {
    const s = studentData[i];
    if (!s) continue;
    const sid = `00000000-0000-0000-0006-${(i + 1).toString().padStart(12, "0")}`;
    studentIds.push(sid);
    const guardianIdx = i < 8 ? 0 : i < 18 ? 1 : i < 30 ? 2 : 3;
    await prisma.student.upsert({
      where: { id: sid },
      update: {},
      create: {
        id: sid, organization_id: org.id, branch_id: IDS.branchDhaka,
        code: s.code, name: s.name, name_bn: s.name_bn, name_ar: s.name_ar,
        class_id: s.classId, section_id: `${s.classId}-sec-${s.section}`,
        guardian_id: guardianIds[guardianIdx],
        roll: s.roll, gender: s.gender,
        dob: new Date(s.dob), admitted_at: new Date(s.admittedAt),
        status: StudentStatus.active,
      } as any,
    });
  }
  console.log(`  ✅ ${studentData.length} students created`);

  // --- 10. Accounts ---
  console.log("\n[10/14] Creating accounts (incl. Zakat fund)...");
  const accountData = [
    { id: IDS.accCash, code: "1000", name: "Cash on Hand", type: AccountType.asset, fund: FundType.general, balance: 245000 },
    { id: IDS.accBank, code: "1010", name: "Bank — Sonali", type: AccountType.asset, fund: FundType.general, balance: 845000 },
    { id: IDS.accMobile, code: "1020", name: "Mobile Wallet (bKash)", type: AccountType.asset, fund: FundType.general, balance: 18500 },
    { id: IDS.accIncomeFees, code: "4000", name: "Fee Income", type: AccountType.income, fund: FundType.general, balance: 180000 },
    { id: IDS.accExpense, code: "5000", name: "Operating Expenses", type: AccountType.expense, fund: FundType.general, balance: 95000 },
    { id: IDS.accZakatFund, code: "3000", name: "Zakat Fund", type: AccountType.liability, fund: FundType.zakat, balance: 125000 },
    { id: IDS.accDonation, code: "4100", name: "Donation Income", type: AccountType.income, fund: FundType.general, balance: 42000 },
    { id: IDS.accSalary, code: "5100", name: "Salary Expense", type: AccountType.expense, fund: FundType.general, balance: 320000 },
  ];
  for (const a of accountData) {
    await prisma.account.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id, organization_id: org.id, branch_id: IDS.branchDhaka,
        code: a.code, name: a.name, type: a.type, fund: a.fund,
        balance: a.balance, is_active: true,
      } as any,
    });
  }
  console.log(`  ✅ ${accountData.length} accounts created (incl. Zakat fund with fund='zakat')`);

  // --- 11. Fee Plans + Installments ---
  console.log("\n[11/14] Creating fee plans (40 plans × 3 installments)...");
  for (let i = 0; i < studentIds.length; i++) {
    const sid = studentIds[i];
    if (!sid) continue;
    const fpId = `00000000-0000-0000-0007-${(i + 1).toString().padStart(12, "0")}`;
    await prisma.feePlan.upsert({
      where: { id: fpId },
      update: {},
      create: {
        id: fpId, organization_id: org.id, branch_id: IDS.branchDhaka,
        student_id: sid, academic_year: 2026,
      } as any,
    });
    // 3 installments per plan
    const installments = [
      { label: "January 2026", amount: 1500, dueDate: "2026-01-10", paid: i < 30, paidDate: i < 30 ? "2026-01-08" : null, receiptNo: i < 30 ? `RCP-2026-${(i + 1).toString().padStart(4, "0")}` : null },
      { label: "March 2026", amount: 1500, dueDate: "2026-03-10", paid: i < 20, paidDate: i < 20 ? "2026-03-05" : null, receiptNo: i < 20 ? `RCP-2026-${(1000 + i).toString().padStart(4, "0")}` : null },
      { label: "June 2026", amount: 1500, dueDate: "2026-06-10", paid: false, paidDate: null, receiptNo: null },
    ];
    for (let j = 0; j < installments.length; j++) {
      const inst = installments[j];
      if (!inst) continue;
      await prisma.feeInstallment.upsert({
        where: { id: `${fpId}-inst-${j + 1}` },
        update: {},
        create: {
          id: `${fpId}-inst-${j + 1}`, organization_id: org.id, branch_id: IDS.branchDhaka,
          fee_plan_id: fpId, label: inst.label, amount: inst.amount,
          due_date: new Date(inst.dueDate), is_paid: inst.paid,
          paid_date: inst.paidDate ? new Date(inst.paidDate) : null,
          receipt_no: inst.receiptNo,
        } as any,
      });
    }
  }
  console.log(`  ✅ 40 fee plans + 120 installments created`);

  // --- 12. Fee Payments (8 recent receipts) ---
  console.log("\n[12/14] Creating fee payments (8 receipts)...");
  const paymentsData = [
    { studentIdx: 0, method: FeeMethod.cash, accountId: IDS.accCash, receiptNo: "RCP-2026-1001", collectedAt: "2026-09-16", amount: 1500 },
    { studentIdx: 1, method: FeeMethod.cash, accountId: IDS.accCash, receiptNo: "RCP-2026-1002", collectedAt: "2026-09-15", amount: 1500 },
    { studentIdx: 2, method: FeeMethod.bank, accountId: IDS.accBank, receiptNo: "RCP-2026-1003", collectedAt: "2026-09-14", amount: 1500 },
    { studentIdx: 3, method: FeeMethod.mobile, accountId: IDS.accMobile, receiptNo: "RCP-2026-1004", collectedAt: "2026-09-13", amount: 1500 },
    { studentIdx: 4, method: FeeMethod.cash, accountId: IDS.accCash, receiptNo: "RCP-2026-1005", collectedAt: "2026-09-12", amount: 1500 },
    { studentIdx: 5, method: FeeMethod.cash, accountId: IDS.accCash, receiptNo: "RCP-2026-1006", collectedAt: "2026-09-11", amount: 1500 },
    { studentIdx: 6, method: FeeMethod.bank, accountId: IDS.accBank, receiptNo: "RCP-2026-1007", collectedAt: "2026-09-10", amount: 1500 },
    { studentIdx: 7, method: FeeMethod.cash, accountId: IDS.accCash, receiptNo: "RCP-2026-1008", collectedAt: "2026-09-09", amount: 1500 },
  ];
  for (let i = 0; i < paymentsData.length; i++) {
    const p = paymentsData[i];
    if (!p) continue;
    const sid = studentIds[p.studentIdx];
    if (!sid) continue;
    await prisma.feePayment.upsert({
      where: { id: `00000000-0000-0000-0008-${(i + 1).toString().padStart(12, "0")}` },
      update: {},
      create: {
        id: `00000000-0000-0000-0008-${(i + 1).toString().padStart(12, "0")}`,
        organization_id: org.id, branch_id: IDS.branchDhaka,
        student_id: sid, installment_id: `00000000-0000-0000-0007-${(p.studentIdx + 1).toString().padStart(12, "0")}-inst-2`,
        amount: p.amount, method: p.method, account_id: p.accountId,
        receipt_no: p.receiptNo, collected_by: IDS.userAccountant,
        collected_at: new Date(p.collectedAt),
      } as any,
    });
  }
  console.log(`  ✅ ${paymentsData.length} fee payments created`);

  // --- 13. Ledger Entries (12 entries) ---
  console.log("\n[13/14] Creating ledger entries (12 entries)...");
  const ledgerData = [
    { voucherNo: "JV-2026-001", date: "2026-09-16", narration: "Fee collection — January batch", debit: IDS.accCash, credit: IDS.accIncomeFees, amount: 45000, status: LedgerStatus.posted, postedBy: IDS.userAccountant },
    { voucherNo: "JV-2026-002", date: "2026-09-15", narration: "Maintenance expense — electrical repair", debit: IDS.accExpense, credit: IDS.accCash, amount: 12000, status: LedgerStatus.posted, postedBy: IDS.userAccountant },
    { voucherNo: "JV-2026-003", date: "2026-09-15", narration: "Salary payment — teaching staff", debit: IDS.accSalary, credit: IDS.accBank, amount: 285000, status: LedgerStatus.posted, postedBy: IDS.userAccountant },
    { voucherNo: "JV-2026-004", date: "2026-09-14", narration: "Bank transfer — Cash→Bank", debit: IDS.accBank, credit: IDS.accCash, amount: 50000, status: LedgerStatus.posted, postedBy: IDS.userAccountant },
    { voucherNo: "JV-2026-005", date: "2026-09-14", narration: "Zakat distribution — 5 needy students", debit: IDS.accZakatFund, credit: IDS.accCash, amount: 15000, status: LedgerStatus.posted, postedBy: IDS.userAccountant },
    { voucherNo: "JV-2026-006", date: "2026-09-13", narration: "Donation received — anonymous", debit: IDS.accCash, credit: IDS.accDonation, amount: 5000, status: LedgerStatus.posted, postedBy: IDS.userAccountant },
    { voucherNo: "JV-2026-007", date: "2026-09-13", narration: "Library books purchase", debit: IDS.accExpense, credit: IDS.accCash, amount: 8500, status: LedgerStatus.pending, postedBy: IDS.userAccountant },
    { voucherNo: "JV-2026-008", date: "2026-09-12", narration: "Transport fuel — September", debit: IDS.accExpense, credit: IDS.accCash, amount: 3000, status: LedgerStatus.posted, postedBy: IDS.userAccountant },
    { voucherNo: "JV-2026-009", date: "2026-09-12", narration: "Food expense — hostel meals", debit: IDS.accExpense, credit: IDS.accCash, amount: 18000, status: LedgerStatus.posted, postedBy: IDS.userAccountant },
    { voucherNo: "JV-2026-010", date: "2026-09-11", narration: "Asset disposal — old computer", debit: IDS.accExpense, credit: IDS.accCash, amount: 0, status: LedgerStatus.posted, postedBy: IDS.userAdministrator },
    { voucherNo: "JV-2026-011", date: "2026-09-11", narration: "Mobile banking deposit", debit: IDS.accBank, credit: IDS.accMobile, amount: 15000, status: LedgerStatus.posted, postedBy: IDS.userAccountant },
    { voucherNo: "JV-2026-012", date: "2026-09-10", narration: "Purchase — stationery from ABC Supplier", debit: IDS.accExpense, credit: IDS.accCash, amount: 22000, status: LedgerStatus.pending, postedBy: IDS.userAccountant },
  ];
  for (let i = 0; i < ledgerData.length; i++) {
    const e = ledgerData[i];
    if (!e) continue;
    await prisma.ledgerEntry.upsert({
      where: { id: `00000000-0000-0000-0009-${(i + 1).toString().padStart(12, "0")}` },
      update: {},
      create: {
        id: `00000000-0000-0000-0009-${(i + 1).toString().padStart(12, "0")}`,
        organization_id: org.id, branch_id: IDS.branchDhaka,
        voucher_no: e.voucherNo, date: new Date(e.date), narration: e.narration,
        debit_account_id: e.debit, credit_account_id: e.credit,
        amount: e.amount, status: e.status, posted_by: e.postedBy,
        fund: FundType.general,
      } as any,
    });
  }
  console.log(`  ✅ ${ledgerData.length} ledger entries created (2 pending)`);

  // --- 14. Attendance Sessions (4 sessions for Class 5-A) ---
  console.log("\n[14/14] Creating attendance sessions (Class 5-A × 4 days)...");
  const class5AStudents = studentIds.slice(18, 30); // Class 5 Section A
  const attendanceDates = ["2026-09-13", "2026-09-14", "2026-09-15", "2026-09-16"];
  for (let d = 0; d < attendanceDates.length; d++) {
    const sessionId = `00000000-0000-0000-0010-${(d + 1).toString().padStart(12, "0")}`;
    await prisma.attendanceSession.upsert({
      where: { id: sessionId },
      update: {},
      create: {
        id: sessionId, organization_id: org.id, branch_id: IDS.branchDhaka,
        class_id: IDS.class5, section: "A", date: new Date(attendanceDates[d]!),
        taken_by: IDS.userTeacher, is_submitted: true,
      } as any,
    });
    // Records for each student
    for (let i = 0; i < class5AStudents.length; i++) {
      const sid = class5AStudents[i];
      if (!sid) continue;
      let status: AttendanceStatus = AttendanceStatus.present;
      if (d === 0 && i % 7 === 0) status = AttendanceStatus.absent;
      else if (d === 0 && i % 11 === 0) status = AttendanceStatus.late;
      else if (d === 1 && i % 5 === 0) status = AttendanceStatus.absent;
      else if (d === 1 && i % 9 === 0) status = AttendanceStatus.leave;
      else if (d === 2 && i % 11 === 0) status = AttendanceStatus.absent;
      else if (d === 2 && i % 13 === 0) status = AttendanceStatus.late;
      else if (d === 3 && i % 13 === 0) status = AttendanceStatus.absent;

      await prisma.attendanceRecord.upsert({
        where: { id: `${sessionId}-rec-${i}` },
        update: {},
        create: {
          id: `${sessionId}-rec-${i}`, organization_id: org.id, branch_id: IDS.branchDhaka,
          session_id: sessionId, student_id: sid, status,
        } as any,
      });
    }
  }
  console.log(`  ✅ 4 attendance sessions + ${class5AStudents.length * 4} records created`);

  // --- 15. Inventory Items (10 items, 3 low-stock) ---
  console.log("\n[15/15] Creating inventory items...");
  const inventoryData = [
    { code: "STN-001", name: "Notebook (200pg)", name_bn: "খাতা (২০০ পৃষ্ঠা)", category: "Stationery", unit: "pcs", qty: 245, reorder: 50 },
    { code: "STN-002", name: "Pen (Blue)", name_bn: "কলম (নীল)", category: "Stationery", unit: "pcs", qty: 32, reorder: 50 },
    { code: "STN-003", name: "Pencil", name_bn: "পেন্সিল", category: "Stationery", unit: "pcs", qty: 180, reorder: 60 },
    { code: "STN-004", name: "Eraser", name_bn: "ইরেজার", category: "Stationery", unit: "pcs", qty: 95, reorder: 40 },
    { code: "FOD-001", name: "Rice (Sella)", name_bn: "চাল (সেলা)", category: "Food", unit: "kg", qty: 145, reorder: 50 },
    { code: "FOD-002", name: "Lentils (Masoor)", name_bn: "মসুর ডাল", category: "Food", unit: "kg", qty: 28, reorder: 30 },
    { code: "FOD-003", name: "Cooking Oil", name_bn: "রান্নার তেল", category: "Food", unit: "ltr", qty: 65, reorder: 20 },
    { code: "CLN-001", name: "Detergent", name_bn: "ডিটারজেন্ট", category: "Cleaning", unit: "kg", qty: 12, reorder: 15 },
    { code: "CLN-002", name: "Floor Cleaner", name_bn: "ফ্লোর ক্লিনার", category: "Cleaning", unit: "ltr", qty: 28, reorder: 10 },
    { code: "MED-001", name: "First Aid Kit", name_bn: "ফার্স্ট এইড কিট", category: "Medical", unit: "set", qty: 8, reorder: 5 },
  ];
  for (let i = 0; i < inventoryData.length; i++) {
    const item = inventoryData[i];
    if (!item) continue;
    await prisma.inventoryItem.upsert({
      where: { id: `00000000-0000-0000-0011-${(i + 1).toString().padStart(12, "0")}` },
      update: {},
      create: {
        id: `00000000-0000-0000-0011-${(i + 1).toString().padStart(12, "0")}`,
        organization_id: org.id, branch_id: IDS.branchDhaka,
        code: item.code, name: item.name, name_bn: item.name_bn,
        category: item.category, unit: item.unit,
        qty_in_stock: item.qty, reorder_level: item.reorder,
      } as any,
    });
  }
  console.log(`  ✅ ${inventoryData.length} inventory items created (3 low-stock)`);

  // --- 16. Notices (5) ---
  console.log("\n[16/16] Creating notices...");
  const noticeData = [
    { title: "Result Publication — Mid-term", title_bn: "মধ্যমেয়াদী ফলাফল প্রকাশ", body: "Mid-term results will be published on 20 September 2026.", body_bn: "মধ্যমেয়াদী ফলাফল ২০ সেপ্টেম্বর ২০২৬ তারিখে প্রকাশিত হবে।", audience: NoticeAudience.guardians, recipientCount: 40, sentBy: IDS.userAdministrator, sentAt: "2026-09-15" },
    { title: "Holiday — Eid Milad", title_bn: "ছুটি — ঈদে মিলাদ", body: "The madrasha will remain closed on 18 September 2026.", body_bn: "১৮ সেপ্টেম্বর ২০২৬ তারিখে মাদরাসা বন্ধ থাকবে।", audience: NoticeAudience.all, recipientCount: 40, sentBy: IDS.userAdministrator, sentAt: "2026-09-14" },
    { title: "Fee Payment Reminder", title_bn: "ফি পরিশোধ রিমাইন্ডার", body: "Please clear the March 2026 installment by 10 September.", body_bn: "অনুগ্রহ করে ১০ সেপ্টেম্বরের মধ্যে মার্চ ২০২৬ কিস্তি পরিশোধ করুন।", audience: NoticeAudience.guardians, audienceFilter: "class-5", recipientCount: 22, sentBy: IDS.userAccountant, sentAt: "2026-09-13" },
    { title: "Parent-Teacher Meeting", title_bn: "অভিভাবক-শিক্ষক সভা", body: "PTM scheduled for 25 September 2026 at 10 AM.", body_bn: "২৫ সেপ্টেম্বর ২০২৬ সকাল ১০টায় অভিভাবক-শিক্ষক সভা অনুষ্ঠিত হবে।", audience: NoticeAudience.guardians, recipientCount: 40, sentBy: IDS.userAuthority, sentAt: "2026-09-12" },
    { title: "Staff Meeting", title_bn: "স্টাফ সভা", body: "Monthly staff meeting on 30 September at 2 PM in the conference room.", body_bn: "৩০ সেপ্টেম্বর বিকাল ২টায় কনফারেন্স রুমে মাসিক স্টাফ সভা।", audience: NoticeAudience.staff, recipientCount: 6, sentBy: IDS.userAdministrator, sentAt: "2026-09-11" },
  ];
  for (let i = 0; i < noticeData.length; i++) {
    const n = noticeData[i];
    if (!n) continue;
    await prisma.notice.upsert({
      where: { id: `00000000-0000-0000-0012-${(i + 1).toString().padStart(12, "0")}` },
      update: {},
      create: {
        id: `00000000-0000-0000-0012-${(i + 1).toString().padStart(12, "0")}`,
        organization_id: org.id, branch_id: IDS.branchDhaka,
        title: n.title, title_bn: n.title_bn, body: n.body, body_bn: n.body_bn,
        audience: n.audience, audience_filter: n.audienceFilter || null,
        recipient_count: n.recipientCount, sent_by: n.sentBy,
        sent_at: new Date(n.sentAt),
      } as any,
    });
  }
  console.log(`  ✅ ${noticeData.length} notices created`);

  // --- 17. Approvals (6) ---
  console.log("\n[17/17] Creating approvals...");
  const approvalData = [
    { type: ApprovalType.expense, title: "Library books purchase — ৳8,500", amount: 8500, requestedBy: IDS.userAccountant, requestedAt: "2026-09-13", status: ApprovalStatus.pending, decidedBy: null, decidedAt: null },
    { type: ApprovalType.purchase, title: "Stationery from ABC Supplier — ৳22,000", amount: 22000, requestedBy: IDS.userAccountant, requestedAt: "2026-09-10", status: ApprovalStatus.pending, decidedBy: null, decidedAt: null },
    { type: ApprovalType.discount, title: "Fee discount — Student MOS-2026-005 — 50%", amount: 750, requestedBy: IDS.userAccountant, requestedAt: "2026-09-12", status: ApprovalStatus.pending, decidedBy: null, decidedAt: null },
    { type: ApprovalType.expense, title: "Maintenance expense — ৳25,000", amount: 25000, requestedBy: IDS.userAccountant, requestedAt: "2026-09-08", status: ApprovalStatus.approved, decidedBy: IDS.userAuthority, decidedAt: "2026-09-09" },
    { type: ApprovalType.admission, title: "Admission — new applicant MOS-2026-041", amount: null, requestedBy: IDS.userAdministrator, requestedAt: "2026-09-07", status: ApprovalStatus.approved, decidedBy: IDS.userAuthority, decidedAt: "2026-09-08" },
    { type: ApprovalType.purchase, title: "Sports equipment — ৳15,000", amount: 15000, requestedBy: IDS.userStorekeeper, requestedAt: "2026-09-05", status: ApprovalStatus.rejected, decidedBy: IDS.userAuthority, decidedAt: "2026-09-06" },
  ];
  for (let i = 0; i < approvalData.length; i++) {
    const a = approvalData[i];
    if (!a) continue;
    await prisma.approval.upsert({
      where: { id: `00000000-0000-0000-0013-${(i + 1).toString().padStart(12, "0")}` },
      update: {},
      create: {
        id: `00000000-0000-0000-0013-${(i + 1).toString().padStart(12, "0")}`,
        organization_id: org.id, branch_id: IDS.branchDhaka,
        type: a.type, title: a.title, amount: a.amount,
        requested_by: a.requestedBy, requested_at: new Date(a.requestedAt),
        status: a.status, decided_by: a.decidedBy,
        decided_at: a.decidedAt ? new Date(a.decidedAt) : null,
      } as any,
    });
  }
  console.log(`  ✅ ${approvalData.length} approvals created (3 pending)`);

  // --- Summary ---
  console.log("\n═══════════════════════════════════════════════");
  console.log("  ✅ Database seed complete!");
  console.log("═══════════════════════════════════════════════");
  console.log("\nSeed data summary:");
  console.log("  1 organization (Darul Uloom Madrasha)");
  console.log("  3 branches (Dhaka, Chittagong, Sylhet)");
  console.log("  8 roles + 110+ permissions + role-permission assignments");
  console.log("  8 users (password: 'password123' for all)");
  console.log("  4 classes + 5 sections");
  console.log("  8 guardians");
  console.log("  40 students (with bn/en/ar names)");
  console.log("  8 accounts (incl. Zakat fund with fund='zakat')");
  console.log("  40 fee plans + 120 installments");
  console.log("  8 fee payments");
  console.log("  12 ledger entries (2 pending)");
  console.log("  4 attendance sessions + 48 records");
  console.log("  10 inventory items (3 low-stock)");
  console.log("  5 notices");
  console.log("  6 approvals (3 pending)");
  console.log("\nLogin credentials:");
  console.log("  Email: admin@madrashaos.org");
  console.log("  Password: password123");
  console.log("  (same password for all 8 users)");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
