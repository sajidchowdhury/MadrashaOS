"use client";

/**
 * MadrashaOS — Student Profile (Phase C3.2 — People)
 *
 * Route: /students/[id]
 *
 * 7-tab student profile covering all the People-module data points:
 *   1. Personal      — photo, name (bn/en/ar), code, DOB, gender, admission, status
 *   2. Academic      — class, section, roll, subjects (mock)
 *   3. Guardians     — linked guardian info (name, phone, email, occupation)
 *   4. Documents     — mock documents list; Upload gated by `documents.upload`
 *   5. Fees          — fee plan with 3 installments; Collect Payment gated by `fees.payment.create`
 *   6. Attendance    — recent attendance records (present/absent counts)
 *   7. History       — Risk R4 lock-in: previous class assignments as "past chips"
 *                      (NEVER deleted). "Promote Student" button gated by
 *                      `students.promote` opens a Promotion Wizard dialog
 *                      with the history panel beside it.
 *
 * Breadcrumb: Dashboard / Students / [Student Name]
 *
 * Data hooks: useStudent(id) + useFeePlans() + useAttendanceSessions() + useGuardians()
 */

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, CalendarDays, GraduationCap, FileText, Wallet, Users,
  ClipboardCheck, History as HistoryIcon, Upload, ArrowUpCircle,
  CheckCircle2, Clock, XCircle, FileArchive, Phone, Mail, Briefcase,
  AlertCircle, BookOpen, Hash, Download,
} from "lucide-react";
import { useStudent, useFeePlans, useAttendanceSessions, useGuardians, useClasses } from "@/lib/query/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatDate, formatCurrency } from "@/lib/i18n/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { LoadingState, ErrorState } from "@/components/states";
import { EmptyState } from "@/components/ui/empty-state";
import { IfPermission } from "@/components/auth/IfPermission";
import { useToast } from "@/hooks/use-toast";
import {
  StudentAvatar, StudentStatusBadge, InfoRow, PastClassChip, buildNameSubtitle,
} from "@/components/people";
import { PdfDownloadButton } from "@/components/pdf/PdfPreview";

/* ---------------------------------------------------------------
 * Inline mock data — Risk R4 history + Academic subjects + Documents
 * (Per task spec: define inline, do NOT create new fixture files)
 * --------------------------------------------------------------- */

type PastAssignment = { classId: string; className: string; period: string; promotedOn: string };

function buildHistory(studentCode: string): PastAssignment[] {
  // Stable, deterministic mock history keyed off the student's code
  const num = parseInt(studentCode.split("-").pop() ?? "0", 10) || 1;
  const base: PastAssignment[] = [
    { classId: "cls-1", className: "Class 1 · Section A", period: "2024 academic year", promotedOn: "2024-12-15" },
    { classId: "cls-3", className: "Class 3 · Section A", period: "2025 academic year", promotedOn: "2025-12-10" },
  ];
  // Hide the most-recent one if the student is currently in it (since "past" means earlier)
  return base.filter((_, i) => i !== num % 2 || base.length === 1);
}

const MOCK_SUBJECTS = [
  { id: "sub-quran", name: "Quran & Tajweed", code: "QUR-101", teacher: "Teacher Bilal" },
  { id: "sub-hadith", name: "Hadith Studies", code: "HAD-101", teacher: "Teacher Bilal" },
  { id: "sub-fiqh", name: "Fiqh", code: "FIQ-101", teacher: "Principal Ahmad" },
  { id: "sub-arabic", name: "Arabic Language", code: "ARA-101", teacher: "Teacher Bilal" },
  { id: "sub-bangla", name: "Bangla Language", code: "BEN-101", teacher: "Teacher Bilal" },
  { id: "sub-math", name: "Mathematics", code: "MAT-101", teacher: "Teacher Bilal" },
];

const MOCK_DOCUMENTS = [
  { id: "doc-1", name: "Birth Certificate", type: "PDF", uploadedAt: "2026-01-15", size: "248 KB" },
  { id: "doc-2", name: "Previous TC", type: "PDF", uploadedAt: "2026-01-15", size: "412 KB" },
  { id: "doc-3", name: "Photo", type: "JPG", uploadedAt: "2026-01-16", size: "1.1 MB" },
];

