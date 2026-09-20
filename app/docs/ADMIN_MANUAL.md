# MadrashaOS — Admin Manual

> Day-to-day operations guide for administrators and authority figures.

## First Login

1. Navigate to `http://your-domain.org/login`
2. Enter `admin@madrashaos.org` / `password123`
3. **Change your password immediately** (ask your IT admin or use the profile menu)
4. You'll be redirected to the Authority Dashboard

## Core Operations

### Create a Student

1. Navigate to **Students** (left sidebar)
2. Click **Add Student**
3. Fill in: name (English + Bangla), class, section, roll, gender, DOB, guardian
4. Click **Save**
5. The student gets an auto-generated code (e.g. `MOS-2026-001`)

### Promote a Student

1. Open the student's profile (click their name in the students list)
2. Go to the **History** tab
3. Click **Promote Student**
4. Select the target class + section
5. Enter a reason (e.g. "Passed final exam")
6. Click **Confirm Promotion**
7. The old assignment is archived to history (never deleted)

### Collect a Fee Payment

1. Navigate to **Fees** (left sidebar)
2. Click **Collect Payment**
3. Step 1: Search for the student by name or code
4. Step 2: Select the outstanding installment, enter amount, choose method (cash/bank/mobile), select receiving account
5. Step 3: Preview the receipt → click **Confirm Payment**
6. The system posts a balanced ledger entry, marks the installment as paid, generates a receipt (e.g. `RCP-2026-1009`)

### Take Attendance (Teacher role)

1. Navigate to **Attendance** → **Take Attendance**
2. Select class + section from the dropdowns
3. For each student, tap to cycle: Present → Absent → Late → Leave → Present
4. Click **Submit** — the system creates an attendance session with idempotency protection
5. Absent students trigger guardian SMS notifications (if notifications are configured)

### Enter Exam Marks (Teacher role)

1. Navigate to **Examinations**
2. Click **Enter Marks** on the exam
3. Enter marks for each student (one at a time, mobile-friendly)
4. Click **Save & Submit** on the last student
5. Marks are validated against the exam's full marks

### Publish an Exam

1. Navigate to **Examinations**
2. Click **Publish** on the exam you want to lock
3. Confirm — marks can no longer be edited after publishing

### Generate Results

1. Navigate to **Results**
2. Click **Generate Results** for a class + exam
3. The system calculates GPA, grade, division, and position

### Send a Notice

1. Navigate to **Notices**
2. Click **Compose**
3. Select audience (All / Guardians / Staff)
4. Write title + body (English + Bangla)
5. Click **Send** — notices with audience "All" appear on the public website

### Manage Roles & Permissions (RBAC)

1. Navigate to **Roles & Permissions**
2. Toggle permission groups per role (Foundation, People, Academic, Finance, etc.)
3. Click **Save Matrix** — all 8 roles are updated via the API

### View Audit Trail

1. Navigate to **Audit Trail**
2. Filter by entity type (students, fee_payments, donations, etc.)
3. Filter by actor (who made the change)
4. Click **Export CSV** to download

### Switch Branch (Multi-branch orgs)

1. Use the branch selector in the top bar (desktop)
2. Select the branch — the page reloads and all data scopes to the new branch

### Configure Organization

1. Navigate to **Settings**
2. Update organization name, phone, email, address
3. Configure default language (English / Bangla / Arabic)

### Manage Security Policies

1. Navigate to **Security** (requires `security.policy.edit` permission — super-admin only)
2. Configure: MFA requirement, password rotation period, session timeout, IP allowlist, lockout threshold
3. Click **Save Changes** — settings persist to the `SecurityPolicy` table

### Run a Backup

1. Navigate to **Backup** (requires `backup.run` permission)
2. Click **Run Backup Now** — executes `pg_dump`, stores in `backups/`
3. Download via the download button
4. For scheduled backups, set up a cron job (see DEPLOYMENT.md)

## Role Reference

| Role | Key Capabilities |
|------|-----------------|
| Super Admin | Everything + security policies + tenant management |
| Administrator | All CRUD + RBAC management + student promotion |
| Authority (Principal) | Dashboard + approvals + audit trail + results |
| Accountant | Fees + ledger + zakat + donations + cash/bank |
| Teacher | Take attendance + enter marks + view results |
| Storekeeper | Inventory + purchases + suppliers + assets |
| Guardian | View own children's attendance + results + fees |
| Student | View own attendance + results |
