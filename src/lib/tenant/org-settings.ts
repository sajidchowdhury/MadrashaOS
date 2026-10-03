/**
 * MadrashaOS — Organization Settings Type (Phase 5)
 *
 * The shape of the `Organization.settings` JSON field.
 * Per-tenant customization: branding, locale, feature flags, etc.
 *
 * No new table — this is stored as JSON in `Organization.settings`.
 */

export type OrgSettings = {
  /** Default UI locale for this madrasha */
  locale?: "en" | "bn" | "ar";
  /** Currency for financial displays (future: multi-currency) */
  currency?: "BDT";
  /** When the academic year starts */
  academicYearStart?: "January" | "April" | "July";

  /** Visual branding */
  branding?: {
    /** Hex color for primary UI elements (defaults to #0F766E teal) */
    primaryColor?: string;
    /** URL to the uploaded logo */
    logoUrl?: string | null;
    /** URL to the favicon */
    faviconUrl?: string | null;
    /** Organization display name override (falls back to Organization.name) */
    displayName?: string | null;
  };

  /** Feature flags — merge with ModuleConfig rows */
  featureFlags?: {
    [key: string]: boolean;
  };

  /** Notification preferences (stub for future email/SMS phase) */
  notificationPreferences?: {
    emailEnabled?: boolean;
    smsEnabled?: boolean;
  };
};

/** Default settings applied when an org is provisioned */
export const DEFAULT_ORG_SETTINGS: OrgSettings = {
  locale: "en",
  currency: "BDT",
  academicYearStart: "January",
  branding: {
    primaryColor: "#0F766E",
    logoUrl: null,
    faviconUrl: null,
    displayName: null,
  },
  featureFlags: {},
  notificationPreferences: {
    emailEnabled: false,
    smsEnabled: false,
  },
};

/** The default teal primary color (from the design system) */
export const DEFAULT_PRIMARY_COLOR = "#0F766E";

/**
 * Validate a hex color string (#RGB or #RRGGBB).
 * Rejects invalid formats to prevent layout breakage.
 */
export function isValidHexColor(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}

/**
 * Merge persisted settings with defaults so missing fields fall back.
 */
export function mergeSettings(persisted: unknown): OrgSettings {
  if (!persisted || typeof persisted !== "object") return { ...DEFAULT_ORG_SETTINGS };
  const s = persisted as Record<string, unknown>;
  return {
    locale: (s.locale as OrgSettings["locale"]) ?? DEFAULT_ORG_SETTINGS.locale,
    currency: (s.currency as OrgSettings["currency"]) ?? DEFAULT_ORG_SETTINGS.currency,
    academicYearStart: (s.academicYearStart as OrgSettings["academicYearStart"]) ?? DEFAULT_ORG_SETTINGS.academicYearStart,
    branding: {
      primaryColor: (s.branding as Record<string, unknown>)?.primaryColor as string ?? DEFAULT_PRIMARY_COLOR,
      logoUrl: (s.branding as Record<string, unknown>)?.logoUrl as string | null ?? null,
      faviconUrl: (s.branding as Record<string, unknown>)?.faviconUrl as string | null ?? null,
      displayName: (s.branding as Record<string, unknown>)?.displayName as string | null ?? null,
    },
    featureFlags: (s.featureFlags as Record<string, boolean>) ?? {},
    notificationPreferences: {
      emailEnabled: (s.notificationPreferences as Record<string, unknown>)?.emailEnabled as boolean ?? false,
      smsEnabled: (s.notificationPreferences as Record<string, unknown>)?.smsEnabled as boolean ?? false,
    },
  };
}
