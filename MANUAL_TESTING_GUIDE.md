# MadrashaOS — Manual Testing Playbook

> **Purpose:** A complete checklist to manually verify every feature works
> end-to-end with no business-logic errors. Each workflow lists the steps,
> the expected result, and what to check.

> **How to use:** Start from Workflow 1 and go in order. Each workflow
> builds on the previous one (e.g. you need students before you can take
> attendance). Check the ✅ box when verified.

> **Prerequisites:**
> ```bash
> cd MadrashaOS/app
> git pull origin main
> bun run db:push        # sync schema
> bun run db:seed        # seed demo data
> bun run dev
> ```
> Login as `admin@madrashaos.org` / `password123`

---

## Quick Reference — All 23 Features

| # | Feature | Page | Status |
|---|---------|------|--------|
| 1 | Authentication | `/login` | ✅ |
| 2 | Organization Profile | `/organization` | ✅ |
| 3 | RBAC (Roles & Permissions) | `/rbac` | ✅ |
| 4 | Employees + Designation + Role | `/employees` | ✅ |
| 5 | Teachers + Assignment | `/teachers` | ✅ |
| 6 | Students | `/students` | ✅ |
| 7 | Guardians | `/guardians` | ✅ |
| 8 | Admissions (Kanban) | `/admission` | ✅ |
| 9 | Classes & Sections | `/academic/structure` | ✅ |
| 10 | Subjects | `/subjects` | ✅ |
| 11 | Fee Plans (Class-wise) | `/fees` | ✅ |
| 12 | Fee Collection | `/fees` | ✅ |
| 13 | Hostel + Hostel Fee | `/hostel` | ✅ |
| 14 | Attendance | `/attendance` | ✅ |
| 15 | Exams & Marks | `/exams` | ✅ |
| 16 | Results | `/results` | ✅ |
| 17 | Accounting (Ledger + Accounts) | `/accounting` | ✅ |
| 18 | Cash & Bank Transfers | `/cashbank` | ✅ |
| 19 | Payroll (Salary Payment) | `/employees` | ✅ |
| 20 | Inventory + Sell to Student | `/inventory` | ✅ |
| 21 | Library (Issue/Return + Fines) | `/library` | ✅ |
| 22 | Donations + Zakat | `/donations`, `/zakat` | ✅ |
| 23 | Notices + Documents + Audit + Backup | `/notices`, `/audit`, `/backup` | ✅ |

---

## Master Flow Diagram

```
                         ┌─────────────┐
                         │  1. Login    │
                         │  (admin)     │
                         └──────┬───────┘
                                │
                   ┌────────────▼────────────┐
                   │  2. Setup Organization   │
                   │  Profile + Branches      │
                   └────────────┬────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                  ▼
    ┌─────────────────┐ ┌──────────────┐ ┌────────────────┐
    │ 3. RBAC Matrix   │ │ 4. Employees │ │ 9. Classes +   │
    │ (tune perms)     │ │ + Role       │ │ 10. Subjects   │
    └─────────────────┘ └──────┬───────┘ └────────┬───────┘
                               │                   │
                    ┌──────────▼──────────┐        │
                    │ 5. Teachers         │        │
                    │ (promote employee)  │        │
                    │ + Assign to class   │◄───────┘
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                 ▼
    ┌────────────────┐ ┌──────────────┐ ┌──────────────┐
    │ 6. Students    │ │ 7. Guardians │ │ 8. Admissions│
    │ + Fee Plans    │ │              │ │ (Kanban)     │
    └───────┬────────┘ └──────────────┘ └──────────────┘
            │
    ┌───────▼──────────────────────────────────┐
    │ 11. Fee Plans (class-wise)               │
    │     ├─ 13. Hostel allocation → hostel fee │
    │     └─ 12. Collect fee (→ ledger)        │
    └───────┬──────────────────────────────────┘
            │
    ┌───────▼────────┐    ┌───────────────────┐
    │ 14. Attendance │    │ 15. Exams + Marks │
    └───────┬────────┘    └────────┬──────────┘
            │                      │
            │             ┌────────▼──────────┐
            │             │ 16. Results        │
            │             │ (generate + view)  │
            │             └────────────────────┘
            │
    ┌───────▼────────────────────────────────────────┐
    │  FINANCE LOOP (monthly):                       │
    │  17. Accounting (accounts + ledger entries)    │
    │  18. Cash & Bank transfers                     │
    │  19. Pay salary (→ ledger + payslip)           │
    │  20. Inventory sell to student (cash/credit)   │
    │  21. Library issue/return + fines → fees       │
    │  22. Donations + Zakat                         │
    └───────┬────────────────────────────────────────┘
            │
    ┌───────▼──────────────────────────┐
    │  23. Communication + Admin      │
    │  Notices, Documents, Audit,     │
    │  Backup, Security, Reports       │
    └──────────────────────────────────┘
```

