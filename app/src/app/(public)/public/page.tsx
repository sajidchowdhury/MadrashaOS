"use client";

/**
 * MadrashaOS — Public Home Page (Phase C5.2 · SRS §2.7.3)
 *
 * Public landing page for Darul Irfan Madrasha.
 *
 * Sections (top → bottom):
 *   1. Hero — name + tagline + Apply Now / Donate CTAs (teal background)
 *   2. Stats bar — 40 students / 8 teachers / 3 branches / 25 years
 *   3. About — brief description of the madrasha
 *   4. Programs preview — 3 program cards (Hifz, Alim, Qirat)
 *   5. Recent notices — 3 latest public notices (no permission gate)
 *   6. Contact preview — address + phone + map placeholder
 *
 * NO permissions required — public visitors see this page freely.
 * i18n-ready via useI18n() but inline English defaults are used because
 * the `public.*` message keys aren't in the frozen catalog yet.
 */

import Link from "next/link";
import {
  ArrowRight, Heart, GraduationCap, BookOpen, Mic,
  Megaphone, MapPin, Phone, Mail, CalendarDays, Users, Award,
  Building2, Sparkles, ChevronRight,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatDate, formatNumber } from "@/lib/i18n/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATS = [
  { label: "Students", value: 40, icon: Users },
  { label: "Teachers", value: 8, icon: GraduationCap },
  { label: "Branches", value: 3, icon: Building2 },
  { label: "Years of Service", value: 25, icon: Award },
];

const PROGRAMS_PREVIEW = [
  {
    id: "hifz",
    name: "Hifz-ul-Quran",
    subtitle: "Full Quran memorization",
    description:
      "A 3-year structured program guiding students through full memorization of the Holy Quran with Tajweed.",
    duration: "3 years",
    icon: BookOpen,
  },
  {
    id: "alim",
    name: "Alim Course",
    subtitle: "Higher Islamic studies",
    description:
      "Comprehensive 8-year course in Islamic theology, Fiqh, Hadith, Tafsir and Arabic literature.",
    duration: "8 years",
    icon: GraduationCap,
  },
  {
    id: "qirat",
    name: "Qirat",
    subtitle: "Quranic recitation",
    description:
      "Art of beautiful Quranic recitation — learn the ten canonical Qira'at under qualified Qaris.",
    duration: "2 years",
    icon: Mic,
  },
];

const RECENT_NOTICES = [
  {
    id: "n-1",
    title: "Eid-e-Milad-un-Nabi Holiday — Office Closed",
    date: new Date(2026, 8, 26),
    category: "Holiday" as const,
    excerpt: "The madrasha office and classes will remain closed on 27 September in observance of Eid-e-Milad-un-Nabi.",
  },
  {
    id: "n-2",
    title: "Half-Yearly Exam Routine Published",
    date: new Date(2026, 8, 22),
    category: "Exam" as const,
    excerpt: "Half-yearly examination routines for all classes (Hifz + Alim) are now available at the office.",
  },
  {
    id: "n-3",
    title: "Annual Sports Day — 15 October",
    date: new Date(2026, 8, 18),
    category: "Event" as const,
    excerpt: "Annual sports competition on 15 October at the Bashundhara playground. Parents are cordially invited.",
  },
];

const CATEGORY_TONE: Record<string, string> = {
  Holiday: "border-warning-200 bg-warning-50 text-semantic-warning",
  Exam: "border-info-200 bg-info-50 text-semantic-info",
  Event: "border-accent-200 bg-accent-50 text-accent-700",
  General: "border-border-default bg-surface-hover text-text-secondary",
};

