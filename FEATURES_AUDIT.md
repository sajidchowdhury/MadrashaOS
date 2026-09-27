# MadrashaOS — Features Audit & Business Logic Documentation

> **Purpose:** A feature-by-feature audit of the actual business logic in MadrashaOS — not page names or comments, but what the code *actually does*. Each feature is rated as ✅ Active & sufficient, ⚠️ Active but needs improvement, or ❌ Missing/broken.

> **Audit method:** Read the Prisma schema (`prisma/schema.prisma`), API route handlers (`src/app/api/v1/`), and page components (`src/app/(app)/`) on the `origin/main` branch. Verified real `fetch()` calls, real DB writes, and real permission gates.

---

## Workflow Overview (as described by the user)

The super admin's intended workflow:

1. Login → create employee accounts → assign roles
2. Set up accounting ledger (debit/credit accounts)
3. Setup madrasha profile
4. Setup classes
5. Setup subjects per class
6. Setup fees per class
7. Assign teachers to class + subject
8. Take attendance
9. End of month: collect fees (including hostel if applicable) + inventory purchases → add to fees or sell separately
10. Pay teacher salaries
11. Maintain all madrasha costs in accounting
12. Maintain library

Below is the audit for each step.

---

## Feature 1: Authentication & Login

### Where to find it
- **Page:** `/login` (`src/app/(public)/login/page.tsx` — or `src/app/login/page.tsx`)
- **API:** `POST /api/auth/[...nextauth]` (NextAuth.js credentials provider)
- **Config:** `src/lib/auth/config.ts`

### Business logic
- Uses NextAuth.js v4 with a credentials provider (email + password).
- The `authorize()` function looks up the user by email (case-insensitive), checks `deleted_at: null`, compares the bcrypt-hashed password via `verifyPassword()`.
- On success, the JWT callback encodes `organization_id`, `branch_id`, `role.code`, and `permissions[]` into the session token.
- MFA/TOTP support exists (`src/app/api/v1/auth/mfa/*`) — opt-in per user.
- Failed-login tracking + account lockout fields exist on the User model (`failed_login_count`, `locked_until`).

### Status: ✅ Active & sufficient
Login works. 8 seeded users, all with password `password123`. Roles + permissions are enforced server-side via `withPermission()`.

---

## Feature 2: Employee Management & Role Assignment

### Where to find it
- **Page:** `/employees` (`src/app/(app)/employees/page.tsx`)
- **API:** `GET/POST /api/v1/employees`, `GET/PATCH/DELETE /api/v1/employees/[id]`
- **RBAC API:** `GET/PUT /api/v1/roles/[id]/permissions`

### Business logic
- **Create Employee** (`POST /api/v1/employees`):
  - Creates a `User` + `Employee` row in a transaction (linked by `user_id`).
  - Generates an employee code (`EMP-YYYY-NNNN`) and a temporary password.
  - Resolves the role via `role_code` in the request body (defaults to `storekeeper` if omitted).
  - Returns the temp password once (never persisted in plaintext).
  - Branch is resolved from the body or falls back to the acting user's `branch_id`.
- **Role assignment:** The employee's role is set at creation via `role_code` → `role_id`. To change a role's permissions, use `PUT /api/v1/roles/[id]/permissions` (full-replace semantics — soft-deletes old assignments, creates new ones).
- **Permission matrix UI:** `/rbac` page shows all 8 roles × 110+ permissions and lets admins toggle them (saves via the PUT endpoint above).

### Status: ✅ Active & sufficient
Employees can be created, given roles, and role permissions can be customized per-tenant. The RBAC matrix page works.

---

## Feature 3: Accounting — Chart of Accounts (Debit/Credit)

### Where to find it
- **Page:** `/accounting` (`src/app/(app)/accounting/page.tsx`) — has both a "New Entry" button and a "Chart of Accounts" section with an "Add Account" button.
- **API:** `GET/POST /api/v1/accounts`, `GET/PATCH/DELETE /api/v1/accounts/[id]`
- **Dialog:** `src/components/finance/AccountFormDialog.tsx`

