# MadrashaOS — Design QA Contract (v1.0.0)

**Phase C7.2 · Task 7-b · Design QA Contract**

A binding 30-item checklist that every UI change in MadrashaOS must pass
before it can be merged. The list is organized into 6 categories of 5 items
each: **Token Usage**, **Contrast & Color**, **Focus & Keyboard**, **RTL &
Multi-Language**, **States & Empty States**, **Permission & Brand**.

| Field          | Value                                                       |
| -------------- | ----------------------------------------------------------- |
| Version        | 1.0.0                                                       |
| Phase          | C7.2 · Task 7-b                                             |
| Token source   | `MadrashaOS_Session_1.1_Brand_Kit_Tokens.json` (FROZEN)    |
| Audit script   | `scripts/design-qa.ts` (run via `bun run qa:design`)        |
| ESLint rule    | `madrasha/no-raw-tokens` (warns on raw hex/px in className) |
| Dashboard      | `/dev/qa`                                                   |
| Total items    | 30                                                          |
| Categories     | 6                                                           |

---

## How to read each item

Every item carries:

- **ID** — `QA-NN` (1–30). Used as the key in the audit script + the
  dashboard.
- **Category** — one of the 6 categories above.
- **Rule** — one sentence describing what is required.
- **How to check** — `automated` (run `bun run qa:design`), `manual`
  (visual + keyboard test on the live UI), or `mixed` (script flags
  candidates, manual confirms).
- **Pass / fail criteria** — the exact test the change must satisfy.

Status semantics:

- `pass` — verified in the live UI (manual) or zero violations (automated)
- `fail` — known gap (filed as a follow-up; PR cannot merge until fixed)
- `pending` — not yet verified (needs a manual pass)
- `n/a` — criterion does not apply to the change being reviewed

---

## 1. Token Usage (QA-01 → QA-05)

### QA-01 · No hardcoded hex colors in component code

- **Category:** Token Usage
- **Rule:** Components MUST NOT contain raw hex color values
  (e.g. `#0E5C5C`) — only the FROZEN tokens in
  `src/styles/tokens.css` and the PDF templates in
  `src/lib/pdf/templates/` may carry raw hex.
- **How to check:** `automated` — `bun run qa:design` scans every
  `.tsx` file under `src/components/` and `src/app/` for the regex
  `#[0-9a-fA-F]{3,8}` and reports `file:line:context`. Files under
  `src/styles/`, `src/lib/pdf/templates/`, `src/lib/design-system/`,
  and `scripts/` are excluded.
- **Pass criteria:** Zero raw hex occurrences in the scanned tree.
  ESLint rule `madrasha/no-raw-tokens` returns zero warnings.

### QA-02 · No hardcoded px values for spacing

- **Category:** Token Usage
- **Rule:** Spacing values (padding, margin, gap, width, height) MUST
  come from the FROZEN 8pt 14-step scale via Tailwind utilities
  (`p-4`, `gap-6`, `w-16`, etc.) — NOT from raw `Npx` strings in
  `className`.
- **How to check:** `automated` — `bun run qa:design` flags the
  regex `\b\d+px\b` inside `className="…"` attributes in component
  code. The token CSS files (`src/styles/tokens.css`) and PDF
  templates are exempt (they hold the raw values that define the
  scale).
- **Pass criteria:** Zero raw `Npx` occurrences inside `className`
  strings. Inline dynamic positioning (e.g. `style={{ top: rect.top }}`
  from `getBoundingClientRect`) is exempt — those are runtime
  measurements, not static design values.

### QA-03 · Font sizes come from the 6-step type scale

- **Category:** Token Usage
- **Rule:** Font sizes MUST be one of the 6 FROZEN type-scale steps
  (caption `12px` · body `14px` · subtitle `16px` · title `20px` ·
  headline `24px` · display `32px`). In-between values (e.g. `15px`,
  `text-[18px]`) are FORBIDDEN.
- **How to check:** `mixed` — script flags raw `text-[Npx]` and
  `text-[Nrem]` literals in component code; manual confirms the
  Tailwind utility classes used (`text-caption`, `text-body`,
  `text-subtitle`, `text-title`, `text-headline`, `text-display`).
- **Pass criteria:** Every visible text element uses a Tailwind
  utility class from the 6-step type scale; no `text-[Npx]`
  arbitrary-value classes exist in the scanned tree.

