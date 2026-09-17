"use client";

/**
 * MadrashaOS — Zakat Dashboard (C3.4 — Finance · Zakat · Risk R9)
 *
 * Fund-isolated visualization per SRS §3.7 — Zakat money is never
 * co-mingled with general funds. This page:
 *   1. Surfaces ONLY Zakat-fund accounts (filter useAccounts() to fund==="zakat")
 *   2. Big accent-gold card at top: Zakat Fund Balance (ZakatFundCard)
 *   3. Two lists: Received (credits to acc-zakat-fund) + Distributed (debits)
 *   4. Every row carries a Zakat badge (accent tone) so the operator can
 *      visually trace Zakat money anywhere in the system
 *   5. Non-Zakat accounts shown in a separate "Other Funds" section with
 *      reduced opacity — visually distinct, never editable from here
 *
 * Action gates:
 *   - "Receive Zakat"    → code="zakat.receive"
 *   - "Distribute Zakat" → code="zakat.distribute" (with fund-balance check)
 *
 * All accent-gold treatments use text-accent-700 on bg-accent-50.
 */

import * as React from "react";
import { HandCoins, Scale, ArrowDownLeft, ArrowUpRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { IfPermission } from "@/components/auth/IfPermission";
import { LoadingState, ErrorState, PermissionDenied } from "@/components/states";
import { useSessionStore } from "@/stores/sessionStore";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatCurrency, formatDate } from "@/lib/i18n/format";
import { useAccounts, useLedgerEntries } from "@/lib/query/client";
import { users } from "@/lib/mock/fixtures/users";
import { ZakatFundCard } from "@/components/finance/ZakatFundCard";
import { ReceiveZakatDialog } from "@/components/finance/ReceiveZakatDialog";
import { DistributeZakatDialog } from "@/components/finance/DistributeZakatDialog";

const ZAKAT_ACCOUNT_ID = "acc-zakat-fund";

/** Zakat badge — accent tone, reused on every Zakat row (Risk R9). */
function ZakatBadge() {
  return (
    <Badge className="bg-accent-500 text-accent-foreground">Zakat</Badge>
  );
}

