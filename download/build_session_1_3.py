"""
MadrashaOS - Session 1.3 Deliverable: Component Library v0 (30 components)
Output: .docx via python-docx (landscape A4 for wide tables)
"""
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_LINE_SPACING
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

OUTPUT = "/home/z/my-project/download/MadrashaOS_Session_1.3_Component_Library_TechnicalDoc_2026-09-16.docx"

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

# ---------- Build Document (Landscape A4) ----------

doc = Document()
for section in doc.sections:
    section.page_width = Cm(29.7); section.page_height = Cm(21)
    section.top_margin = Cm(1.6); section.bottom_margin = Cm(1.6)
    section.left_margin = Cm(1.8); section.right_margin = Cm(1.8)

style = doc.styles['Normal']
style.font.name = 'Inter'; style.font.size = Pt(10.5)

# Title
title = doc.add_paragraph()
t_run = title.add_run('MadrashaOS \u2014 Session 1.3 Deliverable: Component Library v0')
t_run.bold = True; t_run.font.size = Pt(18); t_run.font.color.rgb = RGBColor(0x0E, 0x5C, 0x5C)

sub = doc.add_paragraph()
sub.paragraph_format.space_after = Pt(8)
s_run = sub.add_run('30 Atomic Components \u00b7 Variants \u00b7 5 Standard States \u00b7 A11y Contracts \u00b7 Token References')
s_run.font.size = Pt(11); s_run.italic = True; s_run.font.color.rgb = RGBColor(0x55, 0x55, 0x55)

# Meta
meta = doc.add_table(rows=5, cols=2)
set_table_borders(meta)
meta_rows = [
    ('Document', 'MadrashaOS_Session_1.3_Component_Library_TechnicalDoc_2026-09-16'),
    ('Source', 'SRS \u00a75.2 design system; Sessions 1.1 (Brand Kit) + 1.2 (Token System FROZEN)'),
    ('Session', '1.3 \u2014 Component Library v0'),
    ('Phase', '1 \u2014 Design System Foundation'),
    ('Exit Criteria', 'Component spec sheet (props, states, variants) ready for frontend; A1\u2013A8 audit gate passed'),
]
for i, (k, v) in enumerate(meta_rows):
    c0 = meta.rows[i].cells[0]; c1 = meta.rows[i].cells[1]
    set_cell_margins(c0); set_cell_margins(c1); set_cell_bg(c0, 'F2EFE8')
    c0.text = ''; c1.text = ''
    r0 = c0.paragraphs[0].add_run(k); r0.bold = True; r0.font.size = Pt(10)
    r1 = c1.paragraphs[0].add_run(v); r1.font.size = Pt(10)
    c0.width = Cm(4.5); c1.width = Cm(22)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 1. Overview
add_heading(doc, '1. Overview', 1)
add_para(doc,
    "This deliverable specifies the 30 atomic components used across every module in SRS Part 2. "
    "Each component is paired with its variant list, the 5 standard states, its accessibility role, "
    "and a binding reference to the frozen tokens from Session 1.2. Per the consumption rules R-T1 to "
    "R-T10, components reference tokens only \u2014 raw hex or px values are forbidden in the library. "
    "Every component must pass the 8-point token audit (A1\u2013A8) before it merges. The spec sheet is "
    "the binding handoff for the frontend developer in Phase 7.2.")

# 2. Component Inventory (master table)
add_heading(doc, '2. Component Inventory (30 components)', 1)

