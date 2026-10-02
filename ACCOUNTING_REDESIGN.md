# MadrashaOS — Accounting System Redesign Plan

> **Goal:** Make the accounting system usable by non-accountants. Replace
> the confusing "debit/credit" journal entry with purpose-driven transaction
> screens. Add donor management, fund separation, and clear reporting.

---

## Current State Audit (What Exists vs What's Missing)

### ✅ Already Done

| Feature | Status | Notes |
|---------|--------|-------|
| Student Fee Payment | ✅ Works | `CollectPaymentDialog` — 3-step flow, posts to ledger |
| Fee Plan Creation | ✅ Works | Class-wise bulk + per-student, hostel fee conditional |
| Salary Payment (Payroll) | ✅ Works | `PaySalaryDialog` on /employees, approval-gated > ৳20k |
| Chart of Accounts | ✅ Works | `Add Account` dialog + list on /accounting |
| Manual Ledger Entry | ✅ Works | `LedgerEntryForm` — but uses confusing debit/credit terms |
| Cash & Bank Transfer | ✅ Works | /cashbank page, posts to ledger |
| Zakat Receive/Distribute | ✅ Works (mock UI) | API exists, page uses mock data |
| Donations API | ✅ Works | POST creates donation + ledger entry, supports general/zakat/sadaqah |
| Inventory Sale to Student | ✅ Works | Cash + credit modes, posts to ledger |
| Library Fines → Fees | ✅ Works | Auto-creates FeeInstallment + ledger entry |
| FundType enum | ✅ Exists | `general` | `zakat` |
| Audit Trail | ✅ Works | All mutations logged |

### ❌ Missing or Broken

| Feature | Status | What's Needed |
|---------|--------|----------------|
| **Donor Management** | ❌ Missing | No Donor model — donations store `donor_name` as free text, no donor list, no pledge tracking |
| **Donor Pledges** | ❌ Missing | No pledge model — can't track "promised ৳50,000, paid ৳30,000" |
| **Recurring Donations** | ❌ Missing | No monthly/yearly recurring donation support |
| **Donations Page (UI)** | ❌ Mock | Uses inline mock data (`INITIAL_DONATIONS`), doesn't call the real API |
| **Zakat Page (UI)** | ❌ Mock | Uses mock data + fixtures, doesn't call the real API |
| **Simple Transaction UI** | ❌ Missing | No "Receive Money" / "Pay Money" / "Transfer" buttons — only the confusing debit/credit form |
| **Monthly/Yearly Report** | ❌ Mock | /reports page uses mock data, no real financial summary |
| **Fund Separation (UI)** | ❌ Partial | FundType exists in DB, but the UI doesn't clearly separate zakat vs general totals |
| **Employee Advance** | ❌ Missing | No advance payment model — salary payment exists but no "advance against salary" |
| **Donation Categories** | ❌ Missing | No "zakat" vs "non-zakat" category filter on the donations page |
| **Date-wise Accounting View** | ❌ Missing | No date-range filter on the ledger table (only status filter) |

---

## Step-by-Step Implementation Plan

### Phase 1: Simplify the Accounting UI (Remove "Debit/Credit" Jargon)

**Problem:** The current "New Entry" dialog asks users to pick a "Debit Account"
and "Credit Account" — terms non-accountants don't understand.

**Solution:** Replace the single "New Entry" dialog with three purpose-driven
buttons that internally handle the double-entry logic:

#### Step 1.1: Add "Receive Money" Button
- **What it does:** Records money coming IN (donations, other income, etc.)
- **UI:** "Receive Money" dialog with:
  - Amount
  - Received from (free text or select donor/employee)
  - Received into (Cash/Bank account dropdown — asset accounts only)
  - Category (dropdown: Donation, Fee Income, Sale Income, Other Income)
  - Date + Notes
- **Behind the scenes:** Creates a LedgerEntry (debit Cash/Bank, credit the selected income account)
- **No debit/credit terms shown to the user**

#### Step 1.2: Add "Pay Money" Button
- **What it does:** Records money going OUT (expenses, bills, etc.)
- **UI:** "Pay Money" dialog with:
  - Amount
  - Paid to (free text)
  - Paid from (Cash/Bank account dropdown — asset accounts only)
  - Category (dropdown: Salary, Rent, Utilities, Supplies, Other Expense)
  - Date + Notes
- **Behind the scenes:** Creates a LedgerEntry (debit the expense account, credit Cash/Bank)

#### Step 1.3: Add "Transfer" Button (already exists on /cashbank)
- **What it does:** Moves money between Cash and Bank accounts
- **No change needed** — just link to /cashbank or add inline

#### Step 1.4: Keep "Manual Entry" as Advanced (hidden by default)
- Rename to "Advanced Journal Entry"
- Only visible to users with `accounting.ledger.post` permission
- Keep the debit/credit form for accountants who need it

---

### Phase 2: Donor Management

**Problem:** Donations store `donor_name` as free text. There's no donor list,
no pledge tracking, no recurring donation support.

