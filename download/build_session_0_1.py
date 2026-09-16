"""
MadrashaOS - Session 0.1 Deliverable: Module Taxonomy + UX Risk Register
Output: .docx via python-docx
"""
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

OUTPUT = "/home/z/my-project/download/MadrashaOS_Session_0.1_Module_Taxonomy_TechnicalDoc_2026-09-16.docx"

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


def set_cell_margins(cell, top=40, bottom=40, left=80, right=80):
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


def add_bullet(doc, text):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.2
    if p.runs:
        p.runs[0].text = ''
    r = p.add_run(text)
    r.font.size = Pt(11)
    return p


def build_table(doc, headers, rows, col_widths_cm=None, header_bg='1F3A5F', zebra=True, font_size=9):
    t = doc.add_table(rows=1, cols=len(headers))
    t.autofit = False
    set_table_borders(t)
    # header
    for i, h in enumerate(headers):
        c = t.rows[0].cells[i]
        set_cell_margins(c)
        set_cell_bg(c, header_bg)
        c.text = ''
        p = c.paragraphs[0]
        r = p.add_run(h)
        r.bold = True
        r.font.size = Pt(font_size + 0.5)
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        if col_widths_cm:
            c.width = Cm(col_widths_cm[i])
    # body
    for ri, row in enumerate(rows, start=1):
        new_row = t.add_row()
        for ci, val in enumerate(row):
            c = new_row.cells[ci]
            set_cell_margins(c)
            if zebra and ri % 2 == 0:
                set_cell_bg(c, 'F7F7F7')
            c.text = ''
            p = c.paragraphs[0]
            r = p.add_run(str(val))
            r.font.size = Pt(font_size)
            if col_widths_cm:
                c.width = Cm(col_widths_cm[ci])
    return t


# ---------- Build Document ----------

doc = Document()
for section in doc.sections:
    section.page_width = Cm(29.7)   # landscape for wide table
    section.page_height = Cm(21)
    section.top_margin = Cm(1.8)
    section.bottom_margin = Cm(1.8)
    section.left_margin = Cm(2)
    section.right_margin = Cm(2)
    # also set default to allow portrait for subsequent sections handled by section breaks - skipped for simplicity

style = doc.styles['Normal']
style.font.name = 'Calibri'
style.font.size = Pt(11)

# Title
title = doc.add_paragraph()
t_run = title.add_run('MadrashaOS — Session 0.1 Deliverable')
t_run.bold = True
t_run.font.size = Pt(20)
t_run.font.color.rgb = RGBColor(0x1F, 0x3A, 0x5F)

sub = doc.add_paragraph()
sub.paragraph_format.space_after = Pt(8)
s_run = sub.add_run('Module Taxonomy & UX Risk Register')
s_run.font.size = Pt(13)
s_run.italic = True
s_run.font.color.rgb = RGBColor(0x55, 0x55, 0x55)

# Meta table
meta = doc.add_table(rows=5, cols=2)
set_table_borders(meta)
meta_rows = [
    ('Document', 'MadrashaOS_Session_0.1_Module_Taxonomy_TechnicalDoc_2026-09-16'),
    ('Source', 'SRS v2.0 (2026-09-16), Parts 2 & 3'),
    ('Session', '0.1 — SRS Deep-Read & Module Taxonomy'),
    ('Phase', '0 — Discovery & Foundations'),
    ('Exit Criteria', 'Designer can recite each module\u2019s primary user, primary action, and acceptance test'),
]
for i, (k, v) in enumerate(meta_rows):
    c0 = meta.rows[i].cells[0]; c1 = meta.rows[i].cells[1]
    set_cell_margins(c0); set_cell_margins(c1)
    set_cell_bg(c0, 'F2F2F2')
    c0.text = ''; c1.text = ''
    r0 = c0.paragraphs[0].add_run(k); r0.bold = True; r0.font.size = Pt(10)
    r1 = c1.paragraphs[0].add_run(v); r1.font.size = Pt(10)
    c0.width = Cm(4); c1.width = Cm(22)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 1. Overview
