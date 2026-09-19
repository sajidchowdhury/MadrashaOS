/**
 * MadrashaOS — API Validation Schemas
 *
 * Phase B3.1 — Organization & Multi-Branch API
 *
 * Zod schemas for request body validation. Every API endpoint that
 * accepts a body validates against a schema from this file.
 */

import { z } from "zod";

/* --- Organization --- */

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  name_bn: z.string().min(1).max(255).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional(),
  address: z.string().max(1000).optional(),
  logo_url: z.string().url().optional(),
  website_url: z.string().url().optional(),
  established_year: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  settings: z.record(z.unknown()).optional(),
});

/* --- Branch --- */

export const createBranchSchema = z.object({
  code: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, "Code must be lowercase alphanumeric with dashes"),
  name: z.string().min(1).max(255),
  name_bn: z.string().min(1).max(255),
  address: z.string().max(1000).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional(),
  established_year: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const updateBranchSchema = createBranchSchema.partial().extend({
  is_active: z.boolean().optional(),
});

/* --- Branch Switch (Risk R1) --- */

export const switchBranchSchema = z.object({
  branch_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
});

/* --- RBAC (Phase B3.3) ---
 *
 * Schemas for the role + permission matrix API.
 * Role codes follow the same convention as branch codes
 * (lowercase alphanumeric with dashes) to stay consistent with the
 * 8 system role codes already seeded (super-admin, authority, …).
 */

export const createRoleSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(50)
    .regex(
      /^[a-z0-9-]+$/,
      "Code must be lowercase alphanumeric with dashes",
    ),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

export const updateRoleSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).optional(),
  })
  .partial();

export const assignPermissionsSchema = z.object({
  permission_codes: z.array(z.string().min(1).max(64)),
});

/* --- Module Toggle (B3.2 / Risk R2) --- */

/**
 * PATCH /api/v1/modules/:id body — toggle a module on/off.
 *
 * Per Risk R2: when toggling OFF a module that has active dependents
 * (e.g. Hostel/Food/Library/Transport/Purchase depend on Inventory),
 * the server returns 409 with `{ error, dependents: string[] }` and the
 * frontend blocks Save until the user disables the dependents first.
 */
export const toggleModuleSchema = z.object({
  enabled: z.boolean(),
});

/* --- Admissions (Phase B4.2) ---
 *
 * Schemas for the admission pipeline API (Kanban + register flow).
 *
 * Status flow (AdmissionStatus enum, see prisma/schema.prisma):
 *   applied → interviewed → approved → registered (terminal)
 *                                          ↘ rejected (terminal)
 * Any non-terminal status can also branch to `rejected`.
 *
 * `desired_class_id` in the body is a UUID that references the Class table,
 * stored on Admission.desired_class as a string (the Admission schema models
 * it as a free-form string rather than a FK to keep historical applications
 * intact even if the class is later renamed or deleted).
 */

export const createAdmissionSchema = z.object({
  applicant_name: z.string().min(1).max(255),
  applicant_name_bn: z.string().max(255).optional(),
  // Contact phone + email for the family (stored as parent_phone + parent_email).
  phone: z.string().min(1).max(50),
  email: z.string().email().max(255).optional(),
  desired_class_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  previous_education: z.record(z.string(), z.unknown()).optional(),
  guardian_name: z.string().min(1).max(255),
  guardian_phone: z.string().min(1).max(50),
});

export const updateAdmissionSchema = z.object({
  applicant_name: z.string().min(1).max(255).optional(),
  applicant_name_bn: z.string().max(255).optional(),
  phone: z.string().min(1).max(50).optional(),
  email: z.string().email().max(255).optional().or(z.literal("")),
  desired_class_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).optional(),
  previous_education: z.record(z.string(), z.unknown()).optional(),
  guardian_name: z.string().min(1).max(255).optional(),
  guardian_phone: z.string().min(1).max(50).optional(),
  notes: z.string().max(2000).optional(),
});

/**
 * PATCH /api/v1/admissions/:id/status body — move between pipeline stages.
 *
 * `status` is restricted to the 4 non-initial statuses (you can't move TO
 * "applied" — that's the default on POST /admissions). Server validates the
 * transition against the allowed-edges map before persisting.
 *
 * `rejection_reason` is REQUIRED when status === "rejected" (enforced in
 * the route handler, not the schema, so the validation message can include
 * the existing status for context).
 */
export const updateAdmissionStatusSchema = z.object({
  status: z.enum(["interviewed", "approved", "registered", "rejected"]),
  rejection_reason: z.string().max(1000).optional(),
});

