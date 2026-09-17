"use client";

/**
 * MadrashaOS — Hostel Occupancy Map (C4.2 — Operations · Hostel)
 *
 * Visual floor plan of hostel beds with allocate/deallocate per SRS §2.5.5.
 *
 *   - 2 floors × 4 rooms × 2 beds = 16 beds
 *   - Each bed is a clickable square: green=available, red=occupied, grey=maintenance
 *   - Click available bed → "Allocate Bed" dialog (select student)
 *   - Click occupied bed → show occupant info + "Deallocate" button
 *   - VALIDATION: allocating an occupied bed → friendly error "Bed already occupied"
 *   - IfPermission code="hostel.allocate" gates the allocate action
 *   - Summary cards at top: Total Beds · Occupied · Available · Maintenance
 */

import * as React from "react";
import {
  Sofa, BedDouble, UserPlus, UserMinus, Wrench, CheckCircle2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { IfPermission } from "@/components/auth/IfPermission";
import {
  PermissionDenied, LoadingState, ErrorState,
} from "@/components/states";
import { KpiStat } from "@/components/operations/KpiStat";
import { useSessionStore } from "@/stores/sessionStore";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useStudents } from "@/lib/query/client";
import { useToast } from "@/hooks/use-toast";

/* --- Inline mock hostel data --- */

type BedStatus = "available" | "occupied" | "maintenance";

type Bed = {
  id: string;       // e.g. "F1R1B1"
  floor: number;
  room: number;
  bedNumber: number;
  status: BedStatus;
  occupantId?: string;
  occupantName?: string;
};

const FLOORS = 2;
const ROOMS_PER_FLOOR = 4;
const BEDS_PER_ROOM = 2;

function buildInitialBeds(): Bed[] {
  const beds: Bed[] = [];
  for (let f = 1; f <= FLOORS; f++) {
    for (let r = 1; r <= ROOMS_PER_FLOOR; r++) {
      for (let b = 1; b <= BEDS_PER_ROOM; b++) {
        const id = `F${f}R${r}B${b}`;
        // Pre-populate ~half the beds with occupants + 2 in maintenance.
        let status: BedStatus = "available";
        let occupantId: string | undefined;
        let occupantName: string | undefined;
        const seed = (f * 10 + r * 5 + b) % 7;
        if (seed === 0 || seed === 2 || seed === 4) {
          status = "occupied";
          occupantId = `stu-00${seed + 1}`;
          occupantName = ["Ayesha Rahman", "Fatima Begum", "Mohammed Ali", "Tahmid Hasan", "Sadia Islam", "Yusuf Khan"][seed % 6];
        } else if (seed === 6) {
          status = "maintenance";
        }
        beds.push({ id, floor: f, room: r, bedNumber: b, status, occupantId, occupantName });
      }
    }
  }
  return beds;
}

const BED_TONE: Record<BedStatus, { tile: string; ring: string; label: string }> = {
  available: { tile: "bg-success-50 border-semantic-success/40 hover:bg-success-50/80", ring: "bg-semantic-success", label: "Available" },
  occupied: { tile: "bg-danger-50 border-semantic-danger/40 hover:bg-danger-50/80", ring: "bg-semantic-danger", label: "Occupied" },
  maintenance: { tile: "bg-neutral-100 border-border-default hover:bg-neutral-100/80", ring: "bg-neutral-400", label: "Maintenance" },
};

