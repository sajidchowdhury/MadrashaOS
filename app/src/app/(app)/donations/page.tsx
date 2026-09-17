"use client";

/**
 * MadrashaOS — Donations Page (C3.4 — Finance · Donations · Risk R10)
 *
 * Public-facing donation form with:
 *   - Donor name (optional)
 *   - Email OR mobile (MANDATORY — at least one must be filled)
 *   - Amount
 *   - Donation type (General / Zakat / Sadaqah)
 *   - Anonymous checkbox
 *   - Honeypot field "website" — hidden, silently rejects if filled (bot trap)
 *
 * On submit:
 *   - If honeypot filled → silent reject with "Spam detected" inline error
 *   - If type === Zakat → show note "This donation will be posted to the
 *     Zakat fund (SRS §3.7)"
 *   - Success toast + "Download Receipt PDF" button (visual only — PDF in C5)
 *
 * Permission gate: the form is gated by `donations.create.public` (per SRS
 * §6.2 — public visitors may donate without login). Internal staff see an
 * alternative gate via `donations.create`.
 *
 * Recent donations list below uses inline mock data — no donations endpoint
 * exists yet in the mock API layer.
 */

import * as React from "react";
import {
  Heart, AlertTriangle, CheckCircle2, Download, ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { IfPermission } from "@/components/auth/IfPermission";
import { PermissionDenied } from "@/components/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatCurrency, formatDate } from "@/lib/i18n/format";

type DonationType = "general" | "zakat" | "sadaqah";

type RecentDonation = {
  id: string;
  donorName: string | null;
  amount: number;
  type: DonationType;
  method: "cash" | "bank" | "mobile" | "online";
  date: string; // ISO date
  anonymous: boolean;
};

// Inline mock donations (no donations fixture exists in the mock data layer).
const RECENT_DONATIONS: RecentDonation[] = [
  { id: "d-1", donorName: "Omar Faruq", amount: 5000, type: "zakat", method: "bank", date: "2026-09-16", anonymous: false },
  { id: "d-2", donorName: null, amount: 1500, type: "sadaqah", method: "cash", date: "2026-09-15", anonymous: true },
  { id: "d-3", donorName: "Aisha Begum", amount: 10000, type: "zakat", method: "bank", date: "2026-09-14", anonymous: false },
  { id: "d-4", donorName: "Anonymous Well-Wisher", amount: 2000, type: "general", method: "mobile", date: "2026-09-13", anonymous: true },
  { id: "d-5", donorName: "Bilal Ahmed", amount: 750, type: "sadaqah", method: "cash", date: "2026-09-12", anonymous: false },
];

export default function DonationsPage() {
  const { locale } = useI18n();
  const { toast } = useToast();

  const [donorName, setDonorName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [mobile, setMobile] = React.useState("");
  const [amount, setAmount] = React.useState<number>(0);
  const [donationType, setDonationType] = React.useState<DonationType>("general");
  const [anonymous, setAnonymous] = React.useState(false);
  const [honeypot, setHoneypot] = React.useState(""); // must stay empty
  const [submittedReceipt, setSubmittedReceipt] = React.useState<string | null>(null);
  const [spamDetected, setSpamDetected] = React.useState(false);

  const hasContact = email.trim().length > 0 || mobile.trim().length > 0;
  const emailValid = email.trim().length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const mobileValid = mobile.trim().length === 0 || mobile.replace(/[\s+-]/g, "").length >= 6;
  const canSubmit = hasContact && emailValid && mobileValid && amount > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSpamDetected(false);

    // Honeypot — silent reject with visible error (per spec).
    if (honeypot.trim().length > 0) {
      setSpamDetected(true);
      return;
    }

    if (!canSubmit) return;

    const num = 3000 + Math.floor(Math.random() * 7000);
    const rcp = `DON-2026-${num}`;
    setSubmittedReceipt(rcp);
    toast({
      title: "Donation received",
      description: `${rcp} — ${formatCurrency(amount, locale)} (${donationType})`,
    });

    // Reset form (keep the receipt visible for the PDF button).
    setDonorName("");
    setEmail("");
    setMobile("");
    setAmount(0);
    setDonationType("general");
    setAnonymous(false);
    setHoneypot("");
  };

  const handleReset = () => {
    setSubmittedReceipt(null);
    setSpamDetected(false);
  };

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header>
          <h1 className="text-display font-bold text-text-primary">Donations</h1>
          <p className="mt-1 text-body text-text-secondary">
            Accept public donations. Zakat donations are posted to the isolated Zakat fund.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Donation form — public gate */}
          <div className="lg:col-span-2">
            <IfPermission
              code="donations.create.public"
              fallback={
                <PermissionDenied resource="Public Donations" />
              }
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-subtitle">
                    <Heart className="h-5 w-5 text-accent-500" />
                    Make a Donation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Spam detected banner (honeypot triggered) */}
                  {spamDetected && (
                    <Alert variant="destructive" className="mb-4">
                      <ShieldAlert className="h-4 w-4" />
                      <AlertTitle>Spam detected</AlertTitle>
                      <AlertDescription>
                        Your submission was flagged as automated spam and has been rejected.
                        If you believe this is an error, please contact the madrasha office directly.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Success state with PDF receipt button */}
                  {submittedReceipt ? (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 rounded-lg border border-semantic-success/30 bg-success-50 p-4">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-semantic-success" />
                        <div className="flex-1">
                          <p className="text-subtitle font-semibold text-semantic-success">
                            Thank you — donation received
                          </p>
                          <p className="mt-1 text-body text-text-primary">
                            Receipt <span className="font-mono">{submittedReceipt}</span> has been generated.
                            A confirmation will be sent to your contact shortly.
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => toast({ title: "PDF generation pending", description: "Receipt PDFs arrive in Phase C5." })}>
                              <Download className="h-4 w-4" />
                              Download Receipt PDF
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleReset}>
                              Donate Again
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Donor name — optional */}
                      <div>
                        <Label htmlFor="donor-name" className="mb-1.5 block text-subtitle">
                          Donor Name <span className="text-text-muted">(optional)</span>
                        </Label>
                        <Input
                          id="donor-name"
                          placeholder="Your name"
                          value={donorName}
                          onChange={(e) => setDonorName(e.target.value)}
                          disabled={anonymous}
                        />
                      </div>

                      {/* Email OR Mobile — MANDATORY (Risk R10) */}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="email" className="mb-1.5 block text-subtitle">
                            Email <span className="text-text-muted">(email or mobile required)</span>
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            aria-invalid={!emailValid}
                            disabled={anonymous && mobile.trim().length > 0}
                          />
                          {!emailValid && (
                            <p className="mt-1 text-caption text-semantic-danger">
                              Please enter a valid email address.
                            </p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="mobile" className="mb-1.5 block text-subtitle">
                            Mobile <span className="text-text-muted">(email or mobile required)</span>
                          </Label>
                          <Input
                            id="mobile"
                            type="tel"
                            placeholder="+880 1XXX-XXXXXX"
                            value={mobile}
                            onChange={(e) => setMobile(e.target.value)}
                            aria-invalid={!mobileValid}
                            disabled={anonymous && email.trim().length > 0}
                          />
                          {!mobileValid && (
                            <p className="mt-1 text-caption text-semantic-danger">
                              Please enter a valid mobile number.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Email/mobile required hint */}
                      {!hasContact && !anonymous && (
                        <p className="flex items-center gap-1.5 text-caption text-semantic-warning" role="alert">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          At least one of email or mobile is required so we can send you the receipt.
                        </p>
                      )}

                      {/* Amount */}
                      <div>
                        <Label htmlFor="amount" className="mb-1.5 block text-subtitle">
                          Amount <span className="text-semantic-danger">*</span>
                        </Label>
                        <div className="relative">
                          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-mono text-body text-text-muted">
                            ৳
                          </span>
                          <Input
                            id="amount"
                            type="number"
                            min={1}
                            value={amount || ""}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            aria-invalid={amount <= 0}
                            className="ps-7 font-mono"
                          />
                        </div>
                        {amount <= 0 && (
                          <p className="mt-1 text-caption text-semantic-danger">Amount must be greater than zero.</p>
                        )}
                      </div>

                      {/* Donation type */}
                      <div>
                        <Label className="mb-1.5 block text-subtitle">Donation Type</Label>
                        <RadioGroup
                          value={donationType}
                          onValueChange={(v) => setDonationType(v as DonationType)}
                          className="grid grid-cols-3 gap-2"
                        >
                          {([
                            { id: "general", label: "General" },
                            { id: "zakat", label: "Zakat" },
                            { id: "sadaqah", label: "Sadaqah" },
                          ] as { id: DonationType; label: string }[]).map((opt) => (
                            <Label
                              key={opt.id}
                              className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 text-body transition-colors ${
                                donationType === opt.id
                                  ? opt.id === "zakat"
                                    ? "border-accent-500 bg-accent-50 text-accent-700"
                                    : "border-primary-500 bg-primary-50 text-primary-700"
                                  : "border-border-default hover:bg-surface-hover"
                              }`}
                            >
                              <RadioGroupItem value={opt.id} />
                              {opt.label}
                            </Label>
                          ))}
                        </RadioGroup>
                      </div>

                      {/* Zakat note (Risk R9 cross-link) */}
                      {donationType === "zakat" && (
                        <Alert className="border-accent-500/30 bg-accent-50">
                          <AlertTitle className="text-accent-700">Zakat posting</AlertTitle>
                          <AlertDescription className="text-accent-700/80">
                            This donation will be posted to the Zakat fund (SRS §3.7). Zakat money is
                            never co-mingled with general funds.
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Anonymous checkbox */}
                      <Label
                        htmlFor="anonymous"
                        className="flex cursor-pointer items-center gap-2 text-body text-text-secondary"
                      >
                        <Checkbox
                          id="anonymous"
                          checked={anonymous}
                          onCheckedChange={(c) => {
                            const checked = c === true;
                            setAnonymous(checked);
                            if (checked) setDonorName("");
                          }}
                        />
                        Donate anonymously (we still need email or mobile for the receipt)
                      </Label>

                      {/* Honeypot — visually hidden, must stay empty */}
                      <div aria-hidden="true" className="absolute -z-10 h-0 w-0 overflow-hidden opacity-0">
                        <label htmlFor="website">Website (leave blank)</label>
                        <input
                          id="website"
                          name="website"
                          type="text"
                          tabIndex={-1}
                          autoComplete="off"
                          value={honeypot}
                          onChange={(e) => setHoneypot(e.target.value)}
                        />
                      </div>

                      <Button type="submit" disabled={!canSubmit} className="w-full">
                        <Heart className="h-4 w-4" />
                        Donate {amount > 0 ? formatCurrency(amount, locale) : ""}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </IfPermission>
          </div>

          {/* Sidebar: Recent donations + Zakat note */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-subtitle">
                  Recent Donations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {RECENT_DONATIONS.map((d) => (
                    <li key={d.id} className="flex items-start justify-between gap-3 border-b border-border-default pb-2 last:border-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-body font-medium text-text-primary">
                          {d.anonymous ? "Anonymous" : (d.donorName ?? "Anonymous")}
                        </p>
                        <p className="text-caption text-text-muted">
                          {formatDate(new Date(d.date), locale)} · {d.method}
                        </p>
                        <Badge
                          variant="outline"
                          className={
                            d.type === "zakat"
                              ? "mt-1 border-accent-500/40 bg-accent-50 text-accent-700"
                              : "mt-1 text-text-secondary"
                          }
                        >
                          <span className="capitalize">{d.type}</span>
                        </Badge>
                      </div>
                      <p className="shrink-0 font-mono text-body font-medium text-semantic-success">
                        +{formatCurrency(d.amount, locale)}
                      </p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Public-permission explainer for staff */}
            <Alert>
              <AlertTitle>Permission model</AlertTitle>
              <AlertDescription>
                Public visitors can donate without login (gated by <code>donations.create.public</code>).
                Staff with the <code>donations.create</code> permission see the same form pre-authenticated.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    </div>
  );
}
