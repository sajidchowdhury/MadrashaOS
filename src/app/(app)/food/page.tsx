"use client";

/**
 * MadrashaOS — Food / Meal Management (C4.2 — Operations · Food)
 *
 * Weekly meal plan with cost tracking per SRS §2.5.6 (Hostel & Food).
 *
 *   - 7 days × 3 meals (Breakfast / Lunch / Dinner) = 21 slots
 *   - Each slot: meal name, expected count, actual cost
 *   - "Record Meal Expense" dialog (perm: food.meal-plan): date + meal + amount
 *     → "Posts to Food account"
 *   - Summary: total weekly cost
 *   - formatCurrency() for amounts
 */

import * as React from "react";
import {
  UtensilsCrossed, Plus, CalendarDays, Users, Wallet, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { KpiStat } from "@/components/operations/KpiStat";
import { useSessionStore } from "@/stores/sessionStore";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatCurrency, formatDate } from "@/lib/i18n/format";
import { useToast } from "@/hooks/use-toast";

/* --- Inline mock meal plan --- */

type MealSlot = "Breakfast" | "Lunch" | "Dinner";

type MealEntry = {
  day: string;
  slot: MealSlot;
  mealName: string;
  expectedCount: number;
  actualCost: number;
};

const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const SLOTS: MealSlot[] = ["Breakfast", "Lunch", "Dinner"];

const MEAL_PRESETS: Record<MealSlot, string[]> = {
  Breakfast: ["Khichuri + Egg", "Roti + Dal", "Paratha + Egg", "Bread + Butter"],
  Lunch: ["Rice + Beef Curry", "Rice + Fish", "Rice + Chicken", "Khichuri + Veg"],
  Dinner: ["Rice + Dal + Veg", "Roti + Chicken", "Rice + Egg Curry", "Biryani"],
};

function buildInitialMeals(): MealEntry[] {
  const meals: MealEntry[] = [];
  let bIdx = 0, lIdx = 0, dIdx = 0;
  DAYS.forEach((day, dIdx2) => {
    SLOTS.forEach((slot) => {
      let name = "";
      let expected = 0;
      let cost = 0;
      if (slot === "Breakfast") {
        name = MEAL_PRESETS.Breakfast[bIdx % MEAL_PRESETS.Breakfast.length];
        expected = 40;
        cost = 320;
        bIdx++;
      } else if (slot === "Lunch") {
        name = MEAL_PRESETS.Lunch[lIdx % MEAL_PRESETS.Lunch.length];
        expected = 42;
        cost = 1200;
        lIdx++;
      } else {
        name = MEAL_PRESETS.Dinner[dIdx % MEAL_PRESETS.Dinner.length];
        expected = 38;
        cost = 900;
        dIdx++;
      }
      // Mark Friday lunch & dinner as unpaid placeholders.
      if (day === "Friday" && (slot === "Lunch" || slot === "Dinner")) {
        cost = 0;
      }
      meals.push({ day, slot, mealName: name, expectedCount: expected, actualCost: cost });
      void dIdx2;
    });
  });
  return meals;
}

