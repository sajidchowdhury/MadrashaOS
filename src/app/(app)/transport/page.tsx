"use client";

/**
 * MadrashaOS — Transport Fuel & Maintenance (C4.2 — Operations · Transport)
 *
 * Vehicle fleet + fuel log + maintenance per SRS §2.5.8 (Transport).
 *
 *   - 3 mock vehicles with name, plate, fuel log
 *   - Vehicle list + fuel log table (date, vehicle, liters, amount, odometer)
 *   - "Record Fuel" button (perm: transport.record-expense): vehicle +
 *     liters + amount → "Posts to vehicle cost + expense account"
 *   - "Record Maintenance" button (same permission): vehicle + description
 *     + amount
 *   - Summary: total fuel cost this month, total maintenance cost
 *   - formatCurrency() for amounts
 */

import * as React from "react";
import {
  Bus, Plus, Fuel, Wrench, CalendarDays, Gauge, Wallet,
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
import { formatCurrency, formatDate, formatNumber } from "@/lib/i18n/format";
import { useToast } from "@/hooks/use-toast";

/* --- Inline mock data --- */

type Vehicle = {
  id: string;
  name: string;
  plate: string;
  type: "Bus" | "Van" | "Car";
  odometer: number; // km
  status: "active" | "maintenance";
};

const INITIAL_VEHICLES: Vehicle[] = [
  { id: "veh-1", name: "Toyota HiAce — School Bus", plate: "Dhaka-Metro-GA-12-3456", type: "Bus", odometer: 84520, status: "active" },
  { id: "veh-2", name: "Mitsubishi Canter — Cargo", plate: "Dhaka-Metro-GA-12-3457", type: "Van", odometer: 61200, status: "active" },
  { id: "veh-3", name: "Toyota Corolla — Office", plate: "Dhaka-Metro-GA-12-3458", type: "Car", odometer: 32100, status: "maintenance" },
];

type FuelLogEntry = {
  id: string;
  date: string;
  vehicleId: string;
  liters: number;
  amount: number;
  odometer: number;
};

type MaintenanceEntry = {
  id: string;
  date: string;
  vehicleId: string;
  description: string;
  amount: number;
};

const INITIAL_FUEL_LOG: FuelLogEntry[] = [
  { id: "fl-1", date: "2026-09-15", vehicleId: "veh-1", liters: 40, amount: 3400, odometer: 84520 },
  { id: "fl-2", date: "2026-09-12", vehicleId: "veh-1", liters: 35, amount: 2975, odometer: 84300 },
  { id: "fl-3", date: "2026-09-13", vehicleId: "veh-2", liters: 30, amount: 2550, odometer: 61200 },
  { id: "fl-4", date: "2026-09-10", vehicleId: "veh-2", liters: 28, amount: 2380, odometer: 61020 },
  { id: "fl-5", date: "2026-09-09", vehicleId: "veh-3", liters: 18, amount: 1530, odometer: 32100 },
];

const INITIAL_MAINTENANCE: MaintenanceEntry[] = [
  { id: "mt-1", date: "2026-09-08", vehicleId: "veh-3", description: "Brake pad replacement + tyre rotation", amount: 8500 },
  { id: "mt-2", date: "2026-08-28", vehicleId: "veh-1", description: "Oil change + filter", amount: 3200 },
];

type DialogMode = "fuel" | "maintenance" | null;

export default function TransportPage() {
  const { locale } = useI18n();
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const canView = hasPermission("transport.view");
  const { toast } = useToast();

  const [vehicles, setVehicles] = React.useState<Vehicle[]>(INITIAL_VEHICLES);
  const [fuelLog, setFuelLog] = React.useState<FuelLogEntry[]>(INITIAL_FUEL_LOG);
  const [maintenance, setMaintenance] = React.useState<MaintenanceEntry[]>(INITIAL_MAINTENANCE);

  const [dialogMode, setDialogMode] = React.useState<DialogMode>(null);
  const [vehicleId, setVehicleId] = React.useState<string>("");
  const [liters, setLiters] = React.useState<number>(0);
  const [amount, setAmount] = React.useState<number>(0);
  const [odometer, setOdometer] = React.useState<number>(0);
  const [description, setDescription] = React.useState<string>("");

  const [filterVehicle, setFilterVehicle] = React.useState<string>("all");

  if (!canView) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <PermissionDenied resource="Transport" />
        </div>
      </div>
    );
  }

  const vehicleName = (id: string) => vehicles.find((v) => v.id === id)?.name ?? id;

  const filteredFuel = fuelLog.filter((f) => filterVehicle === "all" || f.vehicleId === filterVehicle);
  const filteredMaint = maintenance.filter((m) => filterVehicle === "all" || m.vehicleId === filterVehicle);

  const totalFuel = fuelLog.reduce((s, f) => s + f.amount, 0);
  const totalMaint = maintenance.reduce((s, m) => s + m.amount, 0);
  const totalLiters = fuelLog.reduce((s, f) => s + f.liters, 0);

  const openFuel = () => {
    setDialogMode("fuel");
    setVehicleId(vehicles[0]?.id ?? "");
    setLiters(0); setAmount(0); setOdometer(0);
  };
  const openMaint = () => {
    setDialogMode("maintenance");
    setVehicleId(vehicles[0]?.id ?? "");
    setDescription(""); setAmount(0);
  };

  const handleConfirm = () => {
    if (!vehicleId) return;
    if (dialogMode === "fuel") {
      if (liters <= 0 || amount <= 0) return;
      const entry: FuelLogEntry = {
        id: `fl-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        vehicleId,
        liters,
        amount,
        odometer: (odometer || vehicles.find((v) => v.id === vehicleId)?.odometer) ?? 0,
      };
      setFuelLog((prev) => [entry, ...prev]);
      setVehicles((prev) => prev.map((v) => v.id === vehicleId ? { ...v, odometer: entry.odometer } : v));
      toast({
        title: "Fuel recorded",
        description: `${formatNumber(liters, locale)} L · ${formatCurrency(amount, locale)} posted to vehicle cost + expense account.`,
      });
    } else if (dialogMode === "maintenance") {
      if (!description.trim() || amount <= 0) return;
      const entry: MaintenanceEntry = {
        id: `mt-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        vehicleId,
        description: description.trim(),
        amount,
      };
      setMaintenance((prev) => [entry, ...prev]);
      toast({
        title: "Maintenance recorded",
        description: `${entry.description} — ${formatCurrency(amount, locale)} posted to vehicle cost + expense account.`,
      });
    }
    setDialogMode(null);
  };

  const canConfirm = (() => {
    if (!vehicleId) return false;
    if (dialogMode === "fuel") return liters > 0 && amount > 0;
    if (dialogMode === "maintenance") return description.trim().length > 0 && amount > 0;
    return false;
  })();

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-display font-bold text-text-primary">Transport</h1>
            <p className="mt-1 text-body text-text-secondary">
              Fuel log + maintenance for the fleet per SRS §2.5.8.
            </p>
          </div>
          <IfPermission code="transport.record-expense">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={openFuel}>
                <Fuel className="h-4 w-4" />
                Record Fuel
              </Button>
              <Button onClick={openMaint}>
                <Plus className="h-4 w-4" />
                Record Maintenance
              </Button>
            </div>
          </IfPermission>
        </header>

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiStat label="Vehicles" value={String(vehicles.length)} icon={Bus} tone="primary" />
          <KpiStat label="Fuel Cost (period)" value={formatCurrency(totalFuel, locale)} hint={`${formatNumber(totalLiters, locale)} L total`} icon={Fuel} tone="warning" />
          <KpiStat label="Maintenance Cost (period)" value={formatCurrency(totalMaint, locale)} icon={Wrench} tone="danger" />
          <KpiStat label="Total Fleet Cost" value={formatCurrency(totalFuel + totalMaint, locale)} icon={Wallet} tone="default" />
        </div>

        {/* Vehicle list */}
        <section className="rounded-lg border border-border-default bg-surface-card p-4 shadow-elevation-1">
          <h2 className="mb-3 text-subtitle font-semibold text-text-primary">Fleet</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v) => (
              <div key={v.id} className="rounded-md border border-border-default bg-surface-canvas p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-body font-medium text-text-primary">{v.name}</p>
                    <p className="mt-0.5 font-mono text-caption text-text-secondary">{v.plate}</p>
                  </div>
                  <Badge variant="outline" className={v.status === "active"
                    ? "border-semantic-success/40 bg-success-50 text-semantic-success"
                    : "border-semantic-warning/40 bg-warning-50 text-semantic-warning"}>
                    {v.status === "active" ? "Active" : "In Maintenance"}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center justify-between text-caption text-text-secondary">
                  <span className="inline-flex items-center gap-1">
                    <Gauge className="h-3.5 w-3.5" />
                    <span className="font-mono">{formatNumber(v.odometer, locale)} km</span>
                  </span>
                  <Badge variant="outline" className="font-mono">{v.type}</Badge>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Filter */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border-default bg-surface-card p-3">
          <span className="text-caption text-text-muted">Filter by vehicle:</span>
          <Select value={filterVehicle} onValueChange={setFilterVehicle}>
            <SelectTrigger size="sm" className="w-56" aria-label="Filter by vehicle">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All vehicles</SelectItem>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Fuel log table */}
        <section className="space-y-3">
          <h2 className="text-subtitle font-semibold text-text-primary">Fuel Log</h2>
          {filteredFuel.length === 0 ? (
            <EmptyState illustration="inventory" title="No fuel entries" description="Record a fuel entry to start the log." />
          ) : (
            <div className="overflow-hidden rounded-lg border border-border-default bg-surface-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50">
                    <TableHead className="px-4">Date</TableHead>
                    <TableHead className="px-4">Vehicle</TableHead>
                    <TableHead className="px-4 text-end">Liters</TableHead>
                    <TableHead className="px-4 text-end">Amount</TableHead>
                    <TableHead className="px-4 text-end">Odometer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFuel.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="px-4 py-2 text-caption text-text-secondary">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3 text-text-muted" />
                          {formatDate(new Date(f.date), locale)}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-2 text-body text-text-primary">{vehicleName(f.vehicleId)}</TableCell>
                      <TableCell className="px-4 py-2 text-end font-mono text-body text-text-primary">
                        {formatNumber(f.liters, locale)} L
                      </TableCell>
                      <TableCell className="px-4 py-2 text-end font-mono text-body text-text-primary">
                        {formatCurrency(f.amount, locale)}
                      </TableCell>
                      <TableCell className="px-4 py-2 text-end font-mono text-caption text-text-secondary">
                        {formatNumber(f.odometer, locale)} km
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* Maintenance log */}
        <section className="space-y-3">
          <h2 className="text-subtitle font-semibold text-text-primary">Maintenance Log</h2>
          {filteredMaint.length === 0 ? (
            <EmptyState illustration="inventory" title="No maintenance entries" description="Record a maintenance event to start the log." />
          ) : (
            <div className="overflow-hidden rounded-lg border border-border-default bg-surface-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-neutral-50">
                    <TableHead className="px-4">Date</TableHead>
                    <TableHead className="px-4">Vehicle</TableHead>
                    <TableHead className="px-4">Description</TableHead>
                    <TableHead className="px-4 text-end">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaint.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="px-4 py-2 text-caption text-text-secondary">
                        {formatDate(new Date(m.date), locale)}
                      </TableCell>
                      <TableCell className="px-4 py-2 text-body text-text-primary">{vehicleName(m.vehicleId)}</TableCell>
                      <TableCell className="px-4 py-2 text-body text-text-secondary">{m.description}</TableCell>
                      <TableCell className="px-4 py-2 text-end font-mono text-body text-text-primary">
                        {formatCurrency(m.amount, locale)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        <p className="text-caption text-text-muted">
          Fuel + maintenance posts flow to the vehicle-cost sub-account and the Operating Expenses ledger (mock).
        </p>
      </div>

      {/* Record Fuel / Maintenance dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={(o) => !o && setDialogMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-subtitle">
              {dialogMode === "fuel" ? (
                <Fuel className="h-5 w-5 text-semantic-warning" />
              ) : (
                <Wrench className="h-5 w-5 text-semantic-danger" />
              )}
              {dialogMode === "fuel" ? "Record Fuel" : "Record Maintenance"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "fuel"
                ? "Log a fuel purchase. Posts to vehicle cost + expense account."
                : "Log a maintenance event. Posts to vehicle cost + expense account."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="veh-id" className="mb-1.5 block text-subtitle">Vehicle</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger id="veh-id" className="w-full" aria-label="Select vehicle">
                  <SelectValue placeholder="Select vehicle…" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} · {v.plate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {dialogMode === "fuel" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="fl-liters" className="mb-1.5 block text-subtitle">Liters</Label>
                    <Input id="fl-liters" type="number" min={0.1} step={0.1} value={liters || ""} onChange={(e) => setLiters(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label htmlFor="fl-odo" className="mb-1.5 block text-subtitle">Odometer (km)</Label>
                    <Input id="fl-odo" type="number" min={0} value={odometer || ""} onChange={(e) => setOdometer(Number(e.target.value))} placeholder="auto if blank" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="fl-amt" className="mb-1.5 block text-subtitle">Amount (BDT)</Label>
                  <Input id="fl-amt" type="number" min={1} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} />
                  <p className="mt-1 text-caption text-text-muted">Posts to vehicle cost + expense account</p>
                </div>
              </>
            )}
            {dialogMode === "maintenance" && (
              <>
                <div>
                  <Label htmlFor="mt-desc" className="mb-1.5 block text-subtitle">Description</Label>
                  <Input id="mt-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Oil change + filter replacement" />
                </div>
                <div>
                  <Label htmlFor="mt-amt" className="mb-1.5 block text-subtitle">Amount (BDT)</Label>
                  <Input id="mt-amt" type="number" min={1} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} />
                  <p className="mt-1 text-caption text-text-muted">Posts to vehicle cost + expense account</p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={!canConfirm}>
              {dialogMode === "fuel" ? "Record Fuel" : "Record Maintenance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
