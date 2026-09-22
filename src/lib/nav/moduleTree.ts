/**
 * MadrashaOS — Module Tree (Session 2.1)
 *
 * The full taxonomy of 40+ modules from Session 0.1, grouped by layer.
 * Each module has:
 *   - id (matches nav item id)
 *   - labelKey (i18n message key for the label)
 *   - icon (Lucide icon component name)
 *   - layer (Foundation/People/Academic/Finance/Operations/Communication/Platform)
 *   - permissionRequired (the permission code needed to SEE the nav item — SRS §5.1 "hide, don't disable")
 *   - phase (Foundation=0, People+Academic=1, Finance+Ops+Exams=2, Comm+Platform=3)
 *   - route (the URL path — wired in C3)
 *
 * Per SRS §5.1 / Risk R3: items the user lacks permission for are HIDDEN
 * (not disabled). The server still enforces authorization.
 */

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, Building2, ShieldCheck, History, Lock, DatabaseBackup,
  GraduationCap, UserPlus, Users, UserCheck, Briefcase,
  ClipboardCheck, FileText, Award, CalendarDays, BookMarked,
  Wallet, Calculator, HandCoins, Scale, Gift, Landmark, CreditCard,
  Package, ShoppingCart, Truck, Sofa, UtensilsCrossed, BookOpen, Bus,
  Bell, FileArchive, BarChart3, Settings,
} from "lucide-react";
import type { MessageKey } from "@/lib/i18n/messages";

export type ModuleLayer =
  | "main"
  | "foundation"
  | "people"
  | "academic"
  | "finance"
  | "operations"
  | "communication"
  | "platform";

export type ModuleDef = {
  id: string;
  labelKey: MessageKey;
  icon: LucideIcon;
  layer: ModuleLayer;
  permissionRequired: string;
  phase: 0 | 1 | 2 | 3;
  route: string;
};

export type ModuleGroup = {
  id: ModuleLayer;
  labelKey: MessageKey;
  items: ModuleDef[];
};

