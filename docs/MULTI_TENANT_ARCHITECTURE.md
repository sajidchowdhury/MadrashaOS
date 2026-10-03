# MadrashaOS — Multi-Tenant Architecture

**Version:** Phase 6 (Production Hardened)
**Last updated:** current

---

## 1. Overview

MadrashaOS is a **multi-tenant SaaS platform** where multiple madrashas (Islamic schools) share a single application instance with **complete data isolation**. Each madrasha is a "tenant" with its own students, fees, accounts, and configuration.

### Key characteristics:

- **Shared database, shared schema** — all tenants share the same PostgreSQL tables
- **Tenant scoping via `organization_id`** — every row in every table (except global reference data) carries the tenant's UUID
- **Defense in depth** — application-level scoping (`tenantWhere()`) + database-level RLS policies
- **Per-tenant customization** — branding (logo, colors), locale defaults, feature flags

---

## 2. The Tenant Hierarchy

```
Platform (SaaS Operator)
  └── Organization (Madrasha #1) — code: "DUM001"
  │     ├── Branch: Dhaka Main
  │     ├── Branch: Chittagong
  │     └── Branch: Sylhet
  │
  ├── Organization (Madrasha #2) — code: "K7M2QP"
  │     └── Branch: Main Branch
  │
  └── Organization (Madrasha #3) — code: "ABC123"
        ├── Branch: Campus A
        └── Branch: Campus B
```

- **Organization** = one madrasha trust = one tenant
- **Branch** = a campus under a madrasha (multi-branch isolation)
- **Platform org** = a special org (`code: "PLATFORM"`) where the super-admin lives

---

## 3. Tenant Isolation

### Layer 1: Application-level (tenantWhere)

Every API route uses `getTenantContext()` to extract the org_id + branch_id from the JWT, then `tenantWhere(ctx)` builds a Prisma `where` clause:

```ts
// Normal tenant user:
where: { organization_id: ctx.organization_id, branch_id: ctx.branch_id }

// Authority (org-level, all branches):
where: { organization_id: ctx.organization_id }

// Super-admin (platform operator):
where: {}  // truly unconstrained — must filter explicitly by URL orgId
```

This is enforced by the `withPermission(code, handler)` middleware wrapper used on 121 of 130 API routes.

### Layer 2: Database-level (Row-Level Security)

PostgreSQL RLS policies on every tenant-scoped table:

```sql
CREATE POLICY tenant_isolation ON students
  USING (organization_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.tenant_id', true)::uuid);
```

The app sets `SET LOCAL app.tenant_id = '<org_id>'` inside a transaction before queries. See `src/lib/tenant/rls-context.ts` for the `withTenantContext()` helper.

**Platform admin bypass:** The `platform_admin_role` role bypasses RLS (`USING (true)`) for cross-tenant operations.

### Layer 3: JWT scoping

The NextAuth JWT carries:
- `organization_id` — the tenant UUID
- `branch_id` — the branch UUID (null for org-level)
- `role` — the role code (e.g., "administrator", "super-admin")
- `permissions[]` — the permission codes granted to this role

---

## 4. Authentication

### Login flow (Phase 2):

1. User enters email → the login page calls `GET /api/v1/auth/check-email`
2. If the email exists in **1 org** → 2-field login (email + password)
3. If the email exists in **2+ orgs** → 3-field login (email + password + madrasha code)
4. The madrasha code (`Organization.code`, 6-char unique) resolves the tenant
5. `authorize()` verifies password, checks org status (suspended/trial expired), issues JWT

### Trial enforcement (Phase 4):

After password verification, `authorize()` checks:
- If `org.status === "suspended"` → blocks login with `ACCOUNT_SUSPENDED`
- If `org.trial_ends_at < now()` → auto-suspends the org, blocks login with `TRIAL_EXPIRED`
- Super-admin bypasses these checks

### Madrasha codes:

- 6-char uppercase alphanumeric (no O/0/I/1/L to avoid confusion)
- Auto-generated during provisioning (`src/lib/tenant/code-generator.ts`)
- Globally unique (collision-checked against existing orgs + pending requests)
- Examples: `DUM001`, `K7M2QP`, `ABC123`

---

## 5. The Platform Org

A special `Organization` row with `code = "PLATFORM"` where the platform super-admin lives. This avoids making `User.organization_id` nullable (which would touch 100+ queries).

- Created by `prisma/seed.ts`
- The super-admin role has `is_platform = true`
- The super-admin user has `branch_id = null` (org-level, no branch)
- Super-admin permissions include `tenant.manage`, `tenant.provision`, `backup.run`

---

## 6. Tenant Provisioning (Phase 1)

When a platform admin approves a signup request, `provisionTenant()` runs an atomic transaction:

