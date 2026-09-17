"use client";

/**
 * MadrashaOS — Public Home Page (Task 8-a redesign)
 *
 * iom.edu.bd-style premium landing page:
 *   1. Hero — display heading + subtitle + 2 CTAs + gradient + decorative pattern
 *   2. Stats bar — 4 glassmorphism cards on dark contrasting bg
 *   3. About — 2-col (text + image placeholder) with features list
 *   4. Programs preview — 3 course cards with name/duration/fees/Details/Admit
 *   5. Alumni CTA — full-width banner with "Join our Alumni Network"
 *   6. Recent notices — 3 latest notices
 *
 * Reads all copy + programs from the cmsStore so the CMS admin route
 * (/app/website/content) edits propagate live.
 *
 * FROZEN tokens only — no raw hex / px in component code.
 */

import Link from "next/link";
import {
  ArrowRight, Sparkles, ChevronRight, Megaphone, CalendarDays,
  CheckCircle2, Users, GraduationCap, PlayCircle, Presentation,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatDate, formatCurrency } from "@/lib/i18n/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCmsStore } from "@/stores/cmsStore";
import { DynamicIcon } from "@/components/public/DynamicIcon";

const RECENT_NOTICES = [
  {
    id: "n-1",
    title: "Admissions Open for 2026–2027 — Apply Now",
    date: new Date(2026, 8, 26),
    category: "Admission" as const,
    excerpt:
      "Online admissions for the 2026–2027 academic session are now open. Apply early to secure your seat in the Alim, Hifz and Tajweed programs.",
  },
  {
    id: "n-2",
    title: "Half-Yearly Exam Routine Published",
    date: new Date(2026, 8, 22),
    category: "Exam" as const,
    excerpt:
      "Half-yearly examination routines for all classes (Hifz + Alim) are now available. Exams begin 5 October 2026.",
  },
  {
    id: "n-3",
    title: "Annual Quran Competition — 8 October",
    date: new Date(2026, 8, 18),
    category: "Event" as const,
    excerpt:
      "Inter-class Quran recitation and memorization competition. Three categories: Tilawah, Hifz, and Qirat. Chief guest: Qari Yusuf Mansur.",
  },
];

const CATEGORY_TONE: Record<string, string> = {
  Admission: "border-accent-200 bg-accent-50 text-accent-700",
  Exam: "border-info-200 bg-info-50 text-semantic-info",
  Event: "border-success-200 bg-success-50 text-semantic-success",
  Holiday: "border-warning-200 bg-warning-50 text-semantic-warning",
  General: "border-border-default bg-surface-hover text-text-secondary",
};

