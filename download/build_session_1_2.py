"""
MadrashaOS - Session 1.2 Deliverable: Token System (Freeze + Governance)
Output: .docx via python-docx (portrait A4)
"""
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_LINE_SPACING
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

OUTPUT = "/home/z/my-project/download/MadrashaOS_Session_1.2_Token_System_TechnicalDoc_2026-09-16.docx"

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
        run.font.size = Pt(15); run.font.color.rgb = RGBColor(0x0E, 0x5C, 0x5C)
    elif level == 2:
        run.font.size = Pt(12); run.font.color.rgb = RGBColor(0x0E, 0x5C, 0x5C)
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

def add_bullet(doc, text):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_before = Pt(0); p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.2
    if p.runs: p.runs[0].text = ''
    r = p.add_run(text); r.font.size = Pt(11)
    return p

def build_table(doc, headers, rows, col_widths_cm=None, header_bg='0E5C5C', zebra=True, font_size=9):
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

def add_code_block(doc, code_text):
    t = doc.add_table(rows=1, cols=1)
    set_table_borders(t)
    c = t.rows[0].cells[0]
    set_cell_margins(c, top=80, bottom=80, left=120, right=120)
    set_cell_bg(c, 'F5F5F2')
    c.text = ''
    for line in code_text.split('\n'):
        p = c.add_paragraph()
        p.paragraph_format.space_before = Pt(0); p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1.15
        r = p.add_run(line if line else ' ')
        r.font.name = 'Consolas'; r.font.size = Pt(8.5)
    first_p = c.paragraphs[0]
    first_p._element.getparent().remove(first_p._element)
    return t

# ---------- Build Document ----------

doc = Document()
for section in doc.sections:
    section.page_width = Cm(21); section.page_height = Cm(29.7)
    section.top_margin = Cm(1.8); section.bottom_margin = Cm(1.8)
    section.left_margin = Cm(2); section.right_margin = Cm(2)

style = doc.styles['Normal']
style.font.name = 'Inter'; style.font.size = Pt(10.5)

# Title
title = doc.add_paragraph()
t_run = title.add_run('MadrashaOS \u2014 Session 1.2 Deliverable: Token System')
t_run.bold = True; t_run.font.size = Pt(18); t_run.font.color.rgb = RGBColor(0x0E, 0x5C, 0x5C)

sub = doc.add_paragraph()
sub.paragraph_format.space_after = Pt(8)
s_run = sub.add_run('Freeze Notice \u00b7 Token Hierarchy \u00b7 Consumption Rules \u00b7 Versioning Policy')
s_run.font.size = Pt(11); s_run.italic = True; s_run.font.color.rgb = RGBColor(0x55, 0x55, 0x55)

# Meta
meta = doc.add_table(rows=5, cols=2)
set_table_borders(meta)
meta_rows = [
    ('Document', 'MadrashaOS_Session_1.2_Token_System_TechnicalDoc_2026-09-16'),
    ('Source of Truth', 'MadrashaOS_Session_1.1_Brand_Kit_Tokens.json v1.0.0 (now FROZEN)'),
    ('Session', '1.2 \u2014 Token System'),
    ('Phase', '1 \u2014 Design System Foundation'),
    ('Exit Criteria', 'Tokens freeze; downstream components must reference tokens, never raw values'),
]
for i, (k, v) in enumerate(meta_rows):
    c0 = meta.rows[i].cells[0]; c1 = meta.rows[i].cells[1]
    set_cell_margins(c0); set_cell_margins(c1); set_cell_bg(c0, 'F2EFE8')
    c0.text = ''; c1.text = ''
    r0 = c0.paragraphs[0].add_run(k); r0.bold = True; r0.font.size = Pt(10)
    r1 = c1.paragraphs[0].add_run(v); r1.font.size = Pt(10)
    c0.width = Cm(4.5); c1.width = Cm(12.5)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 1. Overview
