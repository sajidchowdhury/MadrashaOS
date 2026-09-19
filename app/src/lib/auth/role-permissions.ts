/**
 * MadrashaOS — Role → Permission Map
 *
 * Session C0.4 — Mock-Data Layer & Seeding
 * Source: Session 0.2 personas + SRS §8.1 role definitions + §2.1.3 RBAC.
 *
 * Defines which permission codes (from permissions.ts) each of the 8
 * personas holds. Used by sessionStore to derive `permissions[]` when the
 * user switches roles via the DevToolbar.
 *
 * Key rules enforced (SRS §2.1.3 + Do-Not-Do D3 + D16 + D18):
 *   - Teacher has NO financial permissions (D3)
 *   - Accountant has NO academic edit permissions (D3)
 *   - Guardian has read-only on own children only (scope: *.view.own)
 *   - No role can approve its own request (D16 — enforced in approval flow)
 *   - Zakat permissions are isolated (D18 — fund badge enforced in UI)
 */

import type { Role } from "@/stores/types";
import type { PermissionCode } from "./permissions";

export const ROLE_PERMISSIONS: Record<Role, PermissionCode[]> = {
  /**
   * Super Admin — Platform Operator (SRS §8.1)
   * Platform-wide ALL; not bound to a single tenant.
   */
  "super-admin": [
    "organization.branch.switch",
    "organization.branch.create",
    "organization.config.view",
    "organization.config.edit",
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
    "tenant.provision",
    "tenant.manage",
    "dashboard.view",
    "notices.view",
    "notices.compose",
    "notices.send",
    "documents.upload",
    "documents.download",
    "reports.view",
    "approval.view",
    "approval.approve",
    "approval.reject",
    "approval.delegate",
    "pdf.generate",
  ],

  /**
   * Authority — Madrasha Head / Principal (SRS §8.1)
   * All-branch read; approve on routing rules; no CRUD on student records.
   */
  authority: [
    "organization.branch.switch",
    "organization.config.view",
    "rbac.role.view",
    "audit.view",
    "audit.export",
    "students.view",
    "students.notes.view",
    "admission.view",
    "admission.approve",
    "admission.reject",
    "guardians.view",
    "teachers.view",
    "academic.structure.view",
    "attendance.view",
    "exams.view",
    "results.view",
    "results.generate",
    "fees.view",
    "fees.plan.view",
    "scholarship.view",
    "scholarship.approve",
    "accounting.ledger.view",
    "zakat.view",
    "donations.view",
    "inventory.view",
    "purchase.view",
    "purchase.approve",
    "suppliers.view",
    "assets.view",
    "hostel.view",
    "library.view",
    "transport.view",
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
    "pdf.generate",
    "approval.view",
    "approval.approve",
    "approval.reject",
    "approval.delegate",
  ],

  /**
   * Administrator — Madrasha Office Admin (SRS §8.1)
   * Tenant-wide CRUD except financial posting + cross-tenant ops.
   */
  administrator: [
    "organization.branch.switch",
    "organization.config.view",
    "organization.config.edit",
    "organization.module.toggle",
    "rbac.role.view",
    "rbac.role.create",
    "rbac.role.update",
    "rbac.permission.assign",
    "audit.view",
    "backup.run",
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
    "teachers.view",
    "teachers.create",
    "teachers.assign",
    "employees.view",
    "employees.create",
    "academic.structure.view",
    "academic.structure.edit",
    "attendance.view",
    "exams.view",
    "results.view",
    "results.generate",
    "fees.view",
    "fees.plan.view",
    "fees.plan.edit",
    "scholarship.view",
    "accounting.ledger.view",
    "inventory.view",
    "purchase.view",
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
    "notices.view",
    "notices.compose",
    "notices.send",
    "documents.upload",
    "documents.download",
    "reports.view",
    "dashboard.view",
    "pdf.generate",
    "approval.view",
  ],

  /**
   * Accountant — Madrasha Accountant (SRS §8.1)
   * Finance CRUD; cannot edit student academic info (D3).
   */
  accountant: [
    "students.view",
    "guardians.view",
    "fees.view",
    "fees.payment.create",
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
    "suppliers.view",
    "inventory.view",
    "purchase.view",
    "purchase.create",
    "assets.view",
    "transport.view",
    "transport.record-expense",
    "notices.view",
    "documents.upload",
    "documents.download",
    "reports.view",
    "reports.finance.view",
    "reports.finance.export",
    "dashboard.view",
    "dashboard.view.accountant",
    "pdf.generate",
    "approval.view",
  ],

  /**
   * Teacher — Subject Teacher (SRS §8.1)
   * Own classes + sections only; NO financial data (D3).
   */
  teacher: [
    "students.view",
    "guardians.view",
    "academic.structure.view",
    "attendance.view",
    "attendance.view.own",
    "attendance.take",
    "exams.view",
    "exams.enter-marks",
    "results.view",
    "notices.view",
    "documents.download",
    "dashboard.view",
    "dashboard.view.teacher",
  ],

  /**
   * Storekeeper — Inventory Staff (SRS §8.1)
   * Inventory + purchase CRUD; no finance or student data.
   */
  storekeeper: [
    "inventory.view",
    "inventory.receive",
    "inventory.issue",
    "purchase.view",
    "purchase.create",
    "suppliers.view",
    "assets.view",
    "notices.view",
    "documents.upload",
    "documents.download",
    "dashboard.view",
    "dashboard.view.storekeeper",
  ],

  /**
   * Guardian — Parent (SRS §8.1)
   * Read-only on own linked children; mobile-first portal.
   */
  guardian: [
    "guardians.view.own",
    "attendance.view.own",
    "results.view.own",
    "fees.view",
    "fees.payment.create.own",
    "fees.plan.view",
    "notices.view",
    "documents.download",
    "dashboard.view",
    "dashboard.view.guardian",
    "pdf.generate",
  ],

  /**
   * Student — Senior Student (SRS §8.1, optional role)
   * Read-only on own records only; no peer visibility.
   */
  student: [
    "attendance.view.own",
    "results.view.own",
    "fees.view",
    "fees.plan.view",
    "notices.view",
    "documents.download",
    "dashboard.view",
  ],
};

/**
 * Returns the permission codes for a given role.
 * Used by sessionStore when the user switches roles.
 */
export function getRolePermissions(role: Role): string[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Returns true if the given role has the given permission code.
 * Convenience for components that don't need the full session store.
 */
export function roleHasPermission(role: Role, code: string): boolean {
  return (ROLE_PERMISSIONS[role] ?? []).includes(code as PermissionCode);
}
