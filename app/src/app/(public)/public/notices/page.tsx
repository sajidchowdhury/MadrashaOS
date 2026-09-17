"use client";

/**
 * MadrashaOS — Public Notices Page (Task 8-a redesign)
 *
 * iom.edu.bd-style premium notices page:
 *   - Page header with title + breadcrumb
 *   - Search bar + filter chips (All, Holiday, Event, Exam, Admission, General)
 *   - Each notice as a premium card with date badge + audience badge
 *   - "Read More" opens a Dialog with the full notice body
 *   - Pagination at the bottom
 *
 * Public per SRS §2.7.3 — no permission gate.
 */

import * as React from "react";
import Link from "next/link";
import {
  Megaphone, CalendarDays, Search, X, AlertCircle,
  GraduationCap, PartyPopper, FileText, ChevronLeft, ChevronRight,
  Home, ArrowRight,
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

type Category = "General" | "Holiday" | "Event" | "Exam" | "Admission";

type Notice = {
  id: string;
  title: string;
  date: Date;
  category: Category;
  audience: "Public" | "Parents" | "Students" | "Staff";
  excerpt: string;
  body: string;
};

const NOTICES: Notice[] = [
  {
    id: "n-1",
    title: "Admissions Open for 2026–2027 — Apply Now",
    date: new Date(2026, 8, 26),
    category: "Admission",
    audience: "Public",
    excerpt:
      "Online admissions for the 2026–2027 academic session are now open. Apply early to secure your seat in the Alim, Hifz and Tajweed programs. Application deadline: 15 October 2026.",
    body:
      "In the name of Allah, the Most Gracious, the Most Merciful.\n\nDear parents and guardians,\n\nOnline admissions for the 2026–2027 academic session are now open. Seats are available across all six programs: Alim Course (3 years), Nazera Quran (6 months), One-to-One Private, Hifz-ul-Quran, Tajweed Foundation, and Arabic Language.\n\nApplication deadline: 15 October 2026. Late applications will be considered only if seats remain.\n\nTo apply: visit /public/admission or call +880 9638-113322 during office hours (Sat–Thu, 8:30 AM – 4:30 PM).\n\nWe pray Allah accepts your intention to seek knowledge. Ameen.\n\nWassalam,\nMadrasha Office",
  },
  {
    id: "n-2",
    title: "Eid-e-Milad-un-Nabi Holiday — Office Closed",
    date: new Date(2026, 8, 24),
    category: "Holiday",
    audience: "Public",
    excerpt:
      "The madrasha office and all classes will remain closed on 27 September in observance of Eid-e-Milad-un-Nabi (12 Rabi ul-Awwal 1448). Regular classes resume Monday 29 September.",
    body:
      "In the name of Allah, the Most Gracious, the Most Merciful.\n\nDear parents and guardians,\n\nThe madrasha office and all classes (Hifz, Alim, Qirat, Tajweed and Weekend Islamic Studies) will remain closed on Saturday 27 September 2026 in observance of Eid-e-Milad-un-Nabi (12 Rabi ul-Awwal 1448 AH).\n\nRegular classes will resume on Monday 29 September at the usual time of 8:00 AM. Any classes cancelled on Saturday will be rescheduled during the following week.\n\nFor emergencies, the office phone will be attended between 10 AM and 1 PM on the holiday.\n\nWassalam,\nMadrasha Office",
  },
  {
    id: "n-3",
    title: "Half-Yearly Exam Routine Published",
    date: new Date(2026, 8, 22),
    category: "Exam",
    audience: "Parents",
    excerpt:
      "Half-yearly examination routines for all classes (Hifz + Alim) are now available at the office. Exams begin 5 October 2026. Result publication: 25 October 2026.",
    body:
      "Dear parents and guardians,\n\nThe half-yearly examination routines for the academic year 2026-2027 have been published. The routines cover all classes across both Hifz and Alim programs.\n\nKey dates:\n- Hifz written exams: 5–9 October 2026\n- Alim course exams: 5–12 October 2026\n- Qirat practical: 13 October 2026\n- Result publication: 25 October 2026\n\nThe full routine can be collected from the madrasha office during working hours (8:30 AM – 4:30 PM). Please ensure your child arrives at least 15 minutes before each exam.\n\nWassalam,\nExamination Committee",
  },
  {
    id: "n-4",
    title: "Inter-Class Quran Competition — 8 October",
    date: new Date(2026, 8, 18),
    category: "Event",
    audience: "Students",
    excerpt:
      "Annual Quran recitation and memorization competition on 8 October 2026. Three categories: Tilawah, Hifz, and Qirat. Chief guest: Qari Yusuf Mansur.",
    body:
      "Dear parents and guardians,\n\nWe are pleased to announce that our Inter-Class Quran Competition will be held on Thursday 8 October 2026 at the Madrasha Main Hall.\n\nThree competition categories:\n- Tilawah (beautiful recitation) — ages 7–10\n- Hifz (memorization) — ages 10–14\n- Qirat (canonical recitations) — ages 14+\n\nChief guest: Qari Yusuf Mansur (international Qari, ijazah holder).\n\nPrizes: 1st place ৳5,000, 2nd place ৳3,000, 3rd place ৳2,000 — per category.\n\nParticipation is open to all enrolled students. Registration closes 1 October at the office.\n\nJazak Allah khairan,\nSports Committee",
  },
  {
    id: "n-5",
    title: "Parent-Teacher Meeting — 28 September",
    date: new Date(2026, 8, 15),
    category: "Event",
    audience: "Parents",
    excerpt:
      "Half-yearly parent-teacher meeting on 28 September 2026, 10 AM – 1 PM. All parents are requested to attend to discuss their child's progress.",
    body:
      "Dear parents and guardians,\n\nA parent-teacher meeting (PTM) is scheduled for Sunday 28 September 2026 from 10:00 AM to 1:00 PM in the main hall of the madrasha.\n\nAgenda:\n- Individual class teacher feedback\n- Half-yearly exam preparation guidance\n- Discussion of student attendance and behaviour\n- Plans for the winter semester (November–February)\n\nAll parents are strongly requested to attend. The meeting will conclude with Maghrib prayer at the madrasha mosque — parents are welcome to join.\n\nWassalam,\nMadrasha Office",
  },
  {
    id: "n-6",
    title: "New Library Books Added — Catalog Update",
    date: new Date(2026, 8, 10),
    category: "General",
    audience: "Students",
    excerpt:
      "85 new books added to the madrasha library — covering Hadith sciences, Tafsir, Arabic literature and children's Islamic stories.",
    body:
      "Dear students and parents,\n\nWe are delighted to announce that 85 new titles have been added to the madrasha library this semester. The new collection includes:\n\n- 15 titles on Hadith sciences (including a new commentary on Sahih al-Bukhari)\n- 12 titles on Tafsir (including Tafsir Ibn Kathir in 10 volumes)\n- 20 titles on Arabic literature and grammar\n- 18 children's Islamic story books (ages 6–12)\n- 20 reference titles for Alim Course students\n\nThe new catalog is available at the library counter. Library cards are free for all enrolled students.\n\nWassalam,\nLibrarian",
  },
  {
    id: "n-7",
    title: "Winter Semester Timetable Released",
    date: new Date(2026, 8, 5),
    category: "General",
    audience: "Staff",
    excerpt:
      "The winter semester (November–February) timetable has been released. All teachers are requested to review their schedule and confirm by 20 September.",
    body:
      "Dear teachers,\n\nThe winter semester (November 2026 – February 2027) timetable is now available in the staff portal. Please review your assigned classes and confirm your availability by 20 September 2026.\n\nKey changes for the winter semester:\n- Morning Hifz session shifts to 6:30 AM (was 7:00 AM)\n- Evening Alim class adds a Hadith specialization module\n- New Saturday Tajweed workshop for adults\n\nFor any scheduling conflicts, please contact the academic coordinator.\n\nWassalam,\nAcademic Committee",
  },
  {
    id: "n-8",
    title: "Annual Sports Day — 15 October",
    date: new Date(2026, 8, 2),
    category: "Event",
    audience: "Public",
    excerpt:
      "Annual sports competition on 15 October at the Bashundhara playground. Parents are cordially invited to attend and encourage the students.",
    body:
      "Dear parents and guardians,\n\nWe are pleased to announce that our Annual Sports Day will be held on Thursday 15 October 2026 at the Bashundhara Sports Ground, Gate-3.\n\nEvents:\n- 100m, 200m and 400m races (junior + senior categories)\n- Long jump and high jump\n- Quran recitation competition (special category)\n- Tug-of-war (inter-class)\n- Prize distribution at 4:30 PM\n\nStudents should arrive by 8:30 AM in their house t-shirts. Lunch and snacks will be provided.\n\nJazak Allah khairan,\nSports Committee",
  },
];

const CATEGORIES: Array<"All" | Category> = ["All", "Admission", "Holiday", "Event", "Exam", "General"];

const CATEGORY_TONE: Record<Category, { badge: string; icon: React.ComponentType<{ className?: string }> }> = {
  Admission: {
    badge: "border-accent-200 bg-accent-50 text-accent-700",
    icon: GraduationCap,
  },
  General: {
    badge: "border-border-default bg-surface-hover text-text-secondary",
    icon: FileText,
  },
  Holiday: {
    badge: "border-warning-200 bg-warning-50 text-semantic-warning",
    icon: AlertCircle,
  },
  Event: {
    badge: "border-success-200 bg-success-50 text-semantic-success",
    icon: PartyPopper,
  },
  Exam: {
    badge: "border-info-200 bg-info-50 text-semantic-info",
    icon: GraduationCap,
  },
};

const AUDIENCE_TONE: Record<Notice["audience"], string> = {
  Public: "border-border-default bg-surface-canvas text-text-secondary",
  Parents: "border-primary-200 bg-primary-50 text-primary-700",
  Students: "border-info-200 bg-info-50 text-semantic-info",
  Staff: "border-accent-200 bg-accent-50 text-accent-700",
};

const PAGE_SIZE = 5;

export default function PublicNoticesPage() {
  const { locale } = useI18n();
  const [activeCategory, setActiveCategory] = React.useState<"All" | Category>("All");
  const [search, setSearch] = React.useState("");
  const [openNotice, setOpenNotice] = React.useState<Notice | null>(null);
  const [page, setPage] = React.useState(1);

  const filtered = NOTICES.filter((notice) => {
    const matchesCategory = activeCategory === "All" || notice.category === activeCategory;
    const matchesSearch =
      search.trim().length === 0 ||
      notice.title.toLowerCase().includes(search.toLowerCase()) ||
      notice.excerpt.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Reset page when filter changes.
  React.useEffect(() => {
    setPage(1);
  }, [activeCategory, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
          <li className="text-text-secondary" aria-current="page">Notices</li>
        </ol>
      </nav>

      {/* Header */}
      <header className="mb-8 max-w-3xl">
        <Badge variant="outline" className="mb-3 border-primary-200 bg-primary-50 text-primary-700">
          <Megaphone className="h-3.5 w-3.5" />
          Notice Board
        </Badge>
        <h1 className="text-display font-bold text-text-primary">
          Public Notices
        </h1>
        <p className="mt-3 text-body text-text-secondary md:text-subtitle">
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
      {paged.length === 0 ? (
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
          {paged.map((notice) => {
            const tone = CATEGORY_TONE[notice.category];
            const Icon = tone.icon;
            return (
              <Card
                key={notice.id}
                className="group transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-500 hover:shadow-elevation-2"
              >
                <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-start">
                  {/* Date badge block */}
                  <div className="flex shrink-0 items-center gap-3 md:w-28 md:flex-col md:items-start">
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg border border-primary-200 bg-primary-50 text-primary-700">
                      <span className="text-headline font-bold leading-none">
                        {notice.date.getDate()}
                      </span>
                      <span className="text-caption uppercase">
                        {notice.date.toLocaleDateString("en-US", { month: "short" })}
                      </span>
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
                      <Badge variant="outline" className={AUDIENCE_TONE[notice.audience]}>
                        {notice.audience}
                      </Badge>
                    </div>
                    <h2 className="mt-2 text-subtitle font-semibold text-text-primary">
                      {notice.title}
                    </h2>
                    <p className="mt-1.5 line-clamp-3 text-body text-text-secondary">
                      {notice.excerpt}
                    </p>
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOpenNotice(notice)}
                      >
                        Read more
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <span className="px-3 text-body text-text-secondary">
            Page <span className="font-medium text-text-primary">{page}</span> of{" "}
            <span className="font-medium text-text-primary">{totalPages}</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            aria-label="Next page"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
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
