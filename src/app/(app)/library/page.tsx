"use client";

/**
 * MadrashaOS — Library Circulation (C4.2 — Operations · Library)
 *
 * Library circulation per SRS §2.5.7 (Library).
 *
 * Now wired to the REAL API (was mock data before):
 *   - useLibraryBooks() → GET /api/v1/library/books
 *   - Issue Book → POST /api/v1/library/issue
 *   - Return Book → POST /api/v1/library/return (with optional fine → fee)
 *
 * Features:
 *   - Table: Code · Title · Author · Total · Available · Status (badge)
 *   - "Issue Book" dialog (perm: library.issue): select book + select student
 *     + due date + VALIDATION: if available=0 → blocked
 *   - "Return Book" dialog (perm: library.return): select issue + optional
 *     fine amount. When fine > 0, the API creates a FeeInstallment so the
 *     fine rides the student's fee stream.
 *   - "Add Book" dialog (perm: library.issue): create a new book
 */

import * as React from "react";
import {
  BookOpen, Plus, Search, ArrowUpRight, ArrowDownLeft, AlertTriangle,
  Save, XCircle, AlertCircle,
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
  PermissionDenied, LoadingState, ErrorState,
} from "@/components/states";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiStat } from "@/components/operations/KpiStat";
import { useSessionStore } from "@/stores/sessionStore";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useStudents, useLibraryBooks, queryClient } from "@/lib/query/client";
import { useToast } from "@/hooks/use-toast";

type Book = {
  id: string;
  accessionNo: string;
  title: string;
  titleBn?: string;
  author: string;
  category: string;
  totalCopies: number;
  availableCopies: number;
  isAvailable: boolean;
  shelfLocation?: string;
};

type Student = {
  id: string;
  code: string;
  name: string;
  nameBn?: string;
  className?: string;
};

type DialogMode = "issue" | "return" | "add" | null;

