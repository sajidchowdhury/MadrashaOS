"use client";

/**
 * MadrashaOS — PDF Template: Outstanding Fees Report (C5.1 / Task 5-a)
 *
 * Lists all unpaid installments across all fee plans with a total
 * outstanding figure per Risk R12 ("as of [date]" timestamp) and
 * Risk R13 brand lock-in.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────┐
 *   │ ▓▓ MadrashaOS · Outstanding Fees Report ▓▓  │
 *   │ ─── gold accent divider ───                   │
 *   │ as of [today]                                 │
 *   │ ┌─ Table ────────────────────────────────┐  │
 *   │ │ Student │ Code │ Class │ Inst │ Amt │ Due  │  │
 *   │ └────────────────────────────────────────┘  │
 *   │ Total outstanding: ৳XXX (warning color)     │
 *   │ Total X students · Y installments outstanding │
 *   └──────────────────────────────────────────────┘
 */

import * as React from "react";
import {
  Document, Page, View, Text, StyleSheet,
} from "@react-pdf/renderer";
import type { Locale } from "@/lib/i18n/config";
import { formatDate, formatCurrency } from "@/lib/i18n/format";
import {
  pdfColors, pdfOrgName, ensurePdfReady,
} from "@/lib/pdf/brand";
import { getBranchInfo, getOutstandingInstallments } from "@/lib/pdf/mockData";

export type OutstandingFeesReportProps = {
  asOfDate?: string;
  locale?: Locale;
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 9,
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
  /* "As of" banner (Risk R12) */
  asOfBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: pdfColors.semantic.warningBg,
    borderWidth: 1,
    borderColor: pdfColors.semantic.warning,
    borderLeftWidth: 3,
    borderLeftColor: pdfColors.semantic.warning,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  asOfLabel: {
    fontSize: 10, fontWeight: 700,
    color: pdfColors.semantic.warning,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  asOfValue: {
    fontSize: 11, fontWeight: 600,
    color: pdfColors.neutral[800],
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
    fontSize: 8,
    fontWeight: 700,
    color: pdfColors.neutral[0],
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.neutral[100],
  },
  tableRowAlt: {
    backgroundColor: pdfColors.neutral[50],
  },
  tableRowOverdue: {
    backgroundColor: pdfColors.semantic.dangerBg,
  },
  tableCell: {
    fontSize: 9,
    paddingVertical: 6,
    paddingHorizontal: 8,
    color: pdfColors.neutral[800],
  },
  col1: { flexBasis: "30%" },
  col2: { flexBasis: "14%" },
  col3: { flexBasis: "14%" },
  col4: { flexBasis: "20%" },
  col5: { flexBasis: "11%", textAlign: "right" },
  col6: { flexBasis: "11%", textAlign: "right" },
  /* Total outstanding row */
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: pdfColors.semantic.warning,
    color: pdfColors.neutral[900],
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 11, fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: pdfColors.neutral[900],
  },
  totalValue: {
    fontSize: 16, fontWeight: 700,
    color: pdfColors.neutral[900],
  },
  /* Summary line */
  summaryLine: {
    fontSize: 9,
    color: pdfColors.neutral[500],
    textAlign: "center",
    marginBottom: 16,
  },
  /* Footer */
  footerNote: {
    fontSize: 8,
    color: pdfColors.neutral[400],
    textAlign: "center",
    marginTop: 16,
    fontStyle: "italic",
  },
});

export function OutstandingFeesReport({
  asOfDate, locale = "en",
}: OutstandingFeesReportProps) {
  ensurePdfReady();
  const branch = getBranchInfo();
  const installments = getOutstandingInstallments();
  const today = asOfDate ?? new Date().toISOString().slice(0, 10);
  const todayLabel = formatDate(new Date(today), locale);

  const studentCount = new Set(installments.map((i) => i.student.id)).size;
  const totalOutstanding = installments.reduce((s, i) => s + i.installment.amount, 0);
  const totalLabel = formatCurrency(totalOutstanding, locale);

  return (
    <Document
      title="Outstanding Fees Report"
      author="MadrashaOS"
      subject="Outstanding Fees Report"
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
          <Text style={styles.docType}>Outstanding Fees</Text>
        </View>
        <View style={styles.goldDivider} />

        {/* As-of banner (Risk R12) */}
        <View style={styles.asOfBanner}>
          <Text style={styles.asOfLabel}>Outstanding as of</Text>
          <Text style={styles.asOfValue}>{todayLabel}</Text>
        </View>

        {/* Table */}
        <Text style={styles.sectionTitle}>Unpaid Installments</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.col1]}>Student</Text>
            <Text style={[styles.tableHeaderCell, styles.col2]}>Code</Text>
            <Text style={[styles.tableHeaderCell, styles.col3]}>Class</Text>
            <Text style={[styles.tableHeaderCell, styles.col4]}>Installment</Text>
            <Text style={[styles.tableHeaderCell, styles.col5]}>Amount</Text>
            <Text style={[styles.tableHeaderCell, styles.col6]}>Due Date</Text>
          </View>
          {installments.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { textAlign: "center", flex: 1 }]}>
                All installments are paid. No outstanding fees.
              </Text>
            </View>
          ) : (
            installments.slice(0, 40).map((row, i) => {
              const isOverdue = row.daysOverdue > 0;
              const rowStyle = isOverdue
                ? [styles.tableRow, styles.tableRowOverdue]
                : i % 2 === 1
                  ? [styles.tableRow, styles.tableRowAlt]
                  : styles.tableRow;
              const className = row.student.classId.replace("cls-", "Class ");
              return (
                <View key={`${row.student.id}-${row.installment.id}`} style={rowStyle}>
                  <Text style={[styles.tableCell, styles.col1]}>
                    {row.student.name}
                    {"\n"}
                    <Text style={{ fontFamily: "HindSiliguri", fontSize: 7, color: pdfColors.neutral[500] }}>
                      {row.student.nameBn}
                    </Text>
                  </Text>
                  <Text style={[styles.tableCell, styles.col2]}>{row.student.code}</Text>
                  <Text style={[styles.tableCell, styles.col3]}>
                    {className} · {row.student.section}
                  </Text>
                  <Text style={[styles.tableCell, styles.col4]}>{row.installment.label}</Text>
                  <Text style={[styles.tableCell, styles.col5]}>
                    {formatCurrency(row.installment.amount, locale)}
                  </Text>
                  <Text style={[styles.tableCell, styles.col6]}>
                    {formatDate(new Date(row.installment.dueDate), locale)}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {/* Total outstanding */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Outstanding</Text>
          <Text style={styles.totalValue}>{totalLabel}</Text>
        </View>

        {/* Summary line */}
        <Text style={styles.summaryLine}>
          {studentCount} student{studentCount === 1 ? "" : "s"} ·{" "}
          {installments.length} installment{installments.length === 1 ? "" : "s"} outstanding ·
          {" "}As of {todayLabel}
        </Text>

        <Text style={styles.footerNote}>
          This report is computer-generated. Overdue installments are highlighted in red.
        </Text>
      </Page>
    </Document>
  );
}
