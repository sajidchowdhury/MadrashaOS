"use client";

/**
 * MadrashaOS — Employees List (Phase P3 — People)
 *
 * Route: /employees
 *
 * Full-width data table of all non-teaching staff in the current tenant
 * (or current branch for branch-scoped roles), with:
 *   - Search bar (filters by name, code, email, designation — client-side)
 *   - FilterBar: status filter (active / on-leave / resigned)
 *   - Columns: Code | Name (+bn subtitle) | Designation | Phone |
 *              Branch | Joined | Status badge
 *   - LoadingState pattern="table" while loading
 *   - EmptyState when search/filter produces no results
 *
 * Per SRS §5.1: page visible only to roles with `employees.view`. The
 * "Add Employee" header CTA is gated by `employees.create`.
 *
 * Data hook: useEmployees() from src/lib/query/client.ts — TanStack Query
 * against GET /api/v1/employees (camelCase response via toCamel()).
 */

import * as React from "react";
import { Briefcase, Search, Phone, UserPlus, Wallet, CheckCircle2, KeyRound } from "lucide-react";
import { useEmployees } from "@/lib/query/client";
import { Button } from "@/components/ui/button";
import { PaySalaryDialog } from "@/components/finance/PaySalaryDialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { FilterBar } from "@/components/ui/filter-bar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState, ErrorState, PermissionDenied } from "@/components/states";
import { IfPermission } from "@/components/auth/IfPermission";
import {
  SectionCard, SectionCardHeader,
} from "@/components/foundation/SectionCard";
import { useSessionStore } from "@/stores/sessionStore";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { queryClient } from "@/lib/query/client";
import { formatDate, formatNumber } from "@/lib/i18n/format";

/** Row shape produced by api.getEmployees() (camelCase via toCamel()). */
type EmployeeRow = {
  id: string;
  employeeCode: string;
  name: string;
  nameBn: string | null;
  email: string | null;
  designation: string | null;
  department: string | null;
  phone: string | null;
  salary: number | null;
  joinedAt: string | null;
  status: string | null;
  photoUrl: string | null;
  branch: { id?: string; name?: string; code?: string } | null;
  user: { id?: string; status?: string; lastLoginAt?: string } | null;
  createdAt: string | null;
};

/**
 * Predefined designations — the job title of the employee.
 * NOTE: This is DIFFERENT from the Role (permission role). The Role
 * controls what menus/features the user can access; the designation
 * describes the job position. They are intentionally separate:
 *   - Role (system, reserved) → e.g. "administrator", "accountant"
 *     → controls permissions via RolePermission → Permission codes
 *   - Designation (job title) → e.g. "Senior Accountant", "Office Assistant"
 *     → describes the position; no permission implications
 *
 * Keeping designation as a dropdown prevents free-text inconsistency.
 */
const DESIGNATIONS = [
  { value: "Principal", label: "Principal" },
  { value: "Vice Principal", label: "Vice Principal" },
  { value: "Office Assistant", label: "Office Assistant" },
  { value: "Accountant", label: "Accountant" },
  { value: "Senior Accountant", label: "Senior Accountant" },
  { value: "Librarian", label: "Librarian" },
  { value: "Storekeeper", label: "Storekeeper" },
  { value: "Clerk", label: "Clerk" },
  { value: "Driver", label: "Driver" },
  { value: "Cook", label: "Cook" },
  { value: "Guard", label: "Guard" },
  { value: "Cleaner", label: "Cleaner" },
  { value: "IT Support", label: "IT Support" },
  { value: "Receptionist", label: "Receptionist" },
] as const;

/**
 * Role options (the 8 system roles that control permissions).
 * When creating an employee, the admin picks a role — this determines
 * what menus/features the user can access. The role_code is sent to
 * POST /api/v1/employees which links the User to the Role.
 */
const ROLE_OPTIONS = [
  { value: "administrator", label: "Administrator — full office access" },
  { value: "authority", label: "Authority (Principal) — all-branch read + approve" },
  { value: "accountant", label: "Accountant — finance CRUD" },
  { value: "storekeeper", label: "Storekeeper — inventory + purchases" },
  { value: "teacher", label: "Teacher — own classes + sections" },
] as const;

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "on-leave", label: "On leave" },
  { value: "resigned", label: "Resigned" },
] as const;

/** Status badge with the design-system's semantic colors. */
function StatusBadge({ status }: { status: string | null }) {
  const value = (status ?? "active").toLowerCase();
  const cls =
    value === "active"
      ? "border-semantic-success/40 bg-success-50 text-semantic-success"
      : value === "on-leave"
        ? "border-semantic-warning/40 bg-warning-50 text-semantic-warning"
        : value === "resigned"
          ? "border-border-default bg-neutral-50 text-text-muted"
          : "text-text-muted";
  return <Badge variant="outline" className={cls}>{value}</Badge>;
}

