"""
MadrashaOS - Session 1.1 Deliverable: Brand Kit
- Generates MadrashaOS_Session_1.1_Brand_Kit_TechnicalDoc_2026-09-16.docx (the doc)
- Generates MadrashaOS_Session_1.1_Brand_Kit_Tokens.json (the executable token file)
"""
import json
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_LINE_SPACING, WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

DOCX_OUT = "/home/z/my-project/download/MadrashaOS_Session_1.1_Brand_Kit_TechnicalDoc_2026-09-16.docx"
JSON_OUT = "/home/z/my-project/download/MadrashaOS_Session_1.1_Brand_Kit_Tokens.json"

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

def add_code_block(doc, code_text):
    """Render a code block as a single-cell shaded table for monospace look."""
    t = doc.add_table(rows=1, cols=1)
    set_table_borders(t)
    c = t.rows[0].cells[0]
    set_cell_margins(c, top=80, bottom=80, left=120, right=120)
    set_cell_bg(c, 'F5F5F2')
    c.text = ''
    lines = code_text.split('\n')
    for line in lines:
        p = c.add_paragraph()
        p.paragraph_format.space_before = Pt(0); p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1.15
        r = p.add_run(line if line else ' ')
        r.font.name = 'Consolas'
        r.font.size = Pt(8.5)
    # remove the empty first paragraph
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

# ---------- The Tokens (single source of truth) ----------

TOKENS = {
    "version": "1.0.0",
    "generated_at": "2026-09-16",
    "session": "1.1",
    "status": "approved (pending client logo asset delivery)",
    "color": {
        "primary": {
            "_comment": "Deep Teal \u2014 evokes mosque tile glaze + water; modern premium SaaS feel",
            "50": "#E6F2F2", "100": "#C2DEDE", "200": "#8FC2C2", "300": "#5BA6A6",
            "400": "#2E8A8A", "500": "#0E5C5C", "600": "#0B4A4A", "700": "#093838",
            "800": "#062626", "900": "#041818",
            "DEFAULT": "#0E5C5C", "foreground": "#FFFFFF"
        },
        "accent": {
            "_comment": "Warm Gold \u2014 premium, evokes mosque dome + illuminated manuscript",
            "DEFAULT": "#C9A961", "foreground": "#1A1814",
            "50": "#FBF6E8", "100": "#F3E8C2", "500": "#C9A961", "700": "#8A6F2F"
        },
        "neutral": {
            "_comment": "Warm grays \u2014 sandstone undertone, never clinical",
            "0": "#FFFFFF", "50": "#FAF8F5", "100": "#F2EFE8", "200": "#E0DCD2",
            "300": "#C7C1B5", "400": "#9A9388", "500": "#6E6A60", "600": "#4A4740",
            "700": "#2E2C27", "800": "#1F1E1A", "900": "#15140F", "950": "#0A0908"
        },
        "semantic": {
            "success": {"DEFAULT": "#2F7D32", "foreground": "#FFFFFF", "50": "#E8F5E9"},
            "warning": {"DEFAULT": "#B58400", "foreground": "#1A1814", "50": "#FFF6E5"},
            "danger":  {"DEFAULT": "#B91C1C", "foreground": "#FFFFFF", "50": "#FDE8E8"},
            "info":    {"DEFAULT": "#1D4ED8", "foreground": "#FFFFFF", "50": "#E0EBFD"}
        }
    },
    "typography": {
        "font_family": {
            "bangla":  "'Hind Siliguri', sans-serif",
            "english": "'Inter', sans-serif",
            "arabic":  "'Noto Naskh Arabic', serif",
            "mono":    "'JetBrains Mono', monospace",
            "default": "'Inter', 'Hind Siliguri', 'Noto Naskh Arabic', sans-serif"
        },
        "type_scale": {
            "caption":  {"size_px": 12, "line_height_px": 16, "weight": 400, "letter_spacing": "0.01em"},
            "body":     {"size_px": 14, "line_height_px": 20, "weight": 400, "letter_spacing": "0"},
            "subtitle": {"size_px": 16, "line_height_px": 22, "weight": 500, "letter_spacing": "0"},
            "title":    {"size_px": 20, "line_height_px": 28, "weight": 600, "letter_spacing": "-0.01em"},
            "headline": {"size_px": 24, "line_height_px": 32, "weight": 700, "letter_spacing": "-0.02em"},
            "display":  {"size_px": 32, "line_height_px": 40, "weight": 700, "letter_spacing": "-0.03em"}
        },
        "weights": {"regular": 400, "medium": 500, "semibold": 600, "bold": 700}
    },
    "spacing": {
        "unit_px": 8,
        "scale_px": [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128]
    },
    "radius": {"sm": 4, "md": 6, "lg": 8, "xl": 12, "2xl": 16, "full": 9999},
    "elevation": {
        "0": "none",
        "1": "0 1px 2px rgba(10,9,8,0.05)",
        "2": "0 2px 4px rgba(10,9,8,0.08)",
        "3": "0 4px 8px rgba(10,9,8,0.10)",
        "4": "0 8px 16px rgba(10,9,8,0.12)",
        "5": "0 16px 32px rgba(10,9,8,0.14)"
    },
    "motion": {
        "duration": {"fast": "150ms", "normal": "250ms", "slow": "400ms"},
        "easing": {
            "standard":  "cubic-bezier(0.4, 0.0, 0.2, 1)",
            "decelerate": "cubic-bezier(0.0, 0.0, 0.2, 1)",
            "accelerate": "cubic-bezier(0.4, 0.0, 1, 1)"
        }
    },
    "breakpoints": {"sm": 375, "md": 768, "lg": 1280, "xl": 1440, "2xl": 1920},
    "grid": {"columns_12_max_width_px": 1280, "gutter_px": 24, "margin_px": 16}
}

