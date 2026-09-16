"use client";

/**
 * MadrashaOS — SideNav
 *
 * Session C0.3 — Theme Provider & Global Shell Skeleton
 *
 * Collapsible left navigation showing module groups from the Session 0.1
 * module taxonomy. Items are PLACEHOLDERS for now — they render the full
 * nav structure but don't navigate. In C2.1, this will be wired to:
 *   - the dynamic module tree (enabled-modules + permissions per SRS §5.1)
 *   - permission-aware filtering (hide, don't disable per Risk R3 / D1)
 *   - branch switcher fresh-tab behavior (Risk R1)
 *
 * Collapse: click the collapse button at the bottom to toggle between
 * expanded (256px) and icon-only (64px) modes on desktop.
 */

import { useState } from "react";
import {
  LayoutDashboard,
  Building2,
  ShieldCheck,
  History,
  GraduationCap,
  UserPlus,
  Users,
  UserCheck,
  ClipboardCheck,
  FileText,
  Award,
  Wallet,
  Calculator,
  HandCoins,
  Package,
  Home,
  BookOpen,
  Bell,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { MessageKey } from "@/lib/i18n/messages";

type NavItem = {
  id: string;
  labelKey: MessageKey;
  icon: LucideIcon;
};

type NavGroup = {
  id: string;
  labelKey: MessageKey;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    id: "main",
    labelKey: "shell.nav.dashboard",
    items: [
      { id: "dashboard", labelKey: "shell.nav.dashboard", icon: LayoutDashboard },
    ],
  },
  {
    id: "foundation",
    labelKey: "shell.nav.group.foundation",
    items: [
      { id: "organization", labelKey: "shell.nav.organization", icon: Building2 },
      { id: "rbac", labelKey: "shell.nav.rbac", icon: ShieldCheck },
      { id: "audit", labelKey: "shell.nav.audit", icon: History },
    ],
  },
  {
    id: "people",
    labelKey: "shell.nav.group.people",
    items: [
      { id: "students", labelKey: "shell.nav.students", icon: GraduationCap },
      { id: "admission", labelKey: "shell.nav.admission", icon: UserPlus },
      { id: "guardians", labelKey: "shell.nav.guardians", icon: Users },
      { id: "teachers", labelKey: "shell.nav.teachers", icon: UserCheck },
    ],
  },
  {
    id: "academic",
    labelKey: "shell.nav.group.academic",
    items: [
      { id: "attendance", labelKey: "shell.nav.attendance", icon: ClipboardCheck },
      { id: "exams", labelKey: "shell.nav.exams", icon: FileText },
      { id: "results", labelKey: "shell.nav.results", icon: Award },
    ],
  },
  {
    id: "finance",
    labelKey: "shell.nav.group.finance",
    items: [
      { id: "fees", labelKey: "shell.nav.fees", icon: Wallet },
      { id: "accounting", labelKey: "shell.nav.accounting", icon: Calculator },
      { id: "zakat", labelKey: "shell.nav.zakat", icon: HandCoins },
    ],
  },
  {
    id: "operations",
    labelKey: "shell.nav.group.operations",
    items: [
      { id: "inventory", labelKey: "shell.nav.inventory", icon: Package },
      { id: "hostel", labelKey: "shell.nav.hostel", icon: Home },
      { id: "library", labelKey: "shell.nav.library", icon: BookOpen },
    ],
  },
];

const PLATFORM_ITEMS: NavItem[] = [
  { id: "notices", labelKey: "shell.nav.notices", icon: Bell },
  { id: "reports", labelKey: "shell.nav.reports", icon: BarChart3 },
  { id: "settings", labelKey: "shell.nav.settings", icon: Settings },
];

export function SideNav({
  className = "",
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const [activeId, setActiveId] = useState("dashboard");

  function handleItemClick(id: string) {
    setActiveId(id);
    onNavigate?.();
    // Navigation wired in C2.1 — for now, items are visual placeholders
  }

  const widthClass = collapsed ? "w-16" : "w-64";

  return (
    <aside
      className={`flex flex-col border-e border-border-default bg-surface-card transition-all duration-normal ease-standard ${widthClass} ${className}`}
    >
      {/* Nav scroll area */}
      <nav
        className="flex-1 overflow-y-auto py-4"
        aria-label="Main navigation"
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.id} className="mb-4">
            {/* Group label (hidden when collapsed) */}
            {!collapsed && (
              <p className="px-4 pb-1 text-caption font-medium uppercase tracking-wider text-text-muted">
                {group.id === "main" ? "" : t(group.labelKey)}
              </p>
            )}
            {collapsed && group.id !== "main" && (
              <div className="mx-3 my-2 border-t border-border-default" />
            )}

            {/* Items */}
            <ul className="space-y-0.5 px-2">
              {group.items.map((item) => {
                const isActive = activeId === item.id;
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleItemClick(item.id)}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-subtitle transition-colors ${
                        isActive
                          ? "bg-primary-50 font-medium text-primary-700"
                          : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                      } ${collapsed ? "justify-center" : ""}`}
                      title={collapsed ? t(item.labelKey) : undefined}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon
                        className={`h-5 w-5 shrink-0 ${
                          isActive ? "text-primary-500" : ""
                        }`}
                      />
                      {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {/* Platform group */}
        <div className="mb-4">
          {!collapsed && (
            <p className="px-4 pb-1 text-caption font-medium uppercase tracking-wider text-text-muted">
              Platform
            </p>
          )}
          {collapsed && <div className="mx-3 my-2 border-t border-border-default" />}
          <ul className="space-y-0.5 px-2">
            {PLATFORM_ITEMS.map((item) => {
              const isActive = activeId === item.id;
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleItemClick(item.id)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-subtitle transition-colors ${
                      isActive
                        ? "bg-primary-50 font-medium text-primary-700"
                        : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                    } ${collapsed ? "justify-center" : ""}`}
                    title={collapsed ? t(item.labelKey) : undefined}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon
                      className={`h-5 w-5 shrink-0 ${
                        isActive ? "text-primary-500" : ""
                      }`}
                    />
                    {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Collapse toggle (desktop only) */}
      <div className="border-t border-border-default p-2">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-subtitle text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5 shrink-0" data-directional="true" />
          ) : (
            <PanelLeftClose className="h-5 w-5 shrink-0" data-directional="true" />
          )}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