### QA-04 · Border-radius uses radius.\* tokens (no one-off corners)

- **Category:** Token Usage
- **Rule:** Corner radii MUST use one of the FROZEN radius tokens
  (`rounded-sm` 4px · `rounded-md` 6px · `rounded-lg` 8px ·
  `rounded-xl` 12px · `rounded-2xl` 16px · `rounded-full` 9999px).
  Arbitrary `rounded-[Npx]` classes are FORBIDDEN.
- **How to check:** `mixed` — script flags `rounded-[Npx]` in
  component code; manual confirms the radius utility class maps to
  the FROZEN scale.
- **Pass criteria:** Every corner uses a FROZEN radius utility; zero
  `rounded-[Npx]` arbitrary-value classes in the scanned tree.

### QA-05 · Shadows use elevation.\* tokens (no custom box-shadow strings)

- **Category:** Token Usage
- **Rule:** Shadows MUST come from the FROZEN 5-step elevation scale
  via `shadow-elevation-0` … `shadow-elevation-5`. Raw
  `shadow-[0_4px_…]` strings are FORBIDDEN.
- **How to check:** `mixed` — script flags `shadow-[` and inline
  `boxShadow:` literals in component code; manual confirms the
  elevation utility class is used.
- **Pass criteria:** Every elevated surface uses `shadow-elevation-N`;
  zero `shadow-[…]` arbitrary-value classes and zero inline
  `boxShadow` strings in the scanned tree.

---

## 2. Contrast & Color (QA-06 → QA-10)

### QA-06 · Text contrast ≥ 4.5:1 (WCAG AA)

- **Category:** Contrast & Color
- **Rule:** Body text + caption text against its surface MUST meet the
  WCAG 2.1 AA contrast ratio of 4.5:1 (3:1 for large text ≥18pt or
  ≥14pt bold).
- **How to check:** `manual` — open the live page in the browser and
  measure with the WAVE extension or Chrome DevTools "Contrast"
  inspector. Primary screens: `/dashboard/authority`, `/students`,
  `/fees`, `/audit`, `/notices`.
- **Pass criteria:** All text samples measure ≥4.5:1 on the surface
  they sit on. The FROZEN palette was tuned for AA in Session 1.1;
  `text-secondary` on `surface-canvas` measures 7.2:1.

### QA-07 · UI element contrast ≥ 3:1

- **Category:** Contrast & Color
- **Rule:** Non-text UI elements (icons, form-field borders, focus
  rings, chart strokes) MUST meet the WCAG 2.1 AA contrast ratio of
  3:1 against their adjacent color.
- **How to check:** `manual` — same tooling as QA-06. Pay special
  attention to the `border-border-default` hairlines on cards and
  the `border-border-strong` on inputs.
- **Pass criteria:** All non-text UI elements measure ≥3:1 against
  adjacent surfaces in both light AND dark mode.

### QA-08 · Semantic colors used for status (never raw red/green)

- **Category:** Contrast & Color
- **Rule:** Status indicators (success / warning / danger / info)
  MUST use the FROZEN semantic palette
  (`bg-success-50`, `text-semantic-success`, `bg-warning-50`,
  `text-semantic-warning`, `bg-danger-50`, `text-semantic-danger`,
  `bg-info-50`, `text-info`) — never raw `red-500` or `green-500`
  Tailwind classes.
- **How to check:** `mixed` — script flags `text-red-`, `bg-red-`,
  `text-green-`, `bg-green-`, `text-blue-`, `bg-blue-`,
  `text-yellow-`, `bg-yellow-` in component code; manual confirms
  the semantic class is used.
- **Pass criteria:** Zero Tailwind palette-based color classes
  (red/green/blue/yellow) in component code; every status uses a
  semantic token.

### QA-09 · Dark mode: all surfaces flip to dark neutrals; text still meets 4.5:1

- **Category:** Contrast & Color
- **Rule:** When `.dark` is on `<html>`, every surface token
  (`--color-surface-canvas`, `--color-surface-card`, `--color-surface-hover`,
  `--color-surface-selected`) MUST flip to a dark neutral from the
  FROZEN palette, and every text token MUST still meet 4.5:1 against
  the flipped surface.
- **How to check:** `manual` — toggle dark mode via the DevToolbar
  (or the `<ThemeToggle>` button) and visually inspect the same
  primary screens listed in QA-06.