export default function PublicHomePage() {
  const { locale } = useI18n();
  const isBn = locale === "bn";
  const hero = useCmsStore((s) => s.hero);
  const stats = useCmsStore((s) => s.stats);
  const about = useCmsStore((s) => s.about);
  const programs = useCmsStore((s) => s.programs).slice(0, 3);
  const alumni = useCmsStore((s) => s.alumni);

  const heroTitle = isBn ? hero.titleBn : hero.title;
  const heroSubtitle = isBn ? hero.subtitleBn : hero.subtitle;
  const heroEyebrow = isBn ? hero.eyebrowBn : hero.eyebrow;
  const aboutTitle = isBn ? about.titleBn : about.title;
  const aboutDescription = isBn ? about.descriptionBn : about.description;
  const aboutFeatures = isBn ? about.featuresBn : about.features;
  const alumniTitle = isBn ? alumni.titleBn : alumni.title;
  const alumniDescription = isBn ? alumni.descriptionBn : alumni.description;

  return (
    <div className="flex flex-col">
      {/* ============================================================
       *  Hero — gradient + decorative pattern
       * ============================================================ */}
      <section className="relative overflow-hidden bg-primary-700 text-primary-foreground">
        {/* Decorative radial pattern */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(201,169,97,0.6) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(201,169,97,0.4) 0%, transparent 35%)",
          }}
        />
        {/* Subtle grid pattern */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(0deg, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative mx-auto max-w-[var(--grid-max-width)] px-4 py-16 md:px-6 md:py-24 lg:py-28">
          <div className="max-w-3xl">
            <Badge className="mb-5 border-accent-500/40 bg-accent-500/15 text-accent-500">
              <Sparkles className="h-3.5 w-3.5" />
              {heroEyebrow}
            </Badge>
            <h1 className="text-display font-bold leading-tight md:tracking-tight">
              {heroTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-subtitle leading-relaxed text-primary-100 md:text-title">
              {heroSubtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={hero.primaryCta.href}>
                <Button size="lg" className="bg-accent-500 text-accent-foreground hover:bg-accent-700">
                  {hero.primaryCta.label}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href={hero.secondaryCta.href}>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary-300 bg-transparent text-primary-foreground hover:bg-primary-600"
                >
                  {hero.secondaryCta.label}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
       *  Stats bar — glassmorphism on contrasting dark bg
       * ============================================================ */}
      <section className="relative -mt-12 px-4 pb-4 md:px-6">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {stats.map((stat, idx) => {
              const icons = [Users, GraduationCap, PlayCircle, Presentation];
              const Icon = icons[idx % icons.length];
              return (
                <div
                  key={stat.label}
                  className="flex flex-col items-center gap-2 rounded-xl border border-border-default bg-surface-card/95 p-4 text-center shadow-elevation-3 backdrop-blur transition-transform hover:-translate-y-0.5 md:flex-row md:gap-4 md:text-start"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-headline font-bold leading-tight text-text-primary">
                      {stat.value}
                    </p>
                    <p className="text-caption text-text-secondary">
                      {isBn ? stat.labelBn : stat.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================
       *  About section
       * ============================================================ */}
      <section id="about" className="mx-auto max-w-[var(--grid-max-width)] px-4 py-16 md:px-6 md:py-24">
        <div className="grid gap-8 md:grid-cols-2 md:gap-12">
          {/* Left — copy */}
          <div>
            <Badge variant="outline" className="mb-3 border-primary-200 bg-primary-50 text-primary-700">
              <DynamicIcon name={about.imageIcon} className="h-3.5 w-3.5" />
              {about.eyebrow}
            </Badge>
            <h2 className="text-headline font-bold leading-tight text-text-primary md:text-display">
              {aboutTitle}
            </h2>
            <p className="mt-4 text-body leading-relaxed text-text-secondary md:text-subtitle">
              {aboutDescription}
            </p>
            <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {aboutFeatures.map((feat) => (
                <li key={feat} className="flex items-start gap-2 text-body text-text-secondary">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-semantic-success" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link href="/public/programs">
                <Button variant="outline">
                  Explore our programs
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Right — image placeholder card */}
          <div className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border-default bg-primary-50 shadow-elevation-2">
              <div
                aria-hidden
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 50% 50%, rgba(14,92,92,0.15) 0%, transparent 60%)",
                }}
              />
              <div
                aria-hidden
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage:
                    "linear-gradient(0deg, rgba(14,92,92,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(14,92,92,0.4) 1px, transparent 1px)",
                  backgroundSize: "32px 32px",
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500 text-primary-foreground shadow-elevation-3">
                  <DynamicIcon name={about.imageIcon} className="h-8 w-8" />
                </span>
                <p className="text-subtitle font-semibold text-primary-700">
                  Darul Uloom Madrasha
                </p>
                <p className="px-6 text-caption text-text-secondary">
                  Knowledge · Faith · Character
                </p>
              </div>
            </div>
            {/* Floating stat card */}
            <div className="absolute -bottom-4 -end-4 hidden rounded-xl border border-border-default bg-surface-card p-4 shadow-elevation-3 sm:block">
              <p className="text-headline font-bold text-primary-700">{alumni.stat.value}</p>
              <p className="text-caption text-text-secondary">{alumni.stat.label}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
       *  Programs preview — 3 cards
       * ============================================================ */}
      <section className="bg-surface-card py-16 md:py-24">
        <div className="mx-auto max-w-[var(--grid-max-width)] px-4 md:px-6">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Badge variant="outline" className="mb-3 border-primary-200 bg-primary-50 text-primary-700">
                <Sparkles className="h-3.5 w-3.5" />
                Our Programs
              </Badge>
              <h2 className="text-headline font-bold text-text-primary md:text-display">
                Find your pathway to knowledge
              </h2>
              <p className="mt-2 max-w-2xl text-body text-text-secondary">
                A structured curriculum from foundational Quran to advanced Islamic scholarship — accessible worldwide through live online classes.
              </p>
            </div>
            <Link href="/public/programs" className="hidden md:block">
              <Button variant="outline">
                View all programs
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {programs.map((program) => (
              <Card
                key={program.id}
                className="group flex flex-col border-border-default transition-all duration-200 hover:-translate-y-1 hover:border-accent-500 hover:shadow-elevation-3"
              >
                <CardContent className="flex flex-1 flex-col p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700 transition-colors group-hover:bg-primary-500 group-hover:text-primary-foreground">
                      <DynamicIcon name={program.icon} className="h-5 w-5" />
                    </span>
                    <Badge variant="outline" className="text-text-secondary">
                      <CalendarDays className="h-3 w-3" />
                      {isBn ? program.durationBn : program.duration}
                    </Badge>
                  </div>
                  <h3 className="text-subtitle font-semibold text-text-primary">
                    {isBn ? program.nameBn : program.name}
                  </h3>
                  <p className="mt-1.5 line-clamp-3 text-body text-text-secondary">
                    {isBn ? program.descriptionBn : program.description}
                  </p>

                  {/* Fees */}
                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-border-default bg-surface-canvas p-3">
                    <div>
                      <p className="text-caption text-text-muted">Admission</p>
                      <p className="font-mono text-body font-semibold text-text-primary">
                        {formatCurrency(program.admissionFee, locale)}
                      </p>
                    </div>
                    <div>
                      <p className="text-caption text-text-muted">Monthly</p>
                      <p className="font-mono text-body font-semibold text-text-primary">
                        {formatCurrency(program.monthlyFee, locale)}
                      </p>
                    </div>
                  </div>

                  {/* CTAs */}
                  <div className="mt-auto flex gap-2 pt-4">
                    <Link href="/public/programs" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        Details
                      </Button>
                    </Link>
                    <Link href="/public/admission" className="flex-1">
                      <Button size="sm" className="w-full bg-accent-500 text-accent-foreground hover:bg-accent-700">
                        Admit
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8 text-center md:hidden">
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
       *  Alumni CTA — full-width banner
       * ============================================================ */}
      <section className="bg-primary-800 py-16 text-primary-foreground md:py-20">
        <div className="mx-auto max-w-[var(--grid-max-width)] px-4 md:px-6">
          <div className="grid items-center gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <Badge className="mb-3 border-accent-500/40 bg-accent-500/15 text-accent-500">
                <Sparkles className="h-3.5 w-3.5" />
                Alumni Network
              </Badge>
              <h2 className="text-headline font-bold leading-tight md:text-display">
                {alumniTitle}
              </h2>
              <p className="mt-3 max-w-2xl text-body leading-relaxed text-primary-100 md:text-subtitle">
                {alumniDescription}
              </p>
            </div>
            <div className="flex flex-col items-start gap-4 md:items-end">
              <div className="rounded-xl border border-primary-700 bg-primary-900/50 px-6 py-4 text-center">
                <p className="text-display font-bold text-accent-500">{alumni.stat.value}</p>
                <p className="text-caption text-primary-200">{alumni.stat.label}</p>
              </div>
              <Link href={alumni.ctaHref}>
                <Button size="lg" className="bg-accent-500 text-accent-foreground hover:bg-accent-700">
                  {alumni.ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
       *  Recent notices — 3 latest cards
       * ============================================================ */}
      <section className="mx-auto max-w-[var(--grid-max-width)] px-4 py-16 md:px-6 md:py-24">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge variant="outline" className="mb-3 border-primary-200 bg-primary-50 text-primary-700">
              <Megaphone className="h-3.5 w-3.5" />
              Notice Board
            </Badge>
            <h2 className="text-headline font-bold text-text-primary md:text-display">
              Latest notices
            </h2>
            <p className="mt-2 text-body text-text-secondary">
              Public announcements — admissions, exams, and events.
            </p>
          </div>
          <Link href="/public/notices" className="hidden md:block">
            <Button variant="outline">
              All notices
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {RECENT_NOTICES.map((notice) => (
            <Card
              key={notice.id}
              className="group flex flex-col transition-shadow hover:shadow-elevation-3"
            >
              <CardContent className="flex flex-1 flex-col p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Badge variant="outline" className={CATEGORY_TONE[notice.category]}>
                    {notice.category}
                  </Badge>
                  <span className="text-caption text-text-muted">
                    {formatDate(notice.date, locale)}
                  </span>
                </div>
                <h3 className="text-subtitle font-semibold leading-snug text-text-primary">
                  {notice.title}
                </h3>
                <p className="mt-2 line-clamp-3 flex-1 text-body text-text-secondary">
                  {notice.excerpt}
                </p>
                <Link
                  href="/public/notices"
                  className="mt-4 inline-flex items-center gap-1 text-caption font-medium text-primary-600 transition-colors hover:text-primary-700"
                >
                  Read more
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Link href="/public/notices">
            <Button variant="outline">
              All notices
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