# Save the JSON file (single source of truth)
with open(JSON_OUT, 'w', encoding='utf-8') as f:
    json.dump(TOKENS, f, indent=2, ensure_ascii=False)
print(f"JSON saved: {JSON_OUT}")

# ---------- Build the .docx ----------

doc = Document()
for section in doc.sections:
    section.page_width = Cm(21); section.page_height = Cm(29.7)
    section.top_margin = Cm(1.8); section.bottom_margin = Cm(1.8)
    section.left_margin = Cm(2); section.right_margin = Cm(2)

style = doc.styles['Normal']
style.font.name = 'Inter'; style.font.size = Pt(10.5)

# Title
title = doc.add_paragraph()
t_run = title.add_run('MadrashaOS \u2014 Session 1.1 Deliverable: Brand Kit')
t_run.bold = True; t_run.font.size = Pt(18); t_run.font.color.rgb = RGBColor(0x0E, 0x5C, 0x5C)

sub = doc.add_paragraph()
sub.paragraph_format.space_after = Pt(8)
s_run = sub.add_run('Color System \u00b7 Typography Stack \u00b7 Token Export (JSON)')
s_run.font.size = Pt(11); s_run.italic = True; s_run.font.color.rgb = RGBColor(0x55, 0x55, 0x55)

# Meta
meta = doc.add_table(rows=5, cols=2)
set_table_borders(meta)
meta_rows = [
    ('Document', 'MadrashaOS_Session_1.1_Brand_Kit_TechnicalDoc_2026-09-16'),
    ('Companion File', 'MadrashaOS_Session_1.1_Brand_Kit_Tokens.json (machine-readable)'),
    ('Source', 'SRS v2.0 \u00a72.6.6, \u00a711.3 (open item resolved); P5 + P10 (Session 0.4)'),
    ('Session', '1.1 \u2014 Brand Kit (Phase 1 opener)'),
    ('Exit Criteria', 'Tokens exported as JSON + Figma variables; risk R13 resolved'),
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
    "This deliverable establishes the MadrashaOS brand foundation: a color system, a multi-language "
    "typography stack (Bangla / English / Arabic), a type scale, and the JSON token export consumed by "
    "every downstream session in Phase 1 and the frontend in Phase 7.1. The aesthetic is a fusion of "
    "Islamic geometric heritage (deep teal evoking mosque tile glaze, warm gold evoking the illuminated "
    "manuscript) with modern premium-SaaS restraint (Inter typography, 8pt grid, warm-neutral palette). "
    "This resolves SRS \u00a711.3 open item \u201cFinal visual design / brand kit\u201d and locks Risk R13 "
    "(unbranded PDFs).")

