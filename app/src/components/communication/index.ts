/**
 * MadrashaOS — Communication Components barrel (C4.3)
 *
 * Re-exports the communication-domain components used by the C4.3 screens:
 *   /notices, /documents, /reports
 */

export { NoticeRow, NoticeAudienceBadge, type NoticeAudienceTone } from "./NoticeRow";
export { NoticeComposer } from "./NoticeComposer";
export {
  DocumentRowItem,
  formatFileSize,
  type DocumentRowType,
  type DocumentType,
} from "./DocumentRow";
export { UploadDocumentDialog } from "./UploadDocumentDialog";
export { ReportCard, ReportIcons, type ReportType, type ReportCategory } from "./ReportCard";
export { GenerateReportDialog } from "./GenerateReportDialog";