/**
 * POST /api/v1/admissions/:id/register body — optional overrides for the
 * Student record created from the admission. The route handler falls back
 * to sensible defaults when these are absent (gender=male, dob=today-10y,
 * roll=next-available-in-class).
 */
export const registerStudentSchema = z.object({
  gender: z.enum(["male", "female"]).optional(),
  dob: z.iso.datetime().optional(),
  roll: z.number().int().min(1).max(999).optional(),
});

/* --- Student (Phase B4.1) --- */

/**
 * Gender enum mirrors the Prisma `Gender` enum (male | female).
 */
export const studentGenderSchema = z.enum(["male", "female"]);

/**
 * StudentStatus enum mirrors the Prisma `StudentStatus` enum.
 * Used by updateStudentSchema.status and the soft-delete flow.
 */
export const studentStatusSchema = z.enum(["active", "graduated", "withdrawn"]);

/**
 * POST /api/v1/students body — create a new student.
 *
 * `code` is optional: when omitted, the server auto-generates one in
 * the format `MOS-{year}-{sequence}` (see students/route.ts).
 * `guardian_relation` defaults to "father" if not provided.
 */
export const createStudentSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(255),
  name_bn: z.string().min(1).max(255),
  name_ar: z.string().max(255).optional(),
  class_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  section_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).optional(),
  guardian_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  guardian_relation: z.string().min(1).max(50).optional(),
  roll: z.number().int().min(1),
  gender: studentGenderSchema,
  dob: z.coerce.date(),
  blood_group: z.string().max(10).optional(),
  present_address: z.string().max(1000).optional(),
  permanent_address: z.string().max(1000).optional(),
});

/**
 * PATCH /api/v1/students/:id body — partial update of a student.
 *
 * All fields from createStudentSchema are optional here, plus a few
 * updatable profile fields not in the create payload (status,
 * special_notes, photo_url, previous_school, blood_donor, phone, email).
 * `code` is intentionally NOT editable here — it's the human-facing
 * identifier and must be immutable after creation (regenerate via
 * dedicated admin tooling if needed).
 */
export const updateStudentSchema = createStudentSchema
  .omit({ code: true })
  .partial()
  .extend({
    status: studentStatusSchema.optional(),
    special_notes: z.string().max(5000).optional(),
    photo_url: z.string().url().optional(),
    previous_school: z.string().max(500).optional(),
    blood_donor: z.boolean().optional(),
    phone: z.string().max(50).optional(),
    email: z.string().email().optional(),
  });

/**
 * POST /api/v1/students/:id/promote body — promote / reassign a student.
 *
 * Risk R4 (Promotion Wizard History Lock-in):
 *   The old (class_id, section_id) assignment is preserved as a row in
 *   `StudentHistory` with action="promoted" and the `effective_date` /
 *   `reason` provided here. The Student row is then updated to point at
 *   the new (to_class_id, to_section_id). The history row is never
 *   deleted — it appears as a past chip in the wizard's timeline panel.
 *
 * `to_section_id` is optional (some classes have no sections).
 */
export const promoteStudentSchema = z.object({
  to_class_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  to_section_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).optional(),
  effective_date: z.coerce.date(),
  reason: z.string().min(1).max(1000),
});

/* --- Employee (Phase B4.4) ---
 *
 * Schemas for the Employee (non-teaching staff) API.
 *
 * Employees are people-layer records (1:1 with a User account) for
 * accountants, librarians, storekeepers, clerks, drivers, cooks, guards
 * and similar non-teaching staff (per the Employee.designation field in
 * prisma/schema.prisma). A User account is provisioned alongside each
 * Employee so the staff member can sign in to MadrashaOS.
 *
 * Status values follow the SRS §2.2.6 lifecycle:
 *   active → on-leave → resigned
 * DELETE soft-deletes (sets status='resigned' + deleted_at) AND disables
 * the linked User account so resigned staff cannot log in.
 */

/**
 * Valid employee status values per SRS §2.2.6 + the Employee.status column.
 * Kept as a string enum (not the Prisma enum) so unknown values surface as
 * a clean Zod error rather than a Prisma runtime crash.
 */
export const employeeStatusSchema = z.enum(["active", "on-leave", "resigned"]);

