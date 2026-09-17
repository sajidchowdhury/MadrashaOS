/**
 * MadrashaOS — Academic Components barrel (Session C3.3)
 *
 * Re-exports the academic-domain components used by the C3.3 screens:
 *   /attendance, /attendance/take, /exams, /exams/[id]/marks
 */

export {
  AttendanceSessionRow,
  AttendanceTakenByAvatar,
} from "./AttendanceSessionRow";
export {
  AttendanceRosterRow,
  AttendanceStatusSummary,
  STATUS_CYCLE,
  STATUS_LABEL,
  STATUS_TONE,
  type AttendanceStatus,
} from "./AttendanceRoster";
export { StudentMarkCard } from "./StudentMarkCard";
export { ExamRow, type Exam, type ExamStatus } from "./ExamRow";