add_heading(doc, '1. Overview', 1)
add_para(doc,
    "This document freezes the token tree drafted in Session 1.1 and establishes the governance rules "
    "every downstream session (1.3 components, 1.4 icons, Phases 2\u20134 wireframes/hi-fi, Phase 7 frontend "
    "handoff) must obey. From the moment this page is signed, components reference tokens only \u2014 raw "
    "hex, px, or hardcoded font values are forbidden in any Figma component or frontend code. The "
    "MadrashaOS_Session_1.1_Brand_Kit_Tokens.json file is now the single source of truth at version "
    "1.0.0 and is treated as frozen; changes require the policy in Section 6.")

# 2. Freeze Notice
add_heading(doc, '2. Freeze Notice', 1)
add_para(doc,
    "Effective immediately, the token file is FROZEN at v1.0.0. The values listed in the inventory "
    "below are binding. Adding tokens is allowed (Section 6) only when an existing token cannot "
    "express the need; changing existing values requires a version bump and a change request.")

freeze_headers = ['Token Category', 'Count', 'Status', 'Source File']
freeze_rows = [
    ('color.primary', '11 steps (50\u2013900 + DEFAULT + foreground)', '\U0001F512 Frozen', 'tokens.json \u2192 color.primary'),
    ('color.accent', '4 steps (DEFAULT + 50/100/700 + foreground)', '\U0001F512 Frozen', 'tokens.json \u2192 color.accent'),
    ('color.neutral', '12 steps (0\u2013950)', '\U0001F512 Frozen', 'tokens.json \u2192 color.neutral'),
    ('color.semantic', '4 (success/warning/danger/info \u00d7 DEFAULT + 50 + foreground)', '\U0001F512 Frozen', 'tokens.json \u2192 color.semantic'),
    ('typography.font_family', '5 stacks (bangla/english/arabic/mono/default)', '\U0001F512 Frozen', 'tokens.json \u2192 typography.font_family'),
    ('typography.type_scale', '6 steps (caption\u2192display)', '\U0001F512 Frozen', 'tokens.json \u2192 typography.type_scale'),
    ('typography.weights', '4 (regular/medium/semibold/bold)', '\U0001F512 Frozen', 'tokens.json \u2192 typography.weights'),
    ('spacing', '8pt unit + 14-step scale (0\u2013128 px)', '\U0001F512 Frozen', 'tokens.json \u2192 spacing'),
    ('radius', '6 (sm 4 \u2192 full 9999)', '\U0001F512 Frozen', 'tokens.json \u2192 radius'),
    ('elevation', '6 (0\u20135) tuned for warm-neutral undertone', '\U0001F512 Frozen', 'tokens.json \u2192 elevation'),
    ('motion.duration', '3 (fast 150ms / normal 250ms / slow 400ms)', '\U0001F512 Frozen', 'tokens.json \u2192 motion.duration'),
    ('motion.easing', '3 (standard / decelerate / accelerate)', '\U0001F512 Frozen', 'tokens.json \u2192 motion.easing'),
    ('breakpoints', '5 (sm 375 / md 768 / lg 1280 / xl 1440 / 2xl 1920)', '\U0001F512 Frozen', 'tokens.json \u2192 breakpoints'),
    ('grid', '12-col, max 1280 px, gutter 24 px, margin 16 px', '\U0001F512 Frozen', 'tokens.json \u2192 grid'),
]
build_table(doc, freeze_headers, freeze_rows, col_widths_cm=[4.0, 6.0, 2.5, 4.5], font_size=9)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 3. Token Hierarchy
add_heading(doc, '3. Token Hierarchy (Primitive \u2192 Semantic \u2192 Component)', 1)
add_para(doc,
    "Tokens are organized in three layers. Lower layers are stable; higher layers reference lower ones. "
    "Components in Phase 1.3 may only reference Semantic or Component-level tokens \u2014 never Primitive.")

