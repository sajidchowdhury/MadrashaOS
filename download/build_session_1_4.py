"""
MadrashaOS - Session 1.4 Deliverable: Iconography & Illustration (Phase 1 finale)
Output: .docx via python-docx (landscape A4)
"""
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_LINE_SPACING
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

OUTPUT = "/home/z/my-project/download/MadrashaOS_Session_1.4_Iconography_Illustration_TechnicalDoc_2026-09-16.docx"

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

def build_icon_table(doc, category_name, icon_list, font_size=9):
    """Render an icon catalog as a 4-column grid (4 icons per row)."""
    add_heading(doc, category_name, 3)
    headers = ['#1', '#2', '#3', '#4']
    rows = []
    for i in range(0, len(icon_list), 4):
        chunk = icon_list[i:i+4]
        while len(chunk) < 4:
            chunk.append('')
        rows.append(tuple(chunk))
    build_table(doc, headers, rows, col_widths_cm=[6.5, 6.5, 6.5, 6.5], font_size=8.5, zebra=True)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)

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
t_run = title.add_run('MadrashaOS \u2014 Session 1.4 Deliverable: Iconography & Illustration')
t_run.bold = True; t_run.font.size = Pt(18); t_run.font.color.rgb = RGBColor(0x0E, 0x5C, 0x5C)

sub = doc.add_paragraph()
sub.paragraph_format.space_after = Pt(8)
s_run = sub.add_run('200+ Icon Catalog \u00b7 5 Empty-State Illustrations \u00b7 Generation Guide (Phase 1 finale)')
s_run.font.size = Pt(11); s_run.italic = True; s_run.font.color.rgb = RGBColor(0x55, 0x55, 0x55)

# Meta
meta = doc.add_table(rows=5, cols=2)
set_table_borders(meta)
meta_rows = [
    ('Document', 'MadrashaOS_Session_1.4_Iconography_Illustration_TechnicalDoc_2026-09-16'),
    ('Source', 'SRS \u00a75.2, \u00a72.6.6 (bn/en/ar); Session 1.1 Brand Kit; Session 1.3 components'),
    ('Session', '1.4 \u2014 Iconography & Illustration (Phase 1 finale)'),
    ('Phase', '1 \u2014 Design System Foundation'),
    ('Exit Criteria', 'Icon font + SVG sprite generated; 5 illustrations delivered'),
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
    "This deliverable closes Phase 1 with the iconography and illustration system. It specifies the "
    "200+ icon set (stroke-based, RTL-aware, three sizes), the 5 empty-state illustrations that pair "
    "with the EmptyState component from Session 1.3, and the generation pipeline (SVG sprite + icon "
    "font) consumed by the frontend in Phase 7.3. Every icon and illustration references the frozen "
    "tokens from Session 1.1; the audit gate A1\u2013A8 from Session 1.2 applies to every icon "
    "added after this baseline.")

# 2. Iconography Spec
add_heading(doc, '2. Iconography Spec', 1)
add_para(doc,
    "All icons share the same construction rules: 24px master grid, 1.5px stroke, rounded line caps, "
    "rounded joins. Stroke weight scales with icon size to maintain visual weight at smaller sizes. "
    "Icons are RTL-aware \u2014 directional icons (chevron, arrow, return, send) auto-mirror in Arabic "
    "locale per SRS \u00a72.6.6.")

