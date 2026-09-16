"""
MadrashaOS UI/UX Implementation Plan - Technical Documentation
Author persona: Senior UI/UX Designer (Apple / Google / Tesla background)
Output: .docx via python-docx
"""
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

OUTPUT = "/home/z/my-project/download/MadrashaOS_UIUX_Implementation_Plan_TechnicalDoc_2026-09-16.docx"

# ---------- Helpers ----------

def set_cell_bg(cell, hex_color):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), hex_color)
    tc_pr.append(shd)


def set_table_borders(table):
    tbl_pr = table._tbl.tblPr
    borders = OxmlElement('w:tblBorders')
    for edge in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        e = OxmlElement(f'w:{edge}')
        e.set(qn('w:val'), 'single')
        e.set(qn('w:sz'), '6')
        e.set(qn('w:space'), '0')
        e.set(qn('w:color'), 'BFBFBF')
        borders.append(e)
    tbl_pr.append(borders)


def set_cell_margins(cell, top=60, bottom=60, left=100, right=100):
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = OxmlElement('w:tcMar')
    for name, val in (('top', top), ('left', left), ('bottom', bottom), ('right', right)):
        m = OxmlElement(f'w:{name}')
        m.set(qn('w:w'), str(val))
        m.set(qn('w:type'), 'dxa')
        tc_mar.append(m)
    tc_pr.append(tc_mar)


def add_heading(doc, text, level):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14 if level == 1 else 10)
    p.paragraph_format.space_after = Pt(6)
    run = p.add_run(text)
    run.bold = True
    if level == 1:
        run.font.size = Pt(16)
        run.font.color.rgb = RGBColor(0x1F, 0x3A, 0x5F)
    elif level == 2:
        run.font.size = Pt(13)
        run.font.color.rgb = RGBColor(0x1F, 0x3A, 0x5F)
    else:
        run.font.size = Pt(11.5)
        run.font.color.rgb = RGBColor(0x33, 0x33, 0x33)
    return p


def add_para(doc, text, italic=False, size=11):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    p.paragraph_format.line_spacing = 1.3
    run = p.add_run(text)
    run.font.size = Pt(size)
    run.italic = italic
    return p


def add_bullet(doc, text, level=0):
    p = doc.add_paragraph(style='List Bullet' if level == 0 else 'List Bullet 2')
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.2
    if p.runs:
        p.runs[0].text = ''
    r = p.add_run(text)
    r.font.size = Pt(11)
    return p


def add_session_block(doc, session_id, title, objective, inputs, deliverables, exit_criteria):
    add_heading(doc, f"{session_id} — {title}", 3)
    add_para(doc, f"Objective: {objective}", italic=True)
    add_para(doc, "Inputs:")
    for x in inputs:
        add_bullet(doc, x, level=1)
    add_para(doc, "Deliverables:")
    for x in deliverables:
        add_bullet(doc, x, level=1)
    add_para(doc, "Exit criteria:")
    for x in exit_criteria:
        add_bullet(doc, x, level=1)


# ---------- Build Document ----------

doc = Document()

for section in doc.sections:
    section.page_width = Cm(21)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(2)
    section.bottom_margin = Cm(2)
    section.left_margin = Cm(2.5)
    section.right_margin = Cm(2)

style = doc.styles['Normal']
style.font.name = 'Calibri'
style.font.size = Pt(11)

# Title
title = doc.add_paragraph()
t_run = title.add_run('MadrashaOS — UI/UX Implementation Plan')
t_run.bold = True
t_run.font.size = Pt(20)
t_run.font.color.rgb = RGBColor(0x1F, 0x3A, 0x5F)

sub = doc.add_paragraph()
sub.paragraph_format.space_after = Pt(10)
s_run = sub.add_run('Phase-by-Phase, Session-by-Session Plan to Deliver Build-Ready UI/UX')
s_run.font.size = Pt(12)
s_run.italic = True
s_run.font.color.rgb = RGBColor(0x55, 0x55, 0x55)

