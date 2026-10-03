"use client";

/**
 * MadrashaOS — Branding Settings Page (Phase 5)
 *
 * Route: /settings/branding
 *
 * Per-tenant customization: logo URL, primary color, default locale,
 * academic year start month. Changes are applied immediately via the
 * app layout's CSS variable injection.
 *
 * Permission: organization.config.edit
 */

import * as React from "react";
import {
  Palette, Building2, Globe, CalendarDays, Save, Loader2,
  AlertCircle, CheckCircle2, RotateCcw, ImageIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { IfPermission } from "@/components/auth/IfPermission";
import { PermissionDenied, LoadingState, ErrorState } from "@/components/states";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_PRIMARY_COLOR, isValidHexColor, type OrgSettings } from "@/lib/tenant/org-settings";

type SettingsData = {
  organization: { id: string; name: string; name_bn: string; code: string };
  settings: OrgSettings;
};

const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  bn: "বাংলা (Bengali)",
  ar: "العربية (Arabic)",
};

const ACADEMIC_YEAR_STARTS = ["January", "April", "July"] as const;

export default function BrandingSettingsPage() {
  const { toast } = useToast();
  const [data, setData] = React.useState<SettingsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Editable form state
  const [primaryColor, setPrimaryColor] = React.useState(DEFAULT_PRIMARY_COLOR);
  const [logoUrl, setLogoUrl] = React.useState("");
  const [faviconUrl, setFaviconUrl] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [locale, setLocale] = React.useState<"en" | "bn" | "ar">("en");
  const [academicYearStart, setAcademicYearStart] = React.useState<"January" | "April" | "July">("January");
  const [colorError, setColorError] = React.useState<string | null>(null);

  const fetchSettings = React.useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/v1/organizations/settings", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.data);
      const s = json.data.settings;
      setPrimaryColor(s.branding?.primaryColor ?? DEFAULT_PRIMARY_COLOR);
      setLogoUrl(s.branding?.logoUrl ?? "");
      setFaviconUrl(s.branding?.faviconUrl ?? "");
      setDisplayName(s.branding?.displayName ?? "");
      setLocale(s.locale ?? "en");
      setAcademicYearStart(s.academicYearStart ?? "January");
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => { fetchSettings(); }, [fetchSettings]);

  function handleColorChange(value: string) {
    setPrimaryColor(value);
    if (value && !isValidHexColor(value)) {
      setColorError("Invalid hex color. Use format #0F766E or #0F7.");
    } else {
      setColorError(null);
    }
  }

  async function handleSave() {
    if (colorError) {
      toast({ title: "Fix errors first", description: colorError, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/v1/organizations/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branding: {
            primaryColor: primaryColor || DEFAULT_PRIMARY_COLOR,
            logoUrl: logoUrl.trim() || null,
            faviconUrl: faviconUrl.trim() || null,
            displayName: displayName.trim() || null,
          },
          locale,
          academicYearStart,
        }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Save failed", description: json?.error || `HTTP ${res.status}`, variant: "destructive" });
        setSaving(false);
        return;
      }
      toast({ title: "Settings saved", description: "Branding updated. Refresh to see changes." });
      setData(json.data);
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    }
    setSaving(false);
  }

  function handleReset() {
    setPrimaryColor(DEFAULT_PRIMARY_COLOR);
    setLogoUrl("");
    setFaviconUrl("");
    setDisplayName("");
    setColorError(null);
  }

  if (loading) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <LoadingState pattern="detail" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <ErrorState onRetry={fetchSettings} />
        </div>
      </div>
    );
  }

  return (
    <IfPermission code="organization.config.edit" fallback={<PermissionDenied resource="Branding Settings" />}>
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-2xl space-y-6">
          <header>
            <h1 className="flex items-center gap-2 text-display font-bold text-text-primary">
              <Palette className="h-7 w-7 text-primary-500" aria-hidden />
              Branding & Customization
            </h1>
            <p className="mt-1 text-body text-text-secondary">
              Customize how MadrashaOS looks for your organization.
            </p>
          </header>

          {/* Live preview */}
          <Card className="border-primary-200">
            <CardHeader>
              <CardTitle className="text-subtitle">Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="flex items-center gap-3 rounded-lg p-4"
                style={{ backgroundColor: primaryColor + "15" }}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-12 w-12 rounded-lg object-contain" />
                ) : (
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-lg text-headline font-bold text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {(displayName || data?.organization.name || "M").charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-subtitle font-bold text-text-primary">
                    {displayName || data?.organization.name || "MadrashaOS"}
                  </p>
                  <Badge
                    variant="outline"
                    className="mt-0.5"
                    style={{ backgroundColor: primaryColor + "20", color: primaryColor, borderColor: primaryColor + "40" }}
                  >
                    {data?.organization.code}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Branding form */}
          <Card className="border-border-default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-subtitle">
                <Building2 className="h-5 w-5 text-primary-500" />
                Branding
              </CardTitle>
              <CardDescription>Logo, colors, and display name.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Display name */}
              <div className="space-y-1.5">
                <Label htmlFor="display-name">Display Name (optional)</Label>
                <Input
                  id="display-name"
                  placeholder={data?.organization.name ?? "MadrashaOS"}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={100}
                />
                <p className="text-caption text-text-muted">
                  Overrides the organization name shown in the header. Leave empty to use the default.
                </p>
              </div>

              {/* Primary color */}
              <div className="space-y-1.5">
                <Label htmlFor="primary-color">Primary Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="h-10 w-12 cursor-pointer rounded-md border border-border-default"
                    aria-label="Color picker"
                  />
                  <Input
                    id="primary-color"
                    value={primaryColor}
                    onChange={(e) => handleColorChange(e.target.value)}
                    placeholder={DEFAULT_PRIMARY_COLOR}
                    className="font-mono flex-1"
                    maxLength={7}
                  />
                  <Button variant="outline" size="sm" onClick={() => handleColorChange(DEFAULT_PRIMARY_COLOR)}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </Button>
                </div>
                {colorError ? (
                  <p className="flex items-center gap-1.5 text-caption text-semantic-danger">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {colorError}
                  </p>
                ) : (
                  <p className="text-caption text-text-muted">
                    Default: <code className="font-mono">{DEFAULT_PRIMARY_COLOR}</code> (Deep Teal)
                  </p>
                )}
              </div>

              {/* Logo URL */}
              <div className="space-y-1.5">
                <Label htmlFor="logo-url">
                  <ImageIcon className="me-1.5 inline h-3.5 w-3.5" />
                  Logo URL
                </Label>
                <Input
                  id="logo-url"
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                />
                <p className="text-caption text-text-muted">
                  Upload your logo to a hosting service (or Vercel Blob) and paste the URL here.
                  Recommended: 512×512px PNG with transparent background.
                </p>
                {logoUrl && (
                  <div className="mt-2 flex items-center gap-3 rounded-md border border-border-default p-2">
                    <img src={logoUrl} alt="Logo preview" className="h-10 w-10 rounded object-contain" />
                    <Button variant="ghost" size="sm" onClick={() => setLogoUrl("")}>
                      Remove
                    </Button>
                  </div>
                )}
              </div>

              {/* Favicon URL */}
              <div className="space-y-1.5">
                <Label htmlFor="favicon-url">Favicon URL (optional)</Label>
                <Input
                  id="favicon-url"
                  type="url"
                  placeholder="https://example.com/favicon.ico"
                  value={faviconUrl}
                  onChange={(e) => setFaviconUrl(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Locale + academic year */}
          <Card className="border-border-default">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-subtitle">
                <Globe className="h-5 w-5 text-primary-500" />
                Locale & Academic Year
              </CardTitle>
              <CardDescription>Default language and academic year settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Locale */}
              <div className="space-y-1.5">
                <Label htmlFor="locale">Default Language</Label>
                <Select value={locale} onValueChange={(v) => setLocale(v as "en" | "bn" | "ar")}>
                  <SelectTrigger id="locale" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LOCALE_LABELS).map(([code, label]) => (
                      <SelectItem key={code} value={code}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-caption text-text-muted">
                  The default UI language for new users. Individual users can override this in their preferences.
                </p>
              </div>

              {/* Academic year start */}
              <div className="space-y-1.5">
                <Label htmlFor="academic-year-start">
                  <CalendarDays className="me-1.5 inline h-3.5 w-3.5" />
                  Academic Year Starts
                </Label>
                <Select
                  value={academicYearStart}
                  onValueChange={(v) => setAcademicYearStart(v as "January" | "April" | "July")}
                >
                  <SelectTrigger id="academic-year-start" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACADEMIC_YEAR_STARTS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-caption text-text-muted">
                  When the academic year begins (affects fee plans, attendance sessions, etc.)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save bar */}
          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" onClick={handleReset} disabled={saving}>
              <RotateCcw className="h-4 w-4" />
              Reset to defaults
            </Button>
            <Button onClick={handleSave} disabled={saving || !!colorError}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>

          {/* Note */}
          <div className="flex items-start gap-3 rounded-lg border border-semantic-info/30 bg-blue-50 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <p className="text-body font-medium text-blue-900">How branding works</p>
              <p className="mt-1 text-caption text-blue-800">
                Changes are applied immediately. The primary color updates the sidebar, buttons,
                and headers. The logo appears in the top bar. Users may need to refresh the page
                to see all changes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </IfPermission>
  );
}
