"use client";

/**
 * MadrashaOS — Public Admission Page (Phase C5.2 · SRS §2.7.3)
 *
 * Public-facing admission portal:
 *   - 4-step admission timeline (Apply → Interview → Document Verification → Confirmation)
 *   - Online application form (name, parent name, phone, email, desired class,
 *     previous madrasha)
 *   - Honeypot field for bot-trap protection
 *   - Admission requirements list (documents needed)
 *
 * On submit:
 *   - If honeypot filled → silently rejected with "Spam detected" error
 *   - Otherwise → toast "Application received — we'll contact you within 3 days"
 *     and form resets with success state
 *
 * NO permissions required — public visitors can apply freely.
 */

import * as React from "react";
import Link from "next/link";
import {
  ClipboardList, UserSearch, FileCheck2, CheckCircle2,
  ArrowRight, ShieldAlert, FileText, GraduationCap, AlertTriangle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n/I18nProvider";

const STEPS = [
  {
    n: 1,
    title: "Submit Application",
    description: "Fill the online form below. Takes about 5 minutes.",
    icon: ClipboardList,
  },
  {
    n: 2,
    title: "Interview & Aptitude",
    description: "Short interview with the candidate and parents to assess placement.",
    icon: UserSearch,
  },
  {
    n: 3,
    title: "Document Verification",
    description: "Submit required documents for verification by the office.",
    icon: FileCheck2,
  },
  {
    n: 4,
    title: "Admission Confirmation",
    description: "Pay admission fee, receive class section and start date.",
    icon: CheckCircle2,
  },
];

const REQUIREMENTS = [
  "Completed admission form (online or printed)",
  "2 copies of recent passport-size photograph of the candidate",
  "1 copy of passport-size photograph of each parent/guardian",
  "Photocopy of birth certificate (original for verification)",
  "Transfer certificate / character certificate from previous madrasha (if applicable)",
  "Last examination report card (if applicable)",
  "Photocopy of guardian's NID",
  "For Hifz program: certificate of Nazira completion (if any)",
];

const PROGRAMS = [
  { id: "hifz", label: "Hifz-ul-Quran" },
  { id: "alim", label: "Alim Course" },
  { id: "qirat", label: "Qirat" },
  { id: "tajweed", label: "Tajweed Foundation" },
  { id: "arabic", label: "Arabic Language" },
  { id: "islamic-studies", label: "Islamic Studies (Weekend)" },
];

export default function PublicAdmissionPage() {
  const { toast } = useToast();

  const [applicantName, setApplicantName] = React.useState("");
  const [parentName, setParentName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [program, setProgram] = React.useState("");
  const [previousMadrasa, setPreviousMadrasa] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [honeypot, setHoneypot] = React.useState(""); // must stay empty
  const [submitted, setSubmitted] = React.useState(false);
  const [referenceId, setReferenceId] = React.useState<string | null>(null);
  const [spamDetected, setSpamDetected] = React.useState(false);

  const hasContact = phone.trim().length > 0 || email.trim().length > 0;
  const phoneValid = phone.trim().length === 0 || phone.replace(/[\s+-]/g, "").length >= 6;
  const emailValid = email.trim().length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const canSubmit =
    applicantName.trim().length > 0 &&
    parentName.trim().length > 0 &&
    hasContact &&
    phoneValid &&
    emailValid &&
    program.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSpamDetected(false);

    // Honeypot — silent reject with visible error.
    if (honeypot.trim().length > 0) {
      setSpamDetected(true);
      return;
    }

    if (!canSubmit) return;

    const num = 1000 + Math.floor(Math.random() * 9000);
    const ref = `APP-2026-${num}`;
    setReferenceId(ref);
    setSubmitted(true);

    toast({
      title: "Application received",
      description: `${ref} — we'll contact you within 3 days.`,
    });

    // Reset form (keep success state visible).
    setApplicantName("");
    setParentName("");
    setPhone("");
    setEmail("");
    setProgram("");
    setPreviousMadrasa("");
    setNotes("");
    setHoneypot("");
  };

  const handleReset = () => {
    setSubmitted(false);
    setReferenceId(null);
    setSpamDetected(false);
  };

  return (
    <div className="mx-auto max-w-[var(--grid-max-width)] px-4 py-12 md:px-6 md:py-16">
      {/* Header */}
      <header className="mb-10 max-w-3xl">
        <Badge variant="outline" className="mb-3 border-primary-200 bg-primary-50 text-primary-700">
          <GraduationCap className="h-3.5 w-3.5" />
          Admissions Open · 2026–2027
        </Badge>
        <h1 className="text-display font-bold text-text-primary">
          Apply for Admission
        </h1>
        <p className="mt-3 text-body text-text-secondary">
          Begin your child&apos;s journey of knowledge and faith. The admission
          process takes 7–10 working days from application to confirmation.
        </p>
      </header>

      {/* Process timeline */}
      <section aria-label="Admission process timeline" className="mb-12">
        <h2 className="mb-6 text-headline font-bold text-text-primary">
          Admission Process
        </h2>
        <ol className="grid gap-4 md:grid-cols-4">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <li key={step.n}>
                <Card className="h-full">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-500 font-mono text-subtitle font-bold text-primary-foreground">
                        {step.n}
                      </span>
                      <Icon className="h-5 w-5 text-text-secondary" />
                    </div>
                    <h3 className="mt-3 text-subtitle font-semibold text-text-primary">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-caption text-text-secondary">
                      {step.description}
                    </p>
                  </CardContent>
                  {idx < STEPS.length - 1 && (
                    <div
                      aria-hidden
                      className="hidden h-px w-full bg-border-default md:block"
                    />
                  )}
                </Card>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Application form + requirements */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form — spans 2 columns */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-subtitle">
                <ClipboardList className="h-5 w-5 text-primary-600" />
                Online Application Form
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Spam detected banner */}
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

              {/* Success state */}
              {submitted && referenceId ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-lg border border-semantic-success/30 bg-success-50 p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-semantic-success" />
                    <div className="flex-1">
                      <p className="text-subtitle font-semibold text-semantic-success">
                        Application received
                      </p>
                      <p className="mt-1 text-body text-text-primary">
                        Your reference number is{" "}
                        <span className="font-mono font-semibold">{referenceId}</span>.
                        We&apos;ll contact you within 3 working days to schedule the interview.
                      </p>
                      <p className="mt-2 text-caption text-text-secondary">
                        Please keep this reference number safe — you will need
                        it for follow-up inquiries.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={handleReset}>
                          Submit another application
                        </Button>
                        <Link href="/public">
                          <Button size="sm" variant="ghost">
                            Back to home
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Applicant name */}
                  <div>
                    <Label htmlFor="applicant-name" className="mb-1.5 block text-subtitle">
                      Applicant Full Name <span className="text-semantic-danger">*</span>
                    </Label>
                    <Input
                      id="applicant-name"
                      placeholder="Child's full name"
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      required
                    />
                  </div>

                  {/* Parent / guardian name */}
                  <div>
                    <Label htmlFor="parent-name" className="mb-1.5 block text-subtitle">
                      Parent / Guardian Name <span className="text-semantic-danger">*</span>
                    </Label>
                    <Input
                      id="parent-name"
                      placeholder="Father's or mother's name"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      required
                    />
                  </div>

                  {/* Phone + Email */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="phone" className="mb-1.5 block text-subtitle">
                        Phone <span className="text-text-muted">(phone or email required)</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+880 1XXX-XXXXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        aria-invalid={!phoneValid}
                      />
                      {!phoneValid && (
                        <p className="mt-1 text-caption text-semantic-danger">
                          Please enter a valid phone number.
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="email" className="mb-1.5 block text-subtitle">
                        Email <span className="text-text-muted">(phone or email required)</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        aria-invalid={!emailValid}
                      />
                      {!emailValid && (
                        <p className="mt-1 text-caption text-semantic-danger">
                          Please enter a valid email address.
                        </p>
                      )}
                    </div>
                  </div>

                  {!hasContact && (
                    <p className="flex items-center gap-1.5 text-caption text-semantic-warning" role="alert">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      At least one of phone or email is required so we can contact you.
                    </p>
                  )}

                  {/* Desired program */}
                  <div>
                    <Label htmlFor="program" className="mb-1.5 block text-subtitle">
                      Desired Program <span className="text-semantic-danger">*</span>
                    </Label>
                    <Select value={program} onValueChange={setProgram}>
                      <SelectTrigger id="program">
                        <SelectValue placeholder="Select a program" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROGRAMS.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Previous madrasha */}
                  <div>
                    <Label htmlFor="prev-madrasa" className="mb-1.5 block text-subtitle">
                      Previous Madrasha / School <span className="text-text-muted">(optional)</span>
                    </Label>
                    <Input
                      id="prev-madrasa"
                      placeholder="Name of previous institution (if any)"
                      value={previousMadrasa}
                      onChange={(e) => setPreviousMadrasa(e.target.value)}
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <Label htmlFor="notes" className="mb-1.5 block text-subtitle">
                      Additional Notes <span className="text-text-muted">(optional)</span>
                    </Label>
                    <Textarea
                      id="notes"
                      placeholder="Any relevant information — medical conditions, prior Quranic education, special needs…"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                    />
                  </div>

                  {/* Honeypot — visually hidden, must stay empty */}
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

                  <Button type="submit" disabled={!canSubmit} className="w-full">
                    Submit Application
                    <ArrowRight className="h-4 w-4" />
                  </Button>

                  <p className="flex items-center gap-1.5 text-caption text-text-muted">
                    <Info className="h-3.5 w-3.5" />
                    By submitting, you consent to be contacted regarding the admission process.
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Requirements sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-subtitle">
                <FileText className="h-5 w-5 text-accent-500" />
                Required Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-caption text-text-muted">
                Bring the following to the interview step (Step 3):
              </p>
              <ul className="space-y-2">
                {REQUIREMENTS.map((req) => (
                  <li key={req} className="flex items-start gap-2 text-body text-text-secondary">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-semantic-success" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Alert>
            <AlertTitle>Admission fee</AlertTitle>
            <AlertDescription>
              A non-refundable admission fee of ৳500 is due at Step 4 (confirmation).
              Monthly tuition varies by program — see the{" "}
              <Link href="/public/programs" className="underline">programs page</Link>{" "}
              for details.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}
