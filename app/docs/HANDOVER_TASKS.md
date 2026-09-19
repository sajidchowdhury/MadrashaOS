# MadrashaOS — Handover Task List

> **Purpose:** A complete, prioritized, session-by-session task list to take MadrashaOS from its current state (~85% backend / ~45% frontend) to a pure, production-ready product that can be handed to a client with zero known issues.
>
> **How to use this document:** Work through the phases in order. Each session is sized for one developer-day (6–8 focused hours). Do not skip sessions — later sessions depend on earlier ones. Check the `[ ]` box when a session is fully done and browser-verified.
>
> **Stack:** Next.js 16 (App Router) · TypeScript 5 · Tailwind CSS 4 · shadcn/ui · Prisma 6 · PostgreSQL 16 · NextAuth.js v4 · TanStack Query · Zustand
>
> **Repo:** `github.com/sajidchowdhury/MadrashaOS` (branch: `main`)
>
> **Current state (as of last commit):** App boots, authenticates 8 roles, renders 54 routes in bn/en/ar with RTL, passes 8/8 e2e API flows. But 4 core user journeys (take attendance, collect fee, enter marks, promote student) have **fake submit buttons** that show a success toast without calling the API.

---

## How We Got Here

| Phase | What was done | Commit |
|-------|----------------|--------|
| Phase 1 | Boot the app (Postgres, Prisma generate, migrate, seed, dev server) | — |
| Phase 2 | Fix frontend-backend contract mismatch + D3 permission enforcement | `59792aa` |
| Phase 3 | Wire 3 public forms + add 10 missing routes + fix `actor_id` bug in 28 routes | `c2125ad` |
| Phase 4 | DB-backed idempotency + notification service + payment gateway + load test + prod build | `1b41554` |
| (fix) | SideNav menu items now navigate to their routes | `1934848` |

---

## Phase 5 — Core Frontend Wiring (Week 1)

**Goal:** Make the 4 flagship user journeys actually work end-to-end through the UI. After this phase, a teacher can take attendance, an accountant can collect a fee, a teacher can enter marks, and an admin can promote a student — all through the real API.

---

### Session 5.1 — Wire "Take Attendance" page to the API

**File:** `src/app/(app)/attendance/take/page.tsx`

**Current state (broken):**
- `CLASS_ID = "cls-5"` and `SECTION = "A"` are hardcoded (lines 65–66) — the teacher cannot pick a different class or section
- `handleSubmit()` (line 164) only calls `setSubmittedAt(Date.now())` + shows a toast — **does NOT call `POST /api/v1/attendance/sessions`**
- The entire Risk R6 mobile-first flow is theatre

