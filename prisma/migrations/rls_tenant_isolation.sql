-- ============================================================
-- MadrashaOS — Row-Level Security (RLS) Migration (Phase 6)
-- ============================================================
-- Enables PostgreSQL Row-Level Security on every tenant-scoped table.
--
-- This is the defense-in-depth layer: even if the application has a bug
-- that forgets to filter by organization_id, the database will reject
-- the query at the row level.
--
-- How it works:
--   1. The app sets a session variable before each transaction:
--        SET LOCAL app.tenant_id = '<org_uuid>';
--   2. RLS policies use current_setting('app.tenant_id') to filter rows
--   3. Tables with organization_id get the policy:
--        USING (organization_id = current_setting('app.tenant_id', true)::uuid)
--   4. The platform_admin_role bypasses RLS (FOR ALL, USING (true))
--
-- Tables WITHOUT RLS (global / platform-level):
--   - organizations (the tenant root — no org_id on itself)
--   - permissions (global catalog — no org_id)
--   - tenant_signup_requests (platform-level, has its own org_code)
--   - idempotency_records (has nullable org_id — special handling)
--
-- IMPORTANT: Run this AFTER all tables exist (after prisma db push).
-- This is idempotent — safe to run multiple times.
-- ============================================================

-- --- Create the platform_admin role (if it doesn't exist) ---
-- This role is used by the platform super-admin connection to bypass RLS.
-- In production, the app uses a separate DB user with this role for
-- platform-admin operations. In dev, the same DB user works.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'platform_admin_role') THEN
    CREATE ROLE platform_admin_role;
  END IF;
END
$$;

-- --- Enable + FORCE RLS on every tenant-scoped table ---
-- FORCE means even the table owner is subject to RLS policies.
-- The list below is auto-generated from all tables with organization_id
-- (excluding organizations itself and permissions which are global).

DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'accounts', 'admissions', 'approvals', 'assets',
    'attendance_records', 'attendance_sessions', 'audit_logs',
    'backup_records', 'branches', 'cash_bank_transfers',
    'classes', 'documents', 'donations', 'donor_pledges',
    'donors', 'employee_advances', 'employees', 'exams',
    'fee_installments', 'fee_payments', 'fee_plans',
    'fuel_logs', 'guardians', 'hostel_beds', 'hostel_rooms',
    'inventory_items', 'inventory_sales', 'invoices',
    'ledger_entries', 'library_books', 'library_issues',
    'marks', 'meal_plans', 'module_configs', 'notices',
    'payroll_records', 'purchase_items', 'purchases',
    'reports', 'results', 'role_permissions', 'roles',
    'routines', 'scholarships', 'sections', 'security_policies',
    'student_guardians', 'student_history', 'students',
    'subjects', 'subscriptions', 'suppliers',
    'teacher_assignments', 'teachers', 'usage_snapshots',
    'users', 'vehicles', 'zakat_transactions'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    -- Enable RLS (idempotent)
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    -- Force RLS (applies to table owner too)
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);

    -- Drop existing policies (idempotent — safe to re-run)
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS platform_admin_bypass ON %I;', t);

    -- Tenant isolation policy: only rows matching the session's tenant_id
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
       USING (organization_id = current_setting(''app.tenant_id'', true)::uuid)
       WITH CHECK (organization_id = current_setting(''app.tenant_id'', true)::uuid);',
      t
    );

    -- Platform admin bypass: platform_admin_role sees all rows
    EXECUTE format(
      'CREATE POLICY platform_admin_bypass ON %I
       FOR ALL
       TO platform_admin_role
       USING (true)
       WITH CHECK (true);',
      t
    );
  END LOOP;
END
$$;

-- --- Special handling: idempotency_records ---
-- This table has a NULLABLE organization_id (public requests have no org).
-- RLS allows NULL org_id rows to be visible to everyone (for dedup).
DO $$
BEGIN
  ALTER TABLE idempotency_records ENABLE ROW LEVEL SECURITY;
  ALTER TABLE idempotency_records FORCE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS idempotency_tenant ON idempotency_records;
  DROP POLICY IF EXISTS idempotency_public ON idempotency_records;
  DROP POLICY IF EXISTS idempotency_platform_bypass ON idempotency_records;

  -- Rows with organization_id = session tenant
  CREATE POLICY idempotency_tenant ON idempotency_records
    USING (
      organization_id = current_setting('app.tenant_id', true)::uuid
      OR organization_id IS NULL
    )
    WITH CHECK (true); -- allow inserts with any org_id (incl. NULL)

  -- Platform admin bypass
  CREATE POLICY idempotency_platform_bypass ON idempotency_records
    FOR ALL
    TO platform_admin_role
    USING (true)
    WITH CHECK (true);
END
$$;

-- --- Grant platform_admin_role to the application DB user ---
-- In dev, the app connects as "madrasha" (the docker-compose user).
-- Grant it the platform_admin_role so it can bypass RLS when needed.
-- In production, use a separate connection for platform-admin operations.
DO $$
DECLARE
  app_user text := current_user;
BEGIN
  -- Grant the platform_admin_role to the current DB user
  EXECUTE format('GRANT platform_admin_role TO %I;', app_user);
  -- Set it as the default role for this user's sessions
  -- (so RLS bypass works without explicit SET ROLE)
  -- NOTE: In production, DON'T do this — use separate connections for
  -- platform-admin vs tenant-scoped operations.
  EXECUTE format('ALTER ROLE %I SET role = platform_admin_role;', app_user);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not grant platform_admin_role to %: %', app_user, SQLERRM;
END
$$;

-- --- Verify: list all tables with RLS enabled ---
-- Run this to confirm:
--   SELECT tablename, rowsecurity, forcerowsecurity
--   FROM pg_tables
--   WHERE schemaname = 'public' AND rowsecurity = true
--   ORDER BY tablename;

\echo '✅ RLS enabled on all tenant-scoped tables.'
\echo '   To apply per-request tenant context, use:'
\echo '     SET LOCAL app.tenant_id = ''<org_uuid>'''
\echo '   before each Prisma query in a transaction.'
\echo ''
\echo '   Platform admin (platform_admin_role) bypasses RLS.'
