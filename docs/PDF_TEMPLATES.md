# MadrashaOS — PDF Templates (Backend Consumption Spec)

> **Phase C5.1 · Task 5-a → C7.3 · Task 7-c**
>
> Six branded PDF templates built with [@react-pdf/renderer](https://react-pdf.org/) v4,
> available as React components under `src/lib/pdf/templates/`. This document
> is the canonical reference for backend PDF engines that need to render the
> same branded documents server-side.

---

## TL;DR

| # | Template ID | File | Props Type | Purpose |
|---|---|---|---|---|
| 1 | `fee-receipt` | `FeeReceipt.tsx` | `FeeReceiptProps` | Branded fee-collection receipt |
| 2 | `mark-sheet` | `MarkSheet.tsx` | `MarkSheetProps` | Individual student mark sheet |
| 3 | `result-sheet` | `ResultSheet.tsx` | `ResultSheetProps` | Class-wide ranked results |
| 4 | `certificate` | `Certificate.tsx` | `CertificateProps` | Decorative completion certificate |
| 5 | `ledger-statement` | `LedgerStatement.tsx` | `LedgerStatementProps` | Running-balance ledger statement |
| 6 | `outstanding-fees` | `OutstandingFeesReport.tsx` | `OutstandingFeesReportProps` | Outstanding installments report |

All templates live under `src/lib/pdf/templates/` and are re-exported via
`src/lib/pdf/templates/index.ts`. Brand constants live in
`src/lib/pdf/brand.ts`.

---

## Brand Lock-in (Risk R13)

**Every** PDF in the system — client-rendered or server-rendered — MUST use
the FROZEN trio of brand colors. No unbranded PDFs are permitted to ship.

| Token | Hex | Where used |
|---|---|---|
| `pdfColors.primary.500` | `#0E5C5C` | Header bar background, brand bar on every page |
| `pdfColors.accent.500` | `#C9A961` | Gold accent divider, monogram badge, table headers |
| `pdfColors.neutral.0` | `#FFFFFF` | Page paper background |

The full palette is mirrored verbatim from `src/lib/design-system/tokens.ts`
into `src/lib/pdf/brand.ts` (the documented exception to the no-raw-hex rule
R-T1, because `@react-pdf/renderer` cannot read CSS variables at render time).

A machine-readable export of every brand token — including all primary /
accent / neutral / semantic steps + contrast pairs + usage notes — is
available at `/public/assets/brand/color-palette.json`.

---

## Font Registration (Risk R14)

Per Risk R14 (no tofu □ for Bangla or Arabic glyphs), three font families
are registered via `Font.register({ ... })` from `@react-pdf/renderer`:

| Family | Weights | Use |
|---|---|---|
| `Inter` | 400 / 600 / 700 | English (default page font) |
| `HindSiliguri` | 400 / 600 / 700 | Bangla numerals + Bangla student names |
| `NotoNaskhArabic` | 400 / 700 | Arabic student names (nameAr field) |

Fonts are loaded from `cdn.jsdelivr.net/npm/@fontsource/*` lazily on first
render. **If the CDN is unreachable**, PDFKit falls back to Helvetica which
renders English correctly but produces tofu (□) for Bangla and Arabic
codepoints — a documented Risk R14 partial mitigation.

Each template MUST call `ensurePdfReady()` at the top of its
`Document` component to trigger idempotent font registration. The
function is a no-op on subsequent calls (`@react-pdf/renderer` caches
registered fonts in a `Map` keyed by family name).

### Server-side swap

The `src/lib/pdf/brand.ts` file is fully isomorphic — it imports
`Font` from `@react-pdf/renderer`, which works in both browser and
Node (PDFKit). Backend PDF engines that use `@react-pdf/renderer`
server-side can import the brand constants directly:

```ts
// backend PDF service
import {
  pdfColors, pdfOrgName, pdfOrgNameBn,
  ensurePdfReady, amountInWords,
  marksToGrade, marksToGpa,
} from "@/lib/pdf/brand";
import { FeeReceipt } from "@/lib/pdf/templates";
import { renderToBuffer } from "@react-pdf/renderer";

export async function renderFeeReceipt(paymentId: string): Promise<Buffer> {
  ensurePdfReady();
  const { payment, student } = lookupPayment(paymentId);
  const pdf = await renderToBuffer(<FeeReceipt payment={payment} student={student} />);
  return pdf;
}
```

The only caveat: when running server-side, the `@fontsource` CDN calls
require outbound network access. For offline servers, self-host the
WOFF files and update the `src` URLs in `registerPdfFonts()`.

---

## Templates — Detailed Spec

### 1. Fee Receipt (`fee-receipt`)

**File**: `src/lib/pdf/templates/FeeReceipt.tsx`
**Props** (`FeeReceiptProps`):

| Prop | Type | Required | Notes |
|---|---|---|---|
| `payment` | `FeePayment` | yes | The payment record (id, date, amount, method, receiptNo) |
| `student` | `Student` | yes | The student paying (id, name, nameBn, nameAr, classId, section, roll) |
| `branchName` | `string` | no | Override branch name (default: looked up from fixtures) |
| `locale` | `Locale` | no | `en-US` (default) / `bn-BD` / `ar-SA` |
| `className` | `string` | no | Optional CSS class for wrapper |
| `section` | `string` | no | Section label override |

**Branded colors used**:
- `primary.500` (#0E5C5C) — header bar background
- `accent.500` (#C9A961) — gold accent divider line + monogram badge
- `neutral.0` (#FFFFFF) — page paper background
- `neutral.800` (#1F1E1A) — body text
- `neutral.500` (#6E6A60) — muted labels

**Fonts**: Inter (body), HindSiliguri (Bangla student name), NotoNaskhArabic
(Arabic name when `nameAr` is present).

**Special**: Renders amount-in-words below the installment table
via the `amountInWords()` helper (handles up to 9-digit BDT amounts;
falls back to numeric form beyond 999,999,999).

**SRS ref**: §2.4.1 (Fee Plans & Collection).

---

### 2. Mark Sheet (`mark-sheet`)

**File**: `src/lib/pdf/templates/MarkSheet.tsx`
**Props** (`MarkSheetProps`):

| Prop | Type | Required | Notes |
|---|---|---|---|
| `studentId` | `string` | yes | Student identifier (looked up via `getStudentInfo`) |
| `exam` | `PdfExamInfo` | no | Override exam metadata (default: `getExamInfo()`) |
| `rankingEnabled` | `boolean` | no | Risk R7 — only show position when `true` |
| `position` | `number` | no | Student's class rank (rendered only if `rankingEnabled`) |
| `locale` | `Locale` | no | Default `en-US` |

**Branded colors used**:
- `primary.500` (#0E5C5C) — header bar + totals row background
- `accent.500` (#C9A961) — gold divider + monogram + GPA badge background
- `accent.100` (#F3E8C2) — subtle band on subjects table header
- `neutral.0` (#FFFFFF) — page paper + table cell backgrounds
- `neutral.800` (#1F1E1A) — body text
- `neutral.500` (#6E6A60) — muted labels

**Fonts**: Inter (body, table), HindSiliguri (Bangla subject names),
NotoNaskhArabic (Arabic name).

**Special**: Subject marks are deterministic per student code via
`getSubjectMarks()` — same student always produces the same mark sheet.
Grade computed via `marksToGrade()`; GPA via `marksToGpa()`.

**Risk R7** (rankings consent): the `rankingEnabled` prop gates the
position column. When `false`, the column renders but with a `"—"` placeholder.

**SRS ref**: §2.5.3 (Results).

---

### 3. Result Sheet (`result-sheet`)

**File**: `src/lib/pdf/templates/ResultSheet.tsx`
**Props** (`ResultSheetProps`):

| Prop | Type | Required | Notes |
|---|---|---|---|
| `exam` | `PdfExamInfo` | no | Override exam metadata |
| `classId` | `string` | no | Default `cls-5` |
| `section` | `string` | no | Default `A` |
| `limit` | `number` | no | Max students to render (default 10) |
| `locale` | `Locale` | no | Default `en-US` |

**Branded colors used**:
- `primary.500` (#0E5C5C) — header bar + summary row background
- `accent.500` (#C9A961) — gold divider + monogram
- `neutral.0` (#FFFFFF) — page paper
- `neutral.800` (#1F1E1A) — body text
- `neutral.500` (#6E6A60) — muted labels
- `semantic.success` (#2F7D32) — pass-rate badge

**Fonts**: Inter (table), HindSiliguri (Bangla student names).

**Special**: Top-N students ranked by total marks. Summary statistics:
highest mark, class average, pass rate. Pass = marks ≥ 40% of total.

**SRS ref**: §2.5.3 (Results).

---

### 4. Completion Certificate (`certificate`)

**File**: `src/lib/pdf/templates/Certificate.tsx`
**Props** (`CertificateProps`):

| Prop | Type | Required | Notes |
|---|---|---|---|
| `studentId` | `string` | yes | Student identifier |
| `className` | `string` | no | Class name override (default: derived from student record) |
| `date` | `string` | no | ISO date (default: today) |
| `locale` | `Locale` | no | Default `en-US` |

**Branded colors used**:
- `primary.500` (#0E5C5C) — header brand bar
- `accent.500` (#C9A961) — **double gold border** (3px outer + 1px inner), monogram badge
- `accent.100` (#F3E8C2) — inner border accent
- `neutral.0` (#FFFFFF) — page paper
- `neutral.800` (#1F1E1A) — body text
- `neutral.200` (#E0DCD2) — diagonal watermark text (Phase 3 placeholder)

**Fonts**: Inter (English text), HindSiliguri (Bangla student name),
NotoNaskhArabic (Arabic name).

**Layout**: Landscape A4 (Orientation.landscape). Decorative double gold
border + diagonal "PHASE 3 PLACEHOLDER" watermark across the middle.

**Special**: The seal is a Phase 3 placeholder — currently rendered as a
circular gold-outlined badge with the madrasha monogram. Real seal artwork
will be added in Phase 3.

**SRS ref**: Phase 3 placeholder (no SRS section yet).

---

### 5. Ledger Statement (`ledger-statement`)

**File**: `src/lib/pdf/templates/LedgerStatement.tsx`
**Props** (`LedgerStatementProps`):

| Prop | Type | Required | Notes |
|---|---|---|---|
| `from` | `string` | no | ISO date (default: no filter — show all entries) |
| `to` | `string` | no | ISO date (default: no filter) |
| `accountFilter` | `string` | no | Account ID — show only entries touching this account |
| `accountName` | `string` | no | Display name for the account (default: derived) |
| `locale` | `Locale` | no | Default `en-US` |

**Branded colors used**:
- `primary.500` (#0E5C5C) — header bar + closing-balance row background
- `accent.500` (#C9A961) — gold divider + monogram + opening-balance accent
- `neutral.0` (#FFFFFF) — page paper
- `neutral.800` (#1F1E1A) — body text
- `neutral.500` (#6E6A60) — muted labels + opening balance text
- `neutral.200` (#E0DCD2) — table row borders

**Fonts**: Inter (table, numbers). Currency formatted via `formatCurrency()`
with locale-aware numeral conversion.

**Special**: Running balance computed via `getLedgerRows()` — opening
balance defaults to 0 for the demo period; closing balance is the final
running figure. Date range filter is inclusive on both ends.

**SRS ref**: §2.4.3 (Double-Entry Ledger).

---

### 6. Outstanding Fees Report (`outstanding-fees`)

**File**: `src/lib/pdf/templates/OutstandingFeesReport.tsx`
**Props** (`OutstandingFeesReportProps`):

| Prop | Type | Required | Notes |
|---|---|---|---|
| `asOfDate` | `string` | no | ISO date — filters installments by `dueDate <= asOfDate` (default: today) |
| `locale` | `Locale` | no | Default `en-US` |

**Branded colors used**:
- `primary.500` (#0E5C5C) — header bar + totals row background
- `accent.500` (#C9A961) — gold divider + monogram
- `neutral.0` (#FFFFFF) — page paper
- `neutral.800` (#1F1E1A) — body text
- `neutral.500` (#6E6A60) — muted labels
- `semantic.warning` (#B58400) — total-outstanding callout (amber tone)
- `semantic.warning.50` (#FFF6E5) — outstanding summary background

**Fonts**: Inter (table, numbers). Currency formatted via `formatCurrency()`.

**Special**: Per Risk R12 (as-of-date timestamp), the header always shows
"as of [date]" so finance operators know exactly which point in time the
outstanding figure represents. Installments are scanned from all fee plans
where `paid === false` and `dueDate <= asOfDate`.

**SRS ref**: Risk R12 (as-of-date timestamp), §2.4.1 (Fee Plans).

---

## Backend Consumption Strategies

### Strategy A — Reuse the React templates server-side

If the backend is a Node/Bun service that can run React + `@react-pdf/renderer`:

```ts
import { renderToBuffer } from "@react-pdf/renderer";
import { FeeReceipt } from "@/lib/pdf/templates";
import { ensurePdfReady } from "@/lib/pdf/brand";

export async function generateFeeReceiptBuffer(payment, student): Promise<Buffer> {
  ensurePdfReady();
  return renderToBuffer(<FeeReceipt payment={payment} student={student} />);
}
```

**Pros**: Identical visual output to the client-side preview; zero drift
between in-app preview and downloaded PDF.

**Cons**: Requires `@react-pdf/renderer` (~600 KB) and `react-dom/server`
in the backend bundle. The `@fontsource` CDN calls require outbound
network access (or self-host the WOFF files).

### Strategy B — Implement server-side PDF generation with the same brand constants

If the backend uses a different PDF engine (Puppeteer / WeasyPrint / PDFKit
directly / wkhtmltopdf), import only the brand constants:

```ts
import { pdfColors, pdfOrgName, amountInWords, marksToGrade } from "@/lib/pdf/brand";

// pdfColors.primary.500 === "#0E5C5C" — use directly in your PDF engine
// pdfColors.accent.500 === "#C9A961"
// pdfColors.neutral.0 === "#FFFFFF"
```

**Pros**: Backend stays light (no React dependency).

**Cons**: Visual output may drift from the client-side preview if the
backend PDF engine's CSS / layout rules differ from `@react-pdf/renderer`.
Recommend running a visual diff between client and server PDFs once per
release.

### Strategy C — Hybrid: server-side data prep, client-side render

If the backend already serves the API and the client renders PDFs in the
browser (the current MadrashaOS default), no swap is needed — the
`PdfPreview` and `PdfDownloadButton` components at
`src/components/pdf/PdfPreview.tsx` already handle this via
`next/dynamic` with `ssr: false`.

---

## Mock Data Builders

All templates source their data from pure functions in
`src/lib/pdf/mockData.ts`. Backend services should replace these builders
with real database queries:

| Builder | Returns | Used by |
|---|---|---|
| `getBranchInfo(branchId)` | `PdfBranchInfo` | all 6 templates (header) |
| `getStudentInfo(studentId)` | `PdfStudentInfo` | MarkSheet, Certificate, FeeReceipt |
| `getExamInfo(opts)` | `PdfExamInfo` | MarkSheet, ResultSheet |
| `getSubjectMarks(student)` | `PdfSubjectMark[]` | MarkSheet |
| `getFeePayment(paymentId)` | `{ payment, plan, student }` | FeeReceipt |
| `getLedgerRows(opts)` | `{ rows, openingBalance, closingBalance }` | LedgerStatement |
| `getOutstandingInstallments()` | `Array<{ student, plan, installment, daysOverdue }>` | OutstandingFeesReport |
| `getResultRows(opts)` | `PdfResultRow[]` | ResultSheet |
| `getAccount(accountId)` | `Account \| undefined` | LedgerStatement (optional account filter) |

All builders are pure functions — no side effects, no network calls. They
read from the existing fixture layer at `src/lib/mock/fixtures/`. Backend
services can swap them with repository-pattern calls without changing the
template components.

---

## Live Previews

Every template has a live preview route at `/dev/pdfs/[template]` and a
catalog at `/dev/pdfs`. The Asset Library gallery at `/dev/assets` also
links to these previews from the **PDF Templates** tab.

---

## References

- **FROZEN brand kit**: `MadrashaOS_Session_1.1_Brand_Kit_Tokens.json` v1.0.0
- **Token TS constants**: `src/lib/design-system/tokens.ts`
- **Token CSS variables**: `src/styles/tokens.css`
- **PDF brand constants**: `src/lib/pdf/brand.ts`
- **Template components**: `src/lib/pdf/templates/*.tsx`
- **Template registry**: `src/lib/pdf/mockData.ts` → `TEMPLATE_REGISTRY`
- **Live preview components**: `src/components/pdf/PdfPreview.tsx`
- **Asset Library gallery**: `src/app/dev/assets/page.tsx`
- **Brand palette JSON**: `/public/assets/brand/color-palette.json`

---

## Risk Register Cross-References

| Risk | Mitigation in templates |
|---|---|
| **R7** Rankings consent | MarkSheet's `rankingEnabled` prop gates the position column |
| **R12** As-of-date timestamp | OutstandingFeesReport always renders "as of [date]" in the header |
| **R13** Brand lock-in | Every template uses `primary.500` + `accent.500` + `neutral.0` from `pdfColors` |
| **R14** Arabic + Bangla tofu | Three `@fontsource` families registered via `Font.register()` |

---

*This document is updated when templates are added or when the brand
constants change. The brand palette itself is FROZEN at v1.0.0 and MUST
NOT be altered.*
