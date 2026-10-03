# MadrashaOS — Platform Operator Guide

**Audience:** Platform super-admin (SaaS operator)
**Version:** Phase 6

---

## 1. Your Role

As the platform super-admin, you are the **SaaS operator** — the person who runs the MadrashaOS platform. You are NOT a tenant user. You manage:

- **Tenant onboarding** — approve/reject new madrasha signup requests
- **Tenant management** — suspend/reactivate tenants, view their details
- **Billing oversight** — view MRR, trial status, per-tenant billing
- **Platform health** — monitor uptime, errors, DB connectivity

---

## 2. Login

1. Go to `/login`
2. Email: `superadmin@madrashaos.org`
3. Password: (set during seeding — default `password123`)
4. No madrasha code needed (only 1 super-admin user with this email)

You will be redirected to `/platform` (the platform dashboard).

---

## 3. Approving a New Madrasha

### When a new madrasha requests access:

1. A new madrasha goes to `/signup` and fills out the form
2. The request goes into `pending` status
3. You receive no automatic notification (email is a future phase) — **check the queue daily**

### To approve:

1. Go to **Platform Admin → Signup Requests** (`/platform/signup-requests`)
2. Click **Review** on the pending request
3. Verify the details (name, contact email, phone, estimated branches)
4. **Call the contact person** to verify they're legitimate (the "we will talk with them" step)
5. Click **Approve & Provision**
6. Optionally add a review note (e.g., "Approved after phone verification")
7. Confirm

### What happens on approval:

The system automatically provisions the new tenant in a single transaction:
1. Creates the `Organization` (with a unique 6-char code, 14-day trial)
2. Creates a default "Main Branch"
3. Creates 7 system roles (authority, administrator, accountant, etc.)
4. Assigns all permissions to each role
5. Creates a `SecurityPolicy` (password rules, session TTL)
6. Creates the first admin user (from the signup's contact name + email)
7. Creates 10 default accounts (Cash, Bank, Fee Income, Zakat Fund, etc.)
8. Creates a `Subscription` (trial, 14 days)
9. Updates the request status → `provisioned`

### After provisioning:

- A dialog shows the **madrasha code** + **admin email** + **temporary password**
- **Relay these credentials to the contact person securely** (phone/SMS, not email)
- The contact person can now log in with their email + temp password + madrasha code

---

## 4. Suspending a Tenant

When a tenant stops paying or violates policy:

1. Go to **Platform Admin → All Tenants** (`/platform/tenants`)
2. Find the tenant and click the **View** (eye) icon
3. On the tenant detail page, click **Suspend**
4. Enter a reason (e.g., "Non-payment", "Policy violation")
5. Confirm

### What happens on suspension:

- The org's `status` → `suspended`
- The `suspended_at` timestamp + `suspended_reason` are recorded
- The subscription `status` → `suspended`
- All users in that org are **immediately blocked from logging in**
- They see: "Your madrasha account has been suspended. Please contact the platform operator."

### Reactivating:

1. Go to the tenant detail page
2. Click **Reactivate**
3. The org `status` → `active`, `suspended_at` cleared, subscription restored
4. Users can log in again immediately

---

## 5. Billing Overview

### Where to look:

- **Platform Admin → Billing** (`/platform/billing`)

### What you see:

- **Total MRR** (Monthly Recurring Revenue) = sum of (branch_count × 300 BDT) across all active tenants
- **Active / Trialing / Suspended** counts
- **Per-tenant table**: name, code, plan, branches, unit price (300), monthly total, trial end date
- **Totals row** at the bottom

### Pricing rule:

- 300 BDT per branch per month
- No branches = 300 BDT/month (minimum)
- 2 branches = 600 BDT/month
- 14-day free trial (no payment required during trial)
- No payment gateway yet — billing is **display-only** (Phase 4)

---

## 6. Trial Expiry

When a tenant's 14-day trial ends:

1. The **next login attempt** by any user in that org triggers the trial check
2. The system auto-suspends the org (`status → suspended`, `suspended_reason → "Trial expired"`)
3. The user sees: "Your 14-day trial has ended. Please contact the platform operator."

### To extend a trial:

1. Go to the tenant detail page
2. (Currently manual — use the DB or a future API to update `trial_ends_at`)
3. Reactivate the tenant after extending the trial

---

## 7. Monitoring

### Health check:

- `GET /api/v1/health` — returns `{ status: "ok", db: "connected", uptime, version }`
- Returns 503 if the DB is unreachable
- Use this for uptime monitoring (UptimeRobot, Vercel Cron, k8s liveness probe)

### What to watch:

- **Provisioning failures** — check `/platform/signup-requests` for `failed` status
- **Suspended tenants** — check `/platform/tenants?status=suspended`
- **Pending signups** — check `/platform` dashboard for the pending count

---

## 8. Backup & Restore

- Go to **Backup** (`/backup`)
- Click **Run Backup Now** — creates a cross-tenant JSON dump (.json.gz)
- Click the **Download** icon to download
- Click the **Restore** icon to restore (requires typing "RESTORE" to confirm)
- **Restore replaces ALL current data** — use with caution

---

## 9. Quick Reference

| Task | Route | Permission |
|---|---|---|
| Dashboard | `/platform` | `tenant.manage` |
| Signup requests | `/platform/signup-requests` | `tenant.manage` |
| All tenants | `/platform/tenants` | `tenant.manage` |
| Tenant detail | `/platform/tenants/[orgId]` | `tenant.manage` |
| Billing overview | `/platform/billing` | `tenant.manage` |
| Backup | `/backup` | `backup.run` |

### Super-admin credentials (after `bun run db:seed`):

- Email: `superadmin@madrashaos.org`
- Password: `password123`
- Org: Platform (code: `PLATFORM`)

### Demo tenant credentials:

- Email: `admin@madrashaos.org`
- Password: `password123`
- Madrasha code: `DUM001`
- Org: Darul Uloom Madrasha (14-day trial)
