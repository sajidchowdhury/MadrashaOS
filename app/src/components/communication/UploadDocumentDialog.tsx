"use client";

/**
 * MadrashaOS — Upload Document Dialog (C4.3 — Communication · Documents)
 *
 * Upload dialog with:
 *   - Drag-and-drop file area (uses native input + custom visual hint)
 *   - Category dropdown
 *   - VALIDATION: if file size > 60MB, show inline error
 *     "File exceeds 60MB limit" and block upload.
 *   - On successful upload: show "Signed URL expires in 10:00" countdown
 *     (mock — visual timer only).
 *
 * The dialog itself is gated by IfPermission code="documents.upload" at the
 * page level — this component does not re-check that gate.
 */

import * as React from "react";
import {
  Upload, AlertTriangle, CheckCircle2, CloudUpload, X,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatFileSize } from "./DocumentRow";

const MAX_BYTES = 60 * 1024 * 1024; // 60MB
const COUNTDOWN_SECONDS = 600; // 10 minutes

const CATEGORIES = [
  "Notice",
  "Academic",
  "Finance",
  "HR",
  "Inventory",
  "Reports",
  "Other",
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function UploadDocumentDialog({ open, onOpenChange }: Props) {
  const { locale } = useI18n();
  const { toast } = useToast();

  const [fileName, setFileName] = React.useState<string | null>(null);
  const [fileSize, setFileSize] = React.useState<number>(0);
  const [category, setCategory] = React.useState<string>("Notice");
  const [error, setError] = React.useState<string | null>(null);
  const [uploaded, setUploaded] = React.useState(false);
  const [remaining, setRemaining] = React.useState(COUNTDOWN_SECONDS);
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Reset state whenever the dialog opens fresh.
  React.useEffect(() => {
    if (open) {
      setFileName(null);
      setFileSize(0);
      setCategory("Notice");
      setError(null);
      setUploaded(false);
      setRemaining(COUNTDOWN_SECONDS);
      setUploading(false);
    }
  }, [open]);

  // Countdown timer for the signed URL expiry.
  React.useEffect(() => {
    if (!uploaded) return;
    if (remaining <= 0) return;
    const id = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          toast({
            title: "Signed URL expired",
            description: "Re-download to get a fresh URL.",
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [uploaded, remaining, toast]);

  const handleFile = (file: File | null | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setFileSize(file.size);
    setUploaded(false);
    if (file.size > MAX_BYTES) {
      setError(`File exceeds 60MB limit (selected file is ${formatFileSize(file.size, locale)}).`);
    } else {
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleUpload = () => {
    if (!fileName || error) return;
    setUploading(true);
    // Mock async upload.
    setTimeout(() => {
      setUploading(false);
      setUploaded(true);
      setRemaining(COUNTDOWN_SECONDS);
      toast({
        title: "Document uploaded",
        description: `${fileName} · ${formatFileSize(fileSize, locale)} · category: ${category}`,
      });
    }, 500);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const countdownLabel = `${mm}:${ss}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-subtitle">
            <CloudUpload className="h-5 w-5 text-primary-500" aria-hidden="true" />
            Upload Document
          </DialogTitle>
          <DialogDescription>
            Drag a file into the area below or click to browse. Maximum size: 60&nbsp;MB.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drag-drop file area */}
          <div>
            <Label className="mb-1.5 block text-subtitle">File</Label>
            <label
              htmlFor="document-file-input"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border-strong bg-surface-hover px-6 py-8 text-center transition-colors hover:border-primary-500 hover:bg-primary-50/40"
            >
              <Upload className="mb-2 h-8 w-8 text-text-muted" aria-hidden="true" />
              <p className="text-body font-medium text-text-primary">
                {fileName ? fileName : "Drop file here or click to browse"}
              </p>
              {fileSize > 0 && (
                <p className="mt-1 text-caption text-text-secondary">
                  {formatFileSize(fileSize, locale)}
                </p>
              )}
              <input
                ref={inputRef}
                id="document-file-input"
                type="file"
                className="sr-only"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </label>
            {error && (
              <p className="mt-1.5 text-caption text-semantic-danger" role="alert">
                <AlertTriangle className="me-1 inline h-3 w-3" />
                {error}
              </p>
            )}
          </div>

          {/* Category dropdown */}
          <div>
            <Label htmlFor="category-select" className="mb-1.5 block text-subtitle">
              Category
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category-select" className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Success state — countdown timer for signed URL */}
          {uploaded && (
            <div className="rounded-lg border border-semantic-success/30 bg-success-50 p-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-semantic-success" aria-hidden="true" />
                <div className="flex-1">
                  <p className="text-body font-medium text-semantic-success">
                    Uploaded — signed URL active
                  </p>
                  <p className="mt-0.5 text-caption text-text-secondary">
                    The signed URL for <span className="font-mono">{fileName}</span> expires in{" "}
                    <span className="font-mono font-medium text-text-primary">{countdownLabel}</span>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Validation hint before upload */}
          {!uploaded && !error && fileName && (
            <p className="text-caption text-text-secondary">
              <CheckCircle2 className="me-1 inline h-3 w-3 text-semantic-success" />
              File is within the 60&nbsp;MB limit and ready to upload.
            </p>
          )}
        </div>

        <DialogFooter>
          {uploaded ? (
            <>
              <Badge variant="outline" className="border-semantic-success/40 text-semantic-success">
                <CheckCircle2 className="h-3 w-3" />
                URL active · {countdownLabel}
              </Badge>
              <Button onClick={handleClose}>
                <X className="h-4 w-4" />
                Close
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={uploading}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!fileName || !!error || uploading}
              >
                {uploading ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