#### Step 2.1: Create `Donor` Model
```
model Donor {
  id              String   @id @default(uuid())
  organization_id String
  name            String
  name_bn         String?
  phone           String?
  email           String?
  address         String?
  donor_type      String   // regular | one_time | zakat_donor | sadaqah_donor
  total_donated   Decimal  @default(0)  // running total
  total_pledged   Decimal  @default(0)  // total promised
  notes           String?
  created_at      DateTime
  updated_at      DateTime
  donations       Donation[]
  pledges         DonorPledge[]
}
```

#### Step 2.2: Create `DonorPledge` Model
```
model DonorPledge {
  id              String   @id @default(uuid())
  organization_id String
  donor_id        String
  amount          Decimal  // total pledged amount
  pledge_type     String   // zakat | general | sadaqah
  frequency       String   // one_time | monthly | yearly
  start_date      Date
  end_date        Date?    // null = ongoing
  amount_received Decimal  @default(0)  // running total received
  status          String   @default("active") // active | fulfilled | cancelled
  next_reminder   Date?    // next reminder date
  notes           String?
  donor           Donor    @relation(...)
}
```

#### Step 2.3: Create Donor List Page (`/donors`)
- **Table:** Name, Phone, Type, Total Donated, Total Pledged, Balance
- **Search** by name or phone
- **Add Donor** button + dialog (name, phone, email, type)
- **View Donor** → shows donation history + pledges
- **Add Pledge** button (amount, type, frequency, start date)
- **Reminder badges** for pledges with upcoming/overdue reminders

#### Step 2.4: Wire Donations to Donors
- When recording a donation, if the donor's name matches an existing
  Donor record, link it. Otherwise, auto-create a Donor record.
- The donation's `donor_name` field is replaced by a `donor_id` FK.
- Update the donations page to show donor names from the Donor table.

---

### Phase 3: Donation Categories + Fund Separation

**Problem:** The donations page doesn't clearly separate zakat vs
non-zakat. There's no visual distinction of fund totals.

#### Step 3.1: Rewrite Donations Page (remove mock data)
- Fetch from `GET /api/v1/donations` (real API)
- **Filter tabs:** All | Zakat | Sadaqah | General
- **Summary cards at top:**
  - Total Zakat received (this year)
  - Total Sadaqah received (this year)
  - Total General donations (this year)
- **Add Donation** dialog:
  - Donor (search/select from Donor table, or "Anonymous")
  - Amount
  - Type: Zakat | Sadaqah | General (non-zakat)
  - Method: Cash | Bank | Mobile
  - Date + Notes
  - Posts to the correct fund account (zakat → zakat fund, others → general fund)

#### Step 3.2: Rewrite Zakat Page (remove mock data)
- Fetch real zakat transactions from the API
- **Two clear sections:**
  - **Zakat Received** (total + list of incoming transactions)
  - **Zakat Distributed** (total + list of outgoing transactions)
  - **Balance** = Received − Distributed (prominently displayed)
- **Receive Zakat** button (amount, donor, method, date)
- **Distribute Zakat** button (amount, recipient, purpose, date)
- **Fund isolation warning:** if trying to distribute more than the balance

#### Step 3.3: Non-Zakat Fund Dashboard
- On the main accounting page, add two summary cards:
  - **Zakat Fund Balance** (total received − total distributed)
  - **General Fund Balance** (total income − total expenses)
- These are clearly separated so the madrasha head can see at a glance
  how much zakat money is available vs general money.

---

### Phase 4: Employee Advance

**Problem:** No way to record an advance payment to an employee (e.g.
"took ৳5,000 advance against next month's salary").

#### Step 4.1: Add `EmployeeAdvance` Model
```
model EmployeeAdvance {
  id              String   @id @default(uuid())
  organization_id String
  employee_id     String   // Employee or Teacher
  staff_type      String   // 'employee' | 'teacher'
  amount          Decimal
  advance_date    Date
  reason          String?  // e.g. "Medical emergency"
  status          String   @default("pending") // pending | deducted | written_off
  deduction_month Int?     // which month's salary it was deducted from
  deduction_year  Int?
  notes           String?
  created_at      DateTime
  updated_at      DateTime
}
```

#### Step 4.2: Add "Give Advance" Button on /employees
- Dialog: Amount, Reason, Date
- Posts a LedgerEntry (debit Salary Advance asset account, credit Cash/Bank)
- Shows in the employee's profile as "Pending Advances"

#### Step 4.3: Auto-deduct from Salary
- When paying salary, check for pending advances
- Show: "This employee has ৳5,000 pending advance. Deduct from this salary?"
- If yes → deduct from net salary + mark advance as "deducted"
- The payslip shows: Gross − Advance = Net

---

### Phase 5: Clear Accounting Reports (for Meetings)

**Problem:** The reports page uses mock data. There's no real financial
summary that can be shown in a madrasha committee meeting.

