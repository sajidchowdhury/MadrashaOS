"use client";

/**
 * MadrashaOS — Library Circulation (C4.2 — Operations · Library)
 *
 * Library circulation per SRS §2.5.7 (Library).
 *
 *   - 8 mock books (title, author, copies, available)
 *   - Table: Title · Author · Total Copies · Available · Status (badge)
 *   - "Issue Book" dialog (perm: library.issue): select book + select student
 *     + VALIDATION: if available=0 → "Copy already issued — cannot issue"
 *   - "Return Book" dialog (perm: library.return)
 *   - Quick-scan mode: a search bar that lets you type a book code and
 *     instantly issue / return
 *   - Badge for status (Available=success, All Issued=danger)
 */

import * as React from "react";
import {
  BookOpen, Plus, Search, ArrowUpRight, ArrowDownLeft, ScanLine, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { IfPermission } from "@/components/auth/IfPermission";
import {
  PermissionDenied,
} from "@/components/states";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiStat } from "@/components/operations/KpiStat";
import { useSessionStore } from "@/stores/sessionStore";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatDate } from "@/lib/i18n/format";
import { useStudents } from "@/lib/query/client";
import { useToast } from "@/hooks/use-toast";

/* --- Inline mock books --- */

type Book = {
  id: string;
  code: string;
  title: string;
  titleBn: string;
  author: string;
  totalCopies: number;
  available: number;
  issuedTo?: { studentId: string; studentName: string; issuedOn: string }[];
};

const INITIAL_BOOKS: Book[] = [
  { id: "bk-1", code: "BK-001", title: "Tafsir Ibn Kathir (Vol 1)", titleBn: "তাফসীর ইবনে কাসীর", author: "Ibn Kathir", totalCopies: 3, available: 2 },
  { id: "bk-2", code: "BK-002", title: "Sahih al-Bukhari", titleBn: "সহীহ বুখারী", author: "Imam Bukhari", totalCopies: 2, available: 0 },
  { id: "bk-3", code: "BK-003", title: "Sahih Muslim", titleBn: "সহীহ মুসলিম", author: "Imam Muslim", totalCopies: 2, available: 1 },
  { id: "bk-4", code: "BK-004", title: "Fiqh us-Sunnah", titleBn: "ফিকহুস সুন্নাহ", author: "Sayyid Sabiq", totalCopies: 4, available: 3 },
  { id: "bk-5", code: "BK-005", title: "Arabic Grammar — Nahw", titleBn: "আরবি ব্যাকরণ — নহু", author: "Dr. V. Abdur Rahim", totalCopies: 5, available: 5 },
  { id: "bk-6", code: "BK-006", title: "Stories of the Prophets", titleBn: "কাসাসুল আম্বিয়া", author: "Ibn Kathir", totalCopies: 3, available: 1 },
  { id: "bk-7", code: "BK-007", title: "Seerah — The Prophet's Life", titleBn: "সীরাতে নববী", author: "Ibn Hisham", totalCopies: 2, available: 0 },
  { id: "bk-8", code: "BK-008", title: "Bangla Grammar (Class 5-8)", titleBn: "বাংলা ব্যাকরণ", author: "Dr. Muhammed Shahidullah", totalCopies: 10, available: 7 },
];

type DialogMode = "issue" | "return" | null;

