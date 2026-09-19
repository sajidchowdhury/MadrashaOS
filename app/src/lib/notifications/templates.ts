/**
 * MadrashaOS — Email/SMS Template Registry
 *
 * Phase 4 (P4-LIBS-1)
 *
 * Each template is a pure function: vars in → { subject, html, text }.
 * HTML uses inline styles only (no <style> blocks, no external CSS) so
 * it renders correctly in Gmail/Outlook/Yahoo web clients which strip
 * <style> tags.
 *
 * Bangla text is passed through verbatim — we do NOT transliterate.
 * The HTML is UTF-8 (no entity encoding needed).
 *
 * Variable substitution is naive string replace (`{{key}}`). We avoid
 * a templating engine (Handlebars, etc.) to keep the lib zero-dep.
 */

import type { RenderedTemplate } from "./types";

type Vars = Record<string, string | number | undefined | null>;

/** Substitute {{key}} tokens in a string. Missing keys → empty string. */
function substitute(tpl: string, vars: Vars): string {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
    const v = vars[key];
    return v === undefined || v === null ? "" : String(v);
  });
}

interface TemplateDef {
  subject: string;
  html: string;
  text: string;
}

/**
 * Registry — keyed by template ID. To add a new template, append an
 * entry here. The `renderTemplate()` method on providers looks up by
 * ID and throws `UnknownTemplateError` if missing.
 */