- **Pass criteria:** No "white card on dark background" or
  "dark text on dark surface" failures in dark mode.

### QA-10 · Brand colors (primary teal + accent gold) used consistently

- **Category:** Contrast & Color
- **Rule:** The primary brand color (Deep Teal, `primary-500` `#0E5C5C`)
  is the only color permitted for primary CTAs, focus rings, and
  the TopBar background. The accent brand color (Warm Gold,
  `accent-500` `#C9A961`) is the only color permitted for the
  monogram, highlights, and celebratory moments (Flow Celebration,
  success receipts). No other hue may stand in.
- **How to check:** `manual` — visual scan of every primary CTA and
  every gold accent on the live UI.
- **Pass criteria:** Every primary action uses `bg-primary-500` (or a
  derived shade); every accent uses `bg-accent-500` (or a derived
  shade); no off-brand hue is used as a primary or accent.

---

## 3. Focus & Keyboard (QA-11 → QA-15)

### QA-11 · Every interactive element has a visible focus-visible ring

- **Category:** Focus & Keyboard
- **Rule:** Every Button, IconButton, link, input, tab, menu item,
  nav item, switch, and checkbox MUST show a visible focus ring
  when focused via keyboard. The FROZEN focus style is
  `2px solid var(--color-border-focus)` (`primary-500`) with a
  `2px` offset and `border-radius: var(--radius-sm)`.
- **How to check:** `manual` — Tab through the live page (no mouse).
  Look for the 2px teal ring on every interactive element. Primary
  screens: `/dashboard/authority`, `/students`, `/fees`, `/audit`,
  `/dev/walkthroughs`.
- **Pass criteria:** The global `:focus-visible` rule in
  `src/app/globals.css` covers every element; no interactive
  element is missed. shadcn/ui Button variant already includes
  `focus-visible:ring-[3px]` for the inner ring.

### QA-12 · Tab order is logical (no traps, no skipping)

- **Category:** Focus & Keyboard
- **Rule:** Tab order MUST follow the visual reading order
  (top-to-bottom, left-to-right in LTR; reversed in RTL). No
  keyboard traps (modals trap focus while open and return focus on
  close — Radix Dialog already handles this).
- **How to check:** `manual` — Tab through every primary screen and
  watch the focus ring move in a sensible order. Esc MUST release
  any open modal/drawer.
- **Pass criteria:** No out-of-order jumps, no traps, no dead
  controls (the Audit Explorer "Apply" button was previously a
  dead control — it was replaced with a passive "Live filter"
  chip in C6.2).

### QA-13 · Enter / Space activates buttons

- **Category:** Focus & Keyboard
- **Rule:** Every button MUST activate on both `Enter` and `Space`
  (the native `<button>` element does this for free; do not replace
  with `<div role="button">` unless you wire both keys explicitly).
- **How to check:** `manual` — Tab to a button, press Enter, then
  press Space. Both should trigger the same onClick.
- **Pass criteria:** Every clickable control uses a native
  `<button>` (or `<a>`) element OR explicitly handles Enter/Space.

### QA-14 · Esc closes modals / drawers

- **Category:** Focus & Keyboard
- **Rule:** Every Dialog, Sheet, Drawer, Popover, and DropdownMenu
  MUST close on `Esc`. Focus MUST return to the trigger element
  when the overlay closes.
- **How to check:** `manual` — open each Dialog/Sheet/Drawer on the
  live UI, press Esc, verify the overlay closes and the focus
  returns to the trigger.
- **Pass criteria:** Radix UI primitives handle this for free —
  every shadcn Dialog, Sheet, Drawer, Popover, and DropdownMenu
  closes on Esc and restores focus.

### QA-15 · Arrow keys navigate tabs / menus

- **Category:** Focus & Keyboard
- **Rule:** Tab UIs, menu bars, and radio groups MUST support arrow
  key navigation: Left/Right (or Up/Down) move the active item,
  Enter/Space activates it.
- **How to check:** `manual` — open any Tabs, Menubar, or RadioGroup
  on the live UI, use arrow keys to move between items, press Enter
  to activate.
- **Pass criteria:** Radix Tabs, Menubar, RadioGroup handle this for
  free — every shadcn component of these types supports arrow keys.

---

## 4. RTL & Multi-Language (QA-16 → QA-20)

### QA-16 · Logical properties (ps-/pe-/ms-/me-) used instead of physical

