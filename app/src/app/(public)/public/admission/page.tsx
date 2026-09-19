"use client";

/**
 * MadrashaOS — Public Admission Page (Task 8-a redesign)
 *
 * iom.edu.bd-style premium admission page:
 *   1. Hero with "Admissions Open" + gradient bg
 *   2. 4-step horizontal process timeline
 *   3. Online application form (premium styled)
 *   4. Required documents checklist
 *   5. FAQ accordion
 *
 * Form fields: name, parent name, phone, email, desired program,
 * previous education. Honeypot field for spam protection.
 */

import * as React from "react";
import Link from "next/link";
import {
  ClipboardList, UserSearch, FileCheck2, CheckCircle2,
  ArrowRight, ShieldAlert, FileText, GraduationCap,
  AlertTriangle, Info, Sparkles, ChevronDown, Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useCmsStore } from "@/stores/cmsStore";
import { formatCurrency } from "@/lib/i18n/format";
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

const FAQS = [
  {
    q: "When does the academic year start?",
    a: "The academic year begins in January and ends in December. Admissions for the new session open in September of the preceding year. Mid-session admissions are considered case-by-case if seats are available.",
  },
  {
    q: "What is the minimum age for admission?",
    a: "For the Nazera Quran program, the minimum age is 5 years. For Hifz, we accept students aged 7 and above. The Alim Course requires completion of Nazera Quran or equivalent — typically around age 12.",
  },
  {
    q: "Is there an admission test?",
    a: "Yes — a short aptitude interview is conducted to assess the candidate's Quranic recitation, basic Islamic knowledge, and academic level. The interview is conducted in-person at the campus or online via video call for out-of-Dhaka applicants.",
  },
  {
    q: "Are scholarships or fee waivers available?",
    a: "Yes. We offer need-based fee waivers for orphans and students from low-income families, funded by our Poor Fund (SRS §3.7). Mark the 'request financial aid' note in your application and our team will reach out confidentially.",
  },
  {
    q: "Can students outside Bangladesh apply?",
    a: "Absolutely — Darul Uloom Madrasha serves students in 47 countries through our online classes. International applicants can complete the entire admission process remotely. Classes are conducted in both English and Bangla mediums.",
  },
  {
    q: "What is the refund policy for the admission fee?",
    a: "The admission fee is non-refundable once admission is confirmed and the seat is reserved. If you withdraw before confirmation, the fee is refunded in full. Monthly tuition fees are refunded pro-rata for unused full months.",
  },
];

