"use client";

/**
 * MadrashaOS — Public Signup Request Page (Phase 1)
 *
 * Route: /signup
 *
 * A public form where a new madrasha requests access to MadrashaOS.
 * The request goes into "pending" status and is reviewed by a platform
 * super-admin (Phase 3).
 *
 * On success, the user sees their generated madrasha code + a message
 * that they'll be contacted within 1-2 business days.
 *
 * No login required — this is a public page (whitelisted in middleware).
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Heart, Building2, User, Mail, Phone, MapPin, Save, XCircle,
  AlertCircle, CheckCircle2, Loader2, Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type FormState = {
  org_name: string;
  org_name_bn: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  estimated_branches: number;
  notes: string;
  // honeypot
  website: string;
};

type SubmitResult = {
  org_code: string;
  org_name: string;
  message: string;
};

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = React.useState<FormState>({
    org_name: "",
    org_name_bn: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    estimated_branches: 1,
    notes: "",
    website: "",
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<SubmitResult | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/tenant/signup-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || `Failed (HTTP ${res.status})`);
        setSubmitting(false);
        return;
      }
      setResult(data.data);
    } catch {
      setError("Network error — please check your connection and try again.");
    }
    setSubmitting(false);
  }

  // --- Success screen ---
  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-accent-50 p-4">
        <Card className="w-full max-w-lg shadow-elevation-4">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-semantic-success/10">
              <CheckCircle2 className="h-8 w-8 text-semantic-success" />
            </div>
            <CardTitle className="text-display">Request Received!</CardTitle>
            <CardDescription>
              Your madrasha signup request has been submitted successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border-2 border-primary-200 bg-primary-50 p-4 text-center">
              <p className="text-caption font-medium uppercase tracking-wider text-primary-600">
                Your Madrasha Code
              </p>
              <p className="mt-1 font-mono text-display font-bold text-primary-700">
                {result.org_code}
              </p>
              <p className="mt-1 text-caption text-primary-600">
                Save this code — you&apos;ll need it to log in once approved
              </p>
            </div>
            <p className="text-body text-text-secondary">
              {result.message}
            </p>
            <div className="rounded-md border border-border-default bg-surface-hover p-3 text-caption text-text-secondary">
              <p className="font-medium text-text-primary">What happens next?</p>
              <ul className="mt-1.5 space-y-1">
                <li>1. Our team reviews your request within 1-2 business days</li>
                <li>2. We contact you at <strong>{form.contact_email}</strong> to verify details</li>
                <li>3. Once approved, you&apos;ll receive login instructions</li>
                <li>4. Use your madrasha code <strong>{result.org_code}</strong> + email + password to log in</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => router.push("/login")}>
                Back to Login
              </Button>
              <Button className="flex-1" onClick={() => { setResult(null); setForm({ org_name: "", org_name_bn: "", contact_name: "", contact_email: "", contact_phone: "", address: "", estimated_branches: 1, notes: "", website: "" }); }}>
                Submit Another Request
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Form screen ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-accent-50 p-4">
      <Card className="w-full max-w-2xl shadow-elevation-4">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-500 text-primary-foreground">
              <Heart className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-display">Request MadrashaOS Access</CardTitle>
              <CardDescription>
                Fill out the form below to request access for your madrasha.
                Our team will review and contact you within 1-2 business days.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Madrasha name */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="org_name">
                  <Building2 className="me-1.5 inline h-3.5 w-3.5" />
                  Madrasha Name (English) *
                </Label>
                <Input
                  id="org_name"
                  placeholder="Darul Uloom Madrasha"
                  value={form.org_name}
                  onChange={(e) => update("org_name", e.target.value)}
                  required
                  minLength={2}
                  maxLength={255}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="org_name_bn">মাদরাসার নাম (Bengali)</Label>
                <Input
                  id="org_name_bn"
                  placeholder="দারুল উলূম মাদরাসা"
                  value={form.org_name_bn}
                  onChange={(e) => update("org_name_bn", e.target.value)}
                  maxLength={255}
                  lang="bn"
                />
              </div>
            </div>

            {/* Contact info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contact_name">
                  <User className="me-1.5 inline h-3.5 w-3.5" />
                  Contact Person Name *
                </Label>
                <Input
                  id="contact_name"
                  placeholder="Abdul Karim"
                  value={form.contact_name}
                  onChange={(e) => update("contact_name", e.target.value)}
                  required
                  minLength={2}
                  maxLength={255}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact_phone">
                  <Phone className="me-1.5 inline h-3.5 w-3.5" />
                  Contact Phone *
                </Label>
                <Input
                  id="contact_phone"
                  placeholder="+880 1XXX-XXXXXX"
                  value={form.contact_phone}
                  onChange={(e) => update("contact_phone", e.target.value)}
                  required
                  minLength={5}
                  maxLength={50}
                />
              </div>
            </div>

            {/* Contact email */}
            <div className="space-y-1.5">
              <Label htmlFor="contact_email">
                <Mail className="me-1.5 inline h-3.5 w-3.5" />
                Contact Email *
              </Label>
              <Input
                id="contact_email"
                type="email"
                placeholder="abkarim@madrasha.org"
                value={form.contact_email}
                onChange={(e) => update("contact_email", e.target.value)}
                required
                maxLength={255}
              />
              <p className="text-caption text-text-muted">
                We&apos;ll contact you at this email to verify your request.
              </p>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label htmlFor="address">
                <MapPin className="me-1.5 inline h-3.5 w-3.5" />
                Address (optional)
              </Label>
              <Textarea
                id="address"
                placeholder="123 Mirpur Road, Dhanmondi, Dhaka 1209"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                rows={2}
                maxLength={1000}
              />
            </div>

            {/* Estimated branches + notes */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="estimated_branches">
                  <Hash className="me-1.5 inline h-3.5 w-3.5" />
                  Estimated Branches
                </Label>
                <Input
                  id="estimated_branches"
                  type="number"
                  min={1}
                  max={50}
                  value={form.estimated_branches}
                  onChange={(e) => update("estimated_branches", Number(e.target.value) || 1)}
                />
                <p className="text-caption text-text-muted">
                  Billing: 300 BDT/month per branch
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Anything else you'd like us to know…"
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  rows={2}
                  maxLength={2000}
                />
              </div>
            </div>

            {/* Pricing info */}
            <div className="rounded-md border border-semantic-info/30 bg-blue-50 p-3">
              <p className="flex items-center gap-1.5 text-caption font-medium text-blue-900">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Pricing: 300 BDT / month per branch
              </p>
              <p className="mt-1 text-[11px] text-blue-800">
                {form.estimated_branches} {form.estimated_branches === 1 ? "branch" : "branches"} ={" "}
                <strong>{(form.estimated_branches * 300).toLocaleString()} BDT/month</strong>.
                14-day free trial. No payment required during trial.
              </p>
            </div>

            {/* Honeypot field — hidden from humans */}
            <input
              type="text"
              name="website"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
              style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />

            {/* Error */}
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-md border border-semantic-danger/40 bg-danger-50 px-3 py-2 text-caption text-semantic-danger">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => router.push("/login")}>
                <XCircle className="h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Submit Request
                  </>
                )}
              </Button>
            </div>

            {/* Already have an account? */}
            <p className="text-center text-caption text-text-muted">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="font-medium text-primary-500 hover:underline"
              >
                Sign in
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