hier_headers = ['Layer', 'Purpose', 'Example', 'Editable by']
hier_rows = [
    ('Primitive', 'Raw values (the only place raw hex / px live)', 'color.primary.500 = #0E5C5C', 'Design lead only'),
    ('Semantic', 'Role-based aliases pointing at primitives', 'color.button.primary = color.primary.500', 'Design lead only'),
    ('Component', 'Component-specific tokens pointing at semantic', 'button.primary.background = color.button.primary', 'Component owner (Phase 1.3+)'),
]
build_table(doc, hier_headers, hier_rows, col_widths_cm=[2.5, 6.0, 6.0, 3.0], font_size=9)

add_para(doc,
    "Worked example of the chain (a primary button in the fee-collection form):", italic=True)
example_code = """// Primitive (FROZEN \u2014 Session 1.1)
"color.primary.500": "#0E5C5C"

// Semantic (alias \u2014 Session 1.2 freeze)
"color.action.primary": "{color.primary.500}"

// Component (declared in Phase 1.3)
"button.primary.background":  "{color.action.primary}"
"button.primary.foreground":  "{color.primary.foreground}"
"button.primary.padding_x":   "{spacing.scale.4}"   // 16px
"button.primary.radius":      "{radius.md}"          // 6px
"button.primary.elevation":  "{elevation.1}"

// Frontend usage (Phase 7) \u2014 NEVER raw values
<button class="bg-button-primary-background text-button-primary-foreground ...">
  Collect Payment
</button>"""
add_code_block(doc, example_code)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 4. Naming Convention
add_heading(doc, '4. Naming Convention', 1)
add_bullet(doc, "Lowercase, dot-notation, no underscores: color.primary.500 (not Color_Primary_500).")
add_bullet(doc, "Scale suffixes use 50, 100, 200\u2026900, 950 (Tailwind-compatible).")
add_bullet(doc, "DEFAULT is a reserved alias within each scale (color.primary.DEFAULT = color.primary.500).")
add_bullet(doc, "foreground always pairs with a color token to declare the readable text color on that surface.")
add_bullet(doc, "Component tokens are prefixed by the component name: button.primary.*, input.error.*, table.row.*.")
add_bullet(doc, "No abbreviations: spacing.scale.4 (not sp.4); motion.duration.fast (not dur.f).")
add_bullet(doc, "Boolean states (hover, focus, active, disabled) are sub-keys, not suffixes: button.primary.hover.background.")

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 5. Consumption Rules
add_heading(doc, '5. Consumption Rules (binding from today)', 1)
add_para(doc,
    "From this session forward, every Figma component and every line of frontend code must reference "
    "tokens. Raw values are forbidden outside the token file itself. The following table is the "
    "binding rulebook; design QA in Phase 6 and the design-QA contract in Phase 7 enforce it.")

rule_headers = ['Rule', 'Forbidden', 'Required']
rule_rows = [
    ('R-T1', 'Hardcoded hex (#0E5C5C) in a component', 'Reference color.* token'),
    ('R-T2', 'Hardcoded px (24px) for spacing', 'Reference spacing.scale.* token'),
    ('R-T3', 'Hardcoded px for font-size (e.g. 14px)', 'Reference typography.type_scale.* token'),
    ('R-T4', 'Hardcoded font-family string in CSS', 'Reference typography.font_family.* token'),
    ('R-T5', 'Hardcoded border-radius (e.g. 6px)', 'Reference radius.* token'),
    ('R-T6', 'Hardcoded box-shadow', 'Reference elevation.* token'),
    ('R-T7', 'Hardcoded transition: 250ms ease', 'Reference motion.duration.* + motion.easing.*'),
    ('R-T8', 'Component uses primitive token directly', 'Add a component-level alias; reference that'),
    ('R-T9', 'New color introduced without a token', 'Add token first, then use'),
    ('R-T10', 'Magic numbers in code (e.g. 240)', 'Replace with a named token; if none exists, add one'),
]
build_table(doc, rule_headers, rule_rows, col_widths_cm=[1.4, 6.8, 8.8], font_size=9)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 6. Change & Versioning Policy
add_heading(doc, '6. Change & Versioning Policy', 1)
add_para(doc,
    "The token file follows semantic versioning: MAJOR.MINOR.PATCH. Bumps are gated by the change "
    "type. All changes are tracked in CHANGELOG and announced to all session owners.")

