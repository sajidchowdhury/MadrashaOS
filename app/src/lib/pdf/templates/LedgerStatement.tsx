"use client";

/**
 * MadrashaOS — PDF Template: Ledger Statement (C5.1 / Task 5-a)
 *
 * Running-balance ledger statement per SRS §2.4.3 (Double-Entry Ledger).
 *
 * Layout:
 *   ┌──────────────────────────────────────────────┐
 *   │ ▓▓ MadrashaOS · Ledger Statement ▓▓          │
 *   │ ─── gold accent divider ───                   │
 *   │ Date range · Account name                     │
 *   │ Opening balance: ৳0.00                        │
 *   │ ┌─ Table ────────────────────────────────┐  │
 *   │ │ Date │ Voucher │ Narration │ Dr │ Cr │ Bal │  │
 *   │ └────────────────────────────────────────┘  │
 *   │ Closing balance: ৳XXX (highlighted)          │
 *   │ Generated on [date]                          │
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
import {
  getBranchInfo, getLedgerRows, type PdfLedgerRow,
} from "@/lib/pdf/mockData";

export type LedgerStatementProps = {
  from?: string;
  to?: string;
  accountFilter?: string;
  accountName?: string;
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
  /* Date range banner */
  rangeBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: pdfColors.primary[50],
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  rangeLeft: {
    fontSize: 11, fontWeight: 700,
    color: pdfColors.primary[700],
  },
  rangeRight: {
    fontSize: 10, color: pdfColors.neutral[500],
  },
  /* Opening balance row */
  openingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: pdfColors.neutral[100],
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 8,
  },
  openingLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: pdfColors.neutral[700],
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  openingValue: {
    fontSize: 11, fontWeight: 700,
    color: pdfColors.neutral[900],
  },
  /* Table */
  sectionTitle: {
    fontSize: 10, fontWeight: 700,
    color: pdfColors.primary[700],
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
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
    letterSpacing: 0.6,
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
  tableCell: {
    fontSize: 9,
    paddingVertical: 6,
    paddingHorizontal: 8,
    color: pdfColors.neutral[800],
  },
  col1: { flexBasis: "12%" },
  col2: { flexBasis: "16%" },
  col3: { flexBasis: "32%" },
  col4: { flexBasis: "13%", textAlign: "right" },
  col5: { flexBasis: "13%", textAlign: "right" },
  col6: { flexBasis: "14%", textAlign: "right", fontWeight: 600, color: pdfColors.primary[700] },
  /* Closing balance */
  closingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: pdfColors.accent[500],
    color: pdfColors.neutral[0],
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 24,
  },
  closingLabel: {
    fontSize: 10, fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: pdfColors.neutral[0],
  },
  closingValue: {
    fontSize: 14, fontWeight: 700,
    color: pdfColors.accent[100],
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

export function LedgerStatement({
  from, to, accountFilter, accountName, locale = "en",
}: LedgerStatementProps) {
  ensurePdfReady();
  const branch = getBranchInfo();
  const { rows, openingBalance, closingBalance }: {
    rows: PdfLedgerRow[]; openingBalance: number; closingBalance: number;
  } = getLedgerRows({ from, to, accountFilter });

  const today = formatDate(new Date(), locale);
  const fromLabel = from ? formatDate(new Date(from), locale) : "Beginning";
  const toLabel = to ? formatDate(new Date(to), locale) : today;
  const openingLabel = formatCurrency(openingBalance, locale);
  const closingLabel = formatCurrency(closingBalance, locale);

  return (
    <Document
      title={`Ledger Statement — ${accountName ?? "All Accounts"}`}
      author="MadrashaOS"
      subject="Ledger Statement"
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
          <Text style={styles.docType}>Ledger Statement</Text>
        </View>
        <View style={styles.goldDivider} />

        {/* Date range */}
        <View style={styles.rangeBanner}>
          <Text style={styles.rangeLeft}>
            {accountName ?? "All Accounts"} · {fromLabel} → {toLabel}
          </Text>
          <Text style={styles.rangeRight}>Generated on {today}</Text>
        </View>

        {/* Opening balance */}
        <View style={styles.openingRow}>
          <Text style={styles.openingLabel}>Opening Balance</Text>
          <Text style={styles.openingValue}>{openingLabel}</Text>
        </View>

        {/* Table */}
        <Text style={styles.sectionTitle}>Journal Entries</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.col1]}>Date</Text>
            <Text style={[styles.tableHeaderCell, styles.col2]}>Voucher</Text>
            <Text style={[styles.tableHeaderCell, styles.col3]}>Narration</Text>
            <Text style={[styles.tableHeaderCell, styles.col4]}>Debit</Text>
            <Text style={[styles.tableHeaderCell, styles.col5]}>Credit</Text>
            <Text style={[styles.tableHeaderCell, styles.col6]}>Balance</Text>
          </View>
          {rows.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { textAlign: "center", flex: 1 }]}>
                No entries in the selected date range.
              </Text>
            </View>
          ) : (
            rows.map((r, i) => {
              const rowStyle = i % 2 === 1
                ? [styles.tableRow, styles.tableRowAlt]
                : styles.tableRow;
              return (
                <View key={r.voucherNo} style={rowStyle}>
                  <Text style={[styles.tableCell, styles.col1]}>
                    {formatDate(new Date(r.date), locale)}
                  </Text>
                  <Text style={[styles.tableCell, styles.col2]}>{r.voucherNo}</Text>
                  <Text style={[styles.tableCell, styles.col3]}>{r.narration}</Text>
                  <Text style={[styles.tableCell, styles.col4]}>
                    {r.debit > 0 ? formatCurrency(r.debit, locale) : "—"}
                  </Text>
                  <Text style={[styles.tableCell, styles.col5]}>
                    {r.credit > 0 ? formatCurrency(r.credit, locale) : "—"}
                  </Text>
                  <Text style={[styles.tableCell, styles.col6]}>
                    {formatCurrency(r.balance, locale)}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {/* Closing balance (highlighted) */}
        <View style={styles.closingRow}>
          <Text style={styles.closingLabel}>Closing Balance</Text>
          <Text style={styles.closingValue}>{closingLabel}</Text>
        </View>

        <Text style={styles.footerNote}>
          This statement is computer-generated · {rows.length} entries ·
          Period: {fromLabel} to {toLabel}.
        </Text>
      </Page>
    </Document>
  );
}