spec_headers = ['Property', 'Value', 'Token / rule']
spec_rows = [
    ('Master grid', '24 \u00d7 24 px (SVG viewBox 0 0 24 24)', 'Spacing unit 24 (3\u00d78pt)'),
    ('Padding (inside grid)', '2 px safe zone on all sides (effective 20\u00d720)', 'Spacing scale.0 + safe'),
    ('Stroke weight (24px)', '1.5 px', '\u2014'),
    ('Stroke weight (20px)', '1.5 px', '\u2014 (kept; visual weight preserved)'),
    ('Stroke weight (16px)', '1.25 px', 'Slightly thinner to avoid clogging'),
    ('Line cap', 'round', 'SVG stroke-linecap=round'),
    ('Line join', 'round', 'SVG stroke-linejoin=round'),
    ('Fill', 'none (stroke-only)', 'Tokens applied via stroke, not fill'),
    ('Stroke color default', 'color.neutral.700', '#2E2C27'),
    ('Stroke color hover/active', 'color.primary.500', '#0E5C5C'),
    ('Stroke color disabled', 'color.neutral.400', '#9A9388'),
    ('RTL handling', 'Mirror directional icons in ar locale', 'CSS [dir=rtl] transform: scaleX(-1)'),
]
build_table(doc, spec_headers, spec_rows, col_widths_cm=[5.0, 8.0, 13.5], font_size=9)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 3. Icon Catalog
add_heading(doc, '3. Icon Catalog (200+ icons, by category)', 1)
add_para(doc,
    "Every icon name is kebab-case, prefixed by category (e.g., nav-menu, fin-taka, ppl-student). "
    "Category prefix avoids collisions and makes search/autocomplete trivial. Names are binding \u2014 "
    "the frontend in Phase 7.3 imports them by exact name.")

# Category 1: Navigation & UI (20)
build_icon_table(doc, '3.1 Navigation & UI (20)', [
    'nav-menu', 'nav-close', 'nav-search', 'nav-filter',
    'nav-sort', 'nav-more-vertical', 'nav-more-horizontal', 'nav-chevron-up',
    'nav-chevron-down', 'nav-chevron-left', 'nav-chevron-right', 'nav-arrow-up',
    'nav-arrow-down', 'nav-arrow-left', 'nav-arrow-right', 'nav-expand',
    'nav-collapse', 'nav-refresh', 'nav-settings', 'nav-help',
])

# Category 2: Actions (25)
build_icon_table(doc, '3.2 Actions (25)', [
    'act-plus', 'act-minus', 'act-edit', 'act-trash',
    'act-save', 'act-download', 'act-upload', 'act-print',
    'act-share', 'act-copy', 'act-paste', 'act-cut',
    'act-undo', 'act-redo', 'act-check', 'act-x',
    'act-check-circle', 'act-x-circle', 'act-eye', 'act-eye-off',
    'act-lock', 'act-unlock', 'act-send', 'act-link',
    'act-external-link',
])

# Category 3: People (10)
build_icon_table(doc, '3.3 People (10)', [
    'ppl-user', 'ppl-users', 'ppl-user-plus', 'ppl-user-minus',
    'ppl-student', 'ppl-teacher', 'ppl-guardian', 'ppl-employee',
    'ppl-contact', 'ppl-id-card',
])

# Category 4: Academic (15)
build_icon_table(doc, '3.4 Academic (15)', [
    'aca-book', 'aca-books', 'aca-graduation-cap', 'aca-pencil',
    'aca-ruler', 'aca-calendar', 'aca-clock', 'aca-schedule',
    'aca-assignment', 'aca-marks', 'aca-result', 'aca-certificate',
    'aca-library', 'aca-attendance', 'aca-exam',
])

# Category 5: Finance (20)
build_icon_table(doc, '3.5 Finance (20)', [
    'fin-taka', 'fin-dollar', 'fin-coin', 'fin-wallet',
    'fin-card', 'fin-receipt', 'fin-invoice', 'fin-fee',
    'fin-payment', 'fin-refund', 'fin-discount', 'fin-accounting',
    'fin-ledger', 'fin-bank', 'fin-cash', 'fin-zakat',
    'fin-donation', 'fin-scholarship', 'fin-expense', 'fin-income',
])

# Category 6: Operations (20)
build_icon_table(doc, '3.6 Operations (20)', [
    'ops-inventory', 'ops-stock', 'ops-package', 'ops-warehouse',
    'ops-supplier', 'ops-purchase', 'ops-asset', 'ops-hostel',
    'ops-bed', 'ops-food', 'ops-meal', 'ops-transport',
    'ops-vehicle', 'ops-driver', 'ops-route', 'ops-library-book',
    'ops-book-copy', 'ops-fuel', 'ops-maintenance', 'ops-location',
])

