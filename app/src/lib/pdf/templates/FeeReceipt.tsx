"use client";

/**
 * MadrashaOS — PDF Template: Fee Receipt (C5.1 / Task 5-a)
 *
 * Branded fee-collection receipt per SRS §2.4.1 (Fee Plans & Collection).
 *
 * Layout:
 *   ┌─────────────────────────────────────────────┐
 *   │ ▓▓ MadrashaOS · Branch ▓▓ (primary.500 bar) │
 *   │ ─── gold accent divider ───                 │
 *   │ Receipt No · Date · Student · Class · Sec   │
 *   │ ┌─ Installment table ────────────────────┐  │
 *   │ │ Label    │ Amount │ Method              │  │
 *   │ └────────────────────────────────────────┘  │
 *   │ Amount in words: "One Thousand Five … Only"│
 *   │ Signature ───────  This is a computer-gen…  │
 *   └─────────────────────────────────────────────┘
 *
 * Brand lock-in (Risk R13): primary.500 #0E5C5C + accent #C9A961 + neutral.0 #FFFFFF.
 * Arabic (Risk R14): rendered via NotoNaskhArabic font when nameAr is present.
 */

import * as React from "react";
import {
  Document, Page, View, Text, StyleSheet,
} from "@react-pdf/renderer";
import type { FeePayment, Student } from "@/lib/mock/types";
import type { Locale } from "@/lib/i18n/config";
import { formatDate, formatCurrency } from "@/lib/i18n/format";
import {
  pdfColors, pdfOrgName, ensurePdfReady, amountInWords,
} from "@/lib/pdf/brand";
import { getBranchInfo } from "@/lib/pdf/mockData";

