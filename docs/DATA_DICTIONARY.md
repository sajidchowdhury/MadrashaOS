# MadrashaOS — Data Dictionary

> **Phase B0 · Task B0.2**
>
> Table-by-table field reference for the 52-table PostgreSQL schema that
> implements MadrashaOS. Each entry documents the module layer, description,
> columns (with type, nullability, default, index, and description),
> relations, and constraints.
>
> Companion document: [`ERD.md`](./ERD.md) — visual Mermaid diagrams +
> conventions + index strategy.

---

## How to Read This Document

### Base Mixin (applied to every table)

The following 8 columns exist on **every** table except where noted. They
are omitted from the per-table column listings below for brevity — assume
they exist unless a table explicitly excludes one.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | NO | `uuid_generate_v4()` | PK | Primary key. |
| `organization_id` | `uuid` | NO | — | FK → `organizations.id` + composite `(organization_id, branch_id)` | Tenant isolation. NULL only on `organizations` itself. |
| `branch_id` | `uuid` | YES | NULL | FK → `branches.id` + composite `(organization_id, branch_id)` | Branch scope. NULL for platform-level tables. |
| `created_at` | `timestamptz` | NO | `NOW()` | `(created_at DESC)` | Record creation. |
| `updated_at` | `timestamptz` | NO | `NOW()` | — | Last update. Updated via Prisma middleware. |
| `deleted_at` | `timestamptz` | YES | NULL | partial `WHERE deleted_at IS NULL` | Soft-delete timestamp (BP7). |
| `created_by` | `uuid` | YES | NULL | FK → `users.id` | Creator user. |
| `updated_by` | `uuid` | YES | NULL | FK → `users.id` | Last updater user. |

### Type shorthand

| Shorthand | Postgres type |
|---|---|
| `uuid` | `uuid` |
| `string` | `varchar(255)` |
| `text` | `text` |
| `int` | `integer` |
| `bigint` | `bigint` |
| `numeric` | `numeric(14, 2)` (for money / decimal) |
| `bool` | `boolean` |
| `date` | `date` |
| `time` | `time` |
| `timestamptz` | `timestamptz` |
| `jsonb` | `jsonb` |
| `enum:X` | `CREATE TYPE X AS ENUM (...)` |

### Conventions recap

- Snake_case table + column names (BP8).
- Plural table names (`students`, `fee_payments`).
- UUID primary keys with `uuid_generate_v4()` default (BP9).
- `*_at` suffix for all timestamps.
- `*_id` suffix for all foreign keys.
- Money columns use `numeric(14, 2)` (BDT taka, not paisa).
- Soft delete via `deleted_at` (BP7); queries filter `WHERE deleted_at IS NULL`.

---

## Table of Contents