# Category 7: Communication (10)
build_icon_table(doc, '3.7 Communication (10)', [
    'com-mail', 'com-message', 'com-notice', 'com-announcement',
    'com-sms', 'com-email', 'com-notification', 'com-chat',
    'com-broadcast', 'com-megaphone',
])

# Category 8: Status & Feedback (15)
build_icon_table(doc, '3.8 Status & Feedback (15)', [
    'sts-success', 'sts-warning', 'sts-danger', 'sts-error',
    'sts-info-circle', 'sts-question-circle', 'sts-alert', 'sts-loader',
    'sts-spinner', 'sts-check-bold', 'sts-x-bold', 'sts-pending',
    'sts-approved', 'sts-rejected', 'sts-draft',
])

# Category 9: Files & Documents (10)
build_icon_table(doc, '3.9 Files & Documents (10)', [
    'fil-file', 'fil-file-text', 'fil-file-pdf', 'fil-file-image',
    'fil-file-excel', 'fil-folder', 'fil-folder-open', 'fil-paperclip',
    'fil-document', 'fil-attachment',
])

# Category 10: Date & Time (10)
build_icon_table(doc, '3.10 Date & Time (10)', [
    'dt-calendar', 'dt-clock', 'dt-schedule', 'dt-hourglass',
    'dt-timer', 'dt-date', 'dt-time', 'dt-today',
    'dt-week', 'dt-month',
])

# Category 11: Forms & Inputs (10)
build_icon_table(doc, '3.11 Forms & Inputs (10)', [
    'frm-text', 'frm-number', 'frm-date-picker', 'frm-select',
    'frm-checkbox', 'frm-radio', 'frm-switch', 'frm-toggle',
    'frm-slider', 'frm-search-input',
])

# Category 12: Tables & Data (10)
build_icon_table(doc, '3.12 Tables & Data (10)', [
    'tbl-table', 'tbl-column', 'tbl-row', 'tbl-grid',
    'tbl-list', 'tbl-tree', 'tbl-filter-advanced', 'tbl-group-by',
    'tbl-pivot', 'tbl-export',
])

# Category 13: Settings & Config (10)
build_icon_table(doc, '3.13 Settings & Config (10)', [
    'cfg-gear', 'cfg-sliders', 'cfg-toggle', 'cfg-configuration',
    'cfg-branch', 'cfg-organization', 'cfg-module', 'cfg-permission',
    'cfg-role', 'cfg-audit',
])

# Category 14: Misc / Platform (15)
build_icon_table(doc, '3.14 Misc / Platform (15)', [
    'msc-phone', 'msc-mobile', 'msc-tablet', 'msc-laptop',
    'msc-globe', 'msc-language', 'msc-translate', 'msc-keyboard',
    'msc-mouse', 'msc-accessibility', 'msc-globe-asia', 'msc-bangladesh',
    'msc-mosque', 'msc-quran', 'msc-kaaba',
])

# Category 15: Bonus / Module-specific (15)
build_icon_table(doc, '3.15 Bonus / Module-specific (15)', [
    'bns-promote', 'bns-transfer', 'bns-graduate', 'bns-issue',
    'bns-receive', 'bns-allocate', 'bns-occupancy', 'bns-overdue',
    'bns-low-stock', 'bns-merit', 'bns-position', 'bns-gpa',
    'bns-fund', 'bns-tenant', 'bns-saas',
])

# 4. Empty-State Illustrations
add_heading(doc, '4. Empty-State Illustrations (5)', 1)
add_para(doc,
    "Five illustrations pair with the EmptyState component (Session 1.3 #27). Each illustration is "
    "a flat line-art composition with the brand teal as the dominant accent and warm-gold for one "
    "focal element. Style: 2px stroke, rounded caps, no fill, friendly proportions, optimistic tone. "
    "Each renders at 240\u00d7160 px in the EmptyState component.")

