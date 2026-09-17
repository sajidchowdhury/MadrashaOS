import type { Metadata } from "next";
import { PublicLayout } from "@/components/public/PublicLayout";

/**
 * MadrashaOS — Public Route Group Layout (Phase C5.2)
 *
 * Wraps every route under `/public/*` in the PublicLayout chrome —
 * sticky navbar + footer — WITHOUT the AppShell + DevToolbar that the
 * `(app)` route group uses.
 *
 * Per SRS §2.7.3 — the public website is a separate surface from the
 * back-office. Visitors should not see branch switchers, academic year
 * pickers, the SideNav module tree, or the DevToolbar's role/network
 * simulation controls.
 *
 * Providers (ThemeProvider, I18nProvider, QueryProvider) are inherited
 * from the root `src/app/layout.tsx`.
 */

export const metadata: Metadata = {
  title: "Darul Irfan Madrasha — Public",
  description:
    "Public website of Darul Irfan Madrasha — programs, admissions, notices, events, and secure online donations.",
};

export default function PublicGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicLayout>{children}</PublicLayout>;
}