add_heading(doc, '1. Overview', 1)
add_para(doc,
    "This document is the deliverable for Session 0.1 of the MadrashaOS UI/UX Implementation Plan. "
    "It internalizes every module spec, API surface, and acceptance criterion in SRS v2.0 Parts 2 and 3, "
    "and translates them into (a) a single module taxonomy keyed by phase, primary user, primary action, "
    "and acceptance test, and (b) a UX risk register flagging ambiguities that must be resolved before "
    "wireframing begins in Phase 3. Both artifacts are required exit criteria for Phase 0 Session 0.1.")

# 2. Module Taxonomy
add_heading(doc, '2. Module Taxonomy', 1)
add_para(doc,
    "The taxonomy below covers all 32 functional modules from SRS Part 2 plus the 10 cross-module rules from "
    "Part 3, grouped by recommended implementation phase per SRS \u00a72.1 (foundation first) and \u00a71.4 "
    "(phasing). Phase 0 = Foundation; Phase 1 = People + core Academic; Phase 2 = Finance + Operations + Exams/Results; "
    "Phase 3 = Communication, Platform, Public Website.")

tax_headers = ['ID', 'Module / Rule', 'Phase', 'Primary User', 'Primary Action', 'Acceptance Test (key)', 'UX Risk']
tax_rows = [
    # Phase 0 - Foundation
    ('2.1.1', 'Organization & Multi-Branch', '0', 'Super Admin', 'Configure branches', 'Branch-scoped query returns 403 for out-of-scope user', 'Y (R1)'),
    ('2.1.2', 'Module Configuration', '0', 'Super Admin', 'Toggle module on/off', 'Disabling Hostel returns 410 on its endpoints', 'Y (R2)'),
    ('2.1.3', 'User & Role Mgmt (RBAC)', '0', 'Super Admin', 'Assign permissions', 'Teacher cannot GET /accounting/transactions (403)', 'Y (R3)'),
    ('2.1.4', 'Audit Trail', '0', 'Administrator', 'View field-level diffs', 'Change from 20000\u219225000 logged with old+new+actor+timestamp', 'N'),
    ('2.1.5', 'Security', '0', 'Super Admin', 'Enforce policy', 'HTTPS enforced; .exe upload rejected', 'N'),
    ('2.1.6', 'Backup & Recovery', '0', 'Administrator', 'Verify restore drill', 'Restore requires second approver', 'N'),
    # Phase 1 - People
    ('2.2.1', 'Student Management', '1', 'Administrator', 'Create / promote student', 'Promotion preserves prior history row', 'Y (R4)'),
    ('2.2.2', 'Admission Management', '1', 'Administrator', 'Approve + register applicant', 'Registration creates Student + fee plan + history', 'N'),
    ('2.2.3', 'Guardian Management', '1', 'Guardian', 'View own children', 'Guardian sees only linked children; 403 on others', 'Y (R5)'),
    ('2.2.4', 'Teacher Management', '1', 'Administrator', 'Create teacher profile', 'Teacher code auto-generated; salary hidden from self', 'N'),
    ('2.2.5', 'Teacher Assignment', '1', 'Administrator', 'Assign teacher \u2192 section+subject', 'Duplicate active assignment blocked', 'N'),
    ('2.2.6', 'Employee Management', '1', 'Administrator', 'Maintain non-teaching staff', 'Resigned employee cannot log in', 'N'),
    # Phase 1-2 - Academic
    ('2.3.1', 'Academic Management', '1', 'Administrator', 'Build routine / calendar', 'Same teacher double-booked in slot blocked', 'N'),
    ('2.3.2', 'Attendance Management', '1', 'Teacher', 'Mark attendance (mobile)', '40 students marked in <60s on phone', 'Y (R6)'),
    ('2.3.3', 'Examination Management', '2', 'Teacher / Admin', 'Enter + publish marks', 'Mark > full_marks rejected; publish locks paper', 'N'),
    ('2.3.4', 'Result Management', '2', 'Administrator', 'Generate mark sheets', 'Pre-publication tab empty; post-publication visible', 'Y (R7)'),
    # Phase 2 - Finance
    ('2.4.1', 'Fee Management', '2', 'Accountant', 'Collect payment + receipt', 'Payment credits Cash account; numbered receipt issued', 'N'),
    ('2.4.2', 'Scholarship & Discount', '2', 'Accountant', 'Approve discount', 'No-reason discount rejected; above-threshold routes to approver', 'Y (R8)'),
    ('2.4.3', 'Accounting (GL)', '2', 'Accountant', 'Post balanced entry', 'Debits \u2260 credits rejected; reconciles to ledger', 'N'),
    ('2.4.4', 'Cash & Bank Management', '2', 'Accountant', 'Record transfer', 'Transfer 10000 Cash\u2192Bank moves both legs in one entry', 'N'),
    ('2.4.5', 'Zakat Management', '2', 'Accountant', 'Receive / distribute Zakat', 'Distribution > Zakat fund balance rejected', 'Y (R9)'),
    ('2.4.6', 'Donation Management', '2', 'Accountant', 'Record donation + receipt', 'Zakat-category donation posts to Zakat fund, not general', 'Y (R10)'),
    # Phase 2-3 - Operations
    ('2.5.1', 'Inventory / Store', '2', 'Storekeeper', 'Receive / issue stock', 'Issue > qty in stock rejected', 'N'),
    ('2.5.2', 'Purchase Management', '2', 'Storekeeper / Admin', 'Run purchase pipeline', 'Receive increases inventory; payment posts expense', 'N'),
    ('2.5.3', 'Supplier Management', '2', 'Storekeeper', 'View supplier outstanding', 'Detail shows correct purchased + outstanding totals', 'N'),
    ('2.5.4', 'Asset Management', '2', 'Administrator', 'Transfer / dispose asset', 'Transfer creates record; disposed asset leaves register but keeps record', 'N'),
    ('2.5.5', 'Hostel / Residential', '3', 'Administrator', 'Allocate bed to student', 'Allocating occupied bed rejected; occupancy map correct', 'N'),
    ('2.5.6', 'Food / Meal Management', '3', 'Storekeeper', 'Plan meals + record expense', 'Meal expense posts to Food account', 'N'),
    ('2.5.7', 'Library Management', '3', 'Teacher / Student', 'Issue / return book', 'Issue of already-issued copy rejected', 'N'),
    ('2.5.8', 'Transport Management', '3', 'Administrator', 'Record fuel / maintenance', 'Fuel 3000 increases vehicle cost + posts expense', 'N'),
    # Phase 3 - Communication & Output
    ('2.6.1', 'Communication', '3', 'Administrator', 'Compose + send notice', 'Class-5 notice delivered only to Class-5 guardians', 'Y (R11)'),
    ('2.6.2', 'Document Management', '3', 'All roles', 'Upload / download files', '60MB upload rejected; signed URL expires in 10min', 'N'),
    ('2.6.3', 'Reporting', '3', 'Accountant / Admin', 'Run filtered report', 'Finance report totals reconcile to ledger; 403 for Teacher', 'N'),
    ('2.6.4', 'Dashboard', '3', 'All roles', 'Glance operational metrics', 'Authority dashboard outstanding reconciles to Fee module', 'Y (R12)'),
    ('2.6.5', 'Printing & PDF Generation', '3', 'All roles', 'Print receipt / mark sheet', 'PDF renders bn+en correctly with brand header', 'Y (R13)'),
    ('2.6.6', 'Language & Localization', '3', 'All roles', 'Switch bn / en', 'Bangla date renders as \u09ec\u09ec-\u09e9-\u09e8\u09e6\u09e8\u09ec', 'Y (R14)'),
    # Phase 3 - Platform
    ('2.7.1', 'Approval / Workflow', '3', 'Authority', 'Approve / reject request', 'Requester cannot approve own request', 'Y (R15)'),
    ('2.7.2', 'Multi-Tenant / SaaS', '3', 'Super Admin', 'Provision tenant', 'Tenant A user gets zero results for Tenant B queries', 'N'),
    ('2.7.3', 'Public Website', '3', 'Public visitor', 'Submit public donation', 'Public cannot reach /students, /accounts, /documents', 'Y (R16)'),
    ('2.7.4', 'Mobile Responsiveness', '3', 'Teacher / Guardian', 'Use phone for core flows', 'All CRUD reachable on 5-inch phone', 'N'),
    # Part 3 - Cross-module rules (cross-cutting; not separate screens)
    ('3.1', 'Tenant Isolation (rule)', '0', 'Backend-enforced', '\u2014', 'organization_id non-null on every tenant-scoped table', 'N'),
    ('3.2', 'Branch Scoping (rule)', '0', 'Backend-enforced', '\u2014', 'branch_id on operational tables; combined report no leakage', 'N'),
    ('3.3', 'File & Document Access (rule)', '0', 'Backend-enforced', '\u2014', 'Signed URL TTL \u2264 10 min; DocumentAccessLog appended', 'N'),
    ('3.4', 'Audit-Sensitive Entities (rule)', '0', 'Backend-enforced', '\u2014', 'Field-level diffs on create/update/delete for listed entities', 'N'),
    ('3.5', 'Approval Routing (rule)', '2', 'Authority', 'Decide on pending', 'Pending blocks financial posting until decided', 'N'),
    ('3.6', 'Golden Flow (rule)', '2', 'Backend-enforced', '\u2014', 'All financial events post balanced; reference_id traceable', 'N'),
    ('3.7', 'Fund Isolation Zakat (rule)', '2', 'Backend-enforced', '\u2014', 'Zakat account rejects non-Zakat transactions', 'N'),
    ('3.8', 'Notification Triggers (rule)', '3', 'System', '\u2014', 'Configurable per tenant; emitted on listed events', 'N'),
    ('3.9', 'Shared / Master Data (rule)', '0', 'Administrator', '\u2014', 'Academic structure reused across Students/Attendance/Exams/Fees', 'N'),
    ('3.10', 'ID Generation Rules (rule)', '0', 'Backend-enforced', '\u2014', 'Codes generated centrally; unique per tenant', 'N'),
]

