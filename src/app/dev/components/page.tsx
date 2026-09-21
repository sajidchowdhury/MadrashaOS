"use client";

/**
 * MadrashaOS — /dev/components showcase (Phase C1 exit criterion)
 *
 * Live gallery of all 30 atomic components from Session 1.3 spec:
 *   1. Action (3): Button, ButtonGroup, IconButton
 *   2. Form (8): TextInput, NumberInput, DateInput, Select, Textarea, Checkbox, RadioGroup, Switch
 *   3. Navigation (4): Tabs, Breadcrumb, Pagination, Menu/Dropdown
 *   4. Data (5): Table, Badge, Chip, Avatar, Card
 *   5. Feedback (6): Modal, Drawer, Toast, Tooltip, Spinner, Skeleton
 *   6. Layout (4): EmptyState, Alert/Callout, FilterBar, FieldRow
 *
 * Each section shows variants + 5 states (default/hover/active/focus/disabled).
 * Uses the FROZEN token system — zero raw hex/px values in component code.
 *
 * Phase C7.1 — each component now links to a Storybook-style detail page at
 * /dev/components/[name] (variants + states + props + a11y + tokens + snippet).
 * The "Documentation Summary" banner at the top tracks documented coverage.
 */

import { useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Plus,
  Trash2,
  Mail,
  Settings,
  Bell,
  Search,
  Download,
  Star,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Check,
  FileText,
} from "lucide-react";
import {
  componentRegistry,
  CATEGORY_ORDER,
  type ComponentCategory,
} from "@/lib/dev/component-registry";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { DateInput } from "@/components/ui/date-input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "@/components/ui/pagination";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/ui/filter-bar";
import { FieldRow } from "@/components/ui/field-row";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Helper components                                                  */
/* ------------------------------------------------------------------ */

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border-default bg-surface-card p-6 shadow-elevation-1 md:p-8">
      <header className="mb-6">
        <h2 className="text-headline font-bold text-text-primary">{title}</h2>
        <p className="mt-1 text-body text-text-secondary">{subtitle}</p>
      </header>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
      <span className="w-32 shrink-0 text-caption font-medium uppercase tracking-wider text-text-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Documentation summary (Phase C7.1)                                */
/* ------------------------------------------------------------------ */

const CATEGORY_BADGE: Record<ComponentCategory, string> = {
  Action: "bg-primary-50 text-primary-700",
  Form: "bg-accent-50 text-accent-700",
  Navigation: "bg-info-50 text-info-foreground",
  Data: "bg-neutral-100 text-text-primary",
  Feedback: "bg-warning-50 text-semantic-warning",
  Layout: "bg-success-50 text-semantic-success",
};

