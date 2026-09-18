/**
 * MadrashaOS — Admission → Student Conversion Helper
 *
 * Phase B4.2 — Admission API (Kanban + pipeline + register)
 *
 * Shared registration logic used by TWO endpoints:
 *   - POST   /api/v1/admissions/:id/register
 *   - PATCH  /api/v1/admissions/:id/status  (when status === "registered")
 *
 * Converts an approved Admission row into a fully-enrolled Student with:
 *   - Student record (auto-generated code: MOS-{year}-{seq4})
 *   - StudentGuardian junction row (links the student to their guardian)
 *   - StudentHistory row (action="admitted" — Risk R4 timeline bootstrap)
 *   - Guardian record (matched by org + parent_phone, or created)
 *   - User account (matched by org + email, or provisioned with a
 *     server-generated 12-char temp password per SRS §6.2.3 R-S2;
 *     returned ONCE to the caller so it can be communicated out-of-band)
 *   - FeePlan with 3 installments (default amounts + due dates derived
 *     from today's date — staff can adjust via PATCH /fee-plans/:id later)
 *
 * Idempotent: if the admission already has a student_id (status=registered),
 * the helper returns the existing IDs without re-creating anything.
 *
 * All writes are wrapped in `db.$transaction` so a failure in any step
 * (Guardian, User, Student, StudentGuardian, FeePlan, FeeInstallment,
 * Admission status update) rolls the whole batch back — no orphan rows.
 */

import { db } from "@/lib/db";
import { hashPassword, generateTempPassword } from "@/lib/auth/password";

/** Result shape returned by `convertAdmissionToStudent`. */
export interface RegisterResult {
  /** Whether the registration created a new student or returned an existing one. */
  created: boolean;
  /** The Student row UUID. */
  student_id: string;
  /** The FeePlan UUID created for this student. */
  fee_plan_id: string;
  /** The User UUID linked to the guardian (existing or newly created). */
  user_id: string;
  /** The Guardian UUID (existing or newly created). */
  guardian_id: string;
  /** The auto-generated student code, e.g. "MOS-2026-0042". */
  student_code: string;
  /** True iff a NEW User account was provisioned (caller may surface temp_password). */
  user_created: boolean;
  /**
   * One-time plaintext temp password. Only populated when
   * `user_created === true`. Per SRS §6.2.3 R-S3, this is NEVER logged,
   * NEVER persisted in plaintext, NEVER returned by any other endpoint.
   */
  temp_password?: string;
  /** Human-readable status message. */
  message: string;
}

/** Options for overriding defaults during the conversion. */
export interface RegisterOptions {
  gender?: "male" | "female";
  /** ISO date string for the student's date of birth. */
  dob?: string;
  /** Explicit roll number; defaults to next-available in the class. */
  roll?: number;
}

/**
 * Default FeePlan amounts (BDT) used at registration. The spec says
 * "3 installments" without specifying amounts — these defaults are
 * conservative and intended to be edited by the fee clerk post-registration
 * via the dedicated fee-plans PATCH endpoint (out of scope for B4.2).
 */
const DEFAULT_TOTAL_FEE = 12000;
const DEFAULT_INSTALLMENT_LABELS = [
  "1st Installment (Admission)",
  "2nd Installment (Mid-term)",
  "3rd Installment (Final)",
];

/**
 * Transaction client type — the same `Prisma.TransactionClient` shape
 * that `db.$transaction(async (tx) => …)` passes in. Declared here so
 * we can type the helper that runs inside the transaction.
 */
type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/**
 * Generate the next student code for the given org in the form
 * `MOS-{year}-{seq4}` where seq4 is `(count + 1)` zero-padded to 4 digits.
 *
 * Matches the format used by POST /api/v1/students so admissions and
 * manual student entries share one continuous sequence per year.
 */
async function nextStudentCode(
  tx: Tx,
  organization_id: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `MOS-${year}-`;
  // Count includes soft-deleted rows — codes never get reused.
  const count = await tx.student.count({
    where: {
      organization_id,
      code: { startsWith: prefix },
    },
  });
  const seq = String(count + 1).padStart(4, "0");
  return `${prefix}${seq}`;
}

/**
 * Core conversion routine. Throws on validation failures (caller
 * is responsible for translating to an HTTP status code):
 *   - "Admission not found"                  → 404
 *   - "Admission has no desired_class set"   → 422
 *   - "Desired class not found"              → 404
 *   - "Guardian role not configured"         → 422
 *   - "Cannot register admission with status: X. Must be approved first." → 409
 *
 * @param admissionId  UUID of the Admission row to convert.
 * @param organizationId  Tenant scope (must match the admission's org).
 * @param branchId  Branch to assign to the new Student/Guardian/User.
 * @param decidedBy  UUID of the acting user (sets decided_by + audit fields).
 * @param options  Optional overrides for gender/dob/roll.
 */
