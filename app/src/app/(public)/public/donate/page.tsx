"use client";

/**
 * MadrashaOS — Public Donate Page (Task 8-a redesign)
 *
 * iom.edu.bd-style premium donation page:
 *   - Hero with "Support Our Mission" + gradient bg
 *   - Donation form: amount preset cards + custom input
 *   - Donation type radio cards (General / Zakat / Sadaqah)
 *   - If Zakat → note "This donation will be posted to the Zakat fund (SRS §3.7)"
 *   - Donor info + anonymous checkbox
 *   - Honeypot + reCAPTCHA placeholder
 *   - Recent donations list
 *   - Impact section: "Your ৳1000 provides…" cards
 *
 * SRS §3.7: Zakat money is never co-mingled with general funds.
 * Risk R10: email OR mobile MANDATORY so we can send receipt.
 * Risk R16: honeypot + reCAPTCHA placeholder.
 */

import * as React from "react";
import Link from "next/link";
import {
  Heart, AlertTriangle, CheckCircle2, Download, ShieldAlert,
  ShieldCheck, Lock, Sparkles, Megaphone, Home, BookOpen, Users, Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  date: string;
  anonymous: boolean;
};

const PRESET_AMOUNTS = [500, 1000, 5000, 10000];

const IMPACT_CARDS = [
  {
    icon: BookOpen,
    amount: 1000,
    title: "Sponsor a student's monthly tuition",
    description: "Covers one student's monthly tuition in the Nazera Quran program.",
  },
  {
    icon: Users,
    amount: 5000,
    title: "Feed a class for a day",
    description: "Provides lunch + snacks for an entire class on a school day.",
  },
  {
    icon: Gift,
    amount: 10000,
    title: "Fund a scholarship seat",
    description: "Sponsors one full semester for an orphan or needy student.",
  },
];

const RECENT_DONATIONS: RecentDonation[] = [
  { id: "d-1", donorName: null, amount: 5000, type: "zakat", method: "bank", date: "2026-09-16", anonymous: true },
  { id: "d-2", donorName: null, amount: 1500, type: "sadaqah", method: "cash", date: "2026-09-15", anonymous: true },
  { id: "d-3", donorName: null, amount: 10000, type: "zakat", method: "bank", date: "2026-09-14", anonymous: true },
  { id: "d-4", donorName: null, amount: 2000, type: "general", method: "mobile", date: "2026-09-13", anonymous: true },
  { id: "d-5", donorName: null, amount: 750, type: "sadaqah", method: "cash", date: "2026-09-12", anonymous: true },
];

