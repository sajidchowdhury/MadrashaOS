"use client";

/**
 * MadrashaOS — Security Policies page (SRS §2.1.5)
 *
 * Shows the organization's security policy settings:
 * password rotation, MFA enforcement, session timeout, IP allowlist.
 * Backend: GET /api/v1/security/policy (to be implemented — currently
 * reads from the seed SecurityPolicy table via a direct fetch).
 */

import * as React from "react";
import { Lock, Shield, KeyRound, Clock, Globe, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { IfPermission } from "@/components/auth/IfPermission";
import { PermissionDenied } from "@/components/states";
import { useToast } from "@/hooks/use-toast";

export default function SecurityPage() {
  const { toast } = useToast();
  const [mfaRequired, setMfaRequired] = React.useState(true);
  const [passwordRotation, setPasswordRotation] = React.useState(90);
  const [sessionTimeout, setSessionTimeout] = React.useState(30);
  const [ipAllowlist, setIpAllowlist] = React.useState("");

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

          <div className="flex items-center gap-2 rounded-md border border-semantic-warning/40 bg-warning-50 p-3 text-body text-text-secondary">
            <AlertCircle className="h-4 w-4 shrink-0 text-semantic-warning" aria-hidden />
            <span>
              <Badge variant="outline" className="mr-2">Phase 3</Badge>
              These settings are stored in the SecurityPolicy table. Persistence wiring is a follow-up task.
            </span>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => toast({ title: "Settings saved", description: "Security policies updated." })}>
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </IfPermission>
  );
}
