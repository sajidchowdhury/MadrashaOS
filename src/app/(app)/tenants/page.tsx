"use client";

/**
 * MadrashaOS — Tenants page (SRS §2.1.1)
 *
 * Super-admin only: lists all organizations (tenants) on the platform.
 * Backend: GET /api/v1/organizations (already exists).
 */

import * as React from "react";
import { Building2, Plus, Globe, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IfPermission } from "@/components/auth/IfPermission";
import { PermissionDenied, LoadingState, ErrorState } from "@/components/states";
import { useToast } from "@/hooks/use-toast";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  branchCount: number;
  isActive: boolean;
};

export default function TenantsPage() {
  const { toast } = useToast();
  const [tenants, setTenants] = React.useState<Tenant[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/v1/organizations")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.id) {
          // Single-tenant response shape: { id, name, slug, branches: [...] }
          setTenants([{
            id: data.id,
            name: data.name,
            slug: data.slug,
            branchCount: data.branches?.length ?? 0,
            isActive: true,
          }]);
        } else if (data?.data) {
          setTenants(data.data.map((t: Record<string, unknown>) => ({
            id: t.id as string,
            name: t.name as string,
            slug: t.slug as string,
            branchCount: (t.branches as unknown[])?.length ?? 0,
            isActive: true,
          })));
        }
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  return (
    <IfPermission code="tenant.manage" fallback={<PermissionDenied />}>
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-display font-bold text-text-primary">
                <Building2 className="h-7 w-7 text-primary-500" aria-hidden />
                Tenants
              </h1>
              <p className="mt-1 text-body text-text-secondary">
                Manage organizations on the platform (super-admin only).
              </p>
            </div>
            <Button onClick={() => toast({ title: "Coming soon", description: "Tenant creation is not yet available." })}>
              <Plus className="h-4 w-4" />
              Add Tenant
            </Button>
          </header>

          {loading ? (
            <LoadingState pattern="card-grid" />
          ) : error ? (
            <ErrorState onRetry={() => window.location.reload()} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tenants.map((t) => (
                <Card key={t.id} className="border-border-default shadow-elevation-1">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-subtitle">
                      <span className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary-600" />
                        {t.name}
                      </span>
                      <Badge variant={t.isActive ? "default" : "secondary"}>
                        {t.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-body text-text-secondary">
                      <Globe className="h-4 w-4 text-text-muted" />
                      <span className="font-mono text-caption">{t.slug}</span>
                    </div>
                    <div className="flex items-center gap-2 text-body text-text-secondary">
                      <Users className="h-4 w-4 text-text-muted" />
                      <span>{t.branchCount} branches</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </IfPermission>
  );
}