# Meta table
meta = doc.add_table(rows=5, cols=2)
set_table_borders(meta)
meta_rows = [
    ('Document', 'MadrashaOS_UIUX_Implementation_Plan_TechnicalDoc_2026-09-16'),
    ('Source', 'MadrashaOS Implementation-Grade SRS v2.0 (2026-09-16)'),
    ('Author Role', 'Lead UI/UX Designer (Apple / Google / Tesla design heritage)'),
    ('Audience', 'Project Manager, Backend Lead, Frontend Lead, Client Authority'),
    ('Total Duration', '~5.5 weeks (8 phases, 30 sessions)'),
]
for i, (k, v) in enumerate(meta_rows):
    c0 = meta.rows[i].cells[0]
    c1 = meta.rows[i].cells[1]
    set_cell_margins(c0); set_cell_margins(c1)
    set_cell_bg(c0, 'F2F2F2')
    c0.text = ''
    r0 = c0.paragraphs[0].add_run(k)
    r0.bold = True
    r0.font.size = Pt(10)
    c1.text = ''
    r1 = c1.paragraphs[0].add_run(v)
    r1.font.size = Pt(10)
    c0.width = Cm(4.5)
    c1.width = Cm(12)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 1. Overview
add_heading(doc, '1. Overview', 1)
add_para(doc,
    "This document defines the complete plan for delivering a build-ready UI/UX for MadrashaOS, "
    "a multi-tenant, multi-branch Madrasha ERP with 40+ modules across Foundation, People, "
    "Academic, Finance, Operations, Communication, and Platform layers. The plan is organized "
    "into 8 phases and 30 sessions; each session has a single objective, named inputs, concrete "
    "deliverables, and explicit exit criteria. After Session 30, the frontend and backend "
    "developers receive a complete design system, hi-fi mockups, mobile prototypes, PDF templates, "
    "and a design-QA contract — sufficient to build the entire system without further design input. "
    "Design principles: simplicity over feature-density (Apple), consistent and accessible "
    "components (Google Material, WCAG 2.1 AA per SRS §10.6), and minimal, task-focused surfaces "
    "(Tesla). The client constraint in SRS §10.8 — “not extremely complicated, not difficult for "
    "teachers or accountants, not dependent on one employee” — is the governing north star.")

# 2. Phase overview table
add_heading(doc, '2. Phase Overview', 1)

phases = doc.add_table(rows=9, cols=4)
set_table_borders(phases)
hdr = ['Phase', 'Name', 'Sessions', 'Duration']
for i, h in enumerate(hdr):
    c = phases.rows[0].cells[i]
    set_cell_margins(c); set_cell_bg(c, '1F3A5F')
    c.text = ''
    r = c.paragraphs[0].add_run(h)
    r.bold = True; r.font.size = Pt(10); r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

phase_data = [
    ('0', 'Discovery & Foundations', '0.1–0.4', '4 days'),
    ('1', 'Design System Foundation', '1.1–1.4', '5 days'),
    ('2', 'Information Architecture & Navigation', '2.1–2.4', '4 days'),
    ('3', 'Core Flow Wireframes', '3.1–3.4', '5 days'),
    ('4', 'High-Fidelity Mockups', '4.1–4.6', '8 days'),
    ('5', 'Print/PDF & Branding', '5.1–5.3', '3 days'),
    ('6', 'Prototype & Usability Validation', '6.1–6.3', '5 days'),
    ('7', 'Design-to-Dev Handoff', '7.1–7.4', '3 days'),
]
for i, row in enumerate(phase_data, start=1):
    for j, val in enumerate(row):
        c = phases.rows[i].cells[j]
        set_cell_margins(c)
        if i % 2 == 0:
            set_cell_bg(c, 'F7F7F7')
        c.text = ''
        r = c.paragraphs[0].add_run(val)
        r.font.size = Pt(10)
        if j == 0:
            r.bold = True
            c.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

