# MadrashaOS — Multi-Tenant SaaS Conversion Plan

**Status:** Draft v1
**Audience:** Engineering team, product owner
**Author:** Plan agent
**Last reviewed:** current

---

## 0. Executive Summary

MadrashaOS is **already 80% multi-tenant at the data layer**. The Prisma schema carries `organization_id` on 52 models (204 references) and `branch_id` on most of them (169 references). The `Organization` tenant root, `Branch` sub-tenant, and per-tenant `User` uniqueness (`@@unique([organization_id, email])`) are all in place. JWT carries `organization_id` + `branch_id` + `permissions[]`. 121 of 130 API routes already use `withPermission` + `getTenantContext`.

What's missing is the **SaaS product layer** — tenant onboarding, code-based login, platform super-admin portal, billing display, and a few **critical security fixes** to make the existing tenant isolation actually airtight.

This plan defines **7 phases (0–6)** that take MadrashaOS from "single-tenant demo with multi-tenant plumbing" to "operational multi-tenant SaaS". The **critical path** is Phase 0 → Phase 1 + Phase 2 (parallel) → Phase 3 → Phase 4. Phases 5 and 6 can run after.

**Total estimated effort: 8–12 engineering weeks** for one full-stack engineer, or 4–6 weeks with two engineers working in parallel on Phases 1 and 2.

---

## 1. Current State Audit (verified by reading the code)

### ✅ Already in place

| Capability | Location | Notes |
|---|---|---|
| Tenant root | `Organization` model | `slug @unique`, `name`, `name_bn`, `settings JSON` |
| Sub-tenant | `Branch` model | `@@unique([organization_id, code])` |
| Per-tenant user uniqueness | `User` | `@@unique([organization_id, email])` — constraint exists, but login doesn't use it |
| Tenant context in JWT | `src/lib/auth/config.ts` | `token.organization_id`, `token.branch_id`, `token.permissions` |
| Tenant scoping helper | `src/lib/auth/with-tenant.ts` | `tenantWhere(ctx)` returns `{ organization_id, branch_id? }` |
| Permission middleware | `withPermission(code, handler)` | Used on 121/130 routes |
| Global permission catalog | `Permission` model | 110+ codes, `code @unique`, no `organization_id` |
| Role-template pattern | `Role.organization_id String?` | NULL = platform role; `is_platform Boolean @default(false)` exists but unused in seed |
| ModuleConfigs (feature flags) | `ModuleConfig` model | `@@unique([organization_id, branch_id, module_key])` |
| SecurityPolicy | `SecurityPolicy` model | `@@unique([organization_id])` — 1:1 per org |
| Backup/restore tenant-scoped | `BackupRecord` model | Already filtered by `organization_id` |
| Audit log tenant-scoped | `AuditLog` model | Same |
| Trial/billing primitives | `Role.is_platform`, `tenant.provision` / `tenant.manage` permissions | Permissions exist but no UI/flow uses them |
| Existing "tenants" page | `src/app/(app)/tenants/page.tsx` | **Stub** — calls `/api/v1/organizations` which returns ONLY the current user's org (single-tenant response shape). Not actually a tenant list. |

### ❌ Critical gaps / bugs

