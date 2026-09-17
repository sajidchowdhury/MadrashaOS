/**
 * MadrashaOS — PDF Template Registry
 *
 * Session C5.1 — Branded PDF Templates (Task 5-a)
 *
 * Re-exports the 6 branded PDF templates + the metadata registry so the
 * /dev/pdfs showcase route can iterate without importing each template
 * individually.
 *
 * Brand lock-in (Risk R13): every Document exported here uses
 * primary.500 #0E5C5C + accent #C9A961 + neutral.0 #FFFFFF — see
 * `src/lib/pdf/brand.ts` for the literal hex values (the documented
 * exception to the no-raw-hex rule).
 */

export { FeeReceipt } from "./FeeReceipt";
export type { FeeReceiptProps } from "./FeeReceipt";

export { MarkSheet } from "./MarkSheet";
export type { MarkSheetProps } from "./MarkSheet";

export { ResultSheet } from "./ResultSheet";
export type { ResultSheetProps } from "./ResultSheet";

export { Certificate } from "./Certificate";
export type { CertificateProps } from "./Certificate";

export { LedgerStatement } from "./LedgerStatement";
export type { LedgerStatementProps } from "./LedgerStatement";

export { OutstandingFeesReport } from "./OutstandingFeesReport";
export type { OutstandingFeesReportProps } from "./OutstandingFeesReport";

export {
  TEMPLATE_REGISTRY,
  type TemplateId, type TemplateMeta,
} from "../mockData";