# 3. Design principles
add_heading(doc, '3. Design Principles (Locked in Phase 0)', 1)
add_bullet(doc, "Progressive disclosure: surface only what the role needs; hide advanced fields behind “More”.")
add_bullet(doc, "One primary action per screen; secondary actions in an overflow menu (Apple pattern).")
add_bullet(doc, "Mobile-first by default; desktop is a wider grid, not a different paradigm.")
add_bullet(doc, "Permission-aware UI: hide, do not disable — server still enforces (SRS §5.1).")
add_bullet(doc, "Bangla/English/Arabic first-class; RTL pipelines validated in Phase 5.")
add_bullet(doc, "WCAG 2.1 AA contrast, keyboard navigation, screen-reader labels (SRS §10.6).")
add_bullet(doc, "Density without clutter: 8pt grid, 4:5 content-to-whitespace ratio on desktop.")

# 4. Phase 0 — Discovery
add_heading(doc, '4. Phase 0 — Discovery & Foundations (4 days)', 1)
add_session_block(doc, '0.1', 'SRS Deep-Read & Module Taxonomy',
    "Internalize every module spec, API, UI screen, and acceptance criterion in SRS v2.0.",
    ['SRS Parts 2, 3, 5, 10, 11', 'BRD v1.0', 'Discovery notes on client pain points'],
    ['Module taxonomy spreadsheet (40+ modules, grouped by Phase 0–3)',
     'Risk register of UX ambiguities'],
    ['Designer can recite each module’s primary user, primary action, and acceptance test.'])
add_session_block(doc, '0.2', 'Personas & Role Journeys',
    "Define 8 personas (Super Admin, Authority, Administrator, Accountant, Teacher, Storekeeper, Guardian, Student) and their top-3 daily tasks.",
    ['SRS §8.1 role definitions', 'Client stakeholder interviews (2h)'],
    ['Persona cards with photo, goals, frustrations, tech literacy',
     'Journey maps for: take-attendance, collect-fees, record-expense, view-child-results'],
    ['Client signs off the 8 personas and 4 journey maps.'])
add_session_block(doc, '0.3', 'Heuristic Review of Competing Madrasha ERPs',
    "Benchmark 3 existing madrasha/school ERPs against 10 usability heuristics to avoid their mistakes.",
    ['Public demo links of 3 competing products'],
    ['Heuristic scorecard with screenshots',
     '“Do-not-do” list of patterns to avoid'],
    ['Avoid-list pinned to design workspace.'])
add_session_block(doc, '0.4', 'Design Principles & Constraints Lock-In',
    "Convert discovery into binding design principles and measurable constraints.",
    ['Outputs of 0.1–0.3', 'SRS §10.8 client constraint'],
    ['One-page design principles document (signed by client and PM)'],
    ['No design work begins in Phase 1 until this page is signed.'])

# 5. Phase 1 — Design System
add_heading(doc, '5. Phase 1 — Design System Foundation (5 days)', 1)
add_session_block(doc, '1.1', 'Brand Kit',
    "Resolve SRS §11.3 open item: logo, color palette, typography stack for bn/en/ar.",
    ['Client brand assets (logo, preferred colors)', 'SRS §2.6.6 language requirements'],
    ['Logo set (full, monogram, favicon)', 'Color tokens (primary, neutral, semantic)',
     'Typography stack: Bangla (e.g., Hind Siliguri), English (Inter), Arabic (Noto Naskh Arabic)'],
    ['Tokens exported as JSON + Figma variables.'])
add_session_block(doc, '1.2', 'Token System',
    "Establish spacing, type scale, elevation, motion, and grid tokens consumed by every component.",
    ['1.1 brand kit'],
    ['8pt spacing scale', 'Type scale (caption→display, 6 steps)',
     'Elevation shadows (5 levels)', 'Motion tokens (durations, easings)'],
    ['Tokens freeze; downstream components must reference tokens, never raw values.'])