| # | Gap | Severity | File |
|---|---|---|---|
| G1 | `authorize()` uses `db.user.findFirst({ where: { email } })` — does NOT filter by `organization_id`. If two orgs both have `abdul@example.com`, login returns an arbitrary one. The DB constraint prevents duplicate creates but login is blind to org. | **Critical security** | `src/lib/auth/config.ts:249` |
| G2 | `tenantWhere(ctx)` for `super-admin` returns `{ organization_id: ctx.organization_id }` — constrains super-admin to their OWN org, contradicting the inline comment "Super-admin sees across tenants — don't constrain." | **Critical logic bug** | `src/lib/auth/with-tenant.ts:101` |
| G3 | Super-admin role in `seed.ts` is created with `organization_id: org.id` (the demo org). A true platform super-admin needs to be org-agnostic. | Medium | `prisma/seed.ts:382` |
| G4 | `User.organization_id` is NOT NULL — there's no clean way to represent a platform super-admin without inventing a fake "Platform" org. | Medium | `prisma/schema.prisma:342` |
| G5 | No `Subscription` / `Invoice` tables for SaaS billing (the existing `FeePayment`/`LedgerEntry` are for the madrasha's own finances, not platform billing). | Required for Phase 4 | — |
| G6 | No `TenantSignupRequest` table — no way to track inbound signup requests. | Required for Phase 1 | — |
| G7 | No Row-Level Security at the DB layer — tenant isolation is purely application-enforced. A missed `where: { organization_id }` = silent data leak. | High | — |
| G8 | No tenant provisioning automation — `prisma/seed.ts` hard-codes one org. Provisioning a new tenant requires manually running 6 sequential creates. | High | `prisma/seed.ts:304–431` |
| G9 | The Organization model has no short `code` field. `slug` is kebab-case ("darul-uloom-madrasha") — not suitable as a login code users type. | Medium | `prisma/schema.prisma:180` |
| G10 | Login UI has only email + password fields — no madrasha-code field. | Required for Phase 2 | `src/app/login/page.tsx` |
| G11 | `/api/v1/organizations` returns ONLY the current user's org (`findFirst({ where: { id: ctx.organization_id } })`). Not a tenant-listing endpoint. | Required for Phase 3 | `src/app/api/v1/organizations/route.ts:30` |
| G12 | No public routes for `/signup` or `/platform/*`. Middleware only whitelists `/api/auth/*`, donations POST, admissions POST, public notices GET. | Required for Phases 1 & 3 | `src/middleware.ts` |
| G13 | No usage metering — branch count for billing is computed ad hoc. | Low | — |
| G14 | No trial/expiry enforcement — login doesn't check if the org's subscription is active. | Required for Phase 4 | — |

---

## 2. Guiding Principles

1. **Don't break existing tenants.** The current Darul Uloom demo org + seeded users must keep working through every phase. Every migration must be backward-compatible.
2. **Defense in depth.** Tenant isolation should be enforced at (a) the application layer via `tenantWhere`, (b) automated tests that scan every Prisma call, and (c) eventually at the DB layer via RLS.
3. **No payment gateway in v1.** Billing is display-only ("you owe 600 BDT this month"). Payment collection is a future phase.
4. **No email/SMS in v1.** Signup approval/denial is communicated through the platform admin portal — the platform operator calls the requester manually ("we will talk with them and provide them the access").
5. **Provisioning is transactional.** Either a new tenant gets ALL its baseline data (org + branch + roles + role-permissions + security policy + module configs + admin user), or nothing.
6. **Madrasha codes are short and human-friendly.** Auto-generated on provisioning, editable by platform admin. 4–8 chars, uppercase, no ambiguous chars (no `O/0`, `I/1`).
7. **Super-admin is a real platform user, not a tenant user.** Live in a dedicated "Platform" org (Option B — see Phase 0 decision below) to avoid making `User.organization_id` nullable.

---

## 3. Phased Breakdown

### Phase 0 — Foundation Audit & Hardening

**Goal:** Make the existing single-tenant codebase actually safe to host multiple tenants. Fix the login data-leak bug (G1), the super-admin scoping bug (G2), and add the schema primitives every later phase needs (short madrasha `code`, billing tables, signup-request table). No new user-facing features.

#### 0.1 Schema changes

**Add to `Organization` model:**
```prisma
code             String    @unique        // short login code, e.g. "DUM001"
status           String    @default("active")  // active | suspended | deleted
trial_ends_at    DateTime? @db.Timestamptz
suspended_at     DateTime? @db.Timestamptz
suspended_reason String?
```
Index: `@@index([status])`, `@@index([trial_ends_at])`.
Migration note: backfill `code` for the existing demo org from its `slug` (e.g. `"darul-uloom-madrasha"` → `"DUM001"`). Make `code` unique. The `slug` stays unique too — it's used for URLs; `code` is used for login.

**New model: `TenantSignupRequest`** (foundation layer)
```prisma
model TenantSignupRequest {
  id              String    @id @default(uuid()) @db.Uuid
  // What the requester submitted
  org_name        String
  org_name_bn     String?
  org_slug        String    @unique         // requested slug (URL-safe)
  org_code        String    @unique         // requested short code
  contact_name    String
  contact_email   String                     // not unique — same person could request for multiple orgs
  contact_phone   String
  address         String?
  estimated_branches Int   @default(1)
  notes           String?                    // free-text from requester
  // Workflow state
  status          String    @default("pending")  // pending | approved | rejected | provisioned | failed
  reviewed_by     String?   @db.Uuid              // platform admin User
  reviewed_at     DateTime? @db.Timestamptz
  review_note     String?
  // Link to the provisioned org (set after approval + provisioning)
  provisioned_org_id String? @db.Uuid
  // Audit
  created_at      DateTime  @default(now()) @db.Timestamptz
  updated_at      DateTime  @updatedAt      @db.Timestamptz
  deleted_at      DateTime? @db.Timestamptz
  created_by      String?   @db.Uuid
  updated_by      String?   @db.Uuid

  provisioned_org Organization? @relation("OrgFromSignupRequest", fields: [provisioned_org_id], references: [id])
  reviewer        User?         @relation("SignupRequestReviewer", fields: [reviewed_by], references: [id])

  @@index([status])
  @@index([contact_email])
  @@index([created_at])
  @@index([deleted_at])
  @@map("tenant_signup_requests")
}
```
Add back-relation on `Organization` (`signup_requests TenantSignupRequest[] @relation("OrgFromSignupRequest")`) and on `User` (`reviewed_signup_requests TenantSignupRequest[] @relation("SignupRequestReviewer")`).

**New model: `Subscription`** (Phase 4 prep — defined now, used later)
```prisma
model Subscription {
  id                       String    @id @default(uuid()) @db.Uuid
  organization_id          String    @unique @db.Uuid     // 1:1 per org
  plan                     String    @default("trial")    // trial | starter | pro | suspended
  status                   String    @default("trialing") // trialing | active | past_due | cancelled | suspended
  branch_count_snapshot    Int       @default(0)          // last metered branch count
  monthly_amount_bdt       Decimal   @default(300) @db.Decimal(10, 2)
  currency                 String    @default("BDT")
  current_period_start     DateTime  @db.Timestamptz
  current_period_end       DateTime  @db.Timestamptz
  trial_ends_at            DateTime? @db.Timestamptz
  cancelled_at             DateTime? @db.Timestamptz
  // Audit
  created_at               DateTime  @default(now()) @db.Timestamptz
  updated_at               DateTime  @updatedAt      @db.Timestamptz
  deleted_at               DateTime? @db.Timestamptz
  created_by               String?   @db.Uuid
  updated_by               String?   @db.Uuid

  organization Organization @relation(fields: [organization_id], references: [id])
  invoices     Invoice[]

  @@index([status])
  @@index([trial_ends_at])
  @@map("subscriptions")
}
```

**New model: `Invoice`** (Phase 4 prep)
```prisma
model Invoice {
  id                String    @id @default(uuid()) @db.Uuid
  subscription_id   String    @db.Uuid
  organization_id   String    @db.Uuid              // denormalized for fast tenant queries
  period_start      DateTime  @db.Timestamptz
  period_end        DateTime  @db.Timestamptz
  branch_count      Int                              // branches active in this period
  unit_price_bdt    Decimal   @db.Decimal(10, 2)    // 300
  amount_bdt        Decimal   @db.Decimal(10, 2)    // branch_count × unit_price_bdt
  currency          String    @default("BDT")
  status            String    @default("draft")    // draft | issued | paid | void | uncollectible
  due_date          DateTime  @db.Timestamptz
  paid_at           DateTime? @db.Timestamptz
  // Audit
  created_at        DateTime  @default(now()) @db.Timestamptz
  updated_at        DateTime  @updatedAt      @db.Timestamptz
  deleted_at        DateTime? @db.Timestamptz
  created_by        String?   @db.Uuid
  updated_by        String?   @db.Uuid

  subscription Subscription @relation(fields: [subscription_id], references: [id])
  organization Organization @relation(fields: [organization_id], references: [id])

  @@unique([subscription_id, period_start])
  @@index([organization_id, status])
  @@index([due_date])
  @@index([deleted_at])
  @@map("invoices")
}
```
Add back-relations `subscriptions Subscription[]` and `invoices Invoice[]` on `Organization`.

**No changes** to `User`, `Role`, `Permission`, `Branch` schema in Phase 0 — they're already correct.

#### 0.2 Critical security fixes

**Fix G1 — Login must resolve org from a code.** In Phase 0, do the minimal fix: add an OPTIONAL `organizationCode` credential. If provided, filter `findFirst({ where: { email, organization: { code }, deleted_at: null } })`. If NOT provided (backward-compat for existing sessions), and the email matches MORE than one user, return a generic error `"Multiple accounts exist with this email. Please provide your madrasha code."` and force the UI to collect the code.

This minimal fix is rolled into Phase 2's polished UI. Phase 0 just patches the leak so the demo isn't broken in the interim.

**Fix G2 — Super-admin `tenantWhere` bypass.** Change `with-tenant.ts:101` to:
```ts
if (ctx.role === "super-admin") {
  return {}; // truly empty — no org constraint
}
```
Audit every super-admin-reachable handler to ensure they explicitly scope to the targeted org (not `tenantWhere(ctx)`). This is critical because `tenantWhere` returning `{}` means an unsafeguarded `db.student.findMany()` would return **every student across every tenant**.

Add a defense-in-depth rule: **super-admin handlers must use `withPlatformPermission(code, handler)`** (new helper) that returns the platform context and forbids the use of `tenantWhere` — instead, handlers receive the target `orgId` from the URL (e.g. `/api/v1/platform/tenants/:orgId/students`) and explicitly filter on it.

#### 0.3 Fix G3 — Super-admin org affiliation

**Decision: Option B (dedicated "Platform" org).** Create a real `Organization` row with `slug = "platform"`, `code = "PLATFORM"`, `name = "MadrashaOS Platform"`. Super-admin users live in this org with `branch_id = NULL`. This avoids making `User.organization_id` nullable (which would touch 100+ queries).

`seed.ts` is updated to create this Platform org + the platform super-admin user. The existing demo Darul Uloom org becomes just one of potentially many tenants.

#### 0.4 Automated tenant-isolation test

Add a vitest suite (`tests/tenant-isolation.test.ts`) that, for every model with `organization_id`, attempts a query as tenant A and verifies it cannot see tenant B's rows. This catches G1-class regressions.

Add an ESLint custom rule (or simple grep-based CI check) that flags any `db.<model>.findMany`/`findFirst`/`update`/`delete` call in `src/app/api/**` that doesn't include `organization_id` in its `where` clause (with allowlist for `Organization`, `Permission`, `TenantSignupRequest`, `Subscription` reads from the platform admin context).

#### 0.5 API routes (Phase 0)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/auth/check-email` | Public — given an email, returns whether 0, 1, or >1 orgs have a user with that email. Used by the login UI to decide whether to show the madrasha-code field. (Replaces the silent `findFirst` ambiguity.) |

#### 0.6 UI changes (Phase 0)

None user-facing. Backend-only.

#### 0.7 Key technical decisions

- **Madrasha code format:** 6 chars, uppercase alnum, no `O/0/I/1/L`. Auto-generated on provisioning. Stored in `Organization.code`, globally unique. Editable by platform admin (with a unique check).
- **Slug stays for URLs.** Don't conflate `slug` and `code` — slug is kebab-case URL-safe, code is short and human-typed.
- **Super-admin model:** Option B (Platform org). Document the decision in `src/lib/auth/PLATFORM_ADMIN.md` so future engineers don't try to refactor `organization_id` to nullable.
- **`tenantWhere` semantics:** super-admin returns `{}` (truly unconstrained). Every super-admin handler MUST filter explicitly by a URL-derived `orgId`. Add a lint rule.

#### 0.8 Dependencies

None. This is the foundation.

#### 0.9 Effort

**L (1.5 weeks).** The schema additions are small but the security audit + test suite + ESLint rule + careful review of all 121 `withPermission`-protected routes is where the time goes.

#### 0.10 Risks

- **R0.1 — Backward-compat breakage.** Adding `code @unique` to `Organization` requires backfilling the demo org. If the backfill migration fails, the demo environment breaks. Mitigation: migration runs in a transaction; verify in staging first.
- **R0.2 — Super-admin `tenantWhere` change leaks data.** If any existing super-admin handler relied on `tenantWhere(ctx)` returning `{ organization_id }` to scope them to their own org, flipping to `{}` makes that handler return all tenants' data. Mitigation: grep every `withPermission("tenant.*")` handler before merging.
- **R0.3 — Test suite false positives.** The "every query must include `organization_id`" lint rule will flag legitimate platform-admin queries. Mitigation: allowlist comment `// platform-admin: cross-tenant` on those lines.

---

### Phase 1 — Tenant Onboarding (Signup Request → Approval → Provisioning)

**Goal:** A new madrasha can submit a signup request via a public form. A platform admin reviews the request, approves it, and the system **automatically provisions** the new tenant (org + first branch + roles + permissions + security policy + module configs + first admin user). The requester then receives login instructions.

This is the biggest phase. It depends on Phase 0's schema (`TenantSignupRequest`, `Organization.code`) and on Phase 3's admin portal for the approval UI — but the **signup form, provisioning engine, and request API** can be built in parallel with Phase 3.

#### 1.1 Schema changes

Already added in Phase 0 (`TenantSignupRequest`). In Phase 1 we also need:

**New model: `ProvisioningLog`** (audit trail for the provisioning transaction)
```prisma
model ProvisioningLog {
  id                 String    @id @default(uuid()) @db.Uuid
  signup_request_id  String?   @db.Uuid
  organization_id    String?   @db.Uuid   // set once org is created
  step               String              // create_org | create_branch | create_roles | ...
  status             String    @default("started")  // started | completed | failed
  error_message      String?
  started_at         DateTime  @default(now()) @db.Timestamptz
  completed_at       DateTime? @db.Timestamptz

  signup_request TenantSignupRequest? @relation(fields: [signup_request_id], references: [id])
  organization   Organization?         @relation(fields: [organization_id], references: [id])

  @@index([signup_request_id])
  @@index([organization_id])
  @@index([status])
  @@map("provisioning_logs")
}
```
Add back-relations `provisioning_logs ProvisioningLog[]` on `TenantSignupRequest` and `Organization`.

**Extend `Organization.settings` JSON schema** (documented, not enforced): `{ locale: "en"|"bn"|"ar", currency: "BDT", academicYearStart: "January", branding: { primaryColor, logoUrl }, featureFlags: {...} }`. Used in Phases 5+.

#### 1.2 API routes

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/public/tenant-signup` | **Public** | Submit a new signup request. Validates: name, code (regex `^[A-Z0-9]{4,8}$`), slug (URL-safe), contact email + phone, address, estimated branches. Stores row with `status = "pending"`. Rate-limit by IP (5/hour). |
| `GET` | `/api/v1/public/tenant-signup/:id` | Public (knows the request ID) | Requester checks the status of their own request. Returns `{ status, reviewedAt, reviewNote }`. |
| `GET` | `/api/v1/platform/signups` | `tenant.provision` | Platform admin lists all signup requests. Filters: `?status=pending&search=foo`. |
| `GET` | `/api/v1/platform/signups/:id` | `tenant.provision` | Detail view of one request. |
| `POST` | `/api/v1/platform/signups/:id/approve` | `tenant.provision` | Approves a request. Triggers provisioning (see §1.5). On success: `status = "provisioned"`, `provisioned_org_id` set. On failure: `status = "failed"`, error captured in `ProvisioningLog`. |
| `POST` | `/api/v1/platform/signups/:id/reject` | `tenant.provision` | Rejects a request with a `review_note`. `status = "rejected"`. No provisioning. |
| `POST` | `/api/v1/platform/tenants/:orgId/suspend` | `tenant.manage` | Suspend a tenant (sets `Organization.status = "suspended"`, `Subscription.status = "suspended"`). Future logins are blocked (see Phase 4). |
| `POST` | `/api/v1/platform/tenants/:orgId/reactivate` | `tenant.manage` | Reverse of suspend. |

#### 1.3 UI pages

| Path | Auth | Description |
|---|---|---|
| `/signup` | Public | Public signup request form. Three steps: (1) Madrasha info (name, name_bn, proposed code, slug), (2) Contact person (name, email, phone), (3) Address + estimated branches + notes. On submit: toast + redirect to `/signup/status?id=...`. |
| `/signup/status` | Public (with request ID) | "Your request is being reviewed" / "Approved — your account is ready" / "Rejected: \<reason\>". |
| `/platform/signups` | Platform super-admin | Table of all signup requests. Filter by status. Click to view detail. Approve / Reject buttons. |
| `/platform/signups/:id` | Platform super-admin | Full request detail + provisioning log timeline (after approval). Shows the auto-generated admin user's email + temporary password (since no email in v1, the platform operator reads this and calls the requester manually). |
| `/platform/tenants` | Platform super-admin | Replaces the existing stub at `src/app/(app)/tenants/page.tsx`. Lists all provisioned orgs with `code`, `name`, `status`, `branch_count`, `subscription_status`. Includes Suspend/Reactivate actions. |

#### 1.4 Middleware changes

Whitelist in `src/middleware.ts`:
- `POST /api/v1/public/tenant-signup` → public (with rate-limit)
- `GET /api/v1/public/tenant-signup/:id` → public
- `GET /signup` and `/signup/status` → public (page navigation, currently passed through)
- `/platform/*` and `/api/v1/platform/*` → require session + `tenant.provision` or `tenant.manage` permission (NEW: middleware can read permissions from JWT).

Add an explicit **platform-admin route guard**: a new `requirePlatformPermission(code)` server-side helper that wraps `withPermission` AND checks `ctx.role === "super-admin"` AND `ctx.organization_id === PLATFORM_ORG_ID`.

#### 1.5 Key technical decisions

**Provisioning automation.** Extract the relevant slice of `prisma/seed.ts` (lines 308–431) into a reusable `src/lib/tenant/provision.ts` module:

```ts
export async function provisionTenant(input: {
  orgName: string;
  orgNameBn?: string;
  orgSlug: string;
  orgCode: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  estimatedBranches: number;
  signupRequestId: string;
  reviewedBy: string;
}): Promise<{ orgId: string; adminUserId: string; tempPassword: string }>;
```

The function executes these steps inside a single `$transaction`:

1. **Create Organization** with `code`, `slug`, `name`, `name_bn`, `status = "active"`, `trial_ends_at = now + 14 days`, `settings = { locale: "en", currency: "BDT", academicYearStart: "January" }`.
2. **Create the first Branch** with `code = "main"`, `name = "Main Branch"`, `is_active = true`.
3. **Create 8 system Roles** cloned from a template (`src/lib/tenant/role-templates.ts`) — authority, administrator, accountant, teacher, storekeeper, guardian, student (NOT super-admin — that's platform-only). All with `is_system = true`, `organization_id = <new org>`.
4. **Create RolePermission rows** for each role from the same template (mirror of `ROLE_PERMS` in `seed.ts:142`, minus the super-admin entry).
5. **Create a SecurityPolicy** row with defaults (mirror of seed defaults).
6. **Create ModuleConfig** rows for all 14 modules (all enabled).
7. **Create a Subscription** row with `status = "trialing"`, `trial_ends_at = now + 14 days`, `branch_count_snapshot = 1`, `monthly_amount_bdt = 300`, `current_period_start = now`, `current_period_end = now + 30 days`.
8. **Create the first admin User** — `role = "authority"` (or `administrator` — **decision: `authority`** because the signup requester is presumably the madrasha head/principal), `email = contactEmail`, `branch_id = <new branch>`, random 12-char temp password (bcrypt-hashed), `status = "active"`, `mfa_enabled = false`.
9. **Write ProvisioningLog rows** at each step (status `started` → `completed`). On any step failure: that step's log gets `status = "failed"` with `error_message`, the transaction rolls back, the signup request gets `status = "failed"`.
10. **Update the TenantSignupRequest** with `status = "provisioned"`, `provisioned_org_id`, `reviewed_at`, `reviewed_by`.

The function returns the new admin user's email + the temporary password (only shown ONCE in the platform admin portal — never persisted in plaintext; not hashed differently than a normal password).

**Madrasha code generation.** When the requester submits a preferred code, validate uniqueness + regex. When the platform admin needs to auto-generate (e.g. the requester left it blank or the code is taken), generate from the org name: take the first 3 alnum chars of the slug, uppercase, append a 3-digit zero-padded counter (`DAR001`). Ensure uniqueness via retry on conflict.

**Approval gate is strict.** No "auto-provision on signup." The signup creates a `pending` row; only `POST /api/v1/platform/signups/:id/approve` triggers provisioning.

**Idempotency.** If provisioning is retried (e.g. after a transient failure), check whether the org already exists for this signup request — if yes, skip org creation and resume from the failed step.

#### 1.6 Dependencies

- **Phase 0 must be merged** — needs `TenantSignupRequest` table, `Organization.code`, fixed `tenantWhere`.
- **Phase 3's admin portal UI** is needed for the platform admin to actually approve — but the provisioning engine, signup form, and request API can be built first and tested via curl/Postman.

#### 1.7 Effort

**XL (2 weeks).** Provisioning engine + signup form + status page + 6 API routes + middleware changes + idempotency tests. This is the most code-heavy phase.

#### 1.8 Risks

- **R1.1 — Partial provisioning.** If step 5 of 10 fails, the org exists but has no roles → users can't be created → tenant is in a broken state. Mitigation: `$transaction` wraps all 10 steps; on rollback the org row is also reverted. Verify Prisma's interactive transactions handle this for the JSONB+multiple-tables write pattern.
- **R1.2 — Code/slug collision.** A requester submits a code or slug that's taken. Mitigation: validation at signup-time AND at provisioning-time (race window between submit and approve could be hours/days).
- **R1.3 — Temp-password leak.** The temp password is shown in the platform admin portal. Anyone with `tenant.provision` permission sees it. Mitigation: it's only shown ONCE (not stored in plaintext; the bcrypt hash is what's stored); after first login, the user is forced to change it.
- **R1.4 — Rate-limit bypass.** Public `/api/v1/public/tenant-signup` could be spammed. Mitigation: IP-based rate-limit (Upstash Redis or in-memory sliding window) + honeypot field + reCAPTCHA in a later phase.
- **R1.5 — No email means no login instructions.** The requester doesn't get an automated email with their temp password. The platform operator must call them. Mitigation: the admin portal clearly shows the temp password + madrasha code + login URL; the operator is trained to read these out over the phone. This is per business requirements.

---

### Phase 2 — Madrasha-Code Login

**Goal:** The login UI collects a 3rd field — the madrasha code — and the backend resolves the org from the code BEFORE authenticating the user. This closes the G1 data-leak permanently and supports the per-tenant email uniqueness that already exists.

This phase is independent of Phase 1 (existing tenants need this fix too) and can run in parallel with Phase 1.

#### 2.1 Schema changes

None — `Organization.code` was added in Phase 0.

#### 2.2 API routes

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/public/madrasha-codes/:code` | Public | "Does this madrasha code exist?" Returns `{ valid: boolean, orgName?: string, orgNameBn?: string }`. Used by the login UI to validate the code as the user types and show the org name as confirmation. |
| `POST` | `/api/v1/auth/callback/credentials` | NextAuth internal | Modified `authorize()` — see §2.5. |

The `/api/v1/auth/check-email` from Phase 0 becomes redundant once Phase 2 ships — remove it.

#### 2.3 UI pages

**Modify `/login` (existing page).** Add a third field — "Madrasha Code" — between the email and password. UX:

- User types madrasha code (with autocomplete help if they've logged in before — store last-used codes in `localStorage`).
- On blur, fetch `/api/v1/public/madrasha-codes/:code` to validate + show the resolved org name as a green checkmark: `"✓ Darul Uloom Madrasha"`.
- If invalid, show: `"No madrasha found with this code. Check the code or contact your administrator."`
- Submit sends `{ email, password, madrashaCode }` to NextAuth's `signIn()`.

The MFA flow after credentials is unchanged.

**Decision: don't auto-detect code from email.** A common UX shortcut is to look up the email first and show only the relevant org. This re-introduces G1's information disclosure (an attacker can enumerate which emails are registered). Force the user to provide the code.

#### 2.4 Middleware changes

None — `/login` page is already public.

#### 2.5 Key technical decisions

**Modified `authorize()`:**

```ts
async authorize(credentials) {
  const { email, password, madrashaCode } = credentials;
  if (!email || !password || !madrashaCode) {
    throw new Error("Email, password, and madrasha code are required.");
  }
  // Resolve org from code first.
  const org = await db.organization.findUnique({
    where: { code: madrashaCode.toUpperCase() },
    select: { id: true, status: true, trial_ends_at: true, slug: true },
  });
  if (!org) throw new Error("Invalid madrasha code.");
  if (org.status === "suspended") {
    throw new Error("This madrasha's account is suspended. Contact the platform operator.");
  }
  // Now find the user WITHIN this org.
  const user = await db.user.findFirst({
    where: { email, organization_id: org.id, deleted_at: null },
    select: { ...sameAsBefore },
  });
  // ...rest unchanged (password verify, MFA, lockout, etc.)
}
```

**CredentialsProvider credentials shape:** add `madrashaCode: { label: "Madrasha Code", type: "text" }`.

**Backward compat for the demo:** During Phase 0's transition (before Phase 2 ships), `madrashaCode` is optional. After Phase 2 ships, the login UI always sends it; the backend requires it. Drop the optional path.

**Brute-force on madrasha code:** Rate-limit `/api/v1/public/madrasha-codes/:code` (30 req/10min per IP) to prevent code enumeration. Codes are 6 chars from a 32-char alphabet = ~10^9 possibilities, so brute force is impractical anyway, but rate-limiting protects the DB.

#### 2.6 Dependencies

- **Phase 0** must be merged (for `Organization.code` to exist).

#### 2.7 Effort

**M (3–4 days).** The schema is ready; this is mostly UI + the `authorize()` rewrite + the public code-lookup route. Careful testing of the MFA flow + the demo org.

#### 2.8 Risks

- **R2.1 — Existing sessions break.** The current JWT carries `organization_id` but not `organization_code`. Existing logged-in users are fine (they re-auth on next 15-min cycle), but the login page must work for them. Mitigation: changes are backward-compatible during the transition window.
- **R2.2 — Code typo lockout.** A user mistypes their madrasha code → login fails → their account gets the failed-login counter incremented. Mitigation: distinguish "code invalid" from "credentials invalid" — code-invalid returns immediately without touching the user's failed-login counter.
- **R2.3 — Code lookup DB load.** Every login attempt + every code-lookup-as-you-type hits the DB. Mitigation: `Organization.code` is `@unique` (indexed); the lookup is sub-millisecond. For the as-you-type validation, debounce 400ms.

---

### Phase 3 — Platform Super-Admin Portal

**Goal:** A dedicated portal at `/platform/*` for the platform operator to manage tenants: list, view detail, approve/reject signups, suspend/reactivate, edit billing display, view audit logs.

This phase wires the UI to the APIs built in Phase 1 (and adds a few new ones).

#### 3.1 Schema changes

None new — uses Phase 0's `TenantSignupRequest`, `Subscription`, and Phase 1's `ProvisioningLog`.

#### 3.2 API routes (additional to Phase 1's)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/platform/tenants` | `tenant.manage` | List ALL orgs (cross-tenant). Returns `id, name, name_bn, code, slug, status, branch_count, subscription_status, trial_ends_at, created_at`. Pagination + search. |
| `GET` | `/api/v1/platform/tenants/:orgId` | `tenant.manage` | Detail: org info + branches + users count + subscription + recent audit logs. |
| `PATCH` | `/api/v1/platform/tenants/:orgId` | `tenant.manage` | Edit tenant: name, code (with unique check), contact info. NOT settings JSON — that's Phase 5. |
| `GET` | `/api/v1/platform/tenants/:orgId/audit-logs` | `tenant.manage` | Cross-tenant audit log access (super-admin only). |
| `GET` | `/api/v1/platform/stats` | `tenant.provision` | Dashboard KPIs: total tenants, active, trialing, suspended, pending signups, MRR (sum of `monthly_amount_bdt` across active subs). |
| `GET` | `/api/v1/platform/billing/overview` | `tenant.manage` | Platform-wide billing summary (total expected, total collected, total outstanding). Stubbed in v1 since no payments. |

The existing `/api/v1/organizations` route stays unchanged — it's for tenant users viewing their OWN org. The new `/api/v1/platform/tenants` is for super-admin viewing ALL orgs.

#### 3.3 UI pages

| Path | Auth | Description |
|---|---|---|
| `/platform` | Super-admin | Dashboard with KPI cards (total tenants, pending signups, MRR, suspended). Quick-links to sub-pages. |
| `/platform/signups` | Super-admin | Signup request queue (Phase 1's UI). |
| `/platform/signups/:id` | Super-admin | Request detail + provisioning log (Phase 1's UI). |
| `/platform/tenants` | Super-admin | All tenants table. Replaces the stub at `src/app/(app)/tenants/page.tsx`. |
| `/platform/tenants/:orgId` | Super-admin | Tenant detail: branches, users, subscription, audit log tail. Suspend/Reactivate buttons. |
| `/platform/billing` | Super-admin | Per-tenant billing overview (Phase 4). |
| `/platform/audit` | Super-admin | Cross-tenant audit log search. |

**Layout:** Use a separate `(platform)` route group with its own sidebar (different from the `(app)` tenant sidebar). The platform sidebar has: Dashboard, Signups, Tenants, Billing, Audit, Settings.

#### 3.4 Middleware changes

- **NEW matcher:** `/platform/*` and `/api/v1/platform/*` require an active session.
- **Platform permission gate:** Add a server-side check in the `(platform)/layout.tsx` that redirects non-super-admins to `/dashboard`. The check uses `getTenantContext()` + verifies `ctx.role === "super-admin"` AND `ctx.organization_id === PLATFORM_ORG_ID`.

#### 3.5 Key technical decisions

- **Platform admin login:** The platform super-admin logs in via the SAME `/login` page as tenant users — but uses the Platform org's madrasha code (`PLATFORM`). Their JWT carries `organization_id = <platform_org_id>` and `role = "super-admin"`. On successful login, the `success` state of the login page redirects to `/platform` (not `/dashboard`) if the role is `super-admin`.
- **Audit log scope:** Platform super-admin sees ALL audit logs across ALL tenants (filtered by `organization_id` from URL, not from `tenantWhere`). This is why the super-admin `tenantWhere` change in Phase 0 is critical — they must NOT inherit the tenant scoping.
- **No cross-tenant mutation by default:** Even super-admin cannot edit a tenant's data (students, fees, etc.) — only tenant metadata (name, status, subscription). Read-only cross-tenant, write-within-platform-context only.

#### 3.6 Dependencies

- **Phase 0** (super-admin scoping fix, Platform org).
- **Phase 1** (signup approval APIs + provisioning engine) — the portal is the UI layer over Phase 1's APIs.
- **Phase 2** is NOT required for Phase 3 (the platform admin uses the same login flow, but Phase 3 can ship before Phase 2).

#### 3.7 Effort

**L (1.5 weeks).** Lots of UI: 7 pages, all with shadcn/ui tables, filters, detail views. Reuses the design system from `(app)`. The API routes are thin wrappers around Prisma queries.

#### 3.8 Risks

- **R3.1 — Super-admin scope leak.** A buggy `/api/v1/platform/tenants/:orgId/students` endpoint could return ALL students across ALL tenants if it forgets to filter by `orgId`. Mitigation: Phase 0's lint rule + the integration test suite.
- **R3.2 — Confusing UX.** Super-admin sees a different sidebar and different routes. Make sure the platform layout visually communicates "you are operating as the platform, not as a tenant" — a banner color or label.
- **R3.3 — Single super-admin.** If the single seeded super-admin account is locked/lost, the platform is bricked. Mitigation: seed 2 super-admin accounts; document the recovery procedure (run `prisma db seed -- --platform-only`).

---

### Phase 4 — Billing & Subscription (Display Only)

**Goal:** Display the per-tenant billing information: current plan, branch count, monthly amount (300 × branches = total), trial end date, next invoice. No payment gateway. No actual collection. The platform admin can see all tenants' billing status in one view.

#### 4.1 Schema changes

Already added in Phase 0 (`Subscription`, `Invoice`). In Phase 4 we add:

**Extend `Organization.settings` JSON schema** to include `billing: { contactName, contactEmail, contactPhone, billingAddress }` (the billing contact may differ from the signup contact).

**New model: `UsageSnapshot`** (metering — optional in v1, recommended)
```prisma
model UsageSnapshot {
  id               String   @id @default(uuid()) @db.Uuid
  organization_id  String   @db.Uuid
  snapshot_date    DateTime @db.Date
  branch_count     Int
  student_count    Int
  user_count       Int
  storage_bytes    BigInt?
  created_at       DateTime @default(now()) @db.Timestamptz

  organization Organization @relation(fields: [organization_id], references: [id])

  @@unique([organization_id, snapshot_date])
  @@index([snapshot_date])
  @@map("usage_snapshots")
}
```
Add back-relation `usage_snapshots UsageSnapshot[]` on `Organization`.

A nightly cron job (or API route triggered by Vercel Cron) creates a row per org. This drives the billing calculation: `monthly_amount = branch_count × 300`.

#### 4.2 API routes

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/billing/subscription` | Any tenant user | Current tenant's subscription. Returns `{ plan, status, branchCount, monthlyAmountBdt, trialEndsAt, currentPeriodEnd, nextInvoiceAmount }`. |
| `GET` | `/api/v1/billing/invoices` | `organization.config.view` | List of past invoices for this tenant. (In v1, mostly drafts/auto-generated; no payment records.) |
| `GET` | `/api/v1/billing/usage` | `organization.config.view` | Usage history (last 12 months of `UsageSnapshot`). |
| `GET` | `/api/v1/platform/billing` | `tenant.manage` | Platform-wide billing overview: total MRR, trialing count, suspended count, per-tenant breakdown. |
| `GET` | `/api/v1/platform/tenants/:orgId/billing` | `tenant.manage` | One tenant's billing detail. |
| `POST` | `/api/v1/billing/preview` | Any tenant user | "What-if" calculator: given an input branch count, returns the monthly amount. Used by the billing page UI. |

#### 4.3 UI pages

| Path | Auth | Description |
|---|---|---|
| `/billing` | Any tenant user | Tenant-facing billing page. Shows: current plan card (Trial / Starter), branch count, monthly amount (large), trial end date (countdown), pricing breakdown (300 × N branches = N×300 BDT), CTA "Add a branch" (links to existing branch creation flow). In v1, NO "Pay now" button. |
| `/platform/billing` | Super-admin | Platform billing overview. Table of all tenants with: name, code, plan, status, branch count, monthly amount, last invoice status. Totals row at the bottom. |

#### 4.4 Cron / scheduled job

Add `src/app/api/cron/usage-snapshot/route.ts` — called daily by Vercel Cron (or external scheduler). For each non-suspended org, count branches and insert a `UsageSnapshot` row. Also recompute `Subscription.branch_count_snapshot` + `monthly_amount_bdt`.

#### 4.5 Key technical decisions

- **Pricing is hardcoded for v1:** `300 BDT × branch_count`. Stored as `Subscription.monthly_amount_bdt = 300` (unit price) — the total is computed as `branch_count × monthly_amount_bdt`. If pricing changes later, add a `pricing_tier` table.
- **Invoices are auto-generated:** On subscription creation (provisioning), generate the first invoice (`status = "draft"`). On `current_period_end`, a cron job marks it `issued` and creates the next period's draft. In v1, no invoice is ever `paid` (no payment gateway).
- **Trial enforcement:** On login (Phase 2's `authorize()`), after resolving the org, check `org.trial_ends_at` and `org.status`. If `trial_ends_at < now` AND no active subscription, set `org.status = "suspended"` and block login with: `"Your trial has ended. Contact the platform operator to activate your subscription."` The platform admin can manually extend trials or mark as active.

#### 4.6 Dependencies

- **Phase 0** (`Subscription`, `Invoice` tables, `Organization.trial_ends_at`).
- **Phase 1** (provisioning creates the initial `Subscription` row).
- **Phase 3** (platform admin sees the billing overview).

#### 4.7 Effort

**L (1 week).** Schema is ready. Mostly the billing UI + the cron job + the trial-enforcement logic in `authorize()`.

#### 4.8 Risks

- **R4.1 — Trial expiry blocks legitimate tenants.** A tenant on a 14-day trial who hasn't been onboarded by the platform operator yet gets locked out. Mitigation: trials start from provisioning, not from signup; platform operator can extend trials.
- **R4.2 — Cron job failure.** If the daily `UsageSnapshot` job fails, billing is stale. Mitigation: alert on failure; the billing page shows "last snapshot: \<date\>" so it's visible.
- **R4.3 — Invoice accumulation.** In v1 (no payments), invoices pile up as `issued` but never `paid`. This is fine — it's the expected state until the payment gateway is added in a later phase.

---

### Phase 5 — Per-Tenant Customization

**Goal:** Each madrasha can customize their instance: branding (logo, primary color), default locale (en/bn/ar), feature flags (enable/disable modules per branch), and academic-year-start month. Uses the existing `Organization.settings JSON` field + `ModuleConfig` table.

#### 5.1 Schema changes

**Extend `Organization.settings` JSON schema** (documented in a TypeScript type):
```ts
type OrgSettings = {
  locale: "en" | "bn" | "ar";           // default UI locale
  currency: "BDT";                       // future: multi-currency
  academicYearStart: "January" | "April" | "July";
  branding: {
    primaryColor?: string;               // hex, defaults to teal #0F766E
    logoUrl?: string;                   // uploaded via /api/v1/organizations/logo
    faviconUrl?: string;
  };
  featureFlags: {
    [key: string]: boolean;              // e.g. "hostel.enabled": false
  };
  notificationPreferences: {
    // stub for future email/SMS phase
  };
};
```

**No new tables.** `ModuleConfig` already exists for per-branch module toggles.

#### 5.2 API routes

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/organizations/settings` | Any tenant user | Returns the public subset of `settings` (locale, branding, currency). Used by the layout to apply branding. |
| `PATCH` | `/api/v1/organizations/settings` | `organization.config.edit` | Update `settings.branding`, `settings.locale`, `settings.academicYearStart`, `settings.featureFlags`. Validates the JSON shape. |
| `POST` | `/api/v1/organizations/logo` | `organization.config.edit` | Upload a logo file (stored in Vercel Blob or S3). Returns the public URL. |
| `GET` | `/api/v1/modules` (existing) | Any tenant user | Already returns module configs. Modified to merge `settings.featureFlags` with `ModuleConfig` rows. |

#### 5.3 UI pages

| Path | Auth | Description |
|---|---|---|
| `/settings/branding` | `organization.config.edit` | Branding form: logo upload, primary color picker (with preview), default locale select, academic year start select. |
| `/settings/modules` | `organization.module.toggle` | Feature flag toggles per module (existing `/organization/modules/page.tsx` is enhanced to merge with `settings.featureFlags`). |

#### 5.4 Key technical decisions

- **Branding is applied at the layout level.** The root `(app)/layout.tsx` fetches `/api/v1/organizations/settings` once on mount, injects a `<style>` tag with CSS variables for `--primary` (from `branding.primaryColor`), and sets the document title + favicon. Cached client-side via SWR with a 5-minute revalidation.
- **Locale is applied via `next-intl`** (or a simpler homegrown i18n) — the `settings.locale` selects the default language dictionary. Per-user override stored in `User.preferences.locale`. This is a meaningful chunk of work; **consider deferring locale switching to a later sub-phase** if time-constrained.
- **Feature flags are read at module-mount time.** The `(app)/layout.tsx` sidebar fetches `/api/v1/modules` and hides menu items for disabled modules. The API routes for disabled modules return `404` (defense in depth).

#### 5.5 Dependencies

- **Phase 0** (`Organization.settings` field exists).
- No other dependency — can run after Phase 4 or in parallel with Phase 6.

#### 5.6 Effort

**M (4–5 days).** The branding form + logo upload + CSS variable injection is the bulk. Locale switching is optional and can be deferred.

#### 5.7 Risks

- **R5.1 — Invalid color breaks the layout.** A user sets `primaryColor = "#fff"` and the entire UI becomes unreadable. Mitigation: validate hex format + contrast check (reject low-contrast combos) + a "reset to default" button.
- **R5.2 — Logo upload size.** A 10MB logo slows the login page. Mitigation: server-side resize on upload (sharp) + max 200KB after compression.
- **R5.3 — Feature flag inconsistency.** A module is disabled but a background job still runs. Mitigation: every job checks the feature flag at the start.

---

### Phase 6 — Hardening & Production Readiness

**Goal:** Make the multi-tenant system production-grade. Row-Level Security at the DB, monitoring/alerting, per-tenant backup verification, and a load test.

#### 6.1 Schema changes

None.

#### 6.2 Row-Level Security (PostgreSQL)

Enable RLS on every tenant-scoped table. Pattern:

```sql
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE students FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON students
  USING (organization_id = current_setting('app.tenant_id', true)::uuid);

-- Platform super-admin role bypasses RLS:
CREATE POLICY platform_admin_bypass ON students
  FOR ALL
  TO platform_admin_role
  USING (true) WITH CHECK (true);
```

**Prisma integration:** Prisma doesn't natively set session variables. Two options:

- **Option A (recommended for v1):** Wrap every tenant-scoped Prisma call in a `$transaction` that issues `SET LOCAL app.tenant_id = $orgId` first. This requires a small `withTenantContext(orgId, async () => { ... })` helper that uses Prisma's `$executeRaw`. Update `withPermission` to call this wrapper automatically.
- **Option B (heavier):** Use a connection-pooler that sets the variable per-connection (e.g. PgBouncer with auth_query). More setup, but zero app-code changes.

**Recommendation:** Option A in Phase 6. It's a one-time refactor of `withPermission` + a test suite that verifies RLS rejects unscoped queries.

#### 6.3 Monitoring & alerting

- **Sentry** for error tracking (per-tenant tagging via `organization_id`).
- **Structured logs** with `organization_id` + `branch_id` on every log line.
- **Alerting rules:** spike in 401s on `/api/v1/auth/*` (brute-force), any 500 in `/api/v1/platform/*` (platform outage), any provisioning failure.
- **Uptime checks** on `/api/v1/health` + `/login` (public availability).

#### 6.4 Per-tenant backup verification

The `BackupRecord` table already exists. Add a weekly job that, for each tenant, restores the latest backup into a staging DB and verifies row counts match. Alert on mismatch.

#### 6.5 Load test

A k6 script that simulates 50 concurrent tenants × 10 users each = 500 concurrent users. Verify:
- P95 response time < 500ms on read endpoints.
- No tenant-isolation regressions under load.
- DB connection pool doesn't exhaust.

#### 6.6 Documentation

- `docs/PLATFORM_OPERATOR_GUIDE.md` — how to approve signups, suspend tenants, read billing.
- `docs/TENANT_ONBOARDING_RUNBOOK.md` — the manual step (calling the requester) documented.
- `docs/MULTI_TENANT_ARCHITECTURE.md` — the design doc explaining tenant scoping, RLS, the Platform org, madrasha codes.

#### 6.7 Dependencies

- **All previous phases** should be in production before Phase 6.

#### 6.8 Effort

**XL (2 weeks).** RLS migration is the heaviest item — touching 52 tables + the `withPermission` refactor + the test suite.

#### 6.9 Risks

- **R6.1 — RLS breaks Prisma.** A misconfigured policy could lock out all users. Mitigation: test on a staging DB first; have a DBA review the policies; keep the platform-admin bypass policy.
- **R6.2 — Performance regression.** RLS adds a check to every query. Mitigation: `organization_id` is already indexed on every table; the check is a constant-time comparison.
- **R6.3 — Backup restore test failures.** Real issues might surface (a tenant's data isn't actually restorable). Mitigation: treat as a finding, not a blocker for Phase 6 launch.

---

## 4. Dependency Graph

```
                      ┌──────────────────────────────────────────┐
                      │           PHASE 0                        │
                      │  Foundation audit & hardening            │
                      │  (RLS prep, login fix, schema gaps)      │
                      └────────────────────┬─────────────────────┘
                                             │
                ┌────────────────────────────┴────────────────────────────┐
                │                                                          │
                ▼                                                          ▼
    ┌───────────────────────┐                                ┌───────────────────────┐
    │     PHASE 1           │                                │     PHASE 2           │
    │  Tenant onboarding    │  ←── can run in parallel ──→    │  Madrasha-code login  │
    │  (signup → provision) │                                │  (3-field login)      │
    └───────────┬───────────┘                                └───────────┬───────────┘
                │                                                          │
                └────────────────────────────┬─────────────────────────────┘
                                             │
                                             ▼
                                ┌───────────────────────┐
                                │     PHASE 3           │
                                │  Platform admin portal │
                                │  (approves signups)   │
                                └───────────┬───────────┘
                                             │
                                             ▼
                                ┌───────────────────────┐
                                │     PHASE 4           │
                                │  Billing display      │
                                │  + trial enforcement  │
                                └───────────┬───────────┘
                                             │
                          ┌──────────────────┴──────────────────┐
                          ▼                                     ▼
                ┌───────────────────────┐            ┌───────────────────────┐
                │     PHASE 5           │            │     PHASE 6           │
                │  Per-tenant customize │            │  Production hardening │
                │  (branding, locale)   │            │  (RLS, monitoring)    │
                └───────────────────────┘            └───────────────────────┘
```

**Edges:**
- Phase 0 → Phase 1, Phase 2 (hard dependency — schema + security fixes)
- Phase 0 → Phase 3 (hard — super-admin model)
- Phase 1 ↔ Phase 2 (independent — can parallelize)
- Phase 1 + Phase 2 → Phase 3 (the portal needs both the signup APIs and the working login)
- Phase 3 → Phase 4 (billing display needs the platform portal)
- Phase 4 → Phase 5, Phase 6 (soft — Phase 5 and 6 can start during Phase 4)

---

## 5. Critical Path (Minimum Viable Multi-Tenant Signup)

The shortest path to a **working end-to-end tenant signup**, even if everything else is deferred:

```
Phase 0 (1.5 wk) → Phase 1 backend (1 wk) → Phase 2 login (4 days) → Phase 3 minimal portal (3 days)
                                                                        ↑
                                            Signup form + provisioning  │
                                            + madrasha-code login + approve button = MVP
```

**MVP scope (≈3 weeks):**
1. **Phase 0:** schema additions + login data-leak fix + super-admin scoping fix.
2. **Phase 1 (backend only):** `POST /api/v1/public/tenant-signup`, the `provisionTenant()` function, `POST /api/v1/platform/signups/:id/approve`. No signup UI yet — test via curl.
3. **Phase 2:** madrasha-code login UI + modified `authorize()`.
4. **Phase 3 (minimal):** one page `/platform/signups` with an Approve button. No tenant list, no billing, no audit.

**What's deferrable from the MVP:**
- The signup form UI (Phase 1) — the platform operator can create the request directly via API.
- The status page (Phase 1).
- The full platform portal (Phase 3) — just the signups page.
- Billing display (Phase 4) — the platform operator manually tracks billing in a spreadsheet for now.
- Per-tenant customization (Phase 5).
- RLS (Phase 6) — the application-layer scoping is the primary defense; RLS is defense-in-depth.

**What's NOT deferrable from the MVP:**
- Phase 0's security fixes (G1, G2). Without these, the existing demo is unsafe in a multi-tenant DB.
- Phase 2's madrasha-code login. Without this, login is ambiguous.
- Phase 1's provisioning engine. Without this, the platform operator can't onboard new tenants without manual SQL.
- Phase 3's approve button. Without this, signups accumulate with no action.

---

## 6. "Do NOT Do in v1" — Explicit Deferral List

| # | Item | Why defer | When to revisit |
|---|---|---|---|
| D1 | **Payment gateway integration** (bKash, SSLCommerz, Stripe) | Business reqs say "for now, just display pricing." Manual collection first. | After 10+ paying tenants or when manual collection becomes a bottleneck. |
| D2 | **Email sending** (welcome email, invoice email, password reset email) | No SMTP configured; business reqs say "we will talk with them." | When signup volume justifies automation. Use Resend or AWS SES. |
| D3 | **SMS notifications** (OTP, fee reminders) | Bangladesh SMS gateways need DLT registration + business verification. | Phase 7+ when SMS becomes a real product requirement. |
| D4 | **Advanced analytics / per-tenant dashboards** | The existing reports module is sufficient for v1. | After customer feedback identifies analytics gaps. |
| D5 | **SSO / OAuth providers** (Google, Microsoft) for tenant users | Tenant users use email+password+madrasha-code. SSO adds complexity. | When enterprise tenants request it. |
| D6 | **Tenant data export / self-service data portability** | GDPR-style data export. Not a Bangladesh regulatory requirement yet. | If/when a tenant asks to leave and wants their data. |
| D7 | **Multi-currency** | All billing is BDT. The schema supports `currency` field but UI is BDT-only. | International expansion. |
| D8 | **Custom domain per tenant** (`madrasha.madrashaos.com`) | All tenants live on `app.madrashaos.com`. Custom domains need DNS automation + TLS cert provisioning. | Enterprise tier. |
| D9 | **Webhook events for tenant lifecycle** (`tenant.created`, `tenant.suspended`) | No integrations to notify yet. | When an integration marketplace is built. |
| D10 | **Per-tenant rate limiting / quotas** | Global rate limiting is sufficient at current scale. | When one tenant's traffic degrades another's. |
| D11 | **Automated trial-to-paid conversion** | Manual in v1 — operator marks as paid. | With the payment gateway (D1). |
| D12 | **In-app onboarding wizard** (post-signup, pre-first-use product tour) | The product is complex enough to need it, but v1 prioritizes the signup flow itself. | After usability testing with the first 3 tenants. |
| D13 | **Audit log streaming to external SIEM** | The `AuditLog` table is sufficient for v1. | Enterprise compliance requirements. |
| D14 | **Per-tenant backup encryption keys (BYOK)** | All backups use the platform's encryption key. | Enterprise compliance requirements. |

---

## 7. Effort Summary

| Phase | Effort | Calendar (1 engineer) | Calendar (2 engineers) |
|---|---|---|---|
| 0 — Foundation | L | 1.5 wk | 1 wk |
| 1 — Onboarding | XL | 2 wk | 1.5 wk (with eng 2 on Phase 2) |
| 2 — Login | M | 0.5 wk | 0.5 wk (parallel with Phase 1) |
| 3 — Platform portal | L | 1.5 wk | 1 wk |
| 4 — Billing display | L | 1 wk | 0.5 wk |
| 5 — Customization | M | 0.5 wk | 0.5 wk |
| 6 — Hardening | XL | 2 wk | 1.5 wk |
| **MVP (Phases 0–3 minimal)** | — | **3 wk** | **2 wk** |
| **Full v1 (Phases 0–4)** | — | **6.5 wk** | **4 wk** |
| **All phases (0–6)** | — | **9 wk** | **5.5 wk** |

---

## 8. Open Questions / Decisions Needed

These should be answered by the product owner BEFORE starting Phase 1:

1. **First admin role:** When a new tenant is provisioned, the signup requester becomes the first user. Should their role be `authority` (principal/head) or `administrator` (office admin)?
   - **Recommendation:** `authority` — they're the requester, presumably the madrasha head. They can then create an `administrator` account for their office staff.
2. **Trial duration:** 14 days is the default proposed. Adjust?
3. **Pricing:** 300 BDT/branch/month is confirmed. Is there a free tier (e.g. 1 branch free)?
4. **Madrasha code length:** 6 chars proposed. Some madrashas may want longer codes (e.g. their established acronym). Allow 4–8 chars?
5. **Signup form fields:** Required = name, code, contact email, phone. Optional = name_bn, address, estimated branches, notes. Confirm.
6. **Platform super-admin count:** Seed 1 or 2? **Recommendation: 2** (one primary, one backup).
7. **What happens to the existing demo Darul Uloom org?** It becomes a regular tenant (with code `DUM001`). Its existing 8 seeded users keep working. Confirm.
8. **Should suspended tenants' data be retained or deleted?** **Recommendation: retain** (soft-delete only). Hard delete is a manual SQL operation, not exposed in v1.
9. **Should the platform super-admin be able to impersonate a tenant user?** Useful for support, risky for audit. **Recommendation: defer to a later phase** — implement only if support requests demand it.
10. **Rate limits:** Per-IP for public endpoints. Confirm thresholds (5 signups/hour/IP, 30 code-lookups/10min/IP).

---

## 9. Glossary

- **Tenant** = an Organization (a single madrasha trust).
- **Sub-tenant** = a Branch (a campus under the org).
- **Platform** = the SaaS operator (MadrashaOS the company).
- **Platform super-admin** = a User in the Platform org with `role = "super-admin"` and `is_platform = true`.
- **Madrasha code** = the short unique code (e.g. `DUM001`) used at login to resolve the tenant.
- **Provisioning** = the automated creation of all baseline data when a new tenant is approved (org + branch + roles + permissions + security policy + module configs + admin user + subscription).
- **RLS** = PostgreSQL Row-Level Security.
- **MVP** = the minimum-viable multi-tenant signup (Phases 0 + 1 backend + 2 + 3 minimal).

---

**End of plan.**
