"use client";

/**
 * MadrashaOS — Notice Composer (C4.3 — Communication · Notices · Risk R11)
 *
 * Compose-notice dialog with:
 *   - Title input (en + bn)
 *   - Body textarea (en + bn)
 *   - Audience selector: All / Guardians / Staff / Specific Class
 *   - If "Specific Class" selected: show a class dropdown (useClasses)
 *
 * Risk R11 lock-in: a live recipient-count chip updates as the audience is
 * selected. Selecting "Class 5 guardians" → chip shows "12 recipients" (mock:
 * count of guardians linked to students in the selected class).
 *
 * "Preview Recipients" button → opens a Drawer listing the actual recipients
 * (mock: filter students by class, show guardian names).
 *
 * "Send Notice" button (gated by IfPermission code="notices.send") — on send:
 * show success toast "Notice sent to X recipients".
 *
 * The dialog itself is gated by IfPermission code="notices.compose" at the
 * page level — this component does not re-check that gate.
 */

import * as React from "react";
import {
  Bell, Send, Users, Eye, AlertTriangle, CheckCircle2,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { IfPermission } from "@/components/auth/IfPermission";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useClasses, useStudents, useGuardians } from "@/lib/query/client";

type Audience = "all" | "guardians" | "staff" | "class";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NoticeComposer({ open, onOpenChange }: Props) {
  const { locale } = useI18n();
  const { toast } = useToast();
  const { data: classes } = useClasses();
  const { data: students } = useStudents();
  const { data: guardians } = useGuardians();

  const [titleEn, setTitleEn] = React.useState("");
  const [titleBn, setTitleBn] = React.useState("");
  const [bodyEn, setBodyEn] = React.useState("");
  const [bodyBn, setBodyBn] = React.useState("");
  const [audience, setAudience] = React.useState<Audience>("all");
  const [classId, setClassId] = React.useState<string | undefined>();
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [sending, setSending] = React.useState(false);

  // Reset state whenever the dialog opens fresh.
  React.useEffect(() => {
    if (open) {
      setTitleEn("");
      setTitleBn("");
      setBodyEn("");
      setBodyBn("");
      setAudience("all");
      setClassId(undefined);
      setSending(false);
      setPreviewOpen(false);
    }
  }, [open]);

  // Risk R11 — live recipient count based on audience selection.
  const recipientCount = React.useMemo(() => {
    if (!students) return 0;
    if (audience === "all" || audience === "guardians") {
      // "All guardians" = unique guardians linked to all students.
      const guardianIds = new Set(students.map((s) => s.guardianId));
      return guardianIds.size;
    }
    if (audience === "staff") {
      // Staff is a fixed set (8 personas).
      return 8;
    }
    if (audience === "class" && classId) {
      // Unique guardians linked to students in the selected class.
      const guardianIds = new Set(
        students.filter((s) => s.classId === classId).map((s) => s.guardianId),
      );
      return guardianIds.size;
    }
    return 0;
  }, [audience, classId, students]);

  // Preview recipients list (mock: filter students by class, show guardian names).
  const previewRecipients = React.useMemo(() => {
    if (!students || !guardians) return [];
    if (audience === "all" || audience === "guardians") {
      return guardians.map((g) => ({
        guardianId: g.id,
        guardianName: g.name,
        guardianNameBn: g.nameBn,
        childName: students.find((s) => s.guardianId === g.id)?.name ?? "",
        childClass:
          students.find((s) => s.guardianId === g.id)?.classId.replace("cls-", "Class ") ?? "",
      }));
    }
    if (audience === "staff") {
      // Mock: 8 staff personas (no User list is queried here — show placeholder rows).
      return Array.from({ length: 8 }).map((_, i) => ({
        guardianId: `staff-${i}`,
        guardianName: `Staff Member ${i + 1}`,
        guardianNameBn: "",
        childName: "",
        childClass: "",
      }));
    }
    if (audience === "class" && classId) {
      const filtered = students.filter((s) => s.classId === classId);
      return filtered.map((s) => {
        const g = guardians.find((gg) => gg.id === s.guardianId);
        return {
          guardianId: s.guardianId,
          guardianName: g?.name ?? s.guardianId,
          guardianNameBn: g?.nameBn ?? "",
          childName: s.name,
          childClass: `${s.classId.replace("cls-", "Class ")} · Sec ${s.section}`,
        };
      });
    }
    return [];
  }, [audience, classId, students, guardians]);

  const canSend = titleEn.trim().length > 0 && bodyEn.trim().length > 0 && recipientCount > 0;

  const handleSend = () => {
    if (!canSend) return;
    setSending(true);
    // Mock async send.
    setTimeout(() => {
      setSending(false);
      onOpenChange(false);
      toast({
        title: "Notice sent",
        description: `Sent to ${recipientCount} recipient${recipientCount === 1 ? "" : "s"}.`,
      });
    }, 400);
  };

  const audienceLabel = audience === "class" && classId
    ? classes?.find((c) => c.id === classId)?.name ?? "Class"
    : audience === "all"
      ? "All"
      : audience === "guardians"
        ? "Guardians"
        : "Staff";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-subtitle">
              <Bell className="h-5 w-5 text-primary-500" aria-hidden="true" />
              Compose Notice
            </DialogTitle>
            <DialogDescription>
              Compose a notice and broadcast it to the selected audience.
              Recipient count updates live as you choose the audience (Risk R11).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title (English) */}
            <div>
              <Label htmlFor="notice-title-en" className="mb-1.5 block text-subtitle">
                Title <span className="text-semantic-danger">*</span>
                <span className="ms-2 text-caption font-normal text-text-muted">(English)</span>
              </Label>
              <Input
                id="notice-title-en"
                placeholder="e.g. Holiday — Eid Milad"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                aria-required="true"
              />
            </div>

            {/* Title (Bangla) */}
            <div>
              <Label htmlFor="notice-title-bn" className="mb-1.5 block text-subtitle">
                Title
                <span className="ms-2 text-caption font-normal text-text-muted">(Bangla, optional)</span>
              </Label>
              <Input
                id="notice-title-bn"
                placeholder="যেমন: ছুটি — ঈদে মিলাদ"
                value={titleBn}
                onChange={(e) => setTitleBn(e.target.value)}
                lang="bn"
                className="font-bn"
              />
            </div>

            {/* Body (English) */}
            <div>
              <Label htmlFor="notice-body-en" className="mb-1.5 block text-subtitle">
                Body <span className="text-semantic-danger">*</span>
                <span className="ms-2 text-caption font-normal text-text-muted">(English)</span>
              </Label>
              <Textarea
                id="notice-body-en"
                placeholder="Notice body…"
                value={bodyEn}
                onChange={(e) => setBodyEn(e.target.value)}
                rows={3}
                aria-required="true"
              />
            </div>

            {/* Body (Bangla) */}
            <div>
              <Label htmlFor="notice-body-bn" className="mb-1.5 block text-subtitle">
                Body
                <span className="ms-2 text-caption font-normal text-text-muted">(Bangla, optional)</span>
              </Label>
              <Textarea
                id="notice-body-bn"
                placeholder="নোটিশ বিস্তারিত…"
                value={bodyBn}
                onChange={(e) => setBodyBn(e.target.value)}
                rows={2}
                lang="bn"
                className="font-bn"
              />
            </div>

            {/* Audience selector */}
            <div>
              <Label htmlFor="audience-select" className="mb-1.5 block text-subtitle">
                Audience
              </Label>
              <Select
                value={audience}
                onValueChange={(v) => {
                  setAudience(v as Audience);
                  setClassId(undefined);
                }}
              >
                <SelectTrigger id="audience-select" className="w-full">
                  <SelectValue placeholder="Choose audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All (everyone)</SelectItem>
                  <SelectItem value="guardians">Guardians (all classes)</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="class">Specific Class</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Class selector — shown only when audience === "class" */}
            {audience === "class" && (
              <div>
                <Label htmlFor="class-select" className="mb-1.5 block text-subtitle">
                  Class
                </Label>
                <Select
                  value={classId ?? ""}
                  onValueChange={(v) => setClassId(v)}
                >
                  <SelectTrigger id="class-select" className="w-full">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} · {c.sections.join("/")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!classId && (
                  <p className="mt-1 text-caption text-semantic-warning" role="alert">
                    <AlertTriangle className="me-1 inline h-3 w-3" />
                    Select a class to compute the recipient count.
                  </p>
                )}
              </div>
            )}

            {/* Risk R11 — live recipient-count chip + preview button */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-default bg-surface-hover p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone="primary">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  {recipientCount} recipient{recipientCount === 1 ? "" : "s"}
                </Chip>
                <span className="text-caption text-text-secondary">
                  Audience: <span className="font-medium text-text-primary">{audienceLabel}</span>
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewOpen(true)}
                disabled={recipientCount === 0}
              >
                <Eye className="h-4 w-4" />
                Preview Recipients
              </Button>
            </div>

            {/* Validation hint */}
            {!canSend && (
              <p className="text-caption text-semantic-warning" role="alert">
                <AlertTriangle className="me-1 inline h-3 w-3" />
                Title and body are required, and the audience must have at least one recipient.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
              Cancel
            </Button>
            <IfPermission
              code="notices.send"
              fallback={
                <Badge variant="outline" className="border-border-strong text-text-secondary">
                  No permission to send
                </Badge>
              }
            >
              <Button type="button" onClick={handleSend} disabled={!canSend || sending}>
                {sending ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Notice
                  </>
                )}
              </Button>
            </IfPermission>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recipients preview Drawer */}
      <Drawer open={previewOpen} onOpenChange={setPreviewOpen}>
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2 text-subtitle">
              <Users className="h-4 w-4 text-primary-500" aria-hidden="true" />
              Recipients Preview
            </DrawerTitle>
            <DrawerDescription>
              {recipientCount} recipient{recipientCount === 1 ? "" : "s"} · audience: {audienceLabel}
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {previewRecipients.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border-default p-6 text-center text-body text-text-secondary">
                No recipients match this audience.
              </div>
            ) : (
              <ul className="space-y-2">
                {previewRecipients.map((r) => (
                  <li
                    key={r.guardianId}
                    className="flex items-start justify-between gap-3 rounded-md border border-border-default bg-surface-card p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-body font-medium text-text-primary">
                        {r.guardianName}
                      </p>
                      {r.guardianNameBn && (
                        <p className="truncate font-bn text-caption text-text-secondary" lang="bn">
                          {r.guardianNameBn}
                        </p>
                      )}
                      {r.childName && (
                        <p className="mt-0.5 text-caption text-text-muted">
                          {r.childClass ? `${r.childClass} · ` : ""}Ward: {r.childName}
                        </p>
                      )}
                    </div>
                    {r.childClass && (
                      <Badge variant="outline" className="shrink-0">
                        {r.childClass}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DrawerFooter>
            <div className="flex items-center justify-between gap-2">
              <p className="text-caption text-text-secondary">
                <CheckCircle2 className="me-1 inline h-3 w-3 text-semantic-success" aria-hidden="true" />
                Counts are computed live (Risk R11) — no real messages sent.
              </p>
              <Button variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>
                Close
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