export const moduleTree: ModuleGroup[] = [
  {
    id: "main",
    labelKey: "shell.nav.dashboard",
    items: [
      {
        id: "dashboard",
        labelKey: "shell.nav.dashboard",
        icon: LayoutDashboard,
        layer: "main",
        permissionRequired: "dashboard.view",
        phase: 0,
        route: "/dashboard",
      },
    ],
  },
  {
    id: "foundation",
    labelKey: "shell.nav.group.foundation",
    items: [
      { id: "organization", labelKey: "shell.nav.organization", icon: Building2, layer: "foundation", permissionRequired: "organization.config.view", phase: 0, route: "/organization" },
      { id: "rbac", labelKey: "shell.nav.rbac", icon: ShieldCheck, layer: "foundation", permissionRequired: "rbac.role.view", phase: 0, route: "/rbac" },
      { id: "audit", labelKey: "shell.nav.audit", icon: History, layer: "foundation", permissionRequired: "audit.view", phase: 0, route: "/audit" },
      { id: "security", labelKey: "shell.nav.settings", icon: Lock, layer: "foundation", permissionRequired: "security.policy.edit", phase: 0, route: "/security" },
      { id: "backup", labelKey: "shell.nav.settings", icon: DatabaseBackup, layer: "foundation", permissionRequired: "backup.run", phase: 0, route: "/backup" },
    ],
  },
  {
    id: "people",
    labelKey: "shell.nav.group.people",
    items: [
      { id: "students", labelKey: "shell.nav.students", icon: GraduationCap, layer: "people", permissionRequired: "students.view", phase: 1, route: "/students" },
      { id: "admission", labelKey: "shell.nav.admission", icon: UserPlus, layer: "people", permissionRequired: "admission.view", phase: 1, route: "/admission" },
      { id: "guardians", labelKey: "shell.nav.guardians", icon: Users, layer: "people", permissionRequired: "guardians.view", phase: 1, route: "/guardians" },
      { id: "teachers", labelKey: "shell.nav.teachers", icon: UserCheck, layer: "people", permissionRequired: "teachers.view", phase: 1, route: "/teachers" },
      { id: "employees", labelKey: "shell.nav.teachers", icon: Briefcase, layer: "people", permissionRequired: "employees.view", phase: 1, route: "/employees" },
    ],
  },
  {
    id: "academic",
    labelKey: "shell.nav.group.academic",
    items: [
      { id: "academic-structure", labelKey: "shell.nav.academic-structure", icon: CalendarDays, layer: "academic", permissionRequired: "academic.structure.view", phase: 1, route: "/academic/structure" },
      { id: "subjects", labelKey: "shell.nav.subjects", icon: BookMarked, layer: "academic", permissionRequired: "academic.structure.view", phase: 1, route: "/subjects" },
      { id: "attendance", labelKey: "shell.nav.attendance", icon: ClipboardCheck, layer: "academic", permissionRequired: "attendance.view", phase: 1, route: "/attendance" },
      { id: "exams", labelKey: "shell.nav.exams", icon: FileText, layer: "academic", permissionRequired: "exams.view", phase: 2, route: "/exams" },
      { id: "results", labelKey: "shell.nav.results", icon: Award, layer: "academic", permissionRequired: "results.view", phase: 2, route: "/results" },
    ],
  },
  {
    id: "finance",
    labelKey: "shell.nav.group.finance",
    items: [
      { id: "fees", labelKey: "shell.nav.fees", icon: Wallet, layer: "finance", permissionRequired: "fees.view", phase: 2, route: "/fees" },
      { id: "accounting", labelKey: "shell.nav.accounting", icon: Calculator, layer: "finance", permissionRequired: "accounting.ledger.view", phase: 2, route: "/accounting" },
      { id: "cashbank", labelKey: "shell.nav.accounting", icon: Landmark, layer: "finance", permissionRequired: "cashbank.transfer", phase: 2, route: "/cashbank" },
      { id: "zakat", labelKey: "shell.nav.zakat", icon: Scale, layer: "finance", permissionRequired: "zakat.view", phase: 2, route: "/zakat" },
      { id: "scholarship", labelKey: "shell.nav.fees", icon: Gift, layer: "finance", permissionRequired: "scholarship.view", phase: 2, route: "/scholarship" },
      { id: "donations", labelKey: "shell.nav.fees", icon: CreditCard, layer: "finance", permissionRequired: "donations.view", phase: 2, route: "/donations" },
    ],
  },
  {
    id: "operations",
    labelKey: "shell.nav.group.operations",
    items: [
      { id: "inventory", labelKey: "shell.nav.inventory", icon: Package, layer: "operations", permissionRequired: "inventory.view", phase: 2, route: "/inventory" },
      { id: "purchase", labelKey: "shell.nav.inventory", icon: ShoppingCart, layer: "operations", permissionRequired: "purchase.view", phase: 2, route: "/purchase" },
      { id: "suppliers", labelKey: "shell.nav.inventory", icon: Truck, layer: "operations", permissionRequired: "suppliers.view", phase: 2, route: "/suppliers" },
      { id: "hostel", labelKey: "shell.nav.hostel", icon: Sofa, layer: "operations", permissionRequired: "hostel.view", phase: 3, route: "/hostel" },
      { id: "food", labelKey: "shell.nav.hostel", icon: UtensilsCrossed, layer: "operations", permissionRequired: "food.meal-plan", phase: 3, route: "/food" },
      { id: "library", labelKey: "shell.nav.library", icon: BookOpen, layer: "operations", permissionRequired: "library.view", phase: 3, route: "/library" },
      { id: "transport", labelKey: "shell.nav.inventory", icon: Bus, layer: "operations", permissionRequired: "transport.view", phase: 3, route: "/transport" },
    ],
  },
  {
    id: "communication",
    labelKey: "shell.nav.notices",
    items: [
      { id: "notices", labelKey: "shell.nav.notices", icon: Bell, layer: "communication", permissionRequired: "notices.view", phase: 3, route: "/notices" },
      { id: "documents", labelKey: "shell.nav.notices", icon: FileArchive, layer: "communication", permissionRequired: "documents.download", phase: 3, route: "/documents" },
    ],
  },
  {
    id: "platform",
    labelKey: "shell.nav.settings",
    items: [
      { id: "reports", labelKey: "shell.nav.reports", icon: BarChart3, layer: "platform", permissionRequired: "reports.view", phase: 3, route: "/reports" },
      { id: "settings", labelKey: "shell.nav.settings", icon: Settings, layer: "platform", permissionRequired: "organization.config.view", phase: 3, route: "/settings" },
    ],
  },
];

/**
 * Returns the visible module tree filtered by the user's permissions.
 * Per SRS §5.1 / Risk R3: items the user lacks permission for are HIDDEN
 * (not disabled). Groups with zero visible items are also hidden.
 *
 * @param permissions - the current session's permission codes
 */
export function getVisibleModules(permissions: string[]): ModuleGroup[] {
  const permSet = new Set(permissions);
  return moduleTree
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => permSet.has(item.permissionRequired)),
    }))
    .filter((group) => group.items.length > 0);
}

/**
 * Returns the default dashboard route for a given role.
 * Used by the AppShell root redirect and the brand logo click.
 */
export function getDashboardRouteForRole(role: string): string {
  switch (role) {
    case "authority":
      return "/dashboard/authority";
    case "accountant":
      return "/dashboard/accountant";
    case "teacher":
      return "/dashboard/teacher";
    case "storekeeper":
      return "/dashboard/storekeeper";
    case "guardian":
      return "/dashboard/guardian";
    case "student":
      return "/dashboard/guardian"; // student uses guardian-style dashboard (read-only)
    case "super-admin":
      return "/dashboard/authority"; // super-admin sees authority dashboard
    case "administrator":
    default:
      return "/dashboard/authority"; // admin sees authority dashboard (most comprehensive)
  }
}
