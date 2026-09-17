"use client";

/**
 * MadrashaOS — Public Notices Page (Phase C5.2 · SRS §2.7.3)
 *
 * Public notice board — visitors see general announcements, holidays,
 * exam schedules and event notices without any permission gate.
 *
 * Features:
 *   - Filter by category (All, General, Holiday, Event, Exam)
 *   - Each notice card shows title, date, body excerpt, "Read more"
 *   - "Read more" opens a Dialog with the full notice body
 *   - Search by title (free text)
 *
 * Per SRS §2.7.3: public notices are world-readable (no permission gate).
 * The internal /notices page (under `(app)`) is the back-office composer.
 */

import * as React from "react";
import {
  Megaphone, CalendarDays, Search, X, AlertCircle,
  GraduationCap, PartyPopper, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatDate, formatDateLong } from "@/lib/i18n/format";

type Category = "General" | "Holiday" | "Event" | "Exam";

type Notice = {
  id: string;
  title: string;
  date: Date;
  category: Category;
  excerpt: string;
  body: string;
};

const NOTICES: Notice[] = [
  {
    id: "n-1",
    title: "Eid-e-Milad-un-Nabi Holiday — Office Closed",
    date: new Date(2026, 8, 26),
    category: "Holiday",
    excerpt: "The madrasha office and classes will remain closed on 27 September in observance of Eid-e-Milad-un-Nabi (12 Rabi ul-Awwal 1448). Regular classes resume Monday 29 September.",
    body: `In the name of Allah, the Most Gracious, the Most Merciful.

Dear parents and guardians,

The madrasha office and all classes (Hifz, Alim, Qirat, Tajweed and Weekend Islamic Studies) will remain closed on Saturday 27 September 2026 in observance of Eid-e-Milad-un-Nabi (12 Rabi ul-Awwal 1448 AH).

Regular classes will resume on Monday 29 September at the usual time of 8:00 AM. Any classes cancelled on Saturday will be rescheduled during the following week.

For emergencies, the office phone (+880 2 555 0199) will be attended between 10 AM and 1 PM on the holiday.

We pray Allah accepts our worship and grants us the intercession of His beloved Messenger ﷺ. Ameen.

Wassalam,
Madrasha Office`,
  },
  {
    id: "n-2",
    title: "Half-Yearly Exam Routine Published",
    date: new Date(2026, 8, 22),
    category: "Exam",
    excerpt: "Half-yearly examination routines for all classes (Hifz + Alim) are now available at the office. Exams begin 5 October 2026.",
    body: `Dear parents and guardians,

The half-yearly examination routines for the academic year 2026-2027 have been published. The routines cover all classes across both Hifz and Alim programs.

Key dates:
- Hifz written exams: 5–9 October 2026
- Alim course exams: 5–12 October 2026
- Qirat practical: 13 October 2026
- Result publication: 25 October 2026

The full routine can be collected from the madrasha office during working hours (8:30 AM – 4:30 PM). Please ensure your child arrives at least 15 minutes before each exam.

A printable PDF version is also being emailed to all registered parents. Please check your spam folder if you do not receive it by 25 September.

Wassalam,
Examination Committee`,
  },
  {
    id: "n-3",
    title: "Annual Sports Day — 15 October",
    date: new Date(2026, 8, 18),
    category: "Event",
    excerpt: "Annual sports competition on 15 October at the Bashundhara playground. Parents are cordially invited to attend and encourage the students.",
    body: `Dear parents and guardians,

We are pleased to announce that our Annual Sports Day will be held on Thursday 15 October 2026 at the Bashundhara Sports Ground, Gate-3.

Events:
- 100m, 200m and 400m races (junior + senior categories)
- Long jump and high jump
- Quran recitation competition (special category)
- Tug-of-war (inter-class)
- Prize distribution at 4:30 PM

Students should arrive by 8:30 AM in their house t-shirts (color assigned by class teacher). Lunch and snacks will be provided. Parents are warmly invited to attend and encourage the students.

For any queries, please contact the sports coordinator at the office.

Jazak Allah khairan,
Sports Committee`,
  },
  {
    id: "n-4",
    title: "Parent-Teacher Meeting — 28 September",
    date: new Date(2026, 8, 15),
    category: "Event",
    excerpt: "Half-yearly parent-teacher meeting on 28 September 2026, 10 AM – 1 PM. All parents are requested to attend to discuss their child's progress.",
    body: `Dear parents and guardians,

A parent-teacher meeting (PTM) is scheduled for Sunday 28 September 2026 from 10:00 AM to 1:00 PM in the main hall of the madrasha.

Agenda:
- Individual class teacher feedback
- Half-yearly exam preparation guidance
- Discussion of student attendance and behaviour
- Plans for the winter semester (November–February)

All parents are strongly requested to attend. If you cannot attend in person, please notify the class teacher in advance so an alternative time can be arranged.

The meeting will conclude with Maghrib prayer at the madrasha mosque — parents are welcome to join.

Wassalam,
Madrasha Office`,
  },
  {
    id: "n-5",
    title: "New Library Books Added — Catalog Update",
    date: new Date(2026, 8, 10),
    category: "General",
    excerpt: "85 new books have been added to the madrasha library — covering Hadith sciences, Tafsir, Arabic literature and children's Islamic stories.",
    body: `Dear students and parents,

We are delighted to announce that 85 new titles have been added to the madrasha library this semester. The new collection includes:

- 15 titles on Hadith sciences (including a new commentary on Sahih al-Bukhari)
- 12 titles on Tafsir (including Tafsir Ibn Kathir in 10 volumes)
- 20 titles on Arabic literature and grammar
- 18 children's Islamic story books (ages 6–12)
- 20 reference titles for Alim Course students

The new catalog is available at the library counter. Library cards are free for all enrolled students. Library hours: Sat–Thu, 9:00 AM – 4:00 PM.

We thank the parents who donated towards this expansion and welcome further book donations in sha Allah.

Wassalam,
Librarian`,
  },
];