add_session_block(doc, '1.3', 'Component Library v0',
    "Build the 30 atomic components used across all 40+ modules.",
    ['1.2 tokens', 'SRS §5.2 design system requirements'],
    ['Buttons (primary/secondary/ghost/danger, 3 sizes, 5 states)',
     'Inputs (text/number/date/select/textarea, with label/helper/error)',
     'Table (sortable, paginated, sticky header, row actions)',
     'Modal, Drawer, Toast, Tabs, Breadcrumb, Badge, Chip, Card, Skeleton, Empty state',
     'Form layout primitives (Section, FieldRow, FilterBar)'],
    ['Component spec sheet (props, states, variants) ready for frontend.'])
add_session_block(doc, '1.4', 'Iconography & Illustration',
    "Define a single icon set and 5 illustration styles for empty states.",
    ['1.1 brand kit'],
    ['Icon set (200+ icons, 24/20/16 px, stroke-based, RTL-aware)',
     '5 empty-state illustrations (students, fees, attendance, inventory, results)'],
    ['Icon font + SVG sprite generated.'])

# 6. Phase 2 — IA & Navigation
add_heading(doc, '6. Phase 2 — Information Architecture & Navigation (4 days)', 1)
add_session_block(doc, '2.1', 'Module Taxonomy & Dynamic Nav Model',
    "Design the left navigation that renders only enabled modules (SRS §2.1.2, §5.1).",
    ['SRS §2.1.2 module configuration', 'SRS §5.1 global layout'],
    ['Information architecture tree (3 levels max)',
     'Dynamic nav component spec (driven by enabled-modules + permissions)',
     'Mobile drawer variant'],
    ['IA validated by card-sort with 5 madrasha staff members.'])
add_session_block(doc, '2.2', 'Role-Based Dashboard Wireframes',
    "Wireframe the 5 dashboards defined in SRS §2.6.4.",
    ['SRS §2.6.4', '0.2 personas'],
    ['Authority, Accountant, Teacher, Storekeeper, Guardian dashboard wireframes',
     'Widget inventory (12 widget types, each with empty/loading/error)'],
    ['Each dashboard fits on a 1280-wide canvas without horizontal scroll.'])
add_session_block(doc, '2.3', 'State System Spec',
    "Define empty, loading, error, permission-denied, and offline states for every screen pattern.",
    ['SRS §5.5'],
    ['State spec sheet (6 states × 5 screen patterns = 30 specs)',
     'Copy library in bn + en for each state'],
    ['Frontend can implement states without further design input.'])
add_session_block(doc, '2.4', 'Permission-Aware UI Rules',
    "Translate SRS §5.1 (“hide, don’t disable”) into per-component rules.",
    ['SRS §5.1', 'SRS §6.2 permission-code list'],
    ['Permission-to-UI rule matrix (e.g., fees.payment.create → show Collect Payment button)',
     'Field-level permission rules (e.g., students.notes.view → render special_notes)'],
    ['Matrix reviewed and signed by backend lead.'])

# 7. Phase 3 — Wireframes
add_heading(doc, '7. Phase 3 — Core Flow Wireframes (5 days)', 1)
add_session_block(doc, '3.1', 'Foundation Modules Wireframes',
    "Wireframe Organization, Module Config, RBAC, Audit, Security, Backup (SRS §2.1).",
    ['SRS §2.1.1–2.1.6', '1.3 component library v0'],
    ['12 wireframes (list + detail + form per module)',
     'Audit Explorer timeline wireframe (key differentiator)'],
    ['Wireframes pass cognitive walk-through with 1 accountant + 1 admin.'])