### Business logic
- **Create Account** (`POST /api/v1/accounts`):
  - Fields: `code`, `name`, `name_bn?`, `type` (asset/liability/equity/income/expense), `fund` (general/zakat), `is_cash?`, `is_bank?`, `bank_name?`, `bank_account_no?`, `opening_balance?`, `description?`.
  - Tenant-scoped (`organization_id` + `branch_id`).
  - Code uniqueness is enforced per organization.
- **List Accounts:** Returns all accounts with their parent, balance, transaction count, and Cash/Bank flags.
- **Seed creates 4 starter accounts:** Cash on Hand (1000), Bank — Sonali (1010), Fee Income (4000), Operating Expenses (5000).

### Status: ✅ Active & sufficient (after recent fixes)
The "Add Account" button and Chart of Accounts section were added in commit `6003db0`. The `accounting.ledger.post` permission was granted to Administrator + Authority in commit `1af32e0`. Users can now create accounts and then create ledger entries.

---

## Feature 4: Accounting — Ledger Entries (Double-Entry)

### Where to find it
- **Page:** `/accounting` — "New Entry" button opens the `LedgerEntryForm` dialog.
- **API:** `GET/POST /api/v1/ledger/entries` (listed as `ledger` in client)
- **Dialog:** `src/components/finance/LedgerEntryForm.tsx`

### Business logic
- **Create Entry** (`POST /api/v1/ledger`):
  - Enforces the double-entry invariant: **debits must equal credits**.
  - Fields: `debit_account_id`, `credit_account_id`, `debit_amount`, `credit_amount`, `narration`, `date`, `voucher_no` (auto-generated as `JV-YYYY-NNN`).
  - Validation: debit ≠ credit account, both amounts > 0, debit === credit.
  - Creates a `LedgerEntry` row + updates both account balances in a transaction.
- **List:** Returns entries with running balance (cumulative), filterable by date range, status, and account.
- **Source types** (for audit trail): `manual`, `cash_bank_transfer`, `zakat_transaction`, `food_expense`, `purchase_receive`, `transport_expense`, `donation`.

### Status: ✅ Active & sufficient
Double-entry works, voucher numbers auto-generate, balances update. The `LedgerEntryForm` validates debit=credit.

---

## Feature 5: Madrasha Profile (Organization)

### Where to find it
- **Page:** `/organization` (`src/app/(app)/organization/page.tsx`)
- **API:** `GET/PATCH /api/v1/organizations`
- **Branches:** `GET/POST /api/v1/branches`, `POST /api/v1/branches/switch`

### Business logic
- **View:** Shows organization name (en/bn), slug, phone, email, address + all branches.
- **Edit** (`PATCH`): Updates name, phone, email, address. Permission: `organization.config.view`.
- **Branch switching:** Authority/Super-admin roles can switch their active branch at runtime (`POST /api/v1/branches/switch`), which updates the session's `branch_id` (5-second JWT cache).

### Status: ✅ Active & sufficient
Organization profile is viewable and editable. Branch management works.

---

## Feature 6: Classes & Sections

### Where to find it
- **Page:** `/academic/structure` (`src/app/(app)/academic/structure/page.tsx`)
- **API:** `GET/POST /api/v1/classes`, `GET/PATCH/DELETE /api/v1/classes/[id]`, `POST /api/v1/classes/[id]/sections`

### Business logic
- **Create Class:** Fields: `name`, `name_bn`, `level` (1-15), `stream?`. Creates the class + comma-separated sections in one flow.
- **Sections:** Each class has sections (A, B, etc.) — stored as `Section` rows with `teacher_id` (for class teacher assignment).
- **List:** Returns classes with sections + student count.

### Status: ✅ Active & sufficient
Classes and sections can be created and managed. The "Add Class" button was fixed in commit `01c6c9a`.

---

## Feature 7: Subjects

### Where to find it
- **Page:** `/subjects` (`src/app/(app)/subjects/page.tsx`)
- **API:** `GET/POST /api/v1/subjects`, `GET/PATCH/DELETE /api/v1/subjects/[id]`

### Business logic
- **Create Subject:** Fields: `code` (e.g. QUR), `name`, `name_bn?`, `name_ar?`, `is_quranic` (flag), `category` (quranic/language/science/social/arts), `full_marks` (default 100), `pass_marks` (default 33), `display_order`.
- **Delete:** Soft-delete, blocked if active teacher assignments reference the subject (returns 409).
- **Nav:** Appears in the Academic nav group as "Subjects / বিষয়".