export default function LibraryPage() {
  const { locale } = useI18n();
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const canView = hasPermission("library.view");
  const { data: students } = useStudents();
  const { toast } = useToast();

  const [books, setBooks] = React.useState<Book[]>(INITIAL_BOOKS);
  const [search, setSearch] = React.useState("");
  const [scanInput, setScanInput] = React.useState("");
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [dialogBookId, setDialogBookId] = React.useState<string>("");
  const [dialogStudentId, setDialogStudentId] = React.useState<string>("");

  if (!canView) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <PermissionDenied resource="Library" />
        </div>
      </div>
    );
  }

  const filtered = books.filter((b) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return b.title.toLowerCase().includes(q) || b.code.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
  });

  const totalCopies = books.reduce((s, b) => s + b.totalCopies, 0);
  const totalAvailable = books.reduce((s, b) => s + b.available, 0);
  const totalIssued = totalCopies - totalAvailable;
  const allIssuedCount = books.filter((b) => b.available === 0).length;

  const selectedBook = books.find((b) => b.id === dialogBookId);

  const issueExceedsAvailable = dialogMode === "issue" && selectedBook && selectedBook.available === 0;

  const openIssue = (book?: Book) => {
    setDialogBookId(book?.id ?? "");
    setDialogStudentId("");
    setDialogMode("issue");
  };
  const openReturn = (book?: Book) => {
    setDialogBookId(book?.id ?? "");
    setDialogStudentId("");
    setDialogMode("return");
  };

  const handleConfirmIssue = () => {
    if (!selectedBook || selectedBook.available === 0) return;
    const student = students?.find((s) => s.id === dialogStudentId);
    if (!student) return;
    setBooks((prev) => prev.map((b) => {
      if (b.id !== selectedBook.id) return b;
      return {
        ...b,
        available: b.available - 1,
        issuedTo: [...(b.issuedTo ?? []), {
          studentId: student.id,
          studentName: student.name,
          issuedOn: new Date().toISOString().slice(0, 10),
        }],
      };
    }));
    toast({
      title: "Book issued",
      description: `${selectedBook.title} → ${student.name} (${student.code}).`,
    });
    setDialogMode(null);
    setDialogBookId("");
    setDialogStudentId("");
  };

  const handleConfirmReturn = () => {
    if (!selectedBook) return;
    const student = students?.find((s) => s.id === dialogStudentId);
    if (!student) return;
    const wasIssued = (selectedBook.issuedTo ?? []).some((i) => i.studentId === student.id);
    if (!wasIssued) {
      toast({
        title: "No active issue found",
        description: `${student.name} does not currently hold this book.`,
        variant: "destructive",
      });
      return;
    }
    setBooks((prev) => prev.map((b) => {
      if (b.id !== selectedBook.id) return b;
      return {
        ...b,
        available: Math.min(b.totalCopies, b.available + 1),
        issuedTo: (b.issuedTo ?? []).filter((i) => i.studentId !== student.id),
      };
    }));
    toast({
      title: "Book returned",
      description: `${selectedBook.title} ← ${student.name}.`,
    });
    setDialogMode(null);
    setDialogBookId("");
    setDialogStudentId("");
  };

  const handleQuickScan = () => {
    const code = scanInput.trim().toUpperCase();
    if (!code) return;
    const book = books.find((b) => b.code.toUpperCase() === code);
    if (!book) {
      toast({
        title: "Unknown book code",
        description: `No book matches "${scanInput}". Try one of: BK-001 to BK-008.`,
        variant: "destructive",
      });
      setScanInput("");
      return;
    }
    if (book.available > 0 && hasPermission("library.issue")) {
      setBooks((prev) => prev.map((b) => b.id === book.id ? {
        ...b,
        available: b.available - 1,
        issuedTo: [...(b.issuedTo ?? []), {
          studentId: "stu-001",
          studentName: "Walk-in Student",
          issuedOn: new Date().toISOString().slice(0, 10),
        }],
      } : b));
      toast({ title: "Book issued (quick-scan)", description: `${book.title} — issued to walk-in student.` });
    } else if (book.available === 0 && hasPermission("library.return")) {
      setBooks((prev) => prev.map((b) => b.id === book.id ? {
        ...b,
        available: Math.min(b.totalCopies, b.available + 1),
        issuedTo: (b.issuedTo ?? []).slice(0, -1),
      } : b));
      toast({ title: "Book returned (quick-scan)", description: `${book.title} returned.` });
    } else if (!hasPermission("library.issue") && !hasPermission("library.return")) {
      toast({ title: "Insufficient permission", description: "You need library.issue or library.return to use quick-scan.", variant: "destructive" });
    } else {
      toast({ title: "Cannot process", description: "Book state unchanged.", variant: "destructive" });
    }
    setScanInput("");
  };

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-display font-bold text-text-primary">Library Circulation</h1>
            <p className="mt-1 text-body text-text-secondary">
              Issue / return books with quick-scan mode per SRS §2.5.7.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <IfPermission code="library.issue">
              <Button variant="outline" onClick={() => openIssue(undefined)}>
                <ArrowUpRight className="h-4 w-4" />
                Issue Book
              </Button>
            </IfPermission>
            <IfPermission code="library.return">
              <Button variant="outline" onClick={() => openReturn(undefined)}>
                <ArrowDownLeft className="h-4 w-4" />
                Return Book
              </Button>
            </IfPermission>
          </div>
        </header>

        {/* KPI strip */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiStat label="Total Titles" value={String(books.length)} icon={BookOpen} tone="primary" />
          <KpiStat label="Total Copies" value={String(totalCopies)} icon={Plus} tone="default" />
          <KpiStat label="Available" value={String(totalAvailable)} icon={BookOpen} tone="success" />
          <KpiStat label="All Issued" value={String(allIssuedCount)} hint="no copies available" icon={AlertTriangle} tone={allIssuedCount > 0 ? "warning" : "success"} />
        </div>

        {/* Quick-scan */}
        <div className="rounded-lg border-2 border-dashed border-primary-500/40 bg-primary-50/30 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-subtitle font-semibold text-primary-700">
              <ScanLine className="h-5 w-5" />
              Quick Scan
            </div>
            <div className="relative min-w-56 flex-1">
              <Input
                placeholder="Type book code (e.g. BK-002) and press Enter…"
                className="font-mono"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleQuickScan(); }}
                aria-label="Quick scan book code"
              />
            </div>
            <Button onClick={handleQuickScan} variant="outline">
              <ScanLine className="h-4 w-4" />
              Issue / Return
            </Button>
          </div>
          <p className="mt-2 text-caption text-text-muted">
            Toggle behaviour: available book → issue to walk-in student · no copies left → return last issued.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            placeholder="Search by title, author, or code…"
            className="ps-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search books"
          />
        </div>

        {/* Body */}
        {filtered.length === 0 && (
          <EmptyState
            illustration="inventory"
            title="No books found"
            description={search ? `No matches for "${search}".` : "Add your first book to get started."}
          />
        )}
        {filtered.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border-default bg-surface-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50">
                  <TableHead className="px-4">Code</TableHead>
                  <TableHead className="px-4">Title</TableHead>
                  <TableHead className="px-4">Author</TableHead>
                  <TableHead className="px-4 text-end">Total Copies</TableHead>
                  <TableHead className="px-4 text-end">Available</TableHead>
                  <TableHead className="px-4">Status</TableHead>
                  <TableHead className="px-4 text-end">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((b) => {
                  const allIssued = b.available === 0;
                  return (
                    <TableRow key={b.id} className={allIssued ? "bg-danger-50/30" : ""}>
                      <TableCell className="px-4 py-3 font-mono text-caption text-text-secondary">
                        {b.code}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <p className="text-body font-medium text-text-primary">{b.title}</p>
                        <p className="text-caption text-text-muted" lang="bn">{b.titleBn}</p>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-body text-text-secondary">{b.author}</TableCell>
                      <TableCell className="px-4 py-3 text-end font-mono text-body text-text-primary">{b.totalCopies}</TableCell>
                      <TableCell className="px-4 py-3 text-end font-mono text-body">
                        <span className={b.available === 0 ? "text-semantic-danger font-semibold" : "text-text-primary"}>
                          {b.available}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {b.available === 0 ? (
                          <Badge variant="outline" className="border-semantic-danger/40 bg-danger-50 text-semantic-danger">
                            All Issued
                          </Badge>
                        ) : b.available === b.totalCopies ? (
                          <Badge variant="outline" className="border-semantic-success/40 bg-success-50 text-semantic-success">
                            Available
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-border-default bg-surface-card text-text-secondary">
                            {b.available} of {b.totalCopies} free
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <IfPermission code="library.issue" fallback={<span className="text-caption text-text-muted">View</span>}>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openIssue(b)}
                              disabled={b.available === 0}
                              aria-label={`Issue ${b.title}`}
                            >
                              <ArrowUpRight className="h-4 w-4 text-primary-500" />
                            </Button>
                          </IfPermission>
                          <IfPermission code="library.return" fallback={<span className="text-caption text-text-muted">View</span>}>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openReturn(b)}
                              disabled={b.available === b.totalCopies}
                              aria-label={`Return ${b.title}`}
                            >
                              <ArrowDownLeft className="h-4 w-4 text-semantic-success" />
                            </Button>
                          </IfPermission>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Active issues list */}
        {books.some((b) => (b.issuedTo ?? []).length > 0) && (
          <section className="rounded-lg border border-border-default bg-surface-card p-4">
            <h3 className="mb-3 text-subtitle font-semibold text-text-primary">Currently Issued</h3>
            <ul className="space-y-2">
              {books.flatMap((b) => (b.issuedTo ?? []).map((issue, idx) => (
                <li key={`${b.id}-${idx}`} className="flex items-center justify-between rounded-md border border-border-default p-2">
                  <div>
                    <p className="text-body font-medium text-text-primary">{b.title}</p>
                    <p className="text-caption text-text-muted font-mono">{b.code}</p>
                  </div>
                  <div className="text-end">
                    <p className="text-body text-text-primary">{issue.studentName}</p>
                    <p className="text-caption text-text-muted">{formatDate(new Date(issue.issuedOn), locale)}</p>
                  </div>
                </li>
              )))}
            </ul>
          </section>
        )}
      </div>

      {/* Issue / Return dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={(o) => !o && setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-subtitle">
              {dialogMode === "issue" ? (
                <ArrowUpRight className="h-5 w-5 text-primary-500" />
              ) : (
                <ArrowDownLeft className="h-5 w-5 text-semantic-success" />
              )}
              {dialogMode === "issue" ? "Issue Book" : "Return Book"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "issue"
                ? "Lend a copy to a student. Validation rejects if no copies are available."
                : "Mark a book returned to circulation."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="lib-book" className="mb-1.5 block text-subtitle">Book</Label>
              <Select value={dialogBookId} onValueChange={setDialogBookId}>
                <SelectTrigger id="lib-book" className="w-full" aria-label="Select book">
                  <SelectValue placeholder="Select book…" />
                </SelectTrigger>
                <SelectContent>
                  {books.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.title} · {b.code} ({b.available}/{b.totalCopies} available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="lib-stu" className="mb-1.5 block text-subtitle">Student</Label>
              <Select value={dialogStudentId} onValueChange={setDialogStudentId}>
                <SelectTrigger id="lib-stu" className="w-full" aria-label="Select student">
                  <SelectValue placeholder="Select student…" />
                </SelectTrigger>
                <SelectContent>
                  {(students ?? []).slice(0, 40).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} · {s.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {dialogMode === "issue" && issueExceedsAvailable && (
              <p className="rounded-md bg-danger-50 p-2 text-caption text-semantic-danger" role="alert">
                Copy already issued — cannot issue. No copies available.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Cancel</Button>
            {dialogMode === "issue" ? (
              <Button
                onClick={handleConfirmIssue}
                disabled={!dialogBookId || !dialogStudentId || issueExceedsAvailable}
              >
                Issue Book
              </Button>
            ) : (
              <Button
                onClick={handleConfirmReturn}
                disabled={!dialogBookId || !dialogStudentId}
              >
                Return Book
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
