"use client";

/**
 * MadrashaOS — PDF Template: Completion Certificate (C5.1 / Task 5-a)
 *
 * Decorative completion certificate per the Phase 3 placeholder spec.
 *
 * Layout (landscape A4):
 *   ┌─ gold double border ──────────────────────────────┐
 *   │                                                     │
 *   │       MADRASHAOS · Darul Uloom Madrasha              │
 *   │           ─── gold accent divider ───                │
 *   │                                                     │
 *   │    CERTIFICATE OF COMPLETION                        │
 *   │                                                     │
 *   │    This is to certify that                          │
 *   │         [STUDENT NAME]   (ar/bn)                    │
 *   │    has successfully completed                       │
 *   │         [CLASS] at [MADRASHA NAME]                  │
 *   │                                                     │
 *   │   [Date]            (seal)            [Signature]    │
 *   │                                                     │
 *   │     ⚠ PHASE 3 PLACEHOLDER (diagonal watermark) ⚠   │
 *   └─────────────────────────────────────────────────────┘
 */

import * as React from "react";
import {
  Document, Page, View, Text, StyleSheet,
} from "@react-pdf/renderer";
import type { Locale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/i18n/format";
import {
  pdfColors, pdfOrgName, pdfOrgNameBn, ensurePdfReady,
} from "@/lib/pdf/brand";
import { getBranchInfo, getStudentInfo } from "@/lib/pdf/mockData";

export type CertificateProps = {
  studentId: string;
  className?: string;
  date?: string;
  locale?: Locale;
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 12,
    color: pdfColors.neutral[800],
    backgroundColor: pdfColors.neutral[0],
    padding: 36,
    paddingBottom: 48,
  },
  /* Decorative double border (gold) */
  outerBorder: {
    flex: 1,
    borderWidth: 3,
    borderColor: pdfColors.accent[500],
    borderRadius: 8,
    padding: 8,
  },
  innerBorder: {
    flex: 1,
    borderWidth: 1,
    borderColor: pdfColors.accent[100],
    borderRadius: 4,
    padding: 24,
    position: "relative",
  },
  /* Watermark — diagonal "PHASE 3 PLACEHOLDER" */
  watermark: {
    position: "absolute",
    top: "40%",
    left: "-20%",
    right: "-20%",
    transform: "rotate(-30deg)",
    textAlign: "center",
    fontSize: 60,
    fontWeight: 700,
    color: pdfColors.neutral[200],
    opacity: 0.6,
    letterSpacing: 4,
  },
  /* Header */
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    marginBottom: 4,
  },
  monogram: {
    width: 56, height: 56,
    borderRadius: 28,
    backgroundColor: pdfColors.primary[500],
    color: pdfColors.accent[500],
    textAlign: "center", textAlignVertical: "center",
    fontSize: 28, fontWeight: 700,
  },
  headerText: {
    flexDirection: "column",
  },
  brandName: {
    fontSize: 22, fontWeight: 700,
    color: pdfColors.primary[700],
    letterSpacing: -0.5,
  },
  brandNameBn: {
    fontFamily: "HindSiliguri",
    fontSize: 14,
    color: pdfColors.neutral[600],
    marginTop: 2,
  },
  brandAddr: {
    fontSize: 9,
    color: pdfColors.neutral[500],
    marginTop: 2,
  },
  /* Gold divider */
  divider: {
    height: 2,
    backgroundColor: pdfColors.accent[500],
    width: "60%",
    marginHorizontal: "20%",
    marginVertical: 16,
    borderRadius: 1,
  },
  /* Title */
  certTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: pdfColors.primary[500],
    textAlign: "center",
    letterSpacing: 4,
    textTransform: "uppercase",
    marginBottom: 24,
  },
  certSubtitle: {
    fontSize: 11,
    color: pdfColors.neutral[500],
    textAlign: "center",
    marginBottom: 24,
    fontStyle: "italic",
  },
  /* Body */
  bodyText: {
    fontSize: 13,
    color: pdfColors.neutral[700],
    textAlign: "center",
    marginBottom: 8,
  },
  studentName: {
    fontSize: 28,
    fontWeight: 700,
    color: pdfColors.neutral[900],
    textAlign: "center",
    marginVertical: 16,
    letterSpacing: -0.5,
  },
  studentNameBn: {
    fontFamily: "HindSiliguri",
    fontSize: 16,
    color: pdfColors.neutral[700],
    textAlign: "center",
    marginBottom: 4,
  },
  studentNameAr: {
    fontFamily: "NotoNaskhArabic",
    direction: "rtl",
    fontSize: 16,
    color: pdfColors.neutral[700],
    textAlign: "center",
    marginBottom: 16,
  },
  classNameLine: {
    fontSize: 14,
    fontWeight: 600,
    color: pdfColors.primary[700],
    textAlign: "center",
    marginBottom: 4,
  },
  /* Footer */
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 48,
    paddingHorizontal: 16,
  },
  footerCell: {
    width: "33%",
    alignItems: "center",
  },
  dateLabel: {
    fontSize: 10,
    color: pdfColors.neutral[500],
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 12,
    fontWeight: 600,
    color: pdfColors.neutral[800],
  },
  /* Madrasha seal — mock circle */
  seal: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: pdfColors.accent[500],
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: pdfColors.accent[50],
  },
  sealInner: {
    width: 72, height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: pdfColors.accent[700],
    alignItems: "center",
    justifyContent: "center",
  },
  sealText: {
    fontSize: 9,
    fontWeight: 700,
    color: pdfColors.accent[700],
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sealMono: {
    fontSize: 24,
    fontWeight: 700,
    color: pdfColors.primary[500],
    marginBottom: 2,
  },
  /* Signature */
  signatureLine: {
    width: "70%",
    height: 1,
    backgroundColor: pdfColors.neutral[400],
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 10,
    color: pdfColors.neutral[500],
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  signatureName: {
    fontSize: 11,
    fontWeight: 600,
    color: pdfColors.neutral[800],
    marginTop: 2,
  },
});

