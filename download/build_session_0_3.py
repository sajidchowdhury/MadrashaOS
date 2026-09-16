"""
MadrashaOS - Session 0.3 Deliverable: Heuristic Review of Competing Madrasha ERPs
Output: .docx via python-docx (landscape for wide scorecard)
"""
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_LINE_SPACING
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

OUTPUT = "/home/z/my-project/download/MadrashaOS_Session_0.3_Heuristic_Review_TechnicalDoc_2026-09-16.docx"

# ---------- Helpers (reused from prior sessions) ----------

def set_cell_bg(cell, hex_color):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear'); shd.set(qn('w:color'), 'auto'); shd.set(qn('w:fill'), hex_color)
    tc_pr.append(shd)

def set_table_borders(table):
    tbl_pr = table._tbl.tblPr
    borders = OxmlElement('w:tblBorders')
    for edge in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        e = OxmlElement(f'w:{edge}')
        e.set(qn('w:val'), 'single'); e.set(qn('w:sz'), '6'); e.set(qn('w:space'), '0'); e.set(qn('w:color'), 'BFBFBF')
        borders.append(e)
    tbl_pr.append(borders)

def set_cell_margins(cell, top=40, bottom=40, left=80, right=80):
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = OxmlElement('w:tcMar')
    for name, val in (('top', top), ('left', left), ('bottom', bottom), ('right', right)):
        m = OxmlElement(f'w:{name}'); m.set(qn('w:w'), str(val)); m.set(qn('w:type'), 'dxa'); tc_mar.append(m)
    tc_pr.append(tc_mar)

def add_heading(doc, text, level):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14 if level == 1 else 10)
    p.paragraph_format.space_after = Pt(6)
    run = p.add_run(text); run.bold = True
    if level == 1:
        run.font.size = Pt(16); run.font.color.rgb = RGBColor(0x1F, 0x3A, 0x5F)
    elif level == 2:
        run.font.size = Pt(13); run.font.color.rgb = RGBColor(0x1F, 0x3A, 0x5F)
    else:
        run.font.size = Pt(11.5); run.font.color.rgb = RGBColor(0x33, 0x33, 0x33)
    return p

def add_para(doc, text, italic=False, size=11):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0); p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    p.paragraph_format.line_spacing = 1.3
    run = p.add_run(text); run.font.size = Pt(size); run.italic = italic
    return p

def add_bullet(doc, text):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_before = Pt(0); p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.2
    if p.runs: p.runs[0].text = ''
    r = p.add_run(text); r.font.size = Pt(11)
    return p

def build_table(doc, headers, rows, col_widths_cm=None, header_bg='1F3A5F', zebra=True, font_size=9):
    t = doc.add_table(rows=1, cols=len(headers))
    t.autofit = False
    set_table_borders(t)
    for i, h in enumerate(headers):
        c = t.rows[0].cells[i]
        set_cell_margins(c); set_cell_bg(c, header_bg)
        c.text = ''
        p = c.paragraphs[0]
        r = p.add_run(h); r.bold = True; r.font.size = Pt(font_size + 0.5); r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        if col_widths_cm: c.width = Cm(col_widths_cm[i])
    for ri, row in enumerate(rows, start=1):
        new_row = t.add_row()
        for ci, val in enumerate(row):
            c = new_row.cells[ci]
            set_cell_margins(c)
            if zebra and ri % 2 == 0: set_cell_bg(c, 'F7F7F7')
            c.text = ''
            p = c.paragraphs[0]
            r = p.add_run(str(val)); r.font.size = Pt(font_size)
            if col_widths_cm: c.width = Cm(col_widths_cm[ci])
    return t

# ---------- Build Document ----------

doc = Document()
for section in doc.sections:
    section.page_width = Cm(29.7); section.page_height = Cm(21)
    section.top_margin = Cm(1.8); section.bottom_margin = Cm(1.8)
    section.left_margin = Cm(2); section.right_margin = Cm(2)

style = doc.styles['Normal']
style.font.name = 'Calibri'; style.font.size = Pt(11)

