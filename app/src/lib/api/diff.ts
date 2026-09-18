/**
 * MadrashaOS — Field-Diff Computation Helper
 *
 * Task B3.4 — Audit Trail API + Field-Diff Viewer
 *
 * Compares two JSON snapshots (`old_values` and `new_values` stored on an
 * `AuditLog` row) and returns a flat array of `{ field, old, new }` entries
 * for every top-level key whose value changed.
 *
 * Semantics:
 *   - `null` and `undefined` are treated as equivalent (i.e. no diff when
 *     both sides are missing/null).
 *   - A field present on one side only counts as a change (the other side
 *     is reported as `undefined`).
 *   - Object/array values are compared by deep structural equality
 *     (JSON-canonicalised) so unchanged nested payloads don't produce
 *     noise — but the *full* original value is returned in the diff entry,
 *     not a deeply-clawed sub-diff.
 *   - Keys are sorted alphabetically so output is deterministic across
 *     runs (the underlying Json column has no guaranteed key order).
 *
 * Used by:
 *   - GET /api/v1/audit/[id]      (single event field-diff viewer)
 *   - GET /api/v1/audit/export    (CSV "changes" column)
 */

export interface FieldDiffEntry {
  field: string;
  old: unknown;
  new: unknown;
}

/**
 * Compute the field-level diff between two JSON snapshots.
 *
 * @param oldValues  The pre-change snapshot (`audit_logs.old_values`).
 * @param newValues  The post-change snapshot (`audit_logs.new_values`).
 * @returns          Array of fields whose value differs, alphabetically
 *                   sorted by field name.
 */
export function computeFieldDiff(
  oldValues: Record<string, unknown> | null | undefined,
  newValues: Record<string, unknown> | null | undefined,
): FieldDiffEntry[] {
  const oldObj = (oldValues ?? {}) as Record<string, unknown>;
  const newObj = (newValues ?? {}) as Record<string, unknown>;

  // Merge all top-level keys from both sides.
  const keys = new Set<string>([
    ...Object.keys(oldObj),
    ...Object.keys(newObj),
  ]);

  const diff: FieldDiffEntry[] = [];
  for (const field of keys) {
    const oldVal = field in oldObj ? oldObj[field] : undefined;
    const newVal = field in newObj ? newObj[field] : undefined;

    if (!valuesEqual(oldVal, newVal)) {
      diff.push({ field, old: oldVal, new: newVal });
    }
  }

  // Deterministic ordering for stable API output.
  diff.sort((a, b) => a.field.localeCompare(b.field));
  return diff;
}

/**
 * Deep structural equality check suitable for JSON-serialisable values.
 *
 * - `null` and `undefined` are treated as equal (both "absent").
 * - Primitives compared by strict `===`.
 * - Objects/arrays compared by canonical JSON string (key order
 *   independent). We don't bother with a slower recursive walk since the
 *   audit-log values are always JSON-roundtrip-able.
 */
function valuesEqual(a: unknown, b: unknown): boolean {
  // Treat null and undefined as the same "absent" state.
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;

  // Fast path for primitives.
  if (typeof a !== "object" && typeof b !== "object") {
    return a === b;
  }

  // One side primitive, the side object → not equal.
  if (typeof a !== "object" || typeof b !== "object") {
    return false;
  }

  // Deep object/array comparison via canonical JSON.
  try {
    return JSON.stringify(canonicalize(a)) === JSON.stringify(canonicalize(b));
  } catch {
    return false;
  }
}

/**
 * Recursively sort object keys so JSON.stringify yields a stable canonical
 * string regardless of insertion order. Arrays preserve order (they're
 * semantically ordered collections).
 */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

/**
 * Render a diff array as a compact human-readable string for CSV cells.
 * Example: "amount: 20000 → 25000; status: 'pending' → 'posted'"
 */
export function formatDiffForCsv(diff: FieldDiffEntry[]): string {
  if (diff.length === 0) return "";
  return diff
    .map((entry) => {
      const oldStr = formatValue(entry.old);
      const newStr = formatValue(entry.new);
      return `${entry.field}: ${oldStr} → ${newStr}`;
    })
    .join("; ");
}

function formatValue(v: unknown): string {
  if (v === undefined) return "";
  if (v === null) return "null";
  if (typeof v === "string") return `'${v}'`;
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}
