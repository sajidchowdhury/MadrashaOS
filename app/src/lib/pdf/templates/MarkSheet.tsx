"use client";

/**
 * MadrashaOS — PDF Template: Mark Sheet (C5.1 / Task 5-a)
 *
 * Individual student mark sheet per SRS §2.5.3 (Results).
 *
 * Layout:
 *   ┌─────────────────────────────────────────────┐
 *   │ ▓▓ MadrashaOS · Mark Sheet · [Exam] ▓▓      │
 *   │ ─── gold accent divider ───                 │
 *   │ Student info (name, code, class, section)   │
 *   │ ┌─ Subjects table ──────────────────────┐   │
 *   │ │ Subject │ Full │ Obtained │ Grade     │   │
 *   │ └────────────────────────────────────────┘   │
 *   │ Total · GPA · Position (Risk R7 — only      │
 *   │   if ranking enabled; mock = enabled)       │
 *   │ Teacher sig · Principal sig                 │
 *   └─────────────────────────────────────────────┘
 *
 * Brand lock-in (Risk R13): primary.500 #0E5C5C + accent #C9A961 + neutral.0 #FFFFFF.
 * Arabic (Risk R14): NotoNaskhArabic font; Bangla: HindSiliguri font.
 */

import * as React from "react";
import {
  Document, Page, View, Text, StyleSheet,
} from "@react-pdf/renderer";
import type { Locale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/i18n/format";
import {
  pdfColors, pdfOrgName, ensurePdfReady, marksToGrade, marksToGpa,
} from "@/lib/pdf/brand";
import {
  getBranchInfo, getExamInfo, getStudentInfo, getSubjectMarks,
  type PdfStudentInfo, type PdfExamInfo, type PdfSubjectMark,
} from "@/lib/pdf/mockData";

export type MarkSheetProps = {
  studentId: string;
  exam?: PdfExamInfo;
  rankingEnabled?: boolean;
  position?: number;
  locale?: Locale;
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 10,
    color: pdfColors.neutral[800],
    backgroundColor: pdfColors.neutral[0],
    padding: 36,
    paddingBottom: 48,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: pdfColors.primary[500],
    color: pdfColors.neutral[0],
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  headerBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  monogram: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: pdfColors.accent[500],
    color: pdfColors.primary[900],
    textAlign: "center", textAlignVertical: "center",
    fontSize: 18, fontWeight: 700,
  },
  brandName: {
    fontSize: 16, fontWeight: 700,
    color: pdfColors.neutral[0],
    letterSpacing: -0.3,
  },
  brandSub: {
    fontSize: 9,
    color: pdfColors.primary[100],
    marginTop: 1,
  },
  docType: {
    fontSize: 11, fontWeight: 700,
    color: pdfColors.accent[100],
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  goldDivider: {
    height: 3,
    backgroundColor: pdfColors.accent[500],
    marginVertical: 12,
    borderRadius: 1.5,
  },
  examBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: pdfColors.primary[50],
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  examName: {
    fontSize: 12,
    fontWeight: 700,
    color: pdfColors.primary[700],
  },
  examDate: {
    fontSize: 10,
    color: pdfColors.neutral[500],
  },
  /* Student info card */
  studentCard: {
    flexDirection: "row",
    backgroundColor: pdfColors.neutral[50],
    padding: 12,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: pdfColors.primary[500],
    marginBottom: 16,
  },
  studentAvatar: {
    width: 48, height: 48,
    borderRadius: 24,
    backgroundColor: pdfColors.primary[500],
    color: pdfColors.neutral[0],
    textAlign: "center", textAlignVertical: "center",
    fontSize: 20, fontWeight: 700,
    marginRight: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 14, fontWeight: 700,
    color: pdfColors.neutral[900],
  },
  studentNameBn: {
    fontFamily: "HindSiliguri",
    fontSize: 11,
    color: pdfColors.neutral[600],
    marginTop: 2,
  },
  studentNameAr: {
    fontFamily: "NotoNaskhArabic",
    direction: "rtl",
    fontSize: 11,
    color: pdfColors.neutral[600],
    marginTop: 2,
  },
  studentMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  studentMetaChip: {
    fontSize: 8,
    backgroundColor: pdfColors.neutral[0],
    color: pdfColors.neutral[700],
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: pdfColors.neutral[200],
  },
  /* Section title */
  sectionTitle: {
    fontSize: 11, fontWeight: 700,
    color: pdfColors.primary[700],
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  /* Subjects table */
  table: {
    borderWidth: 1,
    borderColor: pdfColors.neutral[200],
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: pdfColors.primary[500],
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 700,
    color: pdfColors.neutral[0],
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.neutral[100],
  },
  tableRowAlt: {
    backgroundColor: pdfColors.neutral[50],
  },
  tableCell: {
    fontSize: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    color: pdfColors.neutral[800],
  },
  col1: { flexBasis: "45%" },
  col2: { flexBasis: "18%", textAlign: "right" },
  col3: { flexBasis: "18%", textAlign: "right" },
  col4: { flexBasis: "19%", textAlign: "center" },
  /* Summary row */
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: pdfColors.accent[50],
    borderWidth: 1,
    borderColor: pdfColors.accent[100],
    borderLeftWidth: 3,
    borderLeftColor: pdfColors.accent[500],
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  summaryCell: {
    flexDirection: "column",
  },
  summaryLabel: {
    fontSize: 8,
    color: pdfColors.accent[700],
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 700,
    color: pdfColors.primary[700],
  },
  /* Position badge (conditional — Risk R7) */
  positionBadge: {
    backgroundColor: pdfColors.accent[500],
    color: pdfColors.neutral[0],
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 2,
    fontSize: 11,
    fontWeight: 700,
  },
  /* Footer signatures */
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: pdfColors.neutral[200],
  },
  signatureBlock: { width: "45%" },
  signatureLine: {
    marginTop: 32,
    height: 1,
    backgroundColor: pdfColors.neutral[400],
  },
  signatureLabel: {
    fontSize: 9,
    color: pdfColors.neutral[500],
    textAlign: "center",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  footerNote: {
    fontSize: 8,
    color: pdfColors.neutral[400],
    textAlign: "center",
    marginTop: 16,
    fontStyle: "italic",
  },
});

export function MarkSheet({
  studentId, exam, rankingEnabled = true, position = 1, locale = "en",
}: MarkSheetProps) {
  ensurePdfReady();
  const branch = getBranchInfo();
  const student: PdfStudentInfo = getStudentInfo(studentId);
  const examInfo: PdfExamInfo = exam ?? getExamInfo({
    classId: `cls-${student.className.replace("Class ", "")}`,
    section: student.section,
  });
  const subjects: PdfSubjectMark[] = getSubjectMarks(student);
  const total = subjects.reduce((sum, s) => sum + s.obtained, 0);
  const fullTotal = subjects.reduce((sum, s) => sum + s.fullMarks, 0);
  const gpa = subjects.reduce((sum, s) => sum + marksToGpa(s.obtained), 0) / subjects.length;
  const examDateLabel = formatDate(new Date(examInfo.date), locale);
  const avatarInitial = student.name.charAt(0).toUpperCase();

  return (
    <Document
      title={`Mark Sheet — ${student.name} (${examInfo.name})`}
      author="MadrashaOS"
      subject="Mark Sheet"
    >
      <Page size="A4" style={styles.page}>
        {/* Header bar */}
        <View style={styles.headerBar}>
          <View style={styles.headerBrand}>
            <Text style={styles.monogram}>م</Text>
            <View>
              <Text style={styles.brandName}>{pdfOrgName}</Text>
              <Text style={styles.brandSub}>{branch.name}</Text>
            </View>
          </View>
          <Text style={styles.docType}>Mark Sheet</Text>
        </View>
        <View style={styles.goldDivider} />

        {/* Exam banner */}
        <View style={styles.examBanner}>
          <View>
            <Text style={styles.examName}>{examInfo.name}</Text>
            <Text style={styles.examDate}>{examInfo.className} · Section {examInfo.section}</Text>
          </View>
          <Text style={styles.examDate}>Held on {examDateLabel}</Text>
        </View>

        {/* Student info card */}
        <View style={styles.studentCard}>
          <Text style={styles.studentAvatar}>{avatarInitial}</Text>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{student.name}</Text>
            {student.nameBn && <Text style={styles.studentNameBn}>{student.nameBn}</Text>}
            {student.nameAr && <Text style={styles.studentNameAr}>{student.nameAr}</Text>}
            <View style={styles.studentMetaRow}>
              <Text style={styles.studentMetaChip}>Code: {student.code}</Text>
              <Text style={styles.studentMetaChip}>Roll: {student.roll}</Text>
              <Text style={styles.studentMetaChip}>{student.className} · Sec {student.section}</Text>
            </View>
          </View>
        </View>

        {/* Subjects table */}
        <Text style={styles.sectionTitle}>Subject-wise Marks</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.col1]}>Subject</Text>
            <Text style={[styles.tableHeaderCell, styles.col2]}>Full Marks</Text>
            <Text style={[styles.tableHeaderCell, styles.col3]}>Obtained</Text>
            <Text style={[styles.tableHeaderCell, styles.col4]}>Grade</Text>
          </View>
          {subjects.map((s, i) => {
            const grade = marksToGrade(s.obtained);
            const rowStyle = i % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow;
            return (
              <View key={s.id} style={rowStyle}>
                <Text style={[styles.tableCell, styles.col1]}>
                  {s.name}
                  {"\n"}
                  <Text style={{ fontFamily: "HindSiliguri", fontSize: 8, color: pdfColors.neutral[500] }}>
                    {s.nameBn}
                  </Text>
                </Text>
                <Text style={[styles.tableCell, styles.col2]}>{s.fullMarks}</Text>
                <Text style={[styles.tableCell, styles.col3]}>{s.obtained}</Text>
                <Text style={[styles.tableCell, styles.col4, { fontWeight: 700, color: pdfColors.primary[700] }]}>
                  {grade}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Summary row */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Total Marks</Text>
            <Text style={styles.summaryValue}>{total} / {fullTotal}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>GPA (out of 5.00)</Text>
            <Text style={styles.summaryValue}>{gpa.toFixed(2)}</Text>
          </View>
          {rankingEnabled && (
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Position</Text>
              <Text style={styles.positionBadge}>
                {position === 1 ? "1st" : position === 2 ? "2nd" : position === 3 ? "3rd" : `${position}th`}
              </Text>
            </View>
          )}
        </View>

        {/* Footer: signatures */}
        <View style={styles.footer}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Class Teacher</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Principal</Text>
          </View>
        </View>

        <Text style={styles.footerNote}>
          This mark sheet is computer-generated and is valid only with the principal&apos;s signature.
        </Text>
      </Page>
    </Document>
  );
}