export function Certificate({
  studentId, className, date = "2026-12-20", locale = "en",
}: CertificateProps) {
  ensurePdfReady();
  const branch = getBranchInfo();
  const student = getStudentInfo(studentId);
  const classLabel = className ?? student.className;
  const dateLabel = formatDate(new Date(date), locale);

  return (
    <Document
      title={`Certificate — ${student.name}`}
      author="MadrashaOS"
      subject="Completion Certificate"
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.outerBorder}>
          <View style={styles.innerBorder}>
            {/* Watermark (Phase 3 placeholder) */}
            <Text style={styles.watermark}>PHASE 3 PLACEHOLDER</Text>

            {/* Header */}
            <View style={styles.headerRow}>
              <Text style={styles.monogram}>م</Text>
              <View style={styles.headerText}>
                <Text style={styles.brandName}>{pdfOrgName}</Text>
                <Text style={styles.brandNameBn}>{pdfOrgNameBn}</Text>
                <Text style={styles.brandAddr}>
                  {branch.name} · {branch.address}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Title */}
            <Text style={styles.certTitle}>Certificate of Completion</Text>
            <Text style={styles.certSubtitle}>
              This certificate is proudly presented to
            </Text>

            {/* Student name */}
            <Text style={styles.studentName}>{student.name}</Text>
            {student.nameBn && (
              <Text style={styles.studentNameBn}>{student.nameBn}</Text>
            )}
            {student.nameAr && (
              <Text style={styles.studentNameAr}>{student.nameAr}</Text>
            )}

            {/* Body */}
            <Text style={styles.bodyText}>
              has successfully completed the academic requirements for
            </Text>
            <Text style={styles.classNameLine}>{classLabel}</Text>
            <Text style={[styles.bodyText, { marginTop: 8 }]}>
              at {pdfOrgName} during the 2026 academic year.
            </Text>

            {/* Footer: date · seal · signature */}
            <View style={styles.footerRow}>
              <View style={styles.footerCell}>
                <Text style={styles.dateLabel}>Date</Text>
                <Text style={styles.dateValue}>{dateLabel}</Text>
              </View>

              <View style={styles.footerCell}>
                <View style={styles.seal}>
                  <View style={styles.sealInner}>
                    <Text style={styles.sealMono}>م</Text>
                    <Text style={styles.sealText}>Darul Uloom</Text>
                    <Text style={styles.sealText}>Madrasha</Text>
                  </View>
                </View>
              </View>

              <View style={styles.footerCell}>
                <View style={styles.signatureLine} />
                <Text style={styles.signatureLabel}>Principal</Text>
                <Text style={styles.signatureName}>Principal Ahmad</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
