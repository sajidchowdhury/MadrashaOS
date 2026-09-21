/**
 * MadrashaOS — Module Dependency Map
 *
 * Phase B3.2 — Module Configuration API (Risk R2 lock-in)
 *
 * Defines which modules depend on which others. When a user toggles OFF
 * a module that other enabled modules depend on, the API returns 409
 * with the list of active dependents — the frontend renders them as
 * chips and blocks Save until the user resolves the conflict (Risk R2).
 *
 * The map is keyed by the *dependent* module (e.g. "hostel") and lists
 * the modules it requires (e.g. ["inventory"]). To find "who depends
 * on X?" invert the map via `getDependentsOf("X")`.
 *
 * Keys mirror the `module_key` column in `module_configs` table
 * (Prisma `ModuleConfig.module_key`) and the `id` field on
 * `moduleTree` entries in `src/lib/nav/moduleTree.ts`.
 */

/**
 * Map of dependent → list of modules it requires.
 *
 * Add new dependency edges here as the platform grows. Modules not
 * listed have no downstream dependencies and can be toggled freely.
 */
export const MODULE_DEPENDENCIES: Record<string, string[]> = {
  hostel: ["inventory"],
  food: ["inventory"],
  library: ["inventory"],
  transport: ["inventory"],
  purchase: ["inventory"],
};

/**
 * Returns the list of modules that declare a dependency on `moduleKey`.
 *
 * Example: `getDependentsOf("inventory")` → `["hostel","food","library","transport","purchase"]`
 *
 * Used by the PATCH /api/v1/modules/:id handler to detect Risk R2
 * lock-in: "I'm trying to disable `inventory`, but `hostel` + `food`
 * are still enabled and depend on it → block with 409."
 */
export function getDependentsOf(moduleKey: string): string[] {
  const dependents: string[] = [];
  for (const [dependent, deps] of Object.entries(MODULE_DEPENDENCIES)) {
    if (deps.includes(moduleKey)) {
      dependents.push(dependent);
    }
  }
  return dependents;
}

/**
 * Returns the direct dependencies a module declares.
 *
 * Example: `getDependenciesOf("hostel")` → `["inventory"]`
 *
 * Used by GET /api/v1/modules to include a `dependencies: string[]`
 * array on each module config response, so the frontend can render
 * a "Requires: Inventory" hint next to the toggle.
 */
export function getDependenciesOf(moduleKey: string): string[] {
  return MODULE_DEPENDENCIES[moduleKey] ?? [];
}