add_session_block(doc, '3.2', 'People Modules Wireframes',
    "Wireframe Student, Admission, Guardian, Teacher, Assignment, Employee (SRS §2.2).",
    ['SRS §2.2.1–2.2.6'],
    ['15 wireframes incl. Admission Kanban + Student Profile (7 tabs) + Promotion Wizard',
     'Guardian Portal mobile wireframe'],
    ['All persona top-3 tasks reachable in ≤3 clicks (SRS §10.8).'])
add_session_block(doc, '3.3', 'Academic Modules Wireframes (Mobile-First)',
    "Wireframe Academic Structure, Attendance, Examination, Results (SRS §2.3).",
    ['SRS §2.3.1–2.3.4', 'SRS §5.4 mobile considerations'],
    ['Routine Builder wireframe (drag-drop grid)',
     'Take-Attendance mobile wireframe (default Present, one-tap cycle)',
     'Marks Entry mobile wireframe (swipe-next)',
     'Result Dashboard + printable Mark Sheet wireframe'],
    ['Take-Attendance flow steps ≤6 taps for a 40-student class.'])
add_session_block(doc, '3.4', 'Finance Modules Wireframes',
    "Wireframe Fees, Scholarship, Accounting, Cash/Bank, Zakat, Donations (SRS §2.4).",
    ['SRS §2.4.1–2.4.6', 'SRS §3.6 Golden Flow'],
    ['Collect Payment flow wireframe (3 steps, mobile-friendly)',
     'Ledger Explorer with running balance',
     'Zakat dashboard (fund-isolated visualization)',
     'Outstanding Fees report wireframe'],
    ['Accountant validates the 3-step payment flow in <90s.'])

# 8. Phase 4 — Hi-fi
add_heading(doc, '8. Phase 4 — High-Fidelity Mockups (8 days)', 1)
add_session_block(doc, '4.1', 'Global Shell & Navigation Hi-Fi',
    "Apply design system to the shell: top bar, left nav, breadcrumb, page header, footer.",
    ['1.x design system', '2.x IA'],
    ['Desktop shell (1440 + 1280 breakpoints)',
     'Mobile shell (375 + 768 breakpoints)',
     'Language switcher interaction states (bn/en/ar + RTL)',
     'Notification bell + user menu flyouts'],
    ['Shell signed off by client; becomes the visual template for all modules.'])
add_session_block(doc, '4.2', 'Foundation Module Hi-Fi',
    "Convert foundation wireframes to hi-fi.",
    ['3.1 wireframes', '4.1 shell'],
    ['12 hi-fi screens',
     'Roles & Permissions matrix editor (interactive grid)',
     'Audit Explorer with field-diff viewer (old → new highlighted)'],
    ['Screens meet WCAG 2.1 AA contrast.'])
add_session_block(doc, '4.3', 'People & Academic Hi-Fi',
    "Convert people + academic wireframes to hi-fi.",
    ['3.2, 3.3 wireframes'],
    ['15 people screens + 12 academic screens',
     'Student Profile tabbed interface (Personal/Academic/Guardians/Documents/Fees/Attendance/History)',
     'Admission Kanban with drag-drop columns',
     'Attendance mobile quick-toggles in brand colors'],
    ['Teacher persona completes take-attendance in ≤60s on a 5-inch phone (SRS §2.3.2).'])
add_session_block(doc, '4.4', 'Finance & Operations Hi-Fi',
    "Convert finance + operations wireframes to hi-fi.",
    ['3.4 wireframes', 'SRS §2.5 operations'],
    ['18 finance + 16 operations screens',
     'Purchase Pipeline board',
     'Hostel Occupancy Map (visual floor plan)',
     'Library circulation quick-scan screen'],
    ['Accountant completes expense entry in ≤30s.'])
add_session_block(doc, '4.5', 'Dashboards Hi-Fi',
    "Apply design system to all 5 role dashboards.",
    ['2.2 dashboard wireframes'],
    ['5 hi-fi dashboards with 12 styled widgets',
     'Pending Approvals widget (cross-link to Approval module)',
     'Low-stock + outstanding-fees alert widgets'],
    ['Authority dashboard’s outstanding figure reconciles to Fee module (SRS §2.6.4 acceptance).'])