export const createEmployeeSchema = z.object({
  name: z.string().min(1).max(255),
  name_bn: z.string().min(1).max(255).optional(),
  designation: z.string().min(1).max(100),
  phone: z.string().min(1).max(50),
  email: z.string().email().min(3).max(255),
  salary: z.number().nonnegative().max(10_000_000).optional(),
  joining_date: z.string().datetime(),
  branch_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).optional(),
  // Optional — when omitted the User is linked to the closest matching
  // non-teaching staff role in the org (defaults to "storekeeper").
  role_code: z.string().min(1).max(50).optional(),
  // Optional — when omitted the server generates a 12-char temp password
  // (per SRS §6.2.3 R-S2) and returns it once in the create response so
  // the admin can hand it to the new employee out-of-band.
  temp_password: z.string().min(8).max(128).optional(),
});

export const updateEmployeeSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    name_bn: z.string().min(1).max(255).optional(),
    designation: z.string().min(1).max(100).optional(),
    phone: z.string().min(1).max(50).optional(),
    email: z.string().email().min(3).max(255).optional(),
    salary: z.number().nonnegative().max(10_000_000).optional(),
    joining_date: z.string().datetime().optional(),
    branch_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).nullable().optional(),
    department: z.string().min(1).max(100).optional(),
    nid_number: z.string().min(1).max(100).optional(),
    photo_url: z.string().url().optional(),
    status: employeeStatusSchema.optional(),
  })
  .partial();

/* --- People (Phase B4) ---
 *
 * Schemas for Guardian + Teacher CRUD endpoints.
 * Guardian has `@@unique([organization_id, phone])` — the API checks
 * for collisions before INSERT and returns a clean 409 instead of
 * surfacing the raw Prisma P2002 error.
 * Teacher has `@@unique([organization_id, employee_code])` + a separate
 * `@@unique([user_id])` (1:1 with a User row of role `teacher`).
 * TeacherAssignment has `@@unique([organization_id, academic_year,
 * teacher_id, class_id, section_id, subject_id])` — duplicate-active-
 * assignment block is enforced by an explicit `findFirst` against
 * `is_active: true` (matches the frontend duplicate-active-assignment
 * inline rule spec'd in B4.3) and returns 409 with a structured body.
 */

/* --- Guardian --- */

export const createGuardianSchema = z.object({
  name: z.string().min(1).max(255),
  name_bn: z.string().max(255).optional(),
  phone: z.string().min(1).max(50),
  email: z.string().email().optional(),
  occupation: z.string().max(255).optional(),
  relation: z
    .enum(["father", "mother", "uncle", "aunt", "guardian", "other"])
    .default("father"),
  nid_number: z.string().max(100).optional(),
  annual_income: z.number().nonnegative().optional(),
  is_primary: z.boolean().optional(),
  address: z.string().max(1000).optional(),
  user_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).optional(), // optional link to a User account (guardian portal login)
  branch_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).optional(), // optional: scope to a specific branch
});

export const updateGuardianSchema = createGuardianSchema.partial().extend({
  // `relation` is optional on PATCH; allow any of the 6 enum values.
  relation: z
    .enum(["father", "mother", "uncle", "aunt", "guardian", "other"])
    .optional(),
});

/* --- Teacher --- */

export const createTeacherSchema = z.object({
  user_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  employee_code: z
    .string()
    .min(1)
    .max(50)
    .regex(
      /^[a-z0-9-]+$/i,
      "Employee code must be alphanumeric with dashes",
    ),
  designation: z.string().max(100).optional(),
  qualification: z.string().max(500).optional(),
  specialization: z.string().max(255).optional(),
  joined_at: z.string().datetime(), // ISO 8601 — coerced to a Date in the route handler
  salary: z.number().nonnegative().optional(),
  status: z.enum(["active", "on-leave", "resigned"]).default("active"),
  phone: z.string().max(50).optional(),
  nid_number: z.string().max(100).optional(),
  photo_url: z.string().url().optional(),
  branch_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).optional(), // optional: scope to a specific branch
});

export const updateTeacherSchema = createTeacherSchema
  .omit({ user_id: true }) // user_id is immutable after create (Teacher ↔ User is 1:1)
  .partial()
  .extend({
    status: z.enum(["active", "on-leave", "resigned"]).optional(),
    left_at: z.string().datetime().optional().nullable(),
  });

/* --- Teacher Assignment --- */

export const assignTeacherSchema = z.object({
  teacher_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  class_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  section_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).optional().nullable(), // null = all sections
  subject_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  is_class_teacher: z.boolean().optional(), // if true AND section_id present → also set Section.teacher_id
  academic_year: z.number().int().min(2000).max(2100).optional(), // defaults to current year
  notes: z.string().max(2000).optional(),
});
