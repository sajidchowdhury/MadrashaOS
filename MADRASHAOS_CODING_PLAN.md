# MadrashaOS — UI/UX Coding Implementation Plan

**From Design Documentation → Real, Working, Visible UI in the Browser**

| Field | Value |
|---|---|
| Document | `MADRASHAOS_CODING_PLAN.md` |
| Author Role | Lead UI/UX Engineer (Apple / Google / Tesla design heritage) |
| Audience | Frontend Developer, Project Manager, Client Authority |
| Source of Truth | `MadrashaOS_Session_1.1_Brand_Kit_Tokens.json` v1.0.0 (FROZEN) + Sessions 0.1–1.4 docs |
| Stack | Next.js 16 (App Router) · TypeScript 5 · Tailwind CSS 4 · shadcn/ui · Prisma · TanStack Query · Zustand · next-themes |
| Total Duration | ~7 weeks (8 coding phases, 32 sessions) |
| Golden Rule | **Every session ends with something the user can SEE and CLICK in the browser. No session is "documentation-only".** |

---

## 0. Purpose & Relationship to the Design Plan

The repository `sajidchowdhury/MadrashaOS` currently contains **only UI/UX design documentation** — Word docs, JSON tokens, Python generators. There is **zero application code**. The design plan (`MadrashaOS_UIUX_Implementation_Plan.md`) has 8 phases / 32 sessions; Phases 0 (Discovery) and 1 (Design System Foundation) are marked ✅ Done as **documentation**.

This new plan is the **coding mirror** of design Phases 2–7. It assumes the design system substrate (tokens, components, icons, personas, journeys, risk lock-ins, Do-Not-Do list) is already locked and **converts every remaining design session into a coding session that produces a visible, clickable artifact in the browser**.

> **Definition of Done for this plan:** after the final session, a user opening the `/` route sees a fully styled, role-switchable, trilingual (bn/en/ar with RTL), permission-aware Madrasha ERP shell with 40+ module screens, 5 role dashboards, mobile flows, branded PDF previews, and a public website — all running on mock data, ready for backend integration.

---

## 1. Governing Principles (carried over from Session 0.4 — LOCKED)

Every line of code in this plan must satisfy all 10 principles from Session 0.4:

| # | Principle | How it shows up in code |
|---|---|---|
| P1 | Progressive Disclosure | Surfaces only the role-relevant nav items; "More" drawer for advanced fields |
| P2 | One Primary Action per Screen | One `Button variant="primary"` per surface; rest go to overflow `Menu` |
| P3 | Mobile-First by Default | Every screen built at 375px first; `sm:`/`md:`/`lg:` enhance, never restructure |
| P4 | Permission-Aware UI | `<IfPermission code="fees.payment.create">` wrapper hides, never disables |
| P5 | Multi-Language First-Class | `next-intl` (or equivalent) with bn/en/ar message catalogs; RTL via `dir` attribute |
| P6 | WCAG 2.1 AA | `@radix-ui` primitives, focus-visible rings, `aria-*` everywhere, contrast ≥ 4.5:1 |
| P7 | Density Without Clutter | 8pt spacing scale; no off-grid values; whitespace > density |
| P8 | Optimistic UI for Mobile | TanStack Query `onMutate` for attendance/fee flows; idempotency-key header |
| P9 | Auditable by Default | Audit Explorer screen with field-diff viewer (mock data first) |
| P10 | Brand-Consistent Outputs | PDF templates use `primary.500` + `accent.DEFAULT` tokens — never unbranded |

**Hard constraints C1–C10 from Session 0.4 are non-negotiable** (≤3 clicks to core tasks, attendance <60s for 40 students, Zakat fund isolation in UI, etc.).

---

## 2. Mock-Data Strategy (Backend comes later per Handover Sequence)

Per the Handover Sequence document, the recommended order is **Designer → Backend → Frontend**. We are flipping the frontend ahead of backend **only for UI/UX validation**, using a strict mock-data layer so swapping to the real API is a one-file change.

- **Pattern:** TanStack Query hooks (`useStudents`, `useFeePlans`, etc.) call a `mockApi` module that returns seeded fixtures with artificial latency (300–800ms) so loading states are visible.
- **Swap path:** when the backend ships the OpenAPI 3.1 spec, replace `mockApi` with a generated client; zero component changes.
- **Seed data:** 3 branches, 8 users (1 per persona), 40 students, 4 classes, fee plans, ledger entries, attendance sessions — enough to populate every screen realistically.
- **State store:** Zustand for `currentRole`, `currentBranch`, `currentLanguage`, `permissions[]` — switchable from a dev toolbar so the same screen can be previewed across all 8 personas instantly.

---

## 3. Phase Map (Coding)

| Phase | Name | Sessions | Duration | Visible Result |
|---|---|---|---|---|
| **C0** | Foundation & Design System in Code | 0.1–0.4 | 3 days | Branded shell renders at `/` with tokens, fonts, theme toggle, RTL, dev toolbar |
| **C1** | Component Library in Code | 1.1–1.5 | 6 days | 30 components live in a `/dev/components` showcase gallery |
| **C2** | Information Architecture & Navigation | 2.1–2.4 | 5 days | Dynamic nav + 5 role dashboards + state system + permission matrix |
| **C3** | Core Module Screens (Foundation → Finance) | 3.1–3.4 | 8 days | 40+ module screens clickable, threaded by nav |
| **C4** | Operations, Communication & Mobile | 4.1–4.4 | 7 days | Operations modules + mobile attendance/marks/guardian portal |
| **C5** | Print/PDF & Public Website | 5.1–5.3 | 4 days | Branded PDFs downloadable + 7-page public site |
| **C6** | Prototype & Usability Validation | 6.1–6.3 | 4 days | 8-flow clickable prototype + role walkthroughs |
| **C7** | Design QA, Docs & Handoff | 7.1–7.4 | 3 days | Component docs + QA contract + responsive audit + sign-off |

**Total: ~40 working days → full workable UI/UX in the browser.**

---

## 3.5 Progress Tracker

> Auto-updated after each coding session. Status legend: ✅ Done · 🔄 In Progress · ⏳ Pending · ⛔ Blocked