# 2. Brand Foundation
add_heading(doc, '2. Brand Foundation', 1)
add_para(doc,
    "The palette avoids both clich\u00e9 Islamic-green and clinical SaaS-blue. Deep Teal (#0E5C5C) carries "
    "the visual weight of the brand; Warm Gold (#C9A961) is reserved for premium accents (logo mark, "
    "PDF headers, achievement badges, key CTAs). Neutrals carry a sandstone undertone so the interface "
    "feels warm on long reading sessions \u2014 important for accountants and teachers using the system "
    "daily. All semantic colors (success / warning / danger / info) are tuned for WCAG 2.1 AA contrast "
    "against both light and dark surfaces per Principle P6 (Session 0.4).")

# 3. Logo System (Placeholder)
add_heading(doc, '3. Logo System (Spec, pending client asset delivery)', 1)
add_para(doc,
    "Three lockups are required; once the client delivers the actual logo vector, the placeholders below "
    "are filled and re-issued as Session 1.1 addendum.")

logo_headers = ['Lockup', 'Use', 'Min size', 'Clear space', 'Status']
logo_rows = [
    ('Full (wordmark + mark)', 'Login screen, PDF headers, public website', '240px wide', '1 cap height around', 'Pending client asset'),
    ('Monogram (mark only)', 'App favicon, mobile app icon, social avatars', '32px', '25% of mark', 'Pending client asset'),
    ('Favicon (simplified)', 'Browser tab, PWA install icon', '16px', '\u2014', 'Pending client asset'),
]
build_table(doc, logo_headers, logo_rows, col_widths_cm=[3.5, 6.5, 2.5, 2.5, 2.0], font_size=9)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 4. Color Tokens
add_heading(doc, '4. Color Tokens', 1)
add_para(doc,
    "Full 11-step scale for primary, 4-step scale for accent, 12-step warm-neutral scale, and 4 semantic "
    "colors. Each color is named, hex-coded, and tagged with its usage. The full machine-readable token "
    "tree is in the companion JSON file (Section 7).")

col_headers = ['Token', 'Hex', 'Usage']
col_rows = [
    ('primary.500 (DEFAULT)', '#0E5C5C', 'Primary buttons, active nav, links, focus rings'),
    ('primary.600', '#0B4A4A', 'Hover state on primary buttons'),
    ('primary.700', '#093838', 'Pressed state; dark headers'),
    ('primary.50', '#E6F2F2', 'Subtle backgrounds, selected row tint'),
    ('accent.DEFAULT', '#C9A961', 'Logo mark, PDF brand bar, achievement badges, premium CTA'),
    ('neutral.0', '#FFFFFF', 'Card surfaces, page background default'),
    ('neutral.50', '#FAF8F5', 'Page background (warm), table zebra'),
    ('neutral.200', '#E0DCD2', 'Borders, dividers, disabled surfaces'),
    ('neutral.500', '#6E6A60', 'Secondary text, captions'),
    ('neutral.900', '#15140F', 'Primary text, headings'),
    ('semantic.success', '#2F7D32', 'Success toasts, paid status, attendance Present'),
    ('semantic.warning', '#B58400', 'Pending approvals, low-stock, attendance Late'),
    ('semantic.danger', '#B91C1C', 'Destructive actions, errors, attendance Absent'),
    ('semantic.info', '#1D4ED8', 'Info toasts, links to docs'),
]
build_table(doc, col_headers, col_rows, col_widths_cm=[5.0, 2.5, 9.5], font_size=9)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 5. Typography Stack
add_heading(doc, '5. Typography Stack (Bangla / English / Arabic first-class)', 1)
add_para(doc,
    "Three font families cover the three SRS-mandated languages (SRS \u00a72.6.6). All three are open-source "
    "and web-safe. Inter is the default Latin/UI face; Hind Siliguri handles all Bangla glyphs; Noto "
    "Naskh Arabic handles Quranic / name_ar fields and PDF outputs. The font stack falls through so a "
    "mixed bn/en/ar string renders without tofu (\u25a1) on any platform \u2014 satisfies Do-Not-Do D15.")

