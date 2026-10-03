/**
 * MadrashaOS — Tenant Provisioning (Phase 1c)
 *
 * Creates a fully working new tenant organization in a single atomic
 * transaction. Called when a platform super-admin approves a
 * TenantSignupRequest.
 *
 * Provisioning steps (all inside db.$transaction — all or nothing):
 *   1. Create Organization (with code, trial_ends_at = +14 days)
 *   2. Create default Branch ("Main Branch")
 *   3. Create 7 system Roles (authority, administrator, accountant, …)
 *   4. Create RolePermissions (assign permissions to each role)
 *   5. Create SecurityPolicy (default settings)
 *   6. Create the first admin User (from the signup request's contact)
 *   7. Create default Chart of Accounts (Cash, Bank, Fee Income, …)
 *   8. Create a Subscription record (trial, 14 days)
 *   9. Update the TenantSignupRequest status → "provisioned"
 *
 * On success: the new admin can log in immediately with their email +
 * a temporary password (which is returned to the platform admin so they
 * can relay it to the contact person).
 *
 * On failure: the transaction rolls back completely — no partial tenant
 * is left behind.
 */

import { db } from "@/lib/db";
import { hashPassword, generateTempPassword } from "@/lib/auth/password";
import { ROLE_PERMISSIONS } from "@/lib/auth/role-permissions";
import { AccountType, FundType } from "@/generated/prisma";
import { randomUUID } from "crypto";

const TRIAL_DAYS = 14;
const TEMP_PASSWORD_LENGTH = 12;

export type ProvisioningResult = {
  organization_id: string;
  organization_code: string;
  admin_user_id: string;
  admin_email: string;
  admin_temp_password: string;
  branch_id: string;
  branch_count: number;
};

export type ProvisionInput = {
  /** The TenantSignupRequest row to provision */
  signupRequest: {
    id: string;
    org_name: string;
    org_name_bn: string | null;
    org_slug: string;
    org_code: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    address: string | null;
    estimated_branches: number;
  };
  /** The platform admin user ID who approved the request */
  approvedBy: string;
};

/**
 * Provisions a new tenant organization from an approved signup request.
 *
 * @returns the new org ID, admin user ID, and a temporary password
 *          that the platform admin must relay to the contact person.
 * @throws if any step fails (the transaction rolls back).
 */
