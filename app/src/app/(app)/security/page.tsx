"use client";

/**
 * MadrashaOS — Security Policies page (SRS §2.1.5)
 *
 * Session 8.4: Wired to real API — GET /api/v1/security/policy reads the
 * SecurityPolicy table, PUT updates it. The page loads real values on mount
 * and saves changes via the API (was toast-only before).
 */

import * as React from "react";
import { Lock, Shield, KeyRound, Clock, Globe, AlertCircle, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { IfPermission } from "@/components/auth/IfPermission";
import { PermissionDenied, LoadingState, ErrorState } from "@/components/states";
import { useToast } from "@/hooks/use-toast";

type SecurityPolicy = {
  id: string;
  mfa_required: boolean;
  password_expiry_days: number;
  session_ttl_minutes: number;
  ip_allowlist: string[];
  password_min_length: number;
  failed_login_lockout_threshold: number;
  failed_login_lockout_minutes: number;
};

export default function SecurityPage() {
  const { toast } = useToast();
  const [policy, setPolicy] = React.useState<SecurityPolicy | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Form state (synced from the API on load)
  const [mfaRequired, setMfaRequired] = React.useState(true);
  const [passwordRotation, setPasswordRotation] = React.useState(90);
  const [sessionTimeout, setSessionTimeout] = React.useState(30);
  const [ipAllowlist, setIpAllowlist] = React.useState("");
  const [passwordMinLength, setPasswordMinLength] = React.useState(8);
  const [lockoutThreshold, setLockoutThreshold] = React.useState(5);
  const [lockoutMinutes, setLockoutMinutes] = React.useState(15);

  // Fetch the real policy on mount
  React.useEffect(() => {
    fetch("/api/v1/security/policy", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setPolicy(data);
          setMfaRequired(data.mfa_required ?? true);
          setPasswordRotation(data.password_expiry_days ?? 90);
          setSessionTimeout(data.session_ttl_minutes ?? 30);
          setIpAllowlist(Array.isArray(data.ip_allowlist) ? data.ip_allowlist.join("\n") : "");
          setPasswordMinLength(data.password_min_length ?? 8);
          setLockoutThreshold(data.failed_login_lockout_threshold ?? 5);
          setLockoutMinutes(data.failed_login_lockout_minutes ?? 15);
        }
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/v1/security/policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mfa_required: mfaRequired,
          password_expiry_days: passwordRotation,
          session_ttl_minutes: sessionTimeout,
          ip_allowlist: ipAllowlist
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          password_min_length: passwordMinLength,
          failed_login_lockout_threshold: lockoutThreshold,
          failed_login_lockout_minutes: lockoutMinutes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Save failed",
          description: data?.error || `Server returned ${res.status}.`,
          variant: "destructive",
        });
        setSaving(false);
        return;
      }
      toast({
        title: "Security policy saved",
        description: "All security settings have been persisted to the database.",
      });
    } catch {
      toast({
        title: "Network error",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <IfPermission code="security.policy.edit" fallback={<PermissionDenied />}>
        <div className="px-4 py-8 md:px-8 md:py-12">
          <div className="mx-auto max-w-[var(--grid-max-width)]">
            <LoadingState pattern="detail" />
          </div>
        </div>
      </IfPermission>
    );
  }

  if (error) {
    return (
      <IfPermission code="security.policy.edit" fallback={<PermissionDenied />}>
        <div className="px-4 py-8 md:px-8 md:py-12">
          <div className="mx-auto max-w-[var(--grid-max-width)]">
            <ErrorState onRetry={() => window.location.reload()} />
          </div>
        </div>
      </IfPermission>
    );
  }

  return (
    <IfPermission code="security.policy.edit" fallback={<PermissionDenied />}>
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
          <header>
            <h1 className="flex items-center gap-2 text-display font-bold text-text-primary">
              <Lock className="h-7 w-7 text-primary-500" aria-hidden />
              Security Policies
            </h1>
            <p className="mt-1 text-body text-text-secondary">
              Configure authentication, password, and session security policies for the organization.
            </p>
          </header>

          <Card className="border-border-default shadow-elevation-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-subtitle">
                <Shield className="h-5 w-5 text-primary-600" />
                Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border-default p-4">
                <div className="flex items-start gap-3">
                  <KeyRound className="mt-0.5 h-5 w-5 text-text-secondary" />
                  <div>
                    <p className="text-body font-medium text-text-primary">Require Multi-Factor Authentication (MFA)</p>
                    <p className="text-caption text-text-secondary">Force all staff users to set up TOTP at next login.</p>
                  </div>
                </div>
                <Switch checked={mfaRequired} onCheckedChange={setMfaRequired} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pwd-rotation" className="flex items-center gap-2 text-body">
                  <Clock className="h-4 w-4 text-text-secondary" />
                  Password rotation period (days)
                </Label>
                <Input
                  id="pwd-rotation"
                  type="number"
                  value={passwordRotation}
                  onChange={(e) => setPasswordRotation(Number(e.target.value))}
                  className="max-w-xs"
                />
                <p className="text-caption text-text-muted">Users must reset their password every {passwordRotation} days.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="session-timeout" className="flex items-center gap-2 text-body">
                  <Clock className="h-4 w-4 text-text-secondary" />
                  Session timeout (minutes)
                </Label>
                <Input
                  id="session-timeout"
                  type="number"
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(Number(e.target.value))}
                  className="max-w-xs"
                />
                <p className="text-caption text-text-muted">Inactive sessions expire after {sessionTimeout} minutes.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pwd-min-length" className="flex items-center gap-2 text-body">
                  <KeyRound className="h-4 w-4 text-text-secondary" />
                  Minimum password length
                </Label>
                <Input
                  id="pwd-min-length"
                  type="number"
                  value={passwordMinLength}
                  onChange={(e) => setPasswordMinLength(Number(e.target.value))}
                  className="max-w-xs"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border-default shadow-elevation-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-subtitle">
                <Globe className="h-5 w-5 text-primary-600" />
                Network Access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ip-allowlist" className="text-body">IP Allowlist (one per line)</Label>
                <textarea
                  id="ip-allowlist"
                  className="flex min-h-[100px] w-full rounded-md border border-border-default bg-surface-card p-3 text-body text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  placeholder="192.168.1.0/24&#10;10.0.0.5"
                  value={ipAllowlist}
                  onChange={(e) => setIpAllowlist(e.target.value)}
                />
                <p className="text-caption text-text-muted">Leave empty to allow all IPs. CIDR notation supported.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border-default shadow-elevation-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-subtitle">
                <AlertCircle className="h-5 w-5 text-primary-600" />
                Account Lockout
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lockout-threshold" className="text-body">Failed login lockout threshold</Label>
                  <Input
                    id="lockout-threshold"
                    type="number"
                    value={lockoutThreshold}
                    onChange={(e) => setLockoutThreshold(Number(e.target.value))}
                    className="max-w-xs"
                  />
                  <p className="text-caption text-text-muted">Lock account after {lockoutThreshold} failed attempts.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lockout-minutes" className="text-body">Lockout duration (minutes)</Label>
                  <Input
                    id="lockout-minutes"
                    type="number"
                    value={lockoutMinutes}
                    onChange={(e) => setLockoutMinutes(Number(e.target.value))}
                    className="max-w-xs"
                  />
                  <p className="text-caption text-text-muted">Account stays locked for {lockoutMinutes} minutes.</p>
                </div>
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