---

## Workflow 1: Authentication & Login

**Goal:** Verify login works for all 8 roles.

### Steps
- [ ] Go to `/login`
- [ ] Enter `admin@madrashaos.org` / `password123`
- [ ] Click **Sign In**
- [ ] ✅ **Expected:** Redirects to `/dashboard/authority`
- [ ] ✅ Check: top bar shows "Administrator Karim"
- [ ] ✅ Check: side nav shows menu items (Academic Structure, Subjects, Attendance, Fees, Accounting, etc.)

### Test each role
- [ ] `principal@madrashaos.org` → dashboard/authority ✅
- [ ] `accounts@madrashaos.org` → dashboard/accountant ✅
- [ ] `bilal@madrashaos.org` (teacher) → dashboard/teacher ✅
- [ ] `store@madrashaos.org` (storekeeper) → dashboard/storekeeper ✅
- [ ] Wrong password → "Invalid credentials" error ✅

---

## Workflow 2: Organization Profile Setup

**Goal:** Verify the madrasha profile can be viewed and edited.

**Page:** `/organization`

### Steps
- [ ] Go to **Organization** (Foundation group in nav)
- [ ] ✅ Check: organization name "Darul Uloom Madrasha" + branches listed (Dhaka, Chittagong, Sylhet)
- [ ] Click **Edit** (if available) or check the form
- [ ] Change the phone number → save
- [ ] ✅ **Expected:** Toast "Organization updated" + phone field shows new value
- [ ] Go to **Organization → Modules** (`/organization/modules`)
- [ ] ✅ Check: module toggle list shows

---

## Workflow 3: RBAC — Roles & Permissions Matrix

**Goal:** Verify the permission matrix works and roles have correct permissions.

**Page:** `/rbac`

### Steps
- [ ] Go to **Roles & Permissions** (Foundation group)
- [ ] ✅ Check: 8 roles listed (Super Admin, Authority, Administrator, Accountant, Teacher, Storekeeper, Guardian, Student)
- [ ] Click on the **Accountant** role
- [ ] ✅ Check: permission matrix shows checked/unchecked permissions
- [ ] Toggle a permission (e.g. enable `fees.payment.create`) → **Save**
- [ ] ✅ **Expected:** Toast "Permissions updated"
- [ ] Log out → log in as `accounts@madrashaos.org` → check the Fees nav item appears/disappears accordingly

---

## Workflow 4: Employee Setup (Designation + Role)

**Goal:** Create an employee with a designation + permission role, verify they can log in.

**Page:** `/employees`

### Pre-check
- [ ] ✅ Nav shows **"Employees"** (not "Teachers" — was a duplicate label bug, now fixed)

### Steps
- [ ] Go to **Employees**
- [ ] Click **Add Employee**
- [ ] Fill: Name = "Test Accountant", Designation = **dropdown** → select "Accountant"
- [ ] ✅ Check: Designation is a dropdown (14 predefined options), NOT free text
- [ ] Permission Role = **dropdown** → select "accountant"
- [ ] ✅ Check: Role is a dropdown (5 options: administrator, authority, accountant, storekeeper, teacher)
- [ ] Phone = "+8801711000200", Email = "testacct@madrashaos.org", Salary = 15000
- [ ] Click **Add Employee**
- [ ] ✅ **Expected:** Toast "Employee added — Test Accountant — Accountant (role: accountant)"
- [ ] ✅ Check: the new employee appears in the table with a generated employee code
- [ ] ✅ Check: a temp password was returned (shown in the response)