| Phase | Session | Title | Status | Commit | Date | Deliverable |
|-------|---------|-------|--------|--------|------|-------------|
| C0 | 0.1 | Token Ingestion | ✅ Done | [`5141435`](https://github.com/sajidchowdhury/MadrashaOS/commit/5141435) | 2026-09-16 | `tokens.css` + `tokens.ts` + `globals.css` bridge + showcase `/` |
| C0 | 0.2 | Multi-Language Font Stack & RTL Pipeline | ✅ Done | [`5141435`](https://github.com/sajidchowdhury/MadrashaOS/commit/5141435) | 2026-09-16 | `i18n/` module + `DirectionalIcon` + Bangla/Arabic numeral formatters |
| C0 | 0.3 | Theme Provider & Global Shell Skeleton | ✅ Done | [`5141435`](https://github.com/sajidchowdhury/MadrashaOS/commit/5141435) | 2026-09-16 | `AppShell` + `TopBar` + `SideNav` + `Footer` + `DevToolbar` + next-themes |
| C0 | 0.4 | Mock-Data Layer & Seeding | ✅ Done | [`4696fd6`](https://github.com/sajidchowdhury/MadrashaOS/commit/4696fd6) | 2026-09-16 | Zustand store + 110+ permission codes + 8-persona role map + fixtures (40 students, 12 ledger entries, 4 attendance sessions) + mockApi + 16 TanStack Query hooks + `/dev/data` route |
| C1 | 1.1–1.5 | Component Library (30 components × 5 states) | ✅ Done | [`7ebf999`](https://github.com/sajidchowdhury/MadrashaOS/commit/7ebf999) | 2026-09-16 | 8 custom components (IconButton, ButtonGroup, NumberInput, DateInput, Chip, EmptyState, FilterBar, FieldRow) + 5 SVG illustrations + `/dev/components` showcase with all 30 components |
| C2 | 2.1 | Dynamic Nav Model (Permission-Aware) | ✅ Done | [`3904b7a`](https://github.com/sajidchowdhury/MadrashaOS/commit/3904b7a) | 2026-09-16 | `moduleTree.ts` (40+ modules, 8 groups) + SideNav rewired to `getVisibleModules()` |
| C2 | 2.2 | Five Role Dashboards | ✅ Done | [`3904b7a`](https://github.com/sajidchowdhury/MadrashaOS/commit/3904b7a) | 2026-09-16 | 12 widgets + 5 dashboards (authority/accountant/teacher/storekeeper/guardian) + role-redirect |
| C2 | 2.3 | State System | ✅ Done | [`3904b7a`](https://github.com/sajidchowdhury/MadrashaOS/commit/3904b7a) | 2026-09-16 | `LoadingState` (5 patterns) + `ErrorState` + `PermissionDenied` (Risk R3) + `OfflineState` |
| C2 | 2.4 | Permission-Aware UI Rules | ✅ Done | [`3904b7a`](https://github.com/sajidchowdhury/MadrashaOS/commit/3904b7a) | 2026-09-16 | `IfPermission` + `IfField` wrappers; QuickActions + Zakat KPI permission-gated |
| C3 | 3.1 | Foundation Module Screens | ✅ Done | [`a5eef1f`](https://github.com/sajidchowdhury/MadrashaOS/commit/a5eef1f) | 2026-09-16 | `/organization` + `/organization/modules` (Risk R2) + `/rbac` (D16) + `/audit` (52 events + field-diff viewer) |
| C3 | 3.2 | People Module Screens | ✅ Done | [`a5eef1f`](https://github.com/sajidchowdhury/MadrashaOS/commit/a5eef1f) | 2026-09-16 | `/students` + `/students/[id]` (7 tabs + Risk R4) + `/admission` (DnD Kanban) + `/teachers` |
| C3 | 3.3 | Academic Module Screens (Mobile-First) | ✅ Done | [`a5eef1f`](https://github.com/sajidchowdhury/MadrashaOS/commit/a5eef1f) | 2026-09-16 | `/attendance` + `/attendance/take` (mobile, Risk R6) + `/exams` + `/exams/[id]/marks` (swipe-next) |
| C3 | 3.4 | Finance Module Screens | ✅ Done | [`a5eef1f`](https://github.com/sajidchowdhury/MadrashaOS/commit/a5eef1f) | 2026-09-16 | `/fees` (3-step Collect Payment, Risk R8) + `/accounting` (Ledger Explorer) + `/zakat` (Risk R9) + `/donations` (Risk R10) |
| C4 | 4.1 | Global Shell Hi-Fi Polish + Mobile Shell | ✅ Done | [`ffa2853`](https://github.com/sajidchowdhury/MadrashaOS/commit/ffa2853) | 2026-09-16 | TopBar flyouts (notifications + user menu) + MobileBottomActionBar + `/dev/shell` breakpoint spec |
| C4 | 4.2 | Operations Modules | ✅ Done | [`ffa2853`](https://github.com/sajidchowdhury/MadrashaOS/commit/ffa2853) | 2026-09-16 | 8 routes: inventory/purchase/suppliers/assets/hostel/food/library/transport + KpiStat component |
| C4 | 4.3 | Communication & Documents & Reporting | ✅ Done | [`ffa2853`](https://github.com/sajidchowdhury/MadrashaOS/commit/ffa2853) | 2026-09-16 | `/notices` (Risk R11) + `/documents` (60MB validation) + `/reports` (finance-gated) + 7 components |
| C4 | 4.4 | Mobile Screens Hi-Fi | ✅ Done | [`ffa2853`](https://github.com/sajidchowdhury/MadrashaOS/commit/ffa2853) | 2026-09-16 | Guardian Portal mobile polish + MobileBottomActionBar + attendance/marks/fees CTA anchors |
| C5 | 5.1 | Branded PDF Templates | ✅ Done | [`b0ff14a`](https://github.com/sajidchowdhury/MadrashaOS/commit/b0ff14a) | 2026-09-16 | 6 templates (FeeReceipt/MarkSheet/ResultSheet/Certificate/LedgerStatement/OutstandingFeesReport) + `/dev/pdfs` showcase + trigger buttons on /fees, /accounting, /students |
| C5 | 5.2 | Public Website Templates | ✅ Done | [`b0ff14a`](https://github.com/sajidchowdhury/MadrashaOS/commit/b0ff14a) | 2026-09-16 | 7 public pages (home/programs/admission/notices/events/contact/donate) + PublicLayout + layout restructure (root → (app) + (public) groups) |
| C5 | 5.3 | Multi-Language Typography Validation | ✅ Done | [`b0ff14a`](https://github.com/sajidchowdhury/MadrashaOS/commit/b0ff14a) | 2026-09-16 | TypographyChecker component + `/dev/typography` route + `scripts/typography-audit.ts` (36 routes × 3 locales = 108 combos · 0 tofu) |
| C6 | 6.1–6.3 | Prototype & Usability Validation | ⏳ Pending | — | — | — |
| C7 | 7.1–7.4 | Design QA, Docs & Handoff | ⏳ Pending | — | — | — |

**Summary:** 21 / 32 sessions done · 0 in progress · 11 pending · 0 blocked

**Phase C0 (Foundation & Design System in Code): ✅ Complete** — 4/4 sessions done. Branded shell, trilingual i18n (bn/en/ar with RTL), next-themes, mock data layer (Zustand + 110+ permissions + 8-persona role map + fixtures), 16 TanStack Query hooks, `/dev/data` debug route.

**Phase C1 (Component Library in Code): ✅ Complete** — 30 components (8 custom + 22 shadcn inherited) × 5 states × a11y contracts. 5 empty-state illustrations. `/dev/components` showcase gallery live.

**Phase C2 (Information Architecture & Navigation): ✅ Complete** — 4/4 sessions done. Dynamic permission-aware nav (40+ modules filtered by role), 5 role dashboards with 12 widget types, 5-state system (empty/loading/error/permission-denied/offline), IfPermission/IfField wrappers. Verified: role switch via DevToolbar instantly updates nav + dashboard.

**Phase C3 (Core Module Screens): ✅ Complete** — 4/4 sessions done. 16 module routes across Foundation (Organization/Modules/RBAC/Audit Explorer), People (Students/Profile/Admission Kanban/Teachers), Academic (Attendance list + mobile Take Attendance/Exams/Marks Entry), Finance (Fees 3-step Collect Payment/Ledger Explorer/Zakat Dashboard/Donations). Risk lock-ins enforced: R2 (module dependents), R4 (promotion history), R6 (attendance mobile <60s + offline + undo), R8 (pending discounts), R9 (Zakat fund isolation), R10 (donation honeypot), D16 (no self-approve). All 16 routes HTTP 200; lint clean; VLM-verified.

**Phase C4 (Operations, Communication & Mobile): ✅ Complete** — 4/4 sessions done. 12 new routes: 8 operations (inventory/purchase Kanban/suppliers/assets/hostel floor plan/food/library/transport) + 3 communication (notices composer with Risk R11/documents/reports with finance gating) + `/dev/shell` responsive breakpoint spec. Shell polished: TopBar notification flyout + user menu flyout + MobileBottomActionBar on 3 key mobile routes. Guardian Portal mobile-polished (segmented child-switcher, sticky Pay Now, scrollable notices). All 12 routes HTTP 200; lint clean; VLM-verified.

**Phase C5 (Print/PDF & Public Website): ✅ Complete** — 3/3 sessions done. 6 branded PDF templates (FeeReceipt/MarkSheet/ResultSheet/Certificate/LedgerStatement/OutstandingFeesReport) with `/dev/pdfs` showcase + trigger buttons on /fees, /accounting, /students/[id]. 7-page public website (home/programs/admission/notices/events/contact/donate) with separate PublicLayout (no AppShell/DevToolbar). Layout restructured: root → (app) + (public) route groups. Typography audit: 36 routes × 3 locales = 108 combinations · 0 tofu · 3/3 formatters passed. Risk R13 (branded PDFs), R14 (Arabic glyphs), R10 (donation honeypot), C8 (public/protected route segregation) all enforced.

Next up: **Phase C6 (Prototype & Usability Validation)** — 8-flow clickable prototype + role walkthroughs + polish pass.

---

## 4. Phase C0 — Foundation & Design System in Code (3 days) ✅

### 0.1 — Token Ingestion

**Objective:** Convert the FROZEN `MadrashaOS_Session_1.1_Brand_Kit_Tokens.json` into consumable code artifacts.

**Inputs:**
- `MadrashaOS_Session_1.1_Brand_Kit_Tokens.json` (v1.0.0, frozen)
- Session 1.2 consumption rules R-T1 to R-T10 (binding)

**Coding deliverables:**
- `src/styles/tokens.css` — CSS custom properties for every color/spacing/radius/elevation/motion/breakpoint token (CSS variables, e.g. `--color-primary-500: #0E5C5C`)
- `tailwind.config.ts` — extended theme mapping `primary`, `accent`, `neutral`, `semantic` to the CSS variables; `fontFamily`, `spacing`, `borderRadius`, `boxShadow`, `transitionDuration` all token-driven
- `src/lib/tokens.ts` — typed token constants for use in TS (e.g. `export const tokens = { primary: { 500: '#0E5C5C' } } as const`)
- Consumption rule enforcer: ESLint rule `no-raw-hex` / `no-raw-px` (warns when raw values appear in `.tsx`)

**Exit criteria (visible):**
- `/` route renders a single card showing the brand palette swatches, type scale, and 8pt grid demo — using ONLY tokens, no raw values
- `bun run lint` passes with zero token-violation warnings

---

### 0.2 — Multi-Language Font Stack & RTL Pipeline

**Objective:** Implement the trilingual typography stack (Inter + Hind Siliguri + Noto Naskh Arabic + JetBrains Mono) with RTL support.

**Inputs:**
- Session 1.1 typography stack table (5 font families)
- Session 1.4 RTL icon mirroring rule

**Coding deliverables:**
- `next/font` self-hosted loading for Inter (variable), Hind Siliguri, Noto Naskh Arabic, JetBrains Mono
- CSS `:root { --font-bn; --font-en; --font-ar; --font-mono; --font-default }` cascading stack
- `src/lib/i18n.ts` — locale config (bn-BD, en-US, ar-SA); `dir` attribute toggles `rtl` for ar
- RTL CSS plugin (`tailwindcss-rtl` or logical properties `ps-*`/`pe-*`/`ms-*`/`me-*`)
- Directional-icon mirroring utility: `<Icon className="rtl:scale-x-[-1]" />` for `nav-chevron-*`, `nav-arrow-*`, `act-send`, `act-undo`, `act-redo`

**Exit criteria (visible):**
- `/` shows a paragraph rendering "Hello / আসসালামু আলাইকুম / السلام عليكم" with zero tofu (□)
- Language toggle button (bn/en/ar) re-renders text + flips layout to RTL in ar mode

---

### 0.3 — Theme Provider & Global Shell Skeleton

**Objective:** Stand up the responsive app shell (top bar + left nav + sticky footer) using next-themes and the locked tokens.

**Inputs:**
- Session 1.3 component #13 (Breadcrumb), #15 (Menu), #21 (Modal), #23 (Toast)
- SRS §5.1 global layout

**Coding deliverables:**
- `ThemeProvider` (next-themes) with `light` / `dark` / `system` — defaults match `neutral.0` / `neutral.950`
- `src/app/layout.tsx` — root layout: `<html dir={dir} lang={locale}>`, theme provider, font variables, query client provider, toast viewport
- `src/components/shell/AppShell.tsx` — `min-h-screen flex flex-col` with sticky header, collapsible left nav, `mt-auto` footer (per project UI rule)
- `src/components/shell/TopBar.tsx` — placeholder slots: logo, branch switcher, academic-year switcher, language switcher, notification bell, user menu
- `src/components/shell/SideNav.tsx` — collapsible left nav skeleton (items wired in 2.1)
- `src/components/shell/Footer.tsx` — sticky footer with version + language attribution
- `src/components/dev/DevToolbar.tsx` — floating toolbar (bottom-right) to switch role / branch / language / theme instantly

**Exit criteria (visible):**
- `/` shows the branded shell: deep-teal top bar, warm-neutral background, sticky footer at viewport bottom on short content, pushed down on long content
- Dev toolbar visible; clicking "Dark" toggles theme; clicking "عربى" flips to RTL

---

### 0.4 — Mock-Data Layer & Seeding

**Objective:** Build the mock API + Zustand session store so every downstream screen has realistic data on day one.

**Inputs:**
- Session 0.1 module taxonomy (40+ modules, primary users, primary actions)
- Session 0.2 personas (8 roles with permissions)

**Coding deliverables:**
- `src/lib/mock/fixtures/` — typed JSON fixtures: `organizations.json`, `branches.json`, `users.json` (8 personas), `students.json` (40), `classes.json` (4), `feePlans.json`, `ledgerEntries.json`, `attendanceSessions.json`, `inventoryItems.json`, `notices.json`, `approvals.json`
- `src/lib/mock/mockApi.ts` — async functions returning fixtures with 300–800ms artificial latency; throws simulated 403/500 for permission-denied tests
- `src/stores/sessionStore.ts` — Zustand: `{ role, branchId, academicYear, locale, theme, permissions[] }` with setters
- `src/lib/auth/permissions.ts` — permission-code catalog from SRS §6.2 (e.g. `fees.payment.create`, `students.notes.view`, `accounting.ledger.post`)
- `src/lib/query/client.ts` — TanStack Query client + `useQuery` wrappers (`useStudents`, `useFeePlans`, …) that call `mockApi` today, swap to OpenAPI client tomorrow

**Exit criteria (visible):**
- `/dev/data` route shows a debug table listing every fixture with row counts (e.g. "Students: 40, Ledger entries: 128")
- Dev toolbar role-switch updates `permissions[]` and the `/dev/data` view filters accordingly

---

## 5. Phase C1 — Component Library in Code (6 days) ✅

**Goal:** Build all 30 components from Session 1.3 spec sheet, each with 5 states, a11y contracts, and a live demo in `/dev/components`.

### 1.1 — Action Components

**Build:** Button (primary/secondary/ghost/danger/link × sm/md/lg × 5 states), ButtonGroup, IconButton

**Inputs:** Session 1.3 Tables 4 & 5 (Button variant + size matrix)

**Deliverables:**
- `src/components/ui/button.tsx` — uses `class-variance-authority`; references `button.primary.*` token aliases
- `src/components/ui/button-group.tsx`
- `src/components/ui/icon-button.tsx`
- Focus ring: `outline 2px solid var(--color-primary-500); offset 2px` (WCAG 2.4.7)

**Exit criteria:** `/dev/components/button` shows all 15 variant×size cells + 5 states hoverable.

---

### 1.2 — Form Components (8)

**Build:** TextInput, NumberInput (with stepper), DateInput (with Bangla calendar toggle), Select (single/multi/searchable/async), Textarea, Checkbox, RadioGroup, Switch

**Inputs:** Session 1.3 Tables 6 (Input state matrix), SRS §2.6.6 Bangla date format

**Deliverables:**
- All 8 form primitives in `src/components/ui/`
- Each ships with `label` (always visible), `helper`, `error` slots
- `DateInput` renders Bangla numerals when locale=bn (e.g. `১৬-০৯-২০২৬`)
- `Select` async variant loads from `mockApi` with debounce

**Exit criteria:** `/dev/components/forms` shows a fully validated sample form (login-style) with error/helper swapping per Session 1.3 Table 6.

---

### 1.3 — Navigation Components (4)

**Build:** Tabs, Breadcrumb, Pagination, Menu/Dropdown

**Inputs:** Session 1.3 #12–15

**Deliverables:**
- `tabs.tsx` (underline/pill/segmented variants; supports count badges)
- `breadcrumb.tsx` (collapsible on mobile)
- `pagination.tsx` (numbers + load-more variants; total count display)
- `menu.tsx` (multi-level with icons; Radix DropdownMenu)

**Exit criteria:** `/dev/components/nav` shows tab switching, breadcrumb collapse on mobile, pagination state, and a nested menu.

---

### 1.4 — Data + Feedback + Layout Components (15)

**Build:** Table, Badge, Chip, Avatar, Card, Modal, Drawer, Toast, Tooltip, Spinner, Skeleton, EmptyState, Alert, FilterBar, FieldRow

**Inputs:** Session 1.3 Table 7 (Table spec — the primary surface), Session 1.4 EmptyState pairing

**Deliverables:**
- `table.tsx` — sticky header, sortable columns, selectable rows, sticky horizontal scroll, density toggle (Comfortable 44px / Compact 32px), empty-state renders `<EmptyState>`, loading renders `<Skeleton>` rows
- `modal.tsx` + `drawer.tsx` — focus trap, Esc close, return focus to trigger
- `toast.tsx` — `sonner`-based; success/warning/danger/info variants
- `empty-state.tsx` — accepts `illustration` prop keyed to the 5 illustrations from Session 1.4 (E1–E5)
- `skeleton.tsx` — text/rect/circle/table-row variants
- `filter-bar.tsx` — inline/collapsible; save-preset affordance
- `field-row.tsx` — stacked/inline layout primitive

**Exit criteria:** `/dev/components/data` shows a populated 40-row student table with sorting, filtering, density toggle, pagination, and an empty-state variant.

---

### 1.5 — Iconography & Illustrations in Code

**Objective:** Wire the 200+ icon catalog from Session 1.4 into the codebase + ship the 5 empty-state illustrations.

**Inputs:** Session 1.4 Tables 3–17 (200+ icon names across 15 categories), Table 18 (5 illustrations)

**Deliverables:**
- `lucide-react` as the base icon set (covers ~80% of catalog)
- Custom SVG icons for module-specific names not in Lucide: `fin-taka`, `fin-zakat`, `msc-mosque`, `msc-quran`, `msc-kaaba`, `msc-bangladesh`, `bns-promote`, `bns-graduate`, `ops-hostel`, `ops-bed`, `ops-meal` — hand-drawn or AI-generated, 24×24 viewBox, 1.5px stroke, rounded caps
- `src/components/ui/icon.tsx` — single `<Icon name="fin-taka" />` API; RTL mirroring via `dir=rtl` selector
- 5 empty-state illustrations as inline SVG components in `src/components/illustrations/`:
  - `EmptyStudents.tsx` (E1), `EmptyFees.tsx` (E2), `EmptyAttendance.tsx` (E3), `EmptyInventory.tsx` (E4), `EmptyResults.tsx` (E5)
  - Each renders at 240×160, stroke = `currentColor` driven by tokens

**Exit criteria:** `/dev/components/icons` shows a searchable grid of all 200+ icons; clicking one copies its name. Each of the 5 illustrations renders in brand colors.

---

## 6. Phase C2 — Information Architecture & Navigation (5 days) ✅

### 2.1 — Dynamic Nav Model (Permission-Aware)

**Objective:** Build the left navigation that renders only enabled modules + permitted actions.

**Inputs:**
- Session 0.1 module taxonomy (40+ modules grouped Foundation/People/Academic/Finance/Operations/Communication/Platform)
- SRS §2.1.2 module configuration, §5.1 permission-aware UI
- Session 2.4 (design) permission-to-UI rule matrix

**Deliverables:**
- `src/lib/nav/moduleTree.ts` — typed tree of all 40+ modules, each with `{ id, label, icon, phase, permissionRequired, enabledByDefault }`
- `src/components/shell/SideNav.tsx` — filters tree by `sessionStore.permissions[]` AND `organization.enabledModules[]`; groups by layer (Foundation/People/Academic/…); collapses to icon-rail at <1024px; drawer at <768px
- `src/components/shell/BranchSwitcher.tsx` — implements Risk R1 lock-in: switching branch opens a fresh tab (visual: tab bar appears), current tab keeps context
- `src/components/shell/AcademicYearSwitcher.tsx` — same fresh-tab behavior
- `src/components/shell/LanguageSwitcher.tsx` — bn/en/ar toggle; persists to cookie

**Exit criteria (visible):**
- Log in as Teacher → left nav shows ONLY: Dashboard, My Classes, Take Attendance, Enter Marks, Notices, My Profile (financial/admin items hidden, not disabled)
- Log in as Accountant → nav shows: Dashboard, Fees, Accounting, Cash/Bank, Zakat, Donations, Reports, Approvals
- Switch branch → new tab opens; previous tab's filter context preserved

---

### 2.2 — Five Role Dashboards

**Objective:** Build the 5 dashboards from SRS §2.6.4 with 12 widget types.

**Inputs:**
- Session 0.2 personas (top-3 daily tasks per role)
- SRS §2.6.4 dashboard acceptance (Authority outstanding figure reconciles to Fee module)

**Deliverables:**
- `src/components/widgets/` — 12 widgets: KpiCard, PendingApprovals, OutstandingFees, LowStockAlert, AttendanceToday, RecentReceipts, QuickActions, ClassPerformance, GuardianChildren, TeacherClasses, AuditTimeline, ApprovalsQueue
- Each widget has `empty` / `loading` (Skeleton) / `error` / `permission-denied` states
- 5 dashboard pages:
  - `src/app/(app)/dashboard/authority/page.tsx` — KPIs + outstanding figure with "as of [timestamp]" + refresh (Risk R12)
  - `src/app/(app)/dashboard/accountant/page.tsx` — collect-fee quick action + recent receipts + pending approvals
  - `src/app/(app)/dashboard/teacher/page.tsx` — today's classes + take-attendance CTA
  - `src/app/(app)/dashboard/storekeeper/page.tsx` — low-stock + receive-stock CTA
  - `src/app/(app)/dashboard/guardian/page.tsx` — children overview with child-switcher (Risk R5)

**Exit criteria (visible):**
- Switch role via Dev Toolbar → dashboard re-renders with role-appropriate widgets
- Authority dashboard "Outstanding Fees" figure matches the Fees module total (mock data consistency check)
- Each widget shows skeleton → data transition when Dev Toolbar "Simulate slow network" is on

---

### 2.3 — State System (Empty / Loading / Error / Permission-Denied / Offline)

**Objective:** Implement the 30-spec state sheet from design Session 2.3 (6 states × 5 screen patterns).

**Inputs:**
- SRS §5.5 state requirements
- Session 0.3 Do-Not-Do D4 (no raw 403), D8 (no empty-dashboard dead-end)

**Deliverables:**
- `src/components/states/EmptyState.tsx` — generic; accepts illustration key + CTA
- `src/components/states/LoadingState.tsx` — page-level Skeleton patterns (list / detail / form / dashboard / table)
- `src/components/states/ErrorState.tsx` — friendly error with retry button + "contact admin" link
- `src/components/states/PermissionDenied.tsx` — friendly page (NOT raw 403) with "Request access" CTA + admin contact (Risk R3 lock-in)
- `src/components/states/OfflineState.tsx` — banner when `navigator.onLine === false`; queues optimistic mutations
- Copy library: `src/lib/i18n/states.{bn,en,ar}.ts` — localized strings for every state

**Exit criteria (visible):**
- `/dev/states` shows all 5 states for a sample list screen
- Trigger a 403 from Dev Toolbar → friendly permission-denied page renders, never a stack trace

---

### 2.4 — Permission-Aware UI Rules Matrix

**Objective:** Implement the field-level permission rules from design Session 2.4.

**Inputs:**
- SRS §5.1 "hide, don't disable"
- SRS §6.2 permission-code catalog

**Deliverables:**
- `src/components/auth/IfPermission.tsx` — `<IfPermission code="fees.payment.create" fallback={null}>` wrapper; renders children or fallback
- `src/components/auth/IfField.tsx` — field-level variant for `students.notes.view` etc.
- `src/lib/auth/permissions.ts` — full catalog (~150 codes from SRS §6.2)
- `src/components/auth/PermissionMatrix.tsx` — admin-only matrix editor (Roles × Permissions grid) for the RBAC screen
- ESLint rule: warn on `<button>` without `IfPermission` guard in financial/academic contexts

**Exit criteria (visible):**
- On Guardian dashboard, "Collect Fee" button is hidden (not greyed)
- On Teacher dashboard, "Outstanding Fees" widget is hidden
- Admin opens RBAC screen → interactive permission matrix grid renders

---

## 7. Phase C3 — Core Module Screens (8 days) ✅

> Each session produces list + detail + form screens for the module group. All screens consume the C1 component library, mock data from 0.4, and the dynamic nav from 2.1.

### 3.1 — Foundation Modules

**Modules:** Organization & Multi-Branch · Module Configuration · Users & Roles (RBAC) · Audit Trail · Security · Backup & Recovery (SRS §2.1)

**Key screens:**
- Organization list + branch editor (with `branch.scope` visual indicator)
- Module Configuration toggles — implements Risk R2 (dependent modules shown as chips; Save disabled until resolved)
- RBAC Permission Matrix editor (interactive grid; C7 enforced: requester cannot approve own request)
- **Audit Explorer** — timeline view with field-diff viewer (old → new highlighted, e.g. `20000 → 25000` by `accountant@` at `2026-09-16 14:32`)

**Exit criteria (visible):** Admin can toggle Hostel module off → dependent modules show as chips → Save blocked until user confirms; Audit Explorer shows 50+ seeded change events with diffs.

---

### 3.2 — People Modules

**Modules:** Student · Admission · Guardian · Teacher · Teacher Assignment · Employee (SRS §2.2)

**Key screens:**
- Student list (40 seeded) + Student Profile with 7 tabs (Personal / Academic / Guardians / Documents / Fees / Attendance / History) — Risk R4: Promotion Wizard shows history timeline panel on right
- **Admission Kanban** — drag-drop columns (Applied → Interviewed → Approved → Registered → Rejected); each card shows applicant photo + key fields
- Guardian Portal entry (mobile-first; child-switcher segmented control per Risk R5)
- Teacher Assignment grid (teacher × section × subject; duplicate-active-assignment blocked inline)

**Exit criteria (visible):** Walk through admission pipeline — drag a card from Applied → Approved → Registered → see new Student row appear in Student list with auto-created fee plan.

---

### 3.3 — Academic Modules (Mobile-First)

**Modules:** Academic Structure · Attendance · Examination · Results (SRS §2.3)

**Key screens:**
- Routine Builder — drag-drop grid (days × periods); double-booked teacher slot rejected inline
- **Take Attendance (mobile)** — default Present; one-tap cycle (Present → Absent → Late → Leave); sticky "Present all" + exception swipe; optimistic local state; 30s undo window; Idempotency-Key header on POST (Risk R6 lock-in)
- **Enter Marks (mobile)** — swipe-next between students; mark > full_marks rejected inline; publish locks paper
- Result Dashboard + printable Mark Sheet (preview only in this phase; branded PDF in Phase C5)

**Exit criteria (visible):**
- Take Attendance for 40 students completes in <60s on a 375px viewport (timed via Dev Toolbar)
- Network drop mid-submit (toggle offline in Dev Toolbar) → local state preserved, submits on reconnect
- Marks entry: enter 60 for a 50-mark paper → inline rejection

---

### 3.4 — Finance Modules

**Modules:** Fees · Scholarship & Discount · Accounting (GL) · Cash & Bank · Zakat · Donations (SRS §2.4)

**Key screens:**
- **Collect Payment flow (3-step)** — Step 1: search student → Step 2: select installment + amount + method + account → Step 3: confirm + receipt. Implements Risk R8 (pending discounts shown as striped rows), C6 (Zakat badge on every Zakat row), C7 (no self-approve)
- Ledger Explorer — running balance; debits ≠ credits rejected on submit
- Cash & Bank transfer — both legs post in one entry (visual confirmation)
- **Zakat Dashboard** — fund-isolated visualization; Zakat badge; non-Zakat accounts greyed out (Risk R9)
- Donation form — captures email OR mobile mandatory; anonymous checkbox; honeypot field (Risk R10)

**Exit criteria (visible):**
- Accountant completes fee collection in <90s (timed via Dev Toolbar)
- Submit an unbalanced ledger entry (debit 100, credit 90) → inline rejection
- Submit Zakat distribution > fund balance → inline rejection with fund badge visible

---

## 8. Phase C4 — Operations, Communication & Mobile (7 days) ✅

### 4.1 — Global Shell Hi-Fi Polish + Mobile Shell

**Objective:** Apply the design system to its fullest on the shell + establish mobile breakpoints.

**Deliverables:**
- Top bar: notification bell flyout (with unread count), user menu flyout (profile / settings / logout)
- Language switcher with all interaction states (bn/en/ar + RTL transition)
- Mobile shell at 375px: hamburger drawer nav, sticky bottom action bar on key screens
- Responsive breakpoint spec documented in `/dev/components/shell`

**Exit criteria (visible):** Resize browser 1440 → 1280 → 768 → 375 — layout adapts, no horizontal scroll at any width.

---

### 4.2 — Operations Modules

**Modules:** Inventory · Purchase · Supplier · Asset · Hostel · Food/Meal · Library · Transport (SRS §2.5)

**Key screens:**
- Inventory: receive/issue stock with qty validation (issue > stock rejected); low-stock alert widget on dashboard
- **Purchase Pipeline board** — Kanban (Draft → Pending Approval → Approved → Received → Paid)
- Supplier list with outstanding totals
- Asset transfer/dispose flow (disposed asset leaves register, keeps record)
- **Hostel Occupancy Map** — visual floor plan; occupied beds colored, available beds tappable
- Library circulation quick-scan (issue already-issued copy → rejected)
- Transport fuel/maintenance entry (posts to vehicle cost + expense)

**Exit criteria (visible):** Allocate an occupied bed → rejected with friendly error; issue an already-issued library book → rejected; record fuel ৳3000 → vehicle cost + expense both update.

---

### 4.3 — Communication & Documents & Reporting

**Modules:** Communication · Document Management · Reporting (SRS §2.6.1–2.6.3)

**Key screens:**
- Notice Composer with audience selector (Risk R11: live recipient-count chip updates as audience is selected; "Preview recipients" drawer)
- Notice list filtered by audience
- Document upload (60MB rejected; signed-URL expiry countdown)
- Reporting: filtered reports (Finance report totals reconcile to ledger; Teacher gets 403 → friendly permission-denied page)

**Exit criteria (visible):** Select "Class 5 guardians" as audience → count chip shows "12 recipients"; click "Preview recipients" → drawer lists them; upload 70MB file → rejected inline.

---

### 4.4 — Mobile Screens Hi-Fi

**Objective:** Deliver full mobile hi-fi for the 3 mobile-first workflows + Guardian Portal.

**Deliverables:**
- Mobile Attendance (full flow, hi-fi) — already started in 3.3; polish with brand-colored quick-toggles
- Mobile Marks Entry — swipe-next pattern; progress bar showing "12/40"
- Guardian Portal mobile — children overview, fees tab (pay now CTA), results tab, notices tab
- Responsive shell rules — breakpoint spec documented

**Exit criteria (visible):** All primary CRUD actions reachable on 375px width; Guardian Portal passes a manual walk-through (login → view child → see result → read notice).

---

## 9. Phase C5 — Print/PDF & Public Website (4 days) ✅

### 5.1 — Branded PDF Templates

**Objective:** Generate branded PDFs for receipts, mark sheets, certificates, reports.

**Inputs:**
- Session 1.1 brand kit (primary.500 + accent.DEFAULT + neutral.0)
- SRS §2.6.5 PDF requirements
- Risk R13 lock-in (no unbranded PDFs)

**Deliverables:**
- Use `@react-pdf/renderer` or `react-pdf` for client-side PDF generation (no backend dependency)
- Templates in `src/lib/pdf/templates/`:
  - `FeeReceipt.tsx` — bn/en/ar variants; branded header bar
  - `MarkSheet.tsx` — student + subjects + grades
  - `ResultSheet.tsx` — class-wide result sheet
  - `Certificate.tsx` (Phase 3 placeholder text)
  - `LedgerStatement.tsx` — running balance
  - `OutstandingFeesReport.tsx`
- PDF trigger buttons on Fee Receipt, Result, Ledger screens
- Arabic student name renders correctly (no tofu — Risk R14)

**Exit criteria (visible):** Click "Print Receipt" on Fee Payment success → branded PDF opens in new tab; Arabic name field renders correctly.

---

### 5.2 — Public Website Templates

**Objective:** Build the optional per-madrasha public site.

**Inputs:** SRS §2.7.3 (public cannot reach protected endpoints)

**Deliverables:**
- Routes (NOT under `/app` group, so no auth layout):
  - `/public/home`, `/public/programs`, `/public/admission`, `/public/notices`, `/public/events`, `/public/contact`, `/public/donate`
- CMS admin wireframe (content editors only) at `/app/website/content`
- Donation form with honeypot + reCAPTCHA v3 placeholder (Risk R10 + Risk R16)
- Route guard: any request to `/students`, `/accounts`, `/documents` from a public visitor → 401 (C8 enforced)

**Exit criteria (visible):** Open `/public/donate` → submit anonymous donation with email → branded PDF receipt downloads on confirmation screen.

---

### 5.3 — Multi-Language Typography Validation

**Objective:** Zero-tofu check across bn/en/ar on every screen and PDF.

**Deliverables:**
- Typography QA script: `scripts/typography-audit.ts` — walks every route, screenshots, scans for `□` characters
- Bangla date format validator (`১৬-০৯-২০২৬`)
- ৳ currency rendering validator

**Exit criteria (visible):** Audit script runs green; zero tofu across all screens + all 6 PDF templates × 3 languages.

---

## 10. Phase C6 — Prototype & Usability Validation (4 days)

### 6.1 — Interactive Prototype (8 Flows)

**Objective:** Link the key flows end-to-end so a user can click through without dead-ends.

**Flows:**
1. Login (any of 8 personas)
2. Take Attendance (Teacher, mobile)
3. Collect Fee Payment (Accountant)
4. Record Expense with approval routing (Accountant → Authority)
5. View Child Results (Guardian)
6. Approve Pending Request (Authority)
7. Admit a Student (Administrator)
8. Public Donation (anonymous visitor)

**Deliverables:**
- Each flow linked via real navigation (no prototype-only links)
- Seed data tuned so each flow has realistic starting state
- "Flow walkthrough" mode in Dev Toolbar: highlights the next CTA in the current flow

**Exit criteria (visible):** Walk all 8 flows end-to-end without hitting a dead-end or "TODO" placeholder.

---

### 6.2 — Role Walkthroughs with Seeded Data

**Objective:** Validate the 8 personas' top-3 daily tasks are reachable in ≤3 clicks (C1).

**Deliverables:**
- Walkthrough checklist document: 8 personas × 3 tasks = 24 task timings
- Lighthouse accessibility audit on every primary screen
- Manual a11y audit: keyboard-only navigation through 1 flow per role

**Exit criteria (visible):** Every persona's 3 daily tasks reachable in ≤3 clicks; Lighthouse a11y score ≥ 95 on all primary screens.

---

### 6.3 — Polish & Iteration

**Objective:** Fix any Blocker/Critical issues from 6.2; freeze the visual spec.

**Deliverables:**
- Issue log + fix commits
- Final visual polish pass: micro-interactions, hover states, focus rings, empty-state copy
- Performance pass: code-split heavy screens (Audit Explorer, Ledger), lazy-load illustrations

**Exit criteria (visible):** Zero Blocker/Critical issues; Lighthouse Performance ≥ 80 on primary screens.

---

## 11. Phase C7 — Design QA, Docs & Handoff (3 days)

### 7.1 — Component Documentation (Storybook-style)

**Objective:** Every component has living docs.

**Deliverables:**
- `/dev/components/[name]` page per component showing: variants, states, props table, a11y contract, token references, copy/paste code snippet
- Auto-generated props table from TypeScript types

**Exit criteria (visible):** `/dev/components` index lists all 30 components with green "documented" badges.

---

### 7.2 — Design QA Contract

**Objective:** Publish the binding 30-item QA checklist for future changes.

**Deliverables:**
- `docs/DESIGN_QA_CONTRACT.md` — 30 checklist items (token usage, contrast, focus rings, RTL, copy, empty states, etc.)
- ESLint rules enforcing the top 10 items at build time

**Exit criteria (visible):** Running `bun run lint` + `bun run qa:design` passes green on the entire codebase.

---

### 7.3 — Asset Library Export

**Objective:** Package the design assets for any future consumer.

**Deliverables:**
- `public/assets/icons/` — all 200+ SVGs (individual + `sprite.svg`)
- `public/assets/illustrations/` — 5 SVG illustrations
- `public/assets/brand/` — logo set (when client delivers), color palette PNG, favicon set
- `src/lib/pdf/templates/` — already shipped in 5.1; documented for backend PDF engine consumption

**Exit criteria (visible):** `/dev/assets` page lists every asset with preview + download link.

---

### 7.4 — Final Sign-Off & Responsive Audit

**Objective:** Final verification that the UI is fully workable.

**Deliverables:**
- Run Agent Browser (or equivalent) on `/` at 375 / 768 / 1280 / 1440 widths — verify sticky footer, no horizontal scroll, no console errors
- Walk all 8 flows at each width
- Verify Dev Toolbar role-switch updates nav + dashboard + permissions across all roles
- Verify bn/en/ar switch on 5 representative screens
- Sign-off document: `docs/UI_UX_SIGNOFF.md`

**Exit criteria (visible):**
- `/` route loads cleanly with no errors at every breakpoint
- All 8 flows complete end-to-end
- Every persona's dashboard renders with role-appropriate widgets
- Footer sticks to bottom on short pages, pushes down on long pages
- Zero unbranded PDFs anywhere in the app
- Zero tofu across bn/en/ar

---

## 12. Cumulative Visibility Checklist

After every phase, the user can SEE the following in the browser:

| After Phase | What's visible at `/` |
|---|---|
| C0 | Branded shell, tokens live, theme toggle, RTL, dev toolbar |
| C1 | + 30 components in `/dev/components` showcase |
| C2 | + Dynamic nav (role-aware) + 5 dashboards + 5 state types |
| C3 | + 40+ module screens threaded by nav (Foundation → Finance) |
| C4 | + Operations/Communication + mobile flows |
| C5 | + Branded PDFs + public website |
| C6 | + 8 clickable end-to-end flows + accessibility verified |
| C7 | + Component docs + QA contract + responsive audit pass → **FULL WORKABLE UI/UX** |

---

## 13. Risk Lock-Ins Carried Into Code (from Session 0.4)

| Risk | Lock-in | Coding session |
|---|---|---|
| R1 | Branch switch opens fresh tab; current tab keeps context | 2.1 |
| R3 | Empty-permission user sees "Request access" CTA, never blank | 2.3 + 2.4 |
| R6 | Attendance default-Present + one-tap + optimistic + 30s undo + Idempotency-Key | 3.3 |
| R10 | Anonymous donation captures email/mobile + PDF + honeypot + reCAPTCHA | 5.2 |
| R13 | Every PDF references primary.500 + accent.DEFAULT; zero unbranded PDFs | 5.1 |

---

## 14. Do-Not-Do List Enforcement (from Session 0.3)

The 20 anti-patterns (D1–D20) are enforced in code via:
- **ESLint custom rules** (D1: no module in nav unless enabled; D5: no hover-only interactions; D15: no missing font-family)
- **Runtime guards** (D16: requester cannot approve own request; D17: public cannot reach protected routes; D18: Zakat funds isolated)
- **Component contracts** (D8: EmptyState requires CTA on permission screens; D13: dashboard figures require "as of" timestamp)
- **QA checklist** (D9: attendance <60s for 40 students; D14: no unbranded PDFs)

---

## 15. What This Plan Does NOT Include (out of scope)

- **Backend implementation** — per Handover Sequence, backend comes after designer. This plan uses mock data; the swap path is documented in §2.
- **Real authentication** — mock auth via Dev Toolbar role-switch. Real NextAuth.js wiring is a backend-integration task.
- **Real database** — Prisma is available but unused in this phase. Schema design happens during backend integration.
- **Production deployment** — this plan delivers a dev-server-runnable UI; deployment is a separate concern.
- **Real-time features** — socket.io integration for live notifications is deferred to backend integration phase.

---

## 16. Next Step

**Begin Phase C0 Session 0.1 immediately.** The FROZEN token JSON is already in hand (`/tmp/MadrashaOS/download/MadrashaOS_Session_1.1_Brand_Kit_Tokens.json`). The first visible artifact — a branded palette card at `/` — should appear within the first 2 hours of coding.

After C0.4, the dev toolbar + mock data layer unlocks parallel work: C1 (components) can proceed while C2.1 (nav model) starts on a separate branch. From C3 onward, sessions can parallelize across module groups once the C1 component library is merged.

**Definition of success:** at the end of C7, a non-technical client authority can open `/`, switch to their role via the dev toolbar, walk through their top-3 daily tasks in ≤3 clicks each, view a branded PDF receipt, and toggle between Bangla / English / Arabic without breaking layout. That is the "full workable UI/UX" deliverable.
