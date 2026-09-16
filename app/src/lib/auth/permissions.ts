/**
 * MadrashaOS — Permission Catalog
 *
 * Session C0.4 — Mock-Data Layer & Seeding
 * Source: SRS §6.2 (Auth & Authorization) + §2.1.3 (RBAC) + Session 2.4
 *         permission-to-UI rule matrix.
 *
 * Permission codes follow the dotted convention:
 *   {module}.{resource}.{action}
 *
 * Examples:
 *   fees.payment.create    — Collect Payment button visibility
 *   students.notes.view    — Student special_notes field visibility
 *   accounting.ledger.post — Post a balanced ledger entry
 *
 * The catalog is the single source of truth for:
 *   - The IfPermission component (src/components/auth/IfPermission.tsx — C2.4)
 *   - The RBAC matrix editor (C3.1)
 *   - The mockApi permission enforcement (returns 403 when missing)
 *
 * Per SRS §5.1: the frontend HIDES unauthorized UI; the backend still
 * enforces authorization. This catalog drives the frontend hide rule.
 */

export const PERMISSION_CODES = [
  // --- Foundation (SRS §2.1) ---
  "organization.branch.switch",
  "organization.branch.create",
  "organization.config.view",
  "organization.module.toggle",
  "rbac.role.view",
  "rbac.role.create",
  "rbac.role.update",
  "rbac.permission.assign",
  "audit.view",
  "audit.export",
  "security.policy.edit",
  "backup.run",
  "backup.restore",

  // --- People (SRS §2.2) ---
  "students.view",
  "students.create",
  "students.update",
  "students.promote",
  "students.notes.view",
  "students.notes.edit",
  "admission.view",
  "admission.approve",
  "admission.reject",
  "guardians.view",
  "guardians.view.own", // scope: own linked children only
  "teachers.view",
  "teachers.create",
  "teachers.assign",
  "employees.view",
  "employees.create",

  // --- Academic (SRS §2.3) ---
  "academic.structure.view",
  "academic.structure.edit",
  "attendance.view",
  "attendance.take",
  "attendance.view.own", // scope: own classes
  "exams.view",
  "exams.enter-marks",
  "exams.publish",
  "results.view",
  "results.view.own", // scope: own/child results
  "results.generate",

  // --- Finance (SRS §2.4) ---
  "fees.view",
  "fees.payment.create",
  "fees.payment.create.own", // scope: own children
  "fees.plan.view",
  "fees.plan.edit",
  "scholarship.view",
  "scholarship.approve",
  "accounting.ledger.view",
  "accounting.ledger.post",
  "cashbank.transfer",
  "zakat.view",
  "zakat.receive",
  "zakat.distribute",
  "donations.view",
  "donations.create",
  "donations.create.public", // scope: public visitor (no login)

  // --- Operations (SRS §2.5) ---
  "inventory.view",
  "inventory.receive",
  "inventory.issue",
  "purchase.view",
  "purchase.create",
  "purchase.approve",
  "suppliers.view",
  "assets.view",
  "assets.transfer",
  "assets.dispose",
  "hostel.view",
  "hostel.allocate",
  "food.meal-plan",
  "library.view",
  "library.issue",
  "library.return",
  "transport.view",
  "transport.record-expense",

  // --- Communication & Platform (SRS §2.6 + §2.7) ---
  "notices.view",
  "notices.compose",
  "notices.send",
  "documents.upload",
  "documents.download",
  "reports.view",
  "reports.finance.view",
  "reports.finance.export",
  "dashboard.view",
  "dashboard.view.authority",
  "dashboard.view.accountant",
  "dashboard.view.teacher",
  "dashboard.view.storekeeper",
  "dashboard.view.guardian",
  "pdf.generate",
  "approval.view",
  "approval.approve",
  "approval.reject",
  "approval.delegate",

  // --- Platform-level (SRS §2.7.2 multi-tenant) ---
  "tenant.provision",
  "tenant.manage",
] as const;

export type PermissionCode = (typeof PERMISSION_CODES)[number];

/** Convenience set for O(1) lookup. */
export const PERMISSION_SET: ReadonlySet<string> = new Set(PERMISSION_CODES);

/**
 * Returns true if the given code is a valid permission in the catalog.
 * Used by mockApi to validate role-permission assignments.
 */
export function isValidPermission(code: string): boolean {
  return PERMISSION_SET.has(code);
}