inv_headers = ['#', 'Component', 'Category', 'Variants', 'A11y Role', 'Used in (key modules)']
inv_rows = [
    # Buttons & Actions (3)
    ('1', 'Button', 'Action', 'primary / secondary / ghost / danger \u00d7 sm/md/lg', 'button', 'All modules'),
    ('2', 'ButtonGroup', 'Action', 'segmented / joined', 'group', 'Filters, dashboards, bulk actions'),
    ('3', 'IconButton', 'Action', 'default / ghost / danger', 'button', 'Tables, cards, nav'),
    # Form Controls (8)
    ('4', 'TextInput', 'Form', 'text / password / search; helper / error', 'textbox', 'All forms'),
    ('5', 'NumberInput', 'Form', 'with stepper / plain; min/max validation', 'spinbutton', 'Fees, marks, qty, balances'),
    ('6', 'DateInput', 'Form', 'date / datetime; Bangla calendar toggle', 'combobox', 'Attendance, fees, exams, reports'),
    ('7', 'Select', 'Form', 'single / multi / searchable / async', 'combobox / listbox', 'Branch, class, student, account'),
    ('8', 'Textarea', 'Form', 'autoresize / fixed; char counter', 'textbox', 'Narrations, reasons, notes'),
    ('9', 'Checkbox', 'Form', 'single / indeterminate / group', 'checkbox', 'Permission matrix, multi-select'),
    ('10', 'RadioGroup', 'Form', 'inline / stacked; cards variant', 'radiogroup', 'Method, status, type pickers'),
    ('11', 'Switch', 'Form', 'sm / md; with label', 'switch', 'Module toggles, settings'),
    # Navigation (4)
    ('12', 'Tabs', 'Navigation', 'underline / pill / segmented; counts', 'tablist', 'Student profile, dashboards'),
    ('13', 'Breadcrumb', 'Navigation', 'icon+text / text; collapsible', 'navigation', 'Every page header'),
    ('14', 'Pagination', 'Navigation', 'numbers / load-more; total count', 'navigation', 'All list tables'),
    ('15', 'Menu / Dropdown', 'Navigation', 'simple / multi-level; with icons', 'menu', 'Row actions, user menu, overflow'),
    # Data Display (5)
    ('16', 'Table', 'Data', 'sortable / paginated / sticky / selectable', 'grid', 'All list views (primary surface)'),
    ('17', 'Badge', 'Data', 'neutral / success / warning / danger', 'status', 'Status, role, count chips'),
    ('18', 'Chip', 'Data', 'removable / static / filter', 'button (if removable)', 'Filters, applied facets'),
    ('19', 'Avatar', 'Data', 'image / initials / icon; sizes', 'img', 'Users, students, teachers, guardians'),
    ('20', 'Card', 'Data', 'flat / elevated / interactive', 'group / article', 'Dashboards, profile summary'),
    # Feedback (5)
    ('21', 'Modal / Dialog', 'Feedback', 'sm / md / lg / fullscreen; dismissable', 'dialog', 'Confirm, edit, wizards'),
    ('22', 'Drawer', 'Feedback', 'right / left / bottom; sm / md / lg', 'dialog', 'Quick edit, detail view, filters'),
    ('23', 'Toast', 'Feedback', 'success / warning / danger / info; auto-dismiss', 'status / alert', 'Every save / submit'),
    ('24', 'Tooltip', 'Feedback', 'top / right / bottom / left; rich', 'tooltip', 'Icon labels, table column hints'),
    ('25', 'Spinner', 'Feedback', 'sm / md / lg; overlay variant', 'status / img', 'Async operations, page loads'),
    # Layout & State (5)
    ('26', 'Skeleton', 'Layout', 'text / rect / circle / table-row', 'status / img', 'Loading states per SRS \u00a75.5'),
    ('27', 'EmptyState', 'Layout', 'with CTA / without CTA; illustration', 'status', 'Empty lists, no-permission (R3)'),
    ('28', 'Alert / Callout', 'Feedback', 'info / success / warning / danger', 'alert', 'Form-level errors, banners'),
    ('29', 'FilterBar', 'Layout', 'inline / collapsible; save preset', 'group', 'List headers, reports'),
    ('30', 'FieldRow', 'Layout', 'stacked / inline; with helper / error', 'group', 'Every form (layout primitive)'),
]
build_table(doc, inv_headers, inv_rows, col_widths_cm=[0.8, 3.0, 1.8, 6.0, 2.5, 12.4], font_size=8.5)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 3. State System
add_heading(doc, '3. State System (5 standard states, every interactive component)', 1)
add_para(doc,
    "Every interactive component implements all 5 states. Visual treatment is binding and uses only "
    "frozen tokens. A component cannot merge into the library unless all 5 states are designed.")

state_headers = ['State', 'Visual treatment', 'Token reference']
state_rows = [
    ('default', 'Resting appearance; standard background + foreground', 'e.g. button.primary.background = color.action.primary'),
    ('hover', 'Slight darken / lighten; cursor pointer', 'color.primary.600 (one step darker than 500)'),
    ('active / pressed', 'Stronger darken + elevation 0 (sinks in)', 'color.primary.700 + elevation.0'),
    ('focus', 'Visible focus ring (WCAG 2.4.7); 2px outline offset', 'outline 2px solid color.primary.500; offset 2px'),
    ('disabled', '50% opacity; cursor not-allowed; no hover effect', 'opacity 0.5; foreground = color.neutral.500'),
]
build_table(doc, state_headers, state_rows, col_widths_cm=[3.0, 8.5, 14.5], font_size=9)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 4. Variants Deep-Dive: Button
add_heading(doc, '4. Variants Deep-Dive: Button', 2)
add_para(doc,
    "Button is the highest-traffic component. The variant matrix below is the binding spec for "
    "every Button instance in Phases 2\u20134.")