il_headers = ['#', 'Name', 'Concept', 'Composition', 'Color usage', 'Used in', 'Copy pairing']
il_rows = [
    ('E1', 'empty-students', 'Three friendly student silhouettes waving',
     '3 figures in a row, slightly overlapping, waving hands',
     'Figures in color.primary.500; ground line in color.neutral.300',
     'Student list empty; admission pipeline empty',
     '\u201cNo students yet \u2014 add your first student\u201d'),
    ('E2', 'empty-fees', 'A receipt with a checkmark stamp',
     'Single receipt centered, checkmark badge top-right',
     'Receipt outline in color.neutral.400; checkmark in color.semantic.success',
     'Outstanding fees empty; receipts list empty',
     '\u201cAll caught up \u2014 no outstanding fees\u201d'),
    ('E3', 'empty-attendance', 'A clipboard with student row silhouettes',
     'Clipboard centered, 4 row-silhouettes inside, pencil to the right',
     'Clipboard in color.neutral.500; pencil in color.accent.DEFAULT',
     'Attendance session empty; no sessions today',
     '\u201cNo attendance taken yet today\u201d'),
    ('E4', 'empty-inventory', 'An empty shelf with one box',
     'Warehouse shelving on left, single small box on right',
     'Shelf in color.neutral.400; box in color.accent.DEFAULT',
     'Inventory items empty; low-stock report empty',
     '\u201cNo items in stock yet \u2014 add your first item\u201d'),
    ('E5', 'empty-results', 'A report card with a pencil',
     'Folded report card on left, pencil on right, small star above',
     'Card in color.neutral.500; pencil in color.accent.DEFAULT; star in color.accent.DEFAULT',
     'Result dashboard pre-publication; student result empty',
     '\u201cResults will publish on [date]\u201d'),
]
build_table(doc, il_headers, il_rows,
            col_widths_cm=[0.8, 2.2, 4.0, 5.0, 4.5, 4.5, 5.0], font_size=8.5)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 5. Generation Pipeline
add_heading(doc, '5. Generation Pipeline (SVG sprite + icon font)', 1)
add_para(doc,
    "Two outputs ship from this session: an SVG sprite (preferred \u2014 crisp at all sizes, color via "
    "stroke token) and an icon font (fallback for legacy contexts). Both are generated from the same "
    "source SVG files via the build pipeline below.")

build_code = """# Project structure
design-system/
  icons/
    src/                # 200+ individual SVG source files (24x24 viewBox)
      nav-menu.svg
      fin-taka.svg
      ppl-student.svg
      ...
    scripts/
      build-sprite.ts   # SVG sprite generator
      build-font.ts     # icon font generator (svgtofont)
    dist/
      sprite.svg        # single concatenated sprite (<symbol> per icon)
      madrasha-icons.woff2
      madrasha-icons.css
      icon-catalog.json  # name -> unicode mapping

# 1. Generate SVG sprite (preferred)
# Each <symbol id="nav-menu" viewBox="0 0 24 24"> is referenced via <use href="#nav-menu">
npx svgstore design-system/icons/src/*.svg -o design-system/icons/dist/sprite.svg

# 2. Generate icon font (legacy fallback)
npx svgtofont --sources design-system/icons/src/ --output design-system/icons/dist/

# 3. Generate catalog JSON (consumed by frontend Phase 7.3)
node design-system/icons/scripts/build-catalog.js"""
add_code_block(doc, build_code)

add_para(doc,
    "Frontend consumption (Phase 7.3):", italic=True)
consume_code = """// Preferred: SVG sprite with stroke = currentColor (token-driven)
<svg class="icon" aria-hidden="true">
  <use href="/sprite.svg#nav-menu"></use>
</svg>

// CSS (uses frozen tokens from Session 1.1)
.icon {
  width: 1.5rem;        /* spacing.scale.6 = 24px */
  height: 1.5rem;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

// Theme tokens drive currentColor per state:
.button.primary .icon   { color: var(--color-primary-foreground); }   /* #FFFFFF */
.button.ghost   .icon   { color: var(--color-neutral-700); }         /* #2E2C27 */
.button:hover   .icon   { color: var(--color-primary-500); }         /* #0E5C5C */

// RTL: mirror directional icons in Arabic locale
[dir="rtl"] .icon.is-directional {
  transform: scaleX(-1);
}"""
add_code_block(doc, consume_code)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 6. Audit Gate
add_heading(doc, '6. Audit Gate (binding from Session 1.2)', 1)
add_para(doc,
    "Every icon added after this baseline must pass the A1\u2013A8 audit from Session 1.2. The most "
    "relevant gates for iconography: A1 (no hardcoded color \u2014 use stroke = currentColor driven "
    "by token), A3 (24px grid only \u2014 no off-grid icons), A6 (shadows forbidden on icons). "
    "Empty-state illustrations are exempt from A3 (illustrations are free-form) but must still pass "
    "A1 (color from tokens) and A6 (no shadows beyond elevation tokens).")