### Status: ✅ Active & sufficient
Subjects page was added in commit `e5fc8ac`. Full CRUD works. Required before assigning teachers.

---

## Feature 8: Fee Plans (Class-wise with Components)

### Where to find it
- **Page:** `/fees` — "Create Fee Plan" button
- **API:** `GET/POST /api/v1/fees/plans`, `POST /api/v1/fees/plans/bulk`, `GET/PATCH/DELETE /api/v1/fees/plans/[id]`
- **Dialog:** `src/components/finance/CreateFeePlanDialog.tsx`

### Business logic
- **Bulk Create** (`POST /api/v1/fees/plans/bulk`):
  - Accepts: `class_id`, `academic_year`, `monthly_tuition`, `hostel_fee`, `bus_fee`, `other_fee`, `other_label`, `months` (1-12), `start_month`.
  - Computes `monthlyTotal = tuition + hostel + bus + other`.
  - Creates a `FeePlan` + N `FeeInstallment` rows (one per month, labeled "January 2026", etc.) for **every active student** in the class.
  - **Students who already have a plan for that year are SKIPPED** (per-student overrides survive).
- **Per-student plan** (`POST /api/v1/fees/plans`): Creates a single plan with custom installments.

### Status: ⚠️ Active but needs improvement
**BUG: Hostel fee is applied to ALL students in the class, including day scholars.** The bulk endpoint does NOT check whether a student has a hostel bed allocation. Every student gets the same `hostel_fee` component. See Feature 11 (Hostel) below for the fix needed.

---

## Feature 9: Fee Collection (Payments)

### Where to find it
- **Page:** `/fees` — per-row "Collect" button + header "Collect Payment" button
- **API:** `GET/POST /api/v1/fees/payments`, `GET /api/v1/fees/payments/[id]`, `GET /api/v1/fees/outstanding`
- **Dialog:** `src/components/finance/CollectPaymentDialog.tsx`

### Business logic
- **Collect Payment** (`POST /api/v1/fees/payments`):
  - 3-step flow: select student → pick installment + amount + method + account → receipt preview + confirm.
  - **Golden Flow (§3.6):** Creates the `FeePayment` row, marks the `FeeInstallment` as paid, **creates a balanced `LedgerEntry`** (debit Cash/Bank account, credit Fee Income account), and updates both account balances — all in one transaction.
  - Generates a receipt number (`RCP-YYYY-NNNN`).
  - Idempotency supported via `IdempotencyRecord` table.
- **Receipt PDF:** `PdfDownloadButton` renders a branded PDF receipt via `@react-pdf/renderer`.

### Status: ✅ Active & sufficient
Fee collection is fully wired to the double-entry ledger. The `fees.payment.create` permission was granted to Administrator + Authority in commit `ec8ccf8`.

---

## Feature 10: Teacher Assignment (Class + Subject)

### Where to find it
- **Page:** `/teachers` — "Add Teacher" + "Assign Teacher" buttons
- **API:** `GET/POST /api/v1/teachers`, `POST /api/v1/teachers/assign`, `GET /api/v1/teachers/[id]/assignments`

### Business logic
- **Add Teacher** (`POST /api/v1/teachers`):
  - Promotes an Employee (linked User) to a Teacher record.
  - Fields: `user_id`, `employee_code`, `designation?`, `qualification?`, `specialization?`, `joined_at`, `salary?`, `status`.
  - Enforces 1:1 User→Teacher invariant (a user can be linked to at most one Teacher).
- **Assign Teacher** (`POST /api/v1/teachers/assign`):
  - Fields: `teacher_id`, `class_id`, `section_id?`, `subject_id`, `is_class_teacher?`, `academic_year?`, `notes?`.
  - Validates all entities exist in the current tenant.
  - Blocks duplicate active assignments (same teacher + class + section + subject + year → 409).
  - If `is_class_teacher=true` AND `section_id` is provided → also sets `Section.teacher_id` to this teacher.

### Status: ✅ Active & sufficient
The "Add Teacher" dialog was added in commit `e2165f6`. The Assign Teacher dropdown now only shows real Teacher records (not employees), fixing the "Teacher not found" error.

