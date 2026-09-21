/**
 * MadrashaOS — OpenAPI 3.1 Specification
 *
 * Phase B9.1 — OpenAPI 3.1 Spec Generation
 *
 * This is the complete API contract for all 109 route files across 9 phases.
 * It serves as:
 *   1. Interactive API docs at /api/docs (Swagger UI)
 *   2. Source for frontend client generation (B9.2)
 *   3. The binding handoff artifact to the frontend developer
 *
 * Total endpoints: ~200+ (GET/POST/PATCH/DELETE across 109 route files)
 * All endpoints are under /api/v1/* and require JWT authentication
 * (except POST /api/v1/donations which is public per Risk R10)
 */

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "MadrashaOS API",
    version: "1.0.0",
    description:
      "Multi-tenant, multi-branch Madrasha Management & ERP system API. " +
      "Trilingual (Bangla/English/Arabic) with full RBAC, Golden Flow accounting, " +
      "and Zakat fund isolation.\n\n" +
      "**Authentication**: JWT via `Authorization: Bearer <token>` header. " +
      "Login at `/api/auth/callback/credentials`.\n\n" +
      "**Idempotency**: Write endpoints accept `Idempotency-Key` header (SRS §6.5).\n\n" +
      "**Multi-tenant**: All queries scoped by `organization_id` + `branch_id` from session.",
    contact: { name: "MadrashaOS Team", email: "info@madrashaos.org" },
    license: { name: "Proprietary" },
  },
  servers: [
    { url: "/api/v1", description: "Current server (relative)" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
          details: { type: "object", additionalProperties: true },
        },
        required: ["error"],
      },
      Pagination: {
        type: "object",
        properties: {
          page: { type: "integer", minimum: 1 },
          pageSize: { type: "integer", minimum: 1, maximum: 100 },
          total: { type: "integer" },
          totalPages: { type: "integer" },
        },
      },
      Organization: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          name_bn: { type: "string" },
          slug: { type: "string" },
          phone: { type: "string" },
          email: { type: "string", format: "email" },
          address: { type: "string" },
          established_year: { type: "integer" },
          settings: { type: "object" },
          branches: { type: "array", items: { $ref: "#/components/schemas/Branch" } },
        },
      },
      Branch: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          code: { type: "string" },
          name: { type: "string" },
          name_bn: { type: "string" },
          address: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
          established_year: { type: "integer" },
          is_active: { type: "boolean" },
        },
      },
      Student: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          code: { type: "string", example: "MOS-2026-001" },
          name: { type: "string" },
          name_bn: { type: "string" },
          name_ar: { type: "string" },
          class_id: { type: "string", format: "uuid" },
          section_id: { type: "string", format: "uuid" },
          guardian_id: { type: "string", format: "uuid" },
          roll: { type: "integer" },
          gender: { type: "string", enum: ["male", "female"] },
          dob: { type: "string", format: "date" },
          status: { type: "string", enum: ["active", "graduated", "withdrawn"] },
        },
      },
      FeePayment: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          receipt_no: { type: "string", example: "RCP-2026-0001" },
          student_id: { type: "string", format: "uuid" },
          installment_id: { type: "string", format: "uuid" },
          amount: { type: "number", format: "decimal" },
          method: { type: "string", enum: ["cash", "bank", "mobile"] },
          account_id: { type: "string", format: "uuid" },
          collected_by: { type: "string", format: "uuid" },
          collected_at: { type: "string", format: "date-time" },
        },
      },
      LedgerEntry: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          voucher_no: { type: "string", example: "JV-2026-001" },
          date: { type: "string", format: "date" },
          narration: { type: "string" },
          debit_account_id: { type: "string", format: "uuid" },
          credit_account_id: { type: "string", format: "uuid" },
          amount: { type: "number", format: "decimal" },
          fund: { type: "string", enum: ["general", "zakat"] },
          status: { type: "string", enum: ["posted", "pending", "rejected"] },
        },
      },
      Account: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          code: { type: "string" },
          name: { type: "string" },
          type: { type: "string", enum: ["asset", "liability", "equity", "income", "expense"] },
          fund: { type: "string", enum: ["general", "zakat"] },
          balance: { type: "number", format: "decimal" },
          is_active: { type: "boolean" },
        },
      },
      AttendanceSession: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          class_id: { type: "string", format: "uuid" },
          section_id: { type: "string", format: "uuid" },
          date: { type: "string", format: "date" },
          taken_by: { type: "string", format: "uuid" },
          total_present: { type: "integer" },
          total_absent: { type: "integer" },
          is_locked: { type: "boolean" },
        },
      },
      Notice: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          title_bn: { type: "string" },
          body: { type: "string" },
          body_bn: { type: "string" },
          audience: { type: "string", enum: ["all", "class", "guardians", "staff"] },
          audience_filter: { type: "string" },
          recipient_count: { type: "integer" },
          status: { type: "string", enum: ["draft", "scheduled", "sent"] },
        },
      },
      Approval: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          type: { type: "string", enum: ["expense", "purchase", "discount", "admission"] },
          title: { type: "string" },
          amount: { type: "number", format: "decimal" },
          status: { type: "string", enum: ["pending", "approved", "rejected"] },
          requested_by: { type: "string", format: "uuid" },
          decided_by: { type: "string", format: "uuid" },
          is_self_request: { type: "boolean" },
          can_approve: { type: "boolean" },
        },
      },
      Donation: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          donor_name: { type: "string" },
          donor_email: { type: "string", format: "email" },
          donor_phone: { type: "string" },
          amount: { type: "number", format: "decimal" },
          donation_type: { type: "string", enum: ["general", "zakat", "sadaqah"] },
          fund: { type: "string", enum: ["general", "zakat"] },
          receipt_no: { type: "string" },
          is_anonymous: { type: "boolean" },
          status: { type: "string", enum: ["pending", "confirmed", "failed"] },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  tags: [
    { name: "Auth", description: "Authentication & session management" },
    { name: "Foundation", description: "Organization, branches, modules, RBAC, audit" },
    { name: "People", description: "Students, admissions, guardians, teachers, employees" },
    { name: "Academic", description: "Classes, subjects, routines, attendance, exams, results" },
    { name: "Finance", description: "Fee plans, payments, scholarships, accounts, ledger, cash/bank, Zakat, donations" },
    { name: "Operations", description: "Inventory, purchases, suppliers, assets, hostel, food, library, transport" },
    { name: "Communication", description: "Notices, documents, reports, approvals" },
    { name: "Platform", description: "Async jobs, MFA" },
  ],
  paths: {
    // --- Auth ---
    "/auth/session": {
      get: {
        tags: ["Auth"],
        summary: "Get current session",
        description: "Returns the authenticated user's session info including role, permissions, org, branch.",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Session info" }, "401": { description: "Unauthorized" } },
      },
    },
    "/auth/verify-roles": {
      get: {
        tags: ["Auth"],
        summary: "Verify role-permission assignments",
        description: "Dev endpoint that returns per-role permission counts for verification.",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Role permission counts" }, "401": { description: "Unauthorized" } },
      },
    },
    "/auth/mfa/setup": {
      post: {
        tags: ["Auth", "Platform"],
        summary: "Setup MFA (TOTP)",
        description: "Generates a new MFA secret + QR code. User must verify before MFA is enabled.",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Secret + QR code URL" }, "401": { description: "Unauthorized" } },
      },
    },
    "/auth/mfa/verify": {
      post: {
        tags: ["Auth", "Platform"],
        summary: "Verify MFA token",
        description: "Verifies TOTP token. If enabling: saves secret + sets mfa_enabled. If login-gated: completes authentication.",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "MFA verified" }, "400": { description: "Invalid token" } },
      },
    },
    "/auth/mfa/disable": {
      post: {
        tags: ["Auth", "Platform"],
        summary: "Disable MFA",
        description: "Disables MFA. Requires current valid TOTP token.",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "MFA disabled" }, "400": { description: "Invalid token" } },
      },
    },

    // --- Foundation ---
    "/organizations": {
      get: { tags: ["Foundation"], summary: "Get current organization", security: [{ bearerAuth: [] }], responses: { "200": { description: "Organization with branches" }, "401": { description: "Unauthorized" } } },
      patch: { tags: ["Foundation"], summary: "Update organization", security: [{ bearerAuth: [] }], responses: { "200": { description: "Updated" }, "403": { description: "Forbidden — requires organization.config.view" } } },
    },
    "/branches": {
      get: { tags: ["Foundation"], summary: "List branches", security: [{ bearerAuth: [] }], responses: { "200": { description: "Branch list" } } },
      post: { tags: ["Foundation"], summary: "Create branch", security: [{ bearerAuth: [] }], responses: { "201": { description: "Created" }, "403": { description: "Forbidden — requires organization.branch.create" }, "409": { description: "Code already exists" } } },
    },
    "/branches/{id}": {
      get: { tags: ["Foundation"], summary: "Get single branch", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Branch" }, "404": { description: "Not found" } } },
      patch: { tags: ["Foundation"], summary: "Update branch", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Updated" }, "404": { description: "Not found" } } },
      delete: { tags: ["Foundation"], summary: "Soft delete branch", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Deleted" }, "409": { description: "Has active users" } } },
    },
    "/branches/switch": {
      post: { tags: ["Foundation"], summary: "Switch active branch (Risk R1)", description: "Switches user's active branch. Logs to audit trail.", security: [{ bearerAuth: [] }], responses: { "200": { description: "Switched" }, "404": { description: "Branch not found" } } },
    },
    "/modules": {
      get: { tags: ["Foundation"], summary: "List module configs", security: [{ bearerAuth: [] }], responses: { "200": { description: "Module list with dependencies" } } },
    },
    "/modules/{id}": {
      get: { tags: ["Foundation"], summary: "Get single module config", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Module config" } } },
      patch: { tags: ["Foundation"], summary: "Toggle module (Risk R2)", description: "Toggle module enabled. Returns 409 with dependents list if toggling OFF a module with active dependents.", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Toggled" }, "409": { description: "Has active dependents" } } },
    },
    "/roles": {
      get: { tags: ["Foundation"], summary: "List roles", security: [{ bearerAuth: [] }], responses: { "200": { description: "Role list" } } },
      post: { tags: ["Foundation"], summary: "Create role", security: [{ bearerAuth: [] }], responses: { "201": { description: "Created" }, "403": { description: "Forbidden" } } },
    },
    "/roles/{id}": {
      get: { tags: ["Foundation"], summary: "Get single role", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Role with permissions" } } },
      patch: { tags: ["Foundation"], summary: "Update role", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Updated" } } },
    },
    "/roles/{id}/permissions": {
      get: { tags: ["Foundation"], summary: "Get role permissions", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Permission list" } } },
      put: { tags: ["Foundation"], summary: "Assign permissions to role", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Permissions assigned" }, "403": { description: "Forbidden — requires rbac.permission.assign" } } },
    },
    "/permissions": {
      get: { tags: ["Foundation"], summary: "List all permissions (110+)", security: [{ bearerAuth: [] }], responses: { "200": { description: "Permission catalog" } } },
    },
    "/audit": {
      get: { tags: ["Foundation"], summary: "List audit entries (filtered)", security: [{ bearerAuth: [] }], parameters: [{ name: "entity_type", in: "query", schema: { type: "string" } }, { name: "actor_id", in: "query", schema: { type: "string" } }, { name: "action", in: "query", schema: { type: "string" } }, { name: "date_from", in: "query", schema: { type: "string", format: "date" } }, { name: "date_to", in: "query", schema: { type: "string", format: "date" } }], responses: { "200": { description: "Paginated audit entries" } } },
    },
    "/audit/{id}": {
      get: { tags: ["Foundation"], summary: "Get single audit entry with field-diff", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Entry with old→new diff array" } } },
    },
    "/audit/export": {
      get: { tags: ["Foundation"], summary: "Export audit CSV", security: [{ bearerAuth: [] }], responses: { "200": { description: "CSV file download" }, "403": { description: "Forbidden — requires audit.export" } } },
    },

    // --- People ---
    "/students": {
      get: { tags: ["People"], summary: "List students", security: [{ bearerAuth: [] }], parameters: [{ name: "search", in: "query", schema: { type: "string" } }, { name: "class_id", in: "query", schema: { type: "string" } }, { name: "status", in: "query", schema: { type: "string" } }], responses: { "200": { description: "Paginated student list" } } },
      post: { tags: ["People"], summary: "Create student", security: [{ bearerAuth: [] }], responses: { "201": { description: "Created" }, "403": { description: "Forbidden — requires students.create" } } },
    },
    "/students/{id}": {
      get: { tags: ["People"], summary: "Get student profile", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Student with guardian + class" } } },
      patch: { tags: ["People"], summary: "Update student", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Updated" } } },
      delete: { tags: ["People"], summary: "Soft delete student", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Withdrawn" } } },
    },
    "/students/{id}/promote": {
      post: { tags: ["People"], summary: "Promote student (Risk R4)", description: "Creates StudentHistory record preserving old assignment.", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Promoted" }, "403": { description: "Forbidden — requires students.promote" } } },
    },
    "/students/{id}/history": {
      get: { tags: ["People"], summary: "Get promotion history timeline", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "History timeline" } } },
    },
    "/admissions": {
      get: { tags: ["People"], summary: "List admissions", security: [{ bearerAuth: [] }], responses: { "200": { description: "Paginated list" } } },
      post: { tags: ["People"], summary: "Create admission application", security: [{ bearerAuth: [] }], responses: { "201": { description: "Application created" } } },
    },
    "/admissions/{id}": {
      get: { tags: ["People"], summary: "Get admission", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Admission" } } },
      patch: { tags: ["People"], summary: "Update admission", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Updated" } } },
    },
    "/admissions/{id}/status": {
      patch: { tags: ["People"], summary: "Move admission between stages", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Status updated" }, "409": { description: "Invalid transition" } } },
    },
    "/admissions/{id}/register": {
      post: { tags: ["People"], summary: "Register student from admission", description: "Auto-creates Student + FeePlan + User account.", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Student registered" }, "409": { description: "Not approved yet" } } },
    },
    "/guardians": {
      get: { tags: ["People"], summary: "List guardians", security: [{ bearerAuth: [] }], responses: { "200": { description: "Paginated list" } } },
      post: { tags: ["People"], summary: "Create guardian", security: [{ bearerAuth: [] }], responses: { "201": { description: "Created" } } },
    },
    "/guardians/{id}": {
      get: { tags: ["People"], summary: "Get guardian", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Guardian with children" } } },
      patch: { tags: ["People"], summary: "Update guardian", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Updated" } } },
      delete: { tags: ["People"], summary: "Soft delete guardian", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Deleted" } } },
    },
    "/guardians/{id}/children": {
      get: { tags: ["People"], summary: "List guardian's children", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Student list" } } },
    },
    "/teachers": {
      get: { tags: ["People"], summary: "List teachers", security: [{ bearerAuth: [] }], responses: { "200": { description: "Paginated list" } } },
      post: { tags: ["People"], summary: "Create teacher", security: [{ bearerAuth: [] }], responses: { "201": { description: "Created" } } },
    },
    "/teachers/{id}": {
      get: { tags: ["People"], summary: "Get teacher", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Teacher with assignments" } } },
      patch: { tags: ["People"], summary: "Update teacher", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Updated" } } },
    },
    "/teachers/assign": {
      post: { tags: ["People"], summary: "Assign teacher to class+subject", description: "Returns 409 on duplicate active assignment.", security: [{ bearerAuth: [] }], responses: { "201": { description: "Assigned" }, "409": { description: "Duplicate assignment" } } },
    },
    "/teachers/{id}/assignments": {
      get: { tags: ["People"], summary: "List teacher assignments", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Assignment list" } } },
    },
    "/employees": {
      get: { tags: ["People"], summary: "List employees", security: [{ bearerAuth: [] }], responses: { "200": { description: "Paginated list" } } },
      post: { tags: ["People"], summary: "Create employee", description: "Provisions User account with temp password. Auto-generates EMP code.", security: [{ bearerAuth: [] }], responses: { "201": { description: "Created" } } },
    },
    "/employees/{id}": {
      get: { tags: ["People"], summary: "Get employee", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Employee" } } },
      patch: { tags: ["People"], summary: "Update employee", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Updated" } } },
      delete: { tags: ["People"], summary: "Soft delete employee (disables User)", description: "SRS §2.6.6: resigned employee cannot log in.", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Resigned" } } },
    },

    // --- Academic ---
    "/classes": {
      get: { tags: ["Academic"], summary: "List classes", security: [{ bearerAuth: [] }], responses: { "200": { description: "Class list with sections" } } },
      post: { tags: ["Academic"], summary: "Create class", security: [{ bearerAuth: [] }], responses: { "201": { description: "Created" }, "403": { description: "Forbidden — requires academic.structure.edit" } } },
    },
    "/classes/{id}": {
      get: { tags: ["Academic"], summary: "Get class", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Class with sections + stats" } } },
      patch: { tags: ["Academic"], summary: "Update class", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Updated" } } },
      delete: { tags: ["Academic"], summary: "Soft delete class (409 if has students)", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Deleted" }, "409": { description: "Has active students" } } },
    },
    "/classes/{id}/sections": {
      get: { tags: ["Academic"], summary: "List sections for a class", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Section list" } } },
      post: { tags: ["Academic"], summary: "Create section", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "201": { description: "Created" } } },
    },
    "/classes/{id}/routine": {
      get: { tags: ["Academic"], summary: "List routine entries", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Routine" } } },
      post: { tags: ["Academic"], summary: "Create routine entry", description: "Returns 409 if teacher is double-booked.", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "201": { description: "Created" }, "409": { description: "Teacher double-booked" } } },
    },
    "/subjects": {
      get: { tags: ["Academic"], summary: "List subjects", security: [{ bearerAuth: [] }], responses: { "200": { description: "Paginated list" } } },
      post: { tags: ["Academic"], summary: "Create subject", security: [{ bearerAuth: [] }], responses: { "201": { description: "Created" } } },
    },
    "/subjects/{id}": {
      get: { tags: ["Academic"], summary: "Get subject", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Subject with stats" } } },
      patch: { tags: ["Academic"], summary: "Update subject", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Updated" } } },
    },
    "/attendance/sessions": {
      get: { tags: ["Academic"], summary: "List attendance sessions", security: [{ bearerAuth: [] }], responses: { "200": { description: "Paginated list" } } },
      post: { tags: ["Academic"], summary: "Submit attendance (Risk R6)", description: "Idempotent via Idempotency-Key header. Default present. Creates session + records in transaction.", security: [{ bearerAuth: [] }], responses: { "201": { description: "Created" }, "200": { description: "Idempotent replay" } } },
    },
    "/attendance/sessions/{id}": {
      get: { tags: ["Academic"], summary: "Get attendance session with records", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Session with all records" } } },
      patch: { tags: ["Academic"], summary: "Update records (409 if locked)", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Updated" }, "409": { description: "Locked" } } },
      delete: { tags: ["Academic"], summary: "Soft delete session (409 if locked)", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Deleted" } } },
    },
    "/exams": {
      get: { tags: ["Academic"], summary: "List exams", security: [{ bearerAuth: [] }], responses: { "200": { description: "Paginated list" } } },
      post: { tags: ["Academic"], summary: "Create exam", security: [{ bearerAuth: [] }], responses: { "201": { description: "Created" } } },
    },
    "/exams/{id}": {
      get: { tags: ["Academic"], summary: "Get exam with marks summary", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Exam with avg/pass rate" } } },
      patch: { tags: ["Academic"], summary: "Update exam (409 if published)", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Updated" }, "409": { description: "Published" } } },
      delete: { tags: ["Academic"], summary: "Soft delete exam (409 if published)", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Deleted" } } },
    },
    "/exams/{id}/marks": {
      get: { tags: ["Academic"], summary: "List marks for exam", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Marks with student info" } } },
      put: { tags: ["Academic"], summary: "Enter/update marks (batch)", description: "Validates mark > full_marks → 400. Blocked if published (409).", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Marks saved" }, "400": { description: "Mark exceeds full marks" }, "409": { description: "Published" } } },
    },
    "/exams/{id}/publish": {
      post: { tags: ["Academic"], summary: "Publish exam (locks paper)", description: "Blocks if no marks entered (400). Audit logged.", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Published" } } },
      delete: { tags: ["Academic"], summary: "Unpublish exam (unlock)", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Unpublished" } } },
    },
    "/results": {
      get: { tags: ["Academic"], summary: "List results (Risk R7)", description: "Position column only included when ranking_enabled=true.", security: [{ bearerAuth: [] }], responses: { "200": { description: "Paginated results" } } },
    },
    "/results/{studentId}": {
      get: { tags: ["Academic"], summary: "Get student mark sheet", security: [{ bearerAuth: [] }], parameters: [{ name: "studentId", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Full mark sheet with per-subject breakdown" } } },
    },
    "/results/generate": {
      post: { tags: ["Academic"], summary: "Generate results for an exam", description: "Computes GPA + grade + division + position. Blocked if exam not published (409).", security: [{ bearerAuth: [] }], responses: { "200": { description: "Results generated" }, "409": { description: "Exam not published" } } },
    },

    // --- Finance ---
    "/fees/plans": {
      get: { tags: ["Finance"], summary: "List fee plans", security: [{ bearerAuth: [] }], responses: { "200": { description: "Paginated list" } } },
      post: { tags: ["Finance"], summary: "Create fee plan + installments", security: [{ bearerAuth: [] }], responses: { "201": { description: "Created" } } },
    },
    "/fees/plans/{id}": {
      get: { tags: ["Finance"], summary: "Get fee plan with installments + payments", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Plan with summary" } } },
      patch: { tags: ["Finance"], summary: "Update fee plan", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Updated" } } },
    },
    "/fees/payments": {
      get: { tags: ["Finance"], summary: "List fee payments", security: [{ bearerAuth: [] }], responses: { "200": { description: "Paginated list" } } },
      post: { tags: ["Finance"], summary: "Collect payment (Golden Flow)", description: "Creates FeePayment + balanced LedgerEntry + updates installment + account balances. Idempotency-Key supported. Audit logged.", security: [{ bearerAuth: [] }], responses: { "201": { description: "Payment collected + receipt issued" }, "400": { description: "Exceeds remaining balance" } } },
    },
    "/fees/payments/{id}": {
      get: { tags: ["Finance"], summary: "Get payment receipt", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Receipt with student/guardian info" } } },
    },
    "/fees/outstanding": {
      get: { tags: ["Finance"], summary: "Outstanding fees report (Risk R12)", description: "Returns 'as_of' timestamp + per-student breakdown.", security: [{ bearerAuth: [] }], responses: { "200": { description: "Outstanding report" } } },
    },
    "/scholarships": {
      get: { tags: ["Finance"], summary: "List scholarships", security: [{ bearerAuth: [] }], responses: { "200": { description: "Paginated list" } } },
      post: { tags: ["Finance"], summary: "Create scholarship (Risk R8)", description: "≥50% or ≥৳10K → pending (approval queue). < threshold → auto-approved.", security: [{ bearerAuth: [] }], responses: { "201": { description: "Created" } } },
    },
    "/scholarships/{id}": {
      get: { tags: ["Finance"], summary: "Get scholarship", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Scholarship" } } },
      patch: { tags: ["Finance"], summary: "Update scholarship (409 if closed/revoked)", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Updated" } } },
      delete: { tags: ["Finance"], summary: "Revoke scholarship (reverses fee plan)", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Revoked" } } },
    },
    "/scholarships/{id}/approve": {
      post: { tags: ["Finance"], summary: "Approve/reject scholarship", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Approved/Rejected" }, "409": { description: "Not pending" } } },
    },
    "/accounts": {
      get: { tags: ["Finance"], summary: "List accounts (chart of accounts)", security: [{ bearerAuth: [] }], responses: { "200": { description: "Account list" } } },
      post: { tags: ["Finance"], summary: "Create account", security: [{ bearerAuth: [] }], responses: { "201": { description: "Created" } } },
    },
    "/ledger": {
      get: { tags: ["Finance"], summary: "List ledger entries (with running balance)", security: [{ bearerAuth: [] }], responses: { "200": { description: "Paginated entries" } } },
      post: { tags: ["Finance"], summary: "Post balanced entry (Golden Flow)", description: "Validates debit≠credit + fund isolation (C6/D18). ≥৳25K → pending.", security: [{ bearerAuth: [] }], responses: { "201": { description: "Posted" }, "400": { description: "Same account / fund mismatch" } } },
    },
    "/ledger/{id}": {
      get: { tags: ["Finance"], summary: "Get single ledger entry", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Entry with account details" } } },
      patch: { tags: ["Finance"], summary: "Approve/reject pending entry", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Approved/Rejected" } } },
    },
    "/ledger/statement": {
      get: { tags: ["Finance"], summary: "Account statement (opening/closing balance)", security: [{ bearerAuth: [] }], parameters: [{ name: "account_id", in: "query", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Statement with running balance" } } },
    },
    "/cashbank/transfer": {
      post: { tags: ["Finance"], summary: "Transfer between accounts", description: "Both legs in one balanced ledger entry. Fund isolation enforced.", security: [{ bearerAuth: [] }], responses: { "201": { description: "Transfer completed" }, "400": { description: "Same account / insufficient balance / fund mismatch" } } },
    },
    "/cashbank/transfers": {
      get: { tags: ["Finance"], summary: "List transfers", security: [{ bearerAuth: [] }], responses: { "200": { description: "Paginated list" } } },
    },
    "/cashbank/transfers/{id}": {
      get: { tags: ["Finance"], summary: "Get single transfer with ledger", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Transfer with linked ledger" } } },
    },
    "/zakat": {
      get: { tags: ["Finance"], summary: "Zakat dashboard (Risk R9)", description: "Fund-isolated. Zakat badge on every row. Non-Zakat accounts greyed.", security: [{ bearerAuth: [] }], responses: { "200": { description: "Dashboard with balance + transactions" } } },
    },
    "/zakat/receive": {
      post: { tags: ["Finance"], summary: "Receive Zakat", description: "Posts to Zakat fund account only (C6/D18). Balanced ledger fund='zakat'.", security: [{ bearerAuth: [] }], responses: { "201": { description: "Received + receipt" }, "400": { description: "Account fund mismatch" } } },
    },
    "/zakat/distribute": {
      post: { tags: ["Finance"], summary: "Distribute Zakat (Risk R9)", description: "Validates amount ≤ fund balance (400 with fund badge if exceeds).", security: [{ bearerAuth: [] }], responses: { "201": { description: "Distributed" }, "400": { description: "Exceeds fund balance" } } },
    },
    "/donations": {
      get: { tags: ["Finance"], summary: "List donations", security: [{ bearerAuth: [] }], responses: { "200": { description: "Paginated list with summary" } } },
      post: { tags: ["Finance"], summary: "Create donation (Risk R10 — PUBLIC)", description: "No auth required (middleware bypass). Honeypot field. Email/mobile mandatory. Zakat donations post to Zakat fund.", security: [], responses: { "201": { description: "Donation received + receipt" }, "400": { description: "Email/mobile required" } } },
    },
    "/donations/{id}": {
      get: { tags: ["Finance"], summary: "Get donation receipt (PUBLIC)", description: "Public access for receipt verification — no auth required.", security: [], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Receipt with org info" } } },
    },

    // --- Operations ---
    "/inventory": {
      get: { tags: ["Operations"], summary: "List inventory items", security: [{ bearerAuth: [] }], responses: { "200": { description: "Paginated list" } } },
      post: { tags: ["Operations"], summary: "Create item", security: [{ bearerAuth: [] }], responses: { "201": { description: "Created" } } },
    },
    "/inventory/{id}": {
      get: { tags: ["Operations"], summary: "Get item", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Item with recent purchases" } } },
      patch: { tags: ["Operations"], summary: "Update item", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Updated" } } },
      delete: { tags: ["Operations"], summary: "Soft delete (409 if stock > 0)", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Deleted" } } },
    },
    "/inventory/receive": {
      post: { tags: ["Operations"], summary: "Receive stock", security: [{ bearerAuth: [] }], responses: { "200": { description: "Stock increased" } } },
    },
    "/inventory/issue": {
      post: { tags: ["Operations"], summary: "Issue stock (validates qty ≤ stock → 400)", security: [{ bearerAuth: [] }], responses: { "200": { description: "Stock issued" }, "400": { description: "Exceeds stock" } } },
    },
    "/purchases": {
      get: { tags: ["Operations"], summary: "List purchases", security: [{ bearerAuth: [] }], responses: { "200": { description: "Paginated list" } } },
      post: { tags: ["Operations"], summary: "Create purchase order", description: "Auto-generates PO number. Calculates total from items.", security: [{ bearerAuth: [] }], responses: { "201": { description: "Created" } } },
    },
    "/purchases/{id}": {
      get: { tags: ["Operations"], summary: "Get purchase with items", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Purchase with items + supplier" } } },
      patch: { tags: ["Operations"], summary: "Update purchase (409 if received/cancelled)", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Updated" } } },
      delete: { tags: ["Operations"], summary: "Cancel purchase (409 if received)", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Cancelled" } } },
    },
    "/purchases/{id}/approve": {
      post: { tags: ["Operations"], summary: "Approve/reject purchase", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Approved/Rejected" } } },
    },
    "/purchases/{id}/receive": {
      post: { tags: ["Operations"], summary: "Receive purchased items", description: "Updates inventory stock + purchase status. Partial receipt supported.", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Items received" }, "409": { description: "Not approved" } } },
    },
    "/suppliers": {
      get: { tags: ["Operations"], summary: "List suppliers", security: [{ bearerAuth: [] }], responses: { "200": { description: "Paginated list with outstanding totals" } } },
      post: { tags: ["Operations"], summary: "Create supplier", security: [{ bearerAuth: [] }], responses: { "201": { description: "Created" } } },
    },
    "/suppliers/{id}": {
      get: { tags: ["Operations"], summary: "Get supplier with purchase history", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Supplier with recent purchases" } } },
      patch: { tags: ["Operations"], summary: "Update supplier", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Updated" } } },
      delete: { tags: ["Operations"], summary: "Soft delete (409 if outstanding > 0)", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Deleted" } } },
    },
    "/assets": {
      get: { tags: ["Operations"], summary: "List assets with summary", security: [{ bearerAuth: [] }], responses: { "200": { description: "Paginated list with total values" } } },
      post: { tags: ["Operations"], summary: "Create asset", security: [{ bearerAuth: [] }], responses: { "201": { description: "Created" } } },
    },
    "/assets/{id}": {
      get: { tags: ["Operations"], summary: "Get asset (with is_disposed flag)", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Asset with disposal info" } } },
      patch: { tags: ["Operations"], summary: "Update asset (status via transfer/dispose only)", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Updated" } } },
      delete: { tags: ["Operations"], summary: "Soft delete (409 if in-use)", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Deleted" } } },
    },
    "/assets/{id}/transfer": {
      post: { tags: ["Operations"], summary: "Transfer asset to another branch", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Transferred" } } },
    },
    "/assets/{id}/dispose": {
      post: { tags: ["Operations"], summary: "Dispose asset (SRS §2.5.4 record kept)", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Disposed — record retained" } } },
    },
    "/hostel/rooms": {
      get: { tags: ["Operations"], summary: "List rooms with occupancy", security: [{ bearerAuth: [] }], responses: { "200": { description: "Rooms with occupied/vacant/maintenance counts" } } },
      post: { tags: ["Operations"], summary: "Create room (+ auto-create beds)", security: [{ bearerAuth: [] }], responses: { "201": { description: "Created" } } },
    },
    "/hostel/beds/{id}/allocate": {
      post: { tags: ["Operations"], summary: "Allocate bed to student (409 if occupied)", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Allocated" }, "409": { description: "Bed occupied" } } },
    },
    "/hostel/beds/{id}/deallocate": {
      post: { tags: ["Operations"], summary: "Vacate bed", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Vacated" } } },
    },
    "/food/meal-plans": {
      get: { tags: ["Operations"], summary: "List meal plans", security: [{ bearerAuth: [] }], responses: { "200": { description: "Paginated list with cost summary" } } },
      post: { tags: ["Operations"], summary: "Create meal plan", security: [{ bearerAuth: [] }], responses: { "201": { description: "Created" } } },
    },
    "/food/expense": {
      post: { tags: ["Operations"], summary: "Record meal expense (Golden Flow)", security: [{ bearerAuth: [] }], responses: { "200": { description: "Expense posted to Operating Expenses" } } },
    },
    "/library/books": {
      get: { tags: ["Operations"], summary: "List books", security: [{ bearerAuth: [] }], responses: { "200": { description: "Paginated list" } } },
      post: { tags: ["Operations"], summary: "Add book", security: [{ bearerAuth: [] }], responses: { "201": { description: "Added" } } },
    },
    "/library/issue": {
      post: { tags: ["Operations"], summary: "Issue book (409 if no copies)", security: [{ bearerAuth: [] }], responses: { "200": { description: "Issued" }, "409": { description: "No copies available" } } },
    },
    "/library/return": {
      post: { tags: ["Operations"], summary: "Return book", security: [{ bearerAuth: [] }], responses: { "200": { description: "Returned" } } },
    },
    "/transport/vehicles": {
      get: { tags: ["Operations"], summary: "List vehicles (with expiry alerts)", security: [{ bearerAuth: [] }], responses: { "200": { description: "Paginated list" } } },
      post: { tags: ["Operations"], summary: "Create vehicle", security: [{ bearerAuth: [] }], responses: { "201": { description: "Created" } } },
    },
    "/transport/fuel": {
      get: { tags: ["Operations"], summary: "List fuel/maintenance logs", security: [{ bearerAuth: [] }], responses: { "200": { description: "Paginated list with cost summary" } } },
      post: { tags: ["Operations"], summary: "Record fuel/maintenance (Golden Flow)", description: "Balanced ledger to Operating Expenses. Updates vehicle value on maintenance.", security: [{ bearerAuth: [] }], responses: { "200": { description: "Expense recorded" } } },
    },

    // --- Communication ---
    "/notices": {
      get: { tags: ["Communication"], summary: "List notices", security: [{ bearerAuth: [] }], responses: { "200": { description: "Paginated list" } } },
      post: { tags: ["Communication"], summary: "Compose + send notice (Risk R11)", description: "Computes recipient_count by audience + filter. Checks notices.send permission.", security: [{ bearerAuth: [] }], responses: { "201": { description: "Notice created" } } },
    },
    "/notices/{id}": {
      get: { tags: ["Communication"], summary: "Get notice", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Notice" } } },
      patch: { tags: ["Communication"], summary: "Update notice", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Updated" } } },
      delete: { tags: ["Communication"], summary: "Soft delete notice", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Deleted" } } },
    },
    "/notices/preview-recipients": {
      post: { tags: ["Communication"], summary: "Preview recipients (Risk R11)", description: "Returns actual recipient names + count before sending.", security: [{ bearerAuth: [] }], responses: { "200": { description: "Recipient list + count" } } },
    },
    "/documents": {
      get: { tags: ["Communication"], summary: "List documents", security: [{ bearerAuth: [] }], responses: { "200": { description: "Paginated list" } } },
      post: { tags: ["Communication"], summary: "Upload document (60MB limit → 413)", description: "Multipart form data. SHA256 hash. Stores to disk.", security: [{ bearerAuth: [] }], responses: { "201": { description: "Uploaded" }, "413": { description: "Exceeds 60MB" } } },
    },
    "/documents/{id}": {
      get: { tags: ["Communication"], summary: "Get document (?download=true for signed URL)", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Document info / signed URL" } } },
      patch: { tags: ["Communication"], summary: "Update document metadata", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Updated" } } },
      delete: { tags: ["Communication"], summary: "Soft delete document", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Deleted" } } },
    },
    "/reports": {
      get: { tags: ["Communication"], summary: "List reports (D3: finance filtered)", security: [{ bearerAuth: [] }], responses: { "200": { description: "Paginated list" } } },
    },
    "/reports/generate": {
      post: { tags: ["Communication"], summary: "Generate report (D3: 403 for finance)", description: "7 report types. Finance types require reports.finance.view. Async job.", security: [{ bearerAuth: [] }], responses: { "201": { description: "Job created" }, "403": { description: "Finance report without permission" } } },
    },
    "/reports/{id}": {
      get: { tags: ["Communication"], summary: "Get report status / download", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Report status / data" } } },
    },
    "/jobs/{id}": {
      get: { tags: ["Platform"], summary: "Poll job status (SRS §6.5)", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Job status + result" } } },
    },
    "/approvals": {
      get: { tags: ["Communication"], summary: "List approvals", security: [{ bearerAuth: [] }], responses: { "200": { description: "Paginated list" } } },
      post: { tags: ["Communication"], summary: "Create approval request", security: [{ bearerAuth: [] }], responses: { "201": { description: "Created" } } },
    },
    "/approvals/pending": {
      get: { tags: ["Communication"], summary: "Pending approvals (D16: excludes self-requests)", security: [{ bearerAuth: [] }], responses: { "200": { description: "Pending list with can_approve flag" } } },
    },
    "/approvals/{id}": {
      get: { tags: ["Communication"], summary: "Get approval with D16 flags", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Approval with can_approve/can_reject/can_delegate" } } },
      delete: { tags: ["Communication"], summary: "Cancel approval (requester only)", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Cancelled" } } },
    },
    "/approvals/{id}/approve": {
      post: { tags: ["Communication"], summary: "Approve (D16: 403 if self-approve)", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Approved" }, "403": { description: "Cannot approve own request (D16)" } } },
    },
    "/approvals/{id}/reject": {
      post: { tags: ["Communication"], summary: "Reject (D16: 403 if self-reject)", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Rejected" }, "403": { description: "Cannot reject own request (D16)" } } },
    },
    "/approvals/{id}/delegate": {
      post: { tags: ["Communication"], summary: "Delegate (Risk R15; D16: cannot delegate to requester)", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { "200": { description: "Delegated" } } },
    },
  },
} as const;
