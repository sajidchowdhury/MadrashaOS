"use client";

/**
 * MadrashaOS — Public Notices Page (Session 8.5 — wired to real API)
 *
 * Fetches notices from GET /api/v1/public/notices (no auth required).
 * Only notices with status="sent" and audience="public" are returned.
 *
 * Features: search, category filter, pagination, read-more dialog.
 */

import * as React from "react";
import Link from "next/link";
import {
  Megaphone, Search, X, AlertCircle,
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

type Notice = {
  id: string;
  title: string;
  titleBn?: string | null;
  body: string;
  bodyBn?: string | null;
  category: string;
  audience: string;
  date: string;
  isPinned?: boolean;
};

const PAGE_SIZE = 5;

export default function PublicNoticesPage() {
  const { locale } = useI18n();
  const [notices, setNotices] = React.useState<Notice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [openNotice, setOpenNotice] = React.useState<Notice | null>(null);
  const [page, setPage] = React.useState(1);

  // Fetch real notices from the public API
  React.useEffect(() => {
    fetch("/api/v1/public/notices?pageSize=50")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.data) {
          setNotices(data.data);
        }
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  // Client-side filter (search)
  const filtered = React.useMemo(() => {
    if (!search.trim()) return notices;
    const q = search.toLowerCase();
    return notices.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q),
    );
  }, [notices, search]);

  React.useEffect(() => {
    setPage(1);
  }, [search]);

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

      {/* Search */}
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border-default bg-surface-card" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <AlertCircle className="h-10 w-10 text-semantic-danger" />
            <p className="text-subtitle font-medium text-text-secondary">
              Failed to load notices. Please try again later.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !error && paged.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <Megaphone className="h-10 w-10 text-text-muted" />
            <p className="text-subtitle font-medium text-text-secondary">
              {search ? "No notices match your search." : "No public notices at this time."}
            </p>
            {search && (
              <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                Clear search
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notice list */}
      {!loading && !error && paged.length > 0 && (
        <div className="grid gap-3">
          {paged.map((notice) => (
            <Card
              key={notice.id}
              className="group transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-500 hover:shadow-elevation-2"
            >
              <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-start">
                {/* Date badge */}
                <div className="flex shrink-0 items-center gap-3 md:w-28 md:flex-col md:items-start">
                  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg border border-primary-200 bg-primary-50 text-primary-700">
                    {notice.date && (
                      <>
                        <span className="text-headline font-bold leading-none">
                          {new Date(notice.date).getDate()}
                        </span>
                        <span className="text-caption uppercase">
                          {new Date(notice.date).toLocaleDateString("en-US", { month: "short" })}
                        </span>
                      </>
                    )}
                  </div>
                  {notice.date && (
                    <div className="md:mt-1">
                      <p className="text-caption font-medium text-text-secondary">
                        {formatDate(new Date(notice.date), locale)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Notice body */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {notice.category && (
                      <Badge variant="outline" className="border-border-default bg-surface-hover text-text-secondary">
                        <FileText className="h-3 w-3" />
                        {notice.category}
                      </Badge>
                    )}
                    {notice.isPinned && (
                      <Badge variant="outline" className="border-accent-200 bg-accent-50 text-accent-700">
                        📌 Pinned
                      </Badge>
                    )}
                  </div>
                  <h2 className="mt-2 text-subtitle font-semibold text-text-primary">
                    {notice.title}
                  </h2>
                  <p className="mt-1.5 line-clamp-3 text-body text-text-secondary">
                    {notice.body?.slice(0, 200)}
                    {notice.body && notice.body.length > 200 ? "…" : ""}
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
          ))}
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
            <DialogTitle className="text-subtitle">
              {openNotice?.title}
            </DialogTitle>
            <DialogDescription className="text-caption text-text-muted">
              {openNotice?.date && formatDateLong(new Date(openNotice.date), locale)}
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
