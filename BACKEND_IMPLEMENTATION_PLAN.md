# MadrashaOS — Backend Implementation Plan

**From UI/UX Prototype → Real Database-Backed Application**

| Field | Value |
|---|---|
| Document | `BACKEND_IMPLEMENTATION_PLAN.md` |
| Author Role | Lead Backend Engineer |
| Audience | Backend Developer, Database Administrator, Project Manager |
| Source of Truth | `MadrashaOS Implementation-Grade SRS v2.0` (Parts 6, 7) + `role-permissions.ts` + mock fixtures |
| Stack | Next.js 16 (API Routes) · Prisma ORM · PostgreSQL · NextAuth.js v4 · Zod validation · OpenAPI 3.1 |
| Total Duration | ~8 weeks (9 phases, 36 sessions) |
| Golden Rule | **Every session ends with a working database table, API endpoint, or auth flow that can be tested via curl or the existing UI. No session is "documentation-only".** |

---

## 0. Purpose & Relationship to the UI/UX Plan

The UI/UX Coding Plan (`MADRASHAOS_CODING_PLAN.md`) delivered a fully workable frontend running on **mock data** — 54 routes, 30 components, 5 dashboards, 8 flows, all functional but with no real database or backend.

This plan is the **backend mirror**. It converts the mock data layer (`src/lib/mock/`) into a real PostgreSQL-backed API. The swap path is designed to be **zero-component-change**: the TanStack Query hooks (`useStudents`, `useFeePlans`, etc.) call `mockApi` today and will call the OpenAPI-generated client tomorrow — same interface, different data source.

> **Definition of Done for this plan:** after the final session, the application runs end-to-end on a real PostgreSQL database with real authentication, real CRUD endpoints for all 40+ modules, real permission enforcement, and real data persistence. The frontend swaps `mockApi` → generated client with zero component changes.

---

## 1. Governing Principles (carried over from SRS + UI/UX plan)

Every line of backend code must satisfy:

| # | Principle | How it shows up in backend code |
|---|---|---|
| BP1 | Multi-Tenant Isolation | Every table has `organization_id` + `branch_id`; Prisma middleware injects tenant scope on every query (SRS §3.1, §7) |
| BP2 | Permission-Aware API | Every endpoint checks permission codes via middleware before executing (SRS §5.1, §6.2) |
| BP3 | Balanced Ledger (Golden Flow) | Fees, donations, Zakat, salaries post through the Accounting ledger as balanced debit=credit entries (SRS §3.6) |
| BP4 | Idempotency | All write endpoints accept `Idempotency-Key` header; duplicate requests return cached response (SRS §6.5) |
| BP5 | Audit Trail | Every write to audited entities produces a field-level audit diff record (SRS §2.1.4, §3.4) |
| BP6 | Fund Isolation | Zakat funds never co-mingle with general funds; enforced at the account level (SRS §3.7, C6) |
| BP7 | Soft Delete | No hard deletes on financial/student records; `deleted_at` column + Prisma middleware filters them out |
| BP8 | Snake Case | Database tables/columns use `snake_case` (SRS §7); Prisma models use `camelCase` with `@@map` |
| BP9 | UUID Primary Keys | All tables use `uuid` PKs with `default(uuid())` (SRS §7) |
| BP10 | OpenAPI-First | API spec is generated from code (not hand-written); frontend client is generated from spec |

**Hard constraints from SRS (non-negotiable):**
- C1: Core tasks reachable in ≤3 clicks (frontend enforces; backend supports with efficient endpoints)
- C3: No financial data visible to Teacher role (enforced at API level — 403 if Teacher requests `/api/v1/fees`)
- C6: Zakat funds isolated (enforced at DB level — Zakat account has `fund: "zakat"` flag)
- C7: Requester cannot approve own request (enforced at API level — 403 if `requestedBy === currentUser`)
- C8: Public visitor cannot reach protected endpoints (enforced at middleware level — 401 for unauthenticated)

---

## 2. Mock-to-Real Swap Strategy

The existing mock layer is the **data contract**:

```
src/lib/mock/mockApi.ts          →  src/lib/api/client.ts (generated from OpenAPI)
src/lib/mock/fixtures/*.ts       →  PostgreSQL database (seeded via Prisma)
src/lib/mock/types.ts            →  Prisma-generated types (same shape)
src/lib/query/client.ts          →  UNCHANGED (hooks call client.ts, which swaps source)
```

**The swap is a one-file change:** replace `mockApi` import in `src/lib/query/client.ts` with the generated OpenAPI client. Zero component changes.

---

## 3. Phase Map (Backend)

| Phase | Name | Sessions | Duration | Visible Result |
|---|---|---|---|---|
| **B0** | Database Foundation | 0.1–0.3 | 3 days | PostgreSQL running + ERD document + Prisma schema draft |
| **B1** | Schema & Migrations | 1.1–1.4 | 5 days | All 40+ tables created + migrations applied + seed data loaded |
| **B2** | Authentication & RBAC | 2.1–2.4 | 5 days | NextAuth login + JWT + MFA + permission middleware + 8 roles seeded |
| **B3** | Foundation API Endpoints | 3.1–3.4 | 4 days | Organization, Module Config, RBAC, Audit, Security, Backup endpoints live |
| **B4** | People API Endpoints | 4.1–4.4 | 5 days | Student, Admission, Guardian, Teacher, Employee endpoints live |
| **B5** | Academic API Endpoints | 5.1–5.4 | 5 days | Academic Structure, Attendance, Exams, Results endpoints live |
| **B6** | Finance API Endpoints | 6.1–6.6 | 7 days | Fees, Scholarship, Accounting (GL), Cash/Bank, Zakat, Donations endpoints live |
| **B7** | Operations API Endpoints | 7.1–7.4 | 5 days | Inventory, Purchase, Supplier, Asset, Hostel, Food, Library, Transport endpoints live |
| **B8** | Communication & Platform API | 8.1–8.4 | 4 days | Notices, Documents, Reports, Dashboard, PDF, Approvals endpoints live |
| **B9** | Integration & OpenAPI | 9.1–9.3 | 3 days | mockApi replaced + OpenAPI spec generated + frontend wired to real API |

**Total: ~46 working days → full database-backed application.**

---

## 3.5 Progress Tracker

> Auto-updated after each backend session. Status legend: ✅ Done · 🔄 In Progress · ⏳ Pending · ⛔ Blocked

