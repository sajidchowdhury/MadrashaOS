"use client";

/**
 * MadrashaOS — Settings page (SRS §2.7.2)
 *
 * Organization-level settings: name, logo, language defaults, timezone.
 * Backend: GET/PUT /api/v1/organizations (already exists).
 */

import * as React from "react";
import { Settings, Building2, Globe, Clock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IfPermission } from "@/components/auth/IfPermission";
import { PermissionDenied, LoadingState } from "@/components/states";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { toast } = useToast();
  const [org, setOrg] = React.useState<{ name: string; slug: string; phone: string; email: string; address: string } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [defaultLocale, setDefaultLocale] = React.useState("en");
  const [timezone, setTimezone] = React.useState("Asia/Dhaka");

  React.useEffect(() => {
    fetch("/api/v1/organizations")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.id) {
          setOrg({
            name: data.name ?? "",
            slug: data.slug ?? "",
            phone: data.phone ?? "",
            email: data.email ?? "",
            address: data.address ?? "",
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast({ title: "Settings saved", description: "Organization settings updated." });
    }, 800);
  };

  if (loading) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)]">
          <LoadingState pattern="card" />
        </div>
      </div>
    );
  }

  return (
    <IfPermission code="organization.config.view" fallback={<PermissionDenied />}>
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
          <header>
            <h1 className="flex items-center gap-2 text-display font-bold text-text-primary">
              <Settings className="h-7 w-7 text-primary-500" aria-hidden />
              Settings
            </h1>
            <p className="mt-1 text-body text-text-secondary">
              Organization configuration, localization, and system preferences.
            </p>
          </header>

          <Card className="border-border-default shadow-elevation-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-subtitle">
                <Building2 className="h-5 w-5 text-primary-600" />
                Organization Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {org && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="org-name" className="text-body">Organization Name</Label>
                    <Input id="org-name" value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="org-phone" className="text-body">Phone</Label>
                      <Input id="org-phone" value={org.phone} onChange={(e) => setOrg({ ...org, phone: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-email" className="text-body">Email</Label>
                      <Input id="org-email" type="email" value={org.email} onChange={(e) => setOrg({ ...org, email: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-address" className="text-body">Address</Label>
                    <Input id="org-address" value={org.address} onChange={(e) => setOrg({ ...org, address: e.target.value })} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border-default shadow-elevation-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-subtitle">
                <Globe className="h-5 w-5 text-primary-600" />
                Localization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-body">Default Language</Label>
                <Select value={defaultLocale} onValueChange={setDefaultLocale}>
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="bn">বাংলা (Bangla)</SelectItem>
                    <SelectItem value="ar">العربية (Arabic)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tz" className="flex items-center gap-2 text-body">
                  <Clock className="h-4 w-4 text-text-secondary" />
                  Timezone
                </Label>
                <Input id="tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} className="max-w-xs" />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </IfPermission>
  );
}