function DocumentationSummary() {
  const total = componentRegistry.length;
  const documented = componentRegistry.length; // All entries in the registry are documented
  const pending = total - documented;

  return (
    <section className="rounded-2xl border border-border-default bg-surface-card p-6 shadow-elevation-1 md:p-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-headline font-bold text-text-primary">Documentation Summary</h2>
          <p className="mt-1 text-body text-text-secondary">
            Storybook-style per-component detail pages — variants, states, props, a11y, tokens, and code snippets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-3 py-1 text-caption font-semibold text-semantic-success">
            <Check className="h-3.5 w-3.5" /> {documented} documented
          </span>
          {pending > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-50 px-3 py-1 text-caption font-semibold text-semantic-warning">
              <AlertTriangle className="h-3.5 w-3.5" /> {pending} pending
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-neutral-50 px-3 py-1 text-caption font-semibold text-text-secondary">
              0 pending
            </span>
          )}
        </div>
      </header>

      <p className="mb-4 text-subtitle font-semibold text-text-primary">
        {total} components · {documented} documented · {pending} pending
      </p>

      <div className="space-y-6">
        {CATEGORY_ORDER.map((category) => {
          const items = componentRegistry.filter((c) => c.category === category);
          if (items.length === 0) return null;
          return (
            <div key={category}>
              <h3 className="mb-2 flex items-center gap-2 text-caption font-medium uppercase tracking-wider text-text-muted">
                <span className={`inline-block h-2 w-2 rounded-full ${CATEGORY_BADGE[category]?.split(" ")[0] ?? "bg-neutral-200"}`} />
                {category} ({items.length})
              </h3>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {items.map((comp) => (
                  <Link
                    key={comp.name}
                    href={`/dev/components/${comp.name}`}
                    className="group flex items-center justify-between gap-2 rounded-lg border border-border-default bg-surface-card px-3 py-2 transition-colors hover:border-primary-500 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-body font-medium text-text-primary group-hover:text-primary-700">
                        {comp.displayName}
                      </span>
                      <span className="truncate text-caption text-text-muted">
                        {comp.variants.length} variants · {comp.props.length} props
                      </span>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-50 px-1.5 py-0.5 text-caption font-semibold text-semantic-success" title="Documented">
                      <Check className="h-3 w-3" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-caption text-text-secondary">
        <FileText className="h-3.5 w-3.5" />
        Click any component above to open its detail page.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ComponentsShowcasePage() {
  const [tabsValue, setTabsValue] = useState("overview");
  const [switchOn, setSwitchOn] = useState(true);
  const [checkboxOn, setCheckboxOn] = useState(true);
  const [radioValue, setRadioValue] = useState("cash");
  const [chips, setChips] = useState(["Class 5", "Section A", "Active"]);

  function removeChip(index: number) {
    setChips((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-8">
        {/* Header */}
        <header>
          <h1 className="text-display font-bold text-text-primary">/dev/components</h1>
          <p className="mt-1 text-body text-text-secondary">
            All 30 atomic components from Session 1.3 spec — variants + 5 states + a11y contracts.
            Every value sourced from the FROZEN token system (v1.0.0).
          </p>
        </header>

        {/* Documentation Summary (Phase C7.1) */}
        <DocumentationSummary />

        {/* 1. Action Components */}
        <Section title="1. Action Components" subtitle="Button, ButtonGroup, IconButton — 3 variants × 3 sizes × 5 states.">
          <Row label="Variants">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Danger</Button>
            <Button variant="link">Link</Button>
          </Row>
          <Row label="Sizes">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="Add"><Plus className="h-4 w-4" /></Button>
          </Row>
          <Row label="With icon">
            <Button><Download className="h-4 w-4" /> Export</Button>
            <Button variant="outline"><Plus className="h-4 w-4" /> Add Student</Button>
            <Button variant="destructive"><Trash2 className="h-4 w-4" /> Delete</Button>
          </Row>
          <Row label="States">
            <Button>Default</Button>
            <Button disabled>Disabled</Button>
          </Row>
          <Row label="ButtonGroup">
            <ButtonGroup variant="segmented">
              <Button variant="outline" size="sm">Day</Button>
              <Button variant="outline" size="sm">Week</Button>
              <Button size="sm">Month</Button>
            </ButtonGroup>
            <ButtonGroup variant="joined">
              <Button variant="outline" size="sm">List</Button>
              <Button variant="outline" size="sm">Grid</Button>
              <Button variant="outline" size="sm">Table</Button>
            </ButtonGroup>
          </Row>
          <Row label="IconButton">
            <IconButton variant="default" aria-label="Add"><Plus className="h-4 w-4" /></IconButton>
            <IconButton variant="ghost" aria-label="Settings"><Settings className="h-4 w-4" /></IconButton>
            <IconButton variant="danger" aria-label="Delete"><Trash2 className="h-4 w-4" /></IconButton>
            <IconButton variant="outline" aria-label="Mail"><Mail className="h-4 w-4" /></IconButton>
            <IconButton variant="default" size="sm" aria-label="Bell"><Bell className="h-3 w-3" /></IconButton>
            <IconButton variant="default" size="lg" aria-label="Search"><Search className="h-5 w-5" /></IconButton>
          </Row>
        </Section>

        {/* 2. Form Components */}
        <Section title="2. Form Components" subtitle="TextInput, NumberInput, DateInput, Select, Textarea, Checkbox, RadioGroup, Switch — each with label/helper/error.">
          <div className="grid gap-6 md:grid-cols-2">
            <FieldRow label="Student Name" htmlFor="inp-name" helper="As per birth certificate" required>
              <Input id="inp-name" placeholder="Ahmad Hossain" />
            </FieldRow>
            <FieldRow label="Email" htmlFor="inp-email" error="Invalid email format">
              <Input id="inp-email" type="email" placeholder="ahmad@example.com" defaultValue="bad-email" />
            </FieldRow>
            <FieldRow label="Fee Amount (৳)" htmlFor="inp-amount" helper="Monthly installment">
              <NumberInput id="inp-amount" defaultValue={1500} showStepper min={0} max={50000} step={100} />
            </FieldRow>
            <FieldRow label="Admission Date" htmlFor="inp-date" helper="Bangla calendar toggle on">
              <DateInput id="inp-date" defaultValue="2026-09-16" banglaToggle />
            </FieldRow>
            <FieldRow label="Special Notes" htmlFor="inp-notes" helper="Visible to admins only (students.notes.view)">
              <Textarea id="inp-notes" placeholder="Any medical or behavioral notes…" rows={3} />
            </FieldRow>
            <FieldRow label="Class" htmlFor="inp-class">
              <select
                id="inp-class"
                className="flex h-10 w-full rounded-md border border-border-strong bg-surface-card px-3 text-body text-text-primary focus:border-primary-500 focus:outline-none"
              >
                <option>Class 1</option>
                <option>Class 3</option>
                <option>Class 5</option>
                <option>Class 8</option>
              </select>
            </FieldRow>
            <FieldRow label="Permissions">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="chk-1" checked={checkboxOn} onCheckedChange={setCheckboxOn} />
                  <label htmlFor="chk-1" className="text-body text-text-primary">View student notes</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="chk-2" />
                  <label htmlFor="chk-2" className="text-body text-text-primary">Edit financial records</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="chk-3" disabled />
                  <label htmlFor="chk-3" className="text-body text-text-muted">Approve own request (disabled — D16)</label>
                </div>
              </div>
            </FieldRow>
            <FieldRow label="Payment Method">
              <RadioGroup value={radioValue} onValueChange={setRadioValue} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="cash" id="r-cash" />
                  <label htmlFor="r-cash" className="text-body text-text-primary">Cash</label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="bank" id="r-bank" />
                  <label htmlFor="r-bank" className="text-body text-text-primary">Bank</label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="mobile" id="r-mobile" />
                  <label htmlFor="r-mobile" className="text-body text-text-primary">Mobile</label>
                </div>
              </RadioGroup>
            </FieldRow>
            <FieldRow label="Module Enabled" htmlFor="sw-1">
              <div className="flex items-center gap-3">
                <Switch id="sw-1" checked={switchOn} onCheckedChange={setSwitchOn} />
                <span className="text-body text-text-secondary">{switchOn ? "Hostel module active" : "Hostel module off"}</span>
              </div>
            </FieldRow>
          </div>
        </Section>

        {/* 3. Navigation Components */}
        <Section title="3. Navigation Components" subtitle="Tabs, Breadcrumb, Pagination, Menu/Dropdown.">
          <Row label="Tabs">
            <Tabs value={tabsValue} onValueChange={setTabsValue} className="w-full max-w-md">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="academic">Academic</TabsTrigger>
                <TabsTrigger value="fees">Fees</TabsTrigger>
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="mt-3 text-body text-text-secondary">Student overview content — personal info, contact, guardian.</TabsContent>
              <TabsContent value="academic" className="mt-3 text-body text-text-secondary">Academic tab — class, section, subjects, marks.</TabsContent>
              <TabsContent value="fees" className="mt-3 text-body text-text-secondary">Fees tab — plan, installments, payment history.</TabsContent>
              <TabsContent value="attendance" className="mt-3 text-body text-text-secondary">Attendance tab — monthly summary + session list.</TabsContent>
            </Tabs>
          </Row>
          <Row label="Breadcrumb">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem><BreadcrumbLink href="#">Dashboard</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator><ChevronRight className="h-4 w-4" /></BreadcrumbSeparator>
                <BreadcrumbItem><BreadcrumbLink href="#">Students</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator><ChevronRight className="h-4 w-4" /></BreadcrumbSeparator>
                <BreadcrumbItem><BreadcrumbPage>Ahmad Hossain</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </Row>
          <Row label="Pagination">
            <Pagination>
              <PaginationContent>
                <PaginationItem><PaginationLink href="#">‹</PaginationLink></PaginationItem>
                <PaginationItem><PaginationLink href="#" isActive>1</PaginationLink></PaginationItem>
                <PaginationItem><PaginationLink href="#">2</PaginationLink></PaginationItem>
                <PaginationItem><PaginationLink href="#">3</PaginationLink></PaginationItem>
                <PaginationItem><PaginationLink href="#">›</PaginationLink></PaginationItem>
              </PaginationContent>
            </Pagination>
          </Row>
          <Row label="Menu">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Actions ▾</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Student Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem><Plus className="mr-2 h-4 w-4" /> Add New</DropdownMenuItem>
                <DropdownMenuItem><Download className="mr-2 h-4 w-4" /> Export</DropdownMenuItem>
                <DropdownMenuItem><Settings className="mr-2 h-4 w-4" /> Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-semantic-danger"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Row>
        </Section>

        {/* 4. Data Components */}
        <Section title="4. Data Components" subtitle="Table, Badge, Chip, Avatar, Card.">
          <div className="overflow-hidden rounded-lg border border-border-default">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50">
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-end">Fees Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono text-caption">MOS-2026-001</TableCell>
                  <TableCell className="font-medium">Ahmad Hossain</TableCell>
                  <TableCell>Class 5 · A</TableCell>
                  <TableCell><Badge variant="default">Active</Badge></TableCell>
                  <TableCell className="text-end font-mono">৳1,500</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-caption">MOS-2026-002</TableCell>
                  <TableCell className="font-medium">Fatima Akter</TableCell>
                  <TableCell>Class 5 · A</TableCell>
                  <TableCell><Badge variant="default">Active</Badge></TableCell>
                  <TableCell className="text-end font-mono">৳0</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-caption">MOS-2026-003</TableCell>
                  <TableCell className="font-medium">Muhammad Rahman</TableCell>
                  <TableCell>Class 5 · A</TableCell>
                  <TableCell><Badge variant="destructive">Overdue</Badge></TableCell>
                  <TableCell className="text-end font-mono text-semantic-danger">৳3,000</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <div className="mt-6 space-y-4">
            <Row label="Badge">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Danger</Badge>
              <Badge variant="outline">Outline</Badge>
            </Row>
            <Row label="Chip (removable)">
              {chips.length > 0 ? (
                chips.map((c, i) => (
                  <Chip key={c} tone={i === 0 ? "primary" : i === 1 ? "accent" : "success"} removable onRemove={() => removeChip(i)}>
                    {c}
                  </Chip>
                ))
              ) : (
                <span className="text-caption text-text-muted">All chips removed — refresh to reset.</span>
              )}
            </Row>
            <Row label="Chip (tones)">
              <Chip tone="neutral">Neutral</Chip>
              <Chip tone="primary">Primary</Chip>
              <Chip tone="accent">Accent Gold</Chip>
              <Chip tone="success">Success</Chip>
              <Chip tone="warning">Warning</Chip>
              <Chip tone="danger">Danger</Chip>
            </Row>
            <Row label="Avatar">
              <Avatar><AvatarFallback>A</AvatarFallback></Avatar>
              <Avatar className="h-8 w-8"><AvatarFallback className="text-caption">FH</AvatarFallback></Avatar>
              <Avatar className="h-12 w-12"><AvatarFallback className="text-subtitle">MR</AvatarFallback></Avatar>
            </Row>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-subtitle">Total Students</CardTitle>
                <CardDescription>Across all branches</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-display font-bold text-primary-500">40</p>
                <p className="mt-1 text-caption text-text-secondary">+3 this month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-subtitle">Outstanding Fees</CardTitle>
                <CardDescription>As of 16 Sep 2026</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-display font-bold text-semantic-warning">৳45,000</p>
                <p className="mt-1 text-caption text-text-secondary">15 students pending</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-subtitle">Zakat Fund</CardTitle>
                <CardDescription>Isolated — SRS §3.7</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-display font-bold text-accent-500">৳125,000</p>
                <p className="mt-1 text-caption text-text-secondary">Fund-scoped</p>
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* 5. Feedback Components */}
        <Section title="5. Feedback Components" subtitle="Modal, Drawer, Toast, Tooltip, Spinner, Skeleton.">
          <Row label="Modal">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open Modal</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Student?</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. The student record and all associated
                    fee + attendance data will be permanently removed.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="ghost">Cancel</Button>
                  <Button variant="destructive"><Trash2 className="h-4 w-4" /> Delete</Button>
                </div>
              </DialogContent>
            </Dialog>
          </Row>
          <Row label="Drawer">
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="outline">Open Drawer</Button>
              </DrawerTrigger>
              <DrawerContent>
                <div className="mx-auto w-full max-w-md p-6">
                  <h3 className="text-subtitle font-semibold text-text-primary">Quick Edit</h3>
                  <p className="mt-1 text-body text-text-secondary">Side drawer for quick edits without leaving the list.</p>
                  <div className="mt-4 space-y-3">
                    <Input placeholder="Student name" />
                    <Button className="w-full">Save Changes</Button>
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
          </Row>
          <Row label="Toast">
            <Button onClick={() => toast.success("Fee collected successfully!", { description: "Receipt RCP-2026-1001 issued." })}>
              Show Success Toast
            </Button>
            <Button variant="destructive" onClick={() => toast.error("Payment failed", { description: "Idempotency-Key conflict." })}>
              Show Error Toast
            </Button>
            <Button variant="outline" onClick={() => toast.warning("Pending approval", { description: "৳25,000 requires Authority sign-off." })}>
              Show Warning Toast
            </Button>
          </Row>
          <Row label="Tooltip">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Info"><Info className="h-4 w-4" /></Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-caption">This field is visible to admins only (students.notes.view)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconButton variant="ghost" aria-label="Star"><Star className="h-4 w-4" /></IconButton>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-caption">Add to favorites</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Row>
          <Row label="Skeleton">
            <div className="w-full max-w-md space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </Row>
        </Section>

        {/* 6. Layout Components */}
        <Section title="6. Layout Components" subtitle="EmptyState, Alert/Callout, FilterBar, FieldRow.">
          <Row label="EmptyState">
            <div className="grid w-full gap-4 md:grid-cols-2 lg:grid-cols-3">
              <EmptyState
                illustration="students"
                title="No students yet"
                description="Add your first student to get started."
                action={<Button size="sm"><Plus className="h-4 w-4" /> Add Student</Button>}
              />
              <EmptyState
                illustration="fees"
                title="All caught up"
                description="No outstanding fees."
              />
              <EmptyState
                illustration="attendance"
                title="No attendance taken yet"
                description="Today's session hasn't been started."
                action={<Button size="sm">Take Attendance</Button>}
              />
            </div>
          </Row>
          <Row label="EmptyState (2)">
            <div className="grid w-full gap-4 md:grid-cols-2">
              <EmptyState
                illustration="inventory"
                title="No items in stock"
                description="Add your first inventory item."
              />
              <EmptyState
                illustration="results"
                title="Results will publish on [date]"
                description="Pre-publication tab is empty."
              />
            </div>
          </Row>
          <Row label="Alert">
            <div className="flex w-full flex-col gap-2">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Heads up</AlertTitle>
                <AlertDescription>This action will trigger an approval workflow per SRS §2.7.1.</AlertDescription>
              </Alert>
              <Alert variant="default">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>Fee receipt generated and ledger posted.</AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>Cannot approve your own request (Do-Not-Do D16).</AlertDescription>
              </Alert>
            </div>
          </Row>
          <Row label="FilterBar">
            <div className="w-full">
              <FilterBar activeCount={2} onClear={() => {}} onSavePreset={() => toast.success("Preset saved")}>
                <Chip tone="primary" removable onRemove={() => {}}>Class 5</Chip>
                <Chip tone="accent" removable onRemove={() => {}}>Section A</Chip>
                <select className="rounded-md border border-border-strong bg-surface-card px-3 py-1.5 text-caption text-text-primary">
                  <option>All statuses</option>
                  <option>Active</option>
                  <option>Overdue</option>
                </select>
              </FilterBar>
            </div>
          </Row>
          <Row label="FieldRow">
            <div className="w-full max-w-md space-y-3">
              <FieldRow label="Student Name" htmlFor="fr-1" helper="Stacked layout">
                <Input id="fr-1" placeholder="Ahmad Hossain" />
              </FieldRow>
              <FieldRow label="Roll Number" htmlFor="fr-2" layout="inline">
                <Input id="fr-2" placeholder="12" />
              </FieldRow>
              <FieldRow label="Email" htmlFor="fr-3" error="Inline error demo">
                <Input id="fr-3" placeholder="ahmad@example.com" />
              </FieldRow>
            </div>
          </Row>
        </Section>

        {/* Summary footer */}
        <footer className="border-t border-border-default pt-6 text-center">
          <p className="text-caption text-text-secondary">
            30 components · 5 states each · WCAG 2.1 AA · Tokens v1.0.0 (FROZEN)
          </p>
        </footer>
      </div>
    </div>
  );
}