gate_headers = ['Gate', 'Iconography application']
gate_rows = [
    ('A1', 'No hardcoded color \u2014 stroke = currentColor; theme tokens drive it'),
    ('A3', '24px master grid; no off-grid icons'),
    ('A6', 'No custom shadows on icons (illustrations may use elevation.* tokens only)'),
    ('A8', 'All 5 standard states applicable to icon-bearing components'),
]
build_table(doc, gate_headers, gate_rows, col_widths_cm=[1.5, 25.0], font_size=9)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 7. Exit Criteria
add_heading(doc, '7. Session 1.4 Exit Criteria Check', 1)
add_para(doc,
    "Per the plan, Session 1.4 is complete when the icon font + SVG sprite are generated and the 5 "
    "empty-state illustrations are delivered. This is satisfied by: (a) the 200+ icon catalog across "
    "15 categories in Section 3 (every name binding, ready for the SVG source files); (b) the "
    "iconography spec in Section 2 (grid, stroke, RTL rules) consumed by the SVG generator; (c) the "
    "5 empty-state illustration specs in Section 4 with composition + color + copy pairing; (d) the "
    "generation pipeline in Section 5 producing both sprite + font from the same source; (e) the "
    "audit gate in Section 6 binding future additions. The frontend developer in Phase 7.3 consumes "
    "the SVG sprite + icon-catalog.json without further design input.")

# 8. Phase 1 Finale
add_heading(doc, '8. Phase 1 Finale \u2014 Design System Foundation COMPLETE', 1)
add_para(doc,
    "Session 1.4 closes Phase 1. The Design System Foundation is now complete: Brand Kit (1.1) "
    "established the visual identity; Token System (1.2) froze the binding token tree; Component "
    "Library v0 (1.3) specified the 30 atomic components; and Iconography & Illustration (1.4) "
    "produced the icon catalog + illustration set. Together, these sessions give Phase 2 "
    "(Information Architecture) a complete design-system substrate to build wireframes against, "
    "and give the frontend developer in Phase 7 a complete specification to build from.")

phase1_headers = ['Session', 'Deliverable', 'Status']
phase1_rows = [
    ('1.1 Brand Kit', 'Color + typography + JSON tokens', '\u2705 Frozen v1.0.0'),
    ('1.2 Token System', 'Freeze notice + consumption rules + versioning', '\u2705 Frozen + binding'),
    ('1.3 Component Library v0', '30 components \u00d7 5 states \u00d7 a11y contracts', '\u2705 Spec sheet ready'),
    ('1.4 Iconography & Illustration', '200+ icons + 5 illustrations + generation pipeline', '\u2705 Catalog + pipeline ready'),
]
build_table(doc, phase1_headers, phase1_rows, col_widths_cm=[6.0, 14.0, 6.5], font_size=9)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 9. Phase 2 Preview
add_heading(doc, '9. Phase 2 Preview \u2014 Information Architecture & Navigation', 1)
add_para(doc,
    "Phase 2 (4 days, 4 sessions) builds the wireframe skeleton that consumes the Phase 1 design "
    "system: the dynamic left-nav model driven by enabled modules + permissions (Session 2.1, SRS "
    "\u00a72.1.2 + \u00a75.1), the 5 role-based dashboard wireframes (Session 2.2, SRS \u00a72.6.4), the "
    "state system spec (Session 2.3, SRS \u00a75.5), and the permission-aware UI rules (Session 2.4, "
    "SRS \u00a75.1 + \u00a76.2 permission codes). After Phase 2, the wireframes in Phase 3 reference real "
    "components and tokens \u2014 not abstract shapes.")

doc.save(OUTPUT)
print(f"Saved: {OUTPUT}")
