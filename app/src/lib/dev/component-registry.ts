/**
 * MadrashaOS — Component Documentation Registry (Phase C7.1)
 *
 * Storybook-style metadata for all 30 atomic components from Session 1.3 spec.
 * Consumed by `/dev/components/[name]` to render per-component detail pages.
 *
 * Each entry is a pure-data description (no JSX) so it can be:
 *   - imported by server components for SSR
 *   - serialised for search / index generation
 *   - audited by future tooling
 *
 * Token paths use dot-notation that resolves through `tokens.ts`:
 *   "color.primary.500"        → tokens.color.primary[500]    = "#0E5C5C"
 *   "color.semantic.success"   → tokens.color.semantic.success = "#2F7D32"
 *   "radius.md"                → tokens.radius.md              = 6
 *   "elevation.1"              → tokens.elevation[1]           = "0 1px 2px ..."
 *   "motion.duration.fast"     → tokens.motion.duration.fast   = "150ms"
 *
 * Consumes ONLY the FROZEN token system (v1.0.0) — see src/lib/design-system/tokens.ts
 */

export type ComponentCategory =
  | "Action"
  | "Form"
  | "Navigation"
  | "Data"
  | "Feedback"
  | "Layout";

export interface ComponentProp {
  name: string;
  type: string;
  default?: string;
  required: boolean;
  description: string;
}

export interface ComponentA11y {
  role: string;
  ariaAttributes: string[];
  keyboardInteractions: string[];
}

export interface ComponentDefinition {
  /** kebab-case URL slug, e.g. "button", "icon-button" */
  name: string;
  /** Display name, e.g. "Button", "IconButton" */
  displayName: string;
  category: ComponentCategory;
  description: string;
  /** Visual variants the component ships with, e.g. ["primary","secondary"] */
  variants: string[];
  /** Interactive states documented, e.g. ["default","hover","active","focus","disabled"] */
  states: string[];
  props: ComponentProp[];
  a11y: ComponentA11y;
  /** Dotted token paths (resolvable through tokens.ts) */
  tokens: string[];
  /** Copy/paste-able usage example */
  codeSnippet: string;
}

/* ------------------------------------------------------------------ */
/*  Shared defaults                                                    */
/* ------------------------------------------------------------------ */

const DEFAULT_STATES = ["default", "hover", "active", "focus", "disabled"];

const INPUT_STATES = ["default", "focus", "filled", "error", "disabled"];

/* ------------------------------------------------------------------ */
/*  Registry — 30 components                                           */
/* ------------------------------------------------------------------ */