- **Category:** RTL & Multi-Language
- **Rule:** Padding and margin MUST use logical property utilities
  (`ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`, `text-start`,
  `text-end`) — NOT physical (`pl-`, `pr-`, `ml-`, `mr-`,
  `left-`, `right-`, `text-left`, `text-right`). The only
  exceptions are absolute-positioned overlays whose geometry is
  intentional in both directions.
- **How to check:** `mixed` — script flags `pl-`, `pr-`, `ml-`,
  `mr-`, `left-`, `right-`, `text-left`, `text-right` in component
  code; manual confirms the override is justified.
- **Pass criteria:** Zero physical-property utilities in component
  code (excluding justified overlays).

### QA-17 · Directional icons mirror in RTL via [dir=rtl] selector

- **Category:** RTL & Multi-Language
- **Rule:** Directional icons (chevron-left/right, arrow-left/right,
  send, undo, redo, reply, share) MUST mirror horizontally when
  `dir="rtl"`. The `<DirectionalIcon>` wrapper
  (`src/components/ui/directional-icon.tsx`) handles this via the
  `[dir="rtl"] [data-directional="true"] { transform: scaleX(-1); }`
  CSS rule + a runtime `dir === "rtl"` check for SSR safety.
- **How to check:** `manual` — switch to Arabic via the
  `<LanguageSwitcher>` and verify directional icons point the right
  way. Primary screens: `/dashboard/authority`, SideNav, TopBar,
  `/dev/walkthroughs`.
- **Pass criteria:** Every directional icon in the live UI mirrors
  correctly in Arabic; no `chevron-right` still pointing right.

### QA-18 · Bangla date format: ১৬-০৯-২০২৬

- **Category:** RTL & Multi-Language
- **Rule:** Dates rendered in the `bn-BD` locale MUST use the
  `dd-MM-yyyy` format with Bangla numerals (০-৯). The expected
  output for `2026-09-16` is `১৬-০৯-২০২৬`. Verified by
  `scripts/typography-audit.ts`.
- **How to check:** `automated` — `bun run audit:typography` runs
  the formatter check `formatDate(new Date(2026, 8, 16), "bn") === "১৬-০৯-২০২৬"`.
- **Pass criteria:** The formatter check passes; every visible date
  in the bn-BD locale renders with Bangla numerals in the
  `dd-MM-yyyy` format.

### QA-19 · Arabic numerals: ١٦-٠٩-٢٠٢٦

- **Category:** RTL & Multi-Language
- **Rule:** Dates rendered in the `ar-SA` locale MUST use the
  `dd-MM-yyyy` format with Arabic-Indic numerals (٠-٩). The
  expected output for `2026-09-16` is `١٦-٠٩-٢٠٢٦`. Verified by
  `scripts/typography-audit.ts`.
- **How to check:** `automated` — `bun run audit:typography` runs
  the formatter check `convertDigits("123", "ar") === "١٢٣"`.
- **Pass criteria:** The formatter check passes; every visible
  date and number in the ar-SA locale renders with Arabic-Indic
  numerals.

### QA-20 · Zero tofu (□) across bn/en/ar on all screens

- **Category:** RTL & Multi-Language
- **Rule:** No missing-glyph markers (`□` U+25A1, `�` U+FFFD,
  U+0000) may appear in the rendered HTML for any route × locale
  combination. The 4 next/font families (Inter, Hind Siliguri, Noto
  Naskh Arabic, JetBrains Mono) cover every script.
- **How to check:** `automated` — `bun run audit:typography` scans
  every route × locale combination (`/`, `/dashboard`, …, `/dev/data`)
  for tofu characters and reports hits with `route + locale + char +
  snippet`.
- **Pass criteria:** Zero tofu hits across the route × locale
  matrix.

---

## 5. States & Empty States (QA-21 → QA-25)

### QA-21 · Every data-fetching page shows LoadingState (skeleton) while loading

- **Category:** States & Empty States
- **Rule:** Every page that calls a `useXxx()` React Query hook MUST
  render `<LoadingState variant="table|detail|form|dashboard|list">`
  while `isLoading` is true. The LoadingState component carries
  `role="status"` + `aria-live="polite"` so screen readers announce
  content arrival.