ver_headers = ['Change Type', 'Version Bump', 'Examples', 'Approval']
ver_rows = [
    ('Add token', 'MINOR (1.0.0 \u2192 1.1.0)', 'New component alias; new semantic role', 'Design lead'),
    ('Deprecate token', 'MINOR + deprecation flag', 'Old alias marked deprecated; removed in next MAJOR', 'Design lead'),
    ('Rename token', 'MAJOR (1.x \u2192 2.0.0)', 'Renaming breaks consumers \u2014 codemod required', 'Design lead + PM'),
    ('Change value of frozen token', 'MAJOR', 'primary.500 changes from #0E5C5C to a new hex', 'Design lead + PM + Client sign-off'),
    ('Fix typo in token name (no value change)', 'PATCH (1.0.0 \u2192 1.0.1)', 'Spelling only; no consumer impact', 'Design lead'),
]
build_table(doc, ver_headers, ver_rows, col_widths_cm=[4.0, 3.5, 5.5, 4.0], font_size=9)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 7. Token Audit Checklist
add_heading(doc, '7. Token Audit Checklist (for design QA)', 1)
add_para(doc,
    "Run this 8-point checklist on every component before it merges into the library (Phase 1.3) and "
    "before any screen is signed off (Phase 6). Failure on any item blocks merge.")
audit_items = [
    "A1: Component references tokens only \u2014 zero raw hex / px / hardcoded font.",
    "A2: Every color used maps to a semantic or component token (not a primitive directly).",
    "A3: Spacing values come from the spacing.scale array; no off-grid values.",
    "A4: Font sizes come from the 6-step type scale; no in-between values (e.g. 15px).",
    "A5: Border-radius uses radius.* tokens; no one-off rounded corners.",
    "A6: Shadows use elevation.* tokens; no custom box-shadow strings.",
    "A7: Transitions reference motion.duration.* + motion.easing.* together; never one alone.",
    "A8: New tokens (if any were added) are documented in CHANGELOG and announced.",
]
for i in audit_items:
    p = doc.add_paragraph(style='List Number')
    p.paragraph_format.space_before = Pt(0); p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.2
    if p.runs: p.runs[0].text = ''
    r = p.add_run(i); r.font.size = Pt(10.5)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 8. Exit Criteria
add_heading(doc, '8. Session 1.2 Exit Criteria Check', 1)
add_para(doc,
    "Per the plan, Session 1.2 is complete when tokens freeze and downstream components must "
    "reference tokens, never raw values. This is satisfied by: (a) the freeze notice in Section 2 "
    "applying to all 14 token categories from Session 1.1; (b) the binding 10-rule consumption rulebook "
    "in Section 5 (R-T1 through R-T10); (c) the versioning policy in Section 6 preventing silent value "
    "changes; (d) the 8-point audit checklist in Section 7 enforceable at design QA. The companion "
    "JSON file (MadrashaOS_Session_1.1_Brand_Kit_Tokens.json v1.0.0) is now the single source of "
    "truth, treated as frozen. Future additions follow the Section 6 policy.")

# 9. Next Session
add_heading(doc, '9. Next Session: 1.3 \u2014 Component Library v0', 1)
add_para(doc,
    "Session 1.3 builds the 30 atomic components used across all 40+ modules: buttons (3 sizes \u00d7 5 "
    "states), inputs (text/number/date/select/textarea with label/helper/error), table (sortable, "
    "paginated, sticky header, row actions), plus modal, drawer, toast, tabs, breadcrumb, badge, chip, "
    "card, skeleton, empty state, and form layout primitives. Every component will reference the "
    "frozen tokens only \u2014 the audit checklist in Section 7 is the binding gate before any component "
    "merges into the library.")

doc.save(OUTPUT)
print(f"Saved: {OUTPUT}")