export const TEMPLATES: Record<string, TemplateDef> = {
  // -------------------------------------------------------------------------
  // Donations
  // -------------------------------------------------------------------------
  "donation-receipt": {
    subject: "Donation Receipt {{receiptNo}} — {{orgName}}",
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;">
  <div style="background:#065f46;color:#ffffff;padding:24px;border-radius:8px 8px 0 0;">
    <h1 style="margin:0;font-size:22px;">Donation Receipt</h1>
    <p style="margin:4px 0 0;opacity:0.9;">{{orgName}}</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 8px 8px;">
    <p>Receipt No: <strong>{{receiptNo}}</strong></p>
    <p>Donor: <strong>{{donorName}}</strong></p>
    <p>Donation Type: {{donationType}}</p>
    <p style="font-size:20px;color:#065f46;font-weight:bold;">Amount: ৳{{amount}}</p>
    <p style="margin-top:24px;font-size:13px;color:#6b7280;">May Allah accept your contribution. This receipt is system-generated and valid without signature.</p>
  </div>
</div>`,
    text: `Donation Receipt {{receiptNo}}
{{orgName}}

Receipt No: {{receiptNo}}
Donor: {{donorName}}
Donation Type: {{donationType}}
Amount: ৳{{amount}}

May Allah accept your contribution. This receipt is system-generated and valid without signature.`,
  },

  // -------------------------------------------------------------------------
  // Fees
  // -------------------------------------------------------------------------
  "fee-payment-confirmation": {
    subject: "Fee Payment Confirmed — {{studentName}} ({{receiptNo}})",
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;">
  <div style="background:#065f46;color:#ffffff;padding:24px;border-radius:8px 8px 0 0;">
    <h1 style="margin:0;font-size:22px;">Fee Payment Confirmation</h1>
    <p style="margin:4px 0 0;opacity:0.9;">{{orgName}}</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 8px 8px;">
    <p>Receipt No: <strong>{{receiptNo}}</strong></p>
    <p>Student: <strong>{{studentName}}</strong></p>
    <p>Installment: {{installmentLabel}}</p>
    <p style="font-size:20px;color:#065f46;font-weight:bold;">Amount Paid: ৳{{amount}}</p>
    <p style="margin-top:24px;font-size:13px;color:#6b7280;">Please keep this receipt for your records. For queries, contact the accounts office.</p>
  </div>
</div>`,
    text: `Fee Payment Confirmation
{{orgName}}

Receipt No: {{receiptNo}}
Student: {{studentName}}
Installment: {{installmentLabel}}
Amount Paid: ৳{{amount}}

Please keep this receipt for your records. For queries, contact the accounts office.`,
  },

  // -------------------------------------------------------------------------
  // Admissions
  // -------------------------------------------------------------------------
  "admission-confirmation": {
    subject: "Admission Application Received — {{applicantName}} ({{referenceId}})",
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;">
  <div style="background:#065f46;color:#ffffff;padding:24px;border-radius:8px 8px 0 0;">
    <h1 style="margin:0;font-size:22px;">Admission Application Received</h1>
    <p style="margin:4px 0 0;opacity:0.9;">{{orgName}}</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 8px 8px;">
    <p>Reference ID: <strong>{{referenceId}}</strong></p>
    <p>Applicant: <strong>{{applicantName}}</strong></p>
    <p>Your application has been received and is now under review. Our admissions office will contact you within 3-5 working days.</p>
    <p style="margin-top:24px;font-size:13px;color:#6b7280;">Please quote your Reference ID in all correspondence.</p>
  </div>
</div>`,
    text: `Admission Application Received
{{orgName}}

Reference ID: {{referenceId}}
Applicant: {{applicantName}}

Your application has been received and is now under review. Our admissions office will contact you within 3-5 working days.

Please quote your Reference ID in all correspondence.`,
  },

  "admission-status-update": {
    subject: "Admission Status Update — {{applicantName}} ({{status}})",
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;">
  <div style="background:#065f46;color:#ffffff;padding:24px;border-radius:8px 8px 0 0;">
    <h1 style="margin:0;font-size:22px;">Admission Status Update</h1>
    <p style="margin:4px 0 0;opacity:0.9;">{{orgName}}</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 8px 8px;">
    <p>Applicant: <strong>{{applicantName}}</strong></p>
    <p>Status: <strong style="text-transform:capitalize;">{{status}}</strong></p>
    {{notes}}
    <p style="margin-top:24px;font-size:13px;color:#6b7280;">If you have questions, please contact the admissions office.</p>
  </div>
</div>`,
    text: `Admission Status Update
{{orgName}}

Applicant: {{applicantName}}
Status: {{status}}
{{notes}}

If you have questions, please contact the admissions office.`,
  },

  // -------------------------------------------------------------------------
  // Attendance
  // -------------------------------------------------------------------------
  "attendance-absent-alert": {
    subject: "Absent Alert — {{studentName}} on {{date}}",
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;">
  <div style="background:#b45309;color:#ffffff;padding:24px;border-radius:8px 8px 0 0;">
    <h1 style="margin:0;font-size:22px;">Attendance Alert</h1>
    <p style="margin:4px 0 0;opacity:0.9;">{{orgName}}</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 8px 8px;">
    <p>Dear Guardian,</p>
    <p>This is to inform you that <strong>{{studentName}}</strong> was marked <strong>absent</strong> on <strong>{{date}}</strong> in class <strong>{{className}}</strong>.</p>
    <p>If this is unexpected, please contact the class teacher at your earliest convenience.</p>
  </div>
</div>`,
    text: `Attendance Alert — {{orgName}}

Dear Guardian,
This is to inform you that {{studentName}} was marked absent on {{date}} in class {{className}}.

If this is unexpected, please contact the class teacher at your earliest convenience.`,
  },

  // -------------------------------------------------------------------------
  // Inventory
  // -------------------------------------------------------------------------
  "low-stock-alert": {
    subject: "Low Stock Alert — {{itemName}} ({{itemCode}})",
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;">
  <div style="background:#b45309;color:#ffffff;padding:24px;border-radius:8px 8px 0 0;">
    <h1 style="margin:0;font-size:22px;">Low Stock Alert</h1>
    <p style="margin:4px 0 0;opacity:0.9;">{{orgName}}</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 8px 8px;">
    <p>Item: <strong>{{itemName}}</strong> ({{itemCode}})</p>
    <p>Current Quantity: <strong style="color:#b45309;">{{currentQty}} {{unit}}</strong></p>
    <p>Reorder Level: {{reorderLevel}} {{unit}}</p>
    <p>Please initiate a purchase order to replenish stock.</p>
  </div>
</div>`,
    text: `Low Stock Alert — {{orgName}}

Item: {{itemName}} ({{itemCode}})
Current Quantity: {{currentQty}} {{unit}}
Reorder Level: {{reorderLevel}} {{unit}}

Please initiate a purchase order to replenish stock.`,
  },

  // -------------------------------------------------------------------------
  // Notices
  // -------------------------------------------------------------------------
  "notice-broadcast": {
    subject: "Notice: {{title}}",
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;">
  <div style="background:#065f46;color:#ffffff;padding:24px;border-radius:8px 8px 0 0;">
    <h1 style="margin:0;font-size:22px;">{{title}}</h1>
    <p style="margin:4px 0 0;opacity:0.9;">{{orgName}} · Audience: {{audience}}</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 8px 8px;">
    <p style="white-space:pre-wrap;">{{body}}</p>
  </div>
</div>`,
    text: `Notice: {{title}}
{{orgName}} · Audience: {{audience}}

{{body}}`,
  },

  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------
  "password-reset": {
    subject: "Password Reset Request — {{orgName}}",
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;">
  <div style="background:#065f46;color:#ffffff;padding:24px;border-radius:8px 8px 0 0;">
    <h1 style="margin:0;font-size:22px;">Password Reset</h1>
    <p style="margin:4px 0 0;opacity:0.9;">{{orgName}}</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:0;padding:24px;border-radius:0 0 8px 8px;">
    <p>Hello <strong>{{userName}}</strong>,</p>
    <p>We received a request to reset your password. Click the button below to choose a new password:</p>
    <p style="margin:24px 0;text-align:center;">
      <a href="{{resetLink}}" style="background:#065f46;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Reset Password</a>
    </p>
    <p style="font-size:13px;color:#6b7280;">If you did not request this reset, ignore this email — your password will remain unchanged. This link expires in 30 minutes.</p>
  </div>
</div>`,
    text: `Password Reset — {{orgName}}

Hello {{userName}},

We received a request to reset your password. Open the link below to choose a new password:

{{resetLink}}

If you did not request this reset, ignore this email — your password will remain unchanged. This link expires in 30 minutes.`,
  },
};

/**
 * Render a template by ID. Throws if the template is not registered.
 */
export function renderTemplate(
  templateId: string,
  vars: Vars = {},
): RenderedTemplate {
  const def = TEMPLATES[templateId];
  if (!def) {
    throw new Error(
      `[NotificationService] unknown templateId: "${templateId}". ` +
        `Registered templates: ${Object.keys(TEMPLATES).join(", ")}`,
    );
  }
  return {
    subject: substitute(def.subject, vars),
    html: substitute(def.html, vars),
    text: substitute(def.text, vars),
  };
}

/** List of all registered template IDs — useful for /api/docs. */
export function listTemplateIds(): string[] {
  return Object.keys(TEMPLATES);
}