btn_headers = ['Variant', 'Background', 'Foreground', 'Border', 'Use']
btn_rows = [
    ('primary', 'color.primary.500', 'color.primary.foreground (#FFF)', 'none', 'Main CTA per screen (P2)'),
    ('secondary', 'color.neutral.0', 'color.primary.500', '1px solid color.primary.500', 'Secondary actions'),
    ('ghost', 'transparent', 'color.neutral.700', 'none', 'Tertiary actions, toolbar'),
    ('danger', 'color.semantic.danger', 'color.semantic.danger.foreground', 'none', 'Delete, destructive confirm'),
    ('link', 'transparent', 'color.primary.500', 'none', 'Inline actions in text'),
]
build_table(doc, btn_headers, btn_rows, col_widths_cm=[2.5, 4.5, 6.0, 5.0, 8.0], font_size=9)

add_para(doc, "Size matrix (applies to all variants):", italic=True)
size_headers = ['Size', 'Height', 'Padding X', 'Font', 'Icon gap', 'Radius']
size_rows = [
    ('sm', '32px', 'spacing.scale.3 (12)', 'type_scale.caption (12/400)', '4px', 'radius.md (6)'),
    ('md', '40px', 'spacing.scale.4 (16)', 'type_scale.body (14/500)', '8px', 'radius.md (6)'),
    ('lg', '48px', 'spacing.scale.5 (20)', 'type_scale.subtitle (16/500)', '8px', 'radius.lg (8)'),
]
build_table(doc, size_headers, size_rows, col_widths_cm=[2.0, 2.5, 5.0, 7.0, 3.5, 3.0], font_size=9)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 5. Variants Deep-Dive: Input
add_heading(doc, '5. Variants Deep-Dive: Input', 2)
add_para(doc,
    "Inputs pair a label (always visible \u2014 no placeholder-only), an optional helper, and an inline "
    "error state. Helper and error swap visibility by state (helper hides when error shows).")

in_headers = ['State', 'Border', 'Background', 'Helper color', 'Error color']
in_rows = [
    ('default', '1px color.neutral.300', 'color.neutral.0', 'color.neutral.500', '\u2014'),
    ('focus', '2px color.primary.500', 'color.neutral.0', 'color.neutral.500', '\u2014'),
    ('error', '1px color.semantic.danger', 'color.semantic.danger.50', '\u2014 (hidden)', 'color.semantic.danger'),
    ('disabled', '1px color.neutral.200', 'color.neutral.50', 'color.neutral.400', '\u2014'),
]
build_table(doc, in_headers, in_rows, col_widths_cm=[2.5, 5.0, 5.5, 5.0, 6.5], font_size=9)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 6. Variants Deep-Dive: Table
add_heading(doc, '6. Variants Deep-Dive: Table (the primary surface)', 2)
add_para(doc,
    "Table is the single most-used component \u2014 every list view across Students, Fees, Inventory, "
    "Ledger, Audit, Approvals, etc. uses it. Spec below is binding for all 40+ module list screens.")

tbl_headers = ['Feature', 'Spec', 'Token / value']
tbl_rows = [
    ('Header row', 'Sticky on vertical scroll; bold; bg color.neutral.50', 'color.neutral.50 + type_scale.subtitle'),
    ('Body row (default)', '44px height; bg color.neutral.0', 'spacing.scale.5 (height 44 = 40 + 4 padding)'),
    ('Body row (hover)', 'bg color.primary.50', 'color.primary.50'),
    ('Body row (selected)', 'bg color.primary.50 + left border 3px color.primary.500', 'color.primary.50 + color.primary.500'),
    ('Body row (striped)', 'Alternate bg color.neutral.50 (opt-in; off by default)', 'color.neutral.50'),
    ('Cell padding', '12px horizontal \u00d7 8px vertical', 'spacing.scale.3 \u00d7 spacing.scale.2'),
    ('Sort indicator', 'Chevron up/down next to column header; default neutral, active primary', 'color.neutral.400 / color.primary.500'),
    ('Empty state', 'Renders EmptyState component inline (never a blank table)', 'EmptyState component (Phase 1.3 #27)'),
    ('Loading state', 'Renders Skeleton row \u00d7 N (where N = page size); never a global spinner', 'Skeleton component (Phase 1.3 #26)'),
    ('Density toggle', 'Comfortable / Compact (row 44px / 32px); persisted per user', 'spacing.scale.5 / spacing.scale.4'),
    ('Row actions', 'Trailing IconButton group; collapses into overflow Menu on <1280px', 'IconButton + Menu'),
    ('Pagination', 'Bottom-right; numbers variant; shows total + range', 'Pagination component (Phase 1.3 #14)'),
]
build_table(doc, tbl_headers, tbl_rows, col_widths_cm=[3.5, 13.5, 9.5], font_size=9)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 7. Accessibility Contracts
add_heading(doc, '7. Accessibility Contracts (WCAG 2.1 AA per Principle P6)', 1)
add_para(doc,
    "Every component ships with its accessibility contract. Frontend implementation must satisfy "
    "these or the component fails design QA.")