export default function PublicDonatePage() {
  const { locale } = useI18n();
  const { toast } = useToast();

  const [donorName, setDonorName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [mobile, setMobile] = React.useState("");
  const [amount, setAmount] = React.useState<number>(0);
  const [customAmount, setCustomAmount] = React.useState("");
  const [donationType, setDonationType] = React.useState<DonationType>("general");
  const [anonymous, setAnonymous] = React.useState(false);
  const [honeypot, setHoneypot] = React.useState("");
  const [submittedReceipt, setSubmittedReceipt] = React.useState<string | null>(null);
  const [spamDetected, setSpamDetected] = React.useState(false);
  const [recaptchaChecked, setRecaptchaChecked] = React.useState(false);

  const hasContact = email.trim().length > 0 || mobile.trim().length > 0;
  const emailValid = email.trim().length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const mobileValid = mobile.trim().length === 0 || mobile.replace(/[\s+-]/g, "").length >= 6;
  const canSubmit =
    hasContact && emailValid && mobileValid && amount > 0 && recaptchaChecked;

  const handlePreset = (value: number) => {
    setAmount(value);
    setCustomAmount("");
  };

  const handleCustomAmount = (val: string) => {
    setCustomAmount(val);
    const num = Number(val);
    setAmount(Number.isFinite(num) && num > 0 ? num : 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSpamDetected(false);
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

    setDonorName("");
    setEmail("");
    setMobile("");
    setAmount(0);
    setCustomAmount("");
    setDonationType("general");
    setAnonymous(false);
    setHoneypot("");
    setRecaptchaChecked(false);
  };

  const handleReset = () => {
    setSubmittedReceipt(null);
    setSpamDetected(false);
  };

  return (
    <div className="flex flex-col">
      {/* ============================================================
       *  Hero — gradient bg
       * ============================================================ */}
      <section className="relative overflow-hidden bg-primary-700 text-primary-foreground">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 50%, rgba(201,169,97,0.6) 0%, transparent 45%)",
          }}
        />
        <div className="relative mx-auto max-w-[var(--grid-max-width)] px-4 py-14 md:px-6 md:py-20">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex flex-wrap items-center gap-1.5 text-caption text-primary-200">
              <li>
                <Link href="/public" className="inline-flex items-center gap-1 hover:text-accent-500">
                  <Home className="h-3 w-3" />
                  Home
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li className="text-primary-100" aria-current="page">Donate</li>
            </ol>
          </nav>

          <Badge className="mb-4 border-accent-500/40 bg-accent-500/15 text-accent-500">
            <Heart className="h-3.5 w-3.5" />
            Secure Online Donations
          </Badge>
          <h1 className="text-display font-bold leading-tight md:tracking-tight">
            Support Our Mission
          </h1>
          <p className="mt-4 max-w-2xl text-subtitle leading-relaxed text-primary-100 md:text-title">
            Your generosity sustains our students and programs. All donations
            are processed securely. Zakat donations are posted to the isolated
            Zakat fund per SRS §3.7 — never co-mingled with general funds.
          </p>
        </div>
      </section>

      {/* ============================================================
       *  Donation form + sidebar
       * ============================================================ */}
      <section className="mx-auto max-w-[var(--grid-max-width)] px-4 py-12 md:px-6 md:py-16">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Form */}
          <div className="lg:col-span-2">
            <Card className="border-border-default shadow-elevation-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-subtitle">
                  <Heart className="h-5 w-5 text-accent-500" />
                  Make a Donation
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                          <Button size="sm" variant="outline" onClick={() => toast({
                            title: "Receipt PDF — Phase C5.1",
                            description: "Receipt PDFs will be generated in Phase C5.1. Reference saved.",
                          })}>
                            <Download className="h-4 w-4" />
                            Download Receipt
                          </Button>
                          <Button size="sm" variant="ghost" onClick={handleReset}>
                            Donate Again
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Amount — preset cards */}
                    <div>
                      <Label className="mb-2 block text-subtitle">
                        Choose an amount <span className="text-semantic-danger">*</span>
                      </Label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {PRESET_AMOUNTS.map((preset) => {
                          const active = amount === preset && customAmount === "";
                          return (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handlePreset(preset)}
                              className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border p-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                                active
                                  ? "border-primary-500 bg-primary-50 text-primary-700 shadow-elevation-2"
                                  : "border-border-default bg-surface-card text-text-secondary hover:border-accent-500 hover:bg-surface-hover hover:text-text-primary"
                              }`}
                              aria-pressed={active}
                            >
                              <span className="font-mono text-subtitle font-semibold">
                                {formatCurrency(preset, locale)}
                              </span>
                              <span className="text-caption text-text-muted">
                                {preset === 500 && "Sadaqah"}
                                {preset === 1000 && "Sponsor"}
                                {preset === 5000 && "Feed class"}
                                {preset === 10000 && "Scholarship"}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom amount */}
                      <div className="mt-2">
                        <Label htmlFor="custom" className="mb-1.5 block text-caption text-text-muted">
                          Or enter custom amount
                        </Label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-body text-text-muted">
                            ৳
                          </span>
                          <Input
                            id="custom"
                            type="number"
                            min={1}
                            placeholder="0"
                            value={customAmount}
                            onChange={(e) => handleCustomAmount(e.target.value)}
                            className="ps-7 font-mono"
                            aria-label="Custom amount"
                          />
                        </div>
                      </div>

                      {amount > 0 && (
                        <p className="mt-2 text-caption text-text-muted">
                          Selected: <span className="font-mono font-medium text-text-primary">
                            {formatCurrency(amount, locale)}
                          </span>
                        </p>
                      )}
                    </div>

                    {/* Donation type radio cards */}
                    <div>
                      <Label className="mb-2 block text-subtitle">Donation Type</Label>
                      <RadioGroup
                        value={donationType}
                        onValueChange={(v) => setDonationType(v as DonationType)}
                        className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                      >
                        {([
                          { id: "general", label: "General", desc: "Where needed most" },
                          { id: "zakat", label: "Zakat", desc: "Zakat fund (SRS §3.7)" },
                          { id: "sadaqah", label: "Sadaqah", desc: "Voluntary charity" },
                        ] as { id: DonationType; label: string; desc: string }[]).map((opt) => (
                          <Label
                            key={opt.id}
                            className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-all ${
                              donationType === opt.id
                                ? opt.id === "zakat"
                                  ? "border-accent-500 bg-accent-50 text-accent-700 shadow-elevation-1"
                                  : "border-primary-500 bg-primary-50 text-primary-700 shadow-elevation-1"
                                : "border-border-default hover:bg-surface-hover"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value={opt.id} />
                              <span className="text-body font-medium">{opt.label}</span>
                            </div>
                            <p className="ms-6 text-caption text-text-muted">{opt.desc}</p>
                          </Label>
                        ))}
                      </RadioGroup>
                    </div>

                    {/* Zakat note (Risk R9 cross-link + Do-Not-Do D18) */}
                    {donationType === "zakat" && (
                      <Alert className="border-accent-500/30 bg-accent-50">
                        <AlertTitle className="text-accent-700">Zakat posting</AlertTitle>
                        <AlertDescription className="text-accent-700/80">
                          This donation will be posted to the Zakat fund (SRS §3.7).
                          Zakat money is never co-mingled with general funds and is
                          distributed only to eligible recipients (masakeen, fuqara,
                          etc.) under the supervision of the madrasha&apos;s Zakat committee.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Donor info */}
                    <div className="grid gap-3 sm:grid-cols-2">
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

                    {!hasContact && !anonymous && (
                      <p className="flex items-center gap-1.5 text-caption text-semantic-warning" role="alert">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        At least one of email or mobile is required so we can send you the receipt.
                      </p>
                    )}

                    {/* Anonymous */}
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

                    {/* Honeypot */}
                    <div aria-hidden className="absolute -z-10 h-0 w-0 overflow-hidden opacity-0">
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

                    {/* reCAPTCHA placeholder */}
                    <div className="flex items-start gap-3 rounded-lg border border-border-default bg-surface-canvas p-3">
                      <Checkbox
                        id="recaptcha"
                        checked={recaptchaChecked}
                        onCheckedChange={(c) => setRecaptchaChecked(c === true)}
                      />
                      <Label
                        htmlFor="recaptcha"
                        className="flex-1 cursor-pointer text-body text-text-secondary"
                      >
                        <span className="flex items-center gap-2 font-medium text-text-primary">
                          <ShieldCheck className="h-4 w-4 text-semantic-success" />
                          I&apos;m not a robot
                        </span>
                        <span className="mt-0.5 block text-caption text-text-muted">
                          reCAPTCHA v3 protects this form. Your submission is
                          scored for spam risk in the background.
                        </span>
                      </Label>
                      <div className="flex flex-col items-end gap-1 text-caption text-text-muted">
                        <Lock className="h-4 w-4" />
                        <span className="font-mono">reCAPTCHA</span>
                      </div>
                    </div>

                    <Button type="submit" disabled={!canSubmit} className="w-full bg-accent-500 text-accent-foreground hover:bg-accent-700">
                      <Heart className="h-4 w-4" />
                      Donate {amount > 0 ? formatCurrency(amount, locale) : ""}
                    </Button>

                    <p className="flex items-center justify-center gap-1.5 text-caption text-text-muted">
                      <Lock className="h-3 w-3" />
                      Secure SSL · No card details stored on our servers
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Recent donations */}
            <Card className="border-border-default">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-subtitle">
                  <Sparkles className="h-5 w-5 text-accent-500" />
                  Recent Donations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {RECENT_DONATIONS.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-start justify-between gap-3 border-b border-border-default pb-2 last:border-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-body font-medium text-text-primary">
                          Anonymous
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

            {/* Zakat information */}
            <Alert>
              <Megaphone className="h-4 w-4" />
              <AlertTitle>Zakat distribution</AlertTitle>
              <AlertDescription>
                Zakat is distributed quarterly to eligible recipients (masakeen,
                fuqara, gharimeen, etc.) by the madrasha&apos;s Zakat committee.
                Annual Zakat distribution reports are available on request.
              </AlertDescription>
            </Alert>

            {/* Other ways to give */}
            <Card className="border-border-default">
              <CardHeader>
                <CardTitle className="text-subtitle">Other Ways to Give</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-body text-text-secondary">
                  <li>
                    <p className="font-medium text-text-primary">Bank transfer</p>
                    <p className="text-caption text-text-muted">
                      Darul Uloom Madrasha · Islami Bank · AC 1234-5678901
                    </p>
                  </li>
                  <li>
                    <p className="font-medium text-text-primary">Mobile payment</p>
                    <p className="text-caption text-text-muted">
                      bKash: 017XX-XXXXXXX · Type: Payment
                    </p>
                  </li>
                  <li>
                    <p className="font-medium text-text-primary">In person</p>
                    <p className="text-caption text-text-muted">
                      Visit the office during working hours.
                    </p>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ============================================================
       *  Impact section — "Your ৳1000 provides…" cards
       * ============================================================ */}
      <section className="bg-surface-card py-16 md:py-24">
        <div className="mx-auto max-w-[var(--grid-max-width)] px-4 md:px-6">
          <div className="mb-10 max-w-2xl">
            <Badge variant="outline" className="mb-3 border-accent-200 bg-accent-50 text-accent-700">
              <Sparkles className="h-3.5 w-3.5" />
              Your Impact
            </Badge>
            <h2 className="text-headline font-bold text-text-primary md:text-display">
              See what your donation makes possible
            </h2>
            <p className="mt-2 text-body text-text-secondary md:text-subtitle">
              Every taka is accounted for and directed where it does the most good.
              Here&apos;s what your contribution provides:
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {IMPACT_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <Card
                  key={card.amount}
                  className="group flex flex-col border-border-default transition-all duration-200 hover:-translate-y-1 hover:border-accent-500 hover:shadow-elevation-3"
                >
                  <CardContent className="flex flex-1 flex-col p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-700 transition-colors group-hover:bg-accent-500 group-hover:text-accent-foreground">
                        <Icon className="h-5 w-5" />
                      </span>
                      <p className="font-mono text-headline font-bold text-accent-700">
                        {formatCurrency(card.amount, locale)}
                      </p>
                    </div>
                    <h3 className="text-subtitle font-semibold text-text-primary">
                      {card.title}
                    </h3>
                    <p className="mt-2 text-body text-text-secondary">
                      {card.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