export default function HostelPage() {
  const { locale } = useI18n();
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const canView = hasPermission("hostel.view");

  const { data: students, isLoading, isError, refetch } = useStudents();
  const { toast } = useToast();

  const [beds, setBeds] = React.useState<Bed[]>(buildInitialBeds);
  const [selectedBed, setSelectedBed] = React.useState<Bed | null>(null);
  const [allocateStudentId, setAllocateStudentId] = React.useState<string>("");
  const [deallocateBed, setDeallocateBed] = React.useState<Bed | null>(null);

  if (!canView) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <PermissionDenied resource="Hostel Occupancy Map" />
        </div>
      </div>
    );
  }

  const total = beds.length;
  const occupied = beds.filter((b) => b.status === "occupied").length;
  const available = beds.filter((b) => b.status === "available").length;
  const maintenance = beds.filter((b) => b.status === "maintenance").length;

  const handleAllocate = () => {
    if (!selectedBed) return;
    // Validation: bed must be available (friendly error if not)
    if (selectedBed.status !== "available") {
      toast({
        title: "Bed already occupied",
        description: `${selectedBed.id} is currently ${selectedBed.status}. Pick an available bed.`,
        variant: "destructive",
      });
      return;
    }
    const student = students?.find((s) => s.id === allocateStudentId);
    if (!student) return;
    setBeds((prev) => prev.map((b) => b.id === selectedBed.id
      ? { ...b, status: "occupied", occupantId: student.id, occupantName: student.name }
      : b));
    toast({
      title: "Bed allocated",
      description: `${student.name} → ${selectedBed.id} (Floor ${selectedBed.floor}, Room ${selectedBed.room}, Bed ${selectedBed.bedNumber}).`,
    });
    setSelectedBed(null);
    setAllocateStudentId("");
  };

  const handleDeallocate = () => {
    if (!deallocateBed) return;
    setBeds((prev) => prev.map((b) => b.id === deallocateBed.id
      ? { ...b, status: "available", occupantId: undefined, occupantName: undefined }
      : b));
    toast({
      title: "Bed deallocated",
      description: `${deallocateBed.id} is now available.`,
    });
    setDeallocateBed(null);
  };

  const bedsByFloor = (floor: number) => beds.filter((b) => b.floor === floor);

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-display font-bold text-text-primary">Hostel Occupancy</h1>
            <p className="mt-1 text-body text-text-secondary">
              Visual floor plan with bed allocation per SRS §2.5.5.
            </p>
          </div>
          <Badge variant="outline" className="border-border-default bg-surface-card px-3 py-1.5 text-body">
            <BedDouble className="h-4 w-4 text-primary-500" />
            {FLOORS} floors · {ROOMS_PER_FLOOR} rooms · {BEDS_PER_ROOM} beds each
          </Badge>
        </header>

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiStat label="Total Beds" value={String(total)} icon={Sofa} tone="primary" />
          <KpiStat label="Occupied" value={String(occupied)} icon={BedDouble} tone="danger" />
          <KpiStat label="Available" value={String(available)} icon={CheckCircle2} tone="success" />
          <KpiStat label="Maintenance" value={String(maintenance)} icon={Wrench} tone="default" />
        </div>

        {/* Body */}
        {isLoading && <LoadingState pattern="dashboard" />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {!isLoading && !isError && (
          <div className="space-y-6">
            {/* Floor plan */}
            {Array.from({ length: FLOORS }).map((_, fIdx) => {
              const floor = fIdx + 1;
              const floorBeds = bedsByFloor(floor);
              return (
                <section
                  key={`floor-${floor}`}
                  className="rounded-lg border border-border-default bg-surface-card p-4 shadow-elevation-1"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-subtitle font-semibold text-text-primary">
                      Floor {floor}
                    </h2>
                    <Badge variant="outline" className="border-border-default font-mono">
                      {floorBeds.filter((b) => b.status === "occupied").length}/{floorBeds.length} occupied
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {Array.from({ length: ROOMS_PER_FLOOR }).map((_, rIdx) => {
                      const room = rIdx + 1;
                      const roomBeds = floorBeds.filter((b) => b.room === room);
                      return (
                        <div key={`floor-${floor}-room-${room}`} className="rounded-md border border-border-default bg-surface-canvas p-2">
                          <p className="mb-2 text-caption font-semibold uppercase tracking-wider text-text-muted">
                            Room {room}
                          </p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {roomBeds.map((bed) => {
                              const tone = BED_TONE[bed.status];
                              return (
                                <button
                                  key={bed.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedBed(bed);
                                    setAllocateStudentId("");
                                  }}
                                  className={`group relative aspect-square rounded-md border p-1 text-left transition-all ${tone.tile}`}
                                  aria-label={`Bed ${bed.id}, ${tone.label}`}
                                  title={`${bed.id} · ${tone.label}${bed.occupantName ? ` · ${bed.occupantName}` : ""}`}
                                >
                                  <BedDouble className="h-4 w-4 text-text-secondary" />
                                  <p className="absolute bottom-1 left-1 font-mono text-[10px] text-text-secondary">
                                    {bed.bedNumber}
                                  </p>
                                  <span className={`absolute right-1 top-1 h-2 w-2 rounded-full ${tone.ring}`} aria-hidden />
                                  {bed.occupantName && (
                                    <p className="absolute inset-x-1 top-6 truncate text-[9px] font-medium text-text-primary" title={bed.occupantName}>
                                      {bed.occupantName.split(" ")[0]}
                                    </p>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border-default bg-surface-card p-3 text-body">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-semantic-success" />
                <span className="text-text-secondary">Available</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-semantic-danger" />
                <span className="text-text-secondary">Occupied</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-neutral-400" />
                <span className="text-text-secondary">Maintenance</span>
              </span>
              <p className="ms-auto text-caption text-text-muted">
                Click any bed to view / allocate / deallocate.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Allocate / Bed detail dialog */}
      <Dialog open={!!selectedBed} onOpenChange={(o) => !o && setSelectedBed(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedBed && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-subtitle">
                  <BedDouble className="h-5 w-5 text-primary-500" />
                  Bed {selectedBed.id}
                </DialogTitle>
                <DialogDescription>
                  Floor {selectedBed.floor} · Room {selectedBed.room} · Bed {selectedBed.bedNumber}
                </DialogDescription>
              </DialogHeader>

              {/* Current state */}
              <div className="rounded-lg border border-border-default p-3">
                <div className="flex items-center justify-between">
                  <span className="text-caption uppercase tracking-wider text-text-muted">Current state</span>
                  <Badge variant="outline" className={BED_TONE[selectedBed.status].tile.replace("hover:", "")}>
                    {BED_TONE[selectedBed.status].label}
                  </Badge>
                </div>
                {selectedBed.occupantName && (
                  <p className="mt-2 text-body text-text-primary">
                    Occupant: <span className="font-medium">{selectedBed.occupantName}</span>
                  </p>
                )}
              </div>

              {/* Action zone */}
              {selectedBed.status === "available" && (
                <IfPermission code="hostel.allocate" fallback={<p className="text-caption text-text-muted">You don't have permission to allocate beds.</p>}>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="alloc-stu" className="mb-1.5 block text-subtitle">Allocate to Student</Label>
                      <Select value={allocateStudentId} onValueChange={setAllocateStudentId}>
                        <SelectTrigger id="alloc-stu" className="w-full" aria-label="Select student to allocate">
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
                    <Button onClick={handleAllocate} disabled={!allocateStudentId} className="w-full">
                      <UserPlus className="h-4 w-4" />
                      Allocate Bed
                    </Button>
                  </div>
                </IfPermission>
              )}

              {selectedBed.status === "occupied" && (
                <IfPermission code="hostel.allocate" fallback={<p className="text-caption text-text-muted">You don't have permission to deallocate beds.</p>}>
                  <Button variant="outline" className="w-full" onClick={() => setDeallocateBed(selectedBed)}>
                    <UserMinus className="h-4 w-4 text-semantic-danger" />
                    Deallocate Bed
                  </Button>
                </IfPermission>
              )}

              {selectedBed.status === "maintenance" && (
                <p className="rounded-md bg-warning-50 p-3 text-body text-semantic-warning">
                  Bed under maintenance — allocation disabled until resolved.
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Deallocate confirm */}
      <AlertDialog open={!!deallocateBed} onOpenChange={(o) => !o && setDeallocateBed(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-subtitle">
              <UserMinus className="h-5 w-5 text-semantic-danger" />
              Deallocate Bed
            </AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{deallocateBed?.occupantName}</strong> from bed {deallocateBed?.id}? The bed becomes available for new allocation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeallocate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deallocate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