- **How to check:** `manual` — open the page in the browser, throttle
  the network to "Slow 3G" in DevTools, and verify the skeleton
  renders before the data. Primary screens: `/students`, `/fees`,
  `/audit`, `/notices`, `/inventory`.
- **Pass criteria:** Every data-fetching page renders the
  LoadingState skeleton during the loading phase; no flash of
  empty content.

### QA-22 · Every list shows EmptyState when empty (never a blank table)

- **Category:** States & Empty States
- **Rule:** Every list / table view MUST render `<EmptyState>` with
  one of the 5 illustrations (EmptyStudents, EmptyFees,
  EmptyAttendance, EmptyInventory, EmptyResults) when the data is
  empty — NEVER a blank table or a "No data found" plain text.
- **How to check:** `manual` — clear the data via the dev toolbar or
  the mockApi (e.g. set role to one with no students) and verify
  the EmptyState illustration renders with a helpful headline +
  CTA.
- **Pass criteria:** Every list view renders the EmptyState with
  illustration + headline + CTA when the underlying data is empty.

### QA-23 · Every data-fetching page shows ErrorState with retry on error

- **Category:** States & Empty States
- **Rule:** Every page that calls a `useXxx()` React Query hook MUST
  render `<ErrorState>` with a "Try again" button when `isError`
  is true. The ErrorState component carries `role="alert"` so
  screen readers announce the failure.
- **How to check:** `manual` — set the DevToolbar network simulator
  to "Offline" and reload the page; verify the ErrorState renders
  with a "Try again" button that re-runs the query when clicked.
- **Pass criteria:** Every data-fetching page renders the
  ErrorState with a retry button when the underlying query errors
  out (network failure, 500, etc.).

### QA-24 · Permission-denied shows PermissionDenied component (never raw 403)

- **Category:** States & Empty States
- **Rule:** When a user lacks permission to view a resource, the
  page MUST render the `<PermissionDenied>` component (or hide the
  UI via `<IfPermission>`) — NEVER a raw `403 Forbidden` text or
  a broken page.
- **How to check:** `manual` — switch to a role without the
  required permission (e.g. Teacher on `/fees`) and verify the
  PermissionDenied component renders with a helpful message + a
  link back to the dashboard.
- **Pass criteria:** Every permission-denied scenario renders the
  PermissionDenied component; no raw 403 text anywhere.

### QA-25 · Dashboard figures show "as of [timestamp]" (Risk R12)

- **Category:** States & Empty States
- **Rule:** Every dashboard KPI / stat figure MUST show an
  "as of [timestamp]" caption that tells the user when the figure
  was last refreshed. This mitigates Risk R12 (stale figures
  presented as current).
- **How to check:** `manual` — open every dashboard
  (`/dashboard`, `/dashboard/authority`, `/dashboard/accountant`,
  `/dashboard/teacher`, `/dashboard/guardian`,
  `/dashboard/storekeeper`) and verify every KPI has an "as of"
  caption.
- **Pass criteria:** Every KPI on every dashboard shows an "as of"
  caption; no figure is presented without a freshness marker.

---

## 6. Permission & Brand (QA-26 → QA-30)

### QA-26 · IfPermission wraps hide unauthorized UI (never disabled)

- **Category:** Permission & Brand
- **Rule:** UI elements the current user lacks permission to use MUST
  be HIDDEN via `<IfPermission>` (or `hasPermission()` check) —
  NEVER shown in a disabled/greyed-out state. Disabled controls
  confuse users ("why can't I click this?") and violate WCAG 2.1
  SC 1.3.1 (information by structure).
- **How to check:** `manual` — switch to a role without the
  permission for an action (e.g. Teacher on the "Collect Payment"
  button in `/fees`) and verify the button is HIDDEN, not disabled.
- **Pass criteria:** Every permission-gated UI uses `<IfPermission>`
  or a `hasPermission()` check to hide unauthorized elements; no
  disabled-control anti-pattern.

### QA-27 · Teacher has no financial data visible (D3)

- **Category:** Permission & Brand
- **Rule:** Per design constraint D3, the Teacher persona MUST NOT
  see any financial data — fees, payments, accounts, ledger entries,
  or zakat fund balances. The role-permissions map
  (`src/lib/auth/role-permissions.ts`) excludes all financial
  permissions from the Teacher role.