# Title
title = doc.add_paragraph()
t_run = title.add_run('MadrashaOS — Session 0.3 Deliverable')
t_run.bold = True; t_run.font.size = Pt(20); t_run.font.color.rgb = RGBColor(0x1F, 0x3A, 0x5F)

sub = doc.add_paragraph()
sub.paragraph_format.space_after = Pt(8)
s_run = sub.add_run('Heuristic Review of Competing Madrasha ERPs')
s_run.font.size = Pt(13); s_run.italic = True; s_run.font.color.rgb = RGBColor(0x55, 0x55, 0x55)

# Meta table
meta = doc.add_table(rows=5, cols=2)
set_table_borders(meta)
meta_rows = [
    ('Document', 'MadrashaOS_Session_0.3_Heuristic_Review_TechnicalDoc_2026-09-16'),
    ('Source', 'SRS v2.0 (2026-09-16) §10.8 client constraint; §5 UI requirements'),
    ('Session', '0.3 — Heuristic Review of Competing Madrasha ERPs'),
    ('Phase', '0 — Discovery & Foundations'),
    ('Exit Criteria', 'Avoid-list pinned to design workspace (delivered below as Do-Not-Do list)'),
]
for i, (k, v) in enumerate(meta_rows):
    c0 = meta.rows[i].cells[0]; c1 = meta.rows[i].cells[1]
    set_cell_margins(c0); set_cell_margins(c1); set_cell_bg(c0, 'F2F2F2')
    c0.text = ''; c1.text = ''
    r0 = c0.paragraphs[0].add_run(k); r0.bold = True; r0.font.size = Pt(10)
    r1 = c1.paragraphs[0].add_run(v); r1.font.size = Pt(10)
    c0.width = Cm(4); c1.width = Cm(22)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 1. Overview
add_heading(doc, '1. Overview', 1)
add_para(doc,
    "This deliverable benchmarks three competing madrasha/school ERPs against a 15-item heuristic "
    "scorecard and produces a Do-Not-Do list of anti-patterns to avoid in MadrashaOS. The scorecard "
    "combines Nielsen\u2019s 10 classic heuristics with 5 madrasha-specific heuristics derived from the "
    "SRS constraints (\u00a710.8 client priority: \u201cnot extremely complicated, not difficult for teachers "
    "or accountants, not dependent on one employee\u201d; \u00a75.4 mobile-first; \u00a72.1.3 permission-aware "
    "UI; \u00a73.1 tenant isolation; \u00a76.5 idempotency for payments). Product columns are scaffolded "
    "as [Product A / B / C] pending client confirmation of which ERPs to evaluate.")

# 2. Methodology
add_heading(doc, '2. Methodology', 1)
add_para(doc,
    "Each heuristic is scored 0\u20134 per product (0 = egregious violation; 4 = exemplary implementation). "
    "Scores are captured by walking through the same top-3 tasks used in the Session 0.2 journey maps "
    "(take-attendance, collect-fees, record-expense, view-child-results). Observations are logged with "
    "screenshots and a one-line justification. Composite scores are not averaged \u2014 any heuristic scoring "
    "\u22641 is a Blocker that auto-enters the Do-Not-Do list.")

# 3. Heuristic Scorecard
add_heading(doc, '3. Heuristic Scorecard (Template)', 1)
add_para(doc,
    "Score legend: 0 = egregious violation \u00b7 1 = major problem \u00b7 2 = minor problem \u00b7 3 = acceptable "
    "\u00b7 4 = exemplary. Cells marked [TBD] require client to name the 3 competing products and the "
    "designer to walk through the 4 journey tasks on each.")

