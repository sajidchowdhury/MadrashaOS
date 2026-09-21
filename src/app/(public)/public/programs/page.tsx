"use client";

/**
 * MadrashaOS — Public Programs Page (Task 8-a redesign)
 *
 * iom.edu.bd-style premium program grid:
 *   - Page header with title + breadcrumb
 *   - Filter bar (category chips)
 *   - Grid of all programs from cmsStore.programs
 *   - Each card: icon, name, duration, description, admission fee,
 *     monthly fee, "Details" + "Admit" buttons
 *   - Premium hover lift + accent gold border on hover
 */

import * as React from "react";
import Link from "next/link";
import {
  CalendarDays, Users, ArrowRight, CheckCircle2, ChevronRight, Home, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCmsStore } from "@/stores/cmsStore";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatCurrency } from "@/lib/i18n/format";
import { DynamicIcon } from "@/components/public/DynamicIcon";

const CATEGORY_TONE: Record<string, string> = {
  Hifz: "border-primary-200 bg-primary-50 text-primary-700",
  Alim: "border-accent-200 bg-accent-50 text-accent-700",
  Tajweed: "border-info-200 bg-info-50 text-semantic-info",
  Language: "border-success-200 bg-success-50 text-semantic-success",
  Studies: "border-warning-200 bg-warning-50 text-semantic-warning",
};

export default function PublicProgramsPage() {
  const { locale } = useI18n();
  const isBn = locale === "bn";
  const programs = useCmsStore((s) => s.programs);
  const [activeCategory, setActiveCategory] = React.useState<string>("All");

  // Derive categories from the programs in the CMS.
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    programs.forEach((p) => set.add(p.category));
    return ["All", ...Array.from(set)];
  }, [programs]);

  const filtered = activeCategory === "All"
    ? programs
    : programs.filter((p) => p.category === activeCategory);

  return (
    <div className="mx-auto max-w-[var(--grid-max-width)] px-4 py-12 md:px-6 md:py-16">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-caption text-text-muted">
          <li>
            <Link href="/public" className="inline-flex items-center gap-1 hover:text-primary-700">
              <Home className="h-3 w-3" />
              Home
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-text-secondary" aria-current="page">Programs</li>
        </ol>
      </nav>

      {/* Header */}
      <header className="mb-10 max-w-3xl">
        <Badge variant="outline" className="mb-3 border-primary-200 bg-primary-50 text-primary-700">
          <BookOpen className="h-3.5 w-3.5" />
          Academic Programs
        </Badge>
        <h1 className="text-display font-bold text-text-primary">
          Programs Offered
        </h1>
        <p className="mt-3 text-body text-text-secondary md:text-subtitle">
          From foundational Quran recitation to advanced Islamic scholarship —
          find the right program for your child&apos;s age, aptitude and aspiration.
        </p>
      </header>

      {/* Filter chips */}
      <div
        role="tablist"
        aria-label="Filter programs by category"
        className="mb-8 flex flex-wrap gap-2"
      >
        {categories.map((cat) => {
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
              {active && (
                <span className="rounded-full bg-primary-foreground/15 px-1.5 text-caption" aria-hidden>
                  {filtered.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Programs grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((program) => (
          <Card
            key={program.id}
            className="group flex flex-col border-border-default transition-all duration-200 hover:-translate-y-1 hover:border-accent-500 hover:shadow-elevation-3"
          >
            <CardContent className="flex flex-1 flex-col p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700 transition-colors group-hover:bg-primary-500 group-hover:text-primary-foreground">
                  <DynamicIcon name={program.icon} className="h-5 w-5" />
                </span>
                <Badge variant="outline" className={CATEGORY_TONE[program.category] ?? "border-border-default bg-surface-hover text-text-secondary"}>
                  {program.category}
                </Badge>
              </div>

              <h2 className="text-subtitle font-semibold text-text-primary">
                {isBn ? program.nameBn : program.name}
              </h2>
              <p className="mt-1.5 line-clamp-3 text-body text-text-secondary">
                {isBn ? program.descriptionBn : program.description}
              </p>

              {/* Meta */}
              <ul className="mt-4 space-y-1.5 text-caption text-text-secondary">
                <li className="flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5 text-text-muted" />
                  <span className="font-medium">Duration:</span>
                  <span>{isBn ? program.durationBn : program.duration}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-text-muted" />
                  <span className="font-medium">Seats:</span>
                  <span>{program.seats} per batch</span>
                </li>
              </ul>

              {/* Highlights */}
              <ul className="mt-3 space-y-1.5">
                {program.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-caption text-text-secondary">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-semantic-success" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>

              {/* Fees */}
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-border-default bg-surface-canvas p-3">
                <div>
                  <p className="text-caption text-text-muted">Admission Fee</p>
                  <p className="font-mono text-body font-semibold text-text-primary">
                    {formatCurrency(program.admissionFee, locale)}
                  </p>
                </div>
                <div>
                  <p className="text-caption text-text-muted">Monthly Fee</p>
                  <p className="font-mono text-body font-semibold text-text-primary">
                    {formatCurrency(program.monthlyFee, locale)}
                  </p>
                </div>
              </div>

              {/* CTAs */}
              <div className="mt-auto flex gap-2 pt-4">
                <Link href="/public/admission" className="flex-1">
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
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