export async function convertAdmissionToStudent(
  admissionId: string,
  organizationId: string,
  branchId: string | null,
  decidedBy: string,
  options?: RegisterOptions,
): Promise<RegisterResult> {
  // 1. Fetch the admission (tenant-scoped).
  const admission = await db.admission.findFirst({
    where: {
      id: admissionId,
      organization_id: organizationId,
      deleted_at: null,
    },
  });
  if (!admission) {
    throw new Error("Admission not found");
  }

  // 2. Idempotency: if already registered, return the existing IDs.
  if (admission.student_id) {
    const existingStudent = await db.student.findUnique({
      where: { id: admission.student_id },
      select: { id: true, code: true },
    });
    if (existingStudent) {
      const existingPlan = await db.feePlan.findFirst({
        where: { student_id: existingStudent.id, deleted_at: null },
        orderBy: { created_at: "desc" },
        select: { id: true },
      });
      // Look up the guardian via the StudentGuardian junction.
      const junction = await db.studentGuardian.findFirst({
        where: {
          student_id: existingStudent.id,
          is_primary: true,
          deleted_at: null,
        },
        select: {
          guardian_id: true,
          guardian: { select: { user_id: true } },
        },
      });
      return {
        created: false,
        student_id: existingStudent.id,
        fee_plan_id: existingPlan?.id ?? "",
        user_id: junction?.guardian.user_id ?? "",
        guardian_id: junction?.guardian_id ?? "",
        student_code: existingStudent.code,
        user_created: false,
        message: "Admission already registered — returning existing student",
      };
    }
  }

  // 3. Status guard — only `approved` can be moved to `registered`.
  //    (Status === "registered" would have hit the idempotency branch above
  //    since student_id would be set; this catches the edge case where
  //    student_id is null but status was somehow flipped.)
  if (admission.status !== "approved") {
    throw new Error(
      `Cannot register admission with status: ${admission.status}. Must be approved first.`,
    );
  }

  // 4. Resolve the desired class (stored as UUID string on Admission.desired_class).
  const classId = admission.desired_class;
  if (!classId) {
    throw new Error("Admission has no desired_class set");
  }
  const klass = await db.class.findFirst({
    where: {
      id: classId,
      organization_id: organizationId,
      deleted_at: null,
    },
    select: { id: true, name: true },
  });
  if (!klass) {
    throw new Error("Desired class not found");
  }

  // 5. Resolve the Guardian role for this org — needed to provision a User.
  const guardianRole = await db.role.findFirst({
    where: {
      organization_id: organizationId,
      code: "guardian",
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!guardianRole) {
    throw new Error(
      "Guardian role not configured for this organization. Seed the RBAC roles first.",
    );
  }

  // All writes from here on are atomic.
  return await db.$transaction(async (tx) => {
    // 6. Look up existing Guardian by (org, parent_phone) — the
    //    @@unique([organization_id, phone]) index guarantees one match.
    let guardian = await tx.guardian.findFirst({
      where: {
        organization_id: organizationId,
        phone: admission.parent_phone,
        deleted_at: null,
      },
      select: { id: true, user_id: true },
    });

    let userId: string | null = guardian?.user_id ?? null;
    let userCreated = false;
    let tempPassword: string | undefined;

    // 7. Provision a User account if the guardian doesn't have one yet.
    if (!userId) {
      // Email — prefer parent_email; else synthesize a deterministic
      // placeholder from the parent_phone so the User row satisfies the
      // NOT NULL + UNIQUE constraints without requiring an email from
      // the admission form.
      const email =
        admission.parent_email?.trim().toLowerCase() ||
        `guardian.${admission.parent_phone.replace(/[^0-9]/g, "")}@madrasha.local`;

      // Reuse an existing User with the same email if one exists in the org.
      const existingUser = await tx.user.findFirst({
        where: {
          organization_id: organizationId,
          email,
          deleted_at: null,
        },
        select: { id: true },
      });

      if (existingUser) {
        userId = existingUser.id;
      } else {
        tempPassword = generateTempPassword();
        const passwordHash = await hashPassword(tempPassword);
        const avatarInitial =
          admission.parent_name.trim().slice(0, 2).toUpperCase() || null;

        const newUser = await tx.user.create({
          data: {
            organization_id: organizationId,
            branch_id: branchId,
            role_id: guardianRole.id,
            name: admission.parent_name,
            name_bn: null,
            email,
            phone: admission.parent_phone,
            password_hash: passwordHash,
            avatar_initial: avatarInitial,
            status: "active",
            mfa_enabled: false,
            preferences: {},
            created_by: decidedBy,
          },
          select: { id: true },
        });
        userId = newUser.id;
        userCreated = true;
      }
    }

    // 8. Create the Guardian if it didn't exist; otherwise link the User
    //    to the existing Guardian row (one-time backfill).
    if (!guardian) {
      guardian = await tx.guardian.create({
        data: {
          organization_id: organizationId,
          branch_id: branchId,
          name: admission.parent_name,
          name_bn: null,
          phone: admission.parent_phone,
          email: admission.parent_email ?? null,
          relation: "guardian",
          is_primary: true,
          user_id: userId,
          created_by: decidedBy,
        },
        select: { id: true, user_id: true },
      });
    } else if (!guardian.user_id) {
      await tx.guardian.update({
        where: { id: guardian.id },
        data: { user_id: userId, updated_by: decidedBy },
      });
    }

    // 9. Generate the student code + resolve the roll number.
    const studentCode = await nextStudentCode(tx, organizationId);

    let roll = options?.roll;
    if (!roll || roll < 1) {
      const maxRoll = await tx.student.aggregate({
        where: { class_id: klass.id, deleted_at: null },
        _max: { roll: true },
      });
      roll = (maxRoll._max.roll ?? 0) + 1;
    }

    // 10. Resolve the DOB — caller-supplied, else default to today minus
    //     10 years (placeholder, must be updated by staff via PATCH /students/:id).
    const dob = options?.dob
      ? new Date(options.dob)
      : new Date(new Date().getFullYear() - 10, 0, 1);
    if (Number.isNaN(dob.getTime())) {
      throw new Error("Invalid dob — must be an ISO 8601 date string");
    }

    const gender = options?.gender ?? "male";
    const academicYear = new Date().getFullYear();

    // 11. Create the Student + StudentGuardian junction + StudentHistory
    //     bootstrap row (Risk R4 — promotion wizard timeline seed chip).
    //     Nested writes keep all three inserts in the same transaction.
    const student = await tx.student.create({
      data: {
        organization_id: organizationId,
        branch_id: branchId,
        code: studentCode,
        name: admission.applicant_name,
        name_bn: admission.applicant_name_bn ?? admission.applicant_name,
        class_id: klass.id,
        roll,
        gender,
        dob,
        admitted_at: new Date(),
        status: "active",
        previous_school: null,
        created_by: decidedBy,
        student_guardians: {
          create: [
            {
              organization_id: organizationId,
              branch_id: branchId,
              guardian_id: guardian.id,
              relation: "guardian",
              is_primary: true,
              can_pickup: true,
              receive_sms: true,
              receive_email: false,
              created_by: decidedBy,
            },
          ],
        },
      },
      select: { id: true, code: true },
    });

    await tx.studentHistory.create({
      data: {
        organization_id: organizationId,
        branch_id: branchId,
        student_id: student.id,
        academic_year: academicYear,
        from_class_id: null,
        from_section_id: null,
        to_class_id: klass.id,
        to_section_id: null,
        action: "admitted",
        remark: "Converted from admission application",
        effective_date: new Date(),
        action_by: decidedBy,
        created_by: decidedBy,
      },
    });

    // 12. Create the FeePlan with 3 installments. Due dates are spaced
    //     4 months apart starting from the registration month — gives
    //     the family ~12 months to clear the year's fees.
    const installmentAmount = Math.round(DEFAULT_TOTAL_FEE / 3);
    const now = new Date();
    const dueDates = [0, 4, 8].map(
      (monthsAhead) =>
        new Date(now.getFullYear(), now.getMonth() + monthsAhead, 15),
    );

    const feePlan = await tx.feePlan.create({
      data: {
        organization_id: organizationId,
        branch_id: branchId,
        student_id: student.id,
        academic_year: academicYear,
        total_amount: DEFAULT_TOTAL_FEE,
        scholarship_amount: 0,
        net_payable: DEFAULT_TOTAL_FEE,
        installment_count: 3,
        status: "active",
        notes: "Auto-generated at admission registration",
        created_by: decidedBy,
        fee_installments: {
          create: DEFAULT_INSTALLMENT_LABELS.map((label, i) => ({
            organization_id: organizationId,
            branch_id: branchId,
            student_id: student.id,
            label,
            amount: installmentAmount,
            due_date: dueDates[i] ?? dueDates[2]!,
            status: "unpaid",
            created_by: decidedBy,
          })),
        },
      },
      select: { id: true },
    });

    // 13. Flip the Admission status to `registered`, link the student_id,
    //     stamp decided_by + decided_at.
    await tx.admission.update({
      where: { id: admission.id },
      data: {
        status: "registered",
        student_id: student.id,
        decided_by: decidedBy,
        decided_at: new Date(),
        updated_by: decidedBy,
      },
    });

    return {
      created: true,
      student_id: student.id,
      fee_plan_id: feePlan.id,
      user_id: userId,
      guardian_id: guardian.id,
      student_code: student.code,
      user_created: userCreated,
      temp_password: userCreated ? tempPassword : undefined,
      message: "Student registered successfully",
    };
  });
}