sc_headers = ['#', 'Heuristic', 'Description', 'Product A', 'Product B', 'Product C']
sc_rows = [
    ('H1', 'Visibility of system status', 'Loading, errors, pending states clearly shown', '[TBD]', '[TBD]', '[TBD]'),
    ('H2', 'Match real world', 'Language follows madrasha terms, not corporate jargon', '[TBD]', '[TBD]', '[TBD]'),
    ('H3', 'User control & freedom', 'Undo, cancel, escape destructive actions', '[TBD]', '[TBD]', '[TBD]'),
    ('H4', 'Consistency & standards', 'Same patterns across modules; bn/en parity', '[TBD]', '[TBD]', '[TBD]'),
    ('H5', 'Error prevention', 'Validation blocks invalid input before submit', '[TBD]', '[TBD]', '[TBD]'),
    ('H6', 'Recognition over recall', 'Visible options, no hidden shortcuts for core tasks', '[TBD]', '[TBD]', '[TBD]'),
    ('H7', 'Flexibility & efficiency', 'Shortcuts for power users; sensible defaults', '[TBD]', '[TBD]', '[TBD]'),
    ('H8', 'Aesthetic & minimalist', 'No irrelevant info; \u00a710.8 \u201cno unnecessary features\u201d', '[TBD]', '[TBD]', '[TBD]'),
    ('H9', 'Recognize, diagnose, recover', 'Actionable error copy in user\u2019s language', '[TBD]', '[TBD]', '[TBD]'),
    ('H10', 'Help & documentation', 'One-page quick-start per role (SRS \u00a710.8)', '[TBD]', '[TBD]', '[TBD]'),
    ('M1', 'Multi-language parity', 'Bangla/English toggle without losing context', '[TBD]', '[TBD]', '[TBD]'),
    ('M2', 'Mobile-first core flows', 'Attendance <60s on 5-inch phone (SRS \u00a72.3.2)', '[TBD]', '[TBD]', '[TBD]'),
    ('M3', 'Multi-branch context', 'Branch switcher preserves filter context (R1)', '[TBD]', '[TBD]', '[TBD]'),
    ('M4', 'Permission-aware UI', 'Hide (not disable) unauthorized actions (R3)', '[TBD]', '[TBD]', '[TBD]'),
    ('M5', 'Low-connectivity tolerance', 'Optimistic UI + idempotent retry (R6)', '[TBD]', '[TBD]', '[TBD]'),
]
build_table(doc, sc_headers, sc_rows,
            col_widths_cm=[1.2, 4.5, 9.5, 3.5, 3.5, 3.5], font_size=9)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 4. Do-Not-Do List (Pre-filled)
add_heading(doc, '4. Do-Not-Do List (Pre-filled from SRS constraints)', 1)
add_para(doc,
    "The 20 anti-patterns below are forbidden in MadrashaOS. Each is derived from a specific SRS "
    "section or UX risk register entry, so the list is enforceable from day one \u2014 even before the "
    "scorecard is filled in. This list is pinned to the design workspace as the Session 0.3 exit "
    "criterion.")