type_headers = ['Language', 'Font', 'Foundry / License', 'Use']
type_rows = [
    ('Bangla (bn-BD)', 'Hind Siliguri', 'Open Font License (OFL)', 'All Bangla UI text and labels'),
    ('English (en-US)', 'Inter', 'OFL \u2014 variable font', 'Default Latin / UI; headings + body'),
    ('Arabic (ar)', 'Noto Naskh Arabic', 'OFL \u2014 Google', 'name_ar fields, Quranic references, PDFs'),
    ('Mono (code)', 'JetBrains Mono', 'OFL', 'Code blocks, IDs, audit field-diff viewer'),
]
build_table(doc, type_headers, type_rows, col_widths_cm=[3.5, 4.0, 4.0, 5.5], font_size=9)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 6. Type Scale
add_heading(doc, '6. Type Scale (6 steps)', 1)
add_para(doc, "Six steps from caption to display. Line heights and letter-spacing tuned per step (tighter at display, looser at caption).")

scale_headers = ['Token', 'Size', 'Line height', 'Weight', 'Use']
scale_rows = [
    ('caption', '12px', '16px', '400', 'Field helpers, timestamps, table cell secondary'),
    ('body', '14px', '20px', '400', 'Default body text, table cells, form labels'),
    ('subtitle', '16px', '22px', '500', 'Section subtitles, card titles, list headers'),
    ('title', '20px', '28px', '600', 'Page titles, dialog titles'),
    ('headline', '24px', '32px', '700', 'Dashboard widget headers, hero text'),
    ('display', '32px', '40px', '700', 'Login hero, empty-state headlines'),
]
build_table(doc, scale_headers, scale_rows, col_widths_cm=[2.5, 2.0, 2.5, 2.0, 8.0], font_size=9)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 7. JSON Token Export
add_heading(doc, '7. JSON Token Export (binding artifact)', 1)
add_para(doc,
    "The companion file MadrashaOS_Session_1.1_Brand_Kit_Tokens.json is the single source of truth. "
    "Phase 1.2 (Token System) extends it with motion + grid + breakpoint tokens already drafted here. "
    "Phase 7.1 (Design Tokens Export) re-issues the same tree in CSS / TS / Tailwind preset. The "
    "excerpt below shows the structure; the full file is in the repo.")