export default function ZakatPage() {
  const { locale } = useI18n();
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const canView = hasPermission("zakat.view");

  const { data: accounts, isLoading: accountsLoading, isError: accountsError, refetch: refetchAccounts } = useAccounts();
  const { data: ledger, isLoading: ledgerLoading, isError: ledgerError, refetch: refetchLedger } = useLedgerEntries();

  const [receiveOpen, setReceiveOpen] = React.useState(false);
  const [distributeOpen, setDistributeOpen] = React.useState(false);

  if (!canView) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <PermissionDenied resource="Zakat" />
        </div>
      </div>
    );
  }

  const isLoading = accountsLoading || ledgerLoading;
  const isError = accountsError || ledgerError;
  const refetch = () => { refetchAccounts(); refetchLedger(); };

  const zakatAccounts = accounts?.filter((a) => a.fund === "zakat");
  const otherAccounts = accounts?.filter((a) => a.fund !== "zakat") ?? [];
  const zakatBalance = (zakatAccounts ?? []).reduce((s, a) => s + a.balance, 0);

  // Zakat ledger entries: any entry touching acc-zakat-fund on either side.
  const zakatEntries = (ledger ?? []).filter(
    (e) => e.debitAccount === ZAKAT_ACCOUNT_ID || e.creditAccount === ZAKAT_ACCOUNT_ID,
  );
  const received = zakatEntries.filter((e) => e.creditAccount === ZAKAT_ACCOUNT_ID);
  const distributed = zakatEntries.filter((e) => e.debitAccount === ZAKAT_ACCOUNT_ID);

  const totalReceived = received.reduce((s, e) => s + e.amount, 0);
  const totalDistributed = distributed.reduce((s, e) => s + e.amount, 0);
  const lastDistributionAmount = distributed[0]?.amount ?? 0;

  const accountName = (id: string) => accounts?.find((a) => a.id === id)?.name ?? id;
  const postedBy = (id: string) => users.find((u) => u.id === id)?.name ?? id;

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-display font-bold text-text-primary">
              Zakat Dashboard
            </h1>
            <p className="mt-1 text-body text-text-secondary">
              Fund-isolated. Zakat money is never co-mingled with general funds (SRS §3.7).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <IfPermission code="zakat.receive">
              <Button variant="outline" className="border-accent-500/40 text-accent-700 hover:bg-accent-50" onClick={() => setReceiveOpen(true)}>
                <HandCoins className="h-4 w-4" />
                Receive Zakat
              </Button>
            </IfPermission>
            <IfPermission code="zakat.distribute">
              <Button className="bg-accent-500 text-accent-foreground hover:bg-accent-500/90" onClick={() => setDistributeOpen(true)}>
                <Scale className="h-4 w-4" />
                Distribute Zakat
              </Button>
            </IfPermission>
          </div>
        </header>

        {/* Big Zakat Fund Card */}
        {isLoading ? (
          <div className="h-32 animate-pulse rounded-xl bg-accent-50/50" />
        ) : (
          <ZakatFundCard
            zakatAccounts={zakatAccounts}
            isLoading={accountsLoading}
            recentDistribution={lastDistributionAmount}
          />
        )}

        {/* Loading + error states */}
        {isLoading && <LoadingState pattern="table" rows={5} />}
        {isError && <ErrorState onRetry={refetch} />}

        {!isLoading && !isError && (
          <>
            {/* Two-column: Received + Distributed */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Received */}
              <div className="rounded-lg border border-border-default bg-surface-card">
                <div className="flex items-center justify-between border-b border-border-default p-4">
                  <div className="flex items-center gap-2">
                    <ArrowDownLeft className="h-4 w-4 text-semantic-success" />
                    <h2 className="text-subtitle font-semibold text-text-primary">
                      Received
                    </h2>
                    <ZakatBadge />
                  </div>
                  <p className="font-mono text-body font-semibold text-semantic-success">
                    +{formatCurrency(totalReceived, locale)}
                  </p>
                </div>
                {received.length === 0 ? (
                  <p className="p-4 text-caption text-text-muted">No Zakat receipts recorded.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-neutral-50">
                        <TableHead className="px-4">Date</TableHead>
                        <TableHead className="px-4">Voucher</TableHead>
                        <TableHead className="px-4">From</TableHead>
                        <TableHead className="px-4 text-end">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {received.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="px-4 py-2.5 text-caption text-text-secondary">
                            {formatDate(new Date(e.date), locale)}
                          </TableCell>
                          <TableCell className="px-4 py-2.5 font-mono text-caption text-text-primary">
                            {e.voucherNo}
                          </TableCell>
                          <TableCell className="px-4 py-2.5 text-body text-text-secondary">
                            {accountName(e.debitAccount)}
                          </TableCell>
                          <TableCell className="px-4 py-2.5 text-end font-mono text-body text-semantic-success">
                            +{formatCurrency(e.amount, locale)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Distributed */}
              <div className="rounded-lg border border-border-default bg-surface-card">
                <div className="flex items-center justify-between border-b border-border-default p-4">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="h-4 w-4 text-semantic-danger" />
                    <h2 className="text-subtitle font-semibold text-text-primary">
                      Distributed
                    </h2>
                    <ZakatBadge />
                  </div>
                  <p className="font-mono text-body font-semibold text-semantic-danger">
                    −{formatCurrency(totalDistributed, locale)}
                  </p>
                </div>
                {distributed.length === 0 ? (
                  <p className="p-4 text-caption text-text-muted">No Zakat distributions recorded.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-neutral-50">
                        <TableHead className="px-4">Date</TableHead>
                        <TableHead className="px-4">Voucher</TableHead>
                        <TableHead className="px-4">To</TableHead>
                        <TableHead className="px-4 text-end">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {distributed.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="px-4 py-2.5 text-caption text-text-secondary">
                            {formatDate(new Date(e.date), locale)}
                          </TableCell>
                          <TableCell className="px-4 py-2.5 font-mono text-caption text-text-primary">
                            {e.voucherNo}
                          </TableCell>
                          <TableCell className="px-4 py-2.5 text-body text-text-secondary">
                            {accountName(e.creditAccount)}
                          </TableCell>
                          <TableCell className="px-4 py-2.5 text-end font-mono text-body text-semantic-danger">
                            −{formatCurrency(e.amount, locale)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>

            {/* Other funds — reduced opacity, read-only */}
            <div className="rounded-lg border border-border-default bg-surface-card opacity-60">
              <div className="flex items-center gap-2 border-b border-border-default p-4">
                <AlertTriangle className="h-4 w-4 text-text-muted" />
                <h2 className="text-subtitle font-semibold text-text-secondary">
                  Other Funds (General)
                </h2>
                <Badge variant="outline" className="text-text-muted">
                  Read-only · not Zakat
                </Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50">
                    <TableHead className="px-4">Code</TableHead>
                    <TableHead className="px-4">Account</TableHead>
                    <TableHead className="px-4">Type</TableHead>
                    <TableHead className="px-4 text-end">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otherAccounts.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="px-4 py-2.5 font-mono text-caption text-text-muted">
                        {a.code}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-body text-text-secondary">
                        {a.name}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-caption text-text-muted capitalize">
                        {a.type}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-end font-mono text-body text-text-secondary">
                        {formatCurrency(a.balance, locale)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <p className="text-caption text-text-muted">
              Zakat fund balance: {formatCurrency(zakatBalance, locale)} ·
              Total received: {formatCurrency(totalReceived, locale)} ·
              Total distributed: {formatCurrency(totalDistributed, locale)}
            </p>
          </>
        )}
      </div>

      <ReceiveZakatDialog open={receiveOpen} onOpenChange={setReceiveOpen} />
      <DistributeZakatDialog open={distributeOpen} onOpenChange={setDistributeOpen} />
    </div>
  );
}