### Verify login
- [ ] Log out → log in as `testacct@madrashaos.org` with the temp password
- [ ] ✅ **Expected:** Login succeeds → dashboard loads
- [ ] ✅ Check: nav shows finance-related items (Fees, Accounting) but NOT academic-edit items

---

## Workflow 5: Teacher Setup + Assignment

**Goal:** Promote an employee to a teacher, assign them to a class + subject.

**Pages:** `/teachers`, `/subjects`, `/academic/structure`

### Prerequisites
- [ ] Workflow 4 done (have an employee)
- [ ] Workflow 9 done (have a class)
- [ ] Workflow 10 done (have a subject)

### Steps — Add Teacher
- [ ] Go to **Teachers**
- [ ] Click **Add Teacher**
- [ ] Select the employee you created in Workflow 4 from the dropdown
- [ ] Employee code auto-fills (e.g. "T-001")
- [ ] Designation = "Senior Teacher", Specialization = "Quran"
- [ ] Click **Add Teacher**
- [ ] ✅ **Expected:** Toast "Teacher added"
- [ ] ✅ Check: Staff Directory now shows 2 entries (the seeded Teacher Bilal + your new teacher)

### Steps — Assign Teacher
- [ ] Click **Assign Teacher**
- [ ] ✅ Check: Teacher dropdown shows ONLY real Teacher records (not employees — was a bug, now fixed)
- [ ] Select your teacher
- [ ] Select a class (e.g. Class 1)
- [ ] Select a subject (e.g. Quran & Tajweed)
- [ ] Click **Create Assignment**
- [ ] ✅ **Expected:** Toast "Assignment created"
- [ ] ✅ Check: the assignment appears in the Teacher Assignments table

### Error case
- [ ] Try to create the SAME assignment again (same teacher + class + subject)
- [ ] ✅ **Expected:** Inline error "already assigned to this class+section+subject"

---

## Workflow 6: Student Setup

**Goal:** Create a student and verify their profile.

**Pages:** `/students`, `/students/new`

### Steps
- [ ] Go to **Students**
- [ ] Click **Add Student** (or "New Student")
- [ ] Fill: Name = "Test Student", Bangla Name = "টেস্ট শিক্ষার্থী", Class = "Class 1", Section = "A", Roll = 99, Gender = Male, DOB = 2015-01-01, Guardian Name = "Test Guardian", Guardian Phone = "+8801711000300"
- [ ] Click **Create Student**
- [ ] ✅ **Expected:** Toast "Student created" + student appears in the list
- [ ] Click on the student's name to open their profile
- [ ] ✅ Check: profile shows name, class, section, guardian info
- [ ] ✅ Check: tabs for history, documents, promotion are visible

---

## Workflow 7: Guardian Setup

**Goal:** Create a guardian and link them to a student.

**Page:** `/guardians`

### Steps
- [ ] Go to **Guardians**
- [ ] Click **Add Guardian**
- [ ] Fill: Name = "Test Guardian", Phone = "+8801711000300", Email = "guardian@test.com", Occupation = "Business"
- [ ] Click **Add Guardian**
- [ ] ✅ **Expected:** Toast "Guardian added" + guardian appears in the list

---

## Workflow 8: Admissions (Kanban)

**Goal:** Submit a new admission application and move it through the pipeline.

**Page:** `/admission`