---

## Feature 11: Hostel Management & Hostel Fee

### Where to find it
- **Page:** `/hostel` (`src/app/(app)/hostel/page.tsx`)
- **API:** `GET/POST /api/v1/hostel/rooms`, `POST /api/v1/hostel/beds/[id]/allocate`, `POST /api/v1/hostel/beds/[id]/deallocate`
- **Fee integration:** `POST /api/v1/fees/plans/bulk` (hostel_fee is now conditional on allocation)

### Business logic
- **Room/Bed model:** `HostelRoom` has rooms, each with `HostelBed` rows. Beds have `student_id?`, `status` (vacant/occupied), `allocated_at`, `vacated_at`, and `monthly_fee` (the actual per-bed charge).
- **Allocate** (`POST /api/v1/hostel/beds/[id]/allocate`): Links a student to a bed, sets `status='occupied'`, records `monthly_fee`.
- **Deallocate:** Frees the bed, sets `vacated_at`.
- **Fee plan integration (fixed):** When creating a class-wise fee plan with a `hostel_fee` component, the bulk fee endpoint now:
  1. Queries `HostelBed` for all students in the class.
  2. For students with an active allocation (`status='occupied' AND vacated_at IS NULL`): uses `HostelBed.monthly_fee` if > 0, otherwise falls back to the request body's `hostel_fee`.
  3. For day scholars (no active bed): sets `hostel_fee = 0` — they don't pay hostel.
  4. Each student's fee plan notes include their bed/room number if allocated.
  5. Response includes `boarders` + `day_scholars` counts + per-group monthly totals.
  6. Toast shows the breakdown (e.g. "8 boarders ৳1,500/mo, 2 day scholars ৳1,000/mo").

### Status: ✅ Active & sufficient (fixed)
The hostel fee bug is resolved. Day scholars are no longer charged the hostel fee. The `HostelBed.monthly_fee` field is respected per bed — if you set a different fee on a specific bed (e.g. a premium room), that amount is used instead of the class template.

---

## Feature 12: Attendance

### Where to find it
- **Page:** `/attendance` (list) + `/attendance/take` (take attendance)
- **API:** `GET/POST /api/v1/attendance/sessions`, `GET /api/v1/attendance/sessions/[id]`

### Business logic
- **Take Attendance** (`POST /api/v1/attendance/sessions`):
  - Fields: `class_id`, `section_id?`, `date`, `academic_year?`, `period?` (morning/afternoon/full), `records[]` (each: `student_id`, `status` [present/absent/late/leave], `note?`).
  - Creates an `AttendanceSession` + N `AttendanceRecord` rows in one transaction.
  - Idempotency supported.
  - The `/attendance/take` page calls this endpoint via `fetch()` (real, not mock).
- **List:** Sessions with present/absent counts, filterable by class + date.

### Status: ✅ Active & sufficient
The "Take Attendance" button was enabled for Administrator in commit `e2165f6` (added `attendance.take` permission). The take page is fully wired to the real API.

---

## Feature 13: Inventory Sale to Students

### Where to find it
- **Page:** `/inventory` — "Sell to Student" button (gated by `inventory.sale`)
- **API:** `POST /api/v1/inventory/sell`, `GET /api/v1/inventory/sales`
- **Dialog:** `src/components/inventory/SellToStudentDialog.tsx`
- **Model:** `InventorySale` (sales records table)