#### Step 5.1: Create Monthly Summary Report
- **API:** `GET /api/v1/reports/monthly-summary?month=9&year=2026`
- **Returns:**
  ```
  {
    income: [
      { account: "Fee Income", amount: 45000 },
      { account: "Donations (General)", amount: 12000 },
      { account: "Zakat Received", amount: 30000 },
      { account: "Sale Income", amount: 5000 },
    ],
    expenses: [
      { account: "Salary Expense", amount: 60000 },
      { account: "Rent", amount: 15000 },
      { account: "Utilities", amount: 8000 },
      { account: "Supplies", amount: 3000 },
    ],
    summary: {
      total_income: 92000,
      total_expenses: 86000,
      net_surplus: 6000,
      zakat_balance: 25000,  // zakat received − distributed
      general_balance: 71000, // general fund balance
    }
  }
  ```

#### Step 5.2: Create Reports Page (real data)
- **Date selector:** Month + Year dropdown
- **Fund separation:** Two tabs — "General Fund" | "Zakat Fund"
- **Income section:** List of all income accounts + amounts (green)
- **Expense section:** List of all expense accounts + amounts (red)
- **Summary bar:** Total Income | Total Expenses | Net Surplus/Deficit
- **Print button** — for meetings
- **Zakat tab:** Zakat received (by donor) + Zakat distributed (by recipient) + balance

#### Step 5.3: Create Yearly Summary Report
- Same as monthly but for the full year
- Shows a 12-month trend (Jan–Dec) for income vs expenses
- Simple bar chart (if a charting library is available)

---

### Phase 6: Accounting Dashboard Widget

#### Step 6.1: Add "This Month's Summary" Widget on Dashboard
- Shows on the authority/admin dashboard
- Compact card with:
  - Income this month (green)
  - Expenses this month (red)
  - Net surplus/deficit
  - Zakat fund balance (separate)
- Clicking opens the full reports page

---

## Priority Order (What to Build First)

| Priority | Task | Why First |
|----------|------|-----------|
| **1** | Phase 1: Replace debit/credit with "Receive Money" / "Pay Money" | Removes the #1 confusion — users can't even make entries |
| **2** | Phase 3.3: Fund separation summary cards on accounting page | Users need to see zakat vs general at a glance |
| **3** | Phase 3.1: Rewrite donations page (real API + zakat/non-zakat filter) | Donations are currently mock — need real data |
| **4** | Phase 3.2: Rewrite zakat page (real API + clear balance) | Zakat management is mock — need real data |
| **5** | Phase 2.1-2.4: Donor model + donor list + pledge tracking | Needed for donor management + reminders |
| **6** | Phase 5.1-5.2: Monthly summary report (for meetings) | Needed for transparency + accountability |
| **7** | Phase 4.1-4.3: Employee advance | Nice-to-have — advance payments |
| **8** | Phase 6.1: Dashboard widget | Final polish |

---

## Design Principles (For Non-Accountant Users)

1. **Never show "debit" or "credit"** in the UI — use "Receive Money",
   "Pay Money", "Transfer" instead

2. **Always show the account name, not the code** — "Cash on Hand" not
   "1000"

3. **Use categories, not account types** — "Salary Expense" not
   "Expense account with code 5000"

4. **Separate zakat from everything else** — zakat money is sacred, must
   never be mixed with general funds

5. **Show running balances** — the user should always see "Cash: ৳45,000"
   after each transaction

6. **Date-wise filtering is essential** — for monthly meetings, the user
   needs to see "September 2026" transactions only

7. **Print-friendly reports** — the committee meeting needs a clean,
   printable summary

---

## File Change Summary (What Will Be Created/Modified)

### New Files
- `prisma/schema.prisma` — add Donor, DonorPledge, EmployeeAdvance models
- `src/app/(app)/donors/page.tsx` — donor list + pledges
- `src/app/api/v1/donors/route.ts` — donor CRUD
- `src/app/api/v1/donors/[id]/pledges/route.ts` — pledge CRUD
- `src/app/api/v1/employees/[id]/advance/route.ts` — advance CRUD
- `src/app/api/v1/reports/monthly-summary/route.ts` — monthly report API
- `src/components/finance/ReceiveMoneyDialog.tsx`
- `src/components/finance/PayMoneyDialog.tsx`
- `src/components/finance/EmployeeAdvanceDialog.tsx`

### Modified Files
- `src/app/(app)/accounting/page.tsx` — replace "New Entry" with 3 buttons + fund summary cards
- `src/app/(app)/donations/page.tsx` — rewrite with real API + filter tabs
- `src/app/(app)/zakat/page.tsx` — rewrite with real API + balance display
- `src/app/(app)/reports/page.tsx` — rewrite with real monthly/yearly summary
- `src/app/(app)/employees/page.tsx` — add "Give Advance" button
- `src/app/(app)/dashboard/authority/page.tsx` — add monthly summary widget
- `src/lib/nav/moduleTree.ts` — add "Donors" nav item
- `src/lib/i18n/messages.ts` — add nav keys for donors

---

*This document is a plan only — no code has been written yet. Each phase
can be implemented independently. Phase 1 (simplify UI) is the highest
priority because it unblocks all accounting usage.*