build_table(doc, tax_headers, tax_rows,
            col_widths_cm=[1.2, 4.5, 1.2, 2.5, 3.5, 6.5, 1.6],
            font_size=8.5)

# 3. UX Risk Register
add_heading(doc, '3. UX Risk Register', 1)
add_para(doc,
    "Sixteen UX ambiguities surfaced during the deep-read. Each is keyed (R1\u2013R16) and referenced "
    "back to the taxonomy column. Severity: H = blocks wireframing; M = needs design decision before hi-fi; "
    "L = resolve during prototyping. All H risks must be cleared in Phase 0 Session 0.4 (Design Principles "
    "Lock-In) before Phase 1 begins.")

risk_headers = ['ID', 'Risk (UX Ambiguity)', 'SRS Ref', 'Sev.', 'Mitigation (Proposed)']
risk_rows = [
    ('R1', 'Branch switcher in top bar: does switching mid-task preserve filter context? Multi-branch user confusion risk.',
     '2.1.1 / 5.1', 'H', 'Default: scope is per-tab; switching branch opens a fresh tab. Lock decision in 0.4.'),
    ('R2', 'Module disable with active dependencies (e.g., Inventory \u2192 Hostel): how is the dependency message surfaced without being modal-blocking?',
     '2.1.2', 'M', 'Inline warning on the toggle; list dependents as chips; disable Save until user resolves.'),
    ('R3', 'Permission-aware UI = hide, not disable. But onboarding a user with zero permissions lands them on an empty dashboard \u2014 no guidance.',
     '2.1.3 / 5.1', 'H', 'Empty-dashboard state with \u201cRequest access\u201d CTA + admin contact. Spec in 2.3.'),
    ('R4', 'Promotion wizard: how to show effective-dated history without making the user feel they \u201clost\u201d the old class?',
     '2.2.1', 'M', 'History timeline panel right of wizard; old assignment rendered as past chip, not deleted.'),
    ('R5', 'Guardian with multiple children: single dashboard or per-child tabs? Mobile real-estate is tight.',
     '2.2.3', 'M', 'Single dashboard with child-switcher segmented control at top; default = youngest active child.'),
    ('R6', 'Mobile attendance <60s for 40 students: optimistic UI? offline mode? roster changes mid-marking?',
     '2.3.2 / 5.4', 'H', 'Default Present + one-tap cycle; optimistic local state; submit-on-reconnect. Lock in 0.4.'),
    ('R7', 'Result with ranking disabled: merit list layout still has space for the column when on.',
     '2.3.4', 'L', 'Conditional column render; do not reserve space when ranking is off.'),
    ('R8', 'Discount approval routing: pending vs auto-applied \u2014 visual distinction in the fee plan editor.',
     '2.4.2', 'M', 'Pending discounts render as striped/greyed rows with status chip; active = solid row.'),
    ('R9', 'Zakat fund isolation: how to make fund-scoping visible to non-accountant administrators without confusion?',
     '2.4.5 / 3.7', 'M', 'Fund badge on every Zakat row; non-Zakat accounts greyed out in Zakat screens.'),
    ('R10', 'Public donation flow: anonymous vs named donations; receipt delivery without an account.',
     '2.4.6 / 2.7.3', 'H', 'Capture email OR mobile for receipt; anonymous checkbox; PDF download on confirmation screen.'),
    ('R11', 'Notice composer: audience selector for \u201cClass 5 guardians\u201d \u2014 needs preview of recipient count before send.',
     '2.6.1', 'M', 'Live recipient-count chip updates as audience is selected; \u201cPreview recipients\u201d drawer.'),
    ('R12', 'Authority dashboard outstanding figure must match Fee module exactly \u2014 risk of stale cache UX.',
     '2.6.4', 'M', 'Show \u201cas of [timestamp]\u201d next to figure; \u201cRefresh\u201d affordance; stale >5min shows dimmed.'),
    ('R13', 'PDF branding still open (SRS \u00a711.3): need brand kit before receipts/mark sheets can be templated.',
     '2.6.5 / 11.3', 'H', 'Resolve in Phase 1 Session 1.1 (Brand Kit). Blocks Phase 5.'),
    ('R14', 'Bangla date format (\u09ec\u09ec-\u09e9-\u09e8\u09e6\u09e8\u09ec) and \u09f3 currency rendering: font fallback gaps.',
     '2.6.6', 'M', 'Validate typography stack in 1.1; run zero-tofu check in 5.3.'),
    ('R15', 'Approval queue: approver out-of-office \u2014 delegation UX not specified in SRS.',
     '2.7.1', 'M', 'Add delegate field on user profile; route to delegate when OOO flag is set. Confirm in 0.4.'),
    ('R16', 'Public website donation form: how to prevent spam / abuse without forcing login?',
     '2.7.3', 'M', 'Honeypot + reCAPTCHA v3; rate-limit by IP at backend (Part 6.5 already supports).'),
]