a11y_headers = ['Category', 'Keyboard', 'Screen reader', 'Contrast']
a11y_rows = [
    ('Buttons & Actions', 'Enter / Space activates; Tab moves focus', 'aria-label on IconButton; aria-pressed on toggle', '\u22654.5:1 on text; \u22653:1 on UI'),
    ('Form Controls', 'Tab between fields; Enter submits form', 'label tied via for/id; aria-describedby for helper/error', 'Helper text \u22654.5:1'),
    ('Navigation (Tabs)', 'Arrow keys move; Tab to panel', 'role=tablist; aria-selected', 'Active tab \u22654.5:1'),
    ('Data (Table)', 'Arrow keys traverse cells; Enter opens row', 'scope=col on headers; aria-sort on sortable', 'Header text \u22654.5:1'),
    ('Feedback (Modal)', 'Focus trap; Esc closes; return focus to trigger', 'role=dialog; aria-modal=true; aria-labelledby', 'Overlay bg \u2265 4.5:1 contrast vs content'),
    ('Layout (EmptyState)', 'CTA reachable via Tab', 'aria-label describing the empty context', 'Headline \u22654.5:1'),
]
build_table(doc, a11y_headers, a11y_rows, col_widths_cm=[3.5, 6.5, 8.0, 8.0], font_size=9)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 8. Component Audit Gate
add_heading(doc, '8. Component Audit Gate (binding)', 1)
add_para(doc,
    "Before any component merges into the Figma library or the frontend codebase, it must pass the "
    "8-point token audit defined in Session 1.2 (A1\u2013A8). The component owner runs the audit; the "
    "design lead reviews and signs. Failed audits block the merge \u2014 no exceptions, even for "
    "fast-follow iterations.")

gate_headers = ['Gate', 'Check', 'Pass criterion']
gate_rows = [
    ('A1', 'Zero raw hex / px / hardcoded font', 'All values reference tokens'),
    ('A2', 'No primitive token used directly in component', 'Use a component-level alias'),
    ('A3', 'Spacing on the 8pt scale', 'No off-grid values'),
    ('A4', 'Font sizes from the 6-step type scale', 'No in-between sizes'),
    ('A5', 'Border-radius from radius.* tokens', 'No one-off corners'),
    ('A6', 'Shadows from elevation.* tokens', 'No custom box-shadow strings'),
    ('A7', 'Transitions reference motion.duration + motion.easing together', 'Never duration alone'),
    ('A8', 'All 5 states designed + audited', 'default / hover / active / focus / disabled'),
]
build_table(doc, gate_headers, gate_rows, col_widths_cm=[1.2, 9.5, 15.5], font_size=9)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 9. Exit Criteria
add_heading(doc, '9. Session 1.3 Exit Criteria Check', 1)
add_para(doc,
    "Per the plan, Session 1.3 is complete when the component spec sheet (props, states, variants) "
    "is ready for the frontend. This is satisfied by: (a) the 30-component inventory in Section 2; "
    "(b) the 5-state system in Section 3; (c) the variant deep-dives for Button (Section 4), Input "
    "(Section 5), and Table (Section 6) covering the three highest-traffic components; (d) the "
    "accessibility contracts in Section 7 covering all 6 categories; (e) the audit gate in Section 8 "
    "binding every component merge to the A1\u2013A8 checklist from Session 1.2. The frontend developer "
    "(Phase 7.2) consumes this spec to build each component without re-asking the designer.")

# 10. Next Session
add_heading(doc, '10. Next Session: 1.4 \u2014 Iconography & Illustration', 1)
add_para(doc,
    "Session 1.4 produces the 200+ icon set (24/20/16px, stroke-based, RTL-aware) and 5 empty-state "
    "illustrations (students, fees, attendance, inventory, results). The icons feed into IconButton "
    "(component #3), Menu (#15), Breadcrumb (#13), Table row actions, and every empty state. The 5 "
    "illustrations feed into the EmptyState component (#27) designed in this session. After 1.4, "
    "Phase 1 closes and Phase 2 (Information Architecture) begins with the dynamic nav model that "
    "consumes the component library directly.")

doc.save(OUTPUT)
print(f"Saved: {OUTPUT}")