1. Create `Organization` (code, trial_ends_at = +14 days)
2. Create default `Branch` ("Main Branch")
3. Create 7 system `Role`s (authority, administrator, accountant, etc.)
4. Create `RolePermission`s (assign all 110+ permissions to each role)
5. Create `SecurityPolicy` (password rules, session TTL)
6. Create the first admin `User` (with a generated temp password)
7. Create 10 default `Account`s (Cash, Bank, Fee Income, Zakat Fund, etc.)
8. Create `Subscription` (trial, 14 days)
9. Update the `TenantSignupRequest` status → `provisioned`

If any step fails, the entire transaction rolls back — no partial tenant is left behind.

---

## 7. Billing (Phase 4)

### Pricing:

- 300 BDT per branch per month
- No branches = 300 BDT/month (minimum)
- 2 branches = 600 BDT/month
- 14-day free trial (no payment required)

### Data model:

- `Subscription` (1:1 with Organization) — plan, status, unit price, trial end
- `Invoice` — monthly billing records (draft → issued → paid)
- `UsageSnapshot` — nightly metering (branch/student/user counts per org)

### Enforcement:

- Trial expiry auto-suspends the org on next login attempt
- Platform admin can manually suspend/reactivate from the tenant detail page
- No payment gateway yet — billing is display-only

---

## 8. Per-Tenant Customization (Phase 5)

### Organization.settings JSON:

```json
{
  "locale": "en",
  "currency": "BDT",
  "academicYearStart": "January",
  "branding": {
    "primaryColor": "#0F766E",
    "logoUrl": null,
    "faviconUrl": null,
    "displayName": null
  },
  "featureFlags": {}
}
```

### Branding application:

- `BrandingProvider` (at the app layout) fetches `/api/v1/organizations/settings`
- Sets CSS variables (`--brand-primary`, `--brand-primary-h/s/l`) on the document root
- Sets document title + favicon
- Re-fetches on window focus (so changes in another tab are picked up)

### ModuleConfig:

- Per-branch module on/off toggles (existing from Phase 0)
- `@@unique([organization_id, branch_id, module_key])`
- Read by the sidebar to hide disabled modules

---

## 9. Security Layers

| Layer | What it protects | Where |
|---|---|---|
| JWT scoping | Unauthorized API access | `withPermission()` middleware |
| `tenantWhere()` | Cross-tenant data access in queries | `src/lib/auth/with-tenant.ts` |
| PostgreSQL RLS | DB-level row filtering (defense in depth) | `prisma/migrations/rls_tenant_isolation.sql` |
| MFA (TOTP) | Account takeover | `src/lib/auth/mfa.ts` |
| Account lockout | Brute-force password attacks | 5 failed attempts → 15-min lock |
| Honeypot fields | Bot signup/donation spam | `website` field on public forms |
| Rate limiting | API abuse | In-memory per-IP throttle |

---

## 10. Monitoring

### Health check:

- `GET /api/v1/health` — public endpoint returning `{ status, db, uptime, version }`
- Returns 200 if healthy, 503 if DB is unreachable

### Structured logging:

- `src/lib/logger.ts` — JSON output in production, colored in dev
- Every log line includes `organization_id`, `branch_id`, `user_id`, `request_id`
- Use: `const log = createTenantLogger(ctx); log.info("Student created", { student_id });`

---

## 11. File Structure

```
src/lib/tenant/
  ├── code-generator.ts     # 6-char madrasha code generation
  ├── provision.ts           # Atomic tenant provisioning (9-step transaction)
  ├── org-settings.ts        # OrgSettings type + defaults + validation
  ├── rls-context.ts         # withTenantContext() / withPlatformContext() for RLS

src/lib/auth/
  ├── config.ts              # NextAuth config + authorize() (login, trial check)
  ├── with-tenant.ts         # getTenantContext() + tenantWhere() + isPlatformAdmin()
  ├── with-permission.ts     # withPermission(code, handler) middleware
  ├── role-permissions.ts    # Role → permission map (client-side)
  ├── permissions.ts         # 110+ permission codes catalog

src/app/
  ├── (app)/platform/        # Platform super-admin portal
  │   ├── page.tsx           # Dashboard (KPIs)
  │   ├── signup-requests/   # Approve/reject signups
  │   ├── tenants/            # All tenants list + detail + suspend/reactivate
  │   └── billing/            # Platform billing overview
  ├── (app)/billing/          # Tenant-facing billing page
  ├── (app)/settings/branding/ # Branding customization
  ├── signup/                 # Public signup form
  ├── login/                  # 3-field login (email + password + madrasha code)

prisma/migrations/
  └── rls_tenant_isolation.sql  # RLS policies on all tenant tables
```

---

## 12. Phases Summary

| Phase | What | Status |
|---|---|---|
| 0 | Foundation (schema, login fix, Platform org) | ✅ Done |
| 1 | Tenant onboarding (signup → approve → provision) | ✅ Done |
| 2 | Madrasha-code login UI (3-field login) | ✅ Done |
| 3 | Platform super-admin portal | ✅ Done |
| 4 | Billing display (300 BDT/branch/mo, trial) | ✅ Done |
| 5 | Per-tenant customization (branding, locale) | ✅ Done |
| 6 | Production hardening (RLS, logging, health, docs) | ✅ Done |
