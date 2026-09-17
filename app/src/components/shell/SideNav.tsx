"use client";

/**
 * MadrashaOS — SideNav (C2.1 upgrade)
 *
 * Now permission-aware: uses getVisibleModules() to filter the nav tree
 * by the current session's permissions (SRS §5.1 — hide, don't disable).
 * Groups with zero visible items are also hidden (Risk R3).
 *
 * Active item detection uses usePathname() so nav highlights follow route.
 * Collapse toggle still available on desktop.
 */

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useSessionStore } from "@/stores/sessionStore";
import { getVisibleModules, type ModuleDef } from "@/lib/nav/moduleTree";

export function SideNav({
  className = "",
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const permissions = useSessionStore((s) => s.permissions);
  const setRole = useSessionStore((s) => s.setRole);
  const [collapsed, setCollapsed] = useState(false);

  // Filter modules by permissions
  const visibleGroups = getVisibleModules(permissions);

  function handleItemClick(mod: ModuleDef) {
    onNavigate?.();
    // Map known module IDs to dashboard routes for now (full routes in C3)
    if (mod.id === "dashboard") {
      // Redirect to role-appropriate dashboard
      const role = useSessionStore.getState().role;
      const route =
        role === "authority" || role === "super-admin" || role === "administrator" ? "/dashboard/authority"
        : role === "accountant" ? "/dashboard/accountant"
        : role === "teacher" ? "/dashboard/teacher"
        : role === "storekeeper" ? "/dashboard/storekeeper"
        : role === "guardian" || role === "student" ? "/dashboard/guardian"
        : "/dashboard/authority";
      router.push(route);
    } else {
      // Other routes wired in C3 — for now, stay on current page
      // (nav items are visual placeholders for non-dashboard modules)
    }
  }

  // Determine active item by checking if current path starts with the module route
  function isActive(mod: ModuleDef): boolean {
    if (mod.id === "dashboard") {
      return pathname.startsWith("/dashboard");
    }
    return pathname.startsWith(mod.route);
  }

  const widthClass = collapsed ? "w-16" : "w-64";

  return (
    <aside
      className={`flex flex-col border-e border-border-default bg-surface-card transition-all duration-normal ease-standard ${widthClass} ${className}`}
    >
      <nav className="flex-1 overflow-y-auto py-4" aria-label="Main navigation">
        {visibleGroups.map((group) => {
          const isMain = group.id === "main";
          return (
            <div key={group.id} className="mb-4">
              {!collapsed && !isMain && (
                <p className="px-4 pb-1 text-caption font-medium uppercase tracking-wider text-text-muted">
                  {t(group.labelKey)}
                </p>
              )}
              {collapsed && !isMain && (
                <div className="mx-3 my-2 border-t border-border-default" />
              )}
              <ul className="space-y-0.5 px-2">
                {group.items.map((item) => {
                  const active = isActive(item);
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => handleItemClick(item)}
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-subtitle transition-colors ${
                          active
                            ? "bg-primary-50 font-medium text-primary-700"
                            : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                        } ${collapsed ? "justify-center" : ""}`}
                        title={collapsed ? t(item.labelKey) : undefined}
                        aria-current={active ? "page" : undefined}
                      >
                        <Icon className={`h-5 w-5 shrink-0 ${active ? "text-primary-500" : ""}`} />
                        {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
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