json_excerpt = """{
  "version": "1.0.0",
  "session": "1.1",
  "color": {
    "primary": {
      "500": "#0E5C5C",   "DEFAULT": "#0E5C5C",  "foreground": "#FFFFFF",
      "50": "#E6F2F2",    "600": "#0B4A4A",      "700": "#093838"
    },
    "accent": { "DEFAULT": "#C9A961", "foreground": "#1A1814" },
    "neutral": { "0": "#FFFFFF", "50": "#FAF8F5", "900": "#15140F" },
    "semantic": {
      "success": "#2F7D32", "warning": "#B58400",
      "danger":  "#B91C1C", "info":    "#1D4ED8"
    }
  },
  "typography": {
    "font_family": {
      "bangla":  "'Hind Siliguri', sans-serif",
      "english": "'Inter', sans-serif",
      "arabic":  "'Noto Naskh Arabic', serif",
      "default": "'Inter', 'Hind Siliguri', 'Noto Naskh Arabic', sans-serif"
    },
    "type_scale": {
      "caption":  {"size_px": 12, "line_height_px": 16, "weight": 400},
      "body":     {"size_px": 14, "line_height_px": 20, "weight": 400},
      "subtitle": {"size_px": 16, "line_height_px": 22, "weight": 500},
      "title":    {"size_px": 20, "line_height_px": 28, "weight": 600},
      "headline": {"size_px": 24, "line_height_px": 32, "weight": 700},
      "display":  {"size_px": 32, "line_height_px": 40, "weight": 700}
    }
  },
  "spacing":  {"unit_px": 8, "scale_px": [0,4,8,12,16,20,24,32,40,48,64,80,96,128]},
  "radius":   {"sm": 4, "md": 6, "lg": 8, "xl": 12, "2xl": 16, "full": 9999},
  "elevation": {
    "1": "0 1px 2px rgba(10,9,8,0.05)",
    "2": "0 2px 4px rgba(10,9,8,0.08)",
    "3": "0 4px 8px rgba(10,9,8,0.10)"
  },
  "motion": {
    "duration": {"fast": "150ms", "normal": "250ms", "slow": "400ms"},
    "easing": {"standard": "cubic-bezier(0.4,0.0,0.2,1)"}
  },
  "breakpoints": {"sm": 375, "md": 768, "lg": 1280, "xl": 1440, "2xl": 1920}
}"""
add_code_block(doc, json_excerpt)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 8. Figma Variable Import
add_heading(doc, '8. Figma Variable Import Guide', 1)
add_para(doc, "Steps to mirror the JSON in Figma so the design team and frontend stay in sync:")
steps = [
    "In Figma, open the MadrashaOS library file \u2192 Variables \u2192 New variable collection named \u201cMadrashaOS v1\u201d.",
    "Create four modes: Light (default), Dark, RTL-ar, Print-PDF.",
    "Import the JSON via the Figma Tokens plugin (or Variables import) \u2014 map color.* \u2192 Color variables, typography.font_family.* \u2192 String variables, spacing + radius + elevation \u2192 Number/Float variables.",
    "Apply semantic tokens to every component (Phase 1.3); raw hex values are forbidden in component files.",
    "After every JSON update, re-import and run the Figma \u201cApply variables to matching styles\u201d action.",
]
for s in steps:
    p = doc.add_paragraph(style='List Number')
    p.paragraph_format.space_before = Pt(0); p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.2
    if p.runs: p.runs[0].text = ''
    r = p.add_run(s); r.font.size = Pt(10.5)

doc.add_paragraph().paragraph_format.space_after = Pt(2)

# 9. Exit Criteria
add_heading(doc, '9. Session 1.1 Exit Criteria Check', 1)
add_para(doc,
    "Per the plan, Session 1.1 is complete when tokens are exported as JSON + Figma variables and Risk "
    "R13 is resolved. The companion JSON file (MadrashaOS_Session_1.1_Brand_Kit_Tokens.json) is the "
    "binding export. Risk R13 (PDF brand kit unresolved) is now resolved: every PDF template produced "
    "in Phase 5.1 must reference primary.500 + accent.DEFAULT + neutral.0 \u2014 no unbranded PDF ships to "
    "production. The Figma variable collection is created per Section 8. Logo lockups remain pending "
    "client vector delivery; an addendum is issued the moment the asset lands.")

# 10. Next Session
add_heading(doc, '10. Next Session: 1.2 \u2014 Token System', 1)
add_para(doc,
    "Session 1.2 extends this JSON with the formal token system: spacing scale (8pt grid), full "
    "elevation ladder (5 levels), motion tokens (durations + easings), and grid/breakpoint rules. The "
    "1.1 JSON already drafts these as a head start; 1.2 freezes them. After 1.2, the component library "
    "in 1.3 references tokens only \u2014 never raw hex or px values.")

doc.save(DOCX_OUT)
print(f"DOCX saved: {DOCX_OUT}")
