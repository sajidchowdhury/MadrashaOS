"use client";

/**
 * MadrashaOS — Public Events Page (Task 8-a redesign)
 *
 * iom.edu.bd-style premium events page:
 *   - Page header + breadcrumb
 *   - Upcoming events: each as a premium card with date block (day/month),
 *     title, time, location, description, "Add to Calendar" button
 *   - Past events section (greyed out)
 */

import * as React from "react";
import Link from "next/link";
import {
  CalendarDays, Clock, MapPin, Trophy, BookOpen, Users,
  GraduationCap, CalendarPlus, Info, Home, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatDate, formatDateLong, formatNumber } from "@/lib/i18n/format";

type Event = {
  id: string;
  name: string;
  date: Date;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: "Sports" | "Academic" | "Community" | "Ceremony";
};

const EVENTS: Event[] = [
  {
    id: "e-1",
    name: "Inter-Class Quran Competition",
    date: new Date(2026, 9, 8),
    startTime: "09:00",
    endTime: "13:00",
    location: "Madrasha Main Hall",
    description:
      "Annual Quran recitation and memorization competition. Students from Hifz and Alim programs compete across three categories: Tilawah, Hifz, and Qirat. Chief guest: Qari Yusuf Mansur.",
    icon: BookOpen,
    category: "Academic",
  },
  {
    id: "e-2",
    name: "Annual Sports Day 2026",
    date: new Date(2026, 9, 15),
    startTime: "08:30",
    endTime: "17:00",
    location: "Bashundhara Sports Ground, Gate-3",
    description:
      "Annual inter-house sports competition featuring races, long jump, tug-of-war and a special Quran recitation contest. Prize distribution at 4:30 PM. Lunch and refreshments provided.",
    icon: Trophy,
    category: "Sports",
  },
  {
    id: "e-3",
    name: "Parent-Teacher Meeting (Half-Yearly)",
    date: new Date(2026, 8, 28),
    startTime: "10:00",
    endTime: "13:00",
    location: "Madrasha Main Hall",
    description:
      "Half-yearly parent-teacher meeting to discuss student progress, exam preparation guidance, and winter semester plans. Concludes with Maghrib prayer at the madrasha mosque.",
    icon: Users,
    category: "Community",
  },
  {
    id: "e-4",
    name: "Graduation Ceremony — Dawra-e-Hadith 2026",
    date: new Date(2026, 11, 18),
    startTime: "15:00",
    endTime: "18:30",
    location: "Auditorium, Block-C",
    description:
      "Graduation ceremony for the Dawra-e-Hadith (Alim Course final year) class of 2026. Distinguished guests include scholars from Wifaq-ul-Madaris. Certificate distribution, Dua and dinner.",
    icon: GraduationCap,
    category: "Ceremony",
  },
];

// Past events (dates before now's simulation anchor — Sep 2026).
const PAST_EVENTS: Event[] = [
  {
    id: "p-1",
    name: "Annual Quran Recitation Workshop",
    date: new Date(2026, 5, 12),
    startTime: "10:00",
    endTime: "12:00",
    location: "Online (Zoom)",
    description: "Special workshop on Tajweed refinement for advanced Hifz students.",
    icon: BookOpen,
    category: "Academic",
  },
  {
    id: "p-2",
    name: "Eid Get-Together — Community Iftar",
    date: new Date(2026, 2, 25),
    startTime: "17:30",
    endTime: "20:00",
    location: "Madrasha Courtyard",
    description: "Community Iftar gathering with students, parents and staff. Over 400 attendees.",
    icon: Users,
    category: "Community",
  },
];

const CATEGORY_TONE: Record<Event["category"], string> = {
  Sports: "border-success-200 bg-success-50 text-semantic-success",
  Academic: "border-info-200 bg-info-50 text-semantic-info",
  Community: "border-accent-200 bg-accent-50 text-accent-700",
  Ceremony: "border-primary-200 bg-primary-50 text-primary-700",
};

function downloadIcs(event: Event) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const toIcsDate = (d: Date, time: string) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${time.replace(":", "")}00`;
  const dtStart = toIcsDate(event.date, event.startTime);
  const dtEnd = toIcsDate(event.date, event.endTime);

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MadrashaOS//Public Events//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@madrashaos.org`,
    `DTSTAMP:${dtStart}Z`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${event.name}`,
    `LOCATION:${event.location}`,
    `DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.id}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function DateBlock({ date }: { date: Date }) {
  return (
    <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg border border-primary-200 bg-primary-50 text-primary-700">
      <span className="text-headline font-bold leading-none">
        {date.getDate()}
      </span>
      <span className="text-caption uppercase tracking-wider">
        {date.toLocaleDateString("en-US", { month: "short" })}
      </span>
      <span className="text-caption text-primary-600">
        {date.getFullYear()}
      </span>
    </div>
  );
}