### Steps
- [ ] Go to **Admissions**
- [ ] Click **New Application**
- [ ] ✅ Check: dialog opens with fields (Applicant Name, Guardian Name, Phone, Email, Desired Class)
- [ ] Fill the form → select a desired class → **Submit Application**
- [ ] ✅ **Expected:** Toast "Application submitted" with a reference ID
- [ ] ✅ Check: the new card appears in the "Applied" column
- [ ] Drag the card to "Approved"
- [ ] ✅ **Expected:** Toast "Application approved"
- [ ] Drag the card to "Registered"
- [ ] ✅ **Expected:** Toast "Student registered — fee plan created"

---

## Workflow 9: Classes & Sections

**Goal:** Create a class with sections.

**Page:** `/academic/structure`

### Steps
- [ ] Go to **Academic Structure** (Academic group — labeled "Academic Structure", NOT "Attendance" — was a duplicate, now fixed)
- [ ] Click **Add Class**
- [ ] Fill: Name = "Class 10", Bangla Name = "দশম শ্রেণী", Level = 10, Sections = "A, B"
- [ ] Click **Create Class**
- [ ] ✅ **Expected:** Toast "Class created" + card shows "Class 10" with 2 sections (A, B)

---

## Workflow 10: Subjects

**Goal:** Create a subject.

**Page:** `/subjects`

### Steps
- [ ] Go to **Subjects** (Academic group)
- [ ] Click **Add Subject**
- [ ] Fill: Code = "HAD", Name = "Hadith", Bangla Name = "হাদিস", Category = "Quranic", check "Quranic subject", Full Marks = 100, Pass Marks = 33
- [ ] Click **Create Subject**
- [ ] ✅ **Expected:** Toast "Subject created" + subject appears in the table
- [ ] ✅ Check: the table shows Code, Name, Category, Marks, Status

---

## Workflow 11: Fee Plans (Class-wise)

**Goal:** Create a class-wise fee plan with components (tuition + hostel + bus).

**Page:** `/fees`

### Prerequisites
- [ ] Workflow 6 done (have students in a class)
- [ ] Workflow 13 done (have hostel allocations — to test the conditional hostel fee)

### Steps
- [ ] Go to **Fees**
- [ ] ✅ Check: "Create Fee Plan" button is visible (gated by `fees.plan.edit`)
- [ ] Click **Create Fee Plan**
- [ ] Select a class (e.g. Class 1)
- [ ] Enter: Tuition = 500, Hostel = 800, Bus = 200, Months = 12, Start Month = January
- [ ] ✅ Check: Summary shows "Monthly per student: ৳1,500" + installment preview
- [ ] ✅ Check: Tip text says "Hostel fee: Only applied to students with an active hostel bed allocation"
- [ ] Click **Create for Class 1**
- [ ] ✅ **Expected:** Toast shows the breakdown: "N plan(s) for Class 1 · X boarder(s) ৳1,500/mo, Y day scholar(s) ৳700/mo"
- [ ] ✅ Check: the Fees table now shows outstanding balances for students in Class 1
- [ ] ✅ Check: day scholars have ৳700/mo (no hostel), boarders have ৳1,500/mo (with hostel)

---

## Workflow 12: Fee Collection

**Goal:** Collect a fee payment and verify it posts to the ledger.

**Page:** `/fees`

### Prerequisites
- [ ] Workflow 11 done (have fee plans + outstanding installments)

### Steps
- [ ] Go to **Fees**
- [ ] ✅ Check: "Collect Payment" button is visible
- [ ] Click **Collect Payment** (header button)
- [ ] Step 1: Select a student who has outstanding fees
- [ ] ✅ Check: outstanding installments are listed
- [ ] Step 2: Select an installment → amount auto-fills → select method (Cash) → select account (Cash on Hand)
- [ ] Step 3: Receipt preview → click **Confirm**
- [ ] ✅ **Expected:** Toast "Payment collected — Receipt RCP-2026-XXXX"
- [ ] ✅ Check: the student's outstanding decreases
- [ ] Go to **Accounting** → check a new LedgerEntry exists (debit Cash, credit Fee Income)

### Per-row collect
- [ ] Go back to Fees → click the per-row **Collect** button on another student
- [ ] ✅ Check: same dialog opens with that student pre-selected

