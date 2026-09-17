"use client";

/**
 * MadrashaOS — PDF Template: Result Sheet (C5.1 / Task 5-a)
 *
 * Class-wide result sheet ranking all students by total marks
 * per SRS §2.5.3 (Results).
 *
 * Layout:
 *   ┌──────────────────────────────────────────────┐
 *   │ ▓▓ MadrashaOS · Result Sheet · [Class] ▓▓    │
 *   │ ─── gold accent divider ───                   │
 *   │ Exam name · date                              │
 *   │ ┌─ Table ────────────────────────────────┐  │
 *   │ │ Roll │ Student │ Marks │ Grade │ GPA    │  │
 *   │ └────────────────────────────────────────┘  │
 *   │ Summary: highest · average · pass rate       │
 *   │ Prepared by ___   Approved by ___            │
 *   └──────────────────────────────────────────────┘
 */

import * as React from "react";
import {
  Document, Page, View, Text, StyleSheet,
} from "@react-pdf/renderer";
import type { Locale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/i18n/format";
import {
  pdfColors, pdfOrgName, ensurePdfReady,
} from "@/lib/pdf/brand";
import {
  getBranchInfo, getExamInfo, getResultRows,
  type PdfExamInfo, type PdfResultRow,
} from "@/lib/pdf/mockData";

export type ResultSheetProps = {
  exam?: PdfExamInfo;
  classId?: string;
  section?: string;
  limit?: number;
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
  subBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: pdfColors.primary[50],
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  subBannerLeft: {
    fontSize: 11,
    fontWeight: 700,
    color: pdfColors.primary[700],
  },
  subBannerRight: {
    fontSize: 10,
    color: pdfColors.neutral[500],
  },
  sectionTitle: {
    fontSize: 11, fontWeight: 700,
    color: pdfColors.primary[700],
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  /* Table */
  table: {
    borderWidth: 1,
    borderColor: pdfColors.neutral[200],
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
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
  tableRowTop: {
    backgroundColor: pdfColors.accent[50],
  },
  tableCell: {
    fontSize: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    color: pdfColors.neutral[800],
  },
  col1: { flexBasis: "8%", textAlign: "center" },
  col2: { flexBasis: "44%" },
  col3: { flexBasis: "16%", textAlign: "right" },
  col4: { flexBasis: "16%", textAlign: "center" },
  col5: { flexBasis: "16%", textAlign: "right" },
  rankBadge: {
    fontSize: 9,
    fontWeight: 700,
    color: pdfColors.neutral[0],
    backgroundColor: pdfColors.primary[500],
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  /* Summary */
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
    marginBottom: 24,
  },
  summaryCell: { flexDirection: "column" },
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

export function ResultSheet({
  exam, classId = "cls-5", section = "A", limit = 10, locale = "en",
}: ResultSheetProps) {
  ensurePdfReady();
  const branch = getBranchInfo();
  const examInfo = exam ?? getExamInfo({ classId, section });
  const rows: PdfResultRow[] = getResultRows({ classId, section, limit });
  const sorted = [...rows].sort((a, b) => b.marks - a.marks);

  const totalMarks = sorted.reduce((s, r) => s + r.marks, 0);
  const highest = sorted.length > 0 ? sorted[0].marks : 0;
  const average = sorted.length > 0 ? totalMarks / sorted.length : 0;
  const passCount = sorted.filter((r) => r.grade !== "F").length;
  const passRate = sorted.length > 0 ? (passCount / sorted.length) * 100 : 0;
  const fullMarks = 6 * 100; // 6 subjects × 100 marks each

  const examDateLabel = formatDate(new Date(examInfo.date), locale);
  const classNameLabel = examInfo.className;

  return (
    <Document
      title={`Result Sheet — ${classNameLabel} · ${examInfo.name}`}
      author="MadrashaOS"
      subject="Class Result Sheet"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerBar}>
          <View style={styles.headerBrand}>
            <Text style={styles.monogram}>م</Text>
            <View>
              <Text style={styles.brandName}>{pdfOrgName}</Text>
              <Text style={styles.brandSub}>{branch.name}</Text>
            </View>
          </View>
          <Text style={styles.docType}>Result Sheet</Text>
        </View>
        <View style={styles.goldDivider} />

        {/* Exam banner */}
        <View style={styles.subBanner}>
          <View>
            <Text style={styles.subBannerLeft}>
              {examInfo.name} · {classNameLabel} · Section {section}
            </Text>
          </View>
          <Text style={styles.subBannerRight}>Held on {examDateLabel}</Text>
        </View>

        {/* Table */}
        <Text style={styles.sectionTitle}>Student Rankings</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.col1]}>Roll</Text>
            <Text style={[styles.tableHeaderCell, styles.col2]}>Student Name</Text>
            <Text style={[styles.tableHeaderCell, styles.col3]}>Marks</Text>
            <Text style={[styles.tableHeaderCell, styles.col4]}>Grade</Text>
            <Text style={[styles.tableHeaderCell, styles.col5]}>GPA</Text>
          </View>
          {sorted.map((r, i) => {
            const isTop3 = i < 3;
            const rowStyle = isTop3
              ? [styles.tableRow, styles.tableRowTop]
              : i % 2 === 1
                ? [styles.tableRow, styles.tableRowAlt]
                : styles.tableRow;
            return (
              <View key={`${r.roll}-${r.name}`} style={rowStyle}>
                <Text style={[styles.tableCell, styles.col1]}>
                  {isTop3 ? (
                    <Text style={styles.rankBadge}>{i + 1}</Text>
                  ) : (
                    String(r.roll)
                  )}
                </Text>
                <Text style={[styles.tableCell, styles.col2]}>
                  {r.name}
                  {"\n"}
                  <Text style={{ fontFamily: "HindSiliguri", fontSize: 8, color: pdfColors.neutral[500] }}>
                    {r.nameBn}
                  </Text>
                </Text>
                <Text style={[styles.tableCell, styles.col3]}>
                  {r.marks} / {fullMarks}
                </Text>
                <Text style={[styles.tableCell, styles.col4, { fontWeight: 700, color: pdfColors.primary[700] }]}>
                  {r.grade}
                </Text>
                <Text style={[styles.tableCell, styles.col5]}>{r.gpa.toFixed(2)}</Text>
              </View>
            );
          })}
        </View>

        {/* Summary row */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Highest</Text>
            <Text style={styles.summaryValue}>{highest}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Average</Text>
            <Text style={styles.summaryValue}>{average.toFixed(1)}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Pass Rate</Text>
            <Text style={styles.summaryValue}>{passRate.toFixed(0)}%</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Total Students</Text>
            <Text style={styles.summaryValue}>{sorted.length}</Text>
          </View>
        </View>

        {/* Footer signatures */}
        <View style={styles.footer}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Prepared By</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Approved By</Text>
          </View>
        </View>

        <Text style={styles.footerNote}>
          This result sheet is computer-generated and provisional until signed by the principal.
        </Text>
      </Page>
    </Document>
  );
}
