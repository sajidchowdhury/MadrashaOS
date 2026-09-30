"use client";

/**
 * MadrashaOS — Hostel Management (redesigned for real-world flow)
 *
 * Real-world hostel management:
 *   - Rooms with capacity (15-20 students each)
 *   - Select a room → see its beds + occupants
 *   - "Assign Students" button → select multiple students → bulk-assign to room
 *   - Click an occupied bed → relocate or deallocate that student
 *   - "Add Room" button → create a new room with auto-generated beds
 *
 * Data: real API (GET /api/v1/hostel/rooms, POST .../bulk-allocate, etc.)
 */

import * as React from "react";
import {
  Sofa, BedDouble, UserPlus, UserMinus, Plus, Users, CheckCircle2,
  XCircle, AlertCircle, Save, ArrowRight, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useStudents, queryClient } from "@/lib/query/client";
import { useToast } from "@/hooks/use-toast";

type Bed = {
  id: string;
  bed_number: string;
  status: string;
  student_id: string | null;
  student_name: string | null;
  student_code: string | null;
  monthly_fee: number;
};

type Room = {
  id: string;
  room_number: string;
  building: string | null;
  floor: number;
  capacity: number;
  gender: string | null;
  is_active: boolean;
  beds: Bed[];
};

type Student = {
  id: string;
  name: string;
  code: string;
  className?: string;
  gender?: string;
};

