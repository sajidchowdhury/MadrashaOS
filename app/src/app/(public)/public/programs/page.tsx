"use client";

/**
 * MadrashaOS — Public Programs Page (Phase C5.2 · SRS §2.7.3)
 *
 * Lists all academic programs offered by the madrasha.
 * Public visitors can browse and apply — no permission gate.
 *
 * Filters by category: All, Hifz, Alim, Tajweed, Language, Studies.
 */

import * as React from "react";
import Link from "next/link";
import {
  BookOpen, GraduationCap, Mic, Sparkles, Languages, Scroll,
  Clock, Users, ArrowRight, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ProgramCategory =
  | "Hifz"
  | "Alim"
  | "Tajweed"
  | "Language"
  | "Studies";

type Program = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  category: ProgramCategory;
  duration: string;
  eligibility: string;
  seats: number;
  icon: React.ComponentType<{ className?: string }>;
  highlights: string[];
};

const PROGRAMS: Program[] = [
  {
    id: "hifz",
    name: "Hifz-ul-Quran",
    subtitle: "Full Quran memorization",
    description:
      "A structured 3-year program guiding students through complete memorization of the Holy Quran, with daily revision (sabaq + sabqi + manzil) and weekly Tajweed refinement.",
    category: "Hifz",
    duration: "3 years",
    eligibility: "Ages 7–12, completed Nazira Quran",
    seats: 15,
    icon: BookOpen,
    highlights: [
      "Daily individual hifz session",
      "Weekly Tajweed refinement",
      "Monthly parent–teacher review",
    ],
  },
  {
    id: "alim",
    name: "Alim Course",
    subtitle: "Higher Islamic studies (Dawra-e-Hadith)",
    description:
      "Comprehensive 8-year course covering Arabic grammar, Fiqh, Hadith, Tafsir, Aqidah and Islamic history. Final year (Dawra) grants the certificate of Alim.",
    category: "Alim",
    duration: "8 years",
    eligibility: "Completed Hifz or equivalent",
    seats: 12,
    icon: GraduationCap,
    highlights: [
      "Curriculum aligned with Wifaq-ul-Madaris",
      "Specialization in final 2 years",
      "Government-equivalent Alim certificate",
    ],
  },
  {
    id: "qirat",
    name: "Qirat (Saba & Ashara)",
    subtitle: "Ten canonical recitations",
    description:
      "Master the art of beautiful Quranic recitation — learn the seven (Saba) and ten (Ashara) canonical Qira'at under qualified Qaris with ijazah.",
    category: "Tajweed",
    duration: "2 years",
    eligibility: "Completed Hifz or equivalent",
    seats: 8,
    icon: Mic,
    highlights: [
      "Ijazah chain certification",
      "Daily tilawah practice",
      "Annual Qirat competition",
    ],
  },
  {
    id: "tajweed",
    name: "Tajweed Foundation",
    subtitle: "Rules of proper recitation",
    description:
      "A 6-month foundation course on the rules of Tajweed — proper makharij, sifat, and the rules of Noon Sakinah and Meem Sakinah.",
    category: "Tajweed",
    duration: "6 months",
    eligibility: "Ages 6+, beginner-friendly",
    seats: 20,
    icon: Sparkles,
    highlights: [
      "Small batch sizes (max 8)",
      "Hands-on pronunciation drills",
      "Weekend batches available",
    ],
  },
  {
    id: "arabic",
    name: "Arabic Language",
    subtitle: "Classical & modern Arabic",
    description:
      "A 2-year language program — Sarf, Nahw, conversational Arabic, and introductory Balagha. Preparatory track for Alim Course.",
    category: "Language",
    duration: "2 years",
    eligibility: "Ages 12+, no prior Arabic required",
    seats: 18,
    icon: Languages,
    highlights: [
      "Grammar + conversation split",
      "Modern Standard Arabic focus",
      "Quranic vocabulary emphasis",
    ],
  },
  {
    id: "islamic-studies",
    name: "Islamic Studies (Weekend)",
    subtitle: "Supplementary Islamic education",
    description:
      "A weekend-only program for school-going children — Aqidah, Fiqh of worship, Seerah, and basic Quranic understanding alongside mainstream school education.",
    category: "Studies",
    duration: "Ongoing (yearly)",
    eligibility: "Ages 6–16, school-going",
    seats: 30,
    icon: Scroll,
    highlights: [
      "Sat & Sun batches",
      "Age-appropriate curriculum",
      "Affordable monthly fees",
    ],
  },
];

