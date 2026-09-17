"use client";

/**
 * MadrashaOS — CMS Admin (Task 8-a · Part 4)
 *
 * /app/website/content — gated by IfPermission code="organization.config.view"
 *
 * A premium CMS editor that lets the organization administrator edit ALL
 * customizable public-website content via the cmsStore (Zustand +
 * localStorage). Each section has a live mini-preview so changes are
 * visible immediately.
 *
 * Tabs:
 *   1. Branding   — logo type/text/monogram/tagline + image upload (mock)
 *   2. Top Bar    — visibility toggle + phone/email/links
 *   3. Navbar     — nav items + submenus + CTA button
 *   4. Hero       — eyebrow/title/subtitle/CTAs
 *   5. Stats      — add/edit/remove stat cards
 *   6. About      — title/description/features
 *   7. Programs   — add/edit/remove program cards
 *   8. Footer     — about/quick links/contact/social
 *   9. Theme      — primary + accent color pickers
 *
 * Buttons:
 *   - Save Changes (persists to localStorage via zustand persist — already
 *     automatic; this triggers a toast confirmation)
 *   - Reset to Defaults
 *   - Preview Site → opens /public in a new tab
 */

import * as React from "react";
import Link from "next/link";
import {
  Save, RotateCcw, ExternalLink, Plus, Trash2, GripVertical,
  ChevronUp, ChevronDown, Image as ImageIcon, Type, Palette,
  Phone, Mail, Menu, Sparkles, BarChart3, BookOpen, Heart,
  Megaphone, Settings2, LayoutDashboard, Users, GraduationCap,
  CalendarDays, ArrowRight, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { IfPermission } from "@/components/auth/IfPermission";
import { useToast } from "@/hooks/use-toast";
import { useCmsStore } from "@/stores/cmsStore";
import { DEFAULT_CMS_CONTENT, type NavItem, type Program } from "@/stores/cms-defaults";
import { DynamicIcon } from "@/components/public/DynamicIcon";

const TABS = [
  { id: "branding", label: "Branding", icon: Type },
  { id: "topbar", label: "Top Bar", icon: Phone },
  { id: "navbar", label: "Navbar", icon: Menu },
  { id: "hero", label: "Hero", icon: Sparkles },
  { id: "stats", label: "Stats", icon: BarChart3 },
  { id: "about", label: "About", icon: Users },
  { id: "programs", label: "Programs", icon: BookOpen },
  { id: "footer", label: "Footer", icon: LayoutDashboard },
  { id: "theme", label: "Theme", icon: Palette },
] as const;

/* ----------------------------------------------------------------
 *  Small reusable primitives for the editors
 * ---------------------------------------------------------------- */

function Field({
  label, hint, children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-subtitle font-medium">{label}</Label>
      {children}
      {hint && <p className="text-caption text-text-muted">{hint}</p>}
    </div>
  );
}

function MiniPreview({
  title, children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-dashed border-border-default bg-surface-canvas">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-caption uppercase tracking-wider text-text-muted">
          <Sparkles className="h-3.5 w-3.5" />
          Live Preview · {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function RowActions({
  onUp, onDown, onRemove, canUp, canDown,
}: {
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  canUp: boolean;
  canDown: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onUp} disabled={!canUp} aria-label="Move up">
        <ChevronUp className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDown} disabled={!canDown} aria-label="Move down">
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-semantic-danger hover:text-semantic-danger" onClick={onRemove} aria-label="Remove">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

/* ----------------------------------------------------------------
 *  Branding editor
 * ---------------------------------------------------------------- */

function BrandingEditor() {
  const logo = useCmsStore((s) => s.logo);
  const updateLogo = useCmsStore((s) => s.updateLogo);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-subtitle">Logo Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Logo Type">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={logo.type === "text" ? "default" : "outline"}
                size="sm"
                onClick={() => updateLogo({ type: "text" })}
              >
                <Type className="h-4 w-4" />
                Text
              </Button>
              <Button
                type="button"
                variant={logo.type === "image" ? "default" : "outline"}
                size="sm"
                onClick={() => updateLogo({ type: "image" })}
              >
                <ImageIcon className="h-4 w-4" />
                Image
              </Button>
            </div>
          </Field>

          <Field label="Logo Text (English)" hint="Shown when locale is en">
            <Input
              value={logo.text}
              onChange={(e) => updateLogo({ text: e.target.value })}
              placeholder="Darul Uloom Madrasha"
            />
          </Field>

          <Field label="Logo Text (Bangla)" hint="Shown when locale is bn">
            <Input
              value={logo.textBn}
              onChange={(e) => updateLogo({ textBn: e.target.value })}
              placeholder="দারুল উলূম মাদরাসা"
            />
          </Field>

          <Field label="Monogram" hint="Single glyph shown in the teal badge (e.g. Arabic م)">
            <Input
              value={logo.monogram}
              onChange={(e) => updateLogo({ monogram: e.target.value.slice(0, 3) })}
              placeholder="م"
              className="font-mono"
              maxLength={3}
            />
          </Field>

          <Field label="Tagline" hint="Shown under the logo text">
            <Input
              value={logo.tagline}
              onChange={(e) => updateLogo({ tagline: e.target.value })}
              placeholder="Knowledge · Faith · Character"
            />
          </Field>

          {logo.type === "image" && (
            <Field label="Logo Image URL" hint="Paste a URL or use the upload button below (mock)">
              <Input
                value={logo.imageUrl ?? ""}
                onChange={(e) => updateLogo({ imageUrl: e.target.value })}
                placeholder="https://…"
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    updateLogo({ imageUrl: String(reader.result) });
                  };
                  reader.readAsDataURL(file);
                }}
                className="mt-2 block w-full text-caption text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-primary-500 file:px-3 file:py-1.5 file:text-primary-foreground hover:file:bg-primary-600"
              />
            </Field>
          )}
        </CardContent>
      </Card>

      <MiniPreview title="Logo">
        <div className="flex items-center gap-2.5 rounded-lg border border-border-default bg-surface-card p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500 font-mono text-subtitle font-bold text-primary-foreground">
            {logo.type === "image" && logo.imageUrl ? (
              <img src={logo.imageUrl} alt="" className="h-full w-full rounded-lg object-cover" />
            ) : (
              logo.monogram
            )}
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-subtitle font-semibold text-text-primary">{logo.text}</span>
            <span className="text-caption text-text-muted">{logo.tagline}</span>
          </span>
        </div>
      </MiniPreview>
    </div>
  );
}