1. [Foundation Layer (10 tables)](#1-foundation-layer)
2. [People Layer (9 tables)](#2-people-layer)
3. [Academic Layer (8 tables)](#3-academic-layer)
4. [Finance Layer (9 tables)](#4-finance-layer)
5. [Operations Layer (12 tables)](#5-operations-layer)
6. [Communication Layer (4 tables)](#6-communication-layer)

---

## 1. Foundation Layer

### 1.1 `organizations`

**Module:** Foundation
**Description:** Top-level tenant — a single madrasha trust. Root of the multi-tenant tree.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `id` | `uuid` | NO | `uuid_generate_v4()` | PK | Primary key. |
| `name` | `string` | NO | — | — | English name (e.g. "Darul Uloom Madrasha"). |
| `name_bn` | `string` | NO | — | — | Bangla name. |
| `slug` | `string` | NO | — | UNIQUE | URL-safe identifier. |
| `phone` | `string` | YES | NULL | — | Contact phone. |
| `email` | `string` | YES | NULL | — | Contact email. |
| `address` | `text` | YES | NULL | — | Headquarters address. |
| `logo_url` | `string` | YES | NULL | — | CDN URL of org logo. |
| `website_url` | `string` | YES | NULL | — | Public website. |
| `established_year` | `int` | YES | NULL | — | Founding year. |
| `settings` | `jsonb` | NO | `'{}'` | — | Org-level JSON settings (locale, currency, academic year start). |
| `created_at` | `timestamptz` | NO | `NOW()` | — | Creation. |
| `updated_at` | `timestamptz` | NO | `NOW()` | — | Last update. |
| `deleted_at` | `timestamptz` | YES | NULL | partial | Soft delete. |
| `created_by` | `uuid` | YES | NULL | FK → `users.id` | Creator (NULL for self-created org during provisioning). |
| `updated_by` | `uuid` | YES | NULL | FK → `users.id` | Last updater. |

**Note:** `organization_id` is omitted — `organizations` IS the tenant root.
`branch_id` is omitted — platform-level entity.

**Relations:**
- 1:M → `branches`
- 1:M → `users`
- 1:M → `module_configs`
- 1:M → `security_policies`
- 1:M → `backup_records`
- 1:M → `audit_logs`
- 1:M → (every other table via `organization_id` FK)

**Constraints:**
- UNIQUE(`slug`)
- CHECK (`established_year >= 1900`)

---

### 1.2 `branches`

**Module:** Foundation
**Description:** Campus / branch under an organization. Three seeded: Dhaka, Chittagong, Sylhet.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `code` | `string` | NO | — | UNIQUE `(organization_id, code)` | Short code (`dhaka`, `chittagong`, `sylhet`). |
| `name` | `string` | NO | — | — | English branch name. |
| `name_bn` | `string` | NO | — | — | Bangla branch name. |
| `address` | `text` | YES | NULL | — | Branch address. |
| `phone` | `string` | YES | NULL | — | Branch phone. |
| `email` | `string` | YES | NULL | — | Branch email. |
| `established_year` | `int` | YES | NULL | — | Year branch was opened. |
| `is_active` | `bool` | NO | `true` | — | Soft-toggle without deleting. |
| `latitude` | `numeric` | YES | NULL | — | Geo coordinate (optional). |
| `longitude` | `numeric` | YES | NULL | — | Geo coordinate (optional). |

**Relations:**
- M:1 → `organizations` (`organization_id`)
- 1:M → `users`
- 1:M → `students`, `teachers`, `employees`, `classes`, etc. (every tenant-scoped table)

**Constraints:**
- UNIQUE(`organization_id`, `code`)
- CHECK (`established_year >= 1900`)

---

### 1.3 `users`

**Module:** Foundation
**Description:** Login accounts. Each user has exactly one `role_id` and is scoped to a `branch_id`.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `role_id` | `uuid` | NO | — | FK → `roles.id` | User's primary role (one of the 8 personas). |
| `name` | `string` | NO | — | — | English display name. |
| `name_bn` | `string` | YES | NULL | — | Bangla name. |
| `email` | `string` | NO | — | UNIQUE `(organization_id, email)` | Login email. |
| `phone` | `string` | YES | NULL | — | Contact phone. |
| `password_hash` | `string` | NO | — | — | bcrypt hash (cost 12). |
| `avatar_initial` | `string(2)` | YES | NULL | — | 1-2 letter initial for avatar fallback. |
| `avatar_url` | `string` | YES | NULL | — | CDN URL of uploaded avatar. |
| `status` | `enum:UserStatus` | NO | `'active'` | — | `active` | `disabled` | `locked`. |
| `last_login_at` | `timestamptz` | YES | NULL | — | Last successful login. |
| `last_login_ip` | `string` | YES | NULL | — | Last login IP (audit). |
| `mfa_secret` | `string` | YES | NULL | — | TOTP secret (encrypted at rest). |
| `mfa_enabled` | `bool` | NO | `false` | — | MFA on/off. |
| `failed_login_count` | `int` | NO | `0` | — | For lockout policy. |
| `locked_until` | `timestamptz` | YES | NULL | — | Lockout expiry. |
| `preferences` | `jsonb` | NO | `'{}'` | — | UI prefs (locale, theme, default dashboard). |

**Relations:**
- M:1 → `organizations` (`organization_id`)
- M:1 → `branches` (`branch_id`)
- M:1 → `roles` (`role_id`)
- 1:1 → `teachers` (optional — when role is `teacher`)
- 1:1 → `employees` (optional — when role is `administrator`/`accountant`/`storekeeper`)
- 1:M → `audit_logs` (as actor)
- 1:M → `fee_payments` (as `collected_by`)
- 1:M → `ledger_entries` (as `posted_by`)
- 1:M → `notices` (as `sent_by`)
- 1:M → `approvals` (as `requested_by` and `decided_by`)
- 1:M → (every table via `created_by` / `updated_by`)

**Constraints:**
- UNIQUE(`organization_id`, `email`)
- CHECK (`status IN ('active','disabled','locked')`)
- CHECK (`failed_login_count >= 0`)

---

### 1.4 `roles`

**Module:** Foundation
**Description:** The 8 personas from `stores/types.ts`. System roles cannot be deleted.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `code` | `string` | NO | — | UNIQUE `(organization_id, code)` | One of: `super-admin`, `authority`, `administrator`, `accountant`, `teacher`, `storekeeper`, `guardian`, `student`. |
| `name` | `string` | NO | — | — | English label. |
| `name_bn` | `string` | YES | NULL | — | Bangla label. |
| `description` | `text` | YES | NULL | — | Human-readable description. |
| `is_system` | `bool` | NO | `false` | — | `true` for the 8 seeded roles — cannot delete. |
| `is_platform` | `bool` | NO | `false` | — | `true` for `super-admin` only (cross-tenant). |
| `priority` | `int` | NO | `100` | — | Sort order in role pickers. |

**Relations:**
- M:1 → `organizations` (`organization_id` — NULL for system/platform roles)
- 1:M → `users`
- M:M → `permissions` (via `role_permissions`)

**Constraints:**
- UNIQUE(`organization_id`, `code`)
- CHECK (`code IN ('super-admin','authority','administrator','accountant','teacher','storekeeper','guardian','student') OR is_system = false`)

---

### 1.5 `permissions`

**Module:** Foundation
**Description:** Catalog of the 110+ permission codes from `src/lib/auth/permissions.ts`. Seeded globally.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `code` | `string(64)` | NO | — | UNIQUE | Dotted code (e.g. `fees.payment.create`). |
| `module` | `string` | NO | — | idx | Module layer: `foundation|people|academic|finance|operations|communication`. |
| `name` | `string` | NO | — | — | English human label. |
| `description` | `text` | YES | NULL | — | What the permission grants. |
| `is_system` | `bool` | NO | `true` | — | System permissions cannot be deleted. |
| `is_scoped` | `bool` | NO | `false` | — | `true` for `*.view.own` / `*.create.own` (e.g. guardian scoped). |

**Relations:**
- M:M → `roles` (via `role_permissions`)

**Constraints:**
- UNIQUE(`code`)
- CHECK (`module IN ('foundation','people','academic','finance','operations','communication')`)

> Note: `organization_id` and `branch_id` are NULL on `permissions` rows
> (catalog is global, not per tenant). This is the documented exception
> to the multi-tenant rule.

---

### 1.6 `role_permissions`

**Module:** Foundation
**Description:** M:M junction between `roles` and `permissions`. Carries the grant timestamp.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `role_id` | `uuid` | NO | — | FK → `roles.id` + UNIQUE `(role_id, permission_id)` | Granted role. |
| `permission_id` | `uuid` | NO | — | FK → `permissions.id` + UNIQUE `(role_id, permission_id)` | Granted permission. |
| `granted_at` | `timestamptz` | NO | `NOW()` | — | When the grant was made. |
| `granted_by` | `uuid` | YES | NULL | FK → `users.id` | Who granted (NULL for seed). |
| `scope_note` | `text` | YES | NULL | — | Optional context (e.g. "temporary escalation"). |

**Relations:**
- M:1 → `roles`
- M:1 → `permissions`

**Constraints:**
- UNIQUE(`role_id`, `permission_id`) — no duplicate grants.

---

### 1.7 `audit_logs`

**Module:** Foundation
**Description:** Field-level diff audit trail (SRS §2.1.4, §3.4, BP5). Every write to audited entities produces a row here.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `actor_user_id` | `uuid` | YES | NULL | FK → `users.id` + idx | The user who performed the action. NULL for system actions. |
| `action` | `string` | NO | — | idx | `create` | `update` | `delete` | `login` | `logout` | `approve` | `reject` | `post` | `publish` | ... |
| `entity_type` | `string` | NO | — | composite `(entity_type, entity_id)` | Table name being audited (e.g. `students`, `fee_payments`). |
| `entity_id` | `uuid` | NO | — | composite `(entity_type, entity_id)` | PK of the audited row. |
| `before` | `jsonb` | YES | NULL | — | Full row snapshot before change (NULL for create). |
| `after` | `jsonb` | YES | NULL | — | Full row snapshot after change (NULL for delete). |
| `diff_summary` | `text` | YES | NULL | — | Human-readable field-level diff. |
| `ip_address` | `string` | YES | NULL | — | Request IP. |
| `user_agent` | `text` | YES | NULL | — | Request UA. |
| `request_id` | `string` | YES | NULL | — | Correlation ID for traceability. |
| `session_id` | `string` | YES | NULL | — | NextAuth session ID. |

**Relations:**
- M:1 → `organizations` (`organization_id`)
- M:1 → `branches` (`branch_id`)
- M:1 → `users` (`actor_user_id`)

**Constraints:**
- CHECK (`action IS NOT NULL AND action <> ''`)
- CHECK (`entity_type IS NOT NULL AND entity_id IS NOT NULL`)

---

### 1.8 `module_configs`

**Module:** Foundation
**Description:** Per-branch module on/off toggles (SRS §2.1.2). When `branch_id` is NULL, the row is the org-level default.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `module_key` | `string` | NO | — | UNIQUE `(organization_id, branch_id, module_key)` | One of: `fees`, `accounting`, `zakat`, `hostel`, `library`, `transport`, `food`, `inventory`, `purchase`, `assets`, `donations`, `admissions`, `exams`, `attendance`, `results`, `rbac`, `audit`, `notices`, `documents`, `reports`, `approvals`. |
| `is_enabled` | `bool` | NO | `true` | — | Module on/off. |
| `config` | `jsonb` | NO | `'{}'` | — | Module-specific knobs (e.g. `{"late_fee_pct": 2}`). |
| `display_order` | `int` | NO | `100` | — | Sort order in module grid UI. |

**Relations:**
- M:1 → `organizations`
- M:1 → `branches` (nullable for org-level defaults)

**Constraints:**
- UNIQUE(`organization_id`, `branch_id`, `module_key`)

---

### 1.9 `security_policies`

**Module:** Foundation
**Description:** Password rules, MFA policy, session TTL, IP allowlist. One row per organization.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `password_min_length` | `int` | NO | `8` | — | Minimum password length. |
| `password_require_special` | `bool` | NO | `true` | — | Require at least one special char. |
| `password_require_digit` | `bool` | NO | `true` | — | Require at least one digit. |
| `password_require_upper` | `bool` | NO | `true` | — | Require at least one uppercase. |
| `password_expiry_days` | `int` | NO | `90` | — | Days until password must be rotated (0 = never). |
| `password_history_count` | `int` | NO | `5` | — | Prevent reusing last N passwords. |
| `mfa_required` | `bool` | NO | `false` | — | Force MFA for all users. |
| `mfa_required_roles` | `jsonb` | NO | `'[]'` | — | Array of role codes that must use MFA. |
| `session_ttl_minutes` | `int` | NO | `15` | — | Access token TTL. |
| `refresh_ttl_days` | `int` | NO | `7` | — | Refresh token TTL. |
| `max_concurrent_sessions` | `int` | NO | `3` | — | Per-user concurrent session limit. |
| `ip_allowlist` | `jsonb` | NO | `'[]'` | — | Array of CIDRs allowed to access admin endpoints. |
| `failed_login_lockout_threshold` | `int` | NO | `5` | — | Failed attempts before lockout. |
| `failed_login_lockout_minutes` | `int` | NO | `15` | — | Lockout duration. |

**Relations:**
- M:1 → `organizations` (1:1 enforced by UNIQUE)

**Constraints:**
- UNIQUE(`organization_id`)
- CHECK (`password_min_length >= 6`)
- CHECK (`session_ttl_minutes >= 1`)

---

### 1.10 `backup_records`

**Module:** Foundation
**Description:** Backup run history (manual + scheduled).

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `backup_type` | `string` | NO | — | — | `manual` | `scheduled` | `pre-migration`. |
| `status` | `string` | NO | `'running'` | idx | `running` | `completed` | `failed` | `partial`. |
| `size_bytes` | `bigint` | YES | NULL | — | Final backup size. |
| `storage_url` | `string` | YES | NULL | — | Object storage URL (S3 / local). |
| `storage_type` | `string` | YES | NULL | — | `local` | `s3` | `gcs` | `azure`. |
| `checksum_sha256` | `string` | YES | NULL | — | Backup file SHA-256 for integrity check. |
| `error_message` | `text` | YES | NULL | — | Failure reason if `status = 'failed'`. |
| `triggered_by` | `uuid` | YES | NULL | FK → `users.id` | NULL for scheduled. |
| `started_at` | `timestamptz` | NO | `NOW()` | idx | Backup start time. |
| `completed_at` | `timestamptz` | YES | NULL | — | Backup end time. |
| `table_count` | `int` | YES | NULL | — | Tables included. |
| `row_count` | `bigint` | YES | NULL | — | Total rows backed up. |

**Relations:**
- M:1 → `organizations`
- M:1 → `users` (`triggered_by`)

**Constraints:**
- CHECK (`backup_type IN ('manual','scheduled','pre-migration')`)
- CHECK (`status IN ('running','completed','failed','partial')`)
- CHECK (`completed_at IS NULL OR completed_at >= started_at`)

---

## 2. People Layer

### 2.1 `classes`

**Module:** People
**Description:** Academic grade level (e.g. "Class 5"). Branch-scoped.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `name` | `string` | NO | — | — | English name (e.g. "Class 5"). |
| `name_bn` | `string` | NO | — | — | Bangla name. |
| `level` | `int` | NO | — | — | Numeric level (1-12 typically, higher for Alim/Hifz). |
| `stream` | `string` | YES | NULL | — | `general` | `hifz` | `alim` | `nazera` (for filtering). |
| `is_active` | `bool` | NO | `true` | — | Inactive classes hidden from selectors. |
| `display_order` | `int` | NO | `100` | — | Sort order. |

**Relations:**
- M:1 → `organizations`, `branches`
- 1:M → `sections`
- 1:M → `students`
- 1:M → `routines`
- 1:M → `attendance_sessions`
- 1:M → `exams`
- 1:M → `teacher_assignments`

**Constraints:**
- UNIQUE(`organization_id`, `branch_id`, `name`)
- CHECK (`level >= 0`)

---

### 2.2 `sections`

**Module:** People
**Description:** Section within a class (A, B, C). Each section has a class teacher.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `class_id` | `uuid` | NO | — | FK → `classes.id` + UNIQUE `(class_id, name)` | Parent class. |
| `name` | `string` | NO | — | UNIQUE `(class_id, name)` | Section letter (A, B, C). |
| `capacity` | `int` | NO | `40` | — | Max students per section. |
| `teacher_id` | `uuid` | YES | NULL | FK → `teachers.id` | Class teacher. |
| `room` | `string` | YES | NULL | — | Default room number. |
| `is_active` | `bool` | NO | `true` | — | Soft-toggle. |

**Relations:**
- M:1 → `classes`
- M:1 → `teachers` (`teacher_id`)
- 1:M → `students`
- 1:M → `routines`
- 1:M → `attendance_sessions`
- 1:M → `teacher_assignments`

**Constraints:**
- UNIQUE(`class_id`, `name`)
- CHECK (`capacity >= 1`)

---

### 2.3 `students`

**Module:** People
**Description:** Enrolled student. Linked to `class_id` + `section_id`. Can have multiple guardians via `student_guardians`.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `code` | `string` | NO | — | UNIQUE `(organization_id, code)` | Student code (e.g. `MOS-2026-001`). |
| `name` | `string` | NO | — | — | English name. |
| `name_bn` | `string` | NO | — | — | Bangla name. |
| `name_ar` | `string` | YES | NULL | — | Arabic name (optional). |
| `class_id` | `uuid` | NO | — | FK → `classes.id` + idx | Current class. |
| `section_id` | `uuid` | YES | NULL | FK → `sections.id` + idx | Current section. |
| `roll` | `int` | NO | — | — | Roll number within section. |
| `gender` | `enum:Gender` | NO | — | — | `male` | `female`. |
| `dob` | `date` | NO | — | — | Date of birth. |
| `blood_group` | `string` | YES | NULL | — | A+/A-/B+/... |
| `present_address` | `text` | YES | NULL | — | Current address. |
| `permanent_address` | `text` | YES | NULL | — | Permanent address. |
| `phone` | `string` | YES | NULL | — | Student phone (senior students). |
| `email` | `string` | YES | NULL | — | Student email. |
| `admitted_at` | `date` | NO | — | idx | Admission date. |
| `status` | `enum:StudentStatus` | NO | `'active'` | idx | `active` | `graduated` | `withdrawn`. |
| `special_notes` | `text` | YES | NULL | — | Permission-gated field — `students.notes.view` required. |
| `photo_url` | `string` | YES | NULL | — | Student photo. |
| `previous_school` | `string` | YES | NULL | — | Prior institution. |
| `blood_donor` | `bool` | NO | `false` | — | Whether student is willing to donate blood (rare use). |

**Relations:**
- M:1 → `classes`, `sections`
- M:M → `guardians` (via `student_guardians`)
- 1:M → `fee_plans`, `fee_payments`
- 1:M → `attendance_records`
- 1:M → `marks`, `results`
- 1:M → `student_history`
- 1:M → `library_issues`
- 1:M → `hostel_beds`
- 1:M → `zakat_transactions` (as recipient)

**Constraints:**
- UNIQUE(`organization_id`, `code`)
- UNIQUE(`section_id`, `roll`) — roll unique within section
- CHECK (`gender IN ('male','female')`)
- CHECK (`status IN ('active','graduated','withdrawn')`)
- CHECK (`dob <= CURRENT_DATE`)

---

### 2.4 `guardians`

**Module:** People
**Description:** Parent / guardian contact. A guardian can be linked to multiple students (siblings).

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `name` | `string` | NO | — | — | English name. |
| `name_bn` | `string` | YES | NULL | — | Bangla name. |
| `phone` | `string` | NO | — | idx | Primary phone. |
| `email` | `string` | YES | NULL | — | Email. |
| `occupation` | `string` | YES | NULL | — | Occupation. |
| `relation` | `string` | NO | `'father'` | — | `father` | `mother` | `uncle` | `aunt` | `guardian` | `other`. |
| `nid_number` | `string` | YES | NULL | — | National ID number. |
| `annual_income` | `numeric` | YES | NULL | — | For scholarship eligibility. |
| `is_primary` | `bool` | NO | `true` | — | Primary contact. |
| `address` | `text` | YES | NULL | — | Address. |
| `user_id` | `uuid` | YES | NULL | FK → `users.id` | Linked user account (for guardian portal login). |

**Relations:**
- M:M → `students` (via `student_guardians`)
- M:1 → `users` (`user_id`)

**Constraints:**
- UNIQUE(`organization_id`, `phone`) — same phone = same guardian
- CHECK (`relation IN ('father','mother','uncle','aunt','guardian','other')`)

---

### 2.5 `student_guardians`

**Module:** People
**Description:** M:M junction between students and guardians — a student can have multiple guardians.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `student_id` | `uuid` | NO | — | FK + UNIQUE `(student_id, guardian_id)` | Student. |
| `guardian_id` | `uuid` | NO | — | FK + UNIQUE `(student_id, guardian_id)` | Guardian. |
| `relation` | `string` | NO | — | — | `father` | `mother` | `uncle` | `aunt` | `guardian` | `other`. |
| `is_primary` | `bool` | NO | `false` | — | Primary guardian for this student. |
| `can_pickup` | `bool` | NO | `true` | — | Allowed to pick up student. |
| `receive_sms` | `bool` | NO | `true` | — | Receives SMS notifications. |
| `receive_email` | `bool` | NO | `false` | — | Receives email notifications. |

**Relations:**
- M:1 → `students`
- M:1 → `guardians`

**Constraints:**
- UNIQUE(`student_id`, `guardian_id`)
- CHECK (`relation IN ('father','mother','uncle','aunt','guardian','other')`)

---

### 2.6 `teachers`

**Module:** People
**Description:** Teacher profile. 1:1 with a `users` row of role `teacher`.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `user_id` | `uuid` | NO | — | FK → `users.id` UNIQUE | 1:1 with users. |
| `employee_code` | `string` | NO | — | UNIQUE `(organization_id, employee_code)` | Internal code. |
| `designation` | `string` | YES | NULL | — | `lecturer` | `senior-lecturer` | `head-teacher` | `qari` | `qaria` | ... |
| `qualification` | `text` | YES | NULL | — | Degrees / certifications. |
| `specialization` | `string` | YES | NULL | — | Quran, Hadith, Fiqh, Bangla, Math, … |
| `joined_at` | `date` | NO | — | idx | Joining date. |
| `left_at` | `date` | YES | NULL | — | Resignation date. |
| `salary` | `numeric` | YES | NULL | — | Monthly salary (BDT). |
| `status` | `string` | NO | `'active'` | idx | `active` | `on-leave` | `resigned`. |
| `phone` | `string` | YES | NULL | — | Phone (if different from user). |
| `nid_number` | `string` | YES | NULL | — | National ID. |
| `photo_url` | `string` | YES | NULL | — | Photo. |

**Relations:**
- 1:1 → `users`
- 1:M → `teacher_assignments`
- 1:M → `routines` (as `teacher_id`)
- 1:M → `attendance_sessions` (as `taken_by`)
- 1:M → `marks` (as `entered_by`)
- 1:M → `sections` (as class teacher)

**Constraints:**
- UNIQUE(`organization_id`, `employee_code`)
- UNIQUE(`user_id`)
- CHECK (`status IN ('active','on-leave','resigned')`)
- CHECK (`salary IS NULL OR salary >= 0`)

---

### 2.7 `employees`

**Module:** People
**Description:** Non-teaching staff (accountant, librarian, storekeeper, …). 1:1 with a `users` row.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `user_id` | `uuid` | NO | — | FK → `users.id` UNIQUE | 1:1 with users. |
| `employee_code` | `string` | NO | — | UNIQUE `(organization_id, employee_code)` | Internal code. |
| `designation` | `string` | NO | — | — | `accountant` | `librarian` | `storekeeper` | `clerk` | `driver` | `cook` | `guard` | ... |
| `department` | `string` | YES | NULL | — | `finance` | `operations` | `library` | `hostel` | `transport` | `administration`. |
| `joined_at` | `date` | NO | — | idx | Joining date. |
| `left_at` | `date` | YES | NULL | — | Last working date. |
| `salary` | `numeric` | YES | NULL | — | Monthly salary. |
| `status` | `string` | NO | `'active'` | idx | `active` | `on-leave` | `resigned`. |
| `nid_number` | `string` | YES | NULL | — | National ID. |
| `photo_url` | `string` | YES | NULL | — | Photo. |
| `phone` | `string` | YES | NULL | — | Phone (if different from user). |

**Relations:**
- 1:1 → `users`

**Constraints:**
- UNIQUE(`organization_id`, `employee_code`)
- UNIQUE(`user_id`)
- CHECK (`status IN ('active','on-leave','resigned')`)
- CHECK (`salary IS NULL OR salary >= 0`)

---

### 2.8 `admissions`

**Module:** People
**Description:** Admission pipeline (pending → approved → student created).

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `applicant_name` | `string` | NO | — | idx | English name. |
| `applicant_name_bn` | `string` | YES | NULL | — | Bangla name. |
| `parent_name` | `string` | NO | — | — | Parent/guardian name. |
| `parent_phone` | `string` | NO | — | idx | Parent phone. |
| `parent_email` | `string` | YES | NULL | — | Parent email. |
| `desired_class` | `string` | YES | NULL | — | Requested class name. |
| `desired_program` | `string` | YES | NULL | — | `alim` | `nazera` | `hifz` | `tajweed` | `arabic` | `one-to-one`. |
| `previous_education` | `jsonb` | YES | NULL | — | Array of prior schooling. |
| `notes` | `text` | YES | NULL | — | Free-form notes. |
| `status` | `enum:AdmissionStatus` | NO | `'pending'` | idx | `pending` | `approved` | `rejected` | `enrolled`. |
| `student_id` | `uuid` | YES | NULL | FK → `students.id` | Set when `status = 'enrolled'`. |
| `requested_by` | `uuid` | YES | NULL | FK → `users.id` | NULL for public form submissions. |
| `decided_by` | `uuid` | YES | NULL | FK → `users.id` | Authority/admin who decided. |
| `decided_at` | `timestamptz` | YES | NULL | — | Decision timestamp. |
| `rejection_reason` | `text` | YES | NULL | — | If rejected. |
| `submitted_at` | `timestamptz` | NO | `NOW()` | — | When application was submitted. |
| `form_source` | `string` | NO | `'public'` | — | `public` | `office`. |

**Relations:**
- M:1 → `students` (`student_id` — set on enrollment)
- M:1 → `users` (`requested_by`, `decided_by`)

**Constraints:**
- CHECK (`status IN ('pending','approved','rejected','enrolled')`)
- CHECK (`status = 'enrolled' AND student_id IS NOT NULL` OR `status <> 'enrolled'`)
- CHECK (`requested_by IS DISTINCT FROM decided_by`) — D16

---

### 2.9 `teacher_assignments`

**Module:** People
**Description:** Teacher × Class × Section × Subject assignment. Used by routines + marks entry scoping.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `teacher_id` | `uuid` | NO | — | FK + idx | Assigned teacher. |
| `class_id` | `uuid` | NO | — | FK + idx | Target class. |
| `section_id` | `uuid` | YES | NULL | FK | Target section (NULL = all sections). |
| `subject_id` | `uuid` | NO | — | FK → `subjects.id` | Subject taught. |
| `academic_year` | `int` | NO | — | — | Year (e.g. 2026). |
| `is_active` | `bool` | NO | `true` | — | Soft-toggle. |
| `notes` | `text` | YES | NULL | — | Free-form. |

**Relations:**
- M:1 → `teachers`
- M:1 → `classes`, `sections`
- M:1 → `subjects`

**Constraints:**
- UNIQUE(`organization_id`, `academic_year`, `teacher_id`, `class_id`, `section_id`, `subject_id`)

---

## 3. Academic Layer

### 3.1 `subjects`

**Module:** Academic
**Description:** Subject catalog. Quranic subjects flagged for routing.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `code` | `string` | NO | — | UNIQUE `(organization_id, code)` | e.g. `QUR-101`, `BAN-201`. |
| `name` | `string` | NO | — | — | English name. |
| `name_bn` | `string` | YES | NULL | — | Bangla name. |
| `name_ar` | `string` | YES | NULL | — | Arabic name (for Quranic subjects). |
| `is_quranic` | `bool` | NO | `false` | idx | `true` for Quran/Hadith/Tajweed. |
| `category` | `string` | YES | NULL | — | `quranic` | `language` | `science` | `social` | `arts`. |
| `full_marks` | `int` | NO | `100` | — | Default full marks per exam. |
| `pass_marks` | `int` | NO | `33` | — | Default pass marks. |
| `is_active` | `bool` | NO | `true` | — | Soft-toggle. |
| `display_order` | `int` | NO | `100` | — | Sort order. |

**Relations:**
- 1:M → `routines`
- 1:M → `exams`
- 1:M → `marks`
- 1:M → `teacher_assignments`

**Constraints:**
- UNIQUE(`organization_id`, `code`)
- CHECK (`full_marks > 0`)
- CHECK (`pass_marks >= 0 AND pass_marks <= full_marks`)

---

### 3.2 `routines`

**Module:** Academic
**Description:** Class × Day × Period × Subject × Teacher slot.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `class_id` | `uuid` | NO | — | FK + idx | Target class. |
| `section_id` | `uuid` | YES | NULL | FK | Section (NULL = all). |
| `subject_id` | `uuid` | NO | — | FK → `subjects.id` | Subject. |
| `teacher_id` | `uuid` | NO | — | FK → `teachers.id` | Teacher. |
| `academic_year` | `int` | NO | — | — | Year. |
| `day_of_week` | `string` | NO | — | — | `sun` | `mon` | `tue` | `wed` | `thu` | `fri` | `sat`. |
| `period_number` | `int` | NO | — | — | 1-based period order. |
| `start_time` | `time` | NO | — | — | Period start. |
| `end_time` | `time` | NO | — | — | Period end. |
| `room` | `string` | YES | NULL | — | Room number. |
| `is_break` | `bool` | NO | `false` | — | `true` for tiffin/break slots. |

**Relations:**
- M:1 → `classes`, `sections`, `subjects`, `teachers`

**Constraints:**
- UNIQUE(`organization_id`, `academic_year`, `class_id`, `section_id`, `day_of_week`, `period_number`)
- CHECK (`day_of_week IN ('sun','mon','tue','wed','thu','fri','sat')`)
- CHECK (`end_time > start_time`)
- CHECK (`period_number >= 1`)

---

### 3.3 `attendance_sessions`

**Module:** Academic
**Description:** One teacher's attendance pass for one class+section+date.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `class_id` | `uuid` | NO | — | FK + idx | Class. |
| `section_id` | `uuid` | YES | NULL | FK | Section. |
| `date` | `date` | NO | — | composite UNIQUE + idx | Attendance date. |
| `taken_by` | `uuid` | NO | — | FK → `users.id` | Teacher who took attendance. |
| `academic_year` | `int` | NO | — | — | Year. |
| `period` | `string` | NO | `'full'` | — | `morning` | `afternoon` | `full`. |
| `submitted_at` | `timestamptz` | YES | NULL | — | Submission timestamp (NULL = draft). |
| `is_locked` | `bool` | NO | `false` | — | After submission, edits require approval. |
| `device_id` | `string` | YES | NULL | — | Offline device ID (Risk R6). |
| `sync_status` | `string` | NO | `'synced'` | idx | `pending` | `synced` | `conflict`. |
| `total_present` | `int` | YES | NULL | — | Cached count. |
| `total_absent` | `int` | YES | NULL | — | Cached count. |

**Relations:**
- M:1 → `classes`, `sections`, `users` (`taken_by`)
- 1:M → `attendance_records`

**Constraints:**
- UNIQUE(`organization_id`, `class_id`, `section_id`, `date`, `period`)
- CHECK (`period IN ('morning','afternoon','full')`)
- CHECK (`sync_status IN ('pending','synced','conflict')`)

---

### 3.4 `attendance_records`

**Module:** Academic
**Description:** Per-student attendance row inside a session.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `session_id` | `uuid` | NO | — | FK + idx | Parent session. |
| `student_id` | `uuid` | NO | — | FK + idx + UNIQUE `(session_id, student_id)` | Student. |
| `status` | `enum:AttendanceStatus` | NO | `'present'` | idx | `present` | `absent` | `late` | `leave`. |
| `note` | `text` | YES | NULL | — | Optional note. |
| `recorded_at` | `timestamptz` | NO | `NOW()` | — | When record was created/updated. |
| `recorded_by` | `uuid` | YES | NULL | FK → `users.id` | Recorder. |

**Relations:**
- M:1 → `attendance_sessions`
- M:1 → `students`

**Constraints:**
- UNIQUE(`session_id`, `student_id`)
- CHECK (`status IN ('present','absent','late','leave')`)

---

### 3.5 `exams`

**Module:** Academic
**Description:** Exam definition (term, date, class, subject).

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `name` | `string` | NO | — | idx | English name. |
| `name_bn` | `string` | YES | NULL | — | Bangla name. |
| `class_id` | `uuid` | NO | — | FK + idx | Class. |
| `subject_id` | `uuid` | YES | NULL | FK → `subjects.id` | Subject (NULL for combined exam). |
| `academic_year` | `int` | NO | — | — | Year. |
| `term` | `string` | NO | `'first'` | — | `first` | `second` | `final` | `test` | `quiz`. |
| `exam_date` | `date` | NO | — | idx | Exam date. |
| `full_marks` | `int` | NO | `100` | — | Total marks. |
| `pass_marks` | `int` | NO | `33` | — | Pass threshold. |
| `status` | `enum:ExamStatus` | NO | `'draft'` | idx | `draft` | `marks-entry` | `published`. |
| `published_by` | `uuid` | YES | NULL | FK → `users.id` | Publisher. |
| `published_at` | `timestamptz` | YES | NULL | — | Publication timestamp. |
| `description` | `text` | YES | NULL | — | Notes. |

**Relations:**
- M:1 → `classes`, `subjects`
- 1:M → `marks`
- 1:M → `results`

**Constraints:**
- UNIQUE(`organization_id`, `academic_year`, `class_id`, `subject_id`, `term`)
- CHECK (`term IN ('first','second','final','test','quiz')`)
- CHECK (`status IN ('draft','marks-entry','published')`)
- CHECK (`full_marks > 0 AND pass_marks >= 0 AND pass_marks <= full_marks`)

---

### 3.6 `marks`

**Module:** Academic
**Description:** One student's mark in one exam × subject.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `exam_id` | `uuid` | NO | — | FK + idx | Exam. |
| `student_id` | `uuid` | NO | — | FK + idx + UNIQUE `(exam_id, student_id, subject_id)` | Student. |
| `subject_id` | `uuid` | NO | — | FK + idx | Subject. |
| `marks_obtained` | `numeric` | NO | — | — | Marks (0 to `exam.full_marks`). |
| `grade` | `enum:MarkGrade` | YES | NULL | idx | Computed grade (`a-plus`, `a`, `a-minus`, `b`, `c`, `d`, `f`). |
| `gpa` | `numeric(3,2)` | YES | NULL | — | Computed GPA for this subject. |
| `remark` | `text` | YES | NULL | — | Optional teacher remark. |
| `entered_by` | `uuid` | YES | NULL | FK → `users.id` | Teacher who entered. |
| `entered_at` | `timestamptz` | NO | `NOW()` | — | Entry timestamp. |
| `is_absent` | `bool` | NO | `false` | — | Student absent for this exam. |

**Relations:**
- M:1 → `exams`, `students`, `subjects`

**Constraints:**
- UNIQUE(`exam_id`, `student_id`, `subject_id`)
- CHECK (`marks_obtained >= 0 AND marks_obtained <= 100`) — full_marks checked at app layer
- CHECK (`grade IN ('a-plus','a','a-minus','b','c','d','f')`)
- CHECK (`gpa IS NULL OR (gpa >= 0 AND gpa <= 5.00)`)

---

### 3.7 `results`

**Module:** Academic
**Description:** Aggregated GPA + position per student × exam.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `exam_id` | `uuid` | NO | — | FK + idx | Exam. |
| `student_id` | `uuid` | NO | — | FK + idx + UNIQUE `(exam_id, student_id)` | Student. |
| `total_marks` | `numeric` | NO | — | — | Sum of marks across subjects. |
| `gpa` | `numeric(3,2)` | NO | — | — | Grade point average (0-5). |
| `grade` | `string` | NO | — | — | Letter grade. |
| `position` | `int` | YES | NULL | — | Rank in class (1-based). |
| `division` | `string` | YES | NULL | — | `first` | `second` | `third`. |
| `is_passed` | `bool` | NO | — | — | Overall pass/fail. |
| `generated_by` | `uuid` | YES | NULL | FK → `users.id` | Generator. |
| `generated_at` | `timestamptz` | NO | `NOW()` | — | Generation timestamp. |
| `remark` | `text` | YES | NULL | — | Overall remark. |

**Relations:**
- M:1 → `exams`, `students`

**Constraints:**
- UNIQUE(`exam_id`, `student_id`)
- CHECK (`gpa >= 0 AND gpa <= 5.00`)
- CHECK (`position IS NULL OR position >= 1`)
- CHECK (`division IS NULL OR division IN ('first','second','third')`)

---

### 3.8 `student_history`

**Module:** Academic
**Description:** Promotion history (Risk R4 — full audit of class changes).

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `student_id` | `uuid` | NO | — | FK + idx | Student. |
| `academic_year` | `int` | NO | — | — | Year this record applies to. |
| `from_class_id` | `uuid` | YES | NULL | FK → `classes.id` | NULL for initial admission. |
| `from_section_id` | `uuid` | YES | NULL | FK → `sections.id` | Previous section. |
| `to_class_id` | `uuid` | NO | — | FK → `classes.id` | New class. |
| `to_section_id` | `uuid` | YES | NULL | FK → `sections.id` | New section. |
| `action` | `string` | NO | — | idx | `admitted` | `promoted` | `demoted` | `transferred` | `graduated` | `withdrawn` | `re-enrolled`. |
| `result_grade` | `string` | YES | NULL | — | Grade from prior year. |
| `result_gpa` | `numeric(3,2)` | YES | NULL | — | GPA from prior year. |
| `remark` | `text` | YES | NULL | — | Notes. |
| `action_by` | `uuid` | YES | NULL | FK → `users.id` | Initiator. |
| `effective_date` | `date` | NO | — | idx | When the change took effect. |

**Relations:**
- M:1 → `students`, `classes` (×2), `sections` (×2), `users`

**Constraints:**
- CHECK (`action IN ('admitted','promoted','demoted','transferred','graduated','withdrawn','re-enrolled')`)
- CHECK (`action = 'admitted' AND from_class_id IS NULL OR action <> 'admitted'`)

---

## 4. Finance Layer

### 4.1 `accounts`

**Module:** Finance
**Description:** Chart of accounts. `fund` column isolates Zakat (C6/D18). Self-referencing tree via `parent_account_id`.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `code` | `string` | NO | — | UNIQUE `(organization_id, code)` | Account code (e.g. `1000`, `2000`). |
| `name` | `string` | NO | — | — | English name. |
| `name_bn` | `string` | YES | NULL | — | Bangla name. |
| `type` | `enum:AccountType` | NO | — | idx | `asset` | `liability` | `equity` | `income` | `expense`. |
| `fund` | `enum:FundType` | NO | `'general'` | idx | `general` | `zakat`. C6 isolation. |
| `balance` | `numeric` | NO | `0` | — | Running balance (BDT). |
| `currency` | `string(3)` | NO | `'BDT'` | — | ISO currency. |
| `parent_account_id` | `uuid` | YES | NULL | FK → `accounts.id` (self-ref) | Parent for tree views. |
| `is_active` | `bool` | NO | `true` | — | Soft-toggle. |
| `is_bank` | `bool` | NO | `false` | — | `true` for bank accounts. |
| `bank_name` | `string` | YES | NULL | — | Bank name (if `is_bank`). |
| `bank_account_no` | `string` | YES | NULL | — | Bank account number. |
| `is_cash` | `bool` | NO | `false` | — | `true` for cash accounts. |
| `description` | `text` | YES | NULL | — | Description. |

**Relations:**
- M:1 → `accounts` (`parent_account_id`)
- 1:M → `accounts` (children)
- 1:M → `ledger_entries` (as `debit_account_id` and `credit_account_id`)
- 1:M → `fee_payments`
- 1:M → `cash_bank_transfers` (×2)
- 1:M → `zakat_transactions`
- 1:M → `donations`

**Constraints:**
- UNIQUE(`organization_id`, `code`)
- CHECK (`type IN ('asset','liability','equity','income','expense')`)
- CHECK (`fund IN ('general','zakat')`)
- CHECK (`balance >= 0 OR type IN ('liability','equity')`) — liabilities/equity can be negative
- CHECK (`is_bank = false OR (bank_name IS NOT NULL AND bank_account_no IS NOT NULL)`)

---

### 4.2 `fee_plans`

**Module:** Finance
**Description:** Yearly fee plan per student.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `student_id` | `uuid` | NO | — | FK + idx + UNIQUE `(student_id, academic_year)` | Student. |
| `academic_year` | `int` | NO | — | — | Academic year. |
| `total_amount` | `numeric` | NO | — | — | Total annual fee. |
| `scholarship_amount` | `numeric` | NO | `0` | — | Total scholarship applied. |
| `net_payable` | `numeric` | NO | — | — | `total_amount - scholarship_amount`. |
| `installment_count` | `int` | NO | `3` | — | Number of installments. |
| `status` | `string` | NO | `'draft'` | idx | `draft` | `active` | `closed`. |
| `notes` | `text` | YES | NULL | — | Notes. |

**Relations:**
- M:1 → `students`
- 1:M → `fee_installments`
- M:1 → `scholarships` (optional — if a scholarship was applied)

**Constraints:**
- UNIQUE(`student_id`, `academic_year`)
- CHECK (`total_amount >= 0 AND scholarship_amount >= 0`)
- CHECK (`scholarship_amount <= total_amount`)
- CHECK (`net_payable = total_amount - scholarship_amount`)
- CHECK (`installment_count >= 1`)

---

### 4.3 `fee_installments`

**Module:** Finance
**Description:** Installment schedule under a fee plan.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `fee_plan_id` | `uuid` | NO | — | FK + idx | Parent plan. |
| `student_id` | `uuid` | NO | — | FK + idx | Student (denormalized for fast queries). |
| `label` | `string` | NO | — | — | Label (e.g. "March 2026"). |
| `amount` | `numeric` | NO | — | — | Installment amount. |
| `due_date` | `date` | NO | — | idx | Due date. |
| `is_paid` | `bool` | NO | `false` | idx | Paid flag. |
| `paid_date` | `date` | YES | NULL | — | Payment date. |
| `receipt_no` | `string` | YES | NULL | — | Receipt number (when paid). |
| `penalty` | `numeric` | NO | `0` | — | Late fee. |
| `discount` | `numeric` | NO | `0` | — | Discount applied. |
| `amount_paid` | `numeric` | NO | `0` | — | Amount actually paid. |
| `status` | `string` | NO | `'unpaid'` | idx | `unpaid` | `partial` | `paid` | `overdue`. |

**Relations:**
- M:1 → `fee_plans`, `students`
- 1:M → `fee_payments`

**Constraints:**
- CHECK (`amount >= 0 AND penalty >= 0 AND discount >= 0`)
- CHECK (`amount_paid >= 0 AND amount_paid <= amount + penalty - discount`)
- CHECK (`status IN ('unpaid','partial','paid','overdue')`)

---

### 4.4 `fee_payments`

**Module:** Finance
**Description:** Receipt for a collected installment.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `student_id` | `uuid` | NO | — | FK + idx | Student. |
| `installment_id` | `uuid` | YES | NULL | FK + idx | Linked installment (NULL for ad-hoc payment). |
| `account_id` | `uuid` | NO | — | FK → `accounts.id` | Cash/bank account money deposited to. |
| `amount` | `numeric` | NO | — | — | Paid amount. |
| `method` | `enum:FeeMethod` | NO | `'cash'` | idx | `cash` | `bank` | `mobile`. |
| `receipt_no` | `string` | NO | — | UNIQUE `(organization_id, receipt_no)` | Receipt number. |
| `transaction_ref` | `string` | YES | NULL | — | Bank/mobile transaction ref. |
| `collected_by` | `uuid` | NO | — | FK → `users.id` | Collector. |
| `collected_at` | `timestamptz` | NO | `NOW()` | idx | Collection timestamp. |
| `idempotency_key` | `string` | YES | NULL | UNIQUE | Idempotency key (BP4). |
| `reverse_of` | `uuid` | YES | NULL | FK → `fee_payments.id` | If this is a reversal, points to original. |
| `is_reversed` | `bool` | NO | `false` | — | Reversal flag. |
| `notes` | `text` | YES | NULL | — | Notes. |

**Relations:**
- M:1 → `students`, `fee_installments`, `accounts`, `users`
- M:1 → `fee_payments` (self-ref via `reverse_of`)
- 1:M → `ledger_entries` (via polymorphic `source_id`)

**Constraints:**
- UNIQUE(`organization_id`, `receipt_no`)
- UNIQUE(`idempotency_key`) WHERE `idempotency_key IS NOT NULL`
- CHECK (`amount > 0`)
- CHECK (`method IN ('cash','bank','mobile')`)
- CHECK (`method = 'cash' OR transaction_ref IS NOT NULL`)

---

### 4.5 `scholarships`

**Module:** Finance
**Description:** Scholarship / discount granted to a student.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `student_id` | `uuid` | NO | — | FK + idx | Student. |
| `name` | `string` | NO | — | — | Scholarship name. |
| `type` | `string` | NO | `'partial'` | — | `full` | `partial`. |
| `percentage` | `numeric(5,2)` | NO | `0` | — | 0-100. |
| `amount_per_year` | `numeric` | NO | `0` | — | Fixed amount per year (alternative to percentage). |
| `fund_source` | `string` | NO | `'general'` | idx | `general` | `zakat` | `donation`. |
| `academic_year` | `int` | NO | — | — | Year. |
| `status` | `string` | NO | `'pending'` | idx | `pending` | `approved` | `active` | `closed` | `revoked`. |
| `approved_by` | `uuid` | YES | NULL | FK → `users.id` | Approver. |
| `approved_at` | `timestamptz` | YES | NULL | — | Approval timestamp. |
| `note` | `text` | YES | NULL | — | Reason. |
| `expires_at` | `date` | YES | NULL | — | Expiry. |

**Relations:**
- M:1 → `students`, `users`

**Constraints:**
- CHECK (`type IN ('full','partial')`)
- CHECK (`fund_source IN ('general','zakat','donation')`)
- CHECK (`status IN ('pending','approved','active','closed','revoked')`)
- CHECK (`percentage >= 0 AND percentage <= 100`)
- CHECK (`amount_per_year >= 0`)

---

### 4.6 `ledger_entries`

**Module:** Finance
**Description:** Balanced double-entry row (debit = credit — Golden Flow §3.6).

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `voucher_no` | `string` | NO | — | UNIQUE `(organization_id, voucher_no)` | Voucher number. |
| `date` | `date` | NO | — | idx | Entry date. |
| `narration` | `text` | NO | — | — | Description. |
| `debit_account_id` | `uuid` | NO | — | FK → `accounts.id` + idx | Debit account. |
| `credit_account_id` | `uuid` | NO | — | FK → `accounts.id` + idx | Credit account. |
| `amount` | `numeric` | NO | — | — | Amount (single debit = single credit). |
| `fund` | `enum:FundType` | NO | `'general'` | idx | Must match both accounts' fund. |
| `status` | `enum:LedgerStatus` | NO | `'pending'` | idx | `pending` | `posted` | `rejected`. |
| `posted_by` | `uuid` | YES | NULL | FK → `users.id` | Poster. |
| `posted_at` | `timestamptz` | YES | NULL | — | Posting timestamp. |
| `approved_by` | `uuid` | YES | NULL | FK → `users.id` | Approver (if approval required). |
| `source_type` | `string` | YES | NULL | idx | `fee_payment` | `donation` | `salary` | `purchase` | `zakat_transaction` | `cash_bank_transfer` | `manual`. |
| `source_id` | `uuid` | YES | NULL | idx | Polymorphic FK to source row. |
| `voucher_group_id` | `uuid` | YES | NULL | — | Groups multi-line vouchers (NULL for single-line). |
| `is_reversed` | `bool` | NO | `false` | — | Reversal flag. |
| `reverse_of` | `uuid` | YES | NULL | FK → `ledger_entries.id` | Original entry (if reversal). |

**Relations:**
- M:1 → `accounts` (×2)
- M:1 → `users` (`posted_by`, `approved_by`)
- M:1 → `ledger_entries` (self-ref via `reverse_of`)

**Constraints:**
- UNIQUE(`organization_id`, `voucher_no`)
- CHECK (`amount > 0`)
- CHECK (`debit_account_id <> credit_account_id`) — same account can't be both sides
- CHECK (`status IN ('pending','posted','rejected')`)
- CHECK (`source_type IS NULL OR source_id IS NOT NULL`)

> Fund consistency is enforced via trigger: when `fund = 'zakat'`, both
> `debit_account_id` and `credit_account_id` must point to accounts with
> `fund = 'zakat'`. See migration `B1.3_fund_isolation.sql`.

---

### 4.7 `cash_bank_transfers`

**Module:** Finance
**Description:** Inter-account transfer (cash ↔ bank ↔ mobile).

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `voucher_no` | `string` | NO | — | UNIQUE `(organization_id, voucher_no)` | Voucher number. |
| `from_account_id` | `uuid` | NO | — | FK → `accounts.id` | Source account. |
| `to_account_id` | `uuid` | NO | — | FK → `accounts.id` | Destination account. |
| `amount` | `numeric` | NO | — | — | Transfer amount. |
| `fund` | `enum:FundType` | NO | `'general'` | idx | Must match both accounts. |
| `transfer_date` | `date` | NO | — | idx | Date of transfer. |
| `narration` | `text` | YES | NULL | — | Description. |
| `initiated_by` | `uuid` | NO | — | FK → `users.id` | Initiator. |
| `status` | `string` | NO | `'pending'` | idx | `pending` | `completed` | `reversed`. |
| `completed_at` | `timestamptz` | YES | NULL | — | Completion timestamp. |
| `ledger_entry_id` | `uuid` | YES | NULL | FK → `ledger_entries.id` | Linked ledger entry (when posted). |

**Relations:**
- M:1 → `accounts` (×2), `users`, `ledger_entries`

**Constraints:**
- UNIQUE(`organization_id`, `voucher_no`)
- CHECK (`amount > 0`)
- CHECK (`from_account_id <> to_account_id`)
- CHECK (`status IN ('pending','completed','reversed')`)
- CHECK (`fund IN ('general','zakat')`)

---

### 4.8 `zakat_transactions`

**Module:** Finance
**Description:** Zakat receive / distribute (fund = `zakat` enforced).

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `account_id` | `uuid` | NO | — | FK → `accounts.id` (must have `fund='zakat'`) | Zakat account. |
| `direction` | `string` | NO | — | idx | `receive` | `distribute`. |
| `student_id` | `uuid` | YES | NULL | FK → `students.id` + idx | Recipient student (NULL on receive). |
| `recipient_name` | `string` | YES | NULL | — | Recipient name (if not a student). |
| `amount` | `numeric` | NO | — | — | Amount. |
| `transaction_date` | `date` | NO | — | idx | Date. |
| `narration` | `text` | YES | NULL | — | Description. |
| `purpose` | `string` | YES | NULL | — | `education` | `food` | `medical` | `shelter` | `other`. |
| `handled_by` | `uuid` | NO | — | FK → `users.id` | Handler. |
| `voucher_no` | `string` | NO | — | UNIQUE `(organization_id, voucher_no)` | Voucher number. |
| `receipt_no` | `string` | YES | NULL | — | Receipt number. |
| `donor_name` | `string` | YES | NULL | — | Donor name (if known). |

**Relations:**
- M:1 → `accounts`, `students`, `users`

**Constraints:**
- UNIQUE(`organization_id`, `voucher_no`)
- CHECK (`amount > 0`)
- CHECK (`direction IN ('receive','distribute')`)
- CHECK (`direction = 'distribute' AND (student_id IS NOT NULL OR recipient_name IS NOT NULL)` OR `direction = 'receive'`)
- CHECK (`purpose IS NULL OR purpose IN ('education','food','medical','shelter','other')`)

---

### 4.9 `donations`

**Module:** Finance
**Description:** Public donation (general fund only — public form on `/donate`).

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `account_id` | `uuid` | NO | — | FK → `accounts.id` (must have `fund='general'`) | Deposit account. |
| `donor_name` | `string` | YES | NULL | — | NULL if anonymous. |
| `donor_email` | `string` | YES | NULL | — | Email. |
| `donor_phone` | `string` | YES | NULL | — | Phone. |
| `amount` | `numeric` | NO | — | — | Donation amount. |
| `donation_type` | `string` | NO | `'general'` | idx | `general` | `zakat` | `sadaqah`. |
| `fund` | `enum:FundType` | NO | `'general'` | — | Always `general` for the public form. |
| `donation_date` | `date` | NO | — | idx | Date. |
| `transaction_ref` | `string` | YES | NULL | — | Payment gateway ref. |
| `receipt_no` | `string` | YES | NULL | UNIQUE `(organization_id, receipt_no)` | Receipt number. |
| `note` | `text` | YES | NULL | — | Note from donor. |
| `is_anonymous` | `bool` | NO | `false` | — | Anonymous flag. |
| `status` | `string` | NO | `'pending'` | idx | `pending` | `confirmed` | `failed`. |
| `confirmed_by` | `uuid` | YES | NULL | FK → `users.id` | Confirmer. |
| `confirmed_at` | `timestamptz` | YES | NULL | — | Confirmation timestamp. |
| `payment_method` | `string` | YES | NULL | — | `card` | `mobile` | `bank` | `cash`. |
| `honeypot_filled` | `bool` | NO | `false` | — | Anti-bot honeypot (true = bot). |

**Relations:**
- M:1 → `accounts`, `users`

**Constraints:**
- UNIQUE(`organization_id`, `receipt_no`) WHERE `receipt_no IS NOT NULL`
- CHECK (`amount > 0`)
- CHECK (`donation_type IN ('general','zakat','sadaqah')`)
- CHECK (`status IN ('pending','confirmed','failed')`)
- CHECK (`fund = 'general'`) — public donations are general only

---

## 5. Operations Layer

### 5.1 `inventory_items`

**Module:** Operations
**Description:** Stock item (book, pen, uniform, …).

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `code` | `string` | NO | — | UNIQUE `(organization_id, code)` | SKU code. |
| `name` | `string` | NO | — | idx | English name. |
| `name_bn` | `string` | YES | NULL | — | Bangla name. |
| `category` | `string` | NO | — | idx | `book` | `uniform` | `stationery` | `furniture` | `food` | `other`. |
| `unit` | `string` | NO | `'piece'` | — | `piece` | `box` | `kg` | `liter` | `set`. |
| `qty_in_stock` | `numeric` | NO | `0` | — | Current stock. |
| `reorder_level` | `numeric` | NO | `0` | — | Reorder trigger. |
| `unit_cost` | `numeric` | NO | `0` | — | Latest unit cost. |
| `storage_location` | `string` | YES | NULL | — | Where stored. |
| `is_active` | `bool` | NO | `true` | — | Soft-toggle. |
| `image_url` | `string` | YES | NULL | — | Image. |
| `description` | `text` | YES | NULL | — | Notes. |

**Relations:**
- 1:M → `purchase_items`

**Constraints:**
- UNIQUE(`organization_id`, `code`)
- CHECK (`qty_in_stock >= 0`)
- CHECK (`reorder_level >= 0`)
- CHECK (`unit_cost >= 0`)

---

### 5.2 `purchases`

**Module:** Operations
**Description:** Purchase order header.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `po_number` | `string` | NO | — | UNIQUE `(organization_id, po_number)` | PO number. |
| `supplier_id` | `uuid` | NO | — | FK + idx | Supplier. |
| `order_date` | `date` | NO | — | idx | Order date. |
| `received_date` | `date` | YES | NULL | — | Received date (NULL if not yet). |
| `total_amount` | `numeric` | NO | `0` | — | Sum of line items. |
| `status` | `string` | NO | `'draft'` | idx | `draft` | `pending` | `approved` | `received` | `cancelled`. |
| `requested_by` | `uuid` | NO | — | FK → `users.id` | Requester. |
| `approved_by` | `uuid` | YES | NULL | FK → `users.id` | Approver. |
| `approved_at` | `timestamptz` | YES | NULL | — | Approval timestamp. |
| `note` | `text` | YES | NULL | — | Notes. |
| `payment_status` | `string` | NO | `'unpaid'` | — | `unpaid` | `partial` | `paid`. |
| `paid_amount` | `numeric` | NO | `0` | — | Amount paid so far. |

**Relations:**
- M:1 → `suppliers`, `users` (×2)
- 1:M → `purchase_items`
- 1:M → `approvals` (via polymorphic)

**Constraints:**
- UNIQUE(`organization_id`, `po_number`)
- CHECK (`total_amount >= 0`)
- CHECK (`status IN ('draft','pending','approved','received','cancelled')`)
- CHECK (`payment_status IN ('unpaid','partial','paid')`)
- CHECK (`requested_by IS DISTINCT FROM approved_by`) — D16

---

### 5.3 `purchase_items`

**Module:** Operations
**Description:** Line items under a purchase.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `purchase_id` | `uuid` | NO | — | FK + idx | Parent purchase. |
| `inventory_item_id` | `uuid` | NO | — | FK → `inventory_items.id` | Item. |
| `qty_ordered` | `numeric` | NO | — | — | Ordered quantity. |
| `qty_received` | `numeric` | NO | `0` | — | Received quantity. |
| `unit_cost` | `numeric` | NO | — | — | Per-unit cost. |
| `line_total` | `numeric` | NO | — | — | `qty_ordered * unit_cost`. |
| `note` | `text` | YES | NULL | — | Line note. |

**Relations:**
- M:1 → `purchases`, `inventory_items`

**Constraints:**
- CHECK (`qty_ordered >= 0 AND qty_received >= 0`)
- CHECK (`qty_received <= qty_ordered`)
- CHECK (`unit_cost >= 0 AND line_total >= 0`)
- CHECK (`line_total = qty_ordered * unit_cost`)

---

### 5.4 `suppliers`

**Module:** Operations
**Description:** Vendor master.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `code` | `string` | NO | — | UNIQUE `(organization_id, code)` | Vendor code. |
| `name` | `string` | NO | — | idx | English name. |
| `name_bn` | `string` | YES | NULL | — | Bangla name. |
| `contact_person` | `string` | YES | NULL | — | Contact. |
| `phone` | `string` | YES | NULL | — | Phone. |
| `email` | `string` | YES | NULL | — | Email. |
| `address` | `text` | YES | NULL | — | Address. |
| `tin` | `string` | YES | NULL | — | Tax ID. |
| `outstanding_balance` | `numeric` | NO | `0` | — | Amount owed to supplier. |
| `is_active` | `bool` | NO | `true` | — | Soft-toggle. |
| `notes` | `text` | YES | NULL | — | Notes. |

**Relations:**
- 1:M → `purchases`

**Constraints:**
- UNIQUE(`organization_id`, `code`)

---

### 5.5 `assets`

**Module:** Operations
**Description:** Fixed asset (furniture, equipment).

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `asset_code` | `string` | NO | — | UNIQUE `(organization_id, asset_code)` | Asset code. |
| `name` | `string` | NO | — | idx | English name. |
| `name_bn` | `string` | YES | NULL | — | Bangla name. |
| `category` | `string` | NO | — | idx | `furniture` | `equipment` | `it` | `vehicle` | `building` | `other`. |
| `purchase_date` | `date` | NO | — | — | Purchase date. |
| `purchase_value` | `numeric` | NO | `0` | — | Original value. |
| `current_value` | `numeric` | NO | `0` | — | After depreciation. |
| `depreciation_rate` | `numeric(5,2)` | NO | `0` | — | Annual % depreciation. |
| `depreciation_date` | `date` | YES | NULL | — | Start of depreciation. |
| `location` | `string` | YES | NULL | — | Current location. |
| `status` | `string` | NO | `'in-use'` | idx | `in-use` | `stored` | `transferred` | `disposed` | `under-repair`. |
| `transferred_to_branch_id` | `uuid` | YES | NULL | FK → `branches.id` | Transfer target. |
| `transferred_at` | `date` | YES | NULL | — | Transfer date. |
| `disposed_by` | `uuid` | YES | NULL | FK → `users.id` | Disposer. |
| `disposed_at` | `date` | YES | NULL | — | Disposal date. |
| `disposal_reason` | `text` | YES | NULL | — | Reason. |
| `image_url` | `string` | YES | NULL | — | Photo. |

**Relations:**
- M:1 → `branches` (`transferred_to_branch_id`)
- M:1 → `users` (`disposed_by`)

**Constraints:**
- UNIQUE(`organization_id`, `asset_code`)
- CHECK (`status IN ('in-use','stored','transferred','disposed','under-repair')`)
- CHECK (`purchase_value >= 0 AND current_value >= 0`)
- CHECK (`depreciation_rate >= 0 AND depreciation_rate <= 100`)

---

### 5.6 `hostel_rooms`

**Module:** Operations
**Description:** Hostel room.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `room_number` | `string` | NO | — | UNIQUE `(organization_id, branch_id, room_number)` | Room number. |
| `building` | `string` | YES | NULL | — | Building name. |
| `floor` | `int` | NO | `1` | — | Floor number. |
| `capacity` | `int` | NO | `4` | — | Bed capacity. |
| `gender` | `enum:Gender` | YES | NULL | idx | `male` | `female` (NULL = mixed). |
| `is_active` | `bool` | NO | `true` | — | Soft-toggle. |
| `notes` | `text` | YES | NULL | — | Notes. |

**Relations:**
- 1:M → `hostel_beds`

**Constraints:**
- UNIQUE(`organization_id`, `branch_id`, `room_number`)
- CHECK (`capacity >= 1`)
- CHECK (`floor >= 0`)

---

### 5.7 `hostel_beds`

**Module:** Operations
**Description:** Bed allocation (bed × student × date range).

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `room_id` | `uuid` | NO | — | FK + idx | Parent room. |
| `bed_number` | `string` | NO | — | UNIQUE `(room_id, bed_number)` | Bed number. |
| `student_id` | `uuid` | YES | NULL | FK + idx | Current occupant (NULL = vacant). |
| `allocated_at` | `date` | YES | NULL | — | Allocation start. |
| `vacated_at` | `date` | YES | NULL | — | Vacation date. |
| `status` | `string` | NO | `'vacant'` | idx | `vacant` | `occupied` | `reserved` | `maintenance`. |
| `monthly_fee` | `numeric` | NO | `0` | — | Hostel fee per month. |
| `notes` | `text` | YES | NULL | — | Notes. |

**Relations:**
- M:1 → `hostel_rooms`, `students`

**Constraints:**
- UNIQUE(`room_id`, `bed_number`)
- CHECK (`status IN ('vacant','occupied','reserved','maintenance')`)
- CHECK (`vacated_at IS NULL OR vacated_at >= allocated_at`)
- CHECK (`monthly_fee >= 0`)

---

### 5.8 `meal_plans`

**Module:** Operations
**Description:** Daily / weekly meal plan.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `meal_date` | `date` | NO | — | idx | Meal date. |
| `meal_type` | `string` | NO | — | — | `breakfast` | `lunch` | `dinner` | `snack`. |
| `menu` | `text` | NO | — | — | English menu. |
| `menu_bn` | `text` | YES | NULL | — | Bangla menu. |
| `head_count` | `int` | NO | `0` | — | Expected head count. |
| `cost_per_head` | `numeric` | NO | `0` | — | Per-head cost. |
| `total_cost` | `numeric` | NO | `0` | — | Computed total. |
| `prepared_by` | `uuid` | YES | NULL | FK → `users.id` | Cook/manager. |
| `notes` | `text` | YES | NULL | — | Notes. |

**Relations:**
- M:1 → `users`

**Constraints:**
- UNIQUE(`organization_id`, `branch_id`, `meal_date`, `meal_type`)
- CHECK (`meal_type IN ('breakfast','lunch','dinner','snack')`)
- CHECK (`head_count >= 0 AND cost_per_head >= 0`)
- CHECK (`total_cost = head_count * cost_per_head`)

---

### 5.9 `library_books`

**Module:** Operations
**Description:** Book catalog copy.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `accession_no` | `string` | NO | — | UNIQUE `(organization_id, accession_no)` | Library accession number. |
| `title` | `string` | NO | — | idx | English title. |
| `title_bn` | `string` | YES | NULL | — | Bangla title. |
| `title_ar` | `string` | YES | NULL | — | Arabic title (for Quranic books). |
| `author` | `string` | YES | NULL | — | Author. |
| `category` | `string` | YES | NULL | idx | `quranic` | `hadith` | `fiqh` | `language` | `science` | `other`. |
| `isbn` | `string` | YES | NULL | — | ISBN. |
| `total_copies` | `int` | NO | `1` | — | Total copies owned. |
| `available_copies` | `int` | NO | `1` | — | Currently available. |
| `purchase_price` | `numeric` | NO | `0` | — | Per-copy purchase price. |
| `purchase_date` | `date` | YES | NULL | — | When acquired. |
| `shelf_location` | `string` | YES | NULL | — | Where shelved. |
| `is_active` | `bool` | NO | `true` | — | Soft-toggle. |
| `description` | `text` | YES | NULL | — | Notes. |

**Relations:**
- 1:M → `library_issues`

**Constraints:**
- UNIQUE(`organization_id`, `accession_no`)
- CHECK (`total_copies >= 1`)
- CHECK (`available_copies >= 0 AND available_copies <= total_copies`)
- CHECK (`purchase_price >= 0`)

---

### 5.10 `library_issues`

**Module:** Operations
**Description:** Issue + return tracking.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `book_id` | `uuid` | NO | — | FK + idx | Book. |
| `student_id` | `uuid` | NO | — | FK + idx | Borrower. |
| `issue_date` | `date` | NO | — | idx | Issue date. |
| `due_date` | `date` | NO | — | — | Due date. |
| `returned_date` | `date` | YES | NULL | partial idx `WHERE returned_date IS NULL` | Return date (NULL = still issued). |
| `fine_amount` | `numeric` | NO | `0` | — | Late fine. |
| `status` | `string` | NO | `'issued'` | idx | `issued` | `returned` | `overdue` | `lost`. |
| `issued_by` | `uuid` | NO | — | FK → `users.id` | Librarian who issued. |
| `returned_to` | `uuid` | YES | NULL | FK → `users.id` | Librarian who received return. |
| `notes` | `text` | YES | NULL | — | Notes. |

**Relations:**
- M:1 → `library_books`, `students`, `users` (×2)

**Constraints:**
- CHECK (`due_date >= issue_date`)
- CHECK (`returned_date IS NULL OR returned_date >= issue_date`)
- CHECK (`status IN ('issued','returned','overdue','lost')`)
- CHECK (`fine_amount >= 0`)
- CHECK (`status = 'returned' AND returned_date IS NOT NULL OR status <> 'returned'`)

---

### 5.11 `vehicles`

**Module:** Operations
**Description:** Transport vehicle.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `registration_no` | `string` | NO | — | UNIQUE `(organization_id, registration_no)` | License plate. |
| `type` | `string` | NO | — | idx | `bus` | `microbus` | `car` | `motorcycle` | `van`. |
| `model` | `string` | YES | NULL | — | Make/model. |
| `capacity` | `int` | NO | `0` | — | Passenger capacity. |
| `purchase_date` | `date` | YES | NULL | — | Purchase date. |
| `purchase_value` | `numeric` | NO | `0` | — | Original value. |
| `current_value` | `numeric` | NO | `0` | — | After depreciation. |
| `current_driver` | `string` | YES | NULL | — | Driver name (denormalized). |
| `status` | `string` | NO | `'active'` | idx | `active` | `maintenance` | `retired`. |
| `insurance_expiry` | `date` | YES | NULL | — | Insurance expiry. |
| `fitness_expiry` | `date` | YES | NULL | — | Fitness certificate expiry. |

**Relations:**
- 1:M → `fuel_logs`

**Constraints:**
- UNIQUE(`organization_id`, `registration_no`)
- CHECK (`type IN ('bus','microbus','car','motorcycle','van')`)
- CHECK (`capacity >= 0`)
- CHECK (`status IN ('active','maintenance','retired')`)

---

### 5.12 `fuel_logs`

**Module:** Operations
**Description:** Vehicle fuel / maintenance log.

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `vehicle_id` | `uuid` | NO | — | FK + idx | Vehicle. |
| `log_date` | `date` | NO | — | idx | Log date. |
| `liters` | `numeric` | NO | — | — | Fuel liters. |
| `amount` | `numeric` | NO | — | — | Cost. |
| `odometer_reading` | `int` | YES | NULL | — | Odometer km. |
| `fuel_station` | `string` | YES | NULL | — | Where fueled. |
| `payment_method` | `string` | NO | `'cash'` | — | `cash` | `bank` | `mobile`. |
| `logged_by` | `uuid` | NO | — | FK → `users.id` | Logger. |
| `note` | `text` | YES | NULL | — | Notes. |
| `log_type` | `string` | NO | `'fuel'` | — | `fuel` | `maintenance` | `repair`. |

**Relations:**
- M:1 → `vehicles`, `users`

**Constraints:**
- CHECK (`liters >= 0 AND amount >= 0`)
- CHECK (`odometer_reading IS NULL OR odometer_reading >= 0`)
- CHECK (`payment_method IN ('cash','bank','mobile')`)
- CHECK (`log_type IN ('fuel','maintenance','repair')`)

---

## 6. Communication Layer

### 6.1 `notices`

**Module:** Communication
**Description:** Notice / announcement (audience-scoped).

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `title` | `string` | NO | — | idx | English title. |
| `title_bn` | `string` | YES | NULL | — | Bangla title. |
| `body` | `text` | NO | — | — | English body. |
| `body_bn` | `text` | YES | NULL | — | Bangla body. |
| `audience` | `enum:NoticeAudience` | NO | `'all'` | idx | `all` | `class` | `guardians` | `staff`. |
| `audience_filter` | `string` | YES | NULL | — | e.g. `class-5` or `section-5-A`. NULL when audience is `all` or `staff`. |
| `recipient_count` | `int` | NO | `0` | — | Cached count of recipients. |
| `category` | `string` | NO | `'general'` | idx | `admission` | `holiday` | `event` | `exam` | `general`. |
| `sent_by` | `uuid` | NO | — | FK → `users.id` | Sender. |
| `sent_at` | `timestamptz` | YES | NULL | idx | Send timestamp (NULL = draft). |
| `is_pinned` | `bool` | NO | `false` | — | Pinned to top. |
| `expires_at` | `date` | YES | NULL | — | After expiry, notice hidden. |
| `status` | `string` | NO | `'draft'` | idx | `draft` | `scheduled` | `sent`. |
| `attachment_url` | `string` | YES | NULL | — | Optional attachment. |
| `is_sms_sent` | `bool` | NO | `false` | — | Whether SMS was sent to recipients. |

**Relations:**
- M:1 → `users` (`sent_by`)

**Constraints:**
- CHECK (`audience IN ('all','class','guardians','staff')`)
- CHECK (`category IN ('admission','holiday','event','exam','general')`)
- CHECK (`status IN ('draft','scheduled','sent')`)
- CHECK (`audience = 'all' OR audience_filter IS NOT NULL`)

---

### 6.2 `documents`

**Module:** Communication
**Description:** Uploaded document (PDF, image, …).

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `name` | `string` | NO | — | idx | Display name. |
| `original_filename` | `string` | NO | — | — | Original upload filename. |
| `storage_url` | `string` | NO | — | — | CDN / S3 URL. |
| `mime_type` | `string` | NO | — | — | MIME type. |
| `type` | `enum:DocumentType` | NO | `'other'` | idx | `pdf` | `image` | `spreadsheet` | `other`. |
| `size_bytes` | `bigint` | NO | `0` | — | File size. |
| `sha256` | `string` | YES | NULL | — | Content hash for dedup. |
| `uploaded_by` | `uuid` | NO | — | FK → `users.id` | Uploader. |
| `uploaded_at` | `timestamptz` | NO | `NOW()` | idx | Upload timestamp. |
| `visibility` | `string` | NO | `'staff'` | idx | `public` | `staff` | `authority`. |
| `tags` | `jsonb` | NO | `'[]'` | — | Array of tags. |
| `description` | `text` | YES | NULL | — | Description. |
| `expires_at` | `timestamptz` | YES | NULL | — | Auto-delete time. |
| `download_count` | `int` | NO | `0` | — | Cached count. |

**Relations:**
- M:1 → `users` (`uploaded_by`)

**Constraints:**
- CHECK (`type IN ('pdf','image','spreadsheet','other')`)
- CHECK (`visibility IN ('public','staff','authority')`)
- CHECK (`size_bytes >= 0`)

---

### 6.3 `reports`

**Module:** Communication
**Description:** Generated report (filtered + async export).

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `name` | `string` | NO | — | idx | Report name. |
| `report_type` | `string` | NO | — | idx | `finance` | `attendance` | `students` | `inventory` | `academic` | `audit` | `custom`. |
| `filters` | `jsonb` | NO | `'{}'` | — | JSON of applied filters. |
| `format` | `string` | NO | `'pdf'` | — | `pdf` | `csv` | `xlsx` | `json`. |
| `storage_url` | `string` | YES | NULL | — | Output URL. |
| `status` | `string` | NO | `'queued'` | idx | `queued` | `running` | `completed` | `failed`. |
| `size_bytes` | `bigint` | YES | NULL | — | Output size. |
| `generated_by` | `uuid` | NO | — | FK → `users.id` | Requester. |
| `started_at` | `timestamptz` | YES | NULL | — | Start time. |
| `completed_at` | `timestamptz` | YES | NULL | — | Completion time. |
| `error_message` | `text` | YES | NULL | — | Failure reason. |
| `row_count` | `int` | YES | NULL | — | Number of rows in output. |
| `expires_at` | `timestamptz` | YES | NULL | — | Auto-delete time. |
| `is_finance` | `bool` | NO | `false` | — | `true` requires `reports.finance.view`. |

**Relations:**
- M:1 → `users` (`generated_by`)

**Constraints:**
- CHECK (`report_type IN ('finance','attendance','students','inventory','academic','audit','custom')`)
- CHECK (`format IN ('pdf','csv','xlsx','json')`)
- CHECK (`status IN ('queued','running','completed','failed')`)
- CHECK (`completed_at IS NULL OR completed_at >= started_at`)

---

### 6.4 `approvals`

**Module:** Communication
**Description:** Approval workflow (no self-approve — D16).

| Column | Type | Nullable | Default | Index | Description |
|---|---|---|---|---|---|
| `type` | `enum:ApprovalType` | NO | — | idx | `expense` | `purchase` | `discount` | `admission`. |
| `title` | `string` | NO | — | idx | Approval title. |
| `description` | `text` | YES | NULL | — | Description. |
| `amount` | `numeric` | YES | NULL | — | Amount (if applicable). |
| `payload` | `jsonb` | NO | `'{}'` | — | Type-specific fields. |
| `status` | `enum:ApprovalStatus` | NO | `'pending'` | idx | `pending` | `approved` | `rejected`. |
| `requested_by` | `uuid` | NO | — | FK → `users.id` + idx | Requester. |
| `requested_at` | `timestamptz` | NO | `NOW()` | idx | Request timestamp. |
| `decided_by` | `uuid` | YES | NULL | FK → `users.id` | Approver/rejecter. |
| `decided_at` | `timestamptz` | YES | NULL | — | Decision timestamp. |
| `decision_note` | `text` | YES | NULL | — | Approver note. |
| `rejection_reason` | `text` | YES | NULL | — | If rejected. |
| `delegated_to` | `uuid` | YES | NULL | FK → `users.id` | If approval delegated. |
| `expires_at` | `timestamptz` | YES | NULL | — | After expiry, auto-reject. |
| `entity_type` | `string` | YES | NULL | — | Polymorphic entity type (e.g. `purchases`). |
| `entity_id` | `uuid` | YES | NULL | — | Polymorphic entity ID. |

**Relations:**
- M:1 → `users` (×3: `requested_by`, `decided_by`, `delegated_to`)

**Constraints:**
- CHECK (`type IN ('expense','purchase','discount','admission')`)
- CHECK (`status IN ('pending','approved','rejected')`)
- CHECK (`requested_by IS DISTINCT FROM decided_by`) — D16 (no self-approve)
- CHECK (`amount IS NULL OR amount >= 0`)
- CHECK (`status = 'pending' OR decided_by IS NOT NULL`)

---

## Appendix A — Enum Reference

All enums declared via `CREATE TYPE` (or Prisma `enum` blocks).

| Enum | Values | Tables |
|---|---|---|
| `Role` | `super-admin`, `authority`, `administrator`, `accountant`, `teacher`, `storekeeper`, `guardian`, `student` | `roles.code` (varchar, not enum — to allow extension) |
| `UserStatus` | `active`, `disabled`, `locked` | `users.status` |
| `Gender` | `male`, `female` | `students.gender`, `hostel_rooms.gender` |
| `StudentStatus` | `active`, `graduated`, `withdrawn` | `students.status` |
| `AdmissionStatus` | `pending`, `approved`, `rejected`, `enrolled` | `admissions.status` |
| `AttendanceStatus` | `present`, `absent`, `late`, `leave` | `attendance_records.status` |
| `ExamStatus` | `draft`, `marks-entry`, `published` | `exams.status` |
| `MarkGrade` | `a-plus`, `a`, `a-minus`, `b`, `c`, `d`, `f` | `marks.grade` |
| `FundType` | `general`, `zakat` | `accounts.fund`, `ledger_entries.fund`, `cash_bank_transfers.fund`, `scholarships.fund_source` (extended with `donation`), `donations.fund` |
| `AccountType` | `asset`, `liability`, `equity`, `income`, `expense` | `accounts.type` |
| `FeeMethod` | `cash`, `bank`, `mobile` | `fee_payments.method`, `fuel_logs.payment_method` |
| `LedgerStatus` | `pending`, `posted`, `rejected` | `ledger_entries.status` |
| `ApprovalType` | `expense`, `purchase`, `discount`, `admission` | `approvals.type` |
| `ApprovalStatus` | `pending`, `approved`, `rejected` | `approvals.status` |
| `NoticeAudience` | `all`, `class`, `guardians`, `staff` | `notices.audience` |
| `DocumentType` | `pdf`, `image`, `spreadsheet`, `other` | `documents.type` |

---

## Appendix B — Standard Column Counts

Quick reference for how many of the 8 base-mixin columns each table carries.

| Table | Base mixin columns | Notes |
|---|---|---|
| `organizations` | 6 (omits `organization_id`, `branch_id`) | Root tenant — IS the org. |
| `permissions` | 5 (omits `organization_id`, `branch_id`, `created_by`, `updated_by` are nullable) | Global catalog. |
| All other tables | 8 (full base mixin) | Standard. |

---

## Appendix C — Permission → Table Coverage Matrix

| Permission code prefix | Primary table(s) | Sub-permissions |
|---|---|---|
| `organization.*` | `organizations`, `branches`, `module_configs` | `branch.switch`, `branch.create`, `config.view`, `module.toggle` |
| `rbac.*` | `roles`, `permissions`, `role_permissions` | `role.view`, `role.create`, `role.update`, `permission.assign` |
| `audit.*` | `audit_logs` | `view`, `export` |
| `security.policy.*` | `security_policies` | `edit` |
| `backup.*` | `backup_records` | `run`, `restore` |
| `students.*` | `students`, `student_history` | `view`, `create`, `update`, `promote`, `notes.view`, `notes.edit` |
| `admission.*` | `admissions` | `view`, `approve`, `reject` |
| `guardians.*` | `guardians`, `student_guardians` | `view`, `view.own` |
| `teachers.*` | `teachers`, `teacher_assignments` | `view`, `create`, `assign` |
| `employees.*` | `employees` | `view`, `create` |
| `academic.structure.*` | `classes`, `sections`, `subjects`, `routines` | `view`, `edit` |
| `attendance.*` | `attendance_sessions`, `attendance_records` | `view`, `take`, `view.own` |
| `exams.*` | `exams`, `marks` | `view`, `enter-marks`, `publish` |
| `results.*` | `results` | `view`, `view.own`, `generate` |
| `fees.*` | `fee_plans`, `fee_installments`, `fee_payments` | `view`, `payment.create`, `payment.create.own`, `plan.view`, `plan.edit` |
| `scholarship.*` | `scholarships` | `view`, `approve` |
| `accounting.ledger.*` | `ledger_entries`, `accounts` | `view`, `post` |
| `cashbank.transfer` | `cash_bank_transfers` | — |
| `zakat.*` | `zakat_transactions`, `accounts` (fund=zakat) | `view`, `receive`, `distribute` |
| `donations.*` | `donations` | `view`, `create`, `create.public` |
| `inventory.*` | `inventory_items` | `view`, `receive`, `issue` |
| `purchase.*` | `purchases`, `purchase_items` | `view`, `create`, `approve` |
| `suppliers.*` | `suppliers` | `view` |
| `assets.*` | `assets` | `view`, `transfer`, `dispose` |
| `hostel.*` | `hostel_rooms`, `hostel_beds` | `view`, `allocate` |
| `food.meal-plan` | `meal_plans` | — |
| `library.*` | `library_books`, `library_issues` | `view`, `issue`, `return` |
| `transport.*` | `vehicles`, `fuel_logs` | `view`, `record-expense` |
| `notices.*` | `notices` | `view`, `compose`, `send` |
| `documents.*` | `documents` | `upload`, `download` |
| `reports.*` | `reports` | `view`, `finance.view`, `finance.export` |
| `dashboard.*` | (no direct table — derived views) | `view`, `view.authority`, `view.accountant`, `view.teacher`, `view.storekeeper`, `view.guardian` |
| `pdf.generate` | (no table — read-only across many) | — |
| `approval.*` | `approvals` | `view`, `approve`, `reject`, `delegate` |
| `tenant.*` | `organizations` | `provision`, `manage` |

---

**End of Data Dictionary.** For visual ER diagrams and conventions see
[`ERD.md`](./ERD.md). For the Prisma schema that implements this
dictionary, see `prisma/schema.prisma` (Phase B0.3, pending).