export const componentRegistry: ComponentDefinition[] = [
  /* 1. Button -------------------------------------------------------- */
  {
    name: "button",
    displayName: "Button",
    category: "Action",
    description:
      "Primary action trigger. Six variants × four sizes. Built on cva + Slot so it composes with asChild for anchor links.",
    variants: ["default", "secondary", "outline", "ghost", "destructive", "link"],
    states: DEFAULT_STATES,
    props: [
      { name: "variant", type: "\"default\" | \"secondary\" | \"outline\" | \"ghost\" | \"destructive\" | \"link\"", default: "\"default\"", required: false, description: "Visual style of the button." },
      { name: "size", type: "\"default\" | \"sm\" | \"lg\" | \"icon\"", default: "\"default\"", required: false, description: "Height / padding scale. \"icon\" is a square for icon-only buttons." },
      { name: "asChild", type: "boolean", default: "false", required: false, description: "Render as Slot so a child element (e.g. <a>) receives button styles." },
      { name: "type", type: "\"button\" | \"submit\" | \"reset\"", default: "(native default)", required: false, description: "Native button type attribute." },
      { name: "disabled", type: "boolean", default: "false", required: false, description: "Disables the button — pointer-events none, opacity 50%." },
      { name: "onClick", type: "(e: MouseEvent) => void", default: "—", required: false, description: "Click handler." },
      { name: "children", type: "React.ReactNode", default: "—", required: true, description: "Button label / contents." },
    ],
    a11y: {
      role: "button",
      ariaAttributes: ["aria-disabled (when disabled via asChild)", "aria-label (when icon-only)", "aria-pressed (for toggle buttons)"],
      keyboardInteractions: ["Enter → triggers onClick", "Space → triggers onClick", "Tab → moves focus to next focusable element"],
    },
    tokens: ["color.primary.500", "color.primary.foreground", "color.primary.600", "color.semantic.danger", "color.neutral.100", "radius.md", "elevation.1"],
    codeSnippet: `import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

<Button variant="default" size="default">
  <Plus className="h-4 w-4" /> Add Student
</Button>`,
  },

  /* 2. ButtonGroup --------------------------------------------------- */
  {
    name: "button-group",
    displayName: "ButtonGroup",
    category: "Action",
    description:
      "Layout primitive that arranges Buttons in a segmented (gap) or joined (shared border) cluster — used for segmented controls and bulk-action toolbars.",
    variants: ["segmented", "joined"],
    states: DEFAULT_STATES,
    props: [
      { name: "variant", type: "\"segmented\" | \"joined\"", default: "\"segmented\"", required: false, description: "segmented = gap between buttons; joined = shared border, only outer corners rounded." },
      { name: "children", type: "React.ReactNode", default: "—", required: true, description: "Two or more <Button> elements." },
      { name: "className", type: "string", default: "\"\"", required: false, description: "Additional class names for the wrapper." },
    ],
    a11y: {
      role: "group",
      ariaAttributes: ["aria-label (recommended — describe the group, e.g. \"View mode\")"],
      keyboardInteractions: ["Tab → focus first button", "Arrow Right/Left → move between buttons (recommended enhancement)", "Enter/Space → activate focused button"],
    },
    tokens: ["color.border.default", "color.surface.card", "radius.md", "spacing.2"],
    codeSnippet: `import { ButtonGroup } from "@/components/ui/button-group";
import { Button } from "@/components/ui/button";

<ButtonGroup variant="segmented" aria-label="View mode">
  <Button variant="outline" size="sm">Day</Button>
  <Button variant="outline" size="sm">Week</Button>
  <Button size="sm">Month</Button>
</ButtonGroup>`,
  },

  /* 3. IconButton ---------------------------------------------------- */
  {
    name: "icon-button",
    displayName: "IconButton",
    category: "Action",
    description:
      "Square icon-only button for toolbars, tables, and nav rails. aria-label is REQUIRED (enforced via TypeScript).",
    variants: ["default", "ghost", "danger", "outline"],
    states: DEFAULT_STATES,
    props: [
      { name: "variant", type: "\"default\" | \"ghost\" | \"danger\" | \"outline\"", default: "\"default\"", required: false, description: "default = filled primary; ghost = transparent; danger = filled red; outline = bordered." },
      { name: "size", type: "\"sm\" | \"md\" | \"lg\"", default: "\"md\"", required: false, description: "Square dimensions: sm=32px, md=40px, lg=48px." },
      { name: "aria-label", type: "string", default: "—", required: true, description: "REQUIRED — screen readers announce this instead of the icon. TypeScript enforces it." },
      { name: "onClick", type: "(e: MouseEvent) => void", default: "—", required: false, description: "Click handler." },
      { name: "disabled", type: "boolean", default: "false", required: false, description: "Disables the button." },
      { name: "children", type: "React.ReactNode", default: "—", required: true, description: "Usually a single lucide-react icon." },
    ],
    a11y: {
      role: "button",
      ariaAttributes: ["aria-label (REQUIRED)", "aria-pressed (if toggle)", "aria-disabled (if disabled)"],
      keyboardInteractions: ["Enter → activates", "Space → activates", "Tab → focus"],
    },
    tokens: ["color.primary.500", "color.primary.foreground", "color.primary.600", "color.primary.700", "color.semantic.danger", "color.text.secondary", "color.surface.hover", "radius.md", "elevation.1"],
    codeSnippet: `import { IconButton } from "@/components/ui/icon-button";
import { Trash2 } from "lucide-react";

<IconButton variant="danger" aria-label="Delete row">
  <Trash2 className="h-4 w-4" />
</IconButton>`,
  },

  /* 4. TextInput ----------------------------------------------------- */
  {
    name: "text-input",
    displayName: "TextInput",
    category: "Form",
    description:
      "Native single-line text input (shadcn Input). Pair with FieldRow for label/helper/error structure. Auto-inherits focus ring + danger state from tokens.",
    variants: ["default", "error", "disabled"],
    states: INPUT_STATES,
    props: [
      { name: "type", type: "HTMLInputTypeAttribute", default: "\"text\"", required: false, description: "Native input type — text, email, password, tel, etc." },
      { name: "value", type: "string | number", default: "undefined", required: false, description: "Controlled value." },
      { name: "defaultValue", type: "string | number", default: "undefined", required: false, description: "Uncontrolled initial value." },
      { name: "placeholder", type: "string", default: "undefined", required: false, description: "Placeholder shown when empty. NOT a substitute for a label (P1)." },
      { name: "disabled", type: "boolean", default: "false", required: false, description: "Disables the input." },
      { name: "aria-invalid", type: "boolean", default: "false", required: false, description: "Triggers the danger ring + border." },
      { name: "onChange", type: "ChangeEventHandler<HTMLInputElement>", default: "—", required: false, description: "Change handler." },
    ],
    a11y: {
      role: "textbox",
      ariaAttributes: ["aria-invalid (when error)", "aria-describedby (pairs with FieldRow helper/error id)", "aria-label / aria-labelledby (or native <label htmlFor>)"],
      keyboardInteractions: ["Type → updates value", "Tab → focus", "Shift+Tab → focus previous"],
    },
    tokens: ["color.border.strong", "color.surface.card", "color.text.primary", "color.text.muted", "color.primary.500", "color.semantic.danger", "radius.md"],
    codeSnippet: `import { Input } from "@/components/ui/input";
import { FieldRow } from "@/components/ui/field-row";

<FieldRow label="Student Name" htmlFor="name" required>
  <Input id="name" placeholder="Ahmad Hossain" />
</FieldRow>`,
  },

  /* 5. NumberInput --------------------------------------------------- */
  {
    name: "number-input",
    displayName: "NumberInput",
    category: "Form",
    description:
      "Numeric input with optional +/- stepper buttons. Validates min/max on step. Pairs with a visible label via FieldRow.",
    variants: ["default", "stepper", "error"],
    states: INPUT_STATES,
    props: [
      { name: "label", type: "string", default: "undefined", required: false, description: "Visible label rendered above the input." },
      { name: "helper", type: "string", default: "undefined", required: false, description: "Helper text under the input." },
      { name: "error", type: "string", default: "undefined", required: false, description: "Error message — switches input to danger style + aria-invalid." },
      { name: "showStepper", type: "boolean", default: "false", required: false, description: "Renders − and + buttons flanking the input." },
      { name: "min", type: "number", default: "undefined", required: false, description: "Minimum allowed value (enforced on step)." },
      { name: "max", type: "number", default: "undefined", required: false, description: "Maximum allowed value (enforced on step)." },
      { name: "step", type: "number", default: "1", required: false, description: "Stepper increment." },
      { name: "onValueChange", type: "(value: number | undefined) => void", default: "—", required: false, description: "Returns the new numeric value (or undefined when cleared)." },
    ],
    a11y: {
      role: "spinbutton",
      ariaAttributes: ["aria-valuenow", "aria-valuemin", "aria-valuemax", "aria-invalid (when error)", "aria-describedby (helper/error)"],
      keyboardInteractions: ["Type → updates value", "Arrow Up → +step", "Arrow Down → −step", "Tab → focus"],
    },
    tokens: ["color.border.strong", "color.surface.card", "color.surface.hover", "color.text.primary", "color.text.secondary", "color.primary.500", "color.semantic.danger", "radius.md", "spacing.3"],
    codeSnippet: `import { NumberInput } from "@/components/ui/number-input";

<NumberInput
  label="Fee Amount (৳)"
  helper="Monthly installment"
  defaultValue={1500}
  showStepper
  min={0}
  max={50000}
  step={100}
  onValueChange={(v) => console.log(v)}
/>`,
  },

  /* 6. DateInput ----------------------------------------------------- */
  {
    name: "date-input",
    displayName: "DateInput",
    category: "Form",
    description:
      "Native date picker with optional Bangla calendar display toggle. The toggle converts numerals to Bangla (১৬-০৯-২০২৬) without losing the underlying ISO value.",
    variants: ["default", "banglaToggle", "error"],
    states: INPUT_STATES,
    props: [
      { name: "label", type: "string", default: "undefined", required: false, description: "Visible label." },
      { name: "helper", type: "string", default: "undefined", required: false, description: "Helper text." },
      { name: "error", type: "string", default: "undefined", required: false, description: "Error message." },
      { name: "banglaToggle", type: "boolean", default: "false", required: false, description: "When true, shows the localized (Bangla/Arabic) date below the input." },
      { name: "value", type: "string (ISO yyyy-mm-dd)", default: "undefined", required: false, description: "Controlled value." },
      { name: "onValueChange", type: "(value: string) => void", default: "—", required: false, description: "Returns ISO date string." },
    ],
    a11y: {
      role: "textbox",
      ariaAttributes: ["aria-describedby (helper/error)", "aria-invalid (when error)"],
      keyboardInteractions: ["Type or pick date", "Tab → focus", "Arrow keys → navigate date picker"],
    },
    tokens: ["color.border.strong", "color.surface.card", "color.text.primary", "color.text.muted", "color.primary.500", "color.semantic.danger", "radius.md"],
    codeSnippet: `import { DateInput } from "@/components/ui/date-input";

<DateInput
  label="Admission Date"
  defaultValue="2026-09-16"
  banglaToggle
  helper="Bangla calendar toggle on"
/>`,
  },

  /* 7. Select -------------------------------------------------------- */
  {
    name: "select",
    displayName: "Select",
    category: "Form",
    description:
      "Single-choice dropdown built on Radix Select. Renders a styled trigger + portal'd content. Use shadcn Select for full keyboard nav; native <select> for simple cases.",
    variants: ["default", "error", "disabled"],
    states: INPUT_STATES,
    props: [
      { name: "value", type: "string", default: "undefined", required: false, description: "Controlled selected value." },
      { name: "defaultValue", type: "string", default: "undefined", required: false, description: "Uncontrolled initial value." },
      { name: "onValueChange", type: "(value: string) => void", default: "—", required: false, description: "Selection handler." },
      { name: "disabled", type: "boolean", default: "false", required: false, description: "Disables the trigger." },
      { name: "children", type: "React.ReactNode (SelectItem[])", default: "—", required: true, description: "One or more <SelectItem value=\"x\">Label</SelectItem>." },
    ],
    a11y: {
      role: "listbox (trigger) / option (item)",
      ariaAttributes: ["aria-expanded", "aria-controls", "aria-activedescendant", "aria-selected", "aria-label"],
      keyboardInteractions: ["Space/Enter → open", "Arrow Up/Down → navigate items", "Enter → select", "Esc → close", "Tab → commit + close"],
    },
    tokens: ["color.border.strong", "color.surface.card", "color.text.primary", "color.primary.500", "radius.md", "elevation.3"],
    codeSnippet: `import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

<Select defaultValue="class-5">
  <SelectTrigger className="w-40"><SelectValue placeholder="Class" /></SelectTrigger>
  <SelectContent>
    <SelectItem value="class-1">Class 1</SelectItem>
    <SelectItem value="class-5">Class 5</SelectItem>
  </SelectContent>
</Select>`,
  },

  /* 8. Textarea ------------------------------------------------------ */
  {
    name: "textarea",
    displayName: "Textarea",
    category: "Form",
    description:
      "Multi-line text input. Auto-resizes to content (field-sizing: content). Pair with FieldRow for label/helper/error.",
    variants: ["default", "error", "disabled"],
    states: INPUT_STATES,
    props: [
      { name: "rows", type: "number", default: "(native default)", required: false, description: "Visible rows. With field-sizing, height auto-grows anyway." },
      { name: "value", type: "string", default: "undefined", required: false, description: "Controlled value." },
      { name: "defaultValue", type: "string", default: "undefined", required: false, description: "Uncontrolled initial value." },
      { name: "placeholder", type: "string", default: "undefined", required: false, description: "Placeholder text." },
      { name: "disabled", type: "boolean", default: "false", required: false, description: "Disables the textarea." },
      { name: "onChange", type: "ChangeEventHandler<HTMLTextAreaElement>", default: "—", required: false, description: "Change handler." },
    ],
    a11y: {
      role: "textbox",
      ariaAttributes: ["aria-multiline=\"true\"", "aria-invalid (when error)", "aria-describedby (helper/error)"],
      keyboardInteractions: ["Type → updates value", "Enter → newline", "Tab → focus next"],
    },
    tokens: ["color.border.strong", "color.surface.card", "color.text.primary", "color.text.muted", "color.primary.500", "color.semantic.danger", "radius.md"],
    codeSnippet: `import { Textarea } from "@/components/ui/textarea";

<Textarea
  id="notes"
  placeholder="Any medical or behavioral notes…"
  rows={3}
/>`,
  },

  /* 9. Checkbox ------------------------------------------------------ */
  {
    name: "checkbox",
    displayName: "Checkbox",
    category: "Form",
    description:
      "Single binary toggle built on Radix Checkbox. Supports indeterminate, checked, and unchecked states. Pair with a <label htmlFor> for accessible naming.",
    variants: ["unchecked", "checked", "indeterminate", "disabled"],
    states: DEFAULT_STATES,
    props: [
      { name: "checked", type: "boolean | \"indeterminate\"", default: "false", required: false, description: "Controlled check state." },
      { name: "onCheckedChange", type: "(checked: boolean | \"indeterminate\") => void", default: "—", required: false, description: "Change handler." },
      { name: "disabled", type: "boolean", default: "false", required: false, description: "Disables the checkbox." },
      { name: "id", type: "string", default: "undefined", required: false, description: "Pair with <label htmlFor> for click target + screen reader name." },
    ],
    a11y: {
      role: "checkbox",
      ariaAttributes: ["aria-checked (true / false / mixed)", "aria-disabled", "aria-label or associated <label htmlFor>"],
      keyboardInteractions: ["Space → toggle", "Tab → focus"],
    },
    tokens: ["color.border.strong", "color.primary.500", "color.primary.foreground", "color.semantic.danger", "radius.sm"],
    codeSnippet: `import { Checkbox } from "@/components/ui/checkbox";

<div className="flex items-center gap-2">
  <Checkbox id="notes-view" defaultChecked />
  <label htmlFor="notes-view">View student notes</label>
</div>`,
  },

  /* 10. RadioGroup --------------------------------------------------- */
  {
    name: "radio-group",
    displayName: "RadioGroup",
    category: "Form",
    description:
      "Single-choice group built on Radix RadioGroup. Use for mutually-exclusive options (e.g. payment method). Always render with one option selected by default.",
    variants: ["default", "horizontal", "vertical"],
    states: DEFAULT_STATES,
    props: [
      { name: "value", type: "string", default: "undefined", required: false, description: "Controlled selected value." },
      { name: "defaultValue", type: "string", default: "undefined", required: false, description: "Uncontrolled initial value." },
      { name: "onValueChange", type: "(value: string) => void", default: "—", required: false, description: "Selection handler." },
      { name: "disabled", type: "boolean", default: "false", required: false, description: "Disables the entire group." },
      { name: "children", type: "React.ReactNode (RadioGroupItem[])", default: "—", required: true, description: "One or more <RadioGroupItem value=\"x\" /> paired with <label>." },
    ],
    a11y: {
      role: "radiogroup",
      ariaAttributes: ["aria-required", "aria-disabled", "aria-label on group"],
      keyboardInteractions: ["Tab → focus selected option (or first)", "Arrow Up/Left → previous", "Arrow Down/Right → next", "Space → select"],
    },
    tokens: ["color.border.strong", "color.primary.500", "color.primary.foreground", "radius.full"],
    codeSnippet: `import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

<RadioGroup defaultValue="cash" className="flex gap-4">
  <div className="flex items-center gap-2">
    <RadioGroupItem value="cash" id="r-cash" />
    <label htmlFor="r-cash">Cash</label>
  </div>
  <div className="flex items-center gap-2">
    <RadioGroupItem value="bank" id="r-bank" />
    <label htmlFor="r-bank">Bank</label>
  </div>
</RadioGroup>`,
  },

  /* 11. Switch ------------------------------------------------------- */
  {
    name: "switch",
    displayName: "Switch",
    category: "Form",
    description:
      "Toggle built on Radix Switch. Use for instantaneous on/off state changes (e.g. module enabled). For commit-on-submit choices, use Checkbox instead.",
    variants: ["on", "off", "disabled"],
    states: DEFAULT_STATES,
    props: [
      { name: "checked", type: "boolean", default: "false", required: false, description: "Controlled on/off state." },
      { name: "onCheckedChange", type: "(checked: boolean) => void", default: "—", required: false, description: "Toggle handler." },
      { name: "disabled", type: "boolean", default: "false", required: false, description: "Disables the switch." },
      { name: "id", type: "string", default: "undefined", required: false, description: "Pair with <label htmlFor>." },
    ],
    a11y: {
      role: "switch",
      ariaAttributes: ["aria-checked", "aria-disabled", "aria-label or <label htmlFor>"],
      keyboardInteractions: ["Space → toggle", "Tab → focus"],
    },
    tokens: ["color.primary.500", "color.border.strong", "color.surface.card", "radius.full", "spacing.2"],
    codeSnippet: `import { Switch } from "@/components/ui/switch";
import { useState } from "react";

const [on, setOn] = useState(true);
<Switch id="hostel" checked={on} onCheckedChange={setOn} />`,
  },

  /* 12. Tabs --------------------------------------------------------- */
  {
    name: "tabs",
    displayName: "Tabs",
    category: "Navigation",
    description:
      "Tabbed panel switcher built on Radix Tabs. Use for in-page navigation between related views (e.g. student profile: Overview / Academic / Fees).",
    variants: ["default", "underline"],
    states: DEFAULT_STATES,
    props: [
      { name: "value", type: "string", default: "undefined", required: false, description: "Controlled active tab." },
      { name: "defaultValue", type: "string", default: "undefined", required: false, description: "Uncontrolled initial tab." },
      { name: "onValueChange", type: "(value: string) => void", default: "—", required: false, description: "Tab change handler." },
      { name: "children", type: "React.ReactNode (TabsList + TabsContent[])", default: "—", required: true, description: "Structure: <TabsList><TabsTrigger/></TabsList> + <TabsContent/> per tab." },
    ],
    a11y: {
      role: "tablist / tab / tabpanel",
      ariaAttributes: ["aria-selected", "aria-controls (tab → panel)", "aria-labelledby (panel → tab)", "tabindex (roving)"],
      keyboardInteractions: ["Tab → focus active tab", "Arrow Left/Right → move between tabs", "Enter/Space → activate (auto on arrow)"],
    },
    tokens: ["color.surface.card", "color.text.secondary", "color.primary.500", "radius.md", "spacing.2"],
    codeSnippet: `import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="academic">Academic</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">…</TabsContent>
  <TabsContent value="academic">…</TabsContent>
</Tabs>`,
  },

  /* 13. Breadcrumb --------------------------------------------------- */
  {
    name: "breadcrumb",
    displayName: "Breadcrumb",
    category: "Navigation",
    description:
      "Hierarchical page trail. Use the BreadcrumbPage (current page, aria-current=page) as the terminal node; BreadcrumbLink for ancestors.",
    variants: ["default", "collapsed"],
    states: ["default", "hover", "focus", "current", "disabled"],
    props: [
      { name: "children", type: "React.ReactNode (BreadcrumbList + items)", default: "—", required: true, description: "Breadcrumb structure with separators between items." },
      { name: "className", type: "string", default: "undefined", required: false, description: "Wrapper class." },
    ],
    a11y: {
      role: "navigation",
      ariaAttributes: ["aria-label=\"breadcrumb\"", "aria-current=\"page\" (on BreadcrumbPage)"],
      keyboardInteractions: ["Tab → focus each link in order", "Enter → navigate"],
    },
    tokens: ["color.text.secondary", "color.text.primary", "color.text.muted", "spacing.2"],
    codeSnippet: `import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem,
  BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage,
} from "@/components/ui/breadcrumb";

<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem><BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem><BreadcrumbLink href="/students">Students</BreadcrumbLink></BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem><BreadcrumbPage>Ahmad Hossain</BreadcrumbPage></BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>`,
  },

  /* 14. Pagination --------------------------------------------------- */
  {
    name: "pagination",
    displayName: "Pagination",
    category: "Navigation",
    description:
      "Page navigation for long lists/tables. Use PaginationLink with isActive to mark the current page. Prefer next/prev arrows + 3 numbers around current.",
    variants: ["default", "compact"],
    states: ["default", "hover", "focus", "active", "disabled"],
    props: [
      { name: "children", type: "React.ReactNode (PaginationContent + items)", default: "—", required: true, description: "PaginationContent wrapping PaginationItem / PaginationLink." },
      { name: "className", type: "string", default: "undefined", required: false, description: "Wrapper class." },
    ],
    a11y: {
      role: "navigation",
      ariaAttributes: ["aria-label=\"pagination\"", "aria-current=\"page\" (active link)"],
      keyboardInteractions: ["Tab → focus each link", "Enter → navigate"],
    },
    tokens: ["color.text.primary", "color.primary.500", "color.surface.hover", "radius.md", "spacing.2"],
    codeSnippet: `import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
} from "@/components/ui/pagination";

<Pagination>
  <PaginationContent>
    <PaginationItem><PaginationLink href="#">‹</PaginationLink></PaginationItem>
    <PaginationItem><PaginationLink href="#" isActive>1</PaginationLink></PaginationItem>
    <PaginationItem><PaginationLink href="#">2</PaginationLink></PaginationItem>
    <PaginationItem><PaginationLink href="#">›</PaginationLink></PaginationItem>
  </PaginationContent>
</Pagination>`,
  },

  /* 15. Menu / Dropdown ---------------------------------------------- */
  {
    name: "menu",
    displayName: "Menu (Dropdown)",
    category: "Navigation",
    description:
      "Contextual action menu built on Radix DropdownMenu. Trigger opens a portal'd list of items, separators, and labels. Use for row-level actions (Edit / Duplicate / Delete).",
    variants: ["default", "withIcons", "withSeparator", "withLabel"],
    states: DEFAULT_STATES,
    props: [
      { name: "children", type: "React.ReactNode (Trigger + Content)", default: "—", required: true, description: "Trigger (usually asChild Button) + Content with items." },
      { name: "modal", type: "boolean", default: "true", required: false, description: "When true, traps focus while open." },
      { name: "align", type: "\"start\" | \"center\" | \"end\"", default: "\"start\"", required: false, description: "Horizontal alignment of content vs trigger." },
    ],
    a11y: {
      role: "menu (content) / menuitem (item)",
      ariaAttributes: ["aria-haspopup=\"menu\"", "aria-expanded", "aria-disabled (on disabled items)"],
      keyboardInteractions: ["Space/Enter → open", "Arrow Up/Down → navigate items", "Esc → close", "Tab → close + move focus"],
    },
    tokens: ["color.surface.card", "color.text.primary", "color.text.secondary", "color.surface.hover", "color.semantic.danger", "radius.md", "elevation.3"],
    codeSnippet: `import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Actions ▾</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="start">
    <DropdownMenuLabel>Student Actions</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Edit</DropdownMenuItem>
    <DropdownMenuItem className="text-semantic-danger">Delete</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>`,
  },

  /* 16. Table -------------------------------------------------------- */
  {
    name: "table",
    displayName: "Table",
    category: "Data",
    description:
      "Semantic table primitive (Table / TableHeader / TableBody / TableRow / TableHead / TableCell). Wrap in an overflow-x-auto container for responsive tables.",
    variants: ["default", "striped", "condensed"],
    states: ["default", "hover", "selected", "loading", "empty"],
    props: [
      { name: "children", type: "React.ReactNode (Header + Body)", default: "—", required: true, description: "Standard <table> composition." },
      { name: "className", type: "string", default: "undefined", required: false, description: "Wrapper class." },
    ],
    a11y: {
      role: "table / row / columnheader / rowheader / cell",
      ariaAttributes: ["aria-rowcount (when virtualized)", "aria-colcount", "aria-sort (on sorted column)"],
      keyboardInteractions: ["Tab → focus table (when scrollable)", "Arrow keys → navigate cells (requires enhancement)"],
    },
    tokens: ["color.border.default", "color.surface.card", "color.neutral.50", "color.text.primary", "color.text.secondary", "color.surface.hover"],
    codeSnippet: `import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Class</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Ahmad Hossain</TableCell>
      <TableCell>Class 5</TableCell>
    </TableRow>
  </TableBody>
</Table>`,
  },

  /* 17. Badge -------------------------------------------------------- */
  {
    name: "badge",
    displayName: "Badge",
    category: "Data",
    description:
      "Compact status label. Four variants. Use for read-only status (Active / Pending / Overdue). For actionable tags, use Chip.",
    variants: ["default", "secondary", "destructive", "outline"],
    states: DEFAULT_STATES,
    props: [
      { name: "variant", type: "\"default\" | \"secondary\" | \"destructive\" | \"outline\"", default: "\"default\"", required: false, description: "default = primary fill; secondary = neutral fill; destructive = danger fill; outline = bordered." },
      { name: "asChild", type: "boolean", default: "false", required: false, description: "Render as Slot (e.g. wrap a link)." },
      { name: "children", type: "React.ReactNode", default: "—", required: true, description: "Short text — usually 1–2 words." },
    ],
    a11y: {
      role: "status",
      ariaAttributes: ["aria-label (if icon-only)", "title (for tooltip on hover)"],
      keyboardInteractions: ["(none — non-interactive)", "If asChild=a, inherits anchor keyboard behavior"],
    },
    tokens: ["color.primary.500", "color.primary.foreground", "color.neutral.100", "color.semantic.danger", "color.border.default", "radius.md"],
    codeSnippet: `import { Badge } from "@/components/ui/badge";

<Badge variant="default">Active</Badge>
<Badge variant="destructive">Overdue</Badge>
<Badge variant="outline">Draft</Badge>`,
  },

  /* 18. Chip --------------------------------------------------------- */
  {
    name: "chip",
    displayName: "Chip",
    category: "Data",
    description:
      "Removable facet tag with six tones. Use for applied filter facets in FilterBar. The removable X button is keyboard accessible.",
    variants: ["neutral", "primary", "accent", "success", "warning", "danger"],
    states: ["default", "hover", "focus", "removable", "disabled"],
    props: [
      { name: "tone", type: "\"neutral\" | \"primary\" | \"accent\" | \"success\" | \"warning\" | \"danger\"", default: "\"neutral\"", required: false, description: "Color tone — each maps to a 50 background + 700 foreground pairing." },
      { name: "removable", type: "boolean", default: "false", required: false, description: "Show an X button on the right." },
      { name: "onRemove", type: "() => void", default: "—", required: false, description: "Remove handler — fire when X is clicked." },
      { name: "children", type: "React.ReactNode", default: "—", required: true, description: "Short label text." },
    ],
    a11y: {
      role: "listitem (when in a filter list)",
      ariaAttributes: ["aria-label (X button)=\"Remove {label}\""],
      keyboardInteractions: ["Tab → focus X button", "Enter/Space → remove"],
    },
    tokens: ["color.neutral.100", "color.primary.50", "color.primary.700", "color.accent.50", "color.accent.700", "color.semantic.success", "color.semantic.warning", "color.semantic.danger", "radius.full"],
    codeSnippet: `import { Chip } from "@/components/ui/chip";

<Chip tone="primary" removable onRemove={() => setFilters([])}>
  Class 5
</Chip>`,
  },

  /* 19. Avatar ------------------------------------------------------ */
  {
    name: "avatar",
    displayName: "Avatar",
    category: "Data",
    description:
      "User / entity image with graceful fallback (initials or icon). Built on Radix Avatar — renders AvatarImage (if URL) and AvatarFallback.",
    variants: ["sm", "md", "lg"],
    states: ["default", "image", "fallback", "loading"],
    props: [
      { name: "children", type: "React.ReactNode (AvatarImage + AvatarFallback)", default: "—", required: true, description: "Image first; fallback rendered if image fails to load." },
      { name: "className", type: "string", default: "undefined", required: false, description: "Override size — default h-10 w-10. Use h-8 w-8 (sm), h-12 w-12 (lg)." },
    ],
    a11y: {
      role: "img",
      ariaAttributes: ["aria-label (set on Avatar or via alt on AvatarImage)", "role=\"img\" (set by Radix)"],
      keyboardInteractions: ["(none — non-interactive)"],
    },
    tokens: ["color.neutral.100", "color.primary.500", "color.text.primary", "radius.full"],
    codeSnippet: `import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

<Avatar>
  <AvatarImage src="/users/ahmad.jpg" alt="Ahmad Hossain" />
  <AvatarFallback>AH</AvatarFallback>
</Avatar>`,
  },

  /* 20. Card --------------------------------------------------------- */
  {
    name: "card",
    displayName: "Card",
    category: "Data",
    description:
      "Surface container for grouping related content. Composition: Card > CardHeader (CardTitle, CardDescription) + CardContent + (optional) CardFooter.",
    variants: ["default", "elevated", "outlined"],
    states: ["default", "hover", "active", "loading", "empty"],
    props: [
      { name: "children", type: "React.ReactNode", default: "—", required: true, description: "CardHeader + CardContent (+ CardFooter)." },
      { name: "className", type: "string", default: "undefined", required: false, description: "Wrapper class." },
    ],
    a11y: {
      role: "region (if labelled) / group",
      ariaAttributes: ["aria-labelledby (when CardTitle has an id)", "aria-describedby (when CardDescription has an id)"],
      keyboardInteractions: ["(none — non-interactive)", "If card contains a clickable child, focus that child"],
    },
    tokens: ["color.surface.card", "color.border.default", "color.text.primary", "color.text.secondary", "radius.xl", "elevation.1", "spacing.6"],
    codeSnippet: `import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Total Students</CardTitle>
    <CardDescription>Across all branches</CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-display font-bold text-primary-500">40</p>
  </CardContent>
</Card>`,
  },

  /* 21. Modal / Dialog ---------------------------------------------- */
  {
    name: "modal",
    displayName: "Modal (Dialog)",
    category: "Feedback",
    description:
      "Overlay dialog built on Radix Dialog. Traps focus, restores on close, closes on Esc + backdrop click. Use for confirmations and short forms.",
    variants: ["default", "alert", "form"],
    states: ["closed", "open", "loading", "error"],
    props: [
      { name: "children", type: "React.ReactNode (Trigger + Content)", default: "—", required: true, description: "DialogTrigger + DialogContent (with DialogHeader)." },
      { name: "defaultOpen", type: "boolean", default: "false", required: false, description: "Uncontrolled initial open state." },
      { name: "open", type: "boolean", default: "undefined", required: false, description: "Controlled open state." },
      { name: "onOpenChange", type: "(open: boolean) => void", default: "—", required: false, description: "Open/close handler." },
    ],
    a11y: {
      role: "dialog (or alertdialog)",
      ariaAttributes: ["aria-modal=\"true\"", "aria-labelledby (DialogTitle)", "aria-describedby (DialogDescription)"],
      keyboardInteractions: ["Tab → roving focus inside", "Shift+Tab → reverse", "Esc → close"],
    },
    tokens: ["color.surface.card", "color.text.primary", "color.border.default", "color.semantic.danger", "radius.lg", "elevation.5", "spacing.6"],
    codeSnippet: `import {
  Dialog, DialogTrigger, DialogContent,
  DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Delete Student?</DialogTitle>
      <DialogDescription>This action cannot be undone.</DialogDescription>
    </DialogHeader>
  </DialogContent>
</Dialog>`,
  },

  /* 22. Drawer ------------------------------------------------------ */
  {
    name: "drawer",
    displayName: "Drawer",
    category: "Feedback",
    description:
      "Bottom sheet / side panel built on vaul. Use for quick edits without leaving the list view. Renders DrawerTrigger + DrawerContent; content max-width recommended 28rem.",
    variants: ["bottom", "right"],
    states: ["closed", "open", "dragging"],
    props: [
      { name: "children", type: "React.ReactNode (Trigger + Content)", default: "—", required: true, description: "DrawerTrigger + DrawerContent." },
      { name: "open", type: "boolean", default: "undefined", required: false, description: "Controlled open state." },
      { name: "onOpenChange", type: "(open: boolean) => void", default: "—", required: false, description: "Open/close handler." },
      { name: "direction", type: "\"top\" | \"bottom\" | \"left\" | \"right\"", default: "\"bottom\"", required: false, description: "Edge the drawer slides in from." },
    ],
    a11y: {
      role: "dialog",
      ariaAttributes: ["aria-modal=\"true\"", "aria-labelledby"],
      keyboardInteractions: ["Esc → close", "Tab → focus trap inside", "Swipe down (touch) → drag-dismiss"],
    },
    tokens: ["color.surface.card", "color.border.default", "color.text.primary", "radius.lg", "elevation.5"],
    codeSnippet: `import { Drawer, DrawerTrigger, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

<Drawer>
  <DrawerTrigger asChild>
    <Button variant="outline">Quick Edit</Button>
  </DrawerTrigger>
  <DrawerContent>
    <div className="mx-auto w-full max-w-md p-6">
      <h3 className="text-subtitle font-semibold">Quick Edit</h3>
    </div>
  </DrawerContent>
</Drawer>`,
  },

  /* 23. Toast ------------------------------------------------------- */
  {
    name: "toast",
    displayName: "Toast",
    category: "Feedback",
    description:
      "Non-blocking notification stack built on Sonner. Auto-dismisses after 4s. Use for ephemeral success/error feedback after mutations. Up to 3 visible at once.",
    variants: ["success", "error", "warning", "info", "loading"],
    states: ["default", "active", "dismissed"],
    props: [
      { name: "message", type: "string", default: "—", required: true, description: "Primary message — passed as the first arg to toast.success / error / etc." },
      { name: "description", type: "string", default: "undefined", required: false, description: "Secondary line — usually a receipt ID or technical detail." },
      { name: "duration", type: "number (ms)", default: "4000", required: false, description: "Auto-dismiss delay." },
      { name: "action", type: "{ label: string; onClick: () => void }", default: "undefined", required: false, description: "Optional inline action button (e.g. \"Undo\")." },
    ],
    a11y: {
      role: "status",
      ariaAttributes: ["aria-live=\"polite\" (success/info)", "aria-live=\"assertive\" (error)", "role=\"status\""],
      keyboardInteractions: ["(none — non-interactive; auto-dismiss)", "Action button is keyboard-focusable when present"],
    },
    tokens: ["color.surface.card", "color.text.primary", "color.semantic.success", "color.semantic.warning", "color.semantic.danger", "color.semantic.info", "radius.lg", "elevation.4"],
    codeSnippet: `import { toast } from "sonner";

toast.success("Fee collected successfully!", {
  description: "Receipt RCP-2026-1001 issued.",
  action: { label: "View Receipt", onClick: () => router.push("/receipts/1001") },
});

toast.error("Payment failed", { description: "Idempotency-Key conflict." });`,
  },

  /* 24. Tooltip ----------------------------------------------------- */
  {
    name: "tooltip",
    displayName: "Tooltip",
    category: "Feedback",
    description:
      "Hover/focus-revealed label for icon-only buttons and truncated text. Wrap your app in <TooltipProvider> (or per-cluster) and use TooltipTrigger asChild.",
    variants: ["default"],
    states: ["closed", "open"],
    props: [
      { name: "children", type: "React.ReactNode (Trigger + Content)", default: "—", required: true, description: "TooltipTrigger (asChild) + TooltipContent." },
      { name: "defaultOpen", type: "boolean", default: "false", required: false, description: "Uncontrolled initial open state." },
      { name: "delayDuration", type: "number (ms)", default: "700", required: false, description: "Hover delay before showing." },
      { name: "side", type: "\"top\" | \"right\" | \"bottom\" | \"left\"", default: "\"top\"", required: false, description: "Preferred side — auto-flips on collision." },
    ],
    a11y: {
      role: "tooltip",
      ariaAttributes: ["aria-describedby (trigger → tooltip content id)"],
      keyboardInteractions: ["Hover → show after delayDuration", "Focus → show immediately", "Esc → dismiss", "Tab away → hide"],
    },
    tokens: ["color.neutral.900", "color.neutral.0", "radius.md", "elevation.2", "spacing.2"],
    codeSnippet: `import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="icon" aria-label="More info">
        <Info className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p className="text-caption">Visible to admins only</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>`,
  },

  /* 25. Skeleton ---------------------------------------------------- */
  {
    name: "skeleton",
    displayName: "Skeleton",
    category: "Feedback",
    description:
      "Loading placeholder with shimmer animation. Render with the same dimensions as the content it represents to avoid layout shift (CLS).",
    variants: ["text", "block", "circle"],
    states: ["loading"],
    props: [
      { name: "className", type: "string", default: "undefined", required: false, description: "Dimensions: h-4 w-full (text), h-32 w-full (block), h-10 w-10 rounded-full (avatar)." },
    ],
    a11y: {
      role: "status",
      ariaAttributes: ["aria-busy=\"true\" (on parent container)", "aria-live=\"polite\" (for sr announcements)"],
      keyboardInteractions: ["(none — non-interactive)"],
    },
    tokens: ["color.neutral.100", "color.neutral.200", "radius.md", "radius.full"],
    codeSnippet: `import { Skeleton } from "@/components/ui/skeleton";

<div className="w-full max-w-md space-y-2">
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-3/4" />
  <Skeleton className="h-10 w-full rounded-md" />
</div>`,
  },

  /* 26. EmptyState -------------------------------------------------- */
  {
    name: "empty-state",
    displayName: "EmptyState",
    category: "Layout",
    description:
      "Universal empty / loading / permission-denied state. Pairs with 5 lazy-loaded illustrations (students / fees / attendance / inventory / results). Per R3 lock-in, zero-permission users see this with a \"Request access\" CTA.",
    variants: ["students", "fees", "attendance", "inventory", "results", "generic"],
    states: ["default"],
    props: [
      { name: "illustration", type: "\"students\" | \"fees\" | \"attendance\" | \"inventory\" | \"results\" | \"generic\"", default: "\"generic\"", required: false, description: "Illustration key — each is a separate lazy-loaded SVG chunk." },
      { name: "title", type: "string", default: "—", required: true, description: "Headline message — short, action-oriented." },
      { name: "description", type: "string", default: "undefined", required: false, description: "Secondary line — usually 1 sentence." },
      { name: "action", type: "React.ReactNode", default: "undefined", required: false, description: "Optional CTA — usually a Button." },
      { name: "className", type: "string", default: "undefined", required: false, description: "Wrapper class." },
    ],
    a11y: {
      role: "region",
      ariaAttributes: ["aria-labelledby (when title has id)", "aria-label=\"empty state\" (fallback)"],
      keyboardInteractions: ["(none — non-interactive container)", "Action button is keyboard-focusable"],
    },
    tokens: ["color.surface.card", "color.border.default", "color.text.primary", "color.text.secondary", "color.primary.500", "radius.xl", "spacing.12"],
    codeSnippet: `import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

<EmptyState
  illustration="students"
  title="No students yet"
  description="Add your first student to get started."
  action={<Button size="sm"><Plus className="h-4 w-4" /> Add Student</Button>}
/>`,
  },

  /* 27. Alert ------------------------------------------------------- */
  {
    name: "alert",
    displayName: "Alert",
    category: "Layout",
    description:
      "Inline callout for context-aware messages. Four variants. Use for persistent (non-auto-dismiss) notices — for ephemeral feedback, use Toast.",
    variants: ["default", "success", "warning", "destructive"],
    states: ["default", "dismissed"],
    props: [
      { name: "variant", type: "\"default\" | \"destructive\" (extend for success/warning)", default: "\"default\"", required: false, description: "default = neutral; destructive = red. Success/warning via className tokens." },
      { name: "children", type: "React.ReactNode (AlertTitle + AlertDescription)", default: "—", required: true, description: "Compose AlertTitle + AlertDescription (and an optional leading icon)." },
      { name: "className", type: "string", default: "undefined", required: false, description: "Wrapper class." },
    ],
    a11y: {
      role: "alert",
      ariaAttributes: ["aria-live=\"polite\" (default)", "aria-live=\"assertive\" (destructive)"],
      keyboardInteractions: ["(none — non-interactive)", "Close button (when present) is keyboard-focusable"],
    },
    tokens: ["color.surface.card", "color.border.default", "color.primary.500", "color.semantic.success", "color.semantic.warning", "color.semantic.danger", "color.text.primary", "radius.lg"],
    codeSnippet: `import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

<Alert>
  <Info className="h-4 w-4" />
  <AlertTitle>Heads up</AlertTitle>
  <AlertDescription>
    This action will trigger an approval workflow per SRS §2.7.1.
  </AlertDescription>
</Alert>`,
  },

  /* 28. FilterBar --------------------------------------------------- */
  {
    name: "filter-bar",
    displayName: "FilterBar",
    category: "Layout",
    description:
      "Inline filter container for list headers. Tracks activeCount, renders Clear button when >0, and optional \"Save preset\" affordance for power users (P7).",
    variants: ["default", "withActiveCount", "withSavePreset"],
    states: ["empty", "active", "loading"],
    props: [
      { name: "children", type: "React.ReactNode (filter chips + selects)", default: "—", required: true, description: "Inline filter UI elements." },
      { name: "activeCount", type: "number", default: "0", required: false, description: "Number of active filters — shows badge + Clear button when >0." },
      { name: "onClear", type: "() => void", default: "—", required: false, description: "Clear-all handler." },
      { name: "onSavePreset", type: "() => void", default: "—", required: false, description: "Save current filters as a named preset." },
      { name: "className", type: "string", default: "undefined", required: false, description: "Wrapper class." },
    ],
    a11y: {
      role: "region",
      ariaAttributes: ["aria-label=\"filters\"", "aria-live=\"polite\" (announces count changes)"],
      keyboardInteractions: ["Tab → focus each child filter", "Enter → apply"],
    },
    tokens: ["color.surface.card", "color.border.default", "color.text.secondary", "color.primary.50", "color.primary.700", "radius.lg", "spacing.3"],
    codeSnippet: `import { FilterBar } from "@/components/ui/filter-bar";
import { Chip } from "@/components/ui/chip";

<FilterBar activeCount={2} onClear={() => reset()} onSavePreset={() => save()}>
  <Chip tone="primary" removable onRemove={() => {}}>Class 5</Chip>
  <Chip tone="accent" removable onRemove={() => {}}>Section A</Chip>
</FilterBar>`,
  },

  /* 29. FieldRow ---------------------------------------------------- */
  {
    name: "field-row",
    displayName: "FieldRow",
    category: "Layout",
    description:
      "Form layout primitive — stacks a label + input + helper/error in a consistent vertical or inline row. Used by every form in the app to enforce label-first (P1) disclosure.",
    variants: ["stacked", "inline"],
    states: ["default", "error", "disabled", "required"],
    props: [
      { name: "label", type: "string", default: "undefined", required: false, description: "Visible label text." },
      { name: "htmlFor", type: "string", default: "undefined", required: false, description: "Pair with the input's id — enables click-to-focus + screen reader name." },
      { name: "helper", type: "string", default: "undefined", required: false, description: "Helper text under the input." },
      { name: "error", type: "string", default: "undefined", required: false, description: "Error message — shown instead of helper when present." },
      { name: "required", type: "boolean", default: "false", required: false, description: "Shows a red asterisk next to the label." },
      { name: "layout", type: "\"stacked\" | \"inline\"", default: "\"stacked\"", required: false, description: "stacked = label above input; inline = label beside input (compact forms)." },
      { name: "children", type: "React.ReactNode", default: "—", required: true, description: "The input / control element." },
    ],
    a11y: {
      role: "group",
      ariaAttributes: ["aria-describedby (input → helper/error id)"],
      keyboardInteractions: ["(none — non-interactive container)", "Click label → focus paired input"],
    },
    tokens: ["color.text.primary", "color.text.secondary", "color.semantic.danger", "spacing.2", "spacing.4"],
    codeSnippet: `import { FieldRow } from "@/components/ui/field-row";
import { Input } from "@/components/ui/input";

<FieldRow
  label="Student Name"
  htmlFor="name"
  helper="As per birth certificate"
  required
>
  <Input id="name" placeholder="Ahmad Hossain" />
</FieldRow>`,
  },

  /* 30. Spinner ----------------------------------------------------- */
  {
    name: "spinner",
    displayName: "Spinner",
    category: "Feedback",
    description:
      "Animated loading indicator for inline (button-internal) or block (full-section) loading states. Built from tokens — no external SVG dependency.",
    variants: ["sm", "md", "lg"],
    states: ["loading"],
    props: [
      { name: "size", type: "\"sm\" | \"md\" | \"lg\"", default: "\"md\"", required: false, description: "sm = 16px, md = 24px, lg = 40px." },
      { name: "label", type: "string", default: "\"Loading…\"", required: false, description: "Screen-reader-only label." },
      { name: "className", type: "string", default: "undefined", required: false, description: "Wrapper class." },
    ],
    a11y: {
      role: "status",
      ariaAttributes: ["aria-live=\"polite\"", "aria-label (or visible text)"],
      keyboardInteractions: ["(none — non-interactive)"],
    },
    tokens: ["color.primary.500", "color.neutral.200", "motion.duration.normal", "motion.easing.standard"],
    codeSnippet: `<Spinner size="md" label="Loading students…" />`,
  },
];

/* ------------------------------------------------------------------ */
/*  Lookup helpers                                                     */
/* ------------------------------------------------------------------ */

export function getComponentByName(name: string): ComponentDefinition | undefined {
  return componentRegistry.find((c) => c.name === name);
}

export function getComponentsByCategory(category: ComponentCategory): ComponentDefinition[] {
  return componentRegistry.filter((c) => c.category === category);
}

export const CATEGORY_ORDER: ComponentCategory[] = [
  "Action",
  "Form",
  "Navigation",
  "Data",
  "Feedback",
  "Layout",
];