export default function HostelPage() {
  const { hasPermission } = useSessionStore();
  const { toast } = useToast();
  const { data: studentsData } = useStudents();

  const [rooms, setRooms] = React.useState<Room[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [selectedRoomId, setSelectedRoomId] = React.useState<string | null>(null);

  // Add Room dialog
  const [addRoomOpen, setAddRoomOpen] = React.useState(false);
  const [addRoomSubmitting, setAddRoomSubmitting] = React.useState(false);
  const [roomNumber, setRoomNumber] = React.useState("");
  const [roomBuilding, setRoomBuilding] = React.useState("");
  const [roomFloor, setRoomFloor] = React.useState("1");
  const [roomCapacity, setRoomCapacity] = React.useState("15");
  const [roomGender, setRoomGender] = React.useState<string>("");
  const [addRoomError, setAddRoomError] = React.useState<string | null>(null);

  // Bulk assign dialog
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [assignRoomId, setAssignRoomId] = React.useState<string | null>(null);
  const [assignSubmitting, setAssignSubmitting] = React.useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = React.useState<Set<string>>(new Set());
  const [assignMonthlyFee, setAssignMonthlyFee] = React.useState("800");
  const [assignSearch, setAssignSearch] = React.useState("");
  const [assignError, setAssignError] = React.useState<string | null>(null);

  // Fetch rooms from the API
  const fetchRooms = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/v1/hostel/rooms?pageSize=100");
      const data = await res.json().catch(() => ({}));
      const list = (data?.data ?? []) as Room[];
      setRooms(list);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const allStudents = (studentsData ?? []) as Student[];
  const studentsInHostel = new Set(
    rooms.flatMap((r) => r.beds.filter((b) => b.student_id).map((b) => b.student_id!)),
  );

  // KPI stats
  const totalRooms = rooms.length;
  const totalBeds = rooms.reduce((s, r) => s + r.beds.length, 0);
  const occupiedBeds = rooms.reduce(
    (s, r) => s + r.beds.filter((b) => b.status === "occupied").length, 0,
  );
  const totalCapacity = rooms.reduce((s, r) => s + r.capacity, 0);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  // --- Add Room handler ---
  async function handleAddRoom() {
    setAddRoomError(null);
    if (!roomNumber.trim()) {
      setAddRoomError("Room number is required.");
      return;
    }
    setAddRoomSubmitting(true);
    try {
      const res = await fetch("/api/v1/hostel/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_number: roomNumber.trim(),
          building: roomBuilding.trim() || undefined,
          floor: Number(roomFloor) || 1,
          capacity: Number(roomCapacity) || 15,
          gender: roomGender || undefined,
          auto_create_beds: Number(roomCapacity) || 15,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAddRoomError(data?.error || `Failed (HTTP ${res.status})`);
        setAddRoomSubmitting(false);
        return;
      }
      toast({ title: "Room created", description: `${roomNumber} (capacity ${roomCapacity})` });
      setRoomNumber(""); setRoomBuilding(""); setRoomFloor("1"); setRoomCapacity("15"); setRoomGender("");
      setAddRoomOpen(false);
      fetchRooms();
    } catch {
      setAddRoomError("Network error — please try again.");
    }
    setAddRoomSubmitting(false);
  }

  // --- Bulk Assign handler ---
  function openAssignDialog(roomId: string) {
    setAssignRoomId(roomId);
    setSelectedStudentIds(new Set());
    setAssignSearch("");
    setAssignError(null);
    setAssignOpen(true);
  }

  async function handleBulkAssign() {
    if (!assignRoomId || selectedStudentIds.size === 0) return;
    setAssignSubmitting(true);
    setAssignError(null);
    try {
      const res = await fetch(`/api/v1/hostel/rooms/${assignRoomId}/bulk-allocate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_ids: Array.from(selectedStudentIds),
          monthly_fee: Number(assignMonthlyFee) || 0,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAssignError(data?.error || `Failed (HTTP ${res.status})`);
        setAssignSubmitting(false);
        return;
      }
      toast({
        title: "Students assigned",
        description: data?.message || `${selectedStudentIds.size} student(s) allocated.`,
      });
      setAssignOpen(false);
      fetchRooms();
      queryClient.invalidateQueries({ queryKey: ["students"] });
    } catch {
      setAssignError("Network error — please try again.");
    }
    setAssignSubmitting(false);
  }

  // --- Deallocate handler ---
  async function handleDeallocate(bedId: string, studentName: string) {
    try {
      const res = await fetch(`/api/v1/hostel/beds/${bedId}/deallocate`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: "Failed", description: data?.error || `HTTP ${res.status}`, variant: "destructive" });
        return;
      }
      toast({ title: "Student vacated", description: `${studentName} has been removed from the bed.` });
      fetchRooms();
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    }
  }

  // Filtered students for assign dialog (exclude those already in hostel)
  const availableStudents = allStudents.filter((s) => !studentsInHostel.has(s.id));
  const filteredAvailableStudents = availableStudents.filter((s) => {
    if (!assignSearch.trim()) return true;
    const q = assignSearch.trim().toLowerCase();
    return s.name?.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q);
  });

  if (!hasPermission("hostel.view")) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <PermissionDenied resource="Hostel" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-display font-bold text-text-primary">
              <Sofa className="h-7 w-7 text-primary-500" aria-hidden />
              Hostel Management
            </h1>
            <p className="mt-1 text-body text-text-secondary">
              Manage rooms, assign students in bulk, and track occupancy.
            </p>
          </div>
          <IfPermission code="hostel.allocate">
            <Button onClick={() => setAddRoomOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Room
            </Button>
          </IfPermission>
        </header>

        {/* KPI strip */}
        <div className="grid gap-4 sm:grid-cols-4">
          <KpiStat label="Total Rooms" value={String(totalRooms)} icon={Sofa} tone="primary" />
          <KpiStat label="Total Beds" value={String(totalBeds)} icon={BedDouble} tone="default" />
          <KpiStat label="Occupied" value={String(occupiedBeds)} icon={Users} tone="success" />
          <KpiStat label="Capacity" value={String(totalCapacity)} icon={Building2} tone="default" />
        </div>

        {/* Body */}
        {loading && <LoadingState pattern="list" rows={3} />}
        {error && <ErrorState onRetry={fetchRooms} />}

        {!loading && !error && rooms.length === 0 && (
          <EmptyState
            illustration="inventory"
            title="No rooms yet"
            description="Add a room with beds to start managing hostel occupancy."
            action={
              <IfPermission code="hostel.allocate">
                <Button onClick={() => setAddRoomOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add Room
                </Button>
              </IfPermission>
            }
          />
        )}

        {/* Room cards */}
        {!loading && !error && rooms.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            {rooms.map((room) => {
              const occupied = room.beds.filter((b) => b.status === "occupied").length;
              const vacant = room.beds.filter((b) => b.status === "vacant").length;
              const occupancyPct = room.capacity > 0 ? Math.round((occupied / room.capacity) * 100) : 0;
              const isSelected = selectedRoomId === room.id;

              return (
                <div
                  key={room.id}
                  className={`rounded-xl border-2 p-4 transition-colors ${
                    isSelected ? "border-primary-500" : "border-border-default"
                  }`}
                >
                  {/* Room header */}
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-subtitle font-bold text-text-primary">
                          Room {room.room_number}
                        </h3>
                        {room.gender && (
                          <Badge variant="outline" className="capitalize">
                            {room.gender}
                          </Badge>
                        )}
                      </div>
                      <p className="text-caption text-text-muted">
                        Floor {room.floor}{room.building ? ` · ${room.building}` : ""}
                        {" · "}{occupied}/{room.capacity} occupied ({occupancyPct}%)
                      </p>
                    </div>
                    <IfPermission code="hostel.allocate">
                      <Button
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => {
                          setSelectedRoomId(isSelected ? null : room.id);
                          if (!isSelected) openAssignDialog(room.id);
                        }}
                        disabled={vacant === 0}
                      >
                        <UserPlus className="h-4 w-4" />
                        Assign Students
                      </Button>
                    </IfPermission>
                  </div>

                  {/* Occupancy bar */}
                  <div className="mb-3 h-2 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        occupancyPct >= 100 ? "bg-semantic-danger"
                        : occupancyPct >= 80 ? "bg-semantic-warning"
                        : "bg-semantic-success"
                      }`}
                      style={{ width: `${Math.min(occupancyPct, 100)}%` }}
                    />
                  </div>

                  {/* Bed list */}
                  {isSelected && room.beds.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-caption font-medium uppercase tracking-wide text-text-muted">
                        Beds ({room.beds.length})
                      </p>
                      <div className="max-h-48 space-y-1 overflow-y-auto">
                        {room.beds.map((bed) => (
                          <div
                            key={bed.id}
                            className={`flex items-center justify-between rounded-md border px-3 py-1.5 ${
                              bed.status === "occupied"
                                ? "border-primary-200 bg-primary-50/30"
                                : "border-border-default bg-surface-hover"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <BedDouble className="h-3.5 w-3.5 text-text-muted" />
                              <span className="font-mono text-caption">Bed {bed.bed_number}</span>
                            </div>
                            {bed.status === "occupied" && bed.student_name ? (
                              <div className="flex items-center gap-2">
                                <div className="text-end">
                                  <p className="text-body font-medium text-text-primary">
                                    {bed.student_name}
                                  </p>
                                  <p className="text-caption text-text-muted">{bed.student_code}</p>
                                </div>
                                <IfPermission code="hostel.allocate">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeallocate(bed.id, bed.student_name!)}
                                  >
                                    <UserMinus className="h-3.5 w-3.5" />
                                  </Button>
                                </IfPermission>
                              </div>
                            ) : (
                              <Badge variant="outline" className="bg-success-50 text-semantic-success">
                                Vacant
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!isSelected && (
                    <p className="text-caption text-text-muted">
                      Click "Assign Students" to view bed details.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---------- Add Room Dialog ---------- */}
      <Dialog open={addRoomOpen} onOpenChange={setAddRoomOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary-500" />
              Add Hostel Room
            </DialogTitle>
            <DialogDescription>
              Create a room with auto-generated beds. Students can then be
              assigned in bulk.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="room-no">Room Number *</Label>
                <Input id="room-no" placeholder="101" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="room-floor">Floor</Label>
                <Input id="room-floor" type="number" min={0} max={10} value={roomFloor} onChange={(e) => setRoomFloor(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="room-cap">Capacity (beds)</Label>
                <Input id="room-cap" type="number" min={1} max={20} value={roomCapacity} onChange={(e) => setRoomCapacity(e.target.value)} />
                <p className="text-caption text-text-muted">Auto-creates this many beds.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="room-gender">Gender</Label>
                <Select value={roomGender} onValueChange={setRoomGender}>
                  <SelectTrigger id="room-gender" className="w-full">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="room-building">Building (optional)</Label>
              <Input id="room-building" placeholder="Block A" value={roomBuilding} onChange={(e) => setRoomBuilding(e.target.value)} />
            </div>
            {addRoomError && (
              <div role="alert" className="flex items-start gap-2 rounded-md border border-semantic-danger/40 bg-danger-50 px-3 py-2 text-caption text-semantic-danger">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{addRoomError}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRoomOpen(false)}>Cancel</Button>
            <Button onClick={handleAddRoom} disabled={addRoomSubmitting}>
              <Save className="h-4 w-4" />
              {addRoomSubmitting ? "Creating…" : "Create Room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Bulk Assign Students Dialog ---------- */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary-500" />
              Assign Students to Room
            </DialogTitle>
            <DialogDescription>
              Select students to assign to this room. Each student gets
              their own bed automatically. Already-hostel students are excluded.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Monthly fee */}
            <div className="space-y-1.5">
              <Label htmlFor="monthly-fee">Monthly Hostel Fee per Student (BDT)</Label>
              <Input
                id="monthly-fee"
                type="number"
                min={0}
                value={assignMonthlyFee}
                onChange={(e) => setAssignMonthlyFee(e.target.value)}
                placeholder="800"
              />
              <p className="text-caption text-text-muted">
                This fee will be used when creating class-wise fee plans (only boarders pay it).
              </p>
            </div>

            {/* Search students */}
            <Input
              placeholder="Search by student name or code…"
              value={assignSearch}
              onChange={(e) => setAssignSearch(e.target.value)}
            />

            {/* Student list with checkboxes */}
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border-default p-2">
              {filteredAvailableStudents.length === 0 && (
                <p className="py-4 text-center text-caption text-text-muted">
                  No available students (all may already be in hostel).
                </p>
              )}
              {filteredAvailableStudents.map((s) => (
                <label
                  key={s.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition-colors ${
                    selectedStudentIds.has(s.id) ? "bg-primary-50" : "hover:bg-surface-hover"
                  }`}
                >
                  <Checkbox
                    checked={selectedStudentIds.has(s.id)}
                    onCheckedChange={() => {
                      setSelectedStudentIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(s.id)) next.delete(s.id);
                        else next.add(s.id);
                        return next;
                      });
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-body font-medium text-text-primary">{s.name}</p>
                    <p className="text-caption text-text-muted">
                      {s.code}{s.className ? ` · ${s.className}` : ""}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {/* Selected count */}
            {selectedStudentIds.size > 0 && (
              <div className="flex items-center justify-between rounded-md border border-primary-200 bg-primary-50 px-3 py-2">
                <span className="text-body font-medium text-primary-700">
                  {selectedStudentIds.size} student(s) selected
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedStudentIds(new Set())}
                >
                  Clear
                </Button>
              </div>
            )}

            {assignError && (
              <div role="alert" className="flex items-start gap-2 rounded-md border border-semantic-danger/40 bg-danger-50 px-3 py-2 text-caption text-semantic-danger">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{assignError}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button
              onClick={handleBulkAssign}
              disabled={assignSubmitting || selectedStudentIds.size === 0}
            >
              <Save className="h-4 w-4" />
              {assignSubmitting ? "Assigning…" : `Assign ${selectedStudentIds.size} Student(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