export async function provisionTenant(
  input: ProvisionInput,
): Promise<ProvisioningResult> {
  const { signupRequest, approvedBy } = input;
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  // Generate a temporary password for the first admin user
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const result = await db.$transaction(
    async (tx) => {
      // --- 1. Create Organization ---
      const org = await tx.organization.create({
        data: {
          name: signupRequest.org_name,
          name_bn: signupRequest.org_name_bn ?? signupRequest.org_name,
          slug: signupRequest.org_slug,
          code: signupRequest.org_code,
          phone: signupRequest.contact_phone,
          email: signupRequest.contact_email,
          address: signupRequest.address,
          status: "active",
          trial_ends_at: trialEndsAt,
          settings: { locale: "en", currency: "BDT", academicYearStart: "January" },
          created_by: approvedBy,
        },
      });

      // --- 2. Create default Branch (Main Branch) ---
      const branch = await tx.branch.create({
        data: {
          organization_id: org.id,
          code: "main",
          name: "Main Branch",
          name_bn: "মূল শাখা",
          address: signupRequest.address,
          phone: signupRequest.contact_phone,
          email: signupRequest.contact_email,
          is_active: true,
          created_by: approvedBy,
        },
      });

      // --- 3. Create 7 system Roles (excluding super-admin which is platform-only) ---
      const roleDefs = [
        { code: "authority", name: "Authority (Principal)", description: "Madrasha head/principal — all-branch read + approve" },
        { code: "administrator", name: "Administrator", description: "Office admin — tenant-wide CRUD" },
        { code: "accountant", name: "Accountant", description: "Finance CRUD" },
        { code: "teacher", name: "Teacher", description: "Own classes + sections" },
        { code: "storekeeper", name: "Storekeeper", description: "Inventory + purchase CRUD" },
        { code: "guardian", name: "Guardian (Parent)", description: "Read-only on own linked children" },
        { code: "student", name: "Student", description: "Read-only on own records" },
      ];

      const roleIdMap: Record<string, string> = {};
      for (const r of roleDefs) {
        const role = await tx.role.create({
          data: {
            organization_id: org.id,
            branch_id: null, // roles are org-level, not branch-scoped
            code: r.code,
            name: r.name,
            description: r.description,
            is_system: true,
            is_platform: false,
            priority: 100,
            created_by: approvedBy,
          },
        });
        roleIdMap[r.code] = role.id;
      }

      // --- 4. Create RolePermissions ---
      // Fetch all permission codes from the Permission table (global catalog)
      const allPerms = await tx.permission.findMany({
        where: { deleted_at: null },
        select: { id: true, code: true },
      });
      const permCodeToId = new Map(allPerms.map((p) => [p.code, p.id]));

      let permCount = 0;
      for (const [roleCode, permCodes] of Object.entries(ROLE_PERMISSIONS)) {
        // Skip super-admin — it's a platform role, not a tenant role
        if (roleCode === "super-admin") continue;
        const roleId = roleIdMap[roleCode];
        if (!roleId) continue;

        for (const permCode of permCodes) {
          const permId = permCodeToId.get(permCode);
          if (!permId) continue;
          await tx.rolePermission.create({
            data: {
              organization_id: org.id,
              role_id: roleId,
              permission_id: permId,
              granted_by: approvedBy,
              created_by: approvedBy,
            },
          });
          permCount++;
        }
      }

      // --- 5. Create SecurityPolicy ---
      await tx.securityPolicy.create({
        data: {
          organization_id: org.id,
          password_min_length: 8,
          password_require_special: true,
          password_require_digit: true,
          password_require_upper: true,
          password_expiry_days: 90,
          password_history_count: 5,
          mfa_required: false,
          session_ttl_minutes: 15,
          refresh_ttl_days: 7,
          max_concurrent_sessions: 3,
          ip_allowlist: [],
          created_by: approvedBy,
        } as never,
      });

      // --- 6. Create the first admin User ---
      // The contact person becomes the first administrator of the new org
      const adminRole = await tx.role.findFirst({
        where: { organization_id: org.id, code: "administrator" },
        select: { id: true },
      });
      if (!adminRole) throw new Error("Failed to create administrator role during provisioning");

      const adminUser = await tx.user.create({
        data: {
          organization_id: org.id,
          branch_id: branch.id,
          role_id: adminRole.id,
          name: signupRequest.contact_name,
          email: signupRequest.contact_email,
          phone: signupRequest.contact_phone,
          password_hash: passwordHash,
          status: "active",
          mfa_enabled: false,
          avatar_initial: signupRequest.contact_name.charAt(0).toUpperCase(),
          created_by: approvedBy,
        },
      });

      // --- 7. Create default Chart of Accounts ---
      const defaultAccounts = [
        { code: "1000", name: "Cash on Hand", type: AccountType.asset, fund: FundType.general, balance: 0 },
        { code: "1010", name: "Bank Account", type: AccountType.asset, fund: FundType.general, balance: 0 },
        { code: "1020", name: "Mobile Wallet (bKash)", type: AccountType.asset, fund: FundType.general, balance: 0 },
        { code: "4000", name: "Fee Income", type: AccountType.income, fund: FundType.general, balance: 0 },
        { code: "4100", name: "Donation Income", type: AccountType.income, fund: FundType.general, balance: 0 },
        { code: "4200", name: "Other Income", type: AccountType.income, fund: FundType.general, balance: 0 },
        { code: "5000", name: "Operating Expenses", type: AccountType.expense, fund: FundType.general, balance: 0 },
        { code: "5100", name: "Salary Expense", type: AccountType.expense, fund: FundType.general, balance: 0 },
        { code: "3000", name: "Zakat Fund", type: AccountType.liability, fund: FundType.zakat, balance: 0 },
        { code: "3010", name: "Zakat Cash", type: AccountType.asset, fund: FundType.zakat, balance: 0 },
      ];
      for (const a of defaultAccounts) {
        await tx.account.create({
          data: {
            organization_id: org.id,
            branch_id: branch.id,
            code: a.code,
            name: a.name,
            type: a.type,
            fund: a.fund,
            balance: a.balance,
            is_active: true,
            is_cash: a.code === "1000" || a.code === "3010",
            is_bank: a.code === "1010",
            created_by: approvedBy,
          } as never,
        });
      }

      // --- 8. Create Subscription (trial) ---
      await tx.subscription.create({
        data: {
          organization_id: org.id,
          plan: "trial",
          status: "trialing",
          branch_count_snapshot: 1,
          monthly_amount_bdt: 300,
          currency: "BDT",
          current_period_start: now,
          current_period_end: trialEndsAt,
          trial_ends_at: trialEndsAt,
          created_by: approvedBy,
        } as never,
      });

      // --- 9. Update the TenantSignupRequest ---
      await tx.tenantSignupRequest.update({
        where: { id: signupRequest.id },
        data: {
          status: "provisioned",
          reviewed_by: approvedBy,
          reviewed_at: now,
          provisioned_org_id: org.id,
          updated_by: approvedBy,
        },
      });

      return {
        organization_id: org.id,
        organization_code: org.code,
        admin_user_id: adminUser.id,
        admin_email: adminUser.email,
        admin_temp_password: tempPassword,
        branch_id: branch.id,
        branch_count: 1,
      };
    },
    { timeout: 120_000, maxWait: 30_000 }, // 2 min timeout for provisioning
  );

  return result;
}