const CATEGORIES: Array<"All" | Category> = ["All", "General", "Holiday", "Event", "Exam"];

const CATEGORY_TONE: Record<Category, {
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  General: {
    badge: "border-border-default bg-surface-hover text-text-secondary",
    icon: FileText,
  },
  Holiday: {
    badge: "border-warning-200 bg-warning-50 text-semantic-warning",
    icon: AlertCircle,
  },
  Event: {
    badge: "border-accent-200 bg-accent-50 text-accent-700",
    icon: PartyPopper,
  },
  Exam: {
    badge: "border-info-200 bg-info-50 text-semantic-info",
    icon: GraduationCap,
  },
};

export default function PublicNoticesPage() {
  const { locale } = useI18n();
  const [activeCategory, setActiveCategory] = React.useState<"All" | Category>("All");
  const [search, setSearch] = React.useState("");
  const [openNotice, setOpenNotice] = React.useState<Notice | null>(null);

  const filtered = NOTICES.filter((notice) => {
    const matchesCategory =
      activeCategory === "All" || notice.category === activeCategory;
    const matchesSearch =
      search.trim().length === 0 ||
      notice.title.toLowerCase().includes(search.toLowerCase()) ||
      notice.excerpt.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-[var(--grid-max-width)] px-4 py-12 md:px-6 md:py-16">
      {/* Header */}
      <header className="mb-8 max-w-3xl">
        <Badge variant="outline" className="mb-3 border-primary-200 bg-primary-50 text-primary-700">
          <Megaphone className="h-3.5 w-3.5" />
          Notice Board
        </Badge>
        <h1 className="text-display font-bold text-text-primary">
          Public Notices
        </h1>
        <p className="mt-3 text-body text-text-secondary">
          Announcements for parents, students and the wider community.
          No login required — these notices are public per SRS §2.7.3.
        </p>
      </header>

      {/* Filter bar */}
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div
          role="tablist"
          aria-label="Filter notices by category"
          className="flex flex-wrap gap-2"
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
                {active && (
                  <span className="rounded-full bg-primary-foreground/15 px-1.5 text-caption" aria-hidden>
                    {filtered.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
          <Input
            type="search"
            placeholder="Search notices…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
            aria-label="Search notices by title or content"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-text-muted hover:bg-surface-hover hover:text-text-primary"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Notice list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <Megaphone className="h-10 w-10 text-text-muted" />
            <p className="text-subtitle font-medium text-text-secondary">
              No notices match your filter.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveCategory("All");
                setSearch("");
              }}
            >
              Reset filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((notice) => {
            const tone = CATEGORY_TONE[notice.category];
            const Icon = tone.icon;
            return (
              <Card key={notice.id} className="transition-shadow hover:shadow-elevation-2">
                <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-start">
                  {/* Date block */}
                  <div className="flex shrink-0 items-center gap-3 md:w-32 md:flex-col md:items-start">
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                      <CalendarDays className="h-4 w-4" />
                    </div>
                    <div className="md:mt-1">
                      <p className="text-caption font-medium text-text-secondary">
                        {formatDate(notice.date, locale)}
                      </p>
                      <p className="text-caption text-text-muted">
                        {notice.date.toLocaleDateString("en-US", { weekday: "short" })}
                      </p>
                    </div>
                  </div>

                  {/* Notice body */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={tone.badge}>
                        <Icon className="h-3 w-3" />
                        {notice.category}
                      </Badge>
                      <h2 className="text-subtitle font-semibold text-text-primary">
                        {notice.title}
                      </h2>
                    </div>
                    <p className="mt-2 text-body text-text-secondary line-clamp-3">
                      {notice.excerpt}
                    </p>
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOpenNotice(notice)}
                      >
                        Read more
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Notice detail dialog */}
      <Dialog open={openNotice !== null} onOpenChange={(open) => !open && setOpenNotice(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              {openNotice && (
                <Badge variant="outline" className={CATEGORY_TONE[openNotice.category].badge}>
                  {openNotice.category}
                </Badge>
              )}
              <DialogTitle className="text-subtitle">
                {openNotice?.title}
              </DialogTitle>
            </div>
            <DialogDescription className="flex items-center gap-2 text-caption text-text-muted">
              <CalendarDays className="h-3.5 w-3.5" />
              {openNotice && formatDateLong(openNotice.date, locale)}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto">
            <pre
              className="whitespace-pre-wrap font-sans text-body leading-relaxed text-text-secondary"
              aria-label="Full notice body"
            >
              {openNotice?.body}
            </pre>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNotice(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