dn_headers = ['#', 'Do-Not-Do (Anti-pattern)', 'Rationale', 'SRS / Risk Ref']
dn_rows = [
    ('D1', 'Show every module in left navigation by default',
     'Conflicts with module configuration toggle; violates \u201cno unnecessary features\u201d', 'SRS \u00a72.1.2, \u00a710.8'),
    ('D2', 'Force a single role to use 5+ screens for one task',
     'Client constraint: core tasks must be \u22643 clicks', 'SRS \u00a710.8'),
    ('D3', 'Put financial figures on the Teacher dashboard',
     'Breaks RBAC; teachers cannot view financial data', 'SRS \u00a72.1.3, \u00a72.6.4'),
    ('D4', 'Show raw 403 stack traces to permission-denied users',
     'Friendly \u201cYou don\u2019t have access\u201d page required', 'SRS \u00a75.5'),
    ('D5', 'Use hover-only interactions for any primary action',
     'Mobile-first; tap must reach everything', 'SRS \u00a75.4, \u00a72.7.4'),
    ('D6', 'Auto-select academic year globally without preserving filter context',
     'Branch-year switching loses work mid-task', 'Risk R1'),
    ('D7', 'Disable a module toggle silently when dependencies exist',
     'Must show dependents + reject with a message', 'Risk R2; SRS \u00a72.1.2'),
    ('D8', 'Land a zero-permission user on an empty dashboard with no guidance',
     'Onboarding dead-end; \u201cRequest access\u201d CTA required', 'Risk R3'),
    ('D9', 'Make mobile attendance require per-student scroll + 3 taps',
     '<60s for 40 students; default Present + one-tap cycle', 'Risk R6; SRS \u00a72.3.2'),
    ('D10', 'Auto-apply high-value discounts without pending state',
     'Discounts must route to approver; pending must be visually distinct', 'Risk R8; SRS \u00a72.4.2'),
    ('D11', 'Allow anonymous donations without a receipt channel',
     'Capture email/mobile; deliver PDF; prevent spam', 'Risk R10; SRS \u00a72.7.3'),
    ('D12', 'Send notices without a recipient-count preview',
     'Notice composer must show live count before send', 'Risk R11; SRS \u00a72.6.1'),
    ('D13', 'Show dashboard figures without an \u201cas of [timestamp]\u201d label',
     'Stale figures mislead the Authority', 'Risk R12; SRS \u00a72.6.4'),
    ('D14', 'Ship unbranded PDF receipts / mark sheets',
     'Open item in SRS \u00a711.3; resolved in Phase 5.1', 'Risk R13'),
    ('D15', 'Render tofu (\u25a1) boxes for Bangla / Arabic text',
     'Typography stack must cover bn/en/ar; zero-tofu check in 5.3', 'Risk R14; SRS \u00a72.6.6'),
    ('D16', 'Allow requester to approve their own request',
     'Segregation of duties; button disabled + API 403', 'SRS \u00a72.7.1'),
    ('D17', 'Expose any /students, /accounts, /documents endpoint to public visitors',
     'Public site must return 401/403 for protected resources', 'SRS \u00a72.7.3'),
    ('D18', 'Store Zakat funds in the general ledger account',
     'Fund isolation; Zakat account rejects non-Zakat transactions', 'SRS \u00a73.7'),
    ('D19', 'Delete or overwrite student history on promotion / transfer',
     'Effective-dated history mandatory; old rows preserved', 'SRS \u00a72.2.1'),
    ('D20', 'Force mid-task re-login (e.g., during attendance capture)',
     'Long-lived refresh token (7 days); MFA trust device', 'Risk R6; SRS \u00a76.2'),
]
build_table(doc, dn_headers, dn_rows,
            col_widths_cm=[1.2, 8.0, 11.0, 5.0], font_size=9)

# 5. Client Input Required
add_heading(doc, '5. Client Input Required', 1)
add_bullet(doc, "Name 2\u20133 ERPs the client has previously used or evaluated (these are the strongest signal for what NOT to do).")
add_bullet(doc, "Share screenshots of current in-house spreadsheets / paper processes (these reveal the real mental model and the exact pain points).")
add_bullet(doc, "Confirm whether the client wants 3 \u201clegacy\u201d desktop-first ERPs in the scorecard, or 2 legacy + 1 modern SaaS for comparison.")
add_bullet(doc, "Optional: list 1\u20132 ERPs the client admires (positive inspiration, not just avoidance).")

# 6. Exit Criteria Check
add_heading(doc, '6. Session 0.3 Exit Criteria Check', 1)
add_para(doc,
    "Per the UI/UX Implementation Plan, Session 0.3 is complete when the Avoid-list is pinned to the "
    "design workspace. The Do-Not-Do list in Section 4 satisfies this exit criterion immediately \u2014 it "
    "is fully pre-filled from SRS constraints and risk register entries, enforceable from day one, "
    "and pinned to the design workspace as a one-page reference. The Heuristic Scorecard in Section 3 "
    "is a scaffold awaiting client confirmation of the 3 competing products; once confirmed, the "
    "designer fills in the [TBD] cells by walking through the Session 0.2 journey tasks on each "
    "product. Any heuristic scoring \u22641 on a competitor auto-appends to the Do-Not-Do list with a "
    "concrete screenshot reference.")

# 7. Next Session
add_heading(doc, '7. Next Session: 0.4 \u2014 Design Principles & Constraints Lock-In', 1)
add_para(doc,
    "Session 0.4 converts the discoveries of 0.1\u20130.3 into a single one-page Design Principles document "
    "signed by the client and the PM. Inputs: the module taxonomy (0.1), the persona frustration lists "
    "and journey pain points (0.2), and the Do-Not-Do list (0.3). The 5 High-severity UX risks (R1, R3, "
    "R6, R10, R13) are the priority agenda. No design work begins in Phase 1 until this page is signed.")

doc.save(OUTPUT)
print(f"Saved: {OUTPUT}")