**Tasks:**
- [ ] Remove the hardcoded `CLASS_ID` and `SECTION` constants
- [ ] Add a class selector (use `useClasses()` hook from `src/lib/query/client.ts`) and a section selector (derive from the selected class's `sections` array)
- [ ] Fetch the student roster for the selected class+section via `useStudentsByClass(classId, section)` (or add this hook if missing)
- [ ] Replace `handleSubmit()` with a real `fetch("/api/v1/attendance/sessions", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ class_id, section_id, date, records: [...] }) })`
- [ ] Handle the response: on `201` show success toast + refetch the attendance sessions list; on `400`/`500` show error toast with the server's error message
- [ ] Add a loading state on the submit button ("Submitting…") while the request is in flight
- [ ] After successful submit, show a brief confirmation summary ("Marked 38 present, 2 absent")
- [ ] Test as the `bilal@madrashaos.org` (teacher) user — verify the session appears in `/attendance` list after submit
- [ ] Test the idempotency: submit the same attendance twice with the same `Idempotency-Key` — the second request should return `200` with `X-Idempotent-Replay: true` header, not create a duplicate

**Acceptance criteria:**
- A teacher can select any class + section, mark students present/absent/late, and submit — the data persists in the DB and appears in the attendance list
- The `total_present` and `total_absent` counts on the session match what was submitted
- An audit log entry is created (`entity_type: "attendance_sessions"`)
- Guardian SMS notifications fire (visible in dev.log as `[NOTIFICATION:sms]`)

---

### Session 5.2 — Wire "Collect Payment" dialog to the fees API

**File:** `src/components/finance/CollectPaymentDialog.tsx`

**Current state (broken):**
- `handleConfirm()` (lines 156–162) generates a fake `RCP-2026-${random 2000-9999}` client-side and shows a toast
- The real `POST /api/v1/fees/payments` endpoint (which implements the Golden Flow: validates installment → generates receipt → posts balanced LedgerEntry → updates installment → updates account balances, all in a `db.$transaction`) is **never called**

**Tasks:**
- [ ] Read `src/app/api/v1/fees/payments/route.ts` to understand the exact request body shape (`student_id`, `installment_id`, `amount`, `method`, `transaction_ref?`, `notes?`, `received_by_account_id?`)
- [ ] Replace `handleConfirm()` with a real `fetch("/api/v1/fees/payments", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ student_id, installment_id, amount, method, ... }) })`
- [ ] On `201`: show success toast with the real `receipt_no` from the response, refetch `useFeePayments()` and `useFeePlans()` (so the installment shows as paid), close the dialog
- [ ] On `400`: show error toast with the validation error (e.g., "Amount exceeds remaining balance")
- [ ] On `500`: show error toast "Server error — please retry"
- [ ] Add a loading state on the Confirm button ("Processing…")
- [ ] After successful payment, offer a "Download Receipt" link that navigates to the PDF receipt endpoint (`/api/v1/fees/payments/:id` — or generate via the existing PDF template)
- [ ] Test as the `accounts@madrashaos.org` (accountant) user — verify:
  - The installment's `is_paid` flips to `true` and `status` becomes `"paid"`
  - A LedgerEntry is created (check `/accounting` page)
  - The account balance updates (check `/accounting`)
  - An audit log entry is created
  - A notification fires (visible in dev.log)

**Acceptance criteria:**
- An accountant can collect a fee payment for any student's installment, the payment persists, the ledger balances, the installment is marked paid, and the receipt number is real (not `RCP-2026-${random}`)
- Re-fetching the fee plans shows the updated `amount_paid` and `is_paid` state

---

### Session 5.3 — Wire "Exam Marks Entry" page to the exams API

**File:** `src/app/(app)/exams/[id]/marks/page.tsx`

**Current state (broken):**
- Uses an inline `EXAM_CATALOGUE` mock array (lines 44–89) with hardcoded exam name, subject, full marks, and 5 fake students
- The "Save Marks" submit handler only shows a toast — **does NOT call `PUT /api/v1/exams/:id/marks`**
- No `useExams` hook exists in `src/lib/query/client.ts`

**Tasks:**
- [ ] Add `api.getExamById(id)` and `api.getExamMarks(id)` methods to `src/lib/api/client.ts` (follow the existing `api.getStudentById` pattern)
- [ ] Add `useExam(id)` and `useExamMarks(id)` hooks to `src/lib/query/client.ts`
- [ ] Remove the `EXAM_CATALOGUE` mock array
- [ ] Fetch the real exam + existing marks via the new hooks
- [ ] Fetch the student roster for the exam's class via `useStudentsByClass(exam.class_id, exam.section_id)`
- [ ] Pre-fill the marks input with existing marks (if any) from `useExamMarks`
- [ ] Replace the Save handler with `fetch(`/api/v1/exams/${id}/marks`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ marks: [{ student_id, marks, grade }] }) })`
- [ ] Validate each mark against `exam.full_marks` client-side (disable Save if any mark > full_marks)
- [ ] On `200`: show success toast "Marks saved for N students", refetch the marks query
- [ ] On `400`/`403`/`409`: show error toast (409 = exam already published, cannot edit)
- [ ] Test as the `bilal@madrashaos.org` (teacher) user

**Acceptance criteria:**
- A teacher can open an exam, see the real student roster, enter marks for each student, save, and the marks persist in the DB
- Re-opening the page shows the saved marks
- Attempting to enter a mark above `full_marks` is blocked client-side
- Attempting to save marks for a published exam shows "Exam is already published — marks cannot be edited"

---

### Session 5.4 — Wire "Student Profile" actions (promote, collect payment, upload document)

**File:** `src/app/(app)/students/[id]/page.tsx`

**Current state (broken):**
- Three handlers are toast-only:
  - `handleConfirmPromotion` (line ~205) — does NOT call `POST /api/v1/students/:id/promote`
  - `handleCollectPayment` (line ~215) — does NOT call `POST /api/v1/fees/payments` (though this is partially covered by Session 5.2's dialog)
  - `handleUploadDoc` (line ~225) — does NOT call `POST /api/v1/documents`
- `MOCK_SUBJECTS`, `MOCK_DOCUMENTS`, and `buildHistory()` are inline mock data

**Tasks:**
- [ ] **Promotion:** Replace `handleConfirmPromotion` with `fetch(`/api/v1/students/${id}/promote`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to_class_id, to_section_id, academic_year }) })`. On success: show toast "Student promoted to Class X", refetch `useStudentById(id)`, show the new StudentHistory entry.
- [ ] **Promotion UI:** Add a class + section selector to the promotion dialog (use `useClasses`). Currently the dialog probably has no selector.
- [ ] **Documents:** Replace `handleUploadDoc` with a real `fetch("/api/v1/documents", { method: "POST", body: formData })` (multipart/form-data — do NOT set Content-Type header; the browser sets it with the boundary). The formData should include `entity_type: "student"`, `entity_id: studentId`, `file: <File>`.
- [ ] **Documents list:** Replace `MOCK_DOCUMENTS` with `useDocuments({ entity_type: "student", entity_id: id })` — add this hook if missing. Add `api.getDocuments(params)` to `client.ts`.
- [ ] **History:** Replace `buildHistory()` with `useStudentHistory(id)` — add `api.getStudentHistory(id)` + the hook. The real endpoint is `GET /api/v1/students/:id/history`.
- [ ] **Subjects:** Replace `MOCK_SUBJECTS` with real data from `GET /api/v1/subjects?class_id=student.classId` — add `useSubjects(classId)` hook if missing.
- [ ] Test as the `admin@madrashaos.org` (administrator) user:
  - Promote a student from Class 5 to Class 6 — verify the student's `class_id` updates and a StudentHistory entry is created
  - Upload a document — verify it appears in the documents list with a download link
  - View the history tab — verify real promotion history appears

**Acceptance criteria:**
- An admin can promote a student (class + section + academic year selector), the promotion persists, the history tab shows the new entry
- An admin can upload a document for a student, it appears in the documents tab with a real download link
- The history tab shows real `StudentHistory` records (not mock)

---

### Session 5.5 — Fix guardian scope check in results API

**File:** `src/app/api/v1/results/[studentId]/route.ts`

**Current state (broken — security):**
- Lines 50–53 comment: "For simplicity in this mock, we trust the permission middleware to have checked. A full implementation would verify the guardian_id link here."
- The middleware only checks the `results.view.own` permission code — it does NOT verify that the `studentId` in the URL belongs to the requesting guardian's children
- **A guardian can pass ANY student UUID and view their results** — data leak

**Tasks:**
- [ ] Read `src/app/api/v1/guardians/[id]/children/route.ts` lines 84–91 — it correctly enforces `guardian.user_id === ctx.user_id`. Mirror this pattern.
- [ ] In `results/[studentId]/route.ts`, after `getTenantContext()`:
  - If the user's role is `guardian` or `student` and their only permission is `results.view.own` (not `results.view`):
    - Look up the student's primary guardian via `db.studentGuardian.findFirst({ where: { student_id: studentId, is_primary: true, deleted_at: null }, select: { guardian: { select: { user_id: true } } } })`
    - If `guardian.guardian.user_id !== ctx.user_id` → return `403 Forbidden`
  - For `student` role: check `student_id === ctx.user_id` mapped through the `Student.user_id` field (if it exists — check the schema)
- [ ] Add a test: log in as `omar.parent@example.com` (guardian), try to access `/api/v1/results/<other-student-id>` — should get `403`
- [ ] Add a test: log in as the same guardian, access `/api/v1/results/<own-child-id>` — should get `200` with results

**Acceptance criteria:**
- A guardian can only see results for students linked to their `StudentGuardian` row
- A guardian gets `403` when trying to access any other student's results
- An admin/authority/teacher with `results.view` (not `.own`) can still see all results

---

## Phase 6 — Backend Bug Fixes (Week 2)

**Goal:** Fix the 6 backend bugs found in the audit. None are architecture problems — all are localized fixes.

---

### Session 6.1 — Fix `purchases/[id]/receive` to post a balanced ledger entry

**File:** `src/app/api/v1/purchases/[id]/receive/route.ts`

**Current state (broken):**
- The docblock claims it "posts ledger entry (debit inventory/expense, credit cash/accounts payable)" but the actual `db.$transaction` body only updates `PurchaseItem`, `InventoryItem`, and `Purchase` — **no LedgerEntry is created and no account balances are updated**
- Inventory value goes up but there's no offsetting credit — the books don't balance

**Tasks:**
- [ ] Read `src/app/api/v1/fees/payments/route.ts` lines 220–290 — this is the gold-standard pattern for a balanced ledger post inside a transaction
- [ ] Inside the `purchases/[id]/receive` transaction, after updating the `PurchaseItem` and `InventoryItem`:
  - Determine the credit account: if `payment_method === "cash"` → credit the Cash account; if `"bank"` → credit the Bank account; if `"credit"` (unpaid) → credit Accounts Payable
  - Look up the Inventory asset account (or the Purchase Expense account — depends on whether the item is for resale or consumption)
  - Create a `db.ledgerEntry.create({ data: { organization_id, branch_id, voucher_no: `PO-RCV-${purchase.po_number}`, debit_account_id: inventory_account_id, credit_account_id: credit_account_id, amount: item_total, fund: "general", status: "posted", posted_by: ctx.user_id, source_type: "purchase_receive", source_id: purchase.id, narration: `PO ${po_number} received` } })`
  - Update both account balances: `db.account.update({ where: { id: debit_account_id }, data: { balance: { increment: item_total } } })` and the reverse for the credit account (decrement for asset/expense... actually, depends on account type — read the `fees/payments` pattern carefully)
- [ ] Write an audit log entry for the receive action
- [ ] Test: create a purchase, receive it, verify the ledger entry appears in `/accounting` and the account balances updated

**Acceptance criteria:**
- Receiving a purchase creates a balanced LedgerEntry (debit + credit equal the PO total)
- The Inventory account balance increases
- The Cash/Bank/AP account balance decreases (or increases for AP)
- An audit log entry is created

---

### Session 6.2 — Fix `branches/switch` JWT refresh

**File:** `src/app/api/v1/branches/switch/route.ts`

**Current state (broken):**
- Updates `User.branch_id` in the DB (lines 63–66) but the session JWT still has the old `branch_id` cached
- All subsequent `tenantWhere(ctx)` calls still scope to the old branch until the user re-logs in
- The switch silently fails from the user's perspective

**Tasks:**
- [ ] Read `src/lib/auth/config.ts` — understand how the JWT `session.callback` injects `branch_id` (line ~174)
- [ ] Option A (simpler): In the `branches/switch` response, return `{ success: true, branch_id: newBranchId }`. On the client side (in the TopBar or wherever the branch switcher lives), after a successful switch response, call `signIn("credentials", { email, password, redirect: false })` to re-authenticate and get a fresh JWT. This is the NextAuth v4-friendly approach.
- [ ] Option B (harder): Use `next-auth/jwt`'s `encode()` to mint a new JWT server-side and set the cookie manually. Requires the `NEXTAUTH_SECRET` and manual cookie writing — more code, more fragile.
- [ ] Implement Option A: find the client-side branch switcher component (likely in `src/components/shell/TopBar.tsx`) and add the re-authentication call after the switch response
- [ ] Test: log in as `admin@madrashaos.org` (default branch: Dhaka), switch to Chittagong, verify that the students list now shows only Chittagong students (not Dhaka)

**Acceptance criteria:**
- After switching branch, all subsequent API calls scope to the new branch without requiring a manual re-login
- The session JWT is refreshed (the `branch_id` in `/api/v1/auth/session` reflects the new branch)

---

### Session 6.3 — Fix `notices/route.ts` session lookup bug + minor backend fixes

**Files:** `src/app/api/v1/notices/route.ts`, `src/app/api/v1/donations/route.ts`

**Current state (broken):**
- `notices/route.ts:211` uses `session?.permissions?.includes("notices.send")` — but `session.permissions` doesn't exist; it's `session.user.permissions`. This check is always `false`, so the "send" permission is never granted via this path.
- `donations/route.ts:360` — the audit log write is gated behind `if (userId)` — public donations (where `userId` is null) write no audit trail
- Imports are at the bottom of `notices/route.ts` (lines 275–277) — bad style, may break strict linters

**Tasks:**
- [ ] Fix `notices/route.ts:211`: change `session?.permissions` → `session?.user?.permissions`
- [ ] Move the imports at the bottom of `notices/route.ts` (lines 275–277) to the top of the file with the other imports
- [ ] Fix `donations/route.ts:360`: remove the `if (userId)` gate around the audit log write — always write the audit log, using `actor_user_id: userId` (which is nullable, so public donations log `actor_user_id: null`)
- [ ] Test: create a notice as admin, verify the "send" permission check works (the send button appears)
- [ ] Test: submit a public donation, verify an audit log entry is created with `actor_user_id: null`

**Acceptance criteria:**
- The notices "send" permission check works correctly (admin/authority can see the send button)
- Public donations create an audit log entry (even though `actor_user_id` is null)
- No imports at the bottom of any route file

---

### Session 6.4 — Replace attendance in-memory idempotency with DB-backed middleware

**File:** `src/app/api/v1/attendance/sessions/route.ts`

**Current state (broken):**
- Lines 46–49 use an in-memory `Map<string, CachedResponse>` for idempotency — lost on server restart, doesn't work across multiple instances
- The DB-backed `withIdempotency` middleware was built in Phase 4 but is **not used by any route**
- `fees/payments/route.ts` uses a DB column (`idempotency_key` on FeePayment) — a different pattern that works but is table-specific

**Tasks:**
- [ ] Read `src/lib/auth/with-idempotency.ts` — it's already DB-backed (uses `db.idempotencyRecord` table)
- [ ] Wrap the `attendance/sessions` POST handler with `withIdempotency()`:
  ```ts
  export const POST = withPermission("attendance.take", withIdempotency(async (req, ctx) => {
    // existing handler body
  }));
  ```
  (Check the exact composition order — `withPermission` outer, `withIdempotency` inner, or vice versa. Read `with-permission.ts` to see the `RouteContext` shape.)
- [ ] Remove the in-memory `idempotencyCache` Map and its TTL logic (lines 46–49 + the lookup block)
- [ ] The client must send the `Idempotency-Key` header — verify Session 5.1's `handleSubmit` includes it
- [ ] Test: submit attendance twice with the same `Idempotency-Key` — second response should have `X-Idempotent-Replay: true` header and `200` status (not `201`)
- [ ] Test: restart the dev server, submit with the same key again — should still replay (proves it's DB-backed, not in-memory)

**Acceptance criteria:**
- Attendance idempotency survives server restarts
- The in-memory Map is removed
- Replays return the original response with `X-Idempotent-Replay: true`

---

### Session 6.5 — Add missing permission gates (employees, zakat, others)

**Files:** Multiple API routes

**Current state (broken):**
- `GET /api/v1/employees` — not gated to `employees.view` (any authenticated user can list all employees)
- `GET /api/v1/zakat` — not gated to `zakat.view` (any authenticated user can see the zakat fund balance)
- `GET /api/v1/scholarships` — not gated (any authenticated user can list scholarships)
- `GET /api/v1/suppliers` — not gated
- `GET /api/v1/inventory` — not gated
- `GET /api/v1/purchases` — not gated
- `GET /api/v1/hostel/rooms` — not gated
- `GET /api/v1/library/books` — not gated
- `GET /api/v1/transport/vehicles` — not gated
- `GET /api/v1/food/meal-plans` — not gated
- `GET /api/v1/assets` — not gated
- `GET /api/v1/notices` — not gated
- `GET /api/v1/accounts` — already gated in Phase 2 ✅
- `GET /api/v1/ledger` — already gated in Phase 2 ✅
- `GET /api/v1/fees/plans` — already gated in Phase 2 ✅
- `GET /api/v1/fees/payments` — already gated in Phase 2 ✅

**Tasks:**
- [ ] For each of the ~12 routes above, wrap the `GET` handler with the appropriate `withPermission()`:
  - `employees/route.ts` GET → `withPermission("employees.view", ...)`
  - `zakat/route.ts` GET → `withPermission("zakat.view", ...)`
  - `scholarships/route.ts` GET → `withPermission("scholarship.view", ...)`
  - `suppliers/route.ts` GET → `withPermission("suppliers.view", ...)`
  - `inventory/route.ts` GET → `withPermission("inventory.view", ...)`
  - `purchases/route.ts` GET → `withPermission("purchase.view", ...)`
  - `hostel/rooms/route.ts` GET → `withPermission("hostel.view", ...)`
  - `library/books/route.ts` GET → `withPermission("library.view", ...)`
  - `transport/vehicles/route.ts` GET → `withPermission("transport.view", ...)`
  - `food/meal-plans/route.ts` GET → `withPermission("food.meal-plan", ...)` — check if this is the right permission code
  - `assets/route.ts` GET → `withPermission("assets.view", ...)`
  - `notices/route.ts` GET → `withPermission("notices.view", ...)`
- [ ] Test: log in as `omar.parent@example.com` (guardian) — verify these endpoints return `403` (guardians don't have these permissions)
- [ ] Test: log in as `admin@madrashaos.org` — verify these endpoints still return `200` with data

**Acceptance criteria:**
- All 12 routes now enforce their `.view` permission on GET
- A guardian gets `403` on all of them
- An admin gets `200` with data

---

## Phase 7 — CMS & Payment Gateway Decisions (Week 2–3)

**Goal:** Resolve the two "fundamentally broken" features: the CMS (localStorage-only) and the payment gateway (unused stubs).

---

### Session 7.1 — Decide on the CMS (remove or build)

**File:** `src/app/(app)/website/content/page.tsx` + `src/stores/cmsStore.ts`

**Current state (broken):**
- The CMS page persists content to **browser localStorage** via Zustand's `persist` middleware
- Admin's edits are visible only on the admin's own browser — public visitors on other browsers see the defaults
- This is fundamentally broken for a multi-user system

**Tasks (choose one):**

**Option A — Remove the CMS for v1 (1 hour, recommended):**
- [ ] Add a redirect from `/website/content` to a "Coming in v2" page
- [ ] Or remove the `/website/content` nav item from `moduleTree.ts`
- [ ] Document in the handover: "Public website content is code-defined for v1. A DB-backed CMS is planned for v2."

**Option B — Build a DB-backed CMS (2–3 days):**
- [ ] Create a `CmsContent` Prisma model: `id, organization_id, key (unique), value (Json), updated_by, updated_at`
- [ ] Run `prisma db push` to create the table
- [ ] Create `GET /api/v1/cms/:key` (public, no auth) + `PUT /api/v1/cms/:key` (gated to `organization.config.edit`)
- [ ] Rewrite `cmsStore.ts` to fetch from the API instead of localStorage (keep the same Zustand interface so components don't change)
- [ ] Migrate the default content from `src/stores/cms-defaults.ts` into a seed script
- [ ] Test: edit content as admin on Browser A, verify it appears on the public site in Browser B

**Acceptance criteria:**
- Either the CMS page is removed (Option A) or it persists to the DB and is visible across browsers (Option B)
- No localStorage-only persistence remains

---

### Session 7.2 — Decide on the payment gateway (remove or wire)

**Files:** `src/lib/payments/`, `.env`

**Current state (broken):**
- The `PaymentGateway` interface + 3 providers (manual, bKash, SSL Commerz) were built in Phase 4
- **No API route calls `getPaymentGateway()`** — the entire integration is unused
- bKash webhook verification is a stub (no HMAC comparison)
- No `/api/v1/payments/bkash/callback` route exists despite being configured as `BKASH_CALLBACK_URL`

**Tasks (choose one):**

**Option A — Document "manual payments only for v1" (1 hour, recommended):**
- [ ] Remove `BKASH_*` and `SSLCOMMERZ_*` vars from `.env` (keep `PAYMENT_DEFAULT_PROVIDER="manual"`)
- [ ] Add a comment in `.env.example`: "bKash and SSL Commerz gateway integration is scaffolded but not production-ready. Enable in v2 after HMAC verification is implemented."
- [ ] Document in the handover: "Fees and donations are recorded as received (cash/bank/mobile). Online payment gateway integration is planned for v2."

**Option B — Wire the payment gateway (2 days):**
- [ ] Implement HMAC-SHA256 webhook verification in `src/lib/payments/providers/bkash.ts` (`verifyWebhook()` — use `crypto.timingSafeEqual`)
- [ ] Implement HMAC verification in `src/lib/payments/providers/sslcommerz.ts`
- [ ] Create `POST /api/v1/payments/bkash/callback` (browser redirect target) + `POST /api/v1/payments/bkash/webhook` (server-to-server IPN)
- [ ] Create `POST /api/v1/payments/sslcommerz/callback` + `POST /api/v1/payments/sslcommerz/webhook`
- [ ] Split `POST /api/v1/fees/payments` into `POST /api/v1/fees/payments/initiate` (calls gateway, returns redirect URL) + keep the existing route as the verify/webhook handler body
- [ ] Split `POST /api/v1/donations` the same way
- [ ] Test the full flow with bKash sandbox credentials

**Acceptance criteria:**
- Either the gateway is removed from `.env` and documented as v2 (Option A) or it's fully wired with HMAC verification and callback routes (Option B)
- No stub HMAC verification remains in production

---

## Phase 8 — Security & Production Hardening (Week 3)

**Goal:** Fix security risks, rotate secrets, create production artifacts.

---

### Session 8.1 — Rotate secrets + create `.env.example`

**Files:** `.env`, `.env.example`, `.gitignore`

**Tasks:**
- [ ] **Rotate `NEXTAUTH_SECRET`** — the current value (`madrashaos-dev-secret-not-for-production-32charslong`) is committed to the repo. Generate a new one: `openssl rand -base64 32` and update `.env` locally. Do NOT commit the new secret.
- [ ] **Add `.env` to `.gitignore`** (if not already there — verify)
- [ ] **Create `.env.example`** with all required vars, documented, with placeholder values:
  ```bash
  # Core
  DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/madrashaos?schema=public"
  NEXTAUTH_URL="http://localhost:3000"
  NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
  NEXTAUTH_DEBUG="false"

  # Notifications (default: console — logs to terminal)
  NOTIFICATION_PROVIDER="console"  # console | smtp | resend
  EMAIL_FROM="MadrashaOS <no-reply@yourdomain.org>"
  # SMTP (if NOTIFICATION_PROVIDER=smtp)
  SMTP_HOST=""
  SMTP_PORT="587"
  SMTP_SECURE="false"
  SMTP_USER=""
  SMTP_PASSWORD=""
  # Resend (if NOTIFICATION_PROVIDER=resend)
  RESEND_API_KEY=""

  # Payment Gateway (default: manual — cash/bank only)
  PAYMENT_DEFAULT_PROVIDER="manual"  # manual | bkash | sslcommerz
  ```
- [ ] **Fix `.env` ↔ `docker-compose.yml` mismatch**: the `.env` uses `madrasha:madrasha` but `docker-compose.yml` uses `madrashaos:secret`. Align them (recommend changing `docker-compose.yml` to match the `.env` since the seed script expects `madrasha`).

**Acceptance criteria:**
- `.env` is gitignored and not committed
- `.env.example` exists with all vars documented
- `NEXTAUTH_SECRET` is rotated
- `.env` credentials match `docker-compose.yml`

---

### Session 8.2 — Add audit logs for public donations + fix `organizations` PATCH permission

**Files:** `src/app/api/v1/donations/route.ts`, `src/app/api/v1/organizations/route.ts`

**Tasks:**
- [ ] In `donations/route.ts`, remove the `if (userId)` gate around the audit log write (line ~360) — always write the audit log. For public donations, `actor_user_id: null` is fine.
- [ ] In `organizations/route.ts`, the PATCH handler is gated to `organization.config.view` — change it to `organization.config.edit` (view permission should not grant write).
- [ ] Test: submit a public donation, verify an audit log entry is created (check `/audit` page or `GET /api/v1/audit?entity_type=donations`)
- [ ] Test: log in as a role that has `organization.config.view` but NOT `organization.config.edit` (check `role-permissions.ts`) — verify PATCH returns `403`

**Acceptance criteria:**
- Public donations create audit log entries
- Organization config updates require `organization.config.edit` (not `.view`)

---

### Session 8.3 — Wire real notifications (SMTP or Resend)

**Files:** `.env`, `src/lib/notifications/providers/smtp.ts` (already built)

**Tasks:**
- [ ] Choose a provider:
  - **Resend** (easiest for SaaS): sign up at resend.com, get an API key, verify your domain
  - **SMTP** (self-hosted): use an existing SMTP server (Gmail, SendGrid, Mailgun, etc.)
- [ ] Update `.env`:
  - For Resend: `NOTIFICATION_PROVIDER="resend"`, `RESEND_API_KEY="re_xxx"`, `EMAIL_FROM="MadrashaOS <no-reply@yourdomain.org>"`
  - For SMTP: `NOTIFICATION_PROVIDER="smtp"`, `SMTP_HOST="smtp.yourprovider.com"`, `SMTP_PORT="587"`, `SMTP_USER="xxx"`, `SMTP_PASSWORD="xxx"`, `EMAIL_FROM="MadrashaOS <no-reply@yourdomain.org>"`
- [ ] Test: submit a donation with a real email address, verify the receipt email arrives (check inbox + spam folder)
- [ ] Test: collect a fee payment for a student whose guardian has an email, verify the confirmation email arrives
- [ ] Test: mark a student absent, verify the guardian gets an SMS (if SMS provider is also configured — otherwise just verify the email)

**Acceptance criteria:**
- Real emails are sent (not just console logs) for: donation receipts, fee payment confirmations, admission confirmations, attendance absence alerts, low-stock alerts
- The `NOTIFICATION_PROVIDER` env var controls which provider is used

---

### Session 8.4 — Fix `security` and `backup` pages (build the endpoints or remove the pages)

**Files:** `src/app/(app)/security/page.tsx`, `src/app/(app)/backup/page.tsx`

**Current state (broken):**
- `/security` — Save button is toast-only, no `/api/v1/security/policy` endpoint exists
- `/backup` — Mock backup list, no `/api/v1/backup` endpoint, "Run Backup" creates a fake record

**Tasks (choose one per page):**

**For `/security`:**
- [ ] Option A (build): Create `GET /api/v1/security/policy` + `PUT /api/v1/security/policy` (gated to `security.policy.edit`). Store settings in the existing `SecurityPolicy` table (it's in the schema). Wire the page's Save button to the PUT endpoint.
- [ ] Option B (remove): Redirect `/security` to a "Coming in v2" page. Remove the nav item.

**For `/backup`:**
- [ ] Option A (build): Create `POST /api/v1/backup/run` that executes `pg_dump` via `child_process.exec` and stores the result in `public/backups/`. Create `GET /api/v1/backup` that lists `BackupRecord` rows. Wire the page to these endpoints. Add a cron job recommendation to the deployment docs.
- [ ] Option B (remove): Redirect `/backup` to a "Coming in v2" page. Remove the nav item. Document "Backups are handled at the infrastructure level (pg_dump cron) — see DEPLOYMENT.md".

**Acceptance criteria:**
- Either the pages work (call real APIs, persist data) or they're removed/redirected with a clear "v2" message
- No fake/toast-only submit buttons remain in the app

---

### Session 8.5 — Fix public pages (notices, events) to use real data

**Files:** `src/app/(public)/public/notices/page.tsx`, `src/app/(public)/public/events/page.tsx`, `src/app/(public)/public/page.tsx`

**Current state (broken):**
- `/public/notices` — hardcoded `NOTICES` array, no API call
- `/public/events` — hardcoded `EVENTS` + `PAST_EVENTS` arrays, no API call
- `/public` (home) — `RECENT_NOTICES` is hardcoded

**Tasks:**
- [ ] Create a public notices endpoint: `GET /api/v1/public/notices` (no auth required — add to middleware bypass list). Returns only notices with `status: "sent"` and `audience` includes `"public"`.
- [ ] Wire `/public/notices` to fetch from this endpoint
- [ ] Wire `/public` (home) recent notices section to the same endpoint (limit 5)
- [ ] For events: either create a `GET /api/v1/public/events` endpoint + wire the page, OR remove the events page and nav link if events aren't a v1 feature
- [ ] Test: as a public visitor (not logged in), open the public site, verify real notices appear

**Acceptance criteria:**
- The public notices page shows real notices from the DB (not hardcoded)
- The home page's recent notices section shows real notices
- No hardcoded data arrays remain in public pages

---

## Phase 9 — Documentation & Operational Readiness (Week 4)

**Goal:** Write the docs and operational artifacts needed to hand over to a client and keep the system running.

---

### Session 9.1 — Write `docs/DEPLOYMENT.md`

**File:** `docs/DEPLOYMENT.md` (new)

**Tasks:**
- [ ] Write a complete deployment guide covering:
  - Prerequisites (Node.js 20+, Bun, Docker, PostgreSQL 16)
  - Clone + install steps
  - `.env` setup (reference `.env.example`, explain each var)
  - `docker compose up -d` (start Postgres)
  - `bunx prisma generate` + `bunx prisma migrate deploy` + `bun run db:seed`
  - `bun run build` (production build)
  - `bun run start` (start production server)
  - Reverse proxy setup (Caddy/Nginx) — include the existing `Caddyfile` as a reference
  - SSL/TLS via Let's Encrypt
  - Healthcheck endpoint (`GET /api/docs` returns 200 if the server is up)
  - Backup strategy (`pg_dump` cron — include a sample script)
  - Update/upgrade procedure (git pull → migrate → rebuild → restart)
  - Rollback procedure (git checkout <prev> → migrate → restart)
  - Secrets management (never commit `.env`, use a secrets manager in prod)
  - Environment-specific configs (dev vs staging vs prod)

**Acceptance criteria:**
- A new developer can deploy the app to a fresh server by following `docs/DEPLOYMENT.md` step by step
- Every env var is documented with its purpose and example value

---

### Session 9.2 — Write `docs/ADMIN_MANUAL.md`

**File:** `docs/ADMIN_MANUAL.md` (new)

**Tasks:**
- [ ] Write an admin manual covering the day-to-day operations:
  - **First login** — change the default password immediately
  - **Create a teacher** — navigate to `/teachers`, click "Add Teacher", fill the form, assign to a class+section
  - **Create a student** — navigate to `/students`, click "Add Student", fill the form (name, class, section, guardian)
  - **Promote a student** — open the student profile, click "Promote", select the new class+section+academic year
  - **Collect a fee payment** — open `/fees`, find the student's installment, click "Collect Payment", enter amount + method
  - **Take attendance** (teacher role) — navigate to `/attendance/take`, select class+section, mark present/absent, submit
  - **Enter exam marks** (teacher role) — navigate to `/exams`, open the exam, enter marks per student, save
  - **Generate results** — navigate to `/results`, click "Generate Results" for a class+exam
  - **Post a ledger entry** (accountant role) — navigate to `/accounting`, click "New Entry", select debit+credit accounts, enter amount
  - **Receive a donation** — public donations appear automatically; manual donations via `/donations` → "Add Donation"
  - **Distribute Zakat** — navigate to `/zakat`, click "Distribute", select beneficiary + amount
  - **Send a notice** — navigate to `/notices`, click "Compose", select audience, send
  - **Manage RBAC** — navigate to `/rbac`, toggle permission groups per role, click "Save Matrix"
  - **View audit trail** — navigate to `/audit`, filter by entity type/actor/date, export CSV
  - **Switch branch** (multi-branch orgs) — use the branch selector in the top bar
  - **Configure the organization** — navigate to `/settings`, update name/email/address/default language
  - **Enable MFA** — navigate to profile → Security → Enable MFA, scan QR, verify

**Acceptance criteria:**
- An admin who has never seen the system can perform all core operations by following the manual
- Each task has the exact navigation path + expected result

---

### Session 9.3 — Write `docs/USER_GUIDE.md`

**File:** `docs/USER_GUIDE.md` (new)

**Tasks:**
- [ ] Write a user guide for end-users (teachers, guardians, accountants):
  - **For Teachers:**
    - How to log in
    - How to take attendance (the mobile-first flow)
    - How to enter exam marks
    - How to view your class's results
    - How to send a notice to parents
  - **For Guardians:**
    - How to log in (you'll receive credentials from the madrasha)
    - How to view your child's attendance
    - How to view your child's results
    - How to view and pay fees
    - How to receive notices
  - **For Accountants:**
    - How to collect a fee payment
    - How to post a ledger entry
    - How to receive a donation
    - How to distribute Zakat
    - How to generate financial reports
  - **For Authority (Principal):**
    - How to view the authority dashboard
    - How to approve pending requests
    - How to view the audit trail
    - How to manage roles and permissions

**Acceptance criteria:**
- A non-technical user (teacher, guardian) can use the system by following this guide
- Each guide has screenshots or step-by-step instructions

---

### Session 9.4 — Write `docs/DEVELOPER_GUIDE.md` + cleanup

**File:** `docs/DEVELOPER_GUIDE.md` (new), `.gitignore`

**Tasks:**
- [ ] Write a developer guide covering:
  - Architecture overview (Next.js App Router, API routes, Prisma, NextAuth, the lib structure)
  - The design system (tokens, components, how to add a new component)
  - How to add a new API route (the `withPermission` + `getTenantContext` pattern)
  - How to add a new page (the `IfPermission` + `useXxx` hook + `LoadingState`/`ErrorState`/`EmptyState` pattern)
  - How to add a new notification template
  - How to add a new payment gateway provider
  - The i18n system (how to add a new translation key)
  - The PDF template system (how to add a new PDF template)
  - Testing (how to run e2e-verify, load-test)
  - Debugging (where to find logs, common errors)
- [ ] **Clean up the repo:**
  - [ ] Add `tsconfig.tsbuildinfo`, `dev.log`, `tool-results/`, `upload/`, `.next/`, `node_modules/` to `.gitignore` (verify each is there)
  - [ ] Remove any committed `dev.log`, `tool-results/`, `upload/` files from git history (if accidentally committed): `git rm --cached <file>`
  - [ ] Verify `bun.lock` is committed (it should be)
  - [ ] Verify `src/generated/prisma/` is NOT committed (it's in `.gitignore` — each developer runs `prisma generate`)
- [ ] **Final lint check:** `bun run lint` — fix any new errors introduced in Phases 5–8 (pre-existing shadcn/ui warnings are acceptable)

**Acceptance criteria:**
- A new developer can onboard by reading `docs/DEVELOPER_GUIDE.md`
- The repo is clean (no build artifacts, logs, or temp files committed)
- `bun run lint` passes with 0 errors (warnings in shadcn/ui components are OK)

---

### Session 9.5 — Write a backup script + healthcheck

**Files:** `scripts/backup.sh` (new), `scripts/healthcheck.ts` (new)

**Tasks:**
- [ ] Write `scripts/backup.sh`:
  ```bash
  #!/bin/bash
  # MadrashaOS — Database backup script
  # Usage: ./scripts/backup.sh
  # Cron: 0 2 * * * /path/to/madrashaos/scripts/backup.sh
  set -euo pipefail
  BACKUP_DIR="${BACKUP_DIR:-./backups}"
  RETENTION_DAYS="${RETENTION_DAYS:-30}"
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  BACKUP_FILE="$BACKUP_DIR/madrashaos_$TIMESTAMP.sql.gz"
  mkdir -p "$BACKUP_DIR"
  echo "[$(date)] Starting backup → $BACKUP_FILE"
  pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"
  echo "[$(date)] Backup complete: $(du -h "$BACKUP_FILE" | cut -f1)"
  # Delete backups older than RETENTION_DAYS
  find "$BACKUP_DIR" -name "madrashaos_*.sql.gz" -mtime +$RETENTION_DAYS -delete
  echo "[$(date)] Cleaned up backups older than $RETENTION_DAYS days"
  ```
- [ ] Make it executable: `chmod +x scripts/backup.sh`
- [ ] Document the cron setup in `docs/DEPLOYMENT.md`
- [ ] Write `scripts/healthcheck.ts`:
  ```ts
  // Checks: DB connection, API responding, auth working
  // Usage: bun run scripts/healthcheck.ts
  // Exit 0 = healthy, exit 1 = unhealthy
  ```
  - Check 1: `fetch("http://localhost:3000/api/docs")` returns 200
  - Check 2: `fetch("http://localhost:3000/api/v1/auth/providers")` returns 200
  - Check 3: Can connect to the DB via Prisma (`db.$queryRaw\`SELECT 1\``)
- [ ] Test both scripts

**Acceptance criteria:**
- `scripts/backup.sh` creates a compressed SQL dump and cleans up old backups
- `scripts/healthcheck.ts` exits 0 when the system is healthy, 1 when it's not
- Both are documented in `docs/DEPLOYMENT.md`

---

## Phase 10 — Final Verification & Handover (Week 4)

**Goal:** Verify everything works end-to-end, then hand over.

---

### Session 10.1 — Expand the e2e test harness to cover POST flows

**File:** `scripts/e2e-verify.ts`

**Current state:**
- The e2e-verify script tests 8 flows, but they're mostly GET checks (login → verify session → check access). They don't test the actual write operations (take attendance, collect fee, enter marks, promote student).

**Tasks:**
- [ ] Add a flow: **Teacher takes attendance** — login as `bilal@madrashaos.org`, `POST /api/v1/attendance/sessions` with a real class_id + student roster, verify `201` + the session appears in `GET /api/v1/attendance/sessions`
- [ ] Add a flow: **Accountant collects a fee payment** — login as `accounts@madrashaos.org`, `POST /api/v1/fees/payments` for an existing installment, verify `201` + the payment appears in `GET /api/v1/fees/payments` + the installment's `is_paid` is true
- [ ] Add a flow: **Teacher enters exam marks** — login as teacher, `PUT /api/v1/exams/:id/marks`, verify `200` + marks appear in `GET /api/v1/exams/:id/marks`
- [ ] Add a flow: **Admin promotes a student** — login as admin, `POST /api/v1/students/:id/promote`, verify `200` + a StudentHistory entry is created
- [ ] Add a flow: **Guardian views own child's results** — login as guardian, `GET /api/v1/results/:own-child-id` returns `200`; `GET /api/v1/results/:other-child-id` returns `403` (verifies the Session 5.5 fix)
- [ ] Add a flow: **RBAC matrix save** — login as admin, `PUT /api/v1/roles/:id/permissions` with a modified permission list, verify `200` + the permissions are updated
- [ ] Run the expanded harness: `bun run e2e:verify` — all flows should pass

**Acceptance criteria:**
- `bun run e2e:verify` runs 13+ flows (8 existing + 5+ new) and all pass
- The harness tests actual write operations, not just reads

---

### Session 10.2 — Run the load test + fix any performance issues

**File:** `scripts/load-test.ts`

**Tasks:**
- [ ] Run `bun run load:test` — verify it passes with 0 errors
- [ ] If any endpoint has avg response time > 500ms, investigate:
  - Check for N+1 queries (Prisma `include` vs `select`)
  - Check for missing indexes (compare query patterns to `@@index` declarations in `schema.prisma`)
  - Check for unnecessary `force-dynamic` on pages that could be cached
- [ ] Add indexes if needed (via a new Prisma migration)
- [ ] Re-run the load test — verify improved times

**Acceptance criteria:**
- Load test passes with 0 errors
- All endpoints have avg response time < 500ms under 10 concurrent users
- No N+1 query warnings in the dev log

---

### Session 10.3 — Final browser verification of all user journeys

**Tasks:**
- [ ] **Teacher journey:** Login as `bilal@madrashaos.org` → dashboard → take attendance for a class → verify it appears in the attendance list → enter marks for an exam → verify they persist → view results
- [ ] **Accountant journey:** Login as `accounts@madrashaos.org` → dashboard → collect a fee payment → verify the ledger entry + receipt → post a ledger entry → receive a donation → distribute Zakat
- [ ] **Admin journey:** Login as `admin@madrashaos.org` → dashboard → add a student → promote a student → upload a document → manage RBAC (toggle a permission, save) → view audit trail → export CSV
- [ ] **Authority journey:** Login as `principal@madrashaos.org` → dashboard → approve a pending request → view audit trail
- [ ] **Guardian journey:** Login as `omar.parent@example.com` → dashboard → view child's attendance → view child's results → view fee plans → view notices
- [ ] **Storekeeper journey:** Login as `store@madrashaos.org` → dashboard → view inventory → issue an item (verify low-stock alert) → receive a purchase
- [ ] **Public visitor journey:** Open `/public` (no login) → view public notices → submit a donation (verify receipt email arrives if notifications are wired) → submit an admission application (verify confirmation)
- [ ] **Language switching:** On any page, switch to Bangla → verify all text translates → switch to Arabic → verify RTL layout → switch back to English
- [ ] **Mobile responsive:** Resize the browser to 375px width → verify the nav collapses to a drawer → verify all pages are usable on mobile

**Acceptance criteria:**
- All 7 role journeys work end-to-end without errors
- Language switching works for bn/en/ar with RTL
- Mobile layout is usable on 375px width

---

### Session 10.4 — Final commit, tag, and handover package

**Tasks:**
- [ ] Run `bun run lint` — 0 errors (warnings OK)
- [ ] Run `bun run e2e:verify` — all flows pass
- [ ] Run `bun run load:test` — 0 errors
- [ ] Run `bun run build` — production build succeeds
- [ ] Commit all final changes
- [ ] Tag the release: `git tag -a v1.0.0 -m "MadrashaOS v1.0.0 — production-ready handover"`
- [ ] Push the tag: `git push origin v1.0.0`
- [ ] Create a GitHub Release with the changelog (summarize Phases 1–10)
- [ ] Prepare the handover package:
  - [ ] Repository URL + tag
  - [ ] `docs/DEPLOYMENT.md` (how to deploy)
  - [ ] `docs/ADMIN_MANUAL.md` (how to administer)
  - [ ] `docs/USER_GUIDE.md` (how to use)
  - [ ] `docs/DEVELOPER_GUIDE.md` (how to develop further)
  - [ ] `.env.example` (configuration template)
  - [ ] Default credentials (8 users, all `password123` — **must be changed on first login**)
  - [ ] Known limitations (if any: CMS removed for v1, payment gateway manual-only for v1, etc.)

**Acceptance criteria:**
- The repo is tagged `v1.0.0`
- All 4 docs exist and are complete
- `.env.example` exists
- `bun run build` + `bun run e2e:verify` + `bun run load:test` all pass
- The handover package is ready to give to the client

---

## Summary Checklist (quick reference)

| Phase | Sessions | Goal | Estimated Duration |
|-------|----------|------|-------------------|
| **5** | 5.1–5.5 | Core frontend wiring (4 P0 flows + security fix) | 5 days |
| **6** | 6.1–6.5 | Backend bug fixes (6 bugs) | 5 days |
| **7** | 7.1–7.2 | CMS + payment gateway decisions | 2–4 days |
| **8** | 8.1–8.5 | Security + production hardening | 5 days |
| **9** | 9.1–9.5 | Documentation + operational artifacts | 5 days |
| **10** | 10.1–10.4 | Final verification + handover | 4 days |
| | | **Total** | **~26–28 developer-days (~5–6 weeks)** |

---

## What "Done" Looks Like

When all sessions are complete:

1. ✅ A teacher can log in, take attendance, enter marks, and view results — all through the UI
2. ✅ An accountant can collect fee payments, post ledger entries, receive donations, and distribute Zakat — all through the UI
3. ✅ An admin can add students, promote them, upload documents, manage RBAC, and view the audit trail — all through the UI
4. ✅ A guardian can view their child's attendance, results, fees, and notices — all through the UI
5. ✅ A public visitor can submit a donation and an admission application — both create real DB records
6. ✅ All pages render real data (no mock arrays)
7. ✅ All submit buttons call real APIs (no toast-only handlers)
8. ✅ All API routes enforce permissions (no ungated GETs)
9. ✅ Notifications are sent via real email/SMS (not console)
10. ✅ The production build succeeds and passes e2e + load tests
11. ✅ Documentation exists for deployment, admin, users, and developers
12. ✅ Secrets are rotated and `.env.example` exists
13. ✅ Backups are automated
14. ✅ The repo is tagged `v1.0.0`

**Then it's ready to hand to the client.**

---

*End of handover task list.*