---

## Workflow 13: Hostel + Hostel Fee

**Goal:** Allocate a bed to a student, verify the hostel fee is conditional.

**Page:** `/hostel`

### Steps
- [ ] Go to **Hostel** (Operations group)
- [ ] Create a room (if none exists): Room Number = "101", Building = "Block A", Capacity = 4
- [ ] Create beds in that room (if none exists)
- [ ] Allocate a bed to a student: select student + set monthly_fee = 1000
- [ ] ✅ **Expected:** Toast "Bed allocated"
- [ ] Now go to **Fees** → **Create Fee Plan** for that student's class
- [ ] Set Hostel = 800 (different from the bed's 1000)
- [ ] Submit
- [ ] ✅ **Expected:** The allocated student pays ৳1,000/mo hostel (uses the bed's monthly_fee, NOT the 800 from the form)
- [ ] ✅ **Expected:** Non-allocated students in the same class pay ৳0 hostel (day scholars)

---

## Workflow 14: Attendance

**Goal:** Take attendance for a class.

**Pages:** `/attendance`, `/attendance/take`

### Prerequisites
- [ ] Workflow 6 done (have students in a class)

### Steps
- [ ] Go to **Attendance** (Academic group — labeled "Attendance")
- [ ] ✅ Check: "Take Attendance" button is visible (gated by `attendance.take`)
- [ ] Click **Take Attendance**
- [ ] ✅ **Expected:** Redirects to `/attendance/take`
- [ ] Select a class + section
- [ ] ✅ Check: student list loads with present/absent toggle buttons
- [ ] Toggle 1-2 students to "Absent"
- [ ] Click **Save** / **Submit**
- [ ] ✅ **Expected:** Toast "Attendance saved" or similar
- [ ] Go back to `/attendance`
- [ ] ✅ Check: the new session appears in the list with present/absent counts

---

## Workflow 15: Exams & Marks

**Goal:** Create an exam and enter marks.

**Pages:** `/exams`, `/exams/[id]/marks`

### Prerequisites
- [ ] Workflow 9 (class), Workflow 10 (subject), Workflow 6 (students)

### Steps
- [ ] Go to **Examinations** (Academic group)
- [ ] Click **Create Exam** (if available)
- [ ] Fill: Name = "Mid-term 2026", Class = Class 1, Subject = Quran, Full Marks = 100, Pass Marks = 33, Date = today
- [ ] Click **Create**
- [ ] ✅ **Expected:** Exam appears in the list
- [ ] Click on the exam → **Enter Marks**
- [ ] ✅ Check: student list loads with mark input fields
- [ ] Enter marks for each student (e.g. 80, 45, 30)
- [ ] Click **Save Marks**
- [ ] ✅ **Expected:** Toast "Marks saved"
- [ ] Click **Publish** (if available)
- [ ] ✅ **Expected:** Toast "Exam published"

---

## Workflow 16: Results

**Goal:** Generate and view results.

**Page:** `/results`

### Prerequisites
- [ ] Workflow 15 done (exam published with marks)

### Steps
- [ ] Go to **Results** (Academic group)
- [ ] Click **Generate Results** (if available)
- [ ] Select the published exam
- [ ] Click **Generate**
- [ ] ✅ **Expected:** Toast "Results generated"
- [ ] ✅ Check: results table shows student names, marks, GPA, pass/fail
- [ ] Log in as a guardian → go to Results → ✅ Check: only their own child's results show

---

## Workflow 17: Accounting (Accounts + Ledger)

**Goal:** Create accounts and post a manual ledger entry.

**Page:** `/accounting`

### Steps — Add Account
- [ ] Go to **Accounting** (Finance group — labeled "Accounting")
- [ ] ✅ Check: "Add Account" + "New Entry" buttons are visible
- [ ] Scroll down to the **Chart of Accounts** section
- [ ] Click **Add Account**
- [ ] Fill: Code = "5001", Name = "Salary Expense", Type = "Expense"
- [ ] Click **Create Account**
- [ ] ✅ **Expected:** Toast "Account created" + appears in the Chart of Accounts table

### Steps — New Ledger Entry
- [ ] Click **New Entry**
- [ ] Select Debit Account = "Salary Expense", Credit Account = "Cash on Hand"
- [ ] Enter Debit Amount = 5000, Credit Amount = 5000 (must be equal)
- [ ] Narration = "Test entry"
- [ ] Click **Create Entry**
- [ ] ✅ **Expected:** Toast with voucher number "JV-2026-XXX"
- [ ] ✅ Check: entry appears in the ledger table with running balance

### Error case
- [ ] Try to submit with debit ≠ credit
- [ ] ✅ **Expected:** Inline error "Debits must equal credits"

---

## Workflow 18: Cash & Bank Transfers

**Goal:** Transfer money between Cash and Bank accounts.

**Page:** `/cashbank`

### Prerequisites
- [ ] Workflow 17 done (have Cash + Bank accounts)

### Steps
- [ ] Go to **Cash & Bank** (Finance group — labeled "Cash & Bank", NOT "Accounting")
- [ ] Click **New Transfer**
- [ ] From Account = "Cash on Hand", To Account = "Bank — Sonali", Amount = 10000
- [ ] Click **Transfer**
- [ ] ✅ **Expected:** Toast "Transfer completed"
- [ ] Go to **Accounting** → ✅ Check: a new LedgerEntry exists (debit Bank, credit Cash)

---

## Workflow 19: Payroll (Salary Payment)

**Goal:** Pay a salary to an employee/teacher.

**Page:** `/employees`

### Prerequisites
- [ ] Workflow 4 done (have an employee with a salary)
- [ ] Workflow 17 done (have a Salary Expense account + Cash account)

### Steps — Below threshold (no approval needed)
- [ ] Go to **Employees**
- [ ] Find an employee with salary ≤ ৳20,000
- [ ] Click **Pay Salary** on that row
- [ ] ✅ Check: dialog opens with month/year (current), amount pre-filled from stored salary
- [ ] Select Payment Account = "Cash on Hand"
- [ ] Click **Pay Salary**
- [ ] ✅ **Expected:** Toast "Salary paid — [name] — [month] [year] — ৳X (PAY-2026-XXXX)"
- [ ] Go to **Accounting** → ✅ Check: new LedgerEntry with source_type="salary" (debit Salary Expense, credit Cash)

### Steps — Above threshold (approval required)
- [ ] Find/create an employee with salary > ৳20,000 (e.g. ৳25,000)
- [ ] Click **Pay Salary** → set amount to 25000 → **Pay Salary**
- [ ] ✅ **Expected:** Error "Approval required for this salary (amount ৳25,000 exceeds threshold ৳20,000). A new approval request has been created."
- [ ] ✅ Check: returns 202 status (not 200)
- [ ] Go to **Dashboard** → ✅ Check: pending approval appears
- [ ] Log in as `principal@madrashaos.org` → approve the request
- [ ] Log back in as admin → retry the salary payment
- [ ] ✅ **Expected:** Now succeeds (approval exists)
- [ ] Try to pay the SAME salary again for the same month
- [ ] ✅ **Expected:** Error "Salary already paid for [name] for [month] [year]"

---

## Workflow 20: Inventory + Sell to Student

**Goal:** Sell an inventory item to a student (cash + credit modes).

**Page:** `/inventory`

### Steps — Add Item (if none)
- [ ] Go to **Inventory** (Operations group — labeled "Inventory")
- [ ] Click **Add Item**
- [ ] Fill: Code = "BK-100", Name = "Quran Workbook", Category = "Book", Qty = 50, Unit Cost = 120
- [ ] Click **Add Item**
- [ ] ✅ **Expected:** Item appears in the table with 50 in stock

### Steps — Sell (Cash mode)
- [ ] Click **Sell to Student**
- [ ] ✅ Check: dialog opens with student + item dropdowns
- [ ] Select a student + the Quran Workbook item + qty = 2
- [ ] ✅ Check: unit price auto-fills from item cost (120), total = 240
- [ ] Payment Mode = "Cash" → select Cash on Hand account
- [ ] Click **Record Sale**
- [ ] ✅ **Expected:** Toast "Sale recorded — Quran Workbook × 2 → [student] · ৳240 cash (SALE-2026-XXXX)"
- [ ] ✅ Check: item stock decreased by 2 (now 48)
- [ ] Go to **Accounting** → ✅ Check: LedgerEntry with source_type="inventory_sale" (debit Cash, credit Sale Income)

### Steps — Sell (Credit mode)
- [ ] Click **Sell to Student** again
- [ ] Select a different student + same item + qty = 1
- [ ] Payment Mode = "Credit"
- [ ] ✅ Check: note says "Creates a fee installment for this student. It will appear on the Fees page."
- [ ] Click **Record Sale**
- [ ] ✅ **Expected:** Toast "Sale recorded · ৳120 added to fees"
- [ ] Go to **Fees** → ✅ Check: that student now has an extra ৳120 outstanding (installment labeled "Sale: Quran Workbook × 1")

---

## Workflow 21: Library (Issue/Return + Fines)

**Goal:** Issue a book, return it with a fine, verify the fine appears on fees.

**Page:** `/library`

### Steps — Add Book
- [ ] Go to **Library** (Operations group — labeled "Library")
- [ ] Click **Add Book**
- [ ] Fill: Accession No = "BK-001", Title = "Sahih al-Bukhari", Author = "Imam Bukhari", Total Copies = 2
- [ ] Click **Add Book**
- [ ] ✅ **Expected:** Book appears in the table with 2 available copies

### Steps — Issue
- [ ] Click **Issue Book**
- [ ] Select the book + a student + due date (2 weeks from now)
- [ ] Click **Issue Book**
- [ ] ✅ **Expected:** Toast "Book issued"
- [ ] ✅ Check: available copies decreased to 1
- [ ] ✅ **IMPORTANT:** Note the issue_id from the toast/response (you'll need it for return)

### Steps — Return with Fine
- [ ] Click **Return Book**
- [ ] Paste the issue_id
- [ ] Fine Amount = 50
- [ ] ✅ Check: note says "Fine of ৳50 will be added to the student's outstanding fees"
- [ ] Click **Return Book**
- [ ] ✅ **Expected:** Toast "Book returned · Fine: ৳50 added to student fees"
- [ ] ✅ Check: available copies back to 2
- [ ] Go to **Fees** → ✅ Check: that student has a new ৳50 installment labeled "Library fine: Sahih al-Bukhari"
- [ ] Go to **Accounting** → ✅ Check: LedgerEntry with source_type="library_fine" (debit AR, credit Fine Income)

---

## Workflow 22: Donations + Zakat

**Goal:** Record a donation and a zakat transaction.

**Pages:** `/donations`, `/zakat`

### Donations
- [ ] Go to **Donations** (Finance group — labeled "Donations")
- [ ] ✅ Check: donation list loads
- [ ] (Public form is at the public website route — if visible, test it)

### Zakat
- [ ] Go to **Zakat** (Finance group — labeled "Zakat")
- [ ] Click **Receive Zakat** (if available)
- [ ] Enter donor name + amount = 5000 + method = Cash
- [ ] Click **Receive**
- [ ] ✅ **Expected:** Toast "Zakat received"
- [ ] Click **Distribute Zakat** (if available)
- [ ] Enter recipient + amount = 2000
- [ ] Click **Distribute**
- [ ] ✅ **Expected:** Toast "Zakat distributed"
- [ ] Go to **Accounting** → ✅ Check: zakat ledger entries exist with fund="zakat"

---

## Workflow 23: Notices + Documents + Audit + Backup

**Pages:** `/notices`, `/documents`, `/audit`, `/backup`, `/security`, `/reports`

### Notices
- [ ] Go to **Notices** (Communication group — labeled "Notices")
- [ ] Click **Compose Notice** (or New Notice)
- [ ] Fill: Title = "Test Notice", Body = "This is a test", Audience = "All"
- [ ] Click **Send**
- [ ] ✅ **Expected:** Toast "Notice sent"
- [ ] ✅ Check: notice appears in the list

### Documents
- [ ] Go to **Documents** (Communication group — labeled "Documents", NOT "Notices")
- [ ] ✅ Check: document list loads

### Audit Trail
- [ ] Go to **Audit Trail** (Foundation group — labeled "Audit Trail")
- [ ] ✅ Check: audit log shows entries from the operations you just performed (payroll.pay, inventory.sell, library fines, fee collection, etc.)
- [ ] ✅ Check: each entry has actor, action, entity_type, timestamp

### Backup
- [ ] Go to **Backup** (Foundation group — labeled "Backup", NOT "Settings")
- [ ] Click **Run Backup** (if available)
- [ ] ✅ **Expected:** Toast "Backup started"

### Security
- [ ] Go to **Security** (Foundation group — labeled "Security", NOT "Settings")
- [ ] ✅ Check: security policy settings load

### Reports
- [ ] Go to **Reports** (Platform group)
- [ ] ✅ Check: report list loads

---

## Final Verification Checklist

After completing all 23 workflows, verify these cross-cutting concerns:

### Nav Labels (no duplicates)
- [ ] ✅ Every nav item has a unique label (no two "Teachers", no two "Inventory", etc.)
- [ ] ✅ "Employees" ≠ "Teachers"
- [ ] ✅ "Security" ≠ "Backup" ≠ "Settings"
- [ ] ✅ "Cash & Bank" ≠ "Accounting"
- [ ] ✅ "Scholarships" ≠ "Donations" ≠ "Fees"
- [ ] ✅ "Purchases" ≠ "Suppliers" ≠ "Inventory" ≠ "Transport"
- [ ] ✅ "Food & Meals" ≠ "Hostel"
- [ ] ✅ "Documents" ≠ "Notices"

### Financial Integrity (Double-Entry)
- [ ] ✅ Every fee collection created a LedgerEntry (debit Cash, credit Fee Income)
- [ ] ✅ Every salary payment created a LedgerEntry (debit Salary Expense, credit Cash)
- [ ] ✅ Every inventory sale created a LedgerEntry (debit Cash/AR, credit Sale Income)
- [ ] ✅ Every library fine created a LedgerEntry (debit AR, credit Fine Income)
- [ ] ✅ Every cash/bank transfer created a LedgerEntry (debit dest, credit source)
- [ ] ✅ In every case, debit amount === credit amount

### Permission Gates
- [ ] ✅ "Collect Payment" button hidden for roles without `fees.payment.create`
- [ ] ✅ "New Entry" + "Add Account" hidden for roles without `accounting.ledger.post`
- [ ] ✅ "Take Attendance" hidden for roles without `attendance.take`
- [ ] ✅ "Pay Salary" hidden for roles without `accounting.ledger.post`
- [ ] ✅ "Sell to Student" hidden for roles without `inventory.sale`

### Approval Gates
- [ ] ✅ Salary > ৳20,000 requires approval (returns 202, creates pending Approval)
- [ ] ✅ Fee discount > ৳5,000 requires approval
- [ ] ✅ D16: requester cannot approve their own request (403)

### Audit Trail
- [ ] ✅ Every mutating operation (create/update/delete/pay/sell/issue) has an AuditLog entry
- [ ] ✅ Audit entries show the correct actor_user_id, action, entity_type

---

## Bug Report Template

If you find a bug, note:

```
### Bug: [short title]
**Workflow:** #X (which workflow)
**Page:** /path
**Steps:** 1. ... 2. ... 3. ...
**Expected:** ...
**Actual:** ...
**Console errors:** (if any)
**API response:** (if relevant)
```

---

*This playbook covers all 23 features across 44 pages and 115 API routes.
Every business-logic path is testable via these workflows.*