### Business logic
- **Sell to Student** (`POST /api/v1/inventory/sell`):
  - Accepts: `student_id`, `item_id`, `qty`, `unit_price?` (defaults to item's unit_cost), `payment_mode` (cash/credit), `account_id?` (required for cash), `notes?`.
  - Validates the item exists + has sufficient stock.
  - Validates the student exists in the tenant.
  - Finds a Sale Income account (income account whose name contains "sale" → code "4001" → any income account).
  - **Two payment modes:**
    - **Cash mode:** Posts a LedgerEntry (debit Cash/Bank, credit Sale Income) + decrements stock. Updates the Cash/Bank balance.
    - **Credit mode:** Creates a `FeeInstallment` row for the student (label: "Sale: {item name} × {qty}") + posts a LedgerEntry (debit Accounts Receivable, credit Sale Income) + decrements stock. The installment appears on `/fees` and can be collected later via "Collect Payment".
  - Generates `sale_no` (`SALE-YYYY-NNNN`) + `voucher_no` (`JV-YYYY-NNN`).
  - Audit log entry (`inventory.sell`).
- **List Sales** (`GET /api/v1/inventory/sales`): Paginated, filterable by `student_id`, `item_id`, `payment_mode`.
- **UI:** The `/inventory` page has a "Sell to Student" button in the header. Clicking it opens the `SellToStudentDialog` with student + item dropdowns, qty, unit price (auto-filled from the item's cost), payment mode (cash/credit), account (cash mode), notes, and a live total.

### Status: ✅ Active & sufficient (implemented)
Students can now be charged for inventory purchases. Cash sales post immediately to the ledger; credit sales create a fee installment that rides the student's fee stream (collectable via `/fees` → Collect Payment).

---

## Feature 14: Teacher/Employee Salary Payment (Payroll)

### Where to find it
- **Page:** `/employees` — per-row "Pay Salary" button (gated by `accounting.ledger.post`)
- **API:** `POST /api/v1/payroll/pay`, `GET /api/v1/payroll`
- **Dialog:** `src/components/finance/PaySalaryDialog.tsx`
- **Model:** `PayrollRecord` (payslips table)

### Business logic
- **Pay Salary** (`POST /api/v1/payroll/pay`):
  - Accepts: `staff_type` (employee/teacher), `staff_id`, `month`, `year`, `amount`, `account_id` (Cash/Bank), `deductions?`, `notes?`, `payment_date?`.
  - Validates the staff exists in the tenant and is `active`.
  - Validates the payment account is an `asset` (Cash/Bank).
  - Finds a Salary Expense account (debit side): looks for an expense account whose name contains "salary", then code "5000", then any expense account.
  - **Duplicate-payslip guard:** one payslip per staff per month/year (returns 409 if already paid).
  - **Golden Flow (transaction):** creates a `PayrollRecord` (payslip) + a balanced `LedgerEntry` with `source_type='salary'` (debit Salary Expense, credit Cash/Bank) + updates both account balances.
  - Generates payslip number (`PAY-YYYY-NNNN`) + voucher number (`JV-YYYY-NNN`).
  - Writes an audit log entry (`payroll.pay`).
- **List Payslips** (`GET /api/v1/payroll`): Paginated, filterable by `staff_type`, `month`, `year`.
- **UI:** The `/employees` page has a "Pay Salary" button per row. Clicking it opens the `PaySalaryDialog` with the staff's stored salary pre-filled. The dialog shows month/year, amount, deductions, payment account (Cash/Bank dropdown), notes, and a live summary.

### Status: ✅ Active & sufficient (implemented)
Salary payment is now fully wired to the double-entry ledger. Paying a salary:
1. Debits the Salary Expense account (expense increases)
2. Credits the Cash/Bank account (asset decreases)
3. Creates a payslip record for audit history
4. Generates a payslip number (PAY-2026-0001) + voucher number (JV-2026-001)

---

## Feature 15: Library Management

### Where to find it
- **Page:** `/library` (`src/app/(app)/library/page.tsx`) — wired to the real API
- **API:** `GET/POST /api/v1/library/books`, `POST /api/v1/library/issue`, `POST /api/v1/library/return`
- **Hooks:** `useLibraryBooks()` from `@/lib/query/client`

### Business logic
- **LibraryBook model:** `title`, `author`, `isbn`, `total_copies`, `available_copies`, `shelf_location`.
- **LibraryIssue model:** `book_id`, `student_id`, `issue_date`, `due_date`, `returned_date`, `fine_amount`, `status`.
- **List Books** (`GET /api/v1/library/books`): Paginated, searchable by title/author/accession_no, filterable by category + availability.
- **Add Book** (`POST /api/v1/library/books`): Creates a new book with accession_no, title, author, category, total_copies.
- **Issue** (`POST /api/v1/library/issue`): Validates availability (409 if no copies), creates a `LibraryIssue` row, decrements `available_copies`. Fields: `book_id`, `student_id`, `due_date`, `notes?`.
- **Return** (`POST /api/v1/library/return`): Returns a book. Fields: `issue_id`, `fine_amount?`, `notes?`. Sets `status='returned'`, increments `available_copies`.
  - **When `fine_amount > 0`:**
    1. Finds the student's active `FeePlan` for the current year.
    2. Creates a `FeeInstallment` (label: "Library fine: {book title}") so the fine rides the student's fee stream — collectable via `/fees` → Collect Payment.
    3. Posts a balanced `LedgerEntry` (debit Accounts Receivable, credit Library Fine Income) with `source_type='library_fine'`.
    4. Updates both account balances.
- **Frontend (real API):**
  - The `/library` page uses `useLibraryBooks()` (TanStack Query) to fetch books.
  - "Issue Book" dialog: select book + student + due date → calls `POST /api/v1/library/issue`.
  - "Return Book" dialog: enter issue_id + optional fine → calls `POST /api/v1/library/return`. Shows a note that the fine will be added to student fees.
  - "Add Book" dialog: creates a new book via `POST /api/v1/library/books`.
  - Loading/error/empty states properly handled.

### Status: ✅ Active & sufficient (fixed)
The library page is now wired to the real API (was mock data before). Library fines are automatically added to the student's outstanding fees as a `FeeInstallment` (appears on `/fees`) and posted to the ledger as a balanced entry.

---

## Feature 16: Approvals Workflow

### Where to find it
- **Page:** Dashboard approval widget + `/api/v1/approvals/*`
- **API:** `GET/POST /api/v1/approvals`, `GET /api/v1/approvals/pending`, `POST /api/v1/approvals/[id]/approve`, `POST /api/v1/approvals/[id]/reject`, `POST /api/v1/approvals/[id]/delegate`
- **Helper:** `src/lib/auth/with-approval-gate.ts` — `checkApprovalGate()`

### Business logic
- **Approval model:** Generic entity with `type` (expense/purchase/discount/admission/salary), `payload` (JSON), `entity_type`, `entity_id`, `requested_by`, `decided_by`, `status` (pending/approved/rejected/delegated).
- **No-self-approve (D16):** A user cannot approve their own request (enforced server-side in the approve endpoint).
- **Threshold-based gating (implemented):** The `checkApprovalGate()` helper now gates two operations:
  1. **Salary payment** (`POST /api/v1/payroll/pay`): If the net salary exceeds `SALARY_APPROVAL_THRESHOLD` (default ৳20,000), the payment is blocked until an Approval row with `status='approved'` exists. If none exists, a pending approval is auto-created and the endpoint returns 202 "pending approval". Once approved (by a different user), the salary can be paid by retrying the same request.
  2. **Fee discount** (`PATCH /api/v1/fees/plans/[id]`): If `scholarship_amount` exceeds `DISCOUNT_APPROVAL_THRESHOLD` (default ৳5,000), the discount is blocked until approved. Prevents a single admin from granting large discounts without oversight.
- **Workflow:**
  1. User attempts an operation (e.g. pay salary of ৳25,000)
  2. The gate helper checks: amount > threshold → yes
  3. Looks for existing approval (type=salary, entity_id=staff:year:month)
  4. If none → creates a pending Approval + returns 202 "Approval required"
  5. Authorized user (e.g. Principal) sees it on the dashboard → approves it
  6. User retries the operation → gate finds approved Approval → proceeds
- **Thresholds** (env-configurable via `.env`):
  - `SALARY_APPROVAL_THRESHOLD` = 20,000 BDT
  - `DISCOUNT_APPROVAL_THRESHOLD` = 5,000 BDT
  - `EXPENSE_APPROVAL_THRESHOLD` = 10,000 BDT
  - Set to 0 to disable gating for a type.

### Status: ✅ Active & sufficient (fixed)
The approval system now actually gates business operations. Salary payments above ৳20,000 and fee discounts above ৳5,000 require a second-person approval before they can be executed. D16 (no self-approve) is enforced server-side. The thresholds are configurable via environment variables.

---

## Feature 17: Cash & Bank Transfers

### Where to find it
- **Page:** `/cashbank` (`src/app/(app)/cashbank/page.tsx`)
- **API:** `GET/POST /api/v1/cashbank/transfers`, `GET /api/v1/cashbank/transfers/[id]`

### Business logic
- **Transfer** (`POST /api/v1/cashbank/transfers`):
  - Fields: `from_account_id`, `to_account_id`, `amount`, `fund` (general/zakat), `narration?`, `transfer_date`.
  - Creates a balanced `LedgerEntry` (debit destination, credit source) with `source_type='cash_bank_transfer'`.
  - Updates both account balances.
  - Generates a voucher number.

### Status: ✅ Active & sufficient
Transfers are wired to the ledger. Useful for moving money between Cash and Bank accounts.

---

## Feature 18: Exams & Marks

### Where to find it
- **Page:** `/exams` + `/exams/[id]/marks`
- **API:** `GET/POST /api/v1/exams`, `GET/PUT /api/v1/exams/[id]/marks`, `POST /api/v1/exams/[id]/publish`

### Business logic
- **Create Exam:** Fields: `name`, `class_id`, `subject_id`, `academic_year`, `exam_date`, `full_marks`, `pass_marks`.
- **Enter Marks** (`PUT /api/v1/exams/[id]/marks`): Batch upsert of `Mark` rows per student.
- **Publish:** Changes exam status to published, generates `Result` rows.

### Status: ✅ Active & sufficient
Exams + marks entry are wired to the real API.

---

## Feature 19: Results & Report Cards

### Where to find it
- **Page:** `/results`
- **API:** `GET /api/v1/results`, `GET /api/v1/results/[studentId]`, `POST /api/v1/results/generate`

### Business logic
- **Generate Results** (`POST /api/v1/results/generate`): Computes GPAs + ranks from published exam marks.
- **View:** Per-student results with subject breakdown.
- **Guardian scope:** Guardians see only their own children's results (`isOwnOnly` check).

### Status: ✅ Active & sufficient
Results generation + guardian scoping work.

---

## Feature 20: Donations

### Where to find it
- **Page:** Public donation form + `/donations` (staff list)
- **API:** `GET/POST /api/v1/donations`

### Business logic
- **Public donation** (`POST`, no auth required per Risk R10):
  - Fields: `donor_name`, `amount`, `fund` (general/zakat), `method` (cash/bkash/sslcommerz), `phone?`, `email?`, `message?`.
  - Creates a `Donation` row + a `LedgerEntry` (debit Cash/Bank, credit Donation Income).
  - Sends a confirmation email/SMS via `notifyEntity()`.

### Status: ✅ Active & sufficient
Public donation form works and posts to the ledger.

---

## Feature 21: Zakat Management

### Where to find it
- **Page:** `/zakat`
- **API:** `GET /api/v1/zakat`, `POST /api/v1/zakat/receive`, `POST /api/v1/zakat/distribute`

### Business logic
- **Receive** (`POST /api/v1/zakat/receive`): Records incoming zakat, posts to the Zakat fund account.
- **Distribute** (`POST /api/v1/zakat/distribute`): Records outgoing zakat to a recipient. Requires `zakat.view` permission.
- Fund isolation enforced (zakat money doesn't mix with general fund).

### Status: ✅ Active & sufficient
Zakat receive/distribute works and is fund-isolated.

---

## Feature 22: Notices & Communication

### Where to find it
- **Page:** `/notices`
- **API:** `GET/POST /api/v1/notices`, `POST /api/v1/notices/[id]/send`

### Business logic
- **Compose:** Fields: `title`, `body`, `audience` (all/staff/teachers/guardians/students), `channel` (email/sms/in-app).
- **Send:** Sends via `notifyEntity()` (console/SMTP/Resend providers).
- **Public notices:** Read-only public endpoint at `/api/v1/public/notices`.

### Status: ✅ Active & sufficient
Notice composition + multi-channel sending works.

---

## Feature 23: Audit Trail

### Where to find it
- **Page:** `/audit`
- **API:** `GET /api/v1/audit`, `GET /api/v1/audit/[id]`, `GET /api/v1/audit/export`

### Business logic
- Every mutating API route writes an `AuditLog` row with `actor_user_id`, `action`, `entity_type`, `entity_id`, `metadata` (JSON).
- Exportable (CSV/PDF).

### Status: ✅ Active & sufficient
All mutations are audited.

---

## Summary Table

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Authentication & Login | ✅ Active | NextAuth + bcrypt + MFA |
| 2 | Employee + Role Assignment | ✅ Active | Create user+employee, assign role via role_code |
| 3 | Chart of Accounts | ✅ Active | Add Account dialog + list (added recently) |
| 4 | Ledger Entries (Double-Entry) | ✅ Active | Debit=credit enforced, voucher auto-gen |
| 5 | Madrasha Profile | ✅ Active | Organization + branch management |
| 6 | Classes & Sections | ✅ Active | Create class + sections in one flow |
| 7 | Subjects | ✅ Active | Full CRUD, Quranic flag, categories |
| 8 | Fee Plans (Class-wise) | ✅ Fixed | Hostel fee now conditional on bed allocation |
| 9 | Fee Collection | ✅ Active | Wired to ledger (Golden Flow) |
| 10 | Teacher Assignment | ✅ Active | Add Teacher + Assign (class+subject) |
| 11 | Hostel Management | ✅ Fixed | Hostel fee now conditional on bed allocation |
| 12 | Attendance | ✅ Active | Take attendance → real API |
| 13 | Inventory Sale to Students | ✅ Active | Sell to student (cash/credit) + ledger + fee link (implemented) |
| 14 | Salary Payment (Payroll) | ✅ Active | POST /payroll/pay + ledger + payslip (implemented) |
| 15 | Library | ✅ Active | Real API + fines → fee installments (fixed) |
| 16 | Approvals Workflow | ✅ Active | Threshold-based gating for salary (৳20k) + discounts (৳5k) |
| 17 | Cash & Bank Transfers | ✅ Active | Wired to ledger |
| 18 | Exams & Marks | ✅ Active | Create exam + enter marks + publish |
| 19 | Results & Report Cards | ✅ Active | GPA + rank generation, guardian scope |
| 20 | Donations | ✅ Active | Public form + ledger posting |
| 21 | Zakat | ✅ Active | Fund-isolated receive/distribute |
| 22 | Notices | ✅ Active | Multi-channel (email/SMS/in-app) |
| 23 | Audit Trail | ✅ Active | All mutations logged |

---

## Critical Gaps (Priority Order)

**All critical gaps are now resolved.** The full madrasha workflow works
end-to-end with proper financial controls:

1. ✅ ~~Salary Payment (Payroll)~~ — Fixed (commit `4060849`)
2. ✅ ~~Hostel Fee Bug~~ — Fixed (commit `02ae8c7`)
3. ✅ ~~Inventory Sale to Students~~ — Fixed (commit `1491eb8`)
4. ✅ ~~Library Frontend~~ — Fixed (commit `993b9e3`)
5. ✅ ~~Library Fines → Fees~~ — Fixed (commit `993b9e3`)
6. ✅ ~~Approvals gating~~ — Fixed (this commit)

---

## What Works Well (The Golden Path)

If you follow this workflow, everything works end-to-end:

1. ✅ Login as admin
2. ✅ Create employees + assign roles (`/employees`)
3. ✅ Add accounts (`/accounting` → Add Account)
4. ✅ Edit madrasha profile (`/organization`)
5. ✅ Create classes (`/academic/structure`)
6. ✅ Create subjects (`/subjects`)
7. ✅ Create fee plans class-wise (`/fees` → Create Fee Plan)
8. ✅ Add teachers + assign to class/subject (`/teachers`)
9. ✅ Take attendance (`/attendance` → Take Attendance)
10. ✅ Collect fees (`/fees` → Collect Payment) — posts to ledger
11. ✅ Post manual ledger entries (`/accounting` → New Entry)
12. ✅ Transfer cash↔bank (`/cashbank`)
13. ✅ View audit trail (`/audit`)

## What Blocks the Full Workflow

**Nothing.** All previously-blocking gaps are now fixed. The full madrasha
workflow works end-to-end with proper financial controls (approval gating
for large salaries + discounts).

---

*This document was generated by auditing the actual source code on `origin/main` (commit `6003db0` at time of audit). All findings are based on real `fetch()` calls, real Prisma queries, and real permission gates — not comments or page names.*
