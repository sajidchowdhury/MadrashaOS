"""
MadrashaOS - Session 0.4 Deliverable: Design Principles & Constraints Lock-In
Phase 0 finale. Portrait A4 — designed as a one-page printable sign-off artifact.
Output: .docx via python-docx
"""
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

OUTPUT = "/home/z/my-project/download/MadrashaOS_Session_0.4_Design_Principles_TechnicalDoc_2026-09-16.docx"

# ---------- Helpers ----------

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
    p.paragraph_format.space_before = Pt(12 if level == 1 else 8)
    p.paragraph_format.space_after = Pt(4)
    run = p.add_run(text); run.bold = True
    if level == 1:
        run.font.size = Pt(15); run.font.color.rgb = RGBColor(0x1F, 0x3A, 0x5F)
    elif level == 2:
        run.font.size = Pt(12); run.font.color.rgb = RGBColor(0x1F, 0x3A, 0x5F)
    else:
        run.font.size = Pt(11); run.font.color.rgb = RGBColor(0x33, 0x33, 0x33)
    return p

def add_para(doc, text, italic=False, size=10.5):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0); p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    p.paragraph_format.line_spacing = 1.25
    run = p.add_run(text); run.font.size = Pt(size); run.italic = italic
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

# ---------- Build Document (Portrait A4) ----------

doc = Document()
for section in doc.sections:
    section.page_width = Cm(21); section.page_height = Cm(29.7)
    section.top_margin = Cm(1.6); section.bottom_margin = Cm(1.6)
    section.left_margin = Cm(1.8); section.right_margin = Cm(1.8)

style = doc.styles['Normal']
style.font.name = 'Calibri'; style.font.size = Pt(10.5)

# Title block
title = doc.add_paragraph()
t_run = title.add_run('MadrashaOS — Design Principles & Constraints Lock-In')
t_run.bold = True; t_run.font.size = Pt(18); t_run.font.color.rgb = RGBColor(0x1F, 0x3A, 0x5F)

sub = doc.add_paragraph()
sub.paragraph_format.space_after = Pt(8)
s_run = sub.add_run('Phase 0 Finale · One-Page Reference · Sign-Off Required Before Phase 1')
s_run.font.size = Pt(11); s_run.italic = True; s_run.font.color.rgb = RGBColor(0x55, 0x55, 0x55)

# Meta strip
meta = doc.add_table(rows=1, cols=4)
set_table_borders(meta)
meta_vals = [
    ('Session', '0.4'),
    ('Phase', '0 \u2014 Discovery (finale)'),
    ('Source', 'SRS v2.0 + Sessions 0.1\u20130.3'),
    ('Exit', 'Signed by Client + PM'),
]
for i, (k, v) in enumerate(meta_vals):
    c = meta.rows[0].cells[i]
    set_cell_margins(c); set_cell_bg(c, 'F2F2F2')
    c.text = ''
    p = c.paragraphs[0]
    r1 = p.add_run(f"{k}: "); r1.bold = True; r1.font.size = Pt(9)
    r2 = p.add_run(v); r2.font.size = Pt(9)
    c.width = Cm(4.4)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 1. Purpose
add_heading(doc, '1. Purpose', 1)
add_para(doc,
    "This document converts the discoveries of Phase 0 (module taxonomy, personas, journey pain points, "
    "and the Do-Not-Do list) into a single binding reference. Once signed by the Client and PM, these "
    "principles and locked-in risk decisions govern every design choice in Phases 1\u20137. No design work "
    "begins in Phase 1 until this page is signed. Changes after sign-off require a written change "
    "request, reviewed by both signatories.")

# 2. Design Principles
add_heading(doc, '2. Design Principles (Locked)', 1)
add_para(doc,
    "Ten principles, each tied to a specific SRS section. Every screen, component, and PDF template "
    "produced in Phases 1\u20137 must satisfy all ten.")

