"use client";

/**
 * MadrashaOS — Teacher Dashboard (Session 2.2)
 *
 * For: Subject Teacher (SRS §8.1)
 * Mobile-first (SRS §5.4). Top-3 daily tasks reachable in ≤3 clicks (C1).
 * NO financial data per Do-Not-Do D3.
 */

import { ClipboardCheck, FileText, Users, Bell } from "lucide-react";
import { useStudents, useAttendanceSessions, useNotices } from "@/lib/query/client";
import {
  KpiCard, AttendanceTodayWidget, TeacherClassesWidget, RecentReceiptsWidget,
} from "@/components/widgets";
import { QuickActionsWidget } from "@/components/widgets";
import { ClipboardCheck as TakeIcon, FileText as MarksIcon } from "lucide-react";

export default function TeacherDashboard() {
  const { data: students } = useStudents();
  const { data: sessions } = useAttendanceSessions();
  const { data: notices } = useNotices();

  const myStudents = students?.length ?? 0;
  const todayCount = sessions?.filter((s) => s.date === "2026-09-16").length ?? 0;
  const noticeCount = notices?.length ?? 0;

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header>
          <h1 className="text-display font-bold text-text-primary">Teacher Dashboard</h1>
          <p className="mt-1 text-body text-text-secondary">Your classes · attendance · marks entry.</p>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard label="My Students" value={String(myStudents)} icon={Users} tone="primary" />
          <KpiCard label="Sessions Today" value={String(todayCount)} icon={ClipboardCheck} tone="success" />
          <KpiCard label="Notices" value={String(noticeCount)} icon={Bell} tone="primary" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <QuickActionsWidget
            actions={[
              { label: "Take Attendance", icon: TakeIcon, permission: "attendance.take" },
              { label: "Enter Marks", icon: MarksIcon, permission: "exams.enter-marks" },
            ]}
          />
          <AttendanceTodayWidget />
          <TeacherClassesWidget />
          <RecentReceiptsWidget />
        </div>
      </div>
    </div>
  );
}