export default function EmployeesListPage() {
  const { locale } = useI18n();
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const canView = hasPermission("employees.view");

  const {
    data: employees,
    isLoading,
    isError,
    refetch,
  } = useEmployees();

  const [search, setSearch] = React.useState("");
  const { toast } = useToast();
  const [addOpen, setAddOpen] = React.useState(false);
  const [payOpen, setPayOpen] = React.useState(false);
  const [payStaff, setPayStaff] = React.useState<{
    id: string; name: string; code?: string; salary?: number | null;
  } | null>(null);
  const [credentialsOpen, setCredentialsOpen] = React.useState(false);
  const [createdCredentials, setCreatedCredentials] = React.useState<{
    name: string; email: string; password: string; code: string;
  } | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [empName, setEmpName] = React.useState("");
  const [empNameBn, setEmpNameBn] = React.useState("");
  const [empDesignation, setEmpDesignation] = React.useState("");
  const [empRole, setEmpRole] = React.useState<string>("");
  const [empPhone, setEmpPhone] = React.useState("");
  const [empEmail, setEmpEmail] = React.useState("");
  const [empSalary, setEmpSalary] = React.useState("");

  const handleAddEmployee = async () => {
    if (!empName.trim() || !empDesignation.trim() || !empPhone.trim() || !empEmail.trim()) {
      toast({ title: "Missing fields", description: "Name, designation, phone, and email are required.", variant: "destructive" });
      return;
    }
    if (!empRole) {
      toast({ title: "Role required", description: "Please select a permission role for this employee.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: empName.trim(),
          name_bn: empNameBn.trim() || undefined,
          designation: empDesignation.trim(),
          role_code: empRole,
          phone: empPhone.trim(),
          email: empEmail.trim(),
          salary: empSalary ? Number(empSalary) : undefined,
          joining_date: new Date().toISOString(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: "Failed", description: data?.error || `HTTP ${res.status}`, variant: "destructive" });
        setSubmitting(false);
        return;
      }
      // The API returns a one-time temp password + the login email.
      // Display it so the admin can hand it to the employee.
      const tempPassword = data?.data?.temp_password;
      const loginEmail = data?.data?.email ?? empEmail.trim();
      const employeeCode = data?.data?.employee_code ?? "";
      if (tempPassword) {
        toast({
          title: "Employee added — credentials below",
          description: `${empName} (role: ${empRole}) — Login email: ${loginEmail} · Temp password: ${tempPassword}`,
          duration: 15000,
        });
        // Store credentials so the dialog can display them for copying
        setCreatedCredentials({
          name: empName,
          email: loginEmail,
          password: tempPassword,
          code: employeeCode,
        });
        setCredentialsOpen(true);
      } else {
        toast({ title: "Employee added", description: `${empName} — ${empDesignation} (role: ${empRole})` });
      }
      setEmpName(""); setEmpNameBn(""); setEmpDesignation(""); setEmpRole(""); setEmpPhone(""); setEmpEmail(""); setEmpSalary("");
      setAddOpen(false);
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    } catch {
      toast({ title: "Network error", description: "Please try again.", variant: "destructive" });
    }
    setSubmitting(false);
  };
  const [status, setStatus] = React.useState<string>("all");

  // Client-side filter pipeline.
  const filtered = React.useMemo(() => {
    if (!employees) return [];
    const q = search.trim().toLowerCase();
    return (employees as EmployeeRow[]).filter((e) => {
      if (status !== "all" && (e.status ?? "active").toLowerCase() !== status) return false;
      if (q) {
        const haystack =
          `${e.name} ${e.nameBn ?? ""} ${e.employeeCode} ${e.email ?? ""} ${e.designation ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [employees, search, status]);

  const activeFilterCount = (status !== "all" ? 1 : 0) + (search ? 1 : 0);

  const clearFilters = React.useCallback(() => {
    setSearch("");
    setStatus("all");
  }, []);

  if (!canView) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <PermissionDenied resource="Employees" />
        </div>
      </div>
    );
  }

  const totalEmployees = (employees as EmployeeRow[] | undefined)?.length ?? 0;

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-display font-bold text-text-primary">
              <Briefcase className="h-7 w-7 text-primary-500" aria-hidden />
              Employees
            </h1>
            <p className="mt-1 text-body text-text-secondary">
              Manage non-teaching staff records, designations and joining
              status across branches.
            </p>
          </div>
          <IfPermission code="employees.create">
            <Button onClick={() => setAddOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Add Employee
            </Button>
          </IfPermission>
        </header>

        {/* Search + Filters */}
        <FilterBar activeCount={activeFilterCount} onClear={clearFilters}>
          <div className="relative min-w-56 flex-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            />
            <Input
              type="search"
              role="searchbox"
              aria-label="Search employees by name, code or designation"
              placeholder="Search by name, code or designation…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 ps-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger
              size="sm"
              className="w-44"
              aria-label="Filter by status"
            >
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterBar>

        {/* Count summary */}
        <div className="flex items-center justify-between text-caption text-text-secondary">
          <span>
            Showing{" "}
            <span className="font-semibold text-text-primary">
              {formatNumber(filtered.length, locale)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-text-primary">
              {formatNumber(totalEmployees, locale)}
            </span>{" "}
            employees
          </span>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-primary-50 px-2 py-0.5 font-medium text-primary-700">
              {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"} applied
            </span>
          )}
        </div>

        {/* Table — error / loading / empty / data states */}
        {isError && (
          <ErrorState
            title="Couldn't load employees"
            description="Please retry. If the problem persists, contact your administrator."
            onRetry={() => refetch()}
          />
        )}

        {!isError && isLoading && <LoadingState pattern="table" rows={6} />}

        {!isError && !isLoading && filtered.length === 0 && (
          <EmptyState
            illustration="generic"
            title={
              search || activeFilterCount > 0
                ? "No employees match your search"
                : "No employees yet"
            }
            description={
              search || activeFilterCount > 0
                ? "Try adjusting your search or clearing filters."
                : "Add your first employee to begin."
            }
            action={
              search || activeFilterCount > 0 ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        )}

        {!isError && !isLoading && filtered.length > 0 && (
          <SectionCard className="overflow-hidden p-0">
            <SectionCardHeader
              title="All staff"
              description="Employee code, designation and branch assignment for each staff member."
              className="px-4 pt-4"
            />
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                    <TableHead className="ps-4 text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Code
                    </TableHead>
                    <TableHead className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Name
                    </TableHead>
                    <TableHead className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Designation
                    </TableHead>
                    <TableHead className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Phone
                    </TableHead>
                    <TableHead className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Branch
                    </TableHead>
                    <TableHead className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Joined
                    </TableHead>
                    <TableHead className="text-end text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Status
                    </TableHead>
                    <TableHead className="pe-4 text-end text-caption font-semibold uppercase tracking-wide text-text-muted">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((e) => {
                    const joinedDate = e.joinedAt ? new Date(e.joinedAt) : null;
                    return (
                      <TableRow key={e.id} className="hover:bg-surface-hover">
                        <TableCell className="ps-4 py-3">
                          <span className="font-mono text-caption font-medium text-text-secondary">
                            {e.employeeCode}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="min-w-0">
                            <div className="truncate text-body font-medium text-text-primary">
                              {e.name}
                            </div>
                            {e.nameBn ? (
                              <div
                                className="truncate text-caption text-text-muted"
                                lang="bn"
                              >
                                {e.nameBn}
                              </div>
                            ) : null}
                            {e.email && (
                              <div className="truncate text-caption text-text-muted">
                                {e.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="text-body text-text-primary">
                            {e.designation || "—"}
                          </div>
                          {e.department && (
                            <div className="text-caption text-text-muted">
                              {e.department}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-3">
                          {e.phone ? (
                            <span className="flex items-center gap-2 font-mono text-body text-text-secondary">
                              <Phone
                                className="h-3.5 w-3.5 text-text-muted"
                                aria-hidden
                              />
                              {e.phone}
                            </span>
                          ) : (
                            <span className="text-caption text-text-muted">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-body text-text-secondary">
                          {e.branch?.name ?? "—"}
                        </TableCell>
                        <TableCell className="py-3 text-body text-text-secondary">
                          {joinedDate && !Number.isNaN(joinedDate.getTime())
                            ? formatDate(joinedDate, locale)
                            : "—"}
                        </TableCell>
                        <TableCell className="py-3 text-end">
                          <StatusBadge status={e.status} />
                        </TableCell>
                        <TableCell className="pe-4 py-3 text-end">
                          <div className="flex justify-end gap-1">
                            <IfPermission code="accounting.ledger.post">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={e.status !== "active"}
                                onClick={() => {
                                  setPayStaff({ id: e.id, name: e.name, code: e.employeeCode, salary: e.salary });
                                  setPayOpen(true);
                                }}
                              >
                                <Wallet className="h-4 w-4" />
                                Pay Salary
                              </Button>
                            </IfPermission>
                            <IfPermission code="employees.create">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`/api/v1/employees/${e.id}/reset-password`, {
                                      method: "POST",
                                    });
                                    const data = await res.json().catch(() => ({}));
                                    if (!res.ok) {
                                      toast({ title: "Failed", description: data?.error || `HTTP ${res.status}`, variant: "destructive" });
                                      return;
                                    }
                                    const creds = data?.data ?? {};
                                    setCreatedCredentials({
                                      name: creds.employee_name ?? e.name,
                                      email: creds.email ?? e.email ?? "",
                                      password: creds.temp_password ?? "",
                                      code: creds.employee_code ?? e.employeeCode ?? "",
                                    });
                                    setCredentialsOpen(true);
                                  } catch {
                                    toast({ title: "Network error", variant: "destructive" });
                                  }
                                }}
                                aria-label={`Reset password for ${e.name}`}
                              >
                                <KeyRound className="h-4 w-4" />
                                Reset Password
                              </Button>
                            </IfPermission>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        )}
      </div>

      <PaySalaryDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        staffType="employee"
        staffId={payStaff?.id ?? ""}
        staffName={payStaff?.name ?? ""}
        staffCode={payStaff?.code}
        defaultSalary={payStaff?.salary}
      />

      {/* ---------- Credentials Dialog (shown after employee creation) ---------- */}
      <Dialog open={credentialsOpen} onOpenChange={setCredentialsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-semantic-success" />
              Employee Created — Save These Credentials
            </DialogTitle>
            <DialogDescription>
              Write these down — the temp password is shown only once and
              cannot be retrieved later. Hand it to the employee
              out-of-band (e.g. in person or via a secure channel).
            </DialogDescription>
          </DialogHeader>
          {createdCredentials && (
            <div className="space-y-3">
              <div className="rounded-md border border-border-default bg-surface-hover p-4 space-y-2">
                <div>
                  <Label className="text-caption uppercase tracking-wide text-text-muted">Employee Name</Label>
                  <p className="text-body font-medium text-text-primary">{createdCredentials.name}</p>
                </div>
                <div>
                  <Label className="text-caption uppercase tracking-wide text-text-muted">Employee Code</Label>
                  <p className="font-mono text-body text-text-primary">{createdCredentials.code}</p>
                </div>
                <div>
                  <Label className="text-caption uppercase tracking-wide text-text-muted">Login Email (username)</Label>
                  <p className="font-mono text-body text-text-primary">{createdCredentials.email}</p>
                </div>
                <div>
                  <Label className="text-caption uppercase tracking-wide text-text-muted">Temp Password</Label>
                  <p className="font-mono text-body font-bold text-semantic-warning">{createdCredentials.password}</p>
                </div>
              </div>
              <p className="text-caption text-text-secondary">
                The employee should log in at <span className="font-mono">/login</span> using
                the email + temp password above, then change the password from their profile settings.
                Multiple employees can share the same role (e.g. you can have 3 accountants) — each
                gets their own email + password.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCredentialsOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Employee Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary-500" />
              Add New Employee
            </DialogTitle>
            <DialogDescription>Create a new non-teaching staff member.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="emp-name">Name (English) *</Label>
                <Input id="emp-name" value={empName} onChange={(e) => setEmpName(e.target.value)} placeholder="Abdul Karim" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-name-bn">নাম (বাংলা)</Label>
                <Input id="emp-name-bn" value={empNameBn} onChange={(e) => setEmpNameBn(e.target.value)} placeholder="আব্দুল করিম" lang="bn" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-designation">Designation *</Label>
              <Select value={empDesignation} onValueChange={setEmpDesignation}>
                <SelectTrigger id="emp-designation" className="w-full">
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>
                <SelectContent>
                  {DESIGNATIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-caption text-text-muted">
                Job title (e.g. Accountant, Librarian). This is separate from
                the permission role below.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-role">Permission Role *</Label>
              <Select value={empRole} onValueChange={setEmpRole}>
                <SelectTrigger id="emp-role" className="w-full">
                  <SelectValue placeholder="Select role (controls menu access)" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-caption text-text-muted">
                Determines what menus and features this employee can access.
                Configurable later via Roles &amp; Permissions.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="emp-phone">Phone *</Label>
                <Input id="emp-phone" value={empPhone} onChange={(e) => setEmpPhone(e.target.value)} placeholder="+880 1XXX-XXXXXX" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-email">Email *</Label>
                <Input id="emp-email" type="email" value={empEmail} onChange={(e) => setEmpEmail(e.target.value)} placeholder="name@madrashaos.org" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-salary">Salary (monthly, BDT)</Label>
              <Input id="emp-salary" type="number" value={empSalary} onChange={(e) => setEmpSalary(e.target.value)} placeholder="15000" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddEmployee} disabled={submitting}>
              {submitting ? "Adding…" : "Add Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