| Phase | Session | Title | Status | Commit | Date | Deliverable |
|-------|---------|-------|--------|--------|------|-------------|
| B0 | 0.1 | PostgreSQL Setup + Connection | ✅ Done | [`f53687e`](https://github.com/sajidchowdhury/MadrashaOS/commit/f53687e) | 2026-09-16 | `docker-compose.yml` (PostgreSQL 16 Alpine) + `.env` + `.env.example` + Prisma schema switched to PostgreSQL + `db.ts` client updated + `scripts/setup-db.sh` + `scripts/verify-db.ts` + 7 `db:*` npm scripts |
| B0 | 0.2 | ERD Document Generation | ✅ Done | [`748936c`](https://github.com/sajidchowdhury/MadrashaOS/commit/748936c) | 2026-09-18 | `docs/ERD.md` (1388 lines — 52 tables, 98 relations, 6 Mermaid diagrams, 14 enums, multi-tenant strategy, index strategy) + `docs/DATA_DICTIONARY.md` (1797 lines — per-table field definitions for all 52 tables with 8-column base mixin, relations, constraints) |
| B0 | 0.3 | Prisma Schema Draft (all 40+ models) | ✅ Done | [`9290c77`](https://github.com/sajidchowdhury/MadrashaOS/commit/9290c77) | 2026-09-18 | `prisma/schema.prisma` (2,271 lines — 52 models, 15 enums, 260 indexes, 40 unique constraints, 238 relations, all `@@map` to snake_case) + `prisma validate` ✅ + `prisma generate` ✅ |
| B1 | 1.1 | Foundation Models Migration | ✅ Done | [`b409eca`](https://github.com/sajidchowdhury/MadrashaOS/commit/b409eca) | 2026-09-18 | `prisma/migrations/20260918000000_init/migration.sql` (2,853 lines — ALL 52 tables + 15 enums + 260 indexes + 238 FKs in one init migration) + `migration_lock.toml` + `prisma/migrations/README.md` with local setup instructions |
| B1 | 1.2 | People Models Migration | ✅ Done | [`b409eca`](https://github.com/sajidchowdhury/MadrashaOS/commit/b409eca) | 2026-09-18 | Covered by init migration (B1.1) — People tables created in same migration |
| B1 | 1.3 | Academic + Finance Models Migration | ✅ Done | [`b409eca`](https://github.com/sajidchowdhury/MadrashaOS/commit/b409eca) | 2026-09-18 | Covered by init migration (B1.1) — Academic + Finance + Operations + Communication tables all created in same migration |
| B1 | 1.4 | Seed Data (40 students, 8 users, 12 ledger entries) | ✅ Done | [`770a8d6`](https://github.com/sajidchowdhury/MadrashaOS/commit/770a8d6) | 2026-09-18 | `prisma/seed.ts` (818 lines — 1 org, 3 branches, 8 roles, 110+ permissions, 8 users with hashed passwords, 4 classes, 8 guardians, 40 students, 8 accounts incl Zakat fund, 40 fee plans × 3 installments, 8 payments, 12 ledger entries, 4 attendance sessions, 10 inventory items, 5 notices, 6 approvals) + bcryptjs installed |
| B2 | 2.1 | NextAuth.js Setup (JWT + refresh) | ✅ Done | [`2883dd2`](https://github.com/sajidchowdhury/MadrashaOS/commit/2883dd2) | 2026-09-18 | `src/lib/auth/config.ts` (NextAuth v4 + CredentialsProvider + JWT callbacks) + `password.ts` (bcrypt) + `tokens.ts` (JWT/refresh rotation via jose) + `[...nextauth]/route.ts` + `middleware.ts` (protect /api/v1/* + allow public donations) + `/api/v1/auth/session` + `src/types/next-auth.d.ts` (module augmentation) |
| B2 | 2.2 | Permission Middleware | ✅ Done | [`2883dd2`](https://github.com/sajidchowdhury/MadrashaOS/commit/2883dd2) | 2026-09-18 | `with-permission.ts` (withPermission/withPermissions/withAnyPermission) + `with-tenant.ts` (getTenantContext + tenantWhere Prisma scope) + `with-idempotency.ts` (Idempotency-Key 24h cache) + `with-audit.ts` (audit_logs write) |
| B2 | 2.3 | MFA (TOTP) | ✅ Done | [`2883dd2`](https://github.com/sajidchowdhury/MadrashaOS/commit/2883dd2) | 2026-09-18 | `mfa.ts` (otplib + qrcode) + 3 endpoints: `/api/v1/auth/mfa/setup` + `/verify` (enable + login-gated) + `/disable` |
| B2 | 2.4 | 8 Roles + Permissions Seeded | ✅ Done | [`2883dd2`](https://github.com/sajidchowdhury/MadrashaOS/commit/2883dd2) | 2026-09-18 | `/api/v1/auth/verify-roles` (per-role permission count) + `/login` page (2-step: credentials → MFA OTP) |
| B3 | 3.1 | Organization & Multi-Branch API | ✅ Done | [`<pending>`](https://github.com/sajidchowdhury/MadrashaOS) | 2026-09-18 | `GET/PATCH /api/v1/organizations` + `GET/POST /api/v1/branches` + `GET/PATCH/DELETE /api/v1/branches/[id]` + `POST /api/v1/branches/switch` (Risk R1 audit) + `src/lib/validation/schemas.ts` (Zod) + `src/lib/api/helpers.ts` (jsonResponse/errorResponse/paginatedResponse) |
| B3 | 3.2 | Module Configuration API | ✅ Done | [`<pending>`](https://github.com/sajidchowdhury/MadrashaOS) | 2026-09-18 | `GET /api/v1/modules` + `GET/PATCH /api/v1/modules/[id]` (Risk R2: 409 with dependents list when toggling off) + `src/lib/modules/dependencies.ts` (5-edge dependency map) |
| B3 | 3.3 | RBAC API + Permission Matrix | ✅ Done | [`<pending>`](https://github.com/sajidchowdhury/MadrashaOS) | 2026-09-18 | `GET/POST /api/v1/roles` + `GET/PATCH /api/v1/roles/[id]` + `GET /api/v1/permissions` (110+ codes with D16 constraint tooltip) + `GET/PUT /api/v1/roles/[id]/permissions` (full-replace in transaction) |
| B3 | 3.4 | Audit Trail API + Field-Diff | ✅ Done | [`<pending>`](https://github.com/sajidchowdhury/MadrashaOS) | 2026-09-18 | `GET /api/v1/audit` (paginated + filtered list with actor_name) + `GET /api/v1/audit/[id]` (field-diff viewer with old→new computed server-side) + `GET /api/v1/audit/export` (CSV with 1000-row cap) + `src/lib/api/diff.ts` (computeFieldDiff + formatDiffForCsv) |
| B4 | 4.1 | Student API (CRUD + promotion) | ⏳ Pending | — | — | — |
| B4 | 4.2 | Admission API (Kanban + pipeline) | ⏳ Pending | — | — | — |
| B4 | 4.3 | Guardian + Teacher API | ⏳ Pending | — | — | — |
| B4 | 4.4 | Employee API | ⏳ Pending | — | — | — |
| B5 | 5.1 | Academic Structure API (routine/calendar) | ⏳ Pending | — | — | — |
| B5 | 5.2 | Attendance API (idempotent submit) | ⏳ Pending | — | — | — |
| B5 | 5.3 | Examination API (marks + publish) | ⏳ Pending | — | — | — |
| B5 | 5.4 | Results API (mark sheet + GPA) | ⏳ Pending | — | — | — |
| B6 | 6.1 | Fees API (collect payment + receipt) | ⏳ Pending | — | — | — |
| B6 | 6.2 | Scholarship & Discount API | ⏳ Pending | — | — | — |
| B6 | 6.3 | Accounting (GL) API (balanced entries) | ⏳ Pending | — | — | — |
| B6 | 6.4 | Cash & Bank API | ⏳ Pending | — | — | — |
| B6 | 6.5 | Zakat API (fund isolation) | ⏳ Pending | — | — | — |
| B6 | 6.6 | Donations API (honeypot + receipt) | ⏳ Pending | — | — | — |
| B7 | 7.1 | Inventory + Purchase API | ⏳ Pending | — | — | — |
| B7 | 7.2 | Supplier + Asset API | ⏳ Pending | — | — | — |
| B7 | 7.3 | Hostel + Food/Meal API | ⏳ Pending | — | — | — |
| B7 | 7.4 | Library + Transport API | ⏳ Pending | — | — | — |
| B8 | 8.1 | Notices API (audience + recipient count) | ⏳ Pending | — | — | — |
| B8 | 8.2 | Documents API (upload + signed URL) | ⏳ Pending | — | — | — |
| B8 | 8.3 | Reports API (filtered + async export) | ⏳ Pending | — | — | — |
| B8 | 8.4 | Approvals API (no self-approve) | ⏳ Pending | — | — | — |
| B9 | 9.1 | OpenAPI 3.1 Spec Generation | ⏳ Pending | — | — | — |
| B9 | 9.2 | Frontend Client Swap (mockApi → real) | ⏳ Pending | — | — | — |
| B9 | 9.3 | End-to-End Verification (8 flows) | ⏳ Pending | — | — | — |

**Summary:** 15 / 36 sessions done · 0 in progress · 21 pending · 0 blocked

**Phase B3 (Foundation API Endpoints): ✅ Complete** — 4/4 sessions done. Organization + Branch API (GET/POST/PATCH/DELETE + switch with R1 audit). Module Configuration API (Risk R2: 409 with dependents list). RBAC API (roles CRUD + permissions list + D16 constraint tooltip + full-replace permission assignment). Audit Trail API (paginated list + field-diff viewer with old→new computed server-side + CSV export).

**Phase B0 (Database Foundation): ✅ Complete** — 3/3 sessions done. PostgreSQL 16 configured via Docker + ERD with 52 tables/98 relations/15 enums + complete Prisma schema (2,271 lines, validated, client generated).

**Phase B1 (Schema & Migrations): ✅ Complete** — 4/4 sessions done. Init migration (2,853 lines of SQL covering all 52 tables) + seed script (818 lines with 40 students, 8 users, 12 ledger entries, etc.). Database is ready to be populated. Run locally: `bun run db:setup` → `bunx prisma migrate deploy` → `bunx prisma db seed`.

**Phase B2 (Authentication & RBAC): ✅ Complete** — 4/4 sessions done. NextAuth.js v4 with JWT + refresh token rotation + CredentialsProvider (bcrypt verify + account lockout). Permission middleware: `withPermission`/`withTenant`/`withIdempotency`/`withAudit`. MFA (TOTP) with setup/verify/disable endpoints. Login page (2-step: credentials → MFA OTP). Middleware protects `/api/v1/*` + allows public donations (Risk R10).

---

## 4. Phase B0 — Database Foundation (3 days)

### 0.1 — PostgreSQL Setup + Connection

**Objective:** Install and configure PostgreSQL for local development + production.

**Tasks:**
1. Install PostgreSQL 16 locally (or use Docker: `docker run --name madrashaos-db -e POSTGRES_PASSWORD=secret -p 5432:5432 -d postgres:16`)
2. Create database: `CREATE DATABASE madrashaos;`
3. Create user: `CREATE USER madrashaos_user WITH PASSWORD 'secret'; GRANT ALL ON DATABASE madrashaos TO madrashaos_user;`
4. Set up `.env` file: `DATABASE_URL="postgresql://madrashaos_user:secret@localhost:5432/madrashaos?schema=public"`
5. Verify connection: `psql $DATABASE_URL -c "SELECT version();"`
6. Install Prisma: `bun add prisma @prisma/client` (already installed)
7. Initialize Prisma: `bunx prisma init` (creates `prisma/schema.prisma` + `.env`)

**Deliverables:**
- PostgreSQL running locally
- `.env` with `DATABASE_URL`
- `prisma/schema.prisma` initialized with PostgreSQL provider
- `src/lib/db.ts` Prisma client singleton (already exists at `src/lib/db.ts`)

**Exit criteria:** `bunx prisma db pull` connects successfully (empty schema).

---

### 0.2 — ERD Document Generation

**Objective:** Create a visual Entity Relationship Diagram documenting all 40+ tables and their relations.

**Tasks:**
1. Read SRS Part 7 (Database Requirements) — naming conventions, multi-tenant strategy, indexing, audit structures
2. Map all 40+ modules to database tables (use `src/lib/mock/types.ts` as the type contract)
3. Define relations:
   - Organization (1) → Branches (M)
   - Branch (1) → Students (M)
   - Student (1) → Guardian (M)
   - Student (1) → FeePlan (1) → Installments (M)
   - Student (1) → AttendanceRecords (M)
   - Account (1) → LedgerEntries (M)
   - User (1) → Approvals (M) [as requester + approver]
4. Generate ERD using `prisma-erd-generator` or `mermaid` syntax
5. Save to `docs/ERD.md` + `docs/ERD.png` (visual diagram)

**Deliverables:**
- `docs/ERD.md` — text-based ERD with Mermaid diagram
- `docs/DATA_DICTIONARY.md` — table-by-table field definitions (name, type, nullable, default, index, description)

**Exit criteria:** ERD reviewed + approved; covers all 40+ modules from SRS Part 2.

---

### 0.3 — Prisma Schema Draft (all 40+ models)

**Objective:** Write the complete `prisma/schema.prisma` with all models, relations, indexes, and multi-tenant columns.

**Tasks:**
1. Define the base mixin pattern (every table gets): `id`, `organization_id`, `branch_id`, `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by`
2. Define all 40+ models grouped by module layer:
   - **Foundation** (6): Organization, Branch, User, Role, Permission, AuditLog, ModuleConfig, SecurityPolicy, Backup
   - **People** (6): Student, Guardian, Teacher, Employee, Admission, TeacherAssignment
   - **Academic** (6): Class, Section, Subject, Routine, AttendanceSession, AttendanceRecord, Exam, Mark, Result
   - **Finance** (8): FeePlan, FeeInstallment, FeePayment, Scholarship, Account, LedgerEntry, CashBankTransfer, ZakatTransaction, Donation
   - **Operations** (8): InventoryItem, Purchase, PurchaseItem, Supplier, Asset, HostelRoom, HostelBed, MealPlan, LibraryBook, LibraryIssue, Vehicle, FuelLog
   - **Communication** (4): Notice, Document, Report, Approval
3. Define all relations (1:1, 1:M, M:M via junction tables)
4. Define indexes (SRS §7.3): every `organization_id` + `branch_id` gets a composite index; `student_id` gets an index; `date` columns get indexes
5. Define enums: `Role`, `AttendanceStatus`, `FeeStatus`, `LedgerStatus`, `ApprovalStatus`, `AccountType`, `FundType`, `DocumentType`
6. Add `@@map` to convert camelCase models to snake_case table names
7. Add `@@schema("public")` for the default schema

**Deliverables:**
- `prisma/schema.prisma` — complete schema with all 40+ models
- `docs/SCHEMA_REVIEW.md` — review notes (any SRS gaps found)

**Exit criteria:** `bunx prisma validate` passes; schema reviewed against SRS Part 7.

---

## 5. Phase B1 — Schema & Migrations (5 days)

### 1.1 — Foundation Models Migration

**Objective:** Create and apply the first migration for Foundation tables.

**Tasks:**
1. Run `bunx prisma migrate dev --name foundation_tables`
2. Verify tables created in PostgreSQL: `\dt` in psql
3. Verify indexes: `\di`
4. Create Prisma client: `bunx prisma generate`

**Tables created:** Organization, Branch, User, Role, Permission, RolePermission, AuditLog, ModuleConfig, SecurityPolicy, BackupRecord

**Deliverables:**
- `prisma/migrations/0001_foundation_tables/migration.sql`
- Updated `@prisma/client` types

**Exit criteria:** `SELECT * FROM organizations;` works (empty table).

---

### 1.2 — People Models Migration

**Objective:** Create and apply migration for People tables.

**Tasks:**
1. Add People models to schema.prisma (Student, Guardian, Teacher, Employee, Admission, TeacherAssignment)
2. Run `bunx prisma migrate dev --name people_tables`
3. Verify relations (Student → Guardian, Student → Class)

**Tables created:** Students, Guardians, Teachers, Employees, Admissions, TeacherAssignments, Classes, Sections

**Deliverables:**
- `prisma/migrations/0002_people_tables/migration.sql`

**Exit criteria:** Can insert a Student with linked Guardian + Class.

---

### 1.3 — Academic + Finance Models Migration

**Objective:** Create and apply migration for Academic + Finance tables.

**Tasks:**
1. Add Academic models (Routine, AttendanceSession, AttendanceRecord, Exam, Mark, Result)
2. Add Finance models (FeePlan, FeeInstallment, FeePayment, Scholarship, Account, LedgerEntry, CashBankTransfer, ZakatTransaction, Donation)
3. Run `bunx prisma migrate dev --name academic_finance_tables`
4. Verify the Zakat fund isolation: Account table has `fund` column (enum: `general` | `zakat`)

**Tables created:** Routines, AttendanceSessions, AttendanceRecords, Exams, Marks, Results, FeePlans, FeeInstallments, FeePayments, Scholarships, Accounts, LedgerEntries, CashBankTransfers, ZakatTransactions, Donations

**Deliverables:**
- `prisma/migrations/0003_academic_finance_tables/migration.sql`

**Exit criteria:** Can insert a LedgerEntry with balanced debit/credit accounts.

---

### 1.4 — Seed Data (40 students, 8 users, 12 ledger entries)

**Objective:** Seed the database with the same data the mock fixtures contain, so the UI looks identical after the swap.

**Tasks:**
1. Create `prisma/seed.ts` that inserts:
   - 1 Organization (Darul Uloom Madrasha) + 3 Branches (Dhaka, Chittagong, Sylhet)
   - 8 Users (1 per persona) with hashed passwords
   - 8 Roles + 110+ Permissions + RolePermission junction
   - 4 Classes + 8 Guardians + 40 Students
   - 40 FeePlans (3 installments each = 120 installments)
   - 8 FeePayments (recent receipts)
   - 8 Accounts (incl. Zakat fund with `fund: "zakat"`)
   - 12 LedgerEntries (1 month of activity, 2 pending)
   - 4 AttendanceSessions (Class 5-A across 4 days)
   - 10 InventoryItems (3 low-stock)
   - 5 Notices + 6 Approvals
2. Add `"prisma": {"seed": "bun run prisma/seed.ts"}` to package.json
3. Run `bunx prisma db seed`
4. Verify counts: `SELECT COUNT(*) FROM students;` → 40

**Deliverables:**
- `prisma/seed.ts`
- Seed data matches `src/lib/mock/fixtures/` exactly (same student codes, same fee amounts)

**Exit criteria:** Database seeded; all counts match the mock fixtures.

---

## 6. Phase B2 — Authentication & RBAC (5 days)

### 2.1 — NextAuth.js Setup (JWT + refresh)

**Objective:** Configure NextAuth.js with JWT strategy + refresh token rotation.

**Tasks:**
1. Install: `bun add next-auth@4 @auth/prisma-adapter bcryptjs`
2. Create `src/lib/auth/config.ts` — NextAuth options:
   - Strategy: `jwt` (access token 15 min, refresh token 7 days rotating)
   - Providers: CredentialsProvider (email + password)
   - Callbacks: `jwt` (inject role + permissions), `session` (expose role + permissions)
3. Create `src/app/api/auth/[...nextauth]/route.ts` — NextAuth handler
4. Create `src/lib/auth/password.ts` — bcrypt hash/compare utilities
5. Create `src/middleware.ts` — protect `/api/v1/*` routes (require valid session)
6. Create `src/lib/auth/tokens.ts` — JWT sign/verify + refresh rotation

**Deliverables:**
- `src/lib/auth/config.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/middleware.ts`
- Login endpoint: `POST /api/auth/callback/credentials`

**Exit criteria:** Can login via `curl -X POST http://localhost:3000/api/auth/callback/credentials -d '{"email":"admin@madrashaos.org","password":"secret"}'` and receive a JWT.

---

### 2.2 — Permission Middleware

**Objective:** Build the permission-checking middleware that enforces SRS §5.1 on every API endpoint.

**Tasks:**
1. Create `src/lib/auth/with-permission.ts` — higher-order function:
   ```typescript
   export function withPermission(code: string, handler: RequestHandler): RequestHandler {
     return async (req, ctx) => {
       const session = await getSession();
       if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
       if (!session.permissions.includes(code)) {
         return Response.json({ error: "Forbidden", required: code }, { status: 403 });
       }
       return handler(req, ctx);
     };
   }
   ```
2. Create `src/lib/auth/with-tenant.ts` — injects `organization_id` + `branch_id` from session into every Prisma query
3. Create `src/lib/auth/with-idempotency.ts` — checks `Idempotency-Key` header + caches response
4. Create `src/lib/auth/with-audit.ts` — logs write operations to AuditLog table

**Deliverables:**
- `src/lib/auth/with-permission.ts`
- `src/lib/auth/with-tenant.ts`
- `src/lib/auth/with-idempotency.ts`
- `src/lib/auth/with-audit.ts`

**Exit criteria:** An endpoint decorated with `withPermission("fees.payment.create", ...)` returns 403 when called by a Teacher.

---

### 2.3 — MFA (TOTP)

**Objective:** Implement Time-based One-Time Password (TOTP) for MFA.

**Tasks:**
1. Install: `bun add otplib qrcode`
2. Create `src/lib/auth/mfa.ts` — generate secret + verify TOTP
3. Create endpoints:
   - `POST /api/v1/auth/mfa/setup` — returns QR code + secret
   - `POST /api/v1/auth/mfa/verify` — verifies TOTP code
   - `POST /api/v1/auth/mfa/disable` — removes MFA
4. Add `mfa_secret` + `mfa_enabled` columns to User table (migration)
5. Update login flow: if `mfa_enabled`, require TOTP after password

**Deliverables:**
- `src/lib/auth/mfa.ts`
- 3 MFA endpoints
- Migration: `0004_add_mfa_columns`

**Exit criteria:** User can enable MFA, and login requires TOTP code when enabled.

---

### 2.4 — 8 Roles + Permissions Seeded

**Objective:** Seed all 8 roles + 110+ permissions + RolePermission junction.

**Tasks:**
1. Update `prisma/seed.ts` to include:
   - 8 Roles (super-admin, authority, administrator, accountant, teacher, storekeeper, guardian, student)
   - 110+ Permissions (from `src/lib/auth/permissions.ts`)
   - RolePermission junction (from `src/lib/auth/role-permissions.ts`)
2. Assign roles to the 8 seeded users
3. Verify: `SELECT r.name, COUNT(rp.permission_id) FROM roles r JOIN role_permissions rp ON r.id = rp.role_id GROUP BY r.name;`

**Deliverables:**
- Updated `prisma/seed.ts` with roles + permissions

**Exit criteria:** Each user has the correct role + permissions per the `role-permissions.ts` map.

---

## 7. Phase B3 — Foundation API Endpoints (4 days)

### 3.1 — Organization & Multi-Branch API

**Endpoints:**
- `GET /api/v1/organizations` — current org info
- `GET /api/v1/branches` — list branches
- `POST /api/v1/branches` — create branch (perm: `organization.branch.create`)
- `PATCH /api/v1/branches/:id` — update branch
- `POST /api/v1/branches/switch` — switch active branch (Risk R1: logs context change)

**Tasks:**
1. Create `src/app/api/v1/organizations/route.ts`
2. Create `src/app/api/v1/branches/route.ts` + `[id]/route.ts`
3. Apply `withPermission` + `withTenant` + `withAudit` middleware
4. Validate input with Zod schemas

**Exit criteria:** `curl -H "Authorization: Bearer <token>" http://localhost:3000/api/v1/branches` returns 3 branches.

---

### 3.2 — Module Configuration API

**Endpoints:**
- `GET /api/v1/modules` — list enabled modules
- `PATCH /api/v1/modules/:id` — toggle module on/off (perm: `organization.module.toggle`)
- Risk R2: when toggling OFF a module with dependents, return 409 + dependent list

**Exit criteria:** Toggling Hostel off returns 409 with dependent modules listed.

---

### 3.3 — RBAC API + Permission Matrix

**Endpoints:**
- `GET /api/v1/roles` — list roles (perm: `rbac.role.view`)
- `POST /api/v1/roles` — create role (perm: `rbac.role.create`)
- `PATCH /api/v1/roles/:id` — update role (perm: `rbac.role.update`)
- `GET /api/v1/permissions` — list all permission codes
- `PUT /api/v1/roles/:id/permissions` — assign permissions (perm: `rbac.permission.assign`)

**Exit criteria:** Can create a custom role + assign permissions via API.

---

### 3.4 — Audit Trail API + Field-Diff

**Endpoints:**
- `GET /api/v1/audit` — list audit events (perm: `audit.view`) with pagination + filters (actor, date range, entity type)
- `GET /api/v1/audit/:id` — single event with field-diff (old → new)
- `GET /api/v1/audit/export` — export to CSV (perm: `audit.export`)

**Exit criteria:** Every write to Students/Fees/Ledger produces an AuditLog entry with field-level diffs.

---

## 8. Phase B4 — People API Endpoints (5 days)

### 4.1 — Student API (CRUD + promotion)

**Endpoints:**
- `GET /api/v1/students` — list with filters (class, section, status, search) (perm: `students.view`)
- `GET /api/v1/students/:id` — single student with guardian + class info
- `POST /api/v1/students` — create (perm: `students.create`)
- `PATCH /api/v1/students/:id` — update (perm: `students.update`)
- `POST /api/v1/students/:id/promote` — promote to next class (perm: `students.promote`) — preserves history (Risk R4)
- `GET /api/v1/students/:id/history` — promotion history timeline

**Exit criteria:** Promoting a student creates a new ClassAssignment row; old row preserved.

---

### 4.2 — Admission API (Kanban + pipeline)

**Endpoints:**
- `GET /api/v1/admissions` — list with status filter (perm: `admission.view`)
- `POST /api/v1/admissions` — new application
- `PATCH /api/v1/admissions/:id/status` — move between stages (Applied → Interviewed → Approved → Registered → Rejected)
- `POST /api/v1/admissions/:id/register` — convert to Student (creates Student + FeePlan + User account)

**Exit criteria:** Moving an admission to "Registered" auto-creates a Student + FeePlan + User account.

---

### 4.3 — Guardian + Teacher API

**Endpoints:**
- `GET /api/v1/guardians` — list (perm: `guardians.view`); Guardian role sees only own children (scope: `guardians.view.own`)
- `GET /api/v1/teachers` — list (perm: `teachers.view`)
- `POST /api/v1/teachers` — create (perm: `teachers.create`)
- `POST /api/v1/teachers/assign` — assign teacher to class+section+subject (perm: `teachers.assign`) — blocks duplicate active assignment

**Exit criteria:** Assigning the same teacher to the same class+subject twice returns 409.

---

### 4.4 — Employee API

**Endpoints:**
- `GET /api/v1/employees` — list (perm: `employees.view`)
- `POST /api/v1/employees` — create (perm: `employees.create`)
- `PATCH /api/v1/employees/:id` — update
- `DELETE /api/v1/employees/:id` — soft delete (sets `deleted_at`; user cannot login)

**Exit criteria:** Resigned employee's user account is disabled.

---

## 9. Phase B5 — Academic API Endpoints (5 days)

### 5.1 — Academic Structure API (routine/calendar)

**Endpoints:**
- `GET /api/v1/classes` — list classes + sections
- `POST /api/v1/classes` — create (perm: `academic.structure.edit`)
- `GET /api/v1/routines` — list routines (class × day × period)
- `POST /api/v1/routines` — create routine entry (blocks double-booked teacher)

**Exit criteria:** Creating a routine with a double-booked teacher returns 409.

---

### 5.2 — Attendance API (idempotent submit)

**Endpoints:**
- `GET /api/v1/attendance/sessions` — list (perm: `attendance.view`)
- `POST /api/v1/attendance/sessions` — create + submit records (perm: `attendance.take`)
  - Accepts `Idempotency-Key` header (SRS §6.5)
  - Default status: `present` for all students
  - Returns 201 on first submit; 200 + cached response on duplicate key
- `GET /api/v1/attendance/sessions/:id` — single session with records

**Exit criteria:** Submitting the same attendance twice with the same Idempotency-Key returns the same response (no duplicate records).

---

### 5.3 — Examination API (marks + publish)

**Endpoints:**
- `GET /api/v1/exams` — list (perm: `exams.view`)
- `POST /api/v1/exams` — create (perm: `exams.view` + teacher)
- `PUT /api/v1/exams/:id/marks` — enter marks (perm: `exams.enter-marks`) — validates `mark > full_marks` → 400
- `POST /api/v1/exams/:id/publish` — publish (perm: `exams.publish`) — locks paper

**Exit criteria:** Entering mark=60 for a 50-mark paper returns 400 "Mark exceeds full marks".

---

### 5.4 — Results API (mark sheet + GPA)

**Endpoints:**
- `GET /api/v1/results` — list (perm: `results.view`)
- `GET /api/v1/results/:studentId` — student mark sheet with GPA
- `POST /api/v1/results/generate` — generate results for a class (perm: `results.generate`)
- Conditional position column (Risk R7: only if `ranking_enabled`)

**Exit criteria:** Generated result sheet shows GPA per student; position column hidden when ranking disabled.

---

## 10. Phase B6 — Finance API Endpoints (7 days)

### 6.1 — Fees API (collect payment + receipt)

**Endpoints:**
- `GET /api/v1/fees/plans` — list fee plans (perm: `fees.view`)
- `GET /api/v1/fees/outstanding` — outstanding fees report (Risk R12: "as of [timestamp]")
- `POST /api/v1/fees/payments` — collect payment (perm: `fees.payment.create`)
  - Accepts `Idempotency-Key` header
  - Posts balanced ledger entry (debit Cash, credit Fee Income) via Golden Flow
  - Generates receipt number
  - Returns receipt data
- `GET /api/v1/fees/payments/:id` — single payment with receipt

**Exit criteria:** Collecting a fee payment creates a FeePayment + LedgerEntry (balanced) + AuditLog entry.

---

### 6.2 — Scholarship & Discount API

**Endpoints:**
- `GET /api/v1/scholarships` — list (perm: `scholarship.view`)
- `POST /api/v1/scholarships` — create discount (perm: `scholarship.approve`)
- Risk R8: above-threshold discounts auto-route to approval queue (status: `pending`)

**Exit criteria:** Creating a 50% discount routes to approval queue; creating a 5% discount auto-approves.

---

### 6.3 — Accounting (GL) API (balanced entries)

**Endpoints:**
- `GET /api/v1/accounts` — list accounts (perm: `accounting.ledger.view`)
- `GET /api/v1/ledger` — list entries with running balance
- `POST /api/v1/ledger` — post entry (perm: `accounting.ledger.post`)
  - Validates `debit_amount === credit_amount` → 400 if not
  - Creates LedgerEntry + updates Account balances
  - If status: `pending`, routes to approval queue
- `GET /api/v1/ledger/statement` — statement with running balance

**Exit criteria:** Submitting an unbalanced entry (debit 100, credit 90) returns 400 "Debits must equal credits".

---

### 6.4 — Cash & Bank API

**Endpoints:**
- `POST /api/v1/cashbank/transfer` — transfer between accounts (perm: `cashbank.transfer`) — posts both legs in one balanced entry

**Exit criteria:** Transferring ৳10,000 from Cash to Bank creates one LedgerEntry with debit Bank + credit Cash.

---

### 6.5 — Zakat API (fund isolation)

**Endpoints:**
- `GET /api/v1/zakat` — Zakat fund balance + transactions (perm: `zakat.view`)
- `POST /api/v1/zakat/receive` — receive Zakat (perm: `zakat.receive`) — posts to Zakat fund account only
- `POST /api/v1/zakat/distribute` — distribute (perm: `zakat.distribute`) — validates `amount <= fund_balance` → 400 if not

**Exit criteria:** Distributing more than the Zakat fund balance returns 400 with fund badge.

---

### 6.6 — Donations API (honeypot + receipt)

**Endpoints:**
- `GET /api/v1/donations` — list (perm: `donations.view`)
- `POST /api/v1/donations` — create (perm: `donations.create` OR `donations.create.public` for public)
  - Validates email OR mobile required → 400 if neither
  - Honeypot field: if `website` field is filled, silently reject (return 200 but don't save)
  - If donation type = Zakat, posts to Zakat fund account
  - Returns receipt data

**Exit criteria:** Submitting a donation with the honeypot field filled returns 200 but creates no record.

---

## 11. Phase B7 — Operations API Endpoints (5 days)

### 7.1 — Inventory + Purchase API

**Endpoints:**
- `GET /api/v1/inventory` — list items (perm: `inventory.view`)
- `POST /api/v1/inventory/receive` — receive stock (perm: `inventory.receive`)
- `POST /api/v1/inventory/issue` — issue stock (perm: `inventory.issue`) — validates `qty <= qty_in_stock` → 400
- `GET /api/v1/purchases` — list (perm: `purchase.view`)
- `POST /api/v1/purchases` — create (perm: `purchase.create`)
- `POST /api/v1/purchases/:id/approve` — approve (perm: `purchase.approve`)
- `POST /api/v1/purchases/:id/receive` — receive items (updates inventory)

**Exit criteria:** Issuing more stock than available returns 400.

---

### 7.2 — Supplier + Asset API

**Endpoints:**
- `GET /api/v1/suppliers` — list with outstanding totals (perm: `suppliers.view`)
- `GET /api/v1/assets` — list (perm: `assets.view`)
- `POST /api/v1/assets/:id/transfer` — transfer (perm: `assets.transfer`)
- `POST /api/v1/assets/:id/dispose` — dispose (perm: `assets.dispose`) — soft-deletes from active register, keeps record

**Exit criteria:** Disposed asset shows as `disposed` but record remains queryable.

---

### 7.3 — Hostel + Food/Meal API

**Endpoints:**
- `GET /api/v1/hostel/rooms` — list rooms + beds with occupancy (perm: `hostel.view`)
- `POST /api/v1/hostel/beds/:id/allocate` — allocate bed to student (perm: `hostel.allocate`) — rejects if already occupied
- `DELETE /api/v1/hostel/beds/:id/allocate` — deallocate
- `GET /api/v1/food/meal-plans` — list meal plans (perm: `food.meal-plan`)
- `POST /api/v1/food/expense` — record meal expense (posts to Food account)

**Exit criteria:** Allocating an occupied bed returns 409.

---

### 7.4 — Library + Transport API

**Endpoints:**
- `GET /api/v1/library/books` — list (perm: `library.view`)
- `POST /api/v1/library/issue` — issue book (perm: `library.issue`) — rejects if no copies available
- `POST /api/v1/library/return` — return book (perm: `library.return`)
- `GET /api/v1/transport/vehicles` — list (perm: `transport.view`)
- `POST /api/v1/transport/fuel` — record fuel (posts to vehicle cost + expense)

**Exit criteria:** Issuing an already-issued book (no copies) returns 409.

---

## 12. Phase B8 — Communication & Platform API (4 days)

### 8.1 — Notices API (audience + recipient count)

**Endpoints:**
- `GET /api/v1/notices` — list (perm: `notices.view`)
- `POST /api/v1/notices` — create + send (perm: `notices.compose` + `notices.send`)
  - Risk R11: returns `recipient_count` based on audience filter
- `GET /api/v1/notices/:id/recipients` — preview recipients (before send)

**Exit criteria:** Creating a notice with audience "Class 5 guardians" returns `recipient_count: 12`.

---

### 8.2 — Documents API (upload + signed URL)

**Endpoints:**
- `POST /api/v1/documents/upload` — upload (perm: `documents.upload`)
  - Validates file size ≤ 60MB → 413 if larger
  - Stores file in S3/local storage
  - Returns signed URL with 10-minute expiry
- `GET /api/v1/documents/:id/download` — download (perm: `documents.download`) — returns signed URL

**Exit criteria:** Uploading a 70MB file returns 413 "File exceeds 60MB limit".

---

### 8.3 — Reports API (filtered + async export)

**Endpoints:**
- `GET /api/v1/reports/:type` — generate report (perm varies by type)
  - Finance reports require `reports.finance.view` (Teacher gets 403 — D3)
  - Returns job ID for async export
- `GET /api/v1/jobs/:id` — poll job status (SRS §6.5)

**Exit criteria:** Teacher requesting a finance report gets 403.

---

### 8.4 — Approvals API (no self-approve)

**Endpoints:**
- `GET /api/v1/approvals` — list (perm: `approval.view`)
- `GET /api/v1/approvals/pending` — pending for current user
- `POST /api/v1/approvals/:id/approve` — approve (perm: `approval.approve`)
  - D16: if `requested_by === current_user` → 403 "Cannot approve own request"
- `POST /api/v1/approvals/:id/reject` — reject (perm: `approval.reject`)

**Exit criteria:** Approving your own request returns 403.

---

## 13. Phase B9 — Integration & OpenAPI (3 days)

### 9.1 — OpenAPI 3.1 Spec Generation

**Objective:** Auto-generate the OpenAPI spec from the Next.js API routes.

**Tasks:**
1. Install `swagger-jsdoc` or use Next.js built-in route metadata
2. Annotate every API route with JSDoc comments (summary, params, responses, permission)
3. Generate `openapi.json` at build time
4. Serve at `GET /api/docs` (Swagger UI)

**Deliverables:**
- `openapi.json` — complete spec for all 40+ endpoints
- `/api/docs` — Swagger UI for interactive testing

**Exit criteria:** Frontend can generate a typed client from the spec.

---

### 9.2 — Frontend Client Swap (mockApi → real)

**Objective:** Replace the mock data layer with the real API client.

**Tasks:**
1. Generate TypeScript client: `bunx openapi-typescript-codegen --input openapi.json --output src/lib/api/client`
2. Update `src/lib/query/client.ts` — replace `mockApi` imports with generated client
3. Update session store — replace DevToolbar role-switch with real login/logout
4. Add `Authorization: Bearer <token>` header to all API calls via a fetch interceptor
5. Test every screen — verify data flows correctly

**Deliverables:**
- `src/lib/api/client.ts` (generated)
- Updated `src/lib/query/client.ts` (swap complete)
- Zero component changes (same TanStack Query hooks, same UI)

**Exit criteria:** All 54 routes work with real database data; DevToolbar no longer needed for role-switching (real login instead).

---

### 9.3 — End-to-End Verification (8 flows)

**Objective:** Verify all 8 prototype flows work end-to-end on real data.

**Tasks:**
1. Login as Teacher → take attendance → submit (idempotent)
2. Login as Accountant → collect fee → verify receipt + ledger entry
3. Login as Accountant → record expense → login as Authority → approve
4. Login as Guardian → view child results
5. Login as Authority → approve pending request
6. Login as Administrator → admit student → verify Student + FeePlan created
7. Public donation → verify honeypot + receipt
8. Switch language bn/en/ar → verify all data localized

**Deliverables:**
- E2E test results (all 8 flows pass)
- `docs/INTEGRATION_SIGNOFF.md`

**Exit criteria:** All 8 flows pass; database has real data; frontend fully integrated.

---

## 14. Cumulative Database Readiness Checklist

After every phase, the database has:

| After Phase | What's in the database |
|---|---|
| B0 | PostgreSQL running + schema drafted |
| B1 | All 40+ tables + seed data (40 students, 8 users, 12 ledger entries) |
| B2 | 8 roles + 110+ permissions + auth system |
| B3 | Foundation endpoints (org, branches, RBAC, audit) |
| B4 | People endpoints (students, admissions, guardians, teachers) |
| B5 | Academic endpoints (attendance, exams, results) |
| B6 | Finance endpoints (fees, accounting, Zakat, donations) |
| B7 | Operations endpoints (inventory, hostel, library, transport) |
| B8 | Communication endpoints (notices, documents, reports, approvals) |
| B9 | Frontend swapped to real API + E2E verified → **FULL DATABASE-BACKED APP** |

---

## 15. Documents Needed (per phase)

| # | Document | Phase | Status |
|---|---|---|---|
| 1 | ERD (Entity Relationship Diagram) | B0.2 | ❌ To create |
| 2 | Data Dictionary | B0.2 | ❌ To create |
| 3 | Prisma Schema | B0.3 | ❌ To create |
| 4 | Schema Review Notes | B0.3 | ❌ To create |
| 5 | Migration files (SQL) | B1.1-B1.3 | ❌ To create |
| 6 | Seed script | B1.4 | ❌ To create |
| 7 | Auth flow document | B2.1 | ❌ To create |
| 8 | OpenAPI 3.1 spec | B9.1 | ❌ To create |
| 9 | Integration sign-off | B9.3 | ❌ To create |

---

## 16. Risk Lock-Ins Enforced at Backend Level

| Risk | Lock-in | Backend session |
|---|---|---|
| R1 | Branch switch logs context change | B3.1 |
| R3 | Zero-permission user gets 403 + friendly error | B2.2 |
| R6 | Attendance idempotent (Idempotency-Key) | B5.2 |
| R8 | Discount above threshold routes to approval | B6.2 |
| R9 | Zakat fund isolation (account-level `fund` column) | B6.5 |
| R10 | Donation honeypot + email/mobile mandatory | B6.6 |
| R11 | Notice recipient_count returned | B8.1 |
| R12 | Outstanding fees "as of [timestamp]" | B6.1 |
| R13 | PDF generation server-side (branded) | B8.3 |
| R14 | Bangla/Arabic numerals in API responses | B9.2 |
| R15 | Approval delegation (OOO) | B8.4 |
| R16 | Public donation rate-limit (IP) | B6.6 |

---

## 17. Do-Not-Do List Enforcement (Backend)

| # | Anti-pattern | Backend enforcement |
|---|---|---|
| D3 | Teacher sees financial data | API returns 403 for `/api/v1/fees` if role=teacher |
| D7 | Disable module silently with dependents | API returns 409 + dependent list |
| D9 | Mobile attendance requires >3 taps per student | API accepts batch submit (all students at once) |
| D16 | Requester approves own request | API returns 403 if `requested_by === currentUser` |
| D17 | Public visitor reaches protected endpoint | Middleware returns 401 for unauthenticated |
| D18 | Zakat funds co-mingle | DB constraint: Zakat account only accepts Zakat transactions |
| D19 | Student history deleted on promotion | Soft-delete only; history table never hard-deleted |

---

## 18. What This Plan Does NOT Include (out of scope)

- **Frontend redesign** — the UI is complete from the UI/UX plan; this plan only swaps the data source
- **Real-time WebSocket notifications** — deferred to a future phase
- **Payment gateway integration** (bKash, SSL Commerz) — deferred; mock payment method for now
- **Email/SMS sending** — deferred; mock notifications for now
- **Production deployment** — covered in a separate deployment plan
- **Load testing** — deferred to post-launch
- **Data migration from existing paper/spreadsheet records** — separate engagement

---

## 19. Next Step

**Begin Phase B0 Session 0.1 immediately.** Install PostgreSQL, configure the connection, and verify `prisma db pull` connects. The Prisma schema draft (B0.3) is the largest single deliverable — it defines the entire data model that all 40+ API endpoints will build on.

After B1.4 (seed data), the database is ready. After B2.4 (auth), users can login. After B9.3 (integration), the frontend is fully wired to the real backend.

**Definition of success:** at the end of B9, a user opens the app, logs in with real credentials, sees real data from PostgreSQL, takes attendance (idempotent), collects a fee (posts to ledger), and views a branded PDF receipt — all on a real database with no mock data.