const CATEGORIES: Array<"All" | ProgramCategory> = [
  "All", "Hifz", "Alim", "Tajweed", "Language", "Studies",
];

const CATEGORY_TONE: Record<ProgramCategory, string> = {
  Hifz: "border-primary-200 bg-primary-50 text-primary-700",
  Alim: "border-accent-200 bg-accent-50 text-accent-700",
  Tajweed: "border-info-200 bg-info-50 text-semantic-info",
  Language: "border-success-200 bg-success-50 text-semantic-success",
  Studies: "border-warning-200 bg-warning-50 text-semantic-warning",
};

export default function PublicProgramsPage() {
  const [activeCategory, setActiveCategory] =
    React.useState<"All" | ProgramCategory>("All");

  const filtered = activeCategory === "All"
    ? PROGRAMS
    : PROGRAMS.filter((p) => p.category === activeCategory);

  return (
    <div className="mx-auto max-w-[var(--grid-max-width)] px-4 py-12 md:px-6 md:py-16">
      {/* Header */}
      <header className="mb-10 max-w-3xl">
        <Badge variant="outline" className="mb-3 border-primary-200 bg-primary-50 text-primary-700">
          <BookOpen className="h-3.5 w-3.5" />
          Academic Programs
        </Badge>
        <h1 className="text-display font-bold text-text-primary">
          Programs Offered
        </h1>
        <p className="mt-3 text-body text-text-secondary">
          From foundational Quran recitation to advanced Islamic scholarship —
          find the right program for your child&apos;s age, aptitude and aspiration.
        </p>
      </header>

      {/* Category filter */}
      <div
        role="tablist"
        aria-label="Filter programs by category"
        className="mb-8 flex flex-wrap gap-2"
      >
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveCategory(cat)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-body font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                active
                  ? "border-primary-500 bg-primary-500 text-primary-foreground"
                  : "border-border-default bg-surface-card text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              }`}
            >
              {cat}
              {active !== (cat === "All") && (
                <span
                  className="rounded-full bg-primary-foreground/15 px-1.5 text-caption"
                  aria-hidden
                >
                  {active
                    ? filtered.length
                    : PROGRAMS.filter((p) => p.category === cat).length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Programs grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((program) => {
          const Icon = program.icon;
          return (
            <Card
              key={program.id}
              className="group flex flex-col transition-shadow hover:shadow-elevation-3"
            >
              <CardHeader>
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700 transition-colors group-hover:bg-primary-500 group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-subtitle">{program.name}</CardTitle>
                    <p className="text-caption text-text-muted">{program.subtitle}</p>
                  </div>
                </div>
                <div className="mt-2">
                  <Badge variant="outline" className={CATEGORY_TONE[program.category]}>
                    {program.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <p className="text-body text-text-secondary">
                  {program.description}
                </p>

                {/* Meta */}
                <ul className="mt-4 space-y-2 text-caption text-text-secondary">
                  <li className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-text-muted" />
                    <span className="font-medium">Duration:</span>
                    <span>{program.duration}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-text-muted" />
                    <span className="font-medium">Eligibility:</span>
                    <span>{program.eligibility}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <GraduationCap className="h-3.5 w-3.5 text-text-muted" />
                    <span className="font-medium">Seats:</span>
                    <span>{program.seats} per batch</span>
                  </li>
                </ul>

                {/* Highlights */}
                <ul className="mt-4 space-y-1.5">
                  {program.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-caption text-text-secondary">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-semantic-success" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA — pushes to bottom */}
                <div className="mt-auto pt-4">
                  <Link href="/public/admission">
                    <Button variant="outline" className="w-full">
                      Apply for {program.name}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty state (defensive — should never trigger since "All" shows 6) */}
      {filtered.length === 0 && (
        <p className="py-12 text-center text-body text-text-muted">
          No programs in this category yet — please check back soon.
        </p>
      )}

      {/* CTA footer */}
      <Card className="mt-12 border-primary-200 bg-primary-50">
        <CardContent className="flex flex-col items-start justify-between gap-4 p-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-subtitle font-semibold text-primary-700">
              Unsure which program fits your child?
            </h2>
            <p className="mt-1 text-body text-primary-700/80">
              Our admissions team will guide you through placement based on age,
              prior Quranic education and aptitude.
            </p>
          </div>
          <Link href="/public/contact">
            <Button className="shrink-0">
              Talk to an advisor
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