export default function PublicHomePage() {
  const { locale } = useI18n();

  return (
    <div className="flex flex-col">
      {/* ============================================================
       *  Hero — name + tagline + CTAs
       * ============================================================ */}
      <section className="relative overflow-hidden bg-primary-700 text-primary-foreground">
        {/* Decorative pattern */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(201,169,97,0.6) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(201,169,97,0.4) 0%, transparent 35%)",
          }}
        />
        <div className="relative mx-auto max-w-[var(--grid-max-width)] px-4 py-16 md:px-6 md:py-24">
          <div className="max-w-3xl">
            <Badge className="mb-4 border-accent-500/40 bg-accent-500/15 text-accent-500">
              <Sparkles className="h-3.5 w-3.5" />
              Admissions Open for 2026–2027
            </Badge>
            <h1 className="text-display font-bold leading-tight md:text-[40px] md:leading-[1.1]">
              Darul Irfan Madrasha
            </h1>
            <p className="mt-4 text-subtitle text-primary-100 md:text-title">
              Knowledge · Faith · Character — nurturing the next generation
              of Huffaz, Ulama and upright citizens since 2001.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/public/admission">
                <Button size="lg" className="bg-accent-500 text-accent-foreground hover:bg-accent-700">
                  <GraduationCap className="h-4 w-4" />
                  Apply Now
                </Button>
              </Link>
              <Link href="/public/donate">
                <Button size="lg" variant="outline" className="border-primary-300 bg-transparent text-primary-foreground hover:bg-primary-600">
                  <Heart className="h-4 w-4" />
                  Donate
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
       *  Stats bar
       * ============================================================ */}
      <section className="border-b border-border-default bg-surface-card">
        <div className="mx-auto grid max-w-[var(--grid-max-width)] grid-cols-2 gap-4 px-4 py-8 md:grid-cols-4 md:px-6">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex flex-col items-center gap-2 rounded-lg border border-border-default bg-surface-canvas p-4 text-center shadow-elevation-1 md:flex-row md:gap-4 md:text-start"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-headline font-bold text-text-primary">
                    {formatNumber(stat.value, locale)}+
                  </p>
                  <p className="text-caption text-text-secondary">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================
       *  About
       * ============================================================ */}
      <section className="mx-auto max-w-[var(--grid-max-width)] px-4 py-12 md:px-6 md:py-16">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2">
            <h2 className="text-headline font-bold text-text-primary">
              About Our Madrasha
            </h2>
            <p className="mt-4 text-body text-text-secondary">
              Founded in 2001 by the late Maulana Abdul Karim Saheb, Darul
              Irfan Madrasha began as a small neighbourhood Quran class with
              just twelve students and two teachers. Today it serves over
              forty students across three branches in Dhaka, Chittagong and
              Sylhet — guided by a faculty of eight qualified Ustadhs and
              Ustadhas holding degrees from the Islamic University of Madinah,
              Al-Azhar and the Darul Uloom Deoband.
            </p>
            <p className="mt-4 text-body text-text-secondary">
              Our curriculum combines a classical Hifz + Alim track with
              modern subjects — English, Mathematics, Science — so graduates
              are equally prepared for religious service and contemporary
              professional life. We are committed to the Prophetic ideal of
              holistic tarbiyah: <em>knowledge with practice, faith with character.</em>
            </p>
            <div className="mt-6">
              <Link href="/public/programs">
                <Button variant="ghost">
                  Explore our programs
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
          <Card className="border-accent-200 bg-accent-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-subtitle text-accent-700">
                <Award className="h-5 w-5" />
                Our Mission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-body text-accent-700/90">
                To cultivate a generation of Huffaz, Ulama and upright
                citizens who embody the Quran and Sunnah, serve their
                communities, and excel in both deen and dunya.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ============================================================
       *  Programs preview — 3 cards
       * ============================================================ */}
      <section className="bg-surface-card py-12 md:py-16">
        <div className="mx-auto max-w-[var(--grid-max-width)] px-4 md:px-6">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-headline font-bold text-text-primary">
                Our Programs
              </h2>
              <p className="mt-1 text-body text-text-secondary">
                A structured pathway from foundational Quran to advanced Islamic scholarship.
              </p>
            </div>
            <Link href="/public/programs" className="hidden md:block">
              <Button variant="outline">
                View all programs
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {PROGRAMS_PREVIEW.map((program) => {
              const Icon = program.icon;
              return (
                <Card key={program.id} className="group transition-shadow hover:shadow-elevation-3">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700 transition-colors group-hover:bg-primary-500 group-hover:text-primary-foreground">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <CardTitle className="text-subtitle">{program.name}</CardTitle>
                        <p className="text-caption text-text-muted">{program.subtitle}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-body text-text-secondary">
                      {program.description}
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                      <Badge variant="outline" className="text-text-secondary">
                        <CalendarDays className="h-3 w-3" />
                        {program.duration}
                      </Badge>
                      <Link
                        href="/public/programs"
                        className="inline-flex items-center gap-1 text-caption font-medium text-primary-600 transition-colors hover:text-primary-700"
                      >
                        Details
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="mt-6 text-center md:hidden">
            <Link href="/public/programs">
              <Button variant="outline">
                View all programs
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================
       *  Recent notices — public, no permission gate
       * ============================================================ */}
      <section className="mx-auto max-w-[var(--grid-max-width)] px-4 py-12 md:px-6 md:py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-headline font-bold text-text-primary">
              Recent Notices
            </h2>
            <p className="mt-1 text-body text-text-secondary">
              Public announcements — holidays, exams, and events.
            </p>
          </div>
          <Link href="/public/notices" className="hidden md:block">
            <Button variant="outline">
              All notices
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="grid gap-3">
          {RECENT_NOTICES.map((notice) => (
            <Card key={notice.id} className="transition-shadow hover:shadow-elevation-2">
              <CardContent className="flex items-start gap-4 p-4">
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={CATEGORY_TONE[notice.category]}>
                      {notice.category}
                    </Badge>
                    <span className="text-caption text-text-muted">
                      {formatDate(notice.date, locale)}
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-subtitle font-semibold text-text-primary">
                    {notice.title}
                  </h3>
                  <p className="mt-1 text-body text-text-secondary">
                    {notice.excerpt}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ============================================================
       *  Contact preview
       * ============================================================ */}
      <section className="bg-primary-50 py-12 md:py-16">
        <div className="mx-auto max-w-[var(--grid-max-width)] px-4 md:px-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="text-headline font-bold text-text-primary">
                Visit Our Campus
              </h2>
              <p className="mt-2 text-body text-text-secondary">
                We welcome prospective parents and students to tour our
                facilities. Please schedule a visit during office hours.
              </p>
              <ul className="mt-6 space-y-4">
                <li className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
                  <div>
                    <p className="text-subtitle font-medium text-text-primary">Address</p>
                    <p className="text-body text-text-secondary">
                      123 Bashundhara R/A, Dhaka 1229, Bangladesh
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
                  <div>
                    <p className="text-subtitle font-medium text-text-primary">Phone</p>
                    <p className="text-body text-text-secondary">+880 2 555 0199</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
                  <div>
                    <p className="text-subtitle font-medium text-text-primary">Email</p>
                    <p className="text-body text-text-secondary">info@darulirfan.edu.bd</p>
                  </div>
                </li>
              </ul>
              <div className="mt-6">
                <Link href="/public/contact">
                  <Button>
                    Contact us
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Map placeholder */}
            <div className="relative aspect-video overflow-hidden rounded-lg border border-border-default bg-primary-100 shadow-elevation-1">
              <div
                aria-hidden
                className="absolute inset-0 opacity-60"
                style={{
                  backgroundImage:
                    "linear-gradient(0deg, rgba(14,92,92,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(14,92,92,0.08) 1px, transparent 1px)",
                  backgroundSize: "32px 32px",
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
                <MapPin className="h-10 w-10 text-primary-500" />
                <p className="text-subtitle font-semibold text-primary-700">
                  Map Preview
                </p>
                <p className="px-4 text-caption text-text-secondary">
                  Interactive Google Maps embed will appear here.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
