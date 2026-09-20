# MadrashaOS — Changelog

## v1.0.0 (2026-09-20) — Production-Ready Handover

### Summary

MadrashaOS v1.0.0 is a multi-tenant, multi-branch Madrasha Management & ERP system with 54 routes, 200+ API endpoints, 53 database tables, and support for Bangla/English/Arabic (RTL). It covers students, academics, finance (including Zakat), operations, communication, and a public website.

### Phases Completed

#### Phase 1 — Boot the App
- Set up PostgreSQL 17 (user-local, no Docker/sudo needed)
- Generated Prisma Client, ran migrations (52 tables), seeded 8 users + 40 students
- Started dev server, verified login + dashboard

#### Phase 2 — Contract Mismatch + D3 Permission Enforcement (9 files)
- Added `toCamel()` deep transformer in `apiFetch()` — converts snake_case API responses to camelCase
- Added bespoke flattening for `getStudents()` (class/section/guardian) and `getLedgerEntries()` (debit/credit accounts)
- Wrapped 4 financial GET handlers with `withPermission()`: fees/plans, fees/payments, ledger, accounts
- Fixed Zod v4 `.iso()` → `.iso.datetime()`, attendance records include, ClassPerformanceWidget null-safety
- Fixed e2e-verify cookie extraction + variable shadowing
- Result: 8/8 e2e flows pass (was 2/8)

#### Phase 3 — Wire 3 Forms + 10 Missing Routes + Fix 28 Routes (48 files)
- Wired public donation form → `POST /api/v1/donations` (real receipt)
- Wired public admission form → `POST /api/v1/admissions` (real reference ID)
- Wired RBAC matrix save → `PUT /api/v1/roles/:id/permissions` (8 roles)
- Added 10 missing frontend routes: /guardians, /employees, /scholarship, /results, /cashbank, /security, /backup, /academic/structure, /tenants, /settings
- Fixed `actor_id` → `actor_user_id` bug in 28 API routes (was causing 500 errors)
- Fixed Zod v4 UUID validation (18 `.uuid()` calls → regex)
- Result: 8/8 e2e flows pass, all forms create real DB records

#### Phase 4 — Production Hardening (24 files)
- Added DB-backed `IdempotencyRecord` table (replaces in-memory Map)
- Built pluggable `NotificationService` (console/SMTP/Resend) with 8 templates
- Built pluggable `PaymentGateway` (manual/bKash/SSL Commerz) with full provider interface
- Wired notifications into 5 API routes (donations, fees, admissions, attendance, inventory)
- Fixed otplib v13 API migration (async verify)
- Fixed production build (`force-dynamic` on root layout)
- Created load test script (200 requests, 0 errors, 87 req/s)
- Result: Production build succeeds, 54 routes compiled

#### Phase 5 — Core Frontend Wiring (5 sessions)
- **5.1** Take Attendance: wired to `POST /attendance/sessions` with class/section selectors + idempotency
- **5.2** Collect Payment: wired to `POST /fees/payments` (Golden Flow: balanced ledger + receipt)
- **5.3** Exam Marks: wired to `GET /exams/:id` + `PUT /exams/:id/marks` with real student roster
- **5.4** Student Profile: wired promote (`POST /students/:id/promote`), upload document, real history timeline
- **5.5** Guardian scope: fixed security gap — guardian can no longer read ANY student's results (404 defense-in-depth)
- Fixed sessionStore sync (layout syncs client store with real server session on mount)

#### Phase 6 — Backend Bug Fixes (5 sessions, 19 files)
- **6.1** Purchases receive: now posts balanced LedgerEntry (debit Inventory, credit Cash/AP)
- **6.2** Branch switch: JWT callback re-reads `branch_id` from DB via 5-second cache; TopBar has functional dropdown
- **6.3** Notices: fixed `session.permissions` → `ctx.permissions`; donations audit log always written (removed `if (userId)` gate)
- **6.4** Attendance idempotency: replaced in-memory Map with `db.idempotencyRecord` (DB-backed, survives restarts)
- **6.5** 12 missing permission gates: employees, zakat, scholarships, suppliers, inventory, purchases, hostel, library, transport, food, assets, notices

#### Phase 7 — CMS + Payment Gateway Decisions (3 files)
- CMS: added warning banner explaining localStorage limitation (v2 = DB-backed CMS)
- Payment gateway: documented as manual-only for v1 (bKash/SSL Commerz scaffolded but not production-ready)
- Created `.env.example` with all env vars documented

#### Phase 8 — Security & Production Hardening (5 sessions)
- **8.1** Rotated NEXTAUTH_SECRET; fixed `.env` ↔ `docker-compose.yml` credential mismatch; created `.env.example`
- **8.2** Verified donations audit log works for public donations; added `organization.config.edit` permission (was using `.view` for write)
- **8.3** Documented Resend/SMTP setup with step-by-step instructions in `.env.example`
- **8.4** Built real `GET/PUT /api/v1/security/policy` + `GET/POST /api/v1/backup` (pg_dump) — replaced toast-only pages
- **8.5** Created `GET /api/v1/public/notices` (no auth); wired public notices page + home page to real DB data; added events page v1 limitation banner

#### Phase 9 — Documentation & Operational Readiness (7 new files)
- `docs/DEPLOYMENT.md` — complete deployment guide (quick start, production, Docker, backups, healthcheck, update/rollback)
- `docs/ADMIN_MANUAL.md` — day-to-day operations for administrators (create student, promote, collect fee, attendance, marks, RBAC, audit, security, backup)
- `docs/USER_GUIDE.md` — end-user guide for teachers, guardians, accountants
- `docs/DEVELOPER_GUIDE.md` — architecture, adding API routes/pages/templates, testing, debugging, design decisions
- `scripts/backup.sh` — pg_dump + gzip + 30-day retention, cron-ready
- `scripts/healthcheck.ts` — checks API + auth endpoints, exits 0/1

#### Phase 10 — Final Verification & Handover (4 sessions)
- **10.1** Expanded e2e-verify from 8 → 13 flows (added 5 POST/PUT flow tests: attendance, fee payment, exam marks, student promotion, guardian scope check)
- **10.2** Expanded load test from 4 → 12 endpoints with warmup phase; 600 requests, 0 errors, 83 req/s
- **10.3** Browser-verified all 6 role journeys (teacher, accountant, admin, guardian, public visitor, security RBAC) — zero errors, zero 500s
- **10.4** Tagged v1.0.0, created CHANGELOG.md, final commit

### Final Verification Results

| Check | Result |
|-------|--------|
| e2e-verify (13 flows) | ✅ 13/13 pass |
| Load test (600 requests) | ✅ 0 errors, 83 req/s |
| Health check | ✅ ALL CHECKS PASSED |
| Production build | ✅ 54 routes compiled |
| Browser verification | ✅ All 6 role journeys render without errors |

### Known v1 Limitations

1. CMS (`/website/content`) persists to localStorage (not DB) — v2
2. Payment gateway (bKash/SSL Commerz) is scaffolded but not wired — v2
3. Events page uses sample data — v2
4. SMS notifications are console-only (email works via Resend/SMTP) — v2
5. Language switching buttons render but don't change the locale — fix needed