export default function FoodPage() {
  const { locale } = useI18n();
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const canView = hasPermission("food.meal-plan");
  const { toast } = useToast();

  const [meals, setMeals] = React.useState<MealEntry[]>(buildInitialMeals);
  const [recordOpen, setRecordOpen] = React.useState(false);
  const [record, setRecord] = React.useState({
    day: DAYS[0],
    slot: "Lunch" as MealSlot,
    amount: 0,
  });

  if (!canView) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <PermissionDenied resource="Food & Meal Plan" />
        </div>
      </div>
    );
  }

  const totalCost = meals.reduce((s, m) => s + m.actualCost, 0);
  const totalExpected = meals.reduce((s, m) => s + m.expectedCount, 0);
  const recordedCount = meals.filter((m) => m.actualCost > 0).length;
  const pendingCount = meals.length - recordedCount;

  const handleRecord = () => {
    if (record.amount <= 0) return;
    setMeals((prev) => prev.map((m) => {
      if (m.day === record.day && m.slot === record.slot) {
        return { ...m, actualCost: m.actualCost + record.amount };
      }
      return m;
    }));
    toast({
      title: "Meal expense recorded",
      description: `${formatCurrency(record.amount, locale)} posted to Food account for ${record.day} ${record.slot}.`,
    });
    setRecord({ day: DAYS[0], slot: "Lunch", amount: 0 });
    setRecordOpen(false);
  };

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-display font-bold text-text-primary">Food &amp; Meal Plan</h1>
            <p className="mt-1 text-body text-text-secondary">
              Weekly meal grid with cost tracking per SRS §2.5.6.
            </p>
          </div>
          <IfPermission code="food.meal-plan">
            <Button onClick={() => setRecordOpen(true)}>
              <Plus className="h-4 w-4" />
              Record Meal Expense
            </Button>
          </IfPermission>
        </header>

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiStat label="Weekly Cost" value={formatCurrency(totalCost, locale)} icon={Wallet} tone="primary" />
          <KpiStat label="Meals Recorded" value={`${recordedCount}/${meals.length}`} icon={TrendingUp} tone="success" />
          <KpiStat label="Pending Cost Entries" value={String(pendingCount)} icon={CalendarDays} tone={pendingCount > 0 ? "warning" : "success"} />
          <KpiStat label="Total Expected Heads" value={String(totalExpected)} icon={Users} tone="accent" />
        </div>

        {/* Meal grid */}
        <div className="overflow-x-auto rounded-lg border border-border-default bg-surface-card">
          <div className="min-w-[768px]">
            {/* Header row */}
            <div className="grid grid-cols-8 border-b border-border-default bg-neutral-50">
              <div className="px-3 py-2 text-caption font-semibold uppercase tracking-wider text-text-muted">
                Day
              </div>
              {SLOTS.map((slot) => (
                <div key={slot} className="px-3 py-2 text-caption font-semibold uppercase tracking-wider text-text-muted">
                  {slot}
                </div>
              ))}
              <div className="col-span-4 px-3 py-2 text-caption font-semibold uppercase tracking-wider text-text-muted">
                Day Total
              </div>
            </div>
            {/* Day rows */}
            {DAYS.map((day) => {
              const dayMeals = meals.filter((m) => m.day === day);
              const dayTotal = dayMeals.reduce((s, m) => s + m.actualCost, 0);
              return (
                <div key={day} className="grid grid-cols-8 border-b border-border-default last:border-0">
                  <div className="border-r border-border-default px-3 py-2">
                    <p className="text-body font-medium text-text-primary">{day}</p>
                    <p className="text-caption text-text-muted">{formatDate(new Date(2026, 8, 12 + DAYS.indexOf(day)), locale)}</p>
                  </div>
                  {SLOTS.map((slot) => {
                    const meal = dayMeals.find((m) => m.slot === slot);
                    if (!meal) return <div key={slot} className="border-r border-border-default px-3 py-2" />;
                    const isRecorded = meal.actualCost > 0;
                    return (
                      <div
                        key={slot}
                        className={`border-r border-border-default px-3 py-2 ${isRecorded ? "bg-surface-card" : "bg-warning-50/40"}`}
                      >
                        <p className="text-body font-medium text-text-primary">{meal.mealName}</p>
                        <p className="mt-0.5 text-caption text-text-muted">
                          Heads: <span className="font-mono">{meal.expectedCount}</span>
                        </p>
                        <p className="mt-0.5 text-caption">
                          {isRecorded ? (
                            <span className="font-mono text-semantic-success">{formatCurrency(meal.actualCost, locale)}</span>
                          ) : (
                            <Badge variant="outline" className="border-semantic-warning/40 bg-warning-50 text-semantic-warning">
                              Pending
                            </Badge>
                          )}
                        </p>
                      </div>
                    );
                  })}
                  <div className="col-span-4 flex items-center justify-end px-3 py-2">
                    <span className="font-mono text-body font-semibold text-text-primary">
                      {formatCurrency(dayTotal, locale)}
                    </span>
                  </div>
                </div>
              );
            })}
            {/* Footer total */}
            <div className="grid grid-cols-8 border-t-2 border-border-strong bg-neutral-50">
              <div className="col-span-7 px-3 py-2 text-end text-subtitle font-semibold text-text-primary">
                Weekly Total
              </div>
              <div className="px-3 py-2 text-end">
                <span className="font-mono text-subtitle font-bold text-primary-500">
                  {formatCurrency(totalCost, locale)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-caption text-text-muted">
          {pendingCount > 0 ? `${pendingCount} meals awaiting cost entry (highlighted in amber). ` : ""}
          Recorded expenses post to the Food account on the Operating Expenses ledger.
        </p>
      </div>

      {/* Record meal expense dialog */}
      <Dialog open={recordOpen} onOpenChange={setRecordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-subtitle">
              <UtensilsCrossed className="h-5 w-5 text-primary-500" />
              Record Meal Expense
            </DialogTitle>
            <DialogDescription>
              Posts an expense entry to the Food account on the Operating Expenses ledger (mock).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="m-day" className="mb-1.5 block text-subtitle">Day</Label>
              <Select value={record.day} onValueChange={(v) => setRecord({ ...record, day: v })}>
                <SelectTrigger id="m-day" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="m-slot" className="mb-1.5 block text-subtitle">Meal</Label>
              <Select value={record.slot} onValueChange={(v) => setRecord({ ...record, slot: v as MealSlot })}>
                <SelectTrigger id="m-slot" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SLOTS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="m-amt" className="mb-1.5 block text-subtitle">Amount (BDT)</Label>
              <Input id="m-amt" type="number" min={1} value={record.amount || ""} onChange={(e) => setRecord({ ...record, amount: Number(e.target.value) })} />
              <p className="mt-1 text-caption text-text-muted">Posts to Food account · Operating Expenses ledger</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordOpen(false)}>Cancel</Button>
            <Button onClick={handleRecord} disabled={record.amount <= 0}>Record Expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