/* ----------------------------------------------------------------
 *  Top Bar editor
 * ---------------------------------------------------------------- */

function TopBarEditor() {
  const topBar = useCmsStore((s) => s.topBar);
  const patch = useCmsStore((s) => s.patch);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-subtitle">
            Top Contact Bar
            <div className="flex items-center gap-2">
              <Label htmlFor="topbar-visible" className="text-caption text-text-muted">
                Visible
              </Label>
              <Switch
                id="topbar-visible"
                checked={topBar.visible}
                onCheckedChange={(v) => patch("topBar", { ...topBar, visible: v })}
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Phone Number">
            <Input
              value={topBar.phone}
              onChange={(e) => patch("topBar", { ...topBar, phone: e.target.value })}
              placeholder="+880 9638-113322"
            />
          </Field>
          <Field label="Email Address">
            <Input
              value={topBar.email}
              onChange={(e) => patch("topBar", { ...topBar, email: e.target.value })}
              placeholder="info@madrashaos.org"
            />
          </Field>

          <Separator />
          <div className="flex items-center justify-between">
            <Label className="text-subtitle font-medium">Portal Links</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => patch("topBar", {
                ...topBar,
                links: [...topBar.links, { label: "New Link", href: "/public" }],
              })}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Link
            </Button>
          </div>
          <div className="space-y-2">
            {topBar.links.map((link, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={link.label}
                  onChange={(e) => {
                    const next = [...topBar.links];
                    next[idx] = { ...link, label: e.target.value };
                    patch("topBar", { ...topBar, links: next });
                  }}
                  placeholder="Label"
                  className="flex-1"
                />
                <Input
                  value={link.href}
                  onChange={(e) => {
                    const next = [...topBar.links];
                    next[idx] = { ...link, href: e.target.value };
                    patch("topBar", { ...topBar, links: next });
                  }}
                  placeholder="/path"
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-semantic-danger"
                  onClick={() => patch("topBar", {
                    ...topBar,
                    links: topBar.links.filter((_, i) => i !== idx),
                  })}
                  aria-label="Remove link"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <MiniPreview title="Top Bar">
        <div className="rounded-lg bg-primary-800 px-4 py-1.5 text-caption text-primary-100">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              {topBar.phone}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {topBar.email}
            </span>
          </div>
        </div>
      </MiniPreview>
    </div>
  );
}

/* ----------------------------------------------------------------
 *  Navbar editor — items + submenus + CTA
 * ---------------------------------------------------------------- */

function NavbarEditor() {
  const navbar = useCmsStore((s) => s.navbar);
  const items = navbar.items;
  const cta = navbar.ctaButton;
  const addNavItem = useCmsStore((s) => s.addNavItem);
  const updateNavItem = useCmsStore((s) => s.updateNavItem);
  const removeNavItem = useCmsStore((s) => s.removeNavItem);
  const reorderNavItem = useCmsStore((s) => s.reorderNavItem);
  const setCtaButton = useCmsStore((s) => s.setCtaButton);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-subtitle">
            Navigation Items
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addNavItem({ label: "New Item", href: "/public", icon: "home" })}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="rounded-lg border border-border-default bg-surface-canvas p-3">
              <div className="flex items-start gap-2">
                <GripVertical className="mt-2 h-4 w-4 shrink-0 text-text-muted" />
                <div className="grid flex-1 gap-2 sm:grid-cols-3">
                  <Input
                    value={item.label}
                    onChange={(e) => updateNavItem(idx, { label: e.target.value })}
                    placeholder="Label"
                  />
                  <Input
                    value={item.href}
                    onChange={(e) => updateNavItem(idx, { href: e.target.value })}
                    placeholder="/path"
                  />
                  <Input
                    value={item.icon ?? ""}
                    onChange={(e) => updateNavItem(idx, { icon: e.target.value })}
                    placeholder="icon (kebab)"
                  />
                </div>
                <RowActions
                  onUp={() => reorderNavItem(idx, "up")}
                  onDown={() => reorderNavItem(idx, "down")}
                  onRemove={() => removeNavItem(idx)}
                  canUp={idx > 0}
                  canDown={idx < items.length - 1}
                />
              </div>

              {/* Submenu editor */}
              {item.children && item.children.length > 0 && (
                <div className="mt-3 ps-6">
                  <Label className="mb-2 block text-caption uppercase tracking-wider text-text-muted">
                    Submenu ({item.children.length} items)
                  </Label>
                  <div className="space-y-2">
                    {item.children.map((child, cIdx) => (
                      <div key={cIdx} className="flex items-center gap-2">
                        <Input
                          value={child.label}
                          onChange={(e) => {
                            const nextChildren = [...(item.children ?? [])];
                            nextChildren[cIdx] = { ...child, label: e.target.value };
                            updateNavItem(idx, { children: nextChildren });
                          }}
                          placeholder="Child label"
                          className="flex-1"
                        />
                        <Input
                          value={child.href}
                          onChange={(e) => {
                            const nextChildren = [...(item.children ?? [])];
                            nextChildren[cIdx] = { ...child, href: e.target.value };
                            updateNavItem(idx, { children: nextChildren });
                          }}
                          placeholder="/path"
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-semantic-danger"
                          onClick={() => {
                            const nextChildren = (item.children ?? []).filter((_, i) => i !== cIdx);
                            updateNavItem(idx, { children: nextChildren });
                          }}
                          aria-label="Remove submenu item"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 ps-6 text-caption"
                onClick={() => {
                  const nextChildren = [...(item.children ?? []), { label: "New Subitem", href: "/public" }];
                  updateNavItem(idx, { children: nextChildren });
                }}
              >
                <Plus className="h-3 w-3" />
                Add submenu item
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-subtitle">CTA Button</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Field label="Label">
            <Input
              value={cta.label}
              onChange={(e) => setCtaButton({ label: e.target.value })}
              placeholder="Apply Now"
            />
          </Field>
          <Field label="Link">
            <Input
              value={cta.href}
              onChange={(e) => setCtaButton({ href: e.target.value })}
              placeholder="/public/admission"
            />
          </Field>
          <Field label="Visible">
            <div className="flex h-9 items-center gap-2">
              <Switch
                checked={cta.visible}
                onCheckedChange={(v) => setCtaButton({ visible: v })}
              />
              <span className="text-caption text-text-muted">
                {cta.visible ? "Shown in navbar" : "Hidden"}
              </span>
            </div>
          </Field>
        </CardContent>
      </Card>

      <MiniPreview title="Navbar">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border-default bg-surface-card p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500 font-mono text-subtitle font-bold text-primary-foreground">
            م
          </span>
          <span className="me-auto text-subtitle font-semibold text-text-primary">Logo</span>
          {items.slice(0, 5).map((item, idx) => (
            <span key={idx} className="inline-flex items-center gap-1 text-body text-text-secondary">
              {item.icon && <DynamicIcon name={item.icon} className="h-3.5 w-3.5" />}
              {item.label}
              {item.children?.length ? <ChevronDown className="h-3 w-3 text-text-muted" /> : null}
            </span>
          ))}
          {cta.visible && (
            <span className="inline-flex items-center gap-1 rounded-md bg-accent-500 px-3 py-1.5 text-caption font-semibold text-accent-foreground">
              {cta.label}
              <ArrowRight className="h-3 w-3" />
            </span>
          )}
        </div>
      </MiniPreview>
    </div>
  );
}

/* ----------------------------------------------------------------
 *  Hero editor
 * ---------------------------------------------------------------- */

function HeroEditor() {
  const hero = useCmsStore((s) => s.hero);
  const patch = useCmsStore((s) => s.patch);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-subtitle">Hero Section</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Eyebrow (English)">
            <Input
              value={hero.eyebrow}
              onChange={(e) => patch("hero", { ...hero, eyebrow: e.target.value })}
              placeholder="Admissions Open · 2026–2027"
            />
          </Field>
          <Field label="Eyebrow (Bangla)">
            <Input
              value={hero.eyebrowBn}
              onChange={(e) => patch("hero", { ...hero, eyebrowBn: e.target.value })}
              placeholder="ভর্তি চলছে · ২০২৬–২০২৭"
            />
          </Field>
          <Field label="Title (English)">
            <Input
              value={hero.title}
              onChange={(e) => patch("hero", { ...hero, title: e.target.value })}
              placeholder="Darul Uloom Madrasha"
            />
          </Field>
          <Field label="Title (Bangla)">
            <Textarea
              value={hero.titleBn}
              onChange={(e) => patch("hero", { ...hero, titleBn: e.target.value })}
              placeholder="এশিয়ার অন্যতম বৃহৎ ইসলামিক অনলাইন মাদরাসা"
              rows={2}
            />
          </Field>
          <Field label="Subtitle (English)">
            <Textarea
              value={hero.subtitle}
              onChange={(e) => patch("hero", { ...hero, subtitle: e.target.value })}
              rows={4}
            />
          </Field>
          <Field label="Subtitle (Bangla)">
            <Textarea
              value={hero.subtitleBn}
              onChange={(e) => patch("hero", { ...hero, subtitleBn: e.target.value })}
              rows={4}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Primary CTA Label">
              <Input
                value={hero.primaryCta.label}
                onChange={(e) => patch("hero", { ...hero, primaryCta: { ...hero.primaryCta, label: e.target.value } })}
              />
            </Field>
            <Field label="Primary CTA Link">
              <Input
                value={hero.primaryCta.href}
                onChange={(e) => patch("hero", { ...hero, primaryCta: { ...hero.primaryCta, href: e.target.value } })}
              />
            </Field>
            <Field label="Secondary CTA Label">
              <Input
                value={hero.secondaryCta.label}
                onChange={(e) => patch("hero", { ...hero, secondaryCta: { ...hero.secondaryCta, label: e.target.value } })}
              />
            </Field>
            <Field label="Secondary CTA Link">
              <Input
                value={hero.secondaryCta.href}
                onChange={(e) => patch("hero", { ...hero, secondaryCta: { ...hero.secondaryCta, href: e.target.value } })}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <MiniPreview title="Hero">
        <div className="relative overflow-hidden rounded-lg bg-primary-700 p-4 text-primary-foreground">
          <Badge className="mb-2 border-accent-500/40 bg-accent-500/15 text-accent-500">
            <Sparkles className="h-3 w-3" />
            {hero.eyebrow}
          </Badge>
          <h3 className="text-subtitle font-bold leading-tight">{hero.title}</h3>
          <p className="mt-1 line-clamp-3 text-caption text-primary-100">{hero.subtitle}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-accent-500 px-2 py-1 text-caption font-semibold text-accent-foreground">
              {hero.primaryCta.label}
              <ArrowRight className="h-3 w-3" />
            </span>
            <span className="inline-flex items-center rounded-md border border-primary-300 px-2 py-1 text-caption text-primary-100">
              {hero.secondaryCta.label}
            </span>
          </div>
        </div>
      </MiniPreview>
    </div>
  );
}

/* ----------------------------------------------------------------
 *  Stats editor
 * ---------------------------------------------------------------- */

function StatsEditor() {
  const stats = useCmsStore((s) => s.stats);
  const addStat = useCmsStore((s) => s.addStat);
  const updateStat = useCmsStore((s) => s.updateStat);
  const removeStat = useCmsStore((s) => s.removeStat);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-subtitle">
            Stat Cards
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addStat({
                label: "New Stat", labelBn: "নতুন পরিসংখ্যান", value: "0+", icon: "users",
              })}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Stat
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.map((stat, idx) => (
            <div key={idx} className="rounded-lg border border-border-default bg-surface-canvas p-3">
              <div className="grid gap-2 sm:grid-cols-4">
                <Input
                  value={stat.value}
                  onChange={(e) => updateStat(idx, { value: e.target.value })}
                  placeholder="177,119+"
                  className="font-mono"
                />
                <Input
                  value={stat.label}
                  onChange={(e) => updateStat(idx, { label: e.target.value })}
                  placeholder="Label (EN)"
                />
                <Input
                  value={stat.labelBn}
                  onChange={(e) => updateStat(idx, { labelBn: e.target.value })}
                  placeholder="লেবেল (বাংলা)"
                />
                <Input
                  value={stat.icon}
                  onChange={(e) => updateStat(idx, { icon: e.target.value })}
                  placeholder="icon (kebab)"
                />
              </div>
              <div className="mt-2 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-semantic-danger hover:text-semantic-danger"
                  onClick={() => removeStat(idx)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <MiniPreview title="Stats Bar">
        <div className="grid grid-cols-2 gap-2">
          {stats.map((stat, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1 rounded-md border border-border-default bg-surface-card p-3 text-center">
              <DynamicIcon name={stat.icon} className="h-4 w-4 text-primary-700" />
              <p className="text-subtitle font-bold text-text-primary">{stat.value}</p>
              <p className="text-caption text-text-secondary">{stat.label}</p>
            </div>
          ))}
        </div>
      </MiniPreview>
    </div>
  );
}

/* ----------------------------------------------------------------
 *  About editor
 * ---------------------------------------------------------------- */

function AboutEditor() {
  const about = useCmsStore((s) => s.about);
  const patch = useCmsStore((s) => s.patch);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-subtitle">About Section</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Eyebrow">
            <Input
              value={about.eyebrow}
              onChange={(e) => patch("about", { ...about, eyebrow: e.target.value })}
              placeholder="About Us"
            />
          </Field>
          <Field label="Title (English)">
            <Input
              value={about.title}
              onChange={(e) => patch("about", { ...about, title: e.target.value })}
            />
          </Field>
          <Field label="Title (Bangla)">
            <Input
              value={about.titleBn}
              onChange={(e) => patch("about", { ...about, titleBn: e.target.value })}
            />
          </Field>
          <Field label="Description (English)">
            <Textarea
              value={about.description}
              onChange={(e) => patch("about", { ...about, description: e.target.value })}
              rows={5}
            />
          </Field>
          <Field label="Description (Bangla)">
            <Textarea
              value={about.descriptionBn}
              onChange={(e) => patch("about", { ...about, descriptionBn: e.target.value })}
              rows={5}
            />
          </Field>
          <Field label="Image Icon (kebab)" hint="Lucide icon name shown in the about image placeholder">
            <Input
              value={about.imageIcon}
              onChange={(e) => patch("about", { ...about, imageIcon: e.target.value })}
              placeholder="school"
            />
          </Field>
          <Separator />
          <div className="flex items-center justify-between">
            <Label className="text-subtitle font-medium">Features List</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => patch("about", {
                ...about,
                features: [...about.features, "New feature"],
                featuresBn: [...about.featuresBn, "নতুন ফিচার"],
              })}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Feature
            </Button>
          </div>
          <div className="space-y-2">
            {about.features.map((feat, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={feat}
                  onChange={(e) => {
                    const next = [...about.features];
                    next[idx] = e.target.value;
                    patch("about", { ...about, features: next });
                  }}
                  placeholder="English feature"
                  className="flex-1"
                />
                <Input
                  value={about.featuresBn[idx] ?? ""}
                  onChange={(e) => {
                    const next = [...about.featuresBn];
                    next[idx] = e.target.value;
                    patch("about", { ...about, featuresBn: next });
                  }}
                  placeholder="Bangla feature"
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-semantic-danger"
                  onClick={() => patch("about", {
                    ...about,
                    features: about.features.filter((_, i) => i !== idx),
                    featuresBn: about.featuresBn.filter((_, i) => i !== idx),
                  })}
                  aria-label="Remove feature"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <MiniPreview title="About">
        <div className="space-y-2">
          <Badge variant="outline" className="border-primary-200 bg-primary-50 text-primary-700">
            <DynamicIcon name={about.imageIcon} className="h-3 w-3" />
            {about.eyebrow}
          </Badge>
          <h3 className="text-subtitle font-bold text-text-primary">{about.title}</h3>
          <p className="line-clamp-4 text-caption text-text-secondary">{about.description}</p>
          <ul className="space-y-1 pt-1">
            {about.features.slice(0, 4).map((feat, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-caption text-text-secondary">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-semantic-success" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>
      </MiniPreview>
    </div>
  );
}

/* ----------------------------------------------------------------
 *  Programs editor
 * ---------------------------------------------------------------- */

function ProgramsEditor() {
  const programs = useCmsStore((s) => s.programs);
  const addProgram = useCmsStore((s) => s.addProgram);
  const updateProgram = useCmsStore((s) => s.updateProgram);
  const removeProgram = useCmsStore((s) => s.removeProgram);

  const handleAdd = () => {
    const newProgram: Program = {
      id: `prog-${Date.now()}`,
      name: "New Program",
      nameBn: "নতুন প্রোগ্রাম",
      category: "Studies",
      duration: "6 months",
      durationBn: "৬ মাস",
      description: "Description goes here.",
      descriptionBn: "বিবরণ এখানে।",
      admissionFee: 500,
      monthlyFee: 300,
      icon: "book-open",
      highlights: ["Highlight 1", "Highlight 2"],
      seats: 30,
    };
    addProgram(newProgram);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-subtitle">
          Program Cards ({programs.length})
          <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
            <Plus className="h-3.5 w-3.5" />
            Add Program
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {programs.map((p) => (
          <div key={p.id} className="rounded-lg border border-border-default bg-surface-canvas p-3">
            <div className="flex items-start gap-2">
              <div className="grid flex-1 gap-2 sm:grid-cols-3">
                <Input
                  value={p.name}
                  onChange={(e) => updateProgram(p.id, { name: e.target.value })}
                  placeholder="Name (EN)"
                />
                <Input
                  value={p.nameBn}
                  onChange={(e) => updateProgram(p.id, { nameBn: e.target.value })}
                  placeholder="নাম (বাংলা)"
                />
                <Input
                  value={p.category}
                  onChange={(e) => updateProgram(p.id, { category: e.target.value })}
                  placeholder="Category"
                />
                <Input
                  value={p.duration}
                  onChange={(e) => updateProgram(p.id, { duration: e.target.value })}
                  placeholder="Duration (EN)"
                />
                <Input
                  value={p.durationBn}
                  onChange={(e) => updateProgram(p.id, { durationBn: e.target.value })}
                  placeholder="স্থায়িত্ব (বাংলা)"
                />
                <Input
                  value={p.icon}
                  onChange={(e) => updateProgram(p.id, { icon: e.target.value })}
                  placeholder="icon (kebab)"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-semantic-danger"
                onClick={() => removeProgram(p.id)}
                aria-label="Remove program"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Textarea
                value={p.description}
                onChange={(e) => updateProgram(p.id, { description: e.target.value })}
                placeholder="Description (EN)"
                rows={2}
              />
              <Textarea
                value={p.descriptionBn}
                onChange={(e) => updateProgram(p.id, { descriptionBn: e.target.value })}
                placeholder="বিবরণ (বাংলা)"
                rows={2}
              />
            </div>

            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <div>
                <Label className="text-caption text-text-muted">Admission Fee</Label>
                <Input
                  type="number"
                  value={p.admissionFee}
                  onChange={(e) => updateProgram(p.id, { admissionFee: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-caption text-text-muted">Monthly Fee</Label>
                <Input
                  type="number"
                  value={p.monthlyFee}
                  onChange={(e) => updateProgram(p.id, { monthlyFee: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-caption text-text-muted">Seats</Label>
                <Input
                  type="number"
                  value={p.seats}
                  onChange={(e) => updateProgram(p.id, { seats: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ----------------------------------------------------------------
 *  Footer editor
 * ---------------------------------------------------------------- */

function FooterEditor() {
  const footer = useCmsStore((s) => s.footer);
  const patch = useCmsStore((s) => s.patch);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-subtitle">Footer Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="About (English)">
            <Textarea
              value={footer.about}
              onChange={(e) => patch("footer", { ...footer, about: e.target.value })}
              rows={4}
            />
          </Field>
          <Field label="About (Bangla)">
            <Textarea
              value={footer.aboutBn}
              onChange={(e) => patch("footer", { ...footer, aboutBn: e.target.value })}
              rows={4}
            />
          </Field>
          <Field label="Copyright Text">
            <Input
              value={footer.copyright}
              onChange={(e) => patch("footer", { ...footer, copyright: e.target.value })}
            />
          </Field>

          <Separator />
          <Field label="Contact — Address (EN)">
            <Input
              value={footer.contact.address}
              onChange={(e) => patch("footer", {
                ...footer,
                contact: { ...footer.contact, address: e.target.value },
              })}
            />
          </Field>
          <Field label="Contact — Address (BN)">
            <Input
              value={footer.contact.addressBn}
              onChange={(e) => patch("footer", {
                ...footer,
                contact: { ...footer.contact, addressBn: e.target.value },
              })}
            />
          </Field>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Phone">
              <Input
                value={footer.contact.phone}
                onChange={(e) => patch("footer", {
                  ...footer,
                  contact: { ...footer.contact, phone: e.target.value },
                })}
              />
            </Field>
            <Field label="Email">
              <Input
                value={footer.contact.email}
                onChange={(e) => patch("footer", {
                  ...footer,
                  contact: { ...footer.contact, email: e.target.value },
                })}
              />
            </Field>
          </div>
          <Field label="Office Hours">
            <Input
              value={footer.contact.hours}
              onChange={(e) => patch("footer", {
                ...footer,
                contact: { ...footer.contact, hours: e.target.value },
              })}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-subtitle">
              Quick Links ({footer.quickLinks.length})
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => patch("footer", {
                  ...footer,
                  quickLinks: [...footer.quickLinks, { label: "New Link", href: "/public" }],
                })}
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {footer.quickLinks.map((link, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={link.label}
                  onChange={(e) => {
                    const next = [...footer.quickLinks];
                    next[idx] = { ...link, label: e.target.value };
                    patch("footer", { ...footer, quickLinks: next });
                  }}
                  placeholder="Label"
                  className="flex-1"
                />
                <Input
                  value={link.href}
                  onChange={(e) => {
                    const next = [...footer.quickLinks];
                    next[idx] = { ...link, href: e.target.value };
                    patch("footer", { ...footer, quickLinks: next });
                  }}
                  placeholder="/path"
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-semantic-danger"
                  onClick={() => patch("footer", {
                    ...footer,
                    quickLinks: footer.quickLinks.filter((_, i) => i !== idx),
                  })}
                  aria-label="Remove link"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-subtitle">
              Social Links ({footer.social.length})
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => patch("footer", {
                  ...footer,
                  social: [...footer.social, { platform: "New", href: "#", icon: "globe" }],
                })}
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {footer.social.map((social, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={social.platform}
                  onChange={(e) => {
                    const next = [...footer.social];
                    next[idx] = { ...social, platform: e.target.value };
                    patch("footer", { ...footer, social: next });
                  }}
                  placeholder="Platform"
                  className="flex-1"
                />
                <Input
                  value={social.href}
                  onChange={(e) => {
                    const next = [...footer.social];
                    next[idx] = { ...social, href: e.target.value };
                    patch("footer", { ...footer, social: next });
                  }}
                  placeholder="https://…"
                  className="flex-1"
                />
                <Input
                  value={social.icon}
                  onChange={(e) => {
                    const next = [...footer.social];
                    next[idx] = { ...social, icon: e.target.value };
                    patch("footer", { ...footer, social: next });
                  }}
                  placeholder="icon"
                  className="w-24"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-semantic-danger"
                  onClick={() => patch("footer", {
                    ...footer,
                    social: footer.social.filter((_, i) => i !== idx),
                  })}
                  aria-label="Remove social"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------
 *  Theme editor
 * ---------------------------------------------------------------- */

function ThemeEditor() {
  const theme = useCmsStore((s) => s.theme);
  const updateTheme = useCmsStore((s) => s.updateTheme);

  // Curated swatch palette (matches FROZEN brand tokens).
  const PRIMARY_SWATCHES = [
    { label: "Teal 500 (default)", value: "#0E5C5C" },
    { label: "Teal 600", value: "#0B4A4A" },
    { label: "Teal 700", value: "#093838" },
    { label: "Forest", value: "#166534" },
    { label: "Maroon", value: "#7F1D1D" },
    { label: "Slate", value: "#1E293B" },
  ];
  const ACCENT_SWATCHES = [
    { label: "Gold (default)", value: "#C9A961" },
    { label: "Deep Gold", value: "#8A6F2F" },
    { label: "Amber", value: "#D97706" },
    { label: "Bronze", value: "#92400E" },
    { label: "Olive", value: "#65A30D" },
    { label: "Coral", value: "#DC2626" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-subtitle">Theme Colors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Field label="Primary Color" hint="Used for navbar, hero, footer backgrounds">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={theme.primaryColor}
                  onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                  className="h-9 w-12 cursor-pointer rounded-md border border-border-default"
                  aria-label="Pick primary color"
                />
                <Input
                  value={theme.primaryColor}
                  onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                  className="font-mono"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {PRIMARY_SWATCHES.map((sw) => (
                  <button
                    key={sw.value}
                    type="button"
                    onClick={() => updateTheme({ primaryColor: sw.value })}
                    className="flex flex-col items-center gap-1 rounded-md border border-border-default p-2 text-caption transition-colors hover:bg-surface-hover"
                    aria-label={`Pick ${sw.label}`}
                  >
                    <span className="h-6 w-6 rounded-full border border-border-default" style={{ backgroundColor: sw.value }} />
                    <span className="text-[0.625rem] text-text-muted">{sw.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </Field>

          <Field label="Accent Color" hint="Used for CTA buttons, icons, and highlights">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={theme.accentColor}
                  onChange={(e) => updateTheme({ accentColor: e.target.value })}
                  className="h-9 w-12 cursor-pointer rounded-md border border-border-default"
                  aria-label="Pick accent color"
                />
                <Input
                  value={theme.accentColor}
                  onChange={(e) => updateTheme({ accentColor: e.target.value })}
                  className="font-mono"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {ACCENT_SWATCHES.map((sw) => (
                  <button
                    key={sw.value}
                    type="button"
                    onClick={() => updateTheme({ accentColor: sw.value })}
                    className="flex flex-col items-center gap-1 rounded-md border border-border-default p-2 text-caption transition-colors hover:bg-surface-hover"
                    aria-label={`Pick ${sw.label}`}
                  >
                    <span className="h-6 w-6 rounded-full border border-border-default" style={{ backgroundColor: sw.value }} />
                    <span className="text-[0.625rem] text-text-muted">{sw.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </Field>
        </CardContent>
      </Card>

      <MiniPreview title="Theme">
        <div className="space-y-3">
          <div className="overflow-hidden rounded-lg border border-border-default">
            <div className="px-4 py-3 text-primary-foreground" style={{ backgroundColor: theme.primaryColor }}>
              <p className="text-subtitle font-semibold">Primary color preview</p>
              <p className="text-caption opacity-80">Used for hero, navbar, footer</p>
            </div>
            <div className="px-4 py-3" style={{ backgroundColor: theme.accentColor }}>
              <p className="text-subtitle font-semibold text-accent-foreground">Accent color preview</p>
              <p className="text-caption opacity-80">Used for CTA + highlights</p>
            </div>
          </div>
          <p className="text-caption text-text-muted">
            Note: the live site currently renders with the FROZEN brand tokens
            (#0E5C5C teal + #C9A961 gold). Theme overrides will activate once
            a runtime CSS-variable injector is wired up (planned Phase C9).
            Until then, the chosen colors are persisted to the CMS store and
            ready to apply.
          </p>
        </div>
      </MiniPreview>
    </div>
  );
}

/* ----------------------------------------------------------------
 *  Main page
 * ---------------------------------------------------------------- */

export default function CmsContentPage() {
  const { toast } = useToast();
  const resetCms = useCmsStore((s) => s.resetCms);

  const handleSave = () => {
    // Zustand persist already wrote to localStorage on every state change.
    // We just confirm with a toast + force a write of the latest snapshot.
    useCmsStore.persist.rehydrate();
    toast({
      title: "Changes saved",
      description: "Public website content has been persisted to localStorage.",
    });
  };

  const handleReset = () => {
    resetCms();
    toast({
      title: "Reset to defaults",
      description: "All CMS content has been reset to the DEFAULT_CMS_CONTENT values.",
    });
  };

  return (
    <IfPermission
      code="organization.config.view"
      fallback={
        <div className="px-4 py-12 md:px-8">
          <Card className="mx-auto max-w-md border-warning-200 bg-warning-50">
            <CardContent className="p-6 text-center">
              <Settings2 className="mx-auto mb-3 h-10 w-10 text-semantic-warning" />
              <h1 className="text-subtitle font-semibold text-text-primary">
                Permission required
              </h1>
              <p className="mt-2 text-body text-text-secondary">
                You need the <code className="font-mono">organization.config.view</code> permission
                to access the CMS admin. Switch to a role with config access
                (e.g. Super Admin) from the DevToolbar.
              </p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
          {/* Header */}
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="outline" className="mb-2 border-primary-200 bg-primary-50 text-primary-700">
                <Settings2 className="h-3.5 w-3.5" />
                Website CMS
              </Badge>
              <h1 className="text-display font-bold text-text-primary">
                Content Management
              </h1>
              <p className="mt-2 max-w-2xl text-body text-text-secondary">
                Edit the public website&apos;s branding, navigation, hero, programs and footer.
                All changes persist to your browser&apos;s localStorage and propagate live to the
                public site.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/public" target="_blank">
                <Button variant="outline">
                  <ExternalLink className="h-4 w-4" />
                  Preview Site
                </Button>
              </Link>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
                Reset to Defaults
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </header>

          {/* Tabs */}
          <Tabs defaultValue="branding" className="w-full">
            <TabsList className="flex h-auto w-full flex-wrap gap-1 bg-surface-card p-1.5 shadow-elevation-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex-1 px-3 py-1.5 text-caption sm:text-body"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value="branding" className="mt-4"><BrandingEditor /></TabsContent>
            <TabsContent value="topbar" className="mt-4"><TopBarEditor /></TabsContent>
            <TabsContent value="navbar" className="mt-4"><NavbarEditor /></TabsContent>
            <TabsContent value="hero" className="mt-4"><HeroEditor /></TabsContent>
            <TabsContent value="stats" className="mt-4"><StatsEditor /></TabsContent>
            <TabsContent value="about" className="mt-4"><AboutEditor /></TabsContent>
            <TabsContent value="programs" className="mt-4"><ProgramsEditor /></TabsContent>
            <TabsContent value="footer" className="mt-4"><FooterEditor /></TabsContent>
            <TabsContent value="theme" className="mt-4"><ThemeEditor /></TabsContent>
          </Tabs>
        </div>
      </div>
    </IfPermission>
  );
}