pr_headers = ['#', 'Principle', 'Binding statement', 'SRS / Risk Ref']
pr_rows = [
    ('P1', 'Progressive Disclosure', 'Surface only what the role needs for the current task. Hide, do not disable.', '\u00a75.1, \u00a710.8'),
    ('P2', 'One Primary Action per Screen', 'Secondary actions live in an overflow menu; one CTA per surface.', 'Apple heritage'),
    ('P3', 'Mobile-First by Default', 'Desktop is a wider grid, not a different paradigm. All CRUD reachable on 5-inch phone.', '\u00a75.4, \u00a72.7.4'),
    ('P4', 'Permission-Aware UI', 'Hide unauthorized menus, buttons, fields. Server still enforces authorization.', '\u00a75.1, \u00a72.1.3'),
    ('P5', 'Multi-Language First-Class', 'Bangla + English UI parity; Arabic for designated fields and PDFs; RTL validated.', '\u00a710.6, \u00a72.6.6'),
    ('P6', 'WCAG 2.1 AA', 'Contrast, keyboard nav, screen-reader labels on all core workflows.', '\u00a710.6'),
    ('P7', 'Density Without Clutter', '8pt grid; 4:5 content-to-whitespace ratio; generous whitespace on key actions.', 'Tesla heritage'),
    ('P8', 'Optimistic UI for Mobile', 'Local state for high-frequency mobile flows; idempotent retry on submit.', 'R6, \u00a76.5'),
    ('P9', 'Auditable by Default', 'Every important change produces a field-level audit diff visible in the UI.', '\u00a72.1.4, \u00a73.4'),
    ('P10', 'Brand-Consistent Outputs', 'Receipts, mark sheets, certificates carry the brand kit from Phase 1.1.', 'R13, \u00a72.6.5'),
]
build_table(doc, pr_headers, pr_rows, col_widths_cm=[1.0, 4.0, 10.5, 1.9], font_size=9)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 3. High-Severity Risk Lock-Ins
add_heading(doc, '3. High-Severity Risk Lock-Ins', 1)
add_para(doc,
    "The five High-severity UX risks flagged in Session 0.1 are now resolved with binding decisions. "
    "These decisions are not suggestions \u2014 they are the contract for the listed screens.")

risk_headers = ['Risk', 'Issue', 'Locked Decision', 'Phase']
risk_rows = [
    ('R1', 'Branch switcher loses mid-task context', 'Switching branch opens a fresh tab; current tab keeps its context. Default = user\u2019s primary branch.', 'Phase 4.1'),
    ('R3', 'Zero-permission user lands on empty dashboard', 'Empty state shows \u201cRequest access\u201d CTA + admin contact. No silent dead-ends.', 'Phase 2.3'),
    ('R6', 'Mobile attendance >60s / network drops mid-submit', 'Default Present + one-tap cycle. Optimistic local state. Submit-on-reconnect. 30s undo window. Idempotency-Key on POST.', 'Phase 4.6'),
    ('R10', 'Anonymous donation has no receipt channel', 'Capture email OR mobile (mandatory). Anonymous = checkbox. PDF download on confirmation screen. Honeypot + reCAPTCHA v3.', 'Phase 5.2'),
    ('R13', 'PDF brand kit is unresolved (SRS \u00a711.3)', 'Resolved in Phase 1 Session 1.1 (Brand Kit). No unbranded PDF ships to production. Receipts / mark sheets / certificates ship branded from Phase 5.1.', 'Phase 1.1 + 5.1'),
]
build_table(doc, risk_headers, risk_rows, col_widths_cm=[1.0, 5.0, 9.4, 2.0], font_size=9)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 4. Constraints Inherited from SRS
add_heading(doc, '4. Hard Constraints (Non-Negotiable)', 1)
add_para(doc,
    "The SRS imposes constraints that no design choice may violate. These are reproduced here as the "
    "Phase 0 reference; any design that conflicts with them is rejected at design-QA.")

