/**
 * MadrashaOS — Backup Restore Helpers
 *
 * Provides the ordered model list + type coercion + batching helpers used by
 * the restore API route (POST /api/v1/backup/[id]/restore).
 *
 * The restore order is a topological sort of all Prisma models based on
 * their FK dependencies. Parents are inserted before children, and children
 * are deleted before parents (reverse order).
 *
 * Type coercion reverses what the backup POST route serialized:
 *   - BigInt   → string (back to BigInt)
 *   - Decimal  → string (Prisma accepts strings for Decimal input)
 *   - DateTime → ISO string (back to Date object)
 * Prisma's DMMF (Data Model Meta Field) is used for runtime introspection
 * so this stays correct as the schema evolves.
 */

import { Prisma } from "@/generated/prisma";

/** Insert order (parents → children). Reverse this for delete order. */
export const RESTORE_ORDER = [
  // Phase A — Foundation / identity
  "organization",
  "branch",
  "role",
  "user",
  "rolePermission",
  "moduleConfig",
  "securityPolicy",
  // Phase B — People & catalog
  "class",
  "subject",
  "teacher",
  "employee",
  "guardian",
  "section",
  "student",
  "studentGuardian",
  "admission",
  "teacherAssignment",
  // Phase C — Finance
  "account",
  "payrollRecord",
  "employeeAdvance",
  "feePlan",
  "feeInstallment",
  "feePayment",
  "scholarship",
  "donor",
  "donorPledge",
  "donation",
  "ledgerEntry",
  "cashBankTransfer",
  "zakatTransaction",
  // Phase D — Academic
  "routine",
  "attendanceSession",
  "attendanceRecord",
  "exam",
  "mark",
  "result",
  "studentHistory",
  // Phase E — Operations
  "inventoryItem",
  "supplier",
  "purchase",
  "purchaseItem",
  "inventorySale",
  "asset",
  "hostelRoom",
  "hostelBed",
  "mealPlan",
  "libraryBook",
  "libraryIssue",
  "vehicle",
  "fuelLog",
  "notice",
  "document",
  "report",
  "approval",
  "auditLog",
] as const;

/** Tables to skip during DELETE (must not be wiped). */
export const SKIP_DELETE = new Set<string>([
  "organization", // upserted, not deleted
  "permission", // global seed data — no organization_id column
  "idempotencyRecord", // operational cache
  "backupRecord", // keep all backup history
  "auditLog", // keep audit trail
]);

/** Tables to skip during INSERT (don't re-insert from backup). */
export const SKIP_INSERT = new Set<string>([
  "permission", // code-shipped; backup copy may be stale
  "idempotencyRecord", // operational cache
  "backupRecord", // backup history is preserved, not restored
  "auditLog", // audit trail is preserved, not re-inserted (would violate unique PK)
]);

/** Tables that should be upserted (not bulk createMany). */
export const UPSERT_MODELS = new Set<string>([
  "organization", // single tenant row — upsert by id
]);

/** Self-referential tables → { table: selfFkField } for 2-pass delete/insert. */
export const SELF_REF_TABLES: Record<string, string> = {
  account: "parent_account_id",
  feePayment: "reverse_of",
  ledgerEntry: "reverse_of",
};

/** Build a DMMF field map per model: { fieldName: type } */
const dmmfModels = Prisma.dmmf.datamodel.models;
const FIELD_TYPE_MAP: Record<string, Record<string, string>> = {};
for (const m of dmmfModels) {
  FIELD_TYPE_MAP[m.name] = {};
  for (const f of m.fields) {
    FIELD_TYPE_MAP[m.name][f.name] = f.type; // "BigInt" | "Decimal" | "DateTime" | "String" | "Int" | ...
  }
}

/**
 * Coerce a row's string values back to Prisma-accepted types.
 * - BigInt fields → BigInt(value)
 * - Decimal fields → pass as string (Prisma accepts strings for Decimal)
 * - DateTime fields → new Date(value)
 * - fields not in current schema → dropped (schema drift safety)
 * - everything else → pass through
 */
export function coerceRow(
  modelName: string,
  row: Record<string, unknown>,
): Record<string, unknown> {
  const fieldTypes = FIELD_TYPE_MAP[modelName];
  if (!fieldTypes) return row; // unknown model — pass through

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === null || value === undefined) {
      out[key] = value;
      continue;
    }
    const fieldType = fieldTypes[key];
    if (!fieldType) {
      // Field not in current schema (schema drift) — drop it to avoid
      // "UnknownArgumentValidationError" on insert.
      continue;
    }
    if (fieldType === "BigInt") {
      out[key] = BigInt(value as string);
    } else if (fieldType === "Decimal") {
      // Prisma accepts strings for Decimal input (preserves precision)
      out[key] = value as string;
    } else if (fieldType === "DateTime") {
      out[key] = new Date(value as string);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** Split an array into batches of `size`. */
export function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}