- **How to check:** `manual` — switch to Teacher via the DevToolbar
  and verify that: (a) the SideNav hides Finance group items
  (Students guardians, Fees, Accounting, Zakat, Donations,
  Inventory, Suppliers, Assets, Purchase, Food, Transport,
  Hostel, Library — most are hidden); (b) `/fees`, `/accounting`,
  `/zakat` all render PermissionDenied; (c) the Teacher dashboard
  shows only academic widgets (no KPI for collections or expenses).
- **Pass criteria:** Teacher sees zero financial data — no nav
  items, no dashboard widgets, no accessible routes.

### QA-28 · Zakat fund isolation: badge on every Zakat row (C6/D18)

- **Category:** Permission & Brand
- **Rule:** Per design constraint C6/D18, the Zakat fund MUST be
  isolated from the general fund. Every Zakat-related row in the
  ledger / accounts / donations / disbursements views MUST carry a
  visible "Zakat" badge so reviewers can audit the fund in
  isolation.
- **How to check:** `manual` — open `/zakat`, `/accounting`, and
  `/donations` and verify every Zakat-tagged row carries the
  accent-gold "Zakat" badge.
- **Pass criteria:** Every Zakat row in the live UI carries a
  visible "Zakat" badge; the badge uses `bg-accent-500` /
  `text-accent-foreground` to distinguish from general-fund rows.

### QA-29 · PDFs use primary.500 + accent.DEFAULT (Risk R13)

- **Category:** Permission & Brand
- **Rule:** Per Risk R13, every generated PDF (Fee Receipt, Mark
  Sheet, Result Sheet, Outstanding Fees Report, Ledger Statement,
  Certificate) MUST use the FROZEN brand palette — the primary
  Deep Teal (`#0E5C5C`) for headers and the accent Warm Gold
  (`#C9A961`) for highlights and seals. NO PDF uses Tailwind's
  default blue or red.
- **How to check:** `mixed` — `bun run qa:design` exempts
  `src/lib/pdf/templates/` from the no-raw-hex rule (the templates
  need raw hex to feed `@react-pdf/renderer`'s `StyleSheet` which
  does not understand CSS variables); manual confirms every PDF
  template imports `primary` + `accent` from
  `src/lib/design-system/tokens.ts` and uses only those values.
- **Pass criteria:** Every PDF template uses only the FROZEN brand
  palette via the TS token constants; no off-brand hue appears in
  the generated PDF output.

### QA-30 · Public routes cannot reach protected endpoints (C8)

- **Category:** Permission & Brand
- **Rule:** Per design constraint C8, the public site
  (`/public/*` — Home, Programs, Admission, Notices, Events,
  Contact, Donate) MUST NOT be able to reach any protected
  back-office endpoint (`/dashboard/*`, `/students/*`, `/fees/*`,
  etc.). The route group separation `src/app/(public)/` vs
  `src/app/(app)/` enforces this; the mockApi additionally checks
  `hasPermission()` before returning data.
- **How to check:** `manual` — open `/public/donate` and verify the
  donation form submission does not leak any back-office data.
  Try navigating from `/public/...` to `/dashboard` — the route
  should redirect or render a permission-denied state, not a
  back-office screen.
- **Pass criteria:** Every public route is bounded to public data;
  every back-office route enforces `hasPermission()` on both
  client (IfPermission) and mockApi (server-equivalent) side.

---

## Automation summary

| Script                            | What it checks                               | Run with                              |
| --------------------------------- | -------------------------------------------- | ------------------------------------- |
| `scripts/design-qa.ts`            | Raw hex + raw px in component code (QA-01, QA-02) | `bun run qa:design`                |
| `scripts/typography-audit.ts`     | Zero tofu + Bangla/Arabic numeral formatters (QA-18, QA-19, QA-20) | `bun run audit:typography` |
| ESLint rule `madrasha/no-raw-tokens` | Raw hex + raw px in `className` attributes (QA-01, QA-02) | `bun run lint` |
| `/dev/qa` dashboard               | Interactive 30-item checklist + Run QA Audit button | open `/dev/qa` in browser      |

---

## Maintenance

- The contract is owned by the design system team (Phase C7+).
- Add new items only by appending to a category — never renumber
  existing IDs (they are referenced by the audit script + the
  dashboard).
- When a token file changes (it should not — the brand kit is
  FROZEN), update the contract version and re-run all 30 checks.

---

*End of MadrashaOS Design QA Contract v1.0.0 — Phase C7.2 · Task 7-b.*
