# MadrashaOS — UI/UX Implementation Plan

**Phase-by-Phase, Session-by-Session Plan to Deliver Build-Ready UI/UX**

| Field | Value |
|-------|-------|
| Document | MadrashaOS_UIUX_Implementation_Plan_TechnicalDoc_2026-09-16 |
| Source | MadrashaOS Implementation-Grade SRS v2.0 (2026-09-16) |
| Author Role | Lead UI/UX Designer (Apple / Google / Tesla design heritage) |
| Audience | Project Manager, Backend Lead, Frontend Lead, Client Authority |
| Total Duration | ~5.5 weeks (8 phases, 32 sessions) |

---

## 📊 Progress Tracker

> Auto-updated after each session. Status legend: ✅ Done · 🔄 In Progress · ⏳ Pending · ⛔ Blocked

| Phase | Session | Title | Status | Commit | Date | Deliverable |
|-------|---------|-------|--------|--------|------|-------------|
| 0 | 0.1 | SRS Deep-Read & Module Taxonomy | ✅ Done | [`ee5048d`](https://github.com/sajidchowdhury/MadrashaOS/commit/ee5048d) | 2026-09-16 | `MadrashaOS_Session_0.1_Module_Taxonomy_TechnicalDoc_2026-09-16.docx` |
| 0 | 0.2 | Personas & Role Journeys | ✅ Done | [`45d07c2`](https://github.com/sajidchowdhury/MadrashaOS/commit/45d07c2) | 2026-09-16 | `MadrashaOS_Session_0.2_Personas_Journeys_TechnicalDoc_2026-09-16.docx` |
| 0 | 0.3 | Heuristic Review of Competing ERPs | ✅ Done | [`c90c234`](https://github.com/sajidchowdhury/MadrashaOS/commit/c90c234) | 2026-09-16 | `MadrashaOS_Session_0.3_Heuristic_Review_TechnicalDoc_2026-09-16.docx` |
| 0 | 0.4 | Design Principles & Constraints Lock-In | ✅ Done | [`9949cf5`](https://github.com/sajidchowdhury/MadrashaOS/commit/9949cf5) | 2026-09-16 | `MadrashaOS_Session_0.4_Design_Principles_TechnicalDoc_2026-09-16.docx` |
| 1 | 1.1 | Brand Kit | ✅ Done | [`0720829`](https://github.com/sajidchowdhury/MadrashaOS/commit/0720829) | 2026-09-16 | `MadrashaOS_Session_1.1_Brand_Kit_TechnicalDoc_2026-09-16.docx` + `MadrashaOS_Session_1.1_Brand_Kit_Tokens.json` |
| 1 | 1.2 | Token System | ⏳ Pending | — | — | — |
| 1 | 1.3 | Component Library v0 | ⏳ Pending | — | — | — |
| 1 | 1.4 | Iconography & Illustration | ⏳ Pending | — | — | — |
| 2 | 2.1 | Module Taxonomy & Dynamic Nav Model | ⏳ Pending | — | — | — |
| 2 | 2.2 | Role-Based Dashboard Wireframes | ⏳ Pending | — | — | — |
| 2 | 2.3 | State System Spec | ⏳ Pending | — | — | — |
| 2 | 2.4 | Permission-Aware UI Rules | ⏳ Pending | — | — | — |
| 3 | 3.1 | Foundation Modules Wireframes | ⏳ Pending | — | — | — |
| 3 | 3.2 | People Modules Wireframes | ⏳ Pending | — | — | — |
| 3 | 3.3 | Academic Modules Wireframes (Mobile-First) | ⏳ Pending | — | — | — |
| 3 | 3.4 | Finance Modules Wireframes | ⏳ Pending | — | — | — |
| 4 | 4.1 | Global Shell & Navigation Hi-Fi | ⏳ Pending | — | — | — |
| 4 | 4.2 | Foundation Module Hi-Fi | ⏳ Pending | — | — | — |
| 4 | 4.3 | People & Academic Hi-Fi | ⏳ Pending | — | — | — |
| 4 | 4.4 | Finance & Operations Hi-Fi | ⏳ Pending | — | — | — |
| 4 | 4.5 | Dashboards Hi-Fi | ⏳ Pending | — | — | — |
| 4 | 4.6 | Mobile Screens Hi-Fi | ⏳ Pending | — | — | — |
| 5 | 5.1 | PDF Templates | ⏳ Pending | — | — | — |
| 5 | 5.2 | Public Website Templates | ⏳ Pending | — | — | — |
| 5 | 5.3 | Multi-Language Typography Validation | ⏳ Pending | — | — | — |
| 6 | 6.1 | Interactive Prototype | ⏳ Pending | — | — | — |
| 6 | 6.2 | Usability Tests with Role Reps | ⏳ Pending | — | — | — |
| 6 | 6.3 | Iteration & Final Spec | ⏳ Pending | — | — | — |
| 7 | 7.1 | Design Tokens Export | ⏳ Pending | — | — | — |
| 7 | 7.2 | Component Spec Sheet | ⏳ Pending | — | — | — |
| 7 | 7.3 | Asset Library & Icon Set | ⏳ Pending | — | — | — |
| 7 | 7.4 | Design QA Contract | ⏳ Pending | — | — | — |

**Summary:** 5 / 32 sessions done · 0 in progress · 27 pending · 0 blocked

**Phase 0 (Discovery & Foundations): ✅ Complete** — 4/4 sessions done.
**Phase 1 (Design System Foundation): 🔄 In Progress** — 1/4 sessions done (1.1 Brand Kit). Risk R13 resolved.

---

## 1. Overview

This document defines the complete plan for delivering a build-ready UI/UX for MadrashaOS, a multi-tenant, multi-branch Madrasha ERP with 40+ modules across Foundation, People, Academic, Finance, Operations, Communication, and Platform layers. The plan is organized into 8 phases and 32 sessions; each session has a single objective, named inputs, concrete deliverables, and explicit exit criteria. After Session 32, the frontend and backend developers receive a complete design system, hi-fi mockups, mobile prototypes, PDF templates, and a design-QA contract — sufficient to build the entire system without further design input.

Design principles: simplicity over feature-density (Apple), consistent and accessible components (Google Material, WCAG 2.1 AA per SRS §10.6), and minimal, task-focused surfaces (Tesla). The client constraint in SRS §10.8 — "not extremely complicated, not difficult for teachers or accountants, not dependent on one employee" — is the governing north star.

---

## 2. Phase Overview

| Phase | Name | Sessions | Duration |
|-------|------|----------|----------|
| 0 | Discovery & Foundations | 0.1–0.4 | 4 days |
| 1 | Design System Foundation | 1.1–1.4 | 5 days |
| 2 | Information Architecture & Navigation | 2.1–2.4 | 4 days |
| 3 | Core Flow Wireframes | 3.1–3.4 | 5 days |
| 4 | High-Fidelity Mockups | 4.1–4.6 | 8 days |
| 5 | Print/PDF & Branding | 5.1–5.3 | 3 days |
| 6 | Prototype & Usability Validation | 6.1–6.3 | 5 days |
| 7 | Design-to-Dev Handoff | 7.1–7.4 | 3 days |

---

## 3. Design Principles (Locked in Phase 0)

- **Progressive disclosure**: surface only what the role needs; hide advanced fields behind "More".
- **One primary action per screen**; secondary actions in an overflow menu (Apple pattern).
- **Mobile-first by default**; desktop is a wider grid, not a different paradigm.
- **Permission-aware UI**: hide, do not disable — server still enforces (SRS §5.1).
- **Bangla/English/Arabic first-class**; RTL pipelines validated in Phase 5.
- **WCAG 2.1 AA** contrast, keyboard navigation, screen-reader labels (SRS §10.6).
- **Density without clutter**: 8pt grid, 4:5 content-to-whitespace ratio on desktop.

---

## 4. Phase 0 — Discovery & Foundations (4 days)

### 0.1 — SRS Deep-Read & Module Taxonomy

*Objective:* Internalize every module spec, API, UI screen, and acceptance criterion in SRS v2.0.

**Inputs:**
- SRS Parts 2, 3, 5, 10, 11
- BRD v1.0
- Discovery notes on client pain points

**Deliverables:**
- Module taxonomy spreadsheet (40+ modules, grouped by Phase 0–3)
- Risk register of UX ambiguities

**Exit criteria:**
- Designer can recite each module's primary user, primary action, and acceptance test.

### 0.2 — Personas & Role Journeys

*Objective:* Define 8 personas (Super Admin, Authority, Administrator, Accountant, Teacher, Storekeeper, Guardian, Student) and their top-3 daily tasks.

**Inputs:**
- SRS §8.1 role definitions
- Client stakeholder interviews (2h)

**Deliverables:**
- Persona cards with photo, goals, frustrations, tech literacy
- Journey maps for: take-attendance, collect-fees, record-expense, view-child-results

**Exit criteria:**
- Client signs off the 8 personas and 4 journey maps.

### 0.3 — Heuristic Review of Competing Madrasha ERPs

*Objective:* Benchmark 3 existing madrasha/school ERPs against 10 usability heuristics to avoid their mistakes.

**Inputs:**
- Public demo links of 3 competing products

**Deliverables:**
- Heuristic scorecard with screenshots
- "Do-not-do" list of patterns to avoid

**Exit criteria:**
- Avoid-list pinned to design workspace.

### 0.4 — Design Principles & Constraints Lock-In

*Objective:* Convert discovery into binding design principles and measurable constraints.

**Inputs:**
- Outputs of 0.1–0.3
- SRS §10.8 client constraint

**Deliverables:**
- One-page design principles document (signed by client and PM)

**Exit criteria:**
- No design work begins in Phase 1 until this page is signed.

---

## 5. Phase 1 — Design System Foundation (5 days)

### 1.1 — Brand Kit

*Objective:* Resolve SRS §11.3 open item: logo, color palette, typography stack for bn/en/ar.

**Inputs:**
- Client brand assets (logo, preferred colors)
- SRS §2.6.6 language requirements

**Deliverables:**
- Logo set (full, monogram, favicon)
- Color tokens (primary, neutral, semantic)
- Typography stack: Bangla (e.g., Hind Siliguri), English (Inter), Arabic (Noto Naskh Arabic)

**Exit criteria:**
- Tokens exported as JSON + Figma variables.

### 1.2 — Token System

*Objective:* Establish spacing, type scale, elevation, motion, and grid tokens consumed by every component.

**Inputs:**
- 1.1 brand kit

**Deliverables:**
- 8pt spacing scale
- Type scale (caption→display, 6 steps)
- Elevation shadows (5 levels)
- Motion tokens (durations, easings)

**Exit criteria:**
- Tokens freeze; downstream components must reference tokens, never raw values.

### 1.3 — Component Library v0

*Objective:* Build the 30 atomic components used across all 40+ modules.

**Inputs:**
- 1.2 tokens
- SRS §5.2 design system requirements

**Deliverables:**
- Buttons (primary/secondary/ghost/danger, 3 sizes, 5 states)
- Inputs (text/number/date/select/textarea, with label/helper/error)
- Table (sortable, paginated, sticky header, row actions)
- Modal, Drawer, Toast, Tabs, Breadcrumb, Badge, Chip, Card, Skeleton, Empty state
- Form layout primitives (Section, FieldRow, FilterBar)

**Exit criteria:**
- Component spec sheet (props, states, variants) ready for frontend.

### 1.4 — Iconography & Illustration

*Objective:* Define a single icon set and 5 illustration styles for empty states.

**Inputs:**
- 1.1 brand kit

**Deliverables:**
- Icon set (200+ icons, 24/20/16 px, stroke-based, RTL-aware)
- 5 empty-state illustrations (students, fees, attendance, inventory, results)

**Exit criteria:**
- Icon font + SVG sprite generated.

---

## 6. Phase 2 — Information Architecture & Navigation (4 days)

### 2.1 — Module Taxonomy & Dynamic Nav Model

*Objective:* Design the left navigation that renders only enabled modules (SRS §2.1.2, §5.1).

**Inputs:**
- SRS §2.1.2 module configuration
- SRS §5.1 global layout

**Deliverables:**
- Information architecture tree (3 levels max)
- Dynamic nav component spec (driven by enabled-modules + permissions)
- Mobile drawer variant

**Exit criteria:**
- IA validated by card-sort with 5 madrasha staff members.

### 2.2 — Role-Based Dashboard Wireframes

*Objective:* Wireframe the 5 dashboards defined in SRS §2.6.4.

**Inputs:**
- SRS §2.6.4
- 0.2 personas

**Deliverables:**
- Authority, Accountant, Teacher, Storekeeper, Guardian dashboard wireframes
- Widget inventory (12 widget types, each with empty/loading/error)

**Exit criteria:**
- Each dashboard fits on a 1280-wide canvas without horizontal scroll.

### 2.3 — State System Spec

*Objective:* Define empty, loading, error, permission-denied, and offline states for every screen pattern.

**Inputs:**
- SRS §5.5

**Deliverables:**
- State spec sheet (6 states × 5 screen patterns = 30 specs)
- Copy library in bn + en for each state

**Exit criteria:**
- Frontend can implement states without further design input.

### 2.4 — Permission-Aware UI Rules

*Objective:* Translate SRS §5.1 ("hide, don't disable") into per-component rules.

**Inputs:**
- SRS §5.1
- SRS §6.2 permission-code list

**Deliverables:**
- Permission-to-UI rule matrix (e.g., `fees.payment.create` → show Collect Payment button)
- Field-level permission rules (e.g., `students.notes.view` → render `special_notes`)

**Exit criteria:**
- Matrix reviewed and signed by backend lead.

---

## 7. Phase 3 — Core Flow Wireframes (5 days)

### 3.1 — Foundation Modules Wireframes

*Objective:* Wireframe Organization, Module Config, RBAC, Audit, Security, Backup (SRS §2.1).

**Inputs:**
- SRS §2.1.1–2.1.6
- 1.3 component library v0

**Deliverables:**
- 12 wireframes (list + detail + form per module)
- Audit Explorer timeline wireframe (key differentiator)

**Exit criteria:**
- Wireframes pass cognitive walk-through with 1 accountant + 1 admin.

### 3.2 — People Modules Wireframes

*Objective:* Wireframe Student, Admission, Guardian, Teacher, Assignment, Employee (SRS §2.2).

**Inputs:**
- SRS §2.2.1–2.2.6

**Deliverables:**
- 15 wireframes incl. Admission Kanban + Student Profile (7 tabs) + Promotion Wizard
- Guardian Portal mobile wireframe

**Exit criteria:**
- All persona top-3 tasks reachable in ≤3 clicks (SRS §10.8).

### 3.3 — Academic Modules Wireframes (Mobile-First)

*Objective:* Wireframe Academic Structure, Attendance, Examination, Results (SRS §2.3).

**Inputs:**
- SRS §2.3.1–2.3.4
- SRS §5.4 mobile considerations

**Deliverables:**
- Routine Builder wireframe (drag-drop grid)
- Take-Attendance mobile wireframe (default Present, one-tap cycle)
- Marks Entry mobile wireframe (swipe-next)
- Result Dashboard + printable Mark Sheet wireframe

**Exit criteria:**
- Take-Attendance flow steps ≤6 taps for a 40-student class.

### 3.4 — Finance Modules Wireframes

*Objective:* Wireframe Fees, Scholarship, Accounting, Cash/Bank, Zakat, Donations (SRS §2.4).

**Inputs:**
- SRS §2.4.1–2.4.6
- SRS §3.6 Golden Flow

**Deliverables:**
- Collect Payment flow wireframe (3 steps, mobile-friendly)
- Ledger Explorer with running balance
- Zakat dashboard (fund-isolated visualization)
- Outstanding Fees report wireframe

**Exit criteria:**
- Accountant validates the 3-step payment flow in <90s.

---

## 8. Phase 4 — High-Fidelity Mockups (8 days)

### 4.1 — Global Shell & Navigation Hi-Fi

*Objective:* Apply design system to the shell: top bar, left nav, breadcrumb, page header, footer.

**Inputs:**
- 1.x design system
- 2.x IA

**Deliverables:**
- Desktop shell (1440 + 1280 breakpoints)
- Mobile shell (375 + 768 breakpoints)
- Language switcher interaction states (bn/en/ar + RTL)
- Notification bell + user menu flyouts

**Exit criteria:**
- Shell signed off by client; becomes the visual template for all modules.

### 4.2 — Foundation Module Hi-Fi

*Objective:* Convert foundation wireframes to hi-fi.

**Inputs:**
- 3.1 wireframes
- 4.1 shell

**Deliverables:**
- 12 hi-fi screens
- Roles & Permissions matrix editor (interactive grid)
- Audit Explorer with field-diff viewer (old → new highlighted)

**Exit criteria:**
- Screens meet WCAG 2.1 AA contrast.

### 4.3 — People & Academic Hi-Fi

*Objective:* Convert people + academic wireframes to hi-fi.

**Inputs:**
- 3.2, 3.3 wireframes

**Deliverables:**
- 15 people screens + 12 academic screens
- Student Profile tabbed interface (Personal/Academic/Guardians/Documents/Fees/Attendance/History)
- Admission Kanban with drag-drop columns
- Attendance mobile quick-toggles in brand colors

**Exit criteria:**
- Teacher persona completes take-attendance in ≤60s on a 5-inch phone (SRS §2.3.2).

### 4.4 — Finance & Operations Hi-Fi

*Objective:* Convert finance + operations wireframes to hi-fi.

**Inputs:**
- 3.4 wireframes
- SRS §2.5 operations

**Deliverables:**
- 18 finance + 16 operations screens
- Purchase Pipeline board
- Hostel Occupancy Map (visual floor plan)
- Library circulation quick-scan screen

**Exit criteria:**
- Accountant completes expense entry in ≤30s.

### 4.5 — Dashboards Hi-Fi

*Objective:* Apply design system to all 5 role dashboards.

**Inputs:**
- 2.2 dashboard wireframes

**Deliverables:**
- 5 hi-fi dashboards with 12 styled widgets
- Pending Approvals widget (cross-link to Approval module)
- Low-stock + outstanding-fees alert widgets

**Exit criteria:**
- Authority dashboard's outstanding figure reconciles to Fee module (SRS §2.6.4 acceptance).

### 4.6 — Mobile Screens Hi-Fi

*Objective:* Deliver mobile hi-fi for the 3 mobile-first workflows + guardian portal.

**Inputs:**
- 3.3, 4.3 mobile wireframes
- SRS §5.4

**Deliverables:**
- Mobile attendance (full flow, hi-fi)
- Mobile marks entry (swipe-next pattern)
- Guardian Portal mobile (children overview, fees, results, notices)
- Responsive shell rules (breakpoint spec)

**Exit criteria:**
- All primary CRUD actions reachable on a 5-inch phone (SRS §2.7.4).

---

## 9. Phase 5 — Print/PDF & Branding (3 days)

### 5.1 — PDF Templates

*Objective:* Design branded PDF templates for receipts, mark sheets, result sheets, certificates.

**Inputs:**
- SRS §2.6.5
- 1.1 brand kit

**Deliverables:**
- Fee receipt template (bn + en + ar)
- Mark sheet + Result sheet templates
- Certificate template (Phase 3 placeholder)
- Ledger statement + Outstanding report templates

**Exit criteria:**
- Arabic student name renders correctly on admission form PDF (SRS §2.6.5 acceptance).

### 5.2 — Public Website Templates

*Objective:* Design the optional public-facing site per madrasha (SRS §2.7.3).

**Inputs:**
- SRS §2.7.3

**Deliverables:**
- Home, Programs, Admission, Notices, Events, Contact, Donate templates
- CMS admin wireframe for content editors

**Exit criteria:**
- Public visitor cannot reach any `/students`, `/accounts`, `/documents` endpoint (validated by backend).

### 5.3 — Multi-Language Typography Validation

*Objective:* Validate bn/en/ar rendering across all screens and PDFs.

**Inputs:**
- 5.1, 5.2 templates
- 1.1 typography stack

**Deliverables:**
- Typography QA report (line-height, fallback fonts, RTL direction)
- Bangla date format (e.g., ১৬-০৯-২০২৬) validated

**Exit criteria:**
- Zero tofu (missing-glyph squares) across bn/en/ar.

---

## 10. Phase 6 — Prototype & Usability Validation (5 days)

### 6.1 — Interactive Prototype

*Objective:* Link key flows in Figma: login → take-attendance → collect-fee → view-result → guardian-portal.

**Inputs:**
- Phase 4 mockups

**Deliverables:**
- Clickable Figma prototype (8 flows)
- Prototype seeded with representative madrasha data

**Exit criteria:**
- Prototype plays end-to-end without dead-ends.

### 6.2 — Usability Tests with Role Representatives

*Objective:* Run 5 moderated sessions (1 per role: Authority, Admin, Accountant, Teacher, Guardian).

**Inputs:**
- 6.1 prototype

**Deliverables:**
- Test script per role (top-3 tasks each)
- Recording + observation notes
- Issue log with severity (Blocker/Critical/Major/Minor per SRS §8.4)

**Exit criteria:**
- Blocker + Critical issues = 0 before handoff.

### 6.3 — Iteration & Final Spec

*Objective:* Fix Blockers/Criticals; freeze the design spec for handoff.

**Inputs:**
- 6.2 issue log

**Deliverables:**
- Updated mockups (Blocker/Critical fixed)
- Design spec document (component states, interaction notes, copy)
- Design QA checklist for frontend

**Exit criteria:**
- Spec frozen; further changes go through change-request process.

---

## 11. Phase 7 — Design-to-Dev Handoff (3 days)

### 7.1 — Design Tokens Export

*Objective:* Export tokens in formats consumable by frontend (CSS variables, TypeScript, Figma variables).

**Inputs:**
- 1.2 token system

**Deliverables:**
- `tokens.css`, `tokens.ts`, `tokens.json`
- Tailwind config preset (if frontend uses Tailwind)

**Exit criteria:**
- Frontend imports tokens without manual mapping.

### 7.2 — Component Spec Sheet

*Objective:* Publish per-component spec: props, variants, states, accessibility roles, copy.

**Inputs:**
- 1.3 component library
- 6.3 final spec

**Deliverables:**
- Component spec sheet (30 components × ~8 fields)
- Storybook-ready MDX documentation

**Exit criteria:**
- Frontend can build each component without re-asking the designer.

### 7.3 — Asset Library & Icon Set

*Objective:* Package icons, illustrations, logos, and PDF templates for dev consumption.

**Inputs:**
- 1.1 brand kit
- 1.4 icons
- 5.1 PDF templates

**Deliverables:**
- Asset ZIP (SVG + optimized PNG + WebP)
- PDF template HTML/PDF samples for backend PDF engine
- Favicon + app-icon set

**Exit criteria:**
- Backend PDF engine can ingest templates and render branded output.

### 7.4 — Design QA Contract

*Objective:* Define how design QA works during frontend build (visual review cadence, sign-off rules).

**Inputs:**
- 6.3 final spec

**Deliverables:**
- Design QA checklist (30 items)
- Review cadence (per-PR visual review, weekly holistic review)
- Sign-off rule: screen not "done" until designer approves

**Exit criteria:**
- Contract signed by designer, frontend lead, PM.

---

## 12. Handoff Deliverables (End of Phase 7)

After Session 30, the backend and frontend developers receive the following complete, build-ready package. No further design input is required for Phase 0–2 implementation:

| Deliverable | Source |
|-------------|--------|
| Design tokens | CSS + TS + JSON + Tailwind preset (Session 7.1) |
| Component library | 30 components, spec sheet, MDX docs (Session 7.2) |
| Hi-fi mockups | 70+ screens covering all 40+ modules (Phase 4) |
| Mobile prototypes | Attendance, marks entry, guardian portal (Session 4.6) |
| PDF/print templates | Receipts, mark sheets, certificates, reports (Session 5.1) |
| Public website templates | 7 pages + CMS admin (Session 5.2) |
| Design QA contract | Per-PR review rules + sign-off process (Session 7.4) |
| Multi-language assets | bn/en/ar validated, RTL pipelines confirmed (Session 5.3) |

---

## 13. Next Step

Kick off Phase 0 Session 0.1 immediately. The SRS is already in hand; stakeholder interviews (Session 0.2) require the client to schedule 2 hours with one representative per role. Once Phase 0 ends with the signed design-principles page, the designer works independently through Phases 1–7 and re-engages the client only at: Phase 4 sign-off (shell + dashboards), Phase 6 usability tests, and Phase 7 handoff. This plan closes the open visual-design item in SRS §11.3 and produces a UI/UX that the backend and frontend developers can build against without further design iteration.