add_session_block(doc, '4.6', 'Mobile Screens Hi-Fi',
    "Deliver mobile hi-fi for the 3 mobile-first workflows + guardian portal.",
    ['3.3, 4.3 mobile wireframes', 'SRS §5.4'],
    ['Mobile attendance (full flow, hi-fi)',
     'Mobile marks entry (swipe-next pattern)',
     'Guardian Portal mobile (children overview, fees, results, notices)',
     'Responsive shell rules (breakpoint spec)'],
    ['All primary CRUD actions reachable on a 5-inch phone (SRS §2.7.4).'])

# 9. Phase 5 — Print/PDF
add_heading(doc, '9. Phase 5 — Print/PDF & Branding (3 days)', 1)
add_session_block(doc, '5.1', 'PDF Templates',
    "Design branded PDF templates for receipts, mark sheets, result sheets, certificates.",
    ['SRS §2.6.5', '1.1 brand kit'],
    ['Fee receipt template (bn + en + ar)',
     'Mark sheet + Result sheet templates',
     'Certificate template (Phase 3 placeholder)',
     'Ledger statement + Outstanding report templates'],
    ['Arabic student name renders correctly on admission form PDF (SRS §2.6.5 acceptance).'])
add_session_block(doc, '5.2', 'Public Website Templates',
    "Design the optional public-facing site per madrasha (SRS §2.7.3).",
    ['SRS §2.7.3'],
    ['Home, Programs, Admission, Notices, Events, Contact, Donate templates',
     'CMS admin wireframe for content editors'],
    ['Public visitor cannot reach any /students, /accounts, /documents endpoint (validated by backend).'])
add_session_block(doc, '5.3', 'Multi-Language Typography Validation',
    "Validate bn/en/ar rendering across all screens and PDFs.",
    ['5.1, 5.2 templates', '1.1 typography stack'],
    ['Typography QA report (line-height, fallback fonts, RTL direction)',
     'Bangla date format (e.g., ১৬-০৯-২০২৬) validated'],
    ['Zero tofu (missing-glyph squares) across bn/en/ar.'])

# 10. Phase 6 — Prototype & Usability
add_heading(doc, '10. Phase 6 — Prototype & Usability Validation (5 days)', 1)
add_session_block(doc, '6.1', 'Interactive Prototype',
    "Link key flows in Figma: login → take-attendance → collect-fee → view-result → guardian-portal.",
    ['Phase 4 mockups'],
    ['Clickable Figma prototype (8 flows)',
     'Prototype seeded with representative madrasha data'],
    ['Prototype plays end-to-end without dead-ends.'])
add_session_block(doc, '6.2', 'Usability Tests with Role Representatives',
    "Run 5 moderated sessions (1 per role: Authority, Admin, Accountant, Teacher, Guardian).",
    ['6.1 prototype'],
    ['Test script per role (top-3 tasks each)',
     'Recording + observation notes',
     'Issue log with severity (Blocker/Critical/Major/Minor per SRS §8.4)'],
    ['Blocker + Critical issues = 0 before handoff.'])
add_session_block(doc, '6.3', 'Iteration & Final Spec',
    "Fix Blockers/Criticals; freeze the design spec for handoff.",
    ['6.2 issue log'],
    ['Updated mockups (Blocker/Critical fixed)',
     'Design spec document (component states, interaction notes, copy)',
     'Design QA checklist for frontend'],
    ['Spec frozen; further changes go through change-request process.'])

# 11. Phase 7 — Handoff
add_heading(doc, '11. Phase 7 — Design-to-Dev Handoff (3 days)', 1)
add_session_block(doc, '7.1', 'Design Tokens Export',
    "Export tokens in formats consumable by frontend (CSS variables, TypeScript, Figma variables).",
    ['1.2 token system'],
    ['tokens.css, tokens.ts, tokens.json',
     'Tailwind config preset (if frontend uses Tailwind)'],
    ['Frontend imports tokens without manual mapping.'])