export default function LibraryPage() {
  const { locale } = useI18n();
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const canView = hasPermission("library.view");
  const { toast } = useToast();

  const { data: books, isLoading, isError, refetch } = useLibraryBooks();
  const { data: students } = useStudents();

  const bookList = (books ?? []) as Book[];
  const studentList = (students ?? []) as Student[];

  const [search, setSearch] = React.useState("");
  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);

  // Issue dialog state
  const [issueBookId, setIssueBookId] = React.useState("");
  const [issueStudentId, setIssueStudentId] = React.useState("");
  const [issueDueDate, setIssueDueDate] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14); // default 2-week loan
    return d.toISOString().slice(0, 10);
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Return dialog state
  const [returnIssueId, setReturnIssueId] = React.useState("");
  const [returnStudentId, setReturnStudentId] = React.useState("");
  const [fineAmount, setFineAmount] = React.useState<string>("0");

  // Add book dialog state
  const [addBook, setAddBook] = React.useState({
    accessionNo: "", title: "", author: "", category: "Islamic", totalCopies: 1,
  });

  if (!canView) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <PermissionDenied resource="Library" />
        </div>
      </div>
    );
  }

  const filtered = bookList.filter((b) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      b.title.toLowerCase().includes(q) ||
      b.accessionNo.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q)
    );
  });

  const totalCopies = bookList.reduce((s, b) => s + b.totalCopies, 0);
  const totalAvailable = bookList.reduce((s, b) => s + b.availableCopies, 0);
  const allIssuedCount = bookList.filter((b) => b.availableCopies === 0).length;

  const openIssue = (book?: Book) => {
    setIssueBookId(book?.id ?? "");
    setIssueStudentId("");
    setError(null);
    setDialogMode("issue");
  };
  const openReturn = () => {
    setReturnIssueId("");
    setReturnStudentId("");
    setFineAmount("0");
    setError(null);
    setDialogMode("return");
  };
  const openAdd = () => {
    setAddBook({ accessionNo: "", title: "", author: "", category: "Islamic", totalCopies: 1 });
    setError(null);
    setDialogMode("add");
  };

  const handleConfirmIssue = async () => {
    setError(null);
    if (!issueBookId || !issueStudentId || !issueDueDate) {
      setError("Book, student, and due date are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/library/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book_id: issueBookId,
          student_id: issueStudentId,
          due_date: issueDueDate,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || `Failed (HTTP ${res.status})`);
        setSubmitting(false);
        return;
      }
      toast({
        title: "Book issued",
        description: data?.message || "Book issued successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["library-books"] });
      setDialogMode(null);
    } catch {
      setError("Network error — please try again.");
    }
    setSubmitting(false);
  };

  const handleConfirmReturn = async () => {
    setError(null);
    if (!returnIssueId) {
      setError("Please select an issue record to return.");
      return;
    }
    const fine = Number(fineAmount) || 0;
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/library/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issue_id: returnIssueId,
          fine_amount: fine > 0 ? fine : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || `Failed (HTTP ${res.status})`);
        setSubmitting(false);
        return;
      }
      toast({
        title: "Book returned",
        description: data?.message || "Book returned successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["library-books"] });
      queryClient.invalidateQueries({ queryKey: ["fee-plans"] });
      setDialogMode(null);
    } catch {
      setError("Network error — please try again.");
    }
    setSubmitting(false);
  };

  const handleAddBook = async () => {
    setError(null);
    if (!addBook.accessionNo.trim() || !addBook.title.trim()) {
      setError("Accession number and title are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/library/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accession_no: addBook.accessionNo.trim(),
          title: addBook.title.trim(),
          author: addBook.author.trim() || undefined,
          category: addBook.category || undefined,
          total_copies: addBook.totalCopies,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || `Failed (HTTP ${res.status})`);
        setSubmitting(false);
        return;
      }
      toast({ title: "Book added", description: `${addBook.title} (${addBook.totalCopies} copies)` });
      queryClient.invalidateQueries({ queryKey: ["library-books"] });
      setDialogMode(null);
    } catch {
      setError("Network error — please try again.");
    }
    setSubmitting(false);
  };

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-display font-bold text-text-primary">Library Circulation</h1>
            <p className="mt-1 text-body text-text-secondary">
              Issue / return books. Fines are automatically added to student fees.
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
              <Button variant="outline" onClick={openReturn}>
                <ArrowDownLeft className="h-4 w-4" />
                Return Book
              </Button>
            </IfPermission>
            <IfPermission code="library.issue">
              <Button onClick={openAdd}>
                <Plus className="h-4 w-4" />
                Add Book
              </Button>
            </IfPermission>
          </div>
        </header>

        {/* KPI strip */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiStat label="Total Titles" value={String(bookList.length)} icon={BookOpen} tone="primary" />
          <KpiStat label="Total Copies" value={String(totalCopies)} icon={Plus} tone="default" />
          <KpiStat label="Available" value={String(totalAvailable)} icon={BookOpen} tone="success" />
          <KpiStat label="All Issued" value={String(allIssuedCount)} hint="no copies available" icon={AlertTriangle} tone={allIssuedCount > 0 ? "warning" : "success"} />
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
        {isLoading && <LoadingState pattern="table" rows={5} />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {!isLoading && !isError && filtered.length === 0 && (
          <EmptyState
            illustration="inventory"
            title="No books found"
            description={search ? `No matches for "${search}".` : "Add your first book to get started."}
            action={
              !search ? (
                <IfPermission code="library.issue">
                  <Button onClick={openAdd}>
                    <Plus className="h-4 w-4" />
                    Add Book
                  </Button>
                </IfPermission>
              ) : undefined
            }
          />
        )}
        {!isLoading && !isError && filtered.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border-default bg-surface-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-neutral-50">
                  <TableHead className="px-4">Code</TableHead>
                  <TableHead className="px-4">Title</TableHead>
                  <TableHead className="px-4">Author</TableHead>
                  <TableHead className="px-4 text-end">Total</TableHead>
                  <TableHead className="px-4 text-end">Available</TableHead>
                  <TableHead className="px-4">Status</TableHead>
                  <TableHead className="px-4 text-end">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((b) => {
                  const allIssued = b.availableCopies === 0;
                  return (
                    <TableRow key={b.id} className={allIssued ? "bg-danger-50/30" : ""}>
                      <TableCell className="px-4 py-3 font-mono text-caption text-text-secondary">
                        {b.accessionNo}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="text-body font-medium text-text-primary">{b.title}</div>
                        {b.titleBn && (
                          <div className="text-caption text-text-muted" lang="bn">{b.titleBn}</div>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-body text-text-secondary">
                        {b.author || "—"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-end font-mono text-body text-text-secondary">
                        {b.totalCopies}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-end font-mono text-body">
                        <span className={b.availableCopies > 0 ? "text-semantic-success" : "text-semantic-danger"}>
                          {b.availableCopies}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {b.availableCopies > 0 ? (
                          <Badge variant="outline" className="bg-success-50 text-semantic-success">Available</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-danger-50 text-semantic-danger">All Issued</Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-end">
                        <IfPermission code="library.issue">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={b.availableCopies === 0}
                            onClick={() => openIssue(b)}
                            aria-label={`Issue ${b.title}`}
                          >
                            <ArrowUpRight className="h-4 w-4" />
                            Issue
                          </Button>
                        </IfPermission>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ---------- Issue Dialog ---------- */}
      <Dialog open={dialogMode === "issue"} onOpenChange={(o) => !o && setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-primary-500" />
              Issue Book
            </DialogTitle>
            <DialogDescription>
              Select a book and a student to issue. The due date defaults to 2 weeks from today.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="issue-book">Book *</Label>
              <Select value={issueBookId} onValueChange={setIssueBookId}>
                <SelectTrigger id="issue-book" className="w-full">
                  <SelectValue placeholder="Select book" />
                </SelectTrigger>
                <SelectContent>
                  {bookList.filter((b) => b.availableCopies > 0).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.title} ({b.accessionNo}) · {b.availableCopies} avail
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="issue-student">Student *</Label>
              <Select value={issueStudentId} onValueChange={setIssueStudentId}>
                <SelectTrigger id="issue-student" className="w-full">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {studentList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code}){s.className ? ` · ${s.className}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="issue-due">Due Date *</Label>
              <Input
                id="issue-due"
                type="date"
                value={issueDueDate}
                onChange={(e) => setIssueDueDate(e.target.value)}
              />
            </div>
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-md border border-semantic-danger/40 bg-danger-50 px-3 py-2 text-caption text-semantic-danger">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>
              <XCircle className="h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleConfirmIssue} disabled={submitting}>
              <Save className="h-4 w-4" />
              {submitting ? "Issuing…" : "Issue Book"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Return Dialog ---------- */}
      <Dialog open={dialogMode === "return"} onOpenChange={(o) => !o && setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownLeft className="h-5 w-5 text-primary-500" />
              Return Book
            </DialogTitle>
            <DialogDescription>
              Enter the issue ID (from the issue receipt). If a fine applies,
              it will be added to the student&apos;s fees automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="return-issue">Issue ID *</Label>
              <Input
                id="return-issue"
                placeholder="Paste the issue_id from the issue receipt"
                value={returnIssueId}
                onChange={(e) => setReturnIssueId(e.target.value)}
                className="font-mono"
              />
              <p className="text-caption text-text-muted">
                Find the issue_id in the toast/receipt shown when the book was issued.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="return-fine">Fine Amount (BDT)</Label>
              <Input
                id="return-fine"
                type="number"
                min={0}
                placeholder="0"
                value={fineAmount}
                onChange={(e) => setFineAmount(e.target.value)}
              />
              {Number(fineAmount) > 0 && (
                <p className="text-caption text-primary-700">
                  Fine of ৳{Number(fineAmount).toLocaleString()} will be added to
                  the student&apos;s outstanding fees (appears on /fees).
                </p>
              )}
            </div>
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-md border border-semantic-danger/40 bg-danger-50 px-3 py-2 text-caption text-semantic-danger">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>
              <XCircle className="h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleConfirmReturn} disabled={submitting}>
              <Save className="h-4 w-4" />
              {submitting ? "Returning…" : "Return Book"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Add Book Dialog ---------- */}
      <Dialog open={dialogMode === "add"} onOpenChange={(o) => !o && setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary-500" />
              Add Book
            </DialogTitle>
            <DialogDescription>
              Add a new book to the library catalog.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="add-accession">Accession No. *</Label>
              <Input
                id="add-accession"
                placeholder="BK-001"
                value={addBook.accessionNo}
                onChange={(e) => setAddBook({ ...addBook, accessionNo: e.target.value })}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-title">Title *</Label>
              <Input
                id="add-title"
                placeholder="Tafsir Ibn Kathir"
                value={addBook.title}
                onChange={(e) => setAddBook({ ...addBook, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="add-author">Author</Label>
                <Input
                  id="add-author"
                  placeholder="Ibn Kathir"
                  value={addBook.author}
                  onChange={(e) => setAddBook({ ...addBook, author: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-copies">Total Copies</Label>
                <Input
                  id="add-copies"
                  type="number"
                  min={1}
                  value={addBook.totalCopies}
                  onChange={(e) => setAddBook({ ...addBook, totalCopies: Number(e.target.value) || 1 })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-category">Category</Label>
              <Input
                id="add-category"
                placeholder="Islamic"
                value={addBook.category}
                onChange={(e) => setAddBook({ ...addBook, category: e.target.value })}
              />
            </div>
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-md border border-semantic-danger/40 bg-danger-50 px-3 py-2 text-caption text-semantic-danger">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>
              <XCircle className="h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleAddBook} disabled={submitting}>
              <Save className="h-4 w-4" />
              {submitting ? "Adding…" : "Add Book"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