export type FeeReceiptProps = {
  payment: FeePayment;
  student: Student;
  branchName?: string;
  locale?: Locale;
  className?: string;
  section?: string;
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
  /* Header bar (primary.500) */
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: pdfColors.primary[500],
    color: pdfColors.neutral[0],
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  headerBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  monogram: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: pdfColors.accent[500],
    color: pdfColors.primary[900],
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 18,
    fontWeight: 700,
  },
  brandName: {
    fontSize: 18,
    fontWeight: 700,
    color: pdfColors.neutral[0],
    letterSpacing: -0.3,
  },
  brandSub: {
    fontSize: 9,
    color: pdfColors.primary[100],
    marginTop: 1,
  },
  docType: {
    fontSize: 11,
    fontWeight: 700,
    color: pdfColors.accent[100],
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  /* Gold accent divider */
  goldDivider: {
    height: 3,
    backgroundColor: pdfColors.accent[500],
    marginTop: 0,
    marginBottom: 16,
    borderRadius: 1.5,
  },
  /* Body */
  body: {
    paddingHorizontal: 4,
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  metaCell: {
    flexBasis: "48%",
    flexGrow: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: pdfColors.neutral[50],
    borderRadius: 4,
    borderLeftWidth: 2,
    borderLeftColor: pdfColors.primary[300],
  },
  metaLabel: {
    fontSize: 8,
    color: pdfColors.neutral[500],
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 11,
    color: pdfColors.neutral[900],
    fontWeight: 600,
  },
  metaValueMono: {
    fontSize: 11,
    color: pdfColors.primary[700],
    fontFamily: "Inter",
    fontWeight: 600,
  },
  /* Section title */
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: pdfColors.primary[700],
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  /* Installment table */
  table: {
    borderWidth: 1,
    borderColor: pdfColors.neutral[200],
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: pdfColors.primary[50],
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.neutral[200],
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 700,
    color: pdfColors.primary[700],
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
  tableCell: {
    fontSize: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    color: pdfColors.neutral[800],
  },
  col1: { flexBasis: "50%" },
  col2: { flexBasis: "25%", textAlign: "right", fontFamily: "Inter" },
  col3: { flexBasis: "25%" },
  /* Total row */
  totalRow: {
    flexDirection: "row",
    backgroundColor: pdfColors.primary[500],
    color: pdfColors.neutral[0],
    paddingVertical: 10,
    paddingHorizontal: 10,
    justifyContent: "space-between",
    borderRadius: 4,
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: pdfColors.neutral[0],
  },
  totalValue: {
    fontSize: 13,
    fontWeight: 700,
    color: pdfColors.accent[100],
  },
  /* Amount in words */
  amountInWords: {
    backgroundColor: pdfColors.accent[50],
    borderWidth: 1,
    borderColor: pdfColors.accent[100],
    borderLeftWidth: 3,
    borderLeftColor: pdfColors.accent[500],
    padding: 10,
    marginBottom: 24,
    borderRadius: 2,
  },
  amountInWordsLabel: {
    fontSize: 8,
    color: pdfColors.accent[700],
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  amountInWordsValue: {
    fontSize: 11,
    fontWeight: 600,
    color: pdfColors.neutral[900],
  },
  /* Footer */
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: pdfColors.neutral[200],
  },
  signatureBlock: {
    width: "45%",
  },
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
  computerGen: {
    fontSize: 8,
    color: pdfColors.neutral[400],
    textAlign: "center",
    marginTop: 16,
    fontStyle: "italic",
  },
  /* Arabic name rendering (Risk R14) */
  arabicName: {
    fontFamily: "NotoNaskhArabic",
    direction: "rtl",
    fontSize: 11,
    color: pdfColors.neutral[700],
    marginTop: 2,
  },
  bnName: {
    fontFamily: "HindSiliguri",
    fontSize: 11,
    color: pdfColors.neutral[700],
    marginTop: 2,
  },
});

export function FeeReceipt({
  payment, student, branchName, locale = "en", className, section,
}: FeeReceiptProps) {
  ensurePdfReady();
  const branch = getBranchInfo(student.branchId);
  const branchLabel = branchName ?? branch.name;
  const dateLabel = formatDate(new Date(payment.collectedAt), locale);
  const amountLabel = formatCurrency(payment.amount, locale);
  const inWords = amountInWords(payment.amount);
  const methodLabel =
    payment.method === "cash" ? "Cash"
      : payment.method === "bank" ? "Bank Transfer"
        : payment.method === "mobile" ? "Mobile Wallet"
          : payment.method;
  const classLabel = className ?? student.classId.replace("cls-", "Class ");
  const sectionLabel = section ?? student.section;

  return (
    <Document
      title={`Fee Receipt — ${payment.receiptNo}`}
      author="MadrashaOS"
      subject="Fee Collection Receipt"
    >
      <Page size="A4" style={styles.page}>
        {/* Header bar */}
        <View style={styles.headerBar}>
          <View style={styles.headerBrand}>
            <Text style={styles.monogram}>م</Text>
            <View>
              <Text style={styles.brandName}>{pdfOrgName}</Text>
              <Text style={styles.brandSub}>{branchLabel}</Text>
            </View>
          </View>
          <Text style={styles.docType}>Fee Receipt</Text>
        </View>

        {/* Gold accent divider (Risk R13) */}
        <View style={styles.goldDivider} />

        <View style={styles.body}>
          {/* Meta grid */}
          <View style={styles.metaGrid}>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Receipt No</Text>
              <Text style={styles.metaValueMono}>{payment.receiptNo}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>{dateLabel}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Student</Text>
              <Text style={styles.metaValue}>{student.name}</Text>
              {student.nameBn && <Text style={styles.bnName}>{student.nameBn}</Text>}
              {student.nameAr && <Text style={styles.arabicName}>{student.nameAr}</Text>}
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Class / Section</Text>
              <Text style={styles.metaValue}>
                {classLabel} · Sec {sectionLabel}
              </Text>
              <Text style={[styles.metaValueMono, { fontSize: 9, marginTop: 2 }]}>
                {student.code}
              </Text>
            </View>
          </View>

          {/* Installment table */}
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.col1]}>Installment</Text>
              <Text style={[styles.tableHeaderCell, styles.col2]}>Amount</Text>
              <Text style={[styles.tableHeaderCell, styles.col3]}>Method</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.col1]}>
                Tuition Fee · {payment.collectedAt.slice(0, 7)}
              </Text>
              <Text style={[styles.tableCell, styles.col2]}>{amountLabel}</Text>
              <Text style={[styles.tableCell, styles.col3]}>{methodLabel}</Text>
            </View>
          </View>

          {/* Total row */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Collected</Text>
            <Text style={styles.totalValue}>{amountLabel}</Text>
          </View>

          {/* Amount in words */}
          <View style={styles.amountInWords}>
            <Text style={styles.amountInWordsLabel}>Amount in words</Text>
            <Text style={styles.amountInWordsValue}>{inWords}</Text>
          </View>

          {/* Footer: signatures + computer-gen note */}
          <View style={styles.footer}>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Collected By</Text>
            </View>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Authorised Signatory</Text>
            </View>
          </View>

          <Text style={styles.computerGen}>
            This is a computer-generated receipt · Generated by MadrashaOS · {dateLabel}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
