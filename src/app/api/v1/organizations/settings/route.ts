/**
 * MadrashaOS — Organization Settings API (Phase 5)
 *
 * GET  /api/v1/organizations/settings — any tenant user can view
 *   Returns the public subset of settings (locale, branding, currency).
 *   Used by the app layout to apply branding (CSS variables, logo, title).
 *
 * PATCH /api/v1/organizations/settings — organization.config.edit
 *   Updates branding (primaryColor, logoUrl), locale, academicYearStart,
 *   featureFlags. Validates the JSON shape + hex color format.
 *
 * No new table — settings are stored as JSON in Organization.settings.
 */

import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse } from "@/lib/api/helpers";
import { z } from "zod";
import {
  mergeSettings, isValidHexColor, DEFAULT_PRIMARY_COLOR,
  type OrgSettings,
} from "@/lib/tenant/org-settings";

export const dynamic = "force-dynamic";

/** GET — any tenant user can view their org's settings */
export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const org = await db.organization.findFirst({
    where: { id: ctx.organization_id, deleted_at: null },
    select: { id: true, name: true, name_bn: true, code: true, settings: true },
  });
  if (!org) return errorResponse("Organization not found", 404);

  const settings = mergeSettings(org.settings);

  return jsonResponse({
    data: {
      organization: {
        id: org.id,
        name: org.name,
        name_bn: org.name_bn,
        code: org.code,
      },
      settings,
    },
  });
}

const patchSchema = z.object({
  locale: z.enum(["en", "bn", "ar"]).optional(),
  currency: z.enum(["BDT"]).optional(),
  academicYearStart: z.enum(["January", "April", "July"]).optional(),
  branding: z.object({
    primaryColor: z.string().optional(),
    logoUrl: z.string().nullable().optional(),
    faviconUrl: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
  }).optional(),
  featureFlags: z.record(z.string(), z.boolean()).optional(),
  notificationPreferences: z.object({
    emailEnabled: z.boolean().optional(),
    smsEnabled: z.boolean().optional(),
  }).optional(),
});

/** PATCH — only users with organization.config.edit can update settings */
export const PATCH = withPermission("organization.config.edit", async (req: Request) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse("Invalid JSON", 400); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());
  const data = parsed.data;

  // Fetch the current org + settings
  const org = await db.organization.findFirst({
    where: { id: ctx.organization_id, deleted_at: null },
    select: { id: true, settings: true },
  });
  if (!org) return errorResponse("Organization not found", 404);

  // Merge the patch into the existing settings (deep merge for branding)
  const current = mergeSettings(org.settings);
  const updated: OrgSettings = {
    ...current,
    ...data,
    branding: {
      ...current.branding,
      ...data.branding,
    },
    notificationPreferences: {
      ...current.notificationPreferences,
      ...data.notificationPreferences,
    },
    featureFlags: {
      ...current.featureFlags,
      ...data.featureFlags,
    },
  };

  // Validate the primary color if provided
  if (updated.branding?.primaryColor && !isValidHexColor(updated.branding.primaryColor)) {
    return errorResponse(
      `Invalid primary color "${updated.branding.primaryColor}". Must be a hex color like #0F766E or #0F7.`,
      400,
    );
  }

  // Save
  await db.organization.update({
    where: { id: org.id },
    data: {
      settings: updated as never,
      updated_by: ctx.user_id,
    },
  });

  // Audit log
  await db.auditLog.create({
    data: {
      organization_id: ctx.organization_id,
      branch_id: ctx.branch_id ?? null,
      entity_type: "organizations",
      entity_id: org.id,
      action: "update_settings",
      old_values: current as never,
      new_values: updated as never,
      actor_user_id: ctx.user_id,
    } as never,
  });

  return jsonResponse({
    data: { settings: updated },
    message: "Settings updated successfully",
  });
});