build_table(doc, risk_headers, risk_rows,
            col_widths_cm=[1.2, 8.5, 2.3, 1.2, 9.5],
            font_size=9)

# 4. Phase 0 Session 0.1 Exit Criteria Check
add_heading(doc, '4. Session 0.1 Exit Criteria Check', 1)
add_para(doc,
    "Per the UI/UX Implementation Plan, Session 0.1 is complete when the designer can recite each module\u2019s "
    "primary user, primary action, and acceptance test. The taxonomy in Section 2 satisfies this for all 42 "
    "modules + cross-module rules. The risk register in Section 3 surfaces 16 UX ambiguities, of which 5 are "
    "High severity and must be cleared in Session 0.4 (Design Principles Lock-In) before Phase 1 design work "
    "begins. The 5 High-severity risks (R1, R3, R6, R10, R13) are the priority agenda items for Session 0.4.")

# 5. Next Session
add_heading(doc, '5. Next Session: 0.2 \u2014 Personas & Role Journeys', 1)
add_para(doc,
    "Session 0.2 builds on this taxonomy to produce 8 persona cards (Super Admin, Authority, Administrator, "
    "Accountant, Teacher, Storekeeper, Guardian, Student) and 4 journey maps (take-attendance, collect-fees, "
    "record-expense, view-child-results). The personas will reference the Primary User column above; the "
    "journey maps will stress-test the Primary Action column against real task sequences. Required input from "
    "the client: 2 hours of stakeholder interviews, one representative per role.")

doc.save(OUTPUT)
print(f"Saved: {OUTPUT}")