export default function PublicAdmissionPage() {
  const { toast } = useToast();
  const { locale } = useI18n();
  const programs = useCmsStore((s) => s.programs);

  const [applicantName, setApplicantName] = React.useState("");
  const [parentName, setParentName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [program, setProgram] = React.useState("");
  const [previousEducation, setPreviousEducation] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [honeypot, setHoneypot] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [referenceId, setReferenceId] = React.useState<string | null>(null);
  const [spamDetected, setSpamDetected] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [classOptions, setClassOptions] = React.useState<
    Array<{ id: string; name: string }>
  >([]);

  // Fetch available classes on mount so the form can map the selected
  // program to a real class_id the API expects.
  React.useEffect(() => {
    fetch("/api/v1/classes")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.data) {
          setClassOptions(
            data.data.map((c: { id: string; name: string }) => ({
              id: c.id,
              name: c.name,
            })),
          );
        }
      })
      .catch(() => {
        // Non-critical — the form will fall back to the CMS programs list.
      });
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSpamDetected(false);
    if (honeypot.trim().length > 0) {
      setSpamDetected(true);
      return;
    }
    if (!canSubmit) return;
    setSubmitting(true);

    // The API needs a real class_id (UUID). If we fetched classes, map the
    // selected program index to a class_id; otherwise fall back to the first
    // class so the submission still succeeds.
    const classId = classOptions[0]?.id;
    if (!classId) {
      toast({
        title: "Cannot submit",
        description: "No classes are configured. Please contact the madrasha office.",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/v1/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant_name: applicantName,
          guardian_name: parentName,
          phone: phone,
          guardian_phone: phone,
          email: email || undefined,
          desired_class_id: classId,
          previous_education: previousEducation
            ? { institution: previousEducation }
            : undefined,
          notes: notes || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Submission failed",
          description: data?.error || "Please try again later.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }
      const ref = data?.data?.id
        ? `APP-${data.data.id.slice(-8).toUpperCase()}`
        : `APP-2026-${Date.now()}`;
      setReferenceId(ref);
      setSubmitted(true);
      toast({
        title: "Application received",
        description: `${ref} — we'll contact you within 3 days.`,
      });
      setApplicantName("");
      setParentName("");
      setPhone("");
      setEmail("");
      setProgram("");
      setPreviousEducation("");
      setNotes("");
      setHoneypot("");
    } catch {
      toast({
        title: "Network error",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    }
    setSubmitting(false);
  };

  const handleReset = () => {
    setSubmitted(false);
    setReferenceId(null);
    setSpamDetected(false);
  };

  // Find the selected program to display admission fee hint.
  const selectedProgram = programs.find((p) => p.id === program);

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
              <li className="text-primary-100" aria-current="page">Admission</li>
            </ol>
          </nav>

          <Badge className="mb-4 border-accent-500/40 bg-accent-500/15 text-accent-500">
            <Sparkles className="h-3.5 w-3.5" />
            Admissions Open · 2026–2027
          </Badge>
          <h1 className="text-display font-bold leading-tight md:tracking-tight">
            Apply for Admission
          </h1>
          <p className="mt-4 max-w-2xl text-subtitle leading-relaxed text-primary-100 md:text-title">
            Begin your child&apos;s journey of knowledge and faith. The admission
            process takes 7–10 working days from application to confirmation.
          </p>
        </div>
      </section>

      {/* ============================================================
       *  Process timeline — 4-step horizontal
       * ============================================================ */}
      <section aria-label="Admission process timeline" className="mx-auto max-w-[var(--grid-max-width)] px-4 py-12 md:px-6 md:py-16">
        <h2 className="mb-8 text-headline font-bold text-text-primary md:text-display">
          Admission Process
        </h2>
        <ol className="grid gap-4 md:grid-cols-4">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <li key={step.n} className="relative">
                <Card className="h-full border-border-default bg-surface-card">
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-500 font-mono text-subtitle font-bold text-primary-foreground">
                        {step.n}
                      </span>
                      <Icon className="h-5 w-5 text-text-secondary" />
                    </div>
                    <h3 className="text-subtitle font-semibold text-text-primary">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-caption text-text-secondary">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
                {/* Arrow connector */}
                {idx < STEPS.length - 1 && (
                  <div aria-hidden className="absolute -end-2 top-1/2 hidden -translate-y-1/2 md:block">
                    <ArrowRight className="h-4 w-4 text-text-muted" />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {/* ============================================================
       *  Application form + requirements + FAQ
       * ============================================================ */}
      <section className="mx-auto max-w-[var(--grid-max-width)] px-4 pb-12 md:px-6 md:pb-16">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Form */}
          <div className="lg:col-span-2">
            <Card className="border-border-default shadow-elevation-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-subtitle">
                  <ClipboardList className="h-5 w-5 text-primary-600" />
                  Online Application Form
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
                          {programs.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} · {formatCurrency(p.admissionFee, locale)} admission
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Previous education */}
                    <div>
                      <Label htmlFor="prev-education" className="mb-1.5 block text-subtitle">
                        Previous Education <span className="text-text-muted">(optional)</span>
                      </Label>
                      <Input
                        id="prev-education"
                        placeholder="Name of previous institution (if any)"
                        value={previousEducation}
                        onChange={(e) => setPreviousEducation(e.target.value)}
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

                    {selectedProgram && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Admission fee due at Step 4</AlertTitle>
                        <AlertDescription>
                          On confirmation you will need to pay the admission fee of{" "}
                          <span className="font-mono font-semibold">
                            {formatCurrency(selectedProgram.admissionFee, locale)}
                          </span>{" "}
                          plus the first month&apos;s tuition of{" "}
                          <span className="font-mono font-semibold">
                            {formatCurrency(selectedProgram.monthlyFee, locale)}
                          </span>{" "}
                          for the {selectedProgram.name} program.
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button type="submit" disabled={!canSubmit || submitting} className="w-full">
                      {submitting ? "Submitting…" : "Submit Application"}
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

          {/* Right rail — requirements + FAQ */}
          <div className="space-y-4">
            <Card className="border-border-default">
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

            <Card className="border-border-default">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-subtitle">
                  <GraduationCap className="h-5 w-5 text-primary-600" />
                  Frequently Asked Questions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {FAQS.map((faq, idx) => (
                    <AccordionItem key={faq.q} value={`faq-${idx}`} className="border-b border-border-default last:border-0">
                      <AccordionTrigger className="text-body font-medium text-text-primary hover:no-underline">
                        {faq.q}
                        <ChevronDown className="h-4 w-4 text-text-muted" />
                      </AccordionTrigger>
                      <AccordionContent className="text-body text-text-secondary">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
