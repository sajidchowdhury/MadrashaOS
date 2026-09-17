"use client";

/**
 * MadrashaOS — Public Events Page (Phase C5.2 · SRS §2.7.3)
 *
 * Public event calendar — upcoming madrasha events:
 *   - Annual Sports, Quran Competition, Parent-Teacher Meeting, Graduation
 *
 * Each event:
 *   - Name, date, time, location, description
 *   - "Add to Calendar" button (mock — generates a basic ICS download)
 *
 * NO permissions required — public visitors see this freely.
 */

import * as React from "react";
import {
  CalendarDays, Clock, MapPin, Trophy, BookOpen, Users,
  GraduationCap, CalendarPlus, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatDate, formatDateLong, formatNumber } from "@/lib/i18n/format";

type Event = {
  id: string;
  name: string;
  date: Date;
  startTime: string; // "HH:MM"
  endTime: string;
  location: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: "Sports" | "Academic" | "Community" | "Ceremony";
};

const EVENTS: Event[] = [
  {
    id: "e-1",
    name: "Annual Sports Day 2026",
    date: new Date(2026, 9, 15),
    startTime: "08:30",
    endTime: "17:00",
    location: "Bashundhara Sports Ground, Gate-3",
    description: "Annual inter-house sports competition featuring races, long jump, tug-of-war and a special Quran recitation contest. Prize distribution at 4:30 PM. Lunch and refreshments provided.",
    icon: Trophy,
    category: "Sports",
  },
  {
    id: "e-2",
    name: "Inter-Class Quran Competition",
    date: new Date(2026, 9, 8),
    startTime: "09:00",
    endTime: "13:00",
    location: "Madrasha Main Hall",
    description: "Annual Quran recitation and memorization competition. Students from Hifz and Alim programs compete across three categories: Tilawah, Hifz, and Qirat. Chief guest: Qari Yusuf Mansur.",
    icon: BookOpen,
    category: "Academic",
  },
  {
    id: "e-3",
    name: "Parent-Teacher Meeting (Half-Yearly)",
    date: new Date(2026, 8, 28),
    startTime: "10:00",
    endTime: "13:00",
    location: "Madrasha Main Hall",
    description: "Half-yearly parent-teacher meeting to discuss student progress, exam preparation guidance, and winter semester plans. Concludes with Maghrib prayer at the madrasha mosque.",
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
    description: "Graduation ceremony for the Dawra-e-Hadith (Alim Course final year) class of 2026. Distinguished guests include scholars from Wifaq-ul-Madaris. Certificate distribution, Dua and dinner.",
    icon: GraduationCap,
    category: "Ceremony",
  },
];

const CATEGORY_TONE: Record<Event["category"], string> = {
  Sports: "border-success-200 bg-success-50 text-semantic-success",
  Academic: "border-info-200 bg-info-50 text-semantic-info",
  Community: "border-accent-200 bg-accent-50 text-accent-700",
  Ceremony: "border-primary-200 bg-primary-50 text-primary-700",
};

/**
 * Generate a minimal ICS calendar file for an event and trigger download.
 * This is the standard iCalendar format — works with Google Calendar,
 * Outlook, and Apple Calendar.
 */
function downloadIcs(event: Event) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const toIcsDate = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${event.startTime.replace(":", "")}00`;
  const dtStart = toIcsDate(event.date);
  const dtEnd = toIcsDate(event.date).replace(event.startTime.replace(":", ""), event.endTime.replace(":", ""));

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MadrashaOS//Public Events//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@darulirfan.edu.bd`,
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

  // Sort by date ascending.
  const sorted = [...EVENTS].sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="mx-auto max-w-[var(--grid-max-width)] px-4 py-12 md:px-6 md:py-16">
      {/* Header */}
      <header className="mb-10 max-w-3xl">
        <Badge variant="outline" className="mb-3 border-primary-200 bg-primary-50 text-primary-700">
          <CalendarDays className="h-3.5 w-3.5" />
          Event Calendar
        </Badge>
        <h1 className="text-display font-bold text-text-primary">
          Upcoming Events
        </h1>
        <p className="mt-3 text-body text-text-secondary">
          Mark your calendar — parents and community members are warmly invited
          to attend all listed events. Click <em>Add to Calendar</em> to download
          a calendar file (works with Google Calendar, Outlook and Apple Calendar).
        </p>
      </header>

      {/* Event list — timeline style */}
      <ol className="relative space-y-6 border-s-2 border-border-default ps-6">
        {sorted.map((event) => {
          const Icon = event.icon;
          return (
            <li key={event.id} className="relative">
              {/* Timeline node */}
              <span
                aria-hidden
                className="absolute -start-[1.625rem] top-4 flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary-500 bg-surface-card text-primary-600 shadow-elevation-1"
              >
                <Icon className="h-3.5 w-3.5" />
              </span>

              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-subtitle">{event.name}</CardTitle>
                      <p className="mt-1 text-caption text-text-muted">
                        {formatDateLong(event.date, locale)} ·{" "}
                        {event.startTime} – {event.endTime}
                      </p>
                    </div>
                    <Badge variant="outline" className={CATEGORY_TONE[event.category]}>
                      {event.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-body text-text-secondary">
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

                  {/* Date string (machine-readable for crawlers) */}
                  <p className="sr-only">
                    {formatDate(event.date, locale)}
                  </p>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>

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
