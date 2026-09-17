"use client";

/**
 * MadrashaOS — Public Contact Page (Phase C5.2 · SRS §2.7.3)
 *
 * Public contact page:
 *   - Contact form (name, email, message) — no permission required
 *   - Honeypot field for bot-trap protection
 *   - Contact info: address, phone, email, hours
 *   - Google Maps embed placeholder (styled div, no real embed)
 *   - Social media links (mock)
 *
 * On submit:
 *   - If honeypot filled → silently rejected with "Spam detected" error
 *   - Otherwise → toast "Message sent — we'll reply within 2 working days"
 *     and form resets
 */

import * as React from "react";
import {
  Mail, Phone, MapPin, Clock, Send, ShieldAlert,
  Facebook, Youtube, Twitter, Instagram, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

const CONTACT_INFO = [
  {
    icon: MapPin,
    label: "Address",
    value: "123 Bashundhara R/A, Dhaka 1229, Bangladesh",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+880 2 555 0199",
  },
  {
    icon: Mail,
    label: "Email",
    value: "info@darulirfan.edu.bd",
  },
  {
    icon: Clock,
    label: "Office Hours",
    value: "Sat – Thu, 8:30 AM – 4:30 PM (closed Fridays)",
  },
];

const SOCIAL_LINKS = [
  { label: "Facebook", icon: Facebook, href: "#" },
  { label: "YouTube", icon: Youtube, href: "#" },
  { label: "Twitter", icon: Twitter, href: "#" },
  { label: "Instagram", icon: Instagram, href: "#" },
];

export default function PublicContactPage() {
  const { toast } = useToast();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [honeypot, setHoneypot] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [spamDetected, setSpamDetected] = React.useState(false);

  const emailValid = email.trim().length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    emailValid &&
    message.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSpamDetected(false);

    if (honeypot.trim().length > 0) {
      setSpamDetected(true);
      return;
    }

    if (!canSubmit) return;

    setSent(true);
    toast({
      title: "Message sent",
      description: "We'll reply within 2 working days. Jazak Allah khairan.",
    });

    setName("");
    setEmail("");
    setMessage("");
    setHoneypot("");
  };

  return (
    <div className="mx-auto max-w-[var(--grid-max-width)] px-4 py-12 md:px-6 md:py-16">
      {/* Header */}
      <header className="mb-10 max-w-3xl">
        <Badge variant="outline" className="mb-3 border-primary-200 bg-primary-50 text-primary-700">
          <Mail className="h-3.5 w-3.5" />
          Contact Us
        </Badge>
        <h1 className="text-display font-bold text-text-primary">
          Get in Touch
        </h1>
        <p className="mt-3 text-body text-text-secondary">
          Have a question about admissions, programs or donations? We&apos;re
          here to help. Reach us by phone, email, or send a message below.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact form — spans 2 columns */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-subtitle">
                <Send className="h-5 w-5 text-primary-600" />
                Send a Message
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Spam detected */}
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

              {/* Success */}
              {sent && (
                <div className="mb-4 flex items-start gap-3 rounded-lg border border-semantic-success/30 bg-success-50 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-semantic-success" />
                  <div className="flex-1">
                    <p className="text-subtitle font-semibold text-semantic-success">
                      Message sent — Jazak Allah khairan
                    </p>
                    <p className="mt-1 text-body text-text-secondary">
                      We&apos;ve received your message and will reply within 2 working days.
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2"
                      onClick={() => setSent(false)}
                    >
                      Send another message
                    </Button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <Label htmlFor="name" className="mb-1.5 block text-subtitle">
                    Your Name <span className="text-semantic-danger">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="email" className="mb-1.5 block text-subtitle">
                    Email <span className="text-semantic-danger">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!emailValid}
                    required
                  />
                  {!emailValid && (
                    <p className="mt-1 text-caption text-semantic-danger">
                      Please enter a valid email address.
                    </p>
                  )}
                </div>

                {/* Message */}
                <div>
                  <Label htmlFor="message" className="mb-1.5 block text-subtitle">
                    Message <span className="text-semantic-danger">*</span>
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="How can we help you?"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    required
                  />
                  {message.length > 0 && message.length < 10 && (
                    <p className="mt-1 flex items-center gap-1.5 text-caption text-semantic-warning" role="alert">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Please provide a little more detail (at least 10 characters).
                    </p>
                  )}
                </div>

                {/* Honeypot — visually hidden */}
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
                  <Send className="h-4 w-4" />
                  Send Message
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Contact info + map + social */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-subtitle">Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {CONTACT_INFO.map((info) => {
                  const Icon = info.icon;
                  return (
                    <li key={info.label} className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-caption font-medium text-text-muted">
                          {info.label}
                        </p>
                        <p className="text-body text-text-primary">
                          {info.value}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          {/* Map placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-subtitle">
                <MapPin className="h-5 w-5 text-primary-600" />
                Find Us
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-video overflow-hidden rounded-lg border border-border-default bg-primary-100">
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-60"
                  style={{
                    backgroundImage:
                      "linear-gradient(0deg, rgba(14,92,92,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(14,92,92,0.08) 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                  }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
                  <MapPin className="h-8 w-8 text-primary-500" />
                  <p className="text-subtitle font-semibold text-primary-700">
                    Google Maps Embed
                  </p>
                  <p className="px-4 text-caption text-text-secondary">
                    Interactive map will appear here.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social */}
          <Card>
            <CardHeader>
              <CardTitle className="text-subtitle">Follow Us</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                {SOCIAL_LINKS.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      aria-label={social.label}
                      title={social.label}
                      className="flex aspect-square items-center justify-center rounded-lg border border-border-default bg-surface-canvas text-text-secondary transition-colors hover:border-primary-500 hover:bg-primary-50 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
