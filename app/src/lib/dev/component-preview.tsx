"use client";

/**
 * MadrashaOS — ComponentLivePreview (Phase C7.1)
 *
 * Renders live JSX previews for each of the 30 documented components,
 * driven by the component name slug. Used by /dev/components/[name].
 *
 * Every preview uses the FROZEN token system via Tailwind theme keys
 * (bg-primary-500, text-text-primary, shadow-elevation-1, etc.) — zero
 * raw hex / px values. Where a shadcn component already pulls tokens
 * via its cva definition, we simply render it as a consumer.
 */

import * as React from "react";
import {
  Plus,
  Trash2,
  Mail,
  Settings,
  Bell,
  Search,
  Download,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronRight,
  CalendarDays,
} from "lucide-react";

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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Drawer, DrawerTrigger, DrawerContent } from "@/components/ui/drawer";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/ui/filter-bar";
import { FieldRow } from "@/components/ui/field-row";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Tiny inline Spinner (no Spinner.tsx component exists yet —         */
/*  the preview shows what the documented API would look like).        */
/* ------------------------------------------------------------------ */

function InlineSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dim = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-10 w-10" : "h-6 w-6";
  const border = size === "sm" ? "border-2" : "border-[3px]";
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block ${dim} ${border} animate-spin rounded-full border-neutral-200 border-t-primary-500`}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Variant pill + state tile helpers                                  */
/* ------------------------------------------------------------------ */

export function VariantTile({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-caption font-medium uppercase tracking-wider text-text-muted">
        {label}
      </span>
      <div className="flex min-h-12 items-center gap-2 rounded-md border border-border-default bg-surface-card p-3">
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  The big switch — returns preview JSX for a given component slug     */
/* ------------------------------------------------------------------ */

export function ComponentLivePreview({
  name,
}: {
  name: string;
}): React.ReactNode {
  switch (name) {
    /* 1. Button ----------------------------------------------------- */
    case "button":
      return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <VariantTile label="default"><Button>Primary</Button></VariantTile>
          <VariantTile label="secondary"><Button variant="secondary">Secondary</Button></VariantTile>
          <VariantTile label="outline"><Button variant="outline">Outline</Button></VariantTile>
          <VariantTile label="ghost"><Button variant="ghost">Ghost</Button></VariantTile>
          <VariantTile label="destructive"><Button variant="destructive">Danger</Button></VariantTile>
          <VariantTile label="link"><Button variant="link">Link</Button></VariantTile>
          <VariantTile label="size: sm"><Button size="sm">Small</Button></VariantTile>
          <VariantTile label="size: lg"><Button size="lg">Large</Button></VariantTile>
          <VariantTile label="icon"><Button size="icon" aria-label="Add"><Plus className="h-4 w-4" /></Button></VariantTile>
          <VariantTile label="with icon"><Button><Download className="h-4 w-4" /> Export</Button></VariantTile>
          <VariantTile label="disabled"><Button disabled>Disabled</Button></VariantTile>
        </div>
      );

    /* 2. ButtonGroup ------------------------------------------------ */
    case "button-group":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <VariantTile label="segmented">
            <ButtonGroup variant="segmented" aria-label="View mode">
              <Button variant="outline" size="sm">Day</Button>
              <Button variant="outline" size="sm">Week</Button>
              <Button size="sm">Month</Button>
            </ButtonGroup>
          </VariantTile>
          <VariantTile label="joined">
            <ButtonGroup variant="joined">
              <Button variant="outline" size="sm">List</Button>
              <Button variant="outline" size="sm">Grid</Button>
              <Button variant="outline" size="sm">Table</Button>
            </ButtonGroup>
          </VariantTile>
        </div>
      );

    /* 3. IconButton ------------------------------------------------- */
    case "icon-button":
      return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <VariantTile label="default"><IconButton variant="default" aria-label="Add"><Plus className="h-4 w-4" /></IconButton></VariantTile>
          <VariantTile label="ghost"><IconButton variant="ghost" aria-label="Settings"><Settings className="h-4 w-4" /></IconButton></VariantTile>
          <VariantTile label="danger"><IconButton variant="danger" aria-label="Delete"><Trash2 className="h-4 w-4" /></IconButton></VariantTile>
          <VariantTile label="outline"><IconButton variant="outline" aria-label="Mail"><Mail className="h-4 w-4" /></IconButton></VariantTile>
          <VariantTile label="size: sm"><IconButton variant="default" size="sm" aria-label="Bell"><Bell className="h-3 w-3" /></IconButton></VariantTile>
          <VariantTile label="size: lg"><IconButton variant="default" size="lg" aria-label="Search"><Search className="h-5 w-5" /></IconButton></VariantTile>
        </div>
      );

    /* 4. TextInput -------------------------------------------------- */
    case "text-input":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <VariantTile label="default"><Input placeholder="Ahmad Hossain" /></VariantTile>
          <VariantTile label="with value"><Input defaultValue="Fatima Akter" /></VariantTile>
          <VariantTile label="error"><Input aria-invalid defaultValue="bad-email" placeholder="ahmad@example.com" /></VariantTile>
          <VariantTile label="disabled"><Input disabled placeholder="Disabled" /></VariantTile>
        </div>
      );

    /* 5. NumberInput ------------------------------------------------ */
    case "number-input":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <VariantTile label="default">
            <NumberInput defaultValue={1500} />
          </VariantTile>
          <VariantTile label="with stepper">
            <NumberInput defaultValue={1500} showStepper min={0} max={50000} step={100} />
          </VariantTile>
          <VariantTile label="with label/helper">
            <NumberInput label="Fee Amount (৳)" helper="Monthly installment" defaultValue={1500} />
          </VariantTile>
          <VariantTile label="error">
            <NumberInput label="Discount %" error="Cannot exceed 100" defaultValue={120} />
          </VariantTile>
        </div>
      );

    /* 6. DateInput -------------------------------------------------- */
    case "date-input":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <VariantTile label="default">
            <DateInput defaultValue="2026-09-16" />
          </VariantTile>
          <VariantTile label="bangla toggle">
            <DateInput defaultValue="2026-09-16" banglaToggle label="Admission Date" />
          </VariantTile>
          <VariantTile label="error">
            <DateInput defaultValue="2026-09-16" error="Cannot be a future date" />
          </VariantTile>
          <VariantTile label="with calendar icon">
            <div className="relative w-full">
              <DateInput defaultValue="2026-09-16" />
              <CalendarDays className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            </div>
          </VariantTile>
        </div>
      );

    /* 7. Select ----------------------------------------------------- */
    case "select":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <VariantTile label="native select (simple)">
            <select className="flex h-10 w-full rounded-md border border-border-strong bg-surface-card px-3 text-body text-text-primary focus:border-primary-500 focus:outline-none">
              <option>Class 1</option>
              <option>Class 5</option>
              <option>Class 8</option>
            </select>
          </VariantTile>
          <VariantTile label="disabled">
            <select disabled className="flex h-10 w-full rounded-md border border-border-strong bg-surface-card px-3 text-body text-text-primary opacity-50">
              <option>Class 1</option>
              <option>Class 5</option>
            </select>
          </VariantTile>
        </div>
      );

    /* 8. Textarea --------------------------------------------------- */
    case "textarea":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <VariantTile label="default">
            <Textarea placeholder="Any medical or behavioral notes…" rows={3} />
          </VariantTile>
          <VariantTile label="with value">
            <Textarea defaultValue="Allergic to peanuts. Requires inhaler during PE." rows={3} />
          </VariantTile>
          <VariantTile label="error">
            <Textarea aria-invalid defaultValue="x" placeholder="Notes" rows={3} />
          </VariantTile>
          <VariantTile label="disabled">
            <Textarea disabled placeholder="Disabled" rows={3} />
          </VariantTile>
        </div>
      );

    /* 9. Checkbox --------------------------------------------------- */
    case "checkbox":
      return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <VariantTile label="unchecked"><Checkbox /></VariantTile>
          <VariantTile label="checked"><Checkbox defaultChecked /></VariantTile>
          <VariantTile label="disabled"><Checkbox disabled /></VariantTile>
          <VariantTile label="with label">
            <div className="flex items-center gap-2">
              <Checkbox id="prev-chk" defaultChecked />
              <label htmlFor="prev-chk">View student notes</label>
            </div>
          </VariantTile>
        </div>
      );

    /* 10. RadioGroup ------------------------------------------------ */
    case "radio-group":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <VariantTile label="default (vertical)">
            <RadioGroup defaultValue="cash">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="cash" id="r1" />
                <label htmlFor="r1">Cash</label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="bank" id="r2" />
                <label htmlFor="r2">Bank</label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="mobile" id="r3" />
                <label htmlFor="r3">Mobile</label>
              </div>
            </RadioGroup>
          </VariantTile>
          <VariantTile label="horizontal">
            <RadioGroup defaultValue="cash" className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="cash" id="rh1" />
                <label htmlFor="rh1">Cash</label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="bank" id="rh2" />
                <label htmlFor="rh2">Bank</label>
              </div>
            </RadioGroup>
          </VariantTile>
        </div>
      );

    /* 11. Switch ---------------------------------------------------- */
    case "switch":
      return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <VariantTile label="off"><Switch /></VariantTile>
          <VariantTile label="on"><Switch defaultChecked /></VariantTile>
          <VariantTile label="disabled"><Switch disabled /></VariantTile>
          <VariantTile label="with label">
            <div className="flex items-center gap-3">
              <Switch id="sw-demo" defaultChecked />
              <label htmlFor="sw-demo">Hostel module active</label>
            </div>
          </VariantTile>
        </div>
      );

    /* 12. Tabs ------------------------------------------------------ */
    case "tabs":
      return (
        <div className="grid gap-3">
          <VariantTile label="default">
            <Tabs defaultValue="overview" className="w-full max-w-md">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="academic">Academic</TabsTrigger>
                <TabsTrigger value="fees">Fees</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="mt-3 text-body text-text-secondary">Overview content.</TabsContent>
              <TabsContent value="academic" className="mt-3 text-body text-text-secondary">Academic content.</TabsContent>
              <TabsContent value="fees" className="mt-3 text-body text-text-secondary">Fees content.</TabsContent>
            </Tabs>
          </VariantTile>
        </div>
      );

    /* 13. Breadcrumb ----------------------------------------------- */
    case "breadcrumb":
      return (
        <div className="grid gap-3">
          <VariantTile label="default">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem><BreadcrumbLink href="#">Dashboard</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator><ChevronRight className="h-4 w-4" /></BreadcrumbSeparator>
                <BreadcrumbItem><BreadcrumbLink href="#">Students</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator><ChevronRight className="h-4 w-4" /></BreadcrumbSeparator>
                <BreadcrumbItem><BreadcrumbPage>Ahmad Hossain</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </VariantTile>
        </div>
      );

    /* 14. Pagination ----------------------------------------------- */
    case "pagination":
      return (
        <div className="grid gap-3">
          <VariantTile label="default">
            <Pagination>
              <PaginationContent>
                <PaginationItem><PaginationLink href="#">‹</PaginationLink></PaginationItem>
                <PaginationItem><PaginationLink href="#" isActive>1</PaginationLink></PaginationItem>
                <PaginationItem><PaginationLink href="#">2</PaginationLink></PaginationItem>
                <PaginationItem><PaginationLink href="#">3</PaginationLink></PaginationItem>
                <PaginationItem><PaginationLink href="#">›</PaginationLink></PaginationItem>
              </PaginationContent>
            </Pagination>
          </VariantTile>
        </div>
      );

    /* 15. Menu / Dropdown ------------------------------------------ */
    case "menu":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <VariantTile label="default">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Actions ▾</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem><Plus className="mr-2 h-4 w-4" /> Add New</DropdownMenuItem>
                <DropdownMenuItem><Download className="mr-2 h-4 w-4" /> Export</DropdownMenuItem>
                <DropdownMenuItem><Settings className="mr-2 h-4 w-4" /> Settings</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </VariantTile>
          <VariantTile label="with separator + label">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Actions ▾</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Student Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuItem className="text-semantic-danger"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </VariantTile>
        </div>
      );

    /* 16. Table ----------------------------------------------------- */
    case "table":
      return (
        <div className="grid gap-3">
          <VariantTile label="default">
            <div className="w-full overflow-hidden rounded-lg border border-border-default">
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50">
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono text-caption">MOS-001</TableCell>
                    <TableCell className="font-medium">Ahmad Hossain</TableCell>
                    <TableCell><Badge variant="default">Active</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-caption">MOS-003</TableCell>
                    <TableCell className="font-medium">M. Rahman</TableCell>
                    <TableCell><Badge variant="destructive">Overdue</Badge></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </VariantTile>
        </div>
      );

    /* 17. Badge ---------------------------------------------------- */
    case "badge":
      return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <VariantTile label="default"><Badge>Active</Badge></VariantTile>
          <VariantTile label="secondary"><Badge variant="secondary">Pending</Badge></VariantTile>
          <VariantTile label="destructive"><Badge variant="destructive">Overdue</Badge></VariantTile>
          <VariantTile label="outline"><Badge variant="outline">Draft</Badge></VariantTile>
        </div>
      );

    /* 18. Chip ----------------------------------------------------- */
    case "chip":
      return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <VariantTile label="neutral"><Chip tone="neutral">Neutral</Chip></VariantTile>
          <VariantTile label="primary"><Chip tone="primary">Class 5</Chip></VariantTile>
          <VariantTile label="accent"><Chip tone="accent">Section A</Chip></VariantTile>
          <VariantTile label="success"><Chip tone="success">Paid</Chip></VariantTile>
          <VariantTile label="warning"><Chip tone="warning">Pending</Chip></VariantTile>
          <VariantTile label="danger"><Chip tone="danger">Overdue</Chip></VariantTile>
          <VariantTile label="removable"><Chip tone="primary" removable onRemove={() => {}}>Class 5</Chip></VariantTile>
        </div>
      );

    /* 19. Avatar --------------------------------------------------- */
    case "avatar":
      return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <VariantTile label="md (default)"><Avatar><AvatarFallback>A</AvatarFallback></Avatar></VariantTile>
          <VariantTile label="sm"><Avatar className="h-8 w-8"><AvatarFallback className="text-caption">FH</AvatarFallback></Avatar></VariantTile>
          <VariantTile label="lg"><Avatar className="h-12 w-12"><AvatarFallback className="text-subtitle">MR</AvatarFallback></Avatar></VariantTile>
        </div>
      );

    /* 20. Card ----------------------------------------------------- */
    case "card":
      return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <VariantTile label="default">
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-subtitle">Total Students</CardTitle>
                <CardDescription>Across all branches</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-display font-bold text-primary-500">40</p>
              </CardContent>
            </Card>
          </VariantTile>
          <VariantTile label="elevated">
            <Card className="w-full shadow-elevation-3">
              <CardHeader>
                <CardTitle className="text-subtitle">Outstanding</CardTitle>
                <CardDescription>As of today</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-display font-bold text-semantic-warning">৳45,000</p>
              </CardContent>
            </Card>
          </VariantTile>
          <VariantTile label="outlined">
            <Card className="w-full border-2 border-primary-500">
              <CardHeader>
                <CardTitle className="text-subtitle">Zakat Fund</CardTitle>
                <CardDescription>Fund-scoped</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-display font-bold text-accent-500">৳125,000</p>
              </CardContent>
            </Card>
          </VariantTile>
        </div>
      );

    /* 21. Modal ---------------------------------------------------- */
    case "modal":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <VariantTile label="default">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open Modal</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Student?</DialogTitle>
                  <DialogDescription>This action cannot be undone.</DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="ghost">Cancel</Button>
                  <Button variant="destructive"><Trash2 className="h-4 w-4" /> Delete</Button>
                </div>
              </DialogContent>
            </Dialog>
          </VariantTile>
        </div>
      );

    /* 22. Drawer --------------------------------------------------- */
    case "drawer":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <VariantTile label="default (bottom)">
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="outline">Open Drawer</Button>
              </DrawerTrigger>
              <DrawerContent>
                <div className="mx-auto w-full max-w-md p-6">
                  <h3 className="text-subtitle font-semibold text-text-primary">Quick Edit</h3>
                  <p className="mt-1 text-body text-text-secondary">Side drawer for quick edits.</p>
                  <div className="mt-4 space-y-3">
                    <Input placeholder="Student name" />
                    <Button className="w-full">Save Changes</Button>
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
          </VariantTile>
        </div>
      );

    /* 23. Toast ---------------------------------------------------- */
    case "toast":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <VariantTile label="success">
            <Button onClick={() => toast.success("Fee collected!", { description: "Receipt RCP-2026-1001." })}>
              Show Success
            </Button>
          </VariantTile>
          <VariantTile label="error">
            <Button variant="destructive" onClick={() => toast.error("Payment failed", { description: "Idempotency-Key conflict." })}>
              Show Error
            </Button>
          </VariantTile>
          <VariantTile label="warning">
            <Button variant="outline" onClick={() => toast.warning("Pending approval", { description: "৳25,000 requires Authority sign-off." })}>
              Show Warning
            </Button>
          </VariantTile>
          <VariantTile label="info">
            <Button variant="secondary" onClick={() => toast.info("Sync started", { description: "Pulling latest student roster." })}>
              Show Info
            </Button>
          </VariantTile>
        </div>
      );

    /* 24. Tooltip -------------------------------------------------- */
    case "tooltip":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <VariantTile label="default">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Info"><Info className="h-4 w-4" /></Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-caption">Visible to admins only</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </VariantTile>
          <VariantTile label="on IconButton">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconButton variant="ghost" aria-label="Star"><Search className="h-4 w-4" /></IconButton>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-caption">Search students</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </VariantTile>
        </div>
      );

    /* 25. Skeleton ------------------------------------------------- */
    case "skeleton":
      return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <VariantTile label="text lines">
            <div className="w-full space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </VariantTile>
          <VariantTile label="block">
            <Skeleton className="h-20 w-full rounded-md" />
          </VariantTile>
          <VariantTile label="circle (avatar)">
            <Skeleton className="h-10 w-10 rounded-full" />
          </VariantTile>
        </div>
      );

    /* 26. EmptyState ----------------------------------------------- */
    case "empty-state":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <VariantTile label="students">
            <EmptyState illustration="students" title="No students yet" description="Add your first student to get started." />
          </VariantTile>
          <VariantTile label="fees">
            <EmptyState illustration="fees" title="All caught up" description="No outstanding fees." />
          </VariantTile>
          <VariantTile label="generic">
            <EmptyState illustration="generic" title="Nothing here" description="Try adjusting your filters." action={<Button size="sm">Reset</Button>} />
          </VariantTile>
        </div>
      );

    /* 27. Alert ---------------------------------------------------- */
    case "alert":
      return (
        <div className="grid gap-3">
          <VariantTile label="default (info)">
            <Alert className="w-full">
              <Info className="h-4 w-4" />
              <AlertTitle>Heads up</AlertTitle>
              <AlertDescription>This action will trigger an approval workflow per SRS §2.7.1.</AlertDescription>
            </Alert>
          </VariantTile>
          <VariantTile label="success">
            <Alert className="w-full border-semantic-success text-semantic-success">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>Fee receipt generated and ledger posted.</AlertDescription>
            </Alert>
          </VariantTile>
          <VariantTile label="warning">
            <Alert className="w-full border-semantic-warning text-semantic-warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>৳25,000 requires Authority sign-off.</AlertDescription>
            </Alert>
          </VariantTile>
          <VariantTile label="destructive">
            <Alert variant="destructive" className="w-full">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>Cannot approve your own request (Do-Not-Do D16).</AlertDescription>
            </Alert>
          </VariantTile>
        </div>
      );

    /* 28. FilterBar ------------------------------------------------ */
    case "filter-bar":
      return (
        <div className="grid gap-3">
          <VariantTile label="with active count">
            <FilterBar activeCount={2} onClear={() => {}} onSavePreset={() => toast.success("Preset saved")}>
              <Chip tone="primary" removable onRemove={() => {}}>Class 5</Chip>
              <Chip tone="accent" removable onRemove={() => {}}>Section A</Chip>
              <select className="rounded-md border border-border-strong bg-surface-card px-3 py-1.5 text-caption text-text-primary">
                <option>All statuses</option>
                <option>Active</option>
                <option>Overdue</option>
              </select>
            </FilterBar>
          </VariantTile>
          <VariantTile label="empty">
            <FilterBar>
              <select className="rounded-md border border-border-strong bg-surface-card px-3 py-1.5 text-caption text-text-primary">
                <option>Add a filter…</option>
                <option>Class</option>
                <option>Status</option>
              </select>
            </FilterBar>
          </VariantTile>
        </div>
      );

    /* 29. FieldRow ------------------------------------------------- */
    case "field-row":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <VariantTile label="stacked">
            <FieldRow label="Student Name" htmlFor="fr-stack" helper="Stacked layout">
              <Input id="fr-stack" placeholder="Ahmad Hossain" />
            </FieldRow>
          </VariantTile>
          <VariantTile label="inline">
            <FieldRow label="Roll Number" htmlFor="fr-inline" layout="inline">
              <Input id="fr-inline" placeholder="12" />
            </FieldRow>
          </VariantTile>
          <VariantTile label="required + helper">
            <FieldRow label="Email" htmlFor="fr-req" helper="Used for receipts" required>
              <Input id="fr-req" type="email" placeholder="ahmad@example.com" />
            </FieldRow>
          </VariantTile>
          <VariantTile label="error">
            <FieldRow label="Email" htmlFor="fr-err" error="Invalid email format">
              <Input id="fr-err" placeholder="ahmad@example.com" defaultValue="bad-email" aria-invalid />
            </FieldRow>
          </VariantTile>
        </div>
      );

    /* 30. Spinner -------------------------------------------------- */
    case "spinner":
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          <VariantTile label="sm"><InlineSpinner size="sm" /></VariantTile>
          <VariantTile label="md"><InlineSpinner size="md" /></VariantTile>
          <VariantTile label="lg"><InlineSpinner size="lg" /></VariantTile>
        </div>
      );

    default:
      return (
        <p className="text-body text-text-muted">No live preview available for this component.</p>
      );
  }
}

/* ------------------------------------------------------------------ */
/*  StatePreview — renders one component instance per documented state */
/* ------------------------------------------------------------------ */

export function StatePreview({ name }: { name: string }): React.ReactNode {
  // For simplicity, the state preview reuses the live preview tile grid;
  // each variant tile is already interactive so hover/focus/active states
  // can be exercised by the reader. The `disabled` and `error` tiles are
  // included in the variants grid above where the component supports them.
  return <ComponentLivePreview name={name} />;
}