add_session_block(doc, '7.2', 'Component Spec Sheet',
    "Publish per-component spec: props, variants, states, accessibility roles, copy.",
    ['1.3 component library', '6.3 final spec'],
    ['Component spec sheet (30 components × ~8 fields)',
     'Storybook-ready MDX documentation'],
    ['Frontend can build each component without re-asking the designer.'])
add_session_block(doc, '7.3', 'Asset Library & Icon Set',
    "Package icons, illustrations, logos, and PDF templates for dev consumption.",
    ['1.1 brand kit', '1.4 icons', '5.1 PDF templates'],
    ['Asset ZIP (SVG + optimized PNG + WebP)',
     'PDF template HTML/PDF samples for backend PDF engine',
     'Favicon + app-icon set'],
    ['Backend PDF engine can ingest templates and render branded output.'])
add_session_block(doc, '7.4', 'Design QA Contract',
    "Define how design QA works during frontend build (visual review cadence, sign-off rules).",
    ['6.3 final spec'],
    ['Design QA checklist (30 items)',
     'Review cadence (per-PR visual review, weekly holistic review)',
     'Sign-off rule: screen not “done” until designer approves'],
    ['Contract signed by designer, frontend lead, PM.'])

# 12. Exit — what developers receive
add_heading(doc, '12. Handoff Deliverables (End of Phase 7)', 1)
add_para(doc,
    "After Session 30, the backend and frontend developers receive the following complete, "
    "build-ready package. No further design input is required for Phase 0–2 implementation:")

final = doc.add_table(rows=8, cols=2)
set_table_borders(final)
final_rows = [
    ('Design tokens', 'CSS + TS + JSON + Tailwind preset (Session 7.1)'),
    ('Component library', '30 components, spec sheet, MDX docs (Session 7.2)'),
    ('Hi-fi mockups', '70+ screens covering all 40+ modules (Phase 4)'),
    ('Mobile prototypes', 'Attendance, marks entry, guardian portal (Session 4.6)'),
    ('PDF/print templates', 'Receipts, mark sheets, certificates, reports (Session 5.1)'),
    ('Public website templates', '7 pages + CMS admin (Session 5.2)'),
    ('Design QA contract', 'Per-PR review rules + sign-off process (Session 7.4)'),
    ('Multi-language assets', 'bn/en/ar validated, RTL pipelines confirmed (Session 5.3)'),
]
for i, (k, v) in enumerate(final_rows):
    c0 = final.rows[i].cells[0]
    c1 = final.rows[i].cells[1]
    set_cell_margins(c0); set_cell_margins(c1)
    set_cell_bg(c0, 'F2F2F2')
    c0.text = ''
    r0 = c0.paragraphs[0].add_run(k)
    r0.bold = True; r0.font.size = Pt(10)
    c1.text = ''
    r1 = c1.paragraphs[0].add_run(v)
    r1.font.size = Pt(10)

# 13. Next step
add_heading(doc, '13. Next Step', 1)
add_para(doc,
    "Kick off Phase 0 Session 0.1 immediately. The SRS is already in hand; stakeholder interviews "
    "(Session 0.2) require the client to schedule 2 hours with one representative per role. Once "
    "Phase 0 ends with the signed design-principles page, the designer works independently through "
    "Phases 1–7 and re-engages the client only at: Phase 4 sign-off (shell + dashboards), Phase 6 "
    "usability tests, and Phase 7 handoff. This plan closes the open visual-design item in SRS "
    "§11.3 and produces a UI/UX that the backend and frontend developers can build against "
    "without further design iteration.")

doc.save(OUTPUT)
print(f"Saved: {OUTPUT}")