export default function PublicEventsPage() {
  const { locale } = useI18n();
  const { toast } = useToast();

  const handleAddToCalendar = (event: Event) => {
    try {
      downloadIcs(event);
      toast({
        title: "Calendar file downloaded",
        description: `Import ${event.name}.ics into Google Calendar / Outlook / Apple Calendar.`,
      });
    } catch {
      toast({
        title: "Could not generate calendar file",
        description: "Please try again later or contact the office.",
        variant: "destructive",
      });
    }
  };

  // Sort upcoming ascending.
  const upcoming = [...EVENTS].sort((a, b) => a.date.getTime() - b.date.getTime());
  // Sort past descending (most recent first).
  const past = [...PAST_EVENTS].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="mx-auto max-w-[var(--grid-max-width)] px-4 py-12 md:px-6 md:py-16">
      {/* v1 limitation banner */}
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-semantic-warning/40 bg-warning-50 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-semantic-warning" />
        <div>
          <p className="text-subtitle font-semibold text-semantic-warning">
            v1 Limitation: Events are sample data
          </p>
          <p className="mt-1 text-body text-text-secondary">
            These events are examples for demonstration. A server-backed events system
            with database persistence is planned for v2. For v1, events are managed as
            notices (use the Notices module with category &ldquo;Event&rdquo;).
          </p>
        </div>
      </div>

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
          <li className="text-text-secondary" aria-current="page">Events</li>
        </ol>
      </nav>

      {/* Header */}
      <header className="mb-10 max-w-3xl">
        <Badge variant="outline" className="mb-3 border-primary-200 bg-primary-50 text-primary-700">
          <CalendarDays className="h-3.5 w-3.5" />
          Event Calendar
        </Badge>
        <h1 className="text-display font-bold text-text-primary">
          Upcoming Events
        </h1>
        <p className="mt-3 text-body text-text-secondary md:text-subtitle">
          Mark your calendar — parents and community members are warmly invited
          to attend all listed events. Click <em>Add to Calendar</em> to download
          a calendar file (works with Google Calendar, Outlook and Apple Calendar).
        </p>
      </header>

      {/* Upcoming events */}
      <div className="space-y-4">
        {upcoming.map((event) => {
          const Icon = event.icon;
          return (
            <Card
              key={event.id}
              className="group border-border-default transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-500 hover:shadow-elevation-2"
            >
              <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-start">
                {/* Date block */}
                <DateBlock date={event.date} />

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="text-subtitle font-semibold text-text-primary">
                        {event.name}
                      </h2>
                      <p className="mt-0.5 text-caption text-text-muted">
                        {formatDateLong(event.date, locale)} ·{" "}
                        {event.startTime} – {event.endTime}
                      </p>
                    </div>
                    <Badge variant="outline" className={CATEGORY_TONE[event.category]}>
                      <Icon className="h-3 w-3" />
                      {event.category}
                    </Badge>
                  </div>

                  <p className="mt-3 text-body text-text-secondary">
                    {event.description}
                  </p>

                  {/* Meta */}
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    <li className="flex items-start gap-2 text-body text-text-secondary">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
                      <div>
                        <p className="text-caption font-medium text-text-muted">Time</p>
                        <p className="text-body">
                          {formatNumber(Number(event.startTime.split(":")[0]), locale)}:
                          {event.startTime.split(":")[1]} –{" "}
                          {formatNumber(Number(event.endTime.split(":")[0]), locale)}:
                          {event.endTime.split(":")[1]}
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2 text-body text-text-secondary">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
                      <div>
                        <p className="text-caption font-medium text-text-muted">Location</p>
                        <p className="text-body">{event.location}</p>
                      </div>
                    </li>
                  </ul>

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddToCalendar(event)}
                    >
                      <CalendarPlus className="h-4 w-4" />
                      Add to Calendar
                    </Button>
                  </div>

                  {/* sr-only date for crawlers */}
                  <p className="sr-only">
                    {formatDate(event.date, locale)}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Past events */}
      <section aria-label="Past events" className="mt-12">
        <h2 className="mb-6 text-headline font-bold text-text-secondary">
          Past Events
        </h2>
        <div className="space-y-3">
          {past.map((event) => {
            const Icon = event.icon;
            return (
              <Card
                key={event.id}
                className="border-border-default bg-surface-hover/40 opacity-75"
              >
                <CardContent className="flex flex-col gap-4 p-5 opacity-90 md:flex-row md:items-start">
                  <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg border border-border-default bg-surface-card text-text-muted">
                    <span className="text-headline font-bold leading-none">
                      {event.date.getDate()}
                    </span>
                    <span className="text-caption uppercase">
                      {event.date.toLocaleDateString("en-US", { month: "short" })}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-subtitle font-semibold text-text-secondary">
                          {event.name}
                        </h3>
                        <p className="mt-0.5 text-caption text-text-muted">
                          {formatDateLong(event.date, locale)} ·{" "}
                          {event.startTime} – {event.endTime}
                        </p>
                      </div>
                      <Badge variant="outline" className={CATEGORY_TONE[event.category]}>
                        <Icon className="h-3 w-3" />
                        {event.category}
                      </Badge>
                    </div>
                    <p className="mt-3 text-body text-text-secondary">
                      {event.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Info note */}
      <Card className="mt-10 border-info-200 bg-info-50">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-semantic-info" />
          <div>
            <p className="text-subtitle font-medium text-semantic-info">
              Calendar file format
            </p>
            <p className="mt-1 text-body text-text-secondary">
              The downloaded <code className="font-mono text-text-primary">.ics</code> file
              is compatible with Google Calendar, Outlook, Apple Calendar and any
              standard calendar app. Just open it after download to import.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
