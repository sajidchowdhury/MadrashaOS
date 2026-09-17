"use client";

/**
 * MadrashaOS — Zakat Fund Card (C3.4 — Finance · Zakat · Risk R9)
 *
 * Fund-isolated headline KPI: shows ONLY the Zakat-fund account balance.
 * The accent-gold treatment (text-accent-700 on bg-accent-50) visually
 * distinguishes this card from general-fund cards — every Zakat surface
 * in the app reuses this accent tone so the operator can instantly tell
 * that the figure they're looking at belongs to the Zakat fund.
 *
 * Per SRS §3.7 / Risk R9: Zakat money is never co-mingled with general
 * funds. The card surfaces the fund badge + balance + delta vs. last
 * distribution.
 */

import { Scale } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatCurrency } from "@/lib/i18n/format";
import type { Account } from "@/lib/mock/types";

type Props = {
  zakatAccounts: Account[] | undefined;
  isLoading: boolean;
  recentDistribution?: number;
};

export function ZakatFundCard({ zakatAccounts, isLoading, recentDistribution = 0 }: Props) {
  const { locale } = useI18n();
  const balance = (zakatAccounts ?? []).reduce((sum, a) => sum + a.balance, 0);

  return (
    <Card className="overflow-hidden border-accent-500/30 bg-accent-50">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-500 text-accent-foreground"
                aria-hidden="true"
              >
                <Scale className="h-5 w-5" />
              </span>
              <div>
                <p className="text-caption font-medium uppercase tracking-wider text-accent-700">
                  Zakat Fund Balance
                </p>
                <p className="text-caption text-accent-700/70">
                  Isolated fund · SRS §3.7
                </p>
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="mt-2 h-10 w-48" />
            ) : (
              <p className="font-mono text-display font-bold text-accent-700">
                {formatCurrency(balance, locale)}
              </p>
            )}
            {!isLoading && recentDistribution > 0 && (
              <p className="text-caption text-accent-700/80">
                Last distribution: {formatCurrency(recentDistribution, locale)}
              </p>
            )}
          </div>
          <Badge className="bg-accent-500 text-accent-foreground">
            Zakat
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