/* ---------------------------------------------------------------
 * Component
 * --------------------------------------------------------------- */

export default function StudentProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { locale } = useI18n();
  const { toast } = useToast();

  const studentId = params?.id ?? "";

  const {
    data: student,
    isLoading: studentLoading,
    isError: studentError,
    refetch: refetchStudent,
  } = useStudent(studentId);
  const {
    data: feePlans,
    isError: feesError,
    refetch: refetchFees,
  } = useFeePlans();
  const {
    data: attendance,
    isError: attendanceError,
    refetch: refetchAttendance,
  } = useAttendanceSessions();
  const {
    data: guardians,
    isError: guardiansError,
    refetch: refetchGuardians,
  } = useGuardians();
  const {
    data: classes,
  } = useClasses();

  const feePlan = feePlans?.find((p) => p.studentId === studentId);
  const guardian = guardians?.find((g) => g.id === student?.guardianId);
  const cls = classes?.find((c) => c.id === student?.classId);

  const studentAttendance = (attendance ?? [])
    .filter((s) => s.classId === student?.classId && s.section === student?.section)
    .flatMap((s) =>
      s.records
        .filter((r) => r.studentId === studentId)
        .map((r) => ({ date: s.date, status: r.status, sessionId: s.id })),
    )
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const presentCount = studentAttendance.filter((a) => a.status === "present").length;
  const absentCount = studentAttendance.filter((a) => a.status === "absent").length;
  const lateCount = studentAttendance.filter((a) => a.status === "late").length;
  const leaveCount = studentAttendance.filter((a) => a.status === "leave").length;

  // Promotion Wizard state
  const [promotionOpen, setPromotionOpen] = React.useState(false);
  const [targetClass, setTargetClass] = React.useState<string>("");
  const [targetSection, setTargetSection] = React.useState<string>("");

  const pastAssignments = student ? buildHistory(student.code) : [];

  // ----------------------------------------------------------------
  // States
  // ----------------------------------------------------------------

  if (studentLoading) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <LoadingState pattern="detail" />
        </div>
      </div>
    );
  }

  if (studentError) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <ErrorState
            title="Couldn't load this student"
            onRetry={() => refetchStudent()}
          />
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <EmptyState
            illustration="students"
            title="Student not found"
            description={`No student matches id "${studentId}".`}
            action={
              <Button variant="outline" onClick={() => router.push("/students")}>
                <ArrowLeft className="h-4 w-4" />
                Back to Students
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const subtitle = buildNameSubtitle(student);

  // Handlers
  const handleCollectPayment = (label: string, amount: number) => {
    toast({
      title: "Payment recorded",
      description: `${label} installment · ${formatCurrency(amount, locale)} collected.`,
    });
  };

  const handleUploadDoc = () => {
    toast({
      title: "Upload dialog",
      description: "Document upload flow would open here (mock).",
    });
  };

  const handleConfirmPromotion = () => {
    if (!targetClass || !targetSection) {
      toast({
        title: "Missing selection",
        description: "Please choose a target class and section.",
        variant: "destructive",
      });
      return;
    }
    const clsName = classes?.find((c) => c.id === targetClass)?.name ?? "Unknown";
    toast({
      title: "Student promoted",
      description: `${student.name} → ${clsName} · Section ${targetSection}. Previous assignment archived to history.`,
    });
    setPromotionOpen(false);
    setTargetClass("");
    setTargetSection("");
  };

  const availableSectionsForPromotion = classes?.find((c) => c.id === targetClass)?.sections ?? [];

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <a href="/dashboard">Dashboard</a>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <a href="/students">Students</a>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{student.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Profile header */}
        <Card className="shadow-elevation-1">
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <StudentAvatar name={student.name} size="lg" />
              <div>
                <h1 className="text-display font-bold text-text-primary">
                  {student.name}
                </h1>
                {subtitle && (
                  <p
                    className="text-body text-text-secondary"
                    lang={student.nameAr ? "ar" : "bn"}
                  >
                    {subtitle}
                  </p>
                )}
                <p className="mt-1 font-mono text-caption text-text-muted">
                  {student.code} · {cls?.name ?? "—"} · Section {student.section} · Roll {student.roll}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StudentStatusBadge status={student.status} />
              <Button variant="outline" size="sm" onClick={() => router.push("/students")}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 7-tab profile */}
        <Tabs defaultValue="personal" className="space-y-4">
          <TabsList className="flex h-auto flex-wrap gap-1 bg-surface-card p-1">
            <TabsTrigger value="personal"><Users className="h-4 w-4" />Personal</TabsTrigger>
            <TabsTrigger value="academic"><GraduationCap className="h-4 w-4" />Academic</TabsTrigger>
            <TabsTrigger value="guardians"><Users className="h-4 w-4" />Guardians</TabsTrigger>
            <TabsTrigger value="documents"><FileText className="h-4 w-4" />Documents</TabsTrigger>
            <TabsTrigger value="fees"><Wallet className="h-4 w-4" />Fees</TabsTrigger>
            <TabsTrigger value="attendance"><ClipboardCheck className="h-4 w-4" />Attendance</TabsTrigger>
            <TabsTrigger value="history"><HistoryIcon className="h-4 w-4" />History</TabsTrigger>
          </TabsList>

          {/* --- Personal --- */}
          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle className="text-subtitle">Personal Information</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="divide-y divide-border-default">
                  <InfoRow label="Student code" value={<span className="font-mono">{student.code}</span>} />
                  <InfoRow label="Date of birth" value={formatDate(new Date(student.dob), locale)} />
                  <InfoRow
                    label="Gender"
                    value={student.gender === "male" ? "Male" : "Female"}
                  />
                  <InfoRow label="Admission date" value={formatDate(new Date(student.admittedAt), locale)} />
                  <InfoRow
                    label="Status"
                    value={<StudentStatusBadge status={student.status} />}
                  />
                  <InfoRow
                    label="Bangla name"
                    value={student.nameBn}
                    hint={student.nameBn ? "" : "—"}
                  />
                  {student.nameAr && (
                    <InfoRow label="Arabic name" value={<span lang="ar">{student.nameAr}</span>} />
                  )}
                </dl>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- Academic --- */}
          <TabsContent value="academic">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-subtitle">Academic Details</CardTitle>
                  {/* C5.1 / Task 5-a — Download Mark Sheet (MarkSheet PDF template) */}
                  <PdfDownloadButton
                    templateId="mark-sheet"
                    studentId={studentId}
                    locale={locale}
                    rankingEnabled
                    position={1}
                    label="Download Mark Sheet"
                    variant="outline"
                    size="sm"
                    icon="download"
                    fileName={`marksheet-${student.code}.pdf`}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="divide-y divide-border-default">
                  <InfoRow label="Class" value={cls?.name ?? "—"} hint={cls?.nameBn ?? ""} />
                  <InfoRow label="Section" value={`Section ${student.section}`} />
                  <InfoRow label="Roll number" value={<span className="font-mono">#{student.roll}</span>} />
                  <InfoRow
                    label="Branch"
                    value="Dhaka Main Branch"
                  />
                </dl>

                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-body font-semibold text-text-primary">
                    <BookOpen className="h-4 w-4 text-primary-500" />
                    Subjects ({MOCK_SUBJECTS.length})
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {MOCK_SUBJECTS.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between rounded-lg border border-border-default bg-surface-card p-3"
                      >
                        <div>
                          <p className="text-body font-medium text-text-primary">
                            {sub.name}
                          </p>
                          <p className="text-caption text-text-muted">
                            <span className="font-mono">{sub.code}</span> · {sub.teacher}
                          </p>
                        </div>
                        <Hash className="h-4 w-4 text-text-muted" aria-hidden />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- Guardians --- */}
          <TabsContent value="guardians">
            <Card>
              <CardHeader>
                <CardTitle className="text-subtitle">Guardian</CardTitle>
              </CardHeader>
              <CardContent>
                {guardiansError ? (
                  <ErrorState
                    title="Couldn't load guardian"
                    onRetry={() => refetchGuardians()}
                  />
                ) : !guardian ? (
                  <EmptyState
                    title="No guardian linked"
                    description="Link a guardian to enable fee notifications and portal access."
                  />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-3 rounded-lg border border-border-default bg-surface-card p-4">
                      <div className="flex items-center gap-3">
                        <StudentAvatar name={guardian.name} size="md" />
                        <div>
                          <p className="text-body font-semibold text-text-primary">
                            {guardian.name}
                          </p>
                          <p className="text-caption text-text-muted" lang="bn">
                            {guardian.nameBn}
                          </p>
                        </div>
                      </div>
                      <dl className="divide-y divide-border-default">
                        <InfoRow
                          label="Phone"
                          value={
                            <a href={`tel:${guardian.phone}`} className="inline-flex items-center gap-1 text-primary-600 hover:underline">
                              <Phone className="h-3.5 w-3.5" />
                              {guardian.phone}
                            </a>
                          }
                        />
                        <InfoRow
                          label="Email"
                          value={
                            <a href={`mailto:${guardian.email}`} className="inline-flex items-center gap-1 text-primary-600 hover:underline">
                              <Mail className="h-3.5 w-3.5" />
                              {guardian.email}
                            </a>
                          }
                        />
                        <InfoRow
                          label="Occupation"
                          value={
                            <span className="inline-flex items-center gap-1">
                              <Briefcase className="h-3.5 w-3.5 text-text-muted" />
                              {guardian.occupation}
                            </span>
                          }
                        />
                      </dl>
                    </div>
                    <div className="rounded-lg border border-dashed border-border-default bg-surface-card p-4">
                      <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                        Guardian ID
                      </p>
                      <p className="mt-2 font-mono text-body text-text-primary">
                        {guardian.id}
                      </p>
                      <p className="mt-4 text-caption text-text-secondary">
                        This guardian is the billing contact for {student.name}. They will receive
                        fee reminders and attendance notifications.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- Documents --- */}
          <TabsContent value="documents">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-subtitle">Documents</CardTitle>
                <IfPermission code="documents.upload">
                  <Button size="sm" onClick={handleUploadDoc}>
                    <Upload className="h-4 w-4" />
                    Upload
                  </Button>
                </IfPermission>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {MOCK_DOCUMENTS.map((doc) => (
                    <li
                      key={doc.id}
                      className="flex items-center justify-between rounded-lg border border-border-default bg-surface-card p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-md bg-primary-50 text-primary-700">
                          <FileArchive className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-body font-medium text-text-primary">
                            {doc.name}
                          </p>
                          <p className="text-caption text-text-muted">
                            {doc.type} · {doc.size} · uploaded {formatDate(new Date(doc.uploadedAt), locale)}
                          </p>
                        </div>
                      </div>
                      <IfPermission code="documents.download" fallback={null}>
                        <Button variant="ghost" size="sm">Download</Button>
                      </IfPermission>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- Fees --- */}
          <TabsContent value="fees">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-subtitle">Fee Plan — Academic Year 2026</CardTitle>
                <IfPermission code="fees.payment.create">
                  <Button
                    size="sm"
                    onClick={() =>
                      feePlan && handleCollectPayment(feePlan.installments[0]!.label, feePlan.installments[0]!.amount)
                    }
                    disabled={!feePlan || feePlan.installments.every((i) => i.paid)}
                  >
                    <Wallet className="h-4 w-4" />
                    Collect Payment
                  </Button>
                </IfPermission>
              </CardHeader>
              <CardContent>
                {feesError ? (
                  <ErrorState
                    title="Couldn't load fee plan"
                    onRetry={() => refetchFees()}
                  />
                ) : !feePlan ? (
                  <EmptyState illustration="fees" title="No fee plan yet" description="Set up installments to begin collecting fees." />
                ) : (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <FeeStatCard
                        label="Total plan"
                        value={formatCurrency(feePlan.installments.reduce((s, i) => s + i.amount, 0), locale)}
                        tone="primary"
                      />
                      <FeeStatCard
                        label="Collected"
                        value={formatCurrency(feePlan.installments.filter((i) => i.paid).reduce((s, i) => s + i.amount, 0), locale)}
                        tone="success"
                      />
                      <FeeStatCard
                        label="Outstanding"
                        value={formatCurrency(feePlan.installments.filter((i) => !i.paid).reduce((s, i) => s + i.amount, 0), locale)}
                        tone="warning"
                      />
                    </div>

                    <div className="overflow-hidden rounded-lg border border-border-default">
                      <table className="w-full">
                        <thead className="bg-neutral-50">
                          <tr>
                            <th className="ps-3 pe-2 py-2 text-start text-caption font-semibold uppercase tracking-wide text-text-muted">Installment</th>
                            <th className="px-2 py-2 text-start text-caption font-semibold uppercase tracking-wide text-text-muted">Due date</th>
                            <th className="px-2 py-2 text-start text-caption font-semibold uppercase tracking-wide text-text-muted">Amount</th>
                            <th className="px-2 py-2 text-start text-caption font-semibold uppercase tracking-wide text-text-muted">Status</th>
                            <th className="px-2 pe-3 py-2 text-end text-caption font-semibold uppercase tracking-wide text-text-muted">Receipt</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-default">
                          {feePlan.installments.map((inst) => (
                            <tr key={inst.id} className="hover:bg-surface-hover">
                              <td className="ps-3 pe-2 py-3 text-body text-text-primary">{inst.label}</td>
                              <td className="px-2 py-3 text-body text-text-secondary">{formatDate(new Date(inst.dueDate), locale)}</td>
                              <td className="px-2 py-3 font-medium text-text-primary">{formatCurrency(inst.amount, locale)}</td>
                              <td className="px-2 py-3">
                                {inst.paid ? (
                                  <Badge className="bg-success-50 text-semantic-success">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Paid
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-warning-50 text-semantic-warning">
                                    <Clock className="h-3 w-3" />
                                    Pending
                                  </Badge>
                                )}
                              </td>
                              <td className="px-2 pe-3 py-3 text-end">
                                {inst.paid ? (
                                  <span className="font-mono text-caption text-text-secondary">{inst.receiptNo ?? "—"}</span>
                                ) : (
                                  <span className="text-caption text-text-muted">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- Attendance --- */}
          <TabsContent value="attendance">
            <Card>
              <CardHeader>
                <CardTitle className="text-subtitle">Recent Attendance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {attendanceError ? (
                  <ErrorState
                    title="Couldn't load attendance"
                    onRetry={() => refetchAttendance()}
                  />
                ) : studentAttendance.length === 0 ? (
                  <EmptyState
                    illustration="attendance"
                    title="No attendance records"
                    description="Records will appear here once teachers start taking attendance."
                  />
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-4">
                      <AttendanceStat label="Present" value={presentCount} tone="success" />
                      <AttendanceStat label="Absent" value={absentCount} tone="danger" />
                      <AttendanceStat label="Late" value={lateCount} tone="warning" />
                      <AttendanceStat label="On leave" value={leaveCount} tone="neutral" />
                    </div>

                    <div className="overflow-hidden rounded-lg border border-border-default">
                      <table className="w-full">
                        <thead className="bg-neutral-50">
                          <tr>
                            <th className="ps-3 pe-2 py-2 text-start text-caption font-semibold uppercase tracking-wide text-text-muted">Date</th>
                            <th className="px-2 pe-3 py-2 text-start text-caption font-semibold uppercase tracking-wide text-text-muted">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-default">
                          {studentAttendance.slice(0, 10).map((rec, i) => (
                            <tr key={`${rec.sessionId}-${i}`} className="hover:bg-surface-hover">
                              <td className="ps-3 pe-2 py-2 text-body text-text-primary">
                                <span className="inline-flex items-center gap-2">
                                  <CalendarDays className="h-3.5 w-3.5 text-text-muted" />
                                  {formatDate(new Date(rec.date), locale)}
                                </span>
                              </td>
                              <td className="px-2 pe-3 py-2">
                                <AttendanceStatusChip status={rec.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- History (Risk R4 lock-in) --- */}
          <TabsContent value="history">
            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-subtitle">Class Assignment History</CardTitle>
                  <IfPermission code="students.promote">
                    <Button size="sm" onClick={() => setPromotionOpen(true)}>
                      <ArrowUpCircle className="h-4 w-4" />
                      Promote Student
                    </Button>
                  </IfPermission>
                </CardHeader>
                <CardContent>
                  {/* Current assignment */}
                  <div className="rounded-lg border border-primary-200 bg-primary-50 p-4">
                    <p className="text-caption font-semibold uppercase tracking-wide text-primary-700">
                      Current assignment
                    </p>
                    <p className="mt-1 text-body font-medium text-text-primary">
                      {cls?.name ?? "—"} · Section {student.section} · Roll {student.roll}
                    </p>
                    <p className="mt-1 text-caption text-primary-700">
                      Since academic year 2026
                    </p>
                  </div>

                  {/* Past assignments — Risk R4: shown as past chips, never deleted */}
                  <div className="mt-4">
                    <p className="mb-3 flex items-center gap-2 text-caption font-semibold uppercase tracking-wide text-text-muted">
                      <HistoryIcon className="h-3.5 w-3.5" />
                      Previous assignments ({pastAssignments.length})
                    </p>
                    {pastAssignments.length === 0 ? (
                      <p className="text-body text-text-secondary">
                        No previous assignments recorded.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {pastAssignments.map((past, idx) => (
                          <li key={`${past.classId}-${idx}`}>
                            <PastClassChip label={past.className} period={past.period} />
                            <p className="ms-1 mt-1 text-caption text-text-muted">
                              Promoted on {formatDate(new Date(past.promotedOn), locale)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Side panel: history timeline */}
              <Card className="shadow-elevation-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-subtitle">
                    <HistoryIcon className="h-4 w-4 text-primary-500" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="relative space-y-4 ps-4">
                    <span
                      aria-hidden
                      className="absolute start-[5px] top-1 bottom-1 w-px bg-border-strong"
                    />
                    <TimelineItem
                      label="Current"
                      detail={`${cls?.name ?? "—"} · Section ${student.section}`}
                      date="2026 academic year"
                      tone="primary"
                    />
                    {pastAssignments.map((past, idx) => (
                      <TimelineItem
                        key={idx}
                        label={past.className}
                        detail={`Promoted ${formatDate(new Date(past.promotedOn), locale)}`}
                        date={past.period}
                        tone="past"
                      />
                    ))}
                    <TimelineItem
                      label="Admission"
                      detail={`Code ${student.code} issued`}
                      date={formatDate(new Date(student.admittedAt), locale)}
                      tone="accent"
                    />
                  </ol>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Promotion Wizard — Risk R4 lock-in: history panel beside the form */}
      <Dialog open={promotionOpen} onOpenChange={setPromotionOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-primary-500" />
              Promote Student
            </DialogTitle>
            <DialogDescription>
              Choose a new class and section. The current assignment will be archived to the
              student&apos;s history timeline (Risk R4 lock-in — never deleted).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-[1fr_280px]">
            {/* Form */}
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-caption font-medium text-text-secondary">
                  Current class
                </label>
                <div className="rounded-md border border-border-default bg-neutral-50 px-3 py-2 text-body text-text-primary">
                  {cls?.name ?? "—"} · Section {student.section}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-caption font-medium text-text-secondary" htmlFor="promote-class">
                  Promote to class
                </label>
                <Select value={targetClass} onValueChange={(v) => { setTargetClass(v); setTargetSection(""); }}>
                  <SelectTrigger id="promote-class" className="w-full">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-caption font-medium text-text-secondary" htmlFor="promote-section">
                  Section
                </label>
                <Select
                  value={targetSection}
                  onValueChange={setTargetSection}
                  disabled={!targetClass}
                >
                  <SelectTrigger id="promote-section" className="w-full">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSectionsForPromotion.map((sec) => (
                      <SelectItem key={sec} value={sec}>
                        Section {sec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border border-dashed border-border-default bg-neutral-50 p-3 text-caption text-text-secondary">
                <p className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-text-muted" aria-hidden />
                  <span>
                    Promotion will close the current class assignment and create a new one
                    effective today. Past assignment is preserved in the history timeline.
                  </span>
                </p>
              </div>
            </div>

            {/* History panel beside the form */}
            <div className="rounded-lg border border-border-default bg-surface-card p-3">
              <p className="mb-2 flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wide text-text-muted">
                <HistoryIcon className="h-3.5 w-3.5" />
                History preview
              </p>
              <ol className="relative space-y-3 ps-3">
                <span
                  aria-hidden
                  className="absolute start-[3px] top-1 bottom-1 w-px bg-border-strong"
                />
                <TimelineItem
                  label="New (after promote)"
                  detail={
                    classes?.find((c) => c.id === targetClass)?.name ?? "—"
                  }
                  date={`Section ${targetSection || "—"}`}
                  tone="primary"
                />
                <TimelineItem
                  label="Current"
                  detail={`${cls?.name ?? "—"} · Section ${student.section}`}
                  date="2026 academic year"
                  tone="past"
                />
                {pastAssignments.map((past, idx) => (
                  <TimelineItem
                    key={idx}
                    label={past.className}
                    detail={past.period}
                    date={formatDate(new Date(past.promotedOn), locale)}
                    tone="past"
                  />
                ))}
              </ol>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPromotionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPromotion}>
              <ArrowUpCircle className="h-4 w-4" />
              Confirm Promotion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------------------------------------------------------
 * Local helpers
 * --------------------------------------------------------------- */

function FeeStatCard({
  label, value, tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "success" | "warning";
}) {
  const cls = {
    primary: "border-primary-200 bg-primary-50 text-primary-700",
    success: "border-success/30 bg-success-50 text-semantic-success",
    warning: "border-warning/30 bg-warning-50 text-semantic-warning",
  }[tone];
  return (
    <div className={`rounded-lg border p-3 ${cls}`}>
      <p className="text-caption font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-subtitle font-bold">{value}</p>
    </div>
  );
}

function AttendanceStat({
  label, value, tone,
}: {
  label: string;
  value: number;
  tone: "success" | "danger" | "warning" | "neutral";
}) {
  const cls = {
    success: "bg-success-50 text-semantic-success",
    danger: "bg-danger-50 text-semantic-danger",
    warning: "bg-warning-50 text-semantic-warning",
    neutral: "bg-neutral-100 text-text-secondary",
  }[tone];
  return (
    <div className={`rounded-lg p-3 ${cls}`}>
      <p className="text-display font-bold">{value}</p>
      <p className="text-caption font-medium">{label}</p>
    </div>
  );
}

function AttendanceStatusChip({ status }: { status: "present" | "absent" | "late" | "leave" }) {
  const map = {
    present: { label: "Present", cls: "bg-success-50 text-semantic-success", Icon: CheckCircle2 },
    absent: { label: "Absent", cls: "bg-danger-50 text-semantic-danger", Icon: XCircle },
    late: { label: "Late", cls: "bg-warning-50 text-semantic-warning", Icon: Clock },
    leave: { label: "On leave", cls: "bg-neutral-100 text-text-secondary", Icon: Clock },
  } as const;
  const cfg = map[status];
  return (
    <Badge variant="outline" className={cfg.cls}>
      <cfg.Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}

function TimelineItem({
  label, detail, date, tone,
}: {
  label: string;
  detail: string;
  date: string;
  tone: "primary" | "past" | "accent";
}) {
  const dotCls = {
    primary: "bg-primary-500",
    past: "bg-text-muted",
    accent: "bg-accent-500",
  }[tone];
  return (
    <li className="relative">
      <span
        aria-hidden
        className={`absolute -start-[11px] top-1 size-2.5 rounded-full ring-2 ring-surface-card ${dotCls}`}
      />
      <p className="text-body font-medium text-text-primary">{label}</p>
      <p className="text-caption text-text-secondary">{detail}</p>
      <p className="text-caption text-text-muted">{date}</p>
    </li>
  );
}
