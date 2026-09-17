"use client";

/**
 * MadrashaOS — Dashboard Index (C2.1)
 *
 * Redirects to the role-appropriate dashboard based on the current
 * session role. Uses getDashboardRouteForRole() from the module tree.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/stores/sessionStore";
import { getDashboardRouteForRole } from "@/lib/nav/moduleTree";
import { LoadingState } from "@/components/states";

export default function DashboardIndexPage() {
  const router = useRouter();
  const role = useSessionStore((s) => s.role);

  useEffect(() => {
    router.replace(getDashboardRouteForRole(role));
  }, [role, router]);

  return (
    <div className="px-4 py-12 md:px-8">
      <div className="mx-auto max-w-[var(--grid-max-width)]">
        <LoadingState pattern="dashboard" />
      </div>
    </div>
  );
}
