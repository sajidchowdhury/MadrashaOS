# MadrashaOS — Database Migrations

> **Phase B1 · Sessions B1.1–B1.3**

## Overview

The initial migration (`20260918000000_init`) creates all **52 tables**, **15 enums**, **260 indexes**, and **238 foreign key relations** in PostgreSQL. This is a single comprehensive migration because the Prisma schema (B0.3) already contained all 52 models — the migration applies them all at once.

## How to apply migrations locally

### Prerequisites
- Docker installed and running
- PostgreSQL container started: `bun run db:up`

### Step 1: Start PostgreSQL
```bash
bun run db:up
# Or: docker compose up -d
```

### Step 2: Apply migrations
```bash
bunx prisma migrate deploy
```

This reads `prisma/migrations/20260918000000_init/migration.sql` and applies it to the database.

### Step 3: Generate the Prisma client
```bash
bunx prisma generate
```

### Step 4: Verify the database
```bash
bun run db:verify
# Or: docker exec madrashaos-db psql -U madrashaos -d madrashaos -c "\dt"
```

You should see 52 tables + the `_prisma_migrations` tracking table.

### Step 5 (optional): Open Prisma Studio
```bash
bun run db:studio
# Opens http://localhost:5555 — visual database browser
```

## One-command setup

```bash
bun run db:setup
```

This runs: `docker compose up -d && sleep 3 && prisma migrate deploy && prisma generate`

## Migration structure

```
prisma/
├── schema.prisma                          # 52 models, 15 enums (B0.3)
├── migrations/
│   ├── migration_lock.toml               # Provider = postgresql
│   └── 20260918000000_init/
│       └── migration.sql                  # 2,853 lines — all 52 tables
└── seed.ts                                # (B1.4 — not yet created)
```

## Tables created by this migration

| Layer | Tables | Count |
|---|---|---|
| Foundation | organizations, branches, users, roles, permissions, role_permissions, audit_logs, module_configs, security_policies, backup_records | 10 |
| People | classes, sections, students, guardians, student_guardians, teachers, employees, admissions, teacher_assignments | 9 |
| Academic | subjects, routines, attendance_sessions, attendance_records, exams, marks, results, student_history | 8 |
| Finance | accounts, fee_plans, fee_installments, fee_payments, scholarships, ledger_entries, cash_bank_transfers, zakat_transactions, donations | 9 |
| Operations | inventory_items, purchases, purchase_items, suppliers, assets, hostel_rooms, hostel_beds, meal_plans, library_books, library_issues, vehicles, fuel_logs | 12 |
| Communication | notices, documents, reports, approvals | 4 |
| **Total** | | **52** |

## Resetting the database

If you need to start fresh:
```bash
bun run db:reset
# Or: docker compose down -v && docker compose up -d && bunx prisma migrate deploy
```

## Next steps

- **B1.4**: Seed data (40 students, 8 users, 12 ledger entries — matching mock fixtures)
- **B2.1**: NextAuth.js setup (JWT + refresh tokens)
- **B3.1**: Foundation API endpoints