c_headers = ['#', 'Constraint', 'SRS Ref']
c_rows = [
    ('C1', 'Core tasks reachable in \u22643 clicks.', '\u00a710.8'),
    ('C2', 'Teacher marks attendance on 5-inch phone in <60s for 40 students.', '\u00a72.3.2'),
    ('C3', 'No financial data visible to Teacher role; no academic edit by Accountant.', '\u00a72.1.3'),
    ('C4', 'Permission-denied screens show friendly page, never raw 403.', '\u00a75.5'),
    ('C5', 'No hover-only interactions; all actions reachable by tap.', '\u00a75.4, \u00a72.7.4'),
    ('C6', 'Zakat funds never co-mingle with general funds; UI badges fund scope.', '\u00a73.7'),
    ('C7', 'Requester cannot approve own request; button disabled + API 403.', '\u00a72.7.1'),
    ('C8', 'Public visitor cannot reach any /students, /accounts, /documents endpoint.', '\u00a72.7.3'),
    ('C9', 'Student academic history is never deleted on promotion / transfer.', '\u00a72.2.1'),
    ('C10', 'One-page quick-start per role; error messages actionable, in user\u2019s language.', '\u00a710.8'),
]
build_table(doc, c_headers, c_rows, col_widths_cm=[1.0, 14.4, 2.0], font_size=9)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 5. Phase 1 Kickoff Checklist
add_heading(doc, '5. Phase 1 Kickoff Checklist', 1)
add_para(doc, "Phase 1 (Design System Foundation) begins only after all five items below are confirmed:")
kick_items = [
    "Client and PM have signed this document (Section 6 below).",
    "Stakeholder interviews from Session 0.2 are scheduled (1 representative per role).",
    "Client has named 2\u20133 competing ERPs for the Session 0.3 scorecard.",
    "Client has delivered brand assets (logo, preferred colors, fonts) for Session 1.1.",
    "Do-Not-Do list (Session 0.3, D1\u2013D20) is pinned to the design workspace.",
]
for i, item in enumerate(kick_items, start=1):
    p = doc.add_paragraph(style='List Number')
    p.paragraph_format.space_before = Pt(0); p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.2
    if p.runs: p.runs[0].text = ''
    r = p.add_run(item); r.font.size = Pt(10.5)

doc.add_paragraph().paragraph_format.space_after = Pt(4)

# 6. Sign-Off Block
add_heading(doc, '6. Sign-Off', 1)
add_para(doc,
    "By signing below, the parties confirm that the design principles, risk lock-ins, and hard "
    "constraints above are binding for all UI/UX work in Phases 1\u20137. Changes require a written "
    "change request, reviewed by both signatories.")

sign = doc.add_table(rows=2, cols=2)
set_table_borders(sign)
sign_cells = [
    ('Client (Authority)', 'Project Manager'),
    ('Name: ____________________\nSignature: ____________________\nDate: ____________________', 'Name: ____________________\nSignature: ____________________\nDate: ____________________'),
]
for i, row in enumerate(sign_cells):
    for j, val in enumerate(row):
        c = sign.rows[i].cells[j]
        set_cell_margins(c, top=120, bottom=120)
        if i == 0:
            set_cell_bg(c, '1F3A5F')
            c.text = ''
            p = c.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r = p.add_run(val); r.bold = True; r.font.size = Pt(10); r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        else:
            c.text = ''
            for line in val.split('\n'):
                p = c.add_paragraph()
                p.paragraph_format.space_after = Pt(8)
                r = p.add_run(line); r.font.size = Pt(10.5)
            # remove the empty first paragraph
            first_p = c.paragraphs[0]
            first_p._element.getparent().remove(first_p._element)
        c.width = Cm(8.5)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 7. Next Phase Preview
add_heading(doc, '7. Phase 1 Preview', 1)
add_para(doc,
    "With this page signed, Phase 1 (Design System Foundation, 5 days) begins. Session 1.1 (Brand "
    "Kit) consumes the client-delivered brand assets and resolves Risk R13. Sessions 1.2\u20131.4 build "
    "the token system, the 30-component library, and the icon set on top of the locked design "
    "principles above. Each Phase 1 session re-references this page; any deviation triggers a change "
    "request. Phase 1 exit: a frozen design system that the wireframe and hi-fi sessions in Phases "
    "2\u20134 consume without further design-system decisions.")

doc.save(OUTPUT)
print(f"Saved: {OUTPUT}")
