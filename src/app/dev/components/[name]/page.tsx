import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Info,
  Keyboard,
  Palette,
  Code2,
  ListChecks,
  Eye,
  Shapes,
} from "lucide-react";

import { componentRegistry, getComponentByName } from "@/lib/dev/component-registry";
import { resolveTokensWithSemantic, type ResolvedToken } from "@/lib/dev/token-resolver";
import {
  ComponentLivePreview,
  StatePreview,
} from "@/lib/dev/component-preview";
import { CopyButton } from "@/components/dev/copy-button";

/**
 * MadrashaOS — /dev/components/[name] (Phase C7.1)
 *
 * Storybook-style per-component detail page. Renders:
 *   - Header (name + category badge + description)
 *   - Live preview (all variants rendered with the actual component)
 *   - States (re-renders the preview; each tile is interactive so
 *     hover/focus/active can be exercised by the reader)
 *   - Props table (auto-generated from registry)
 *   - A11y contract (role, aria attributes, keyboard interactions)
 *   - Token references (FROZEN tokens used, with values + swatches)
 *   - Code snippet (with Copy button)
 *
 * Uses ONLY the FROZEN token system via Tailwind theme keys.
 */

interface PageProps {
  params: Promise<{ name: string }>;
}

/* ------------------------------------------------------------------ */
/*  Static params + generateStaticParams                              */
/* ------------------------------------------------------------------ */

export function generateStaticParams() {
  return componentRegistry.map((c) => ({ name: c.name }));
}

export function generateMetadata({ params }: PageProps) {
  return params.then(({ name }) => {
    const comp = getComponentByName(name);
    if (!comp) return { title: "Component not found · MadrashaOS Dev" };
    return {
      title: `${comp.displayName} · Component Docs · MadrashaOS Dev`,
      description: comp.description,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const CATEGORY_BADGE: Record<string, string> = {
  Action: "bg-primary-50 text-primary-700",
  Form: "bg-accent-50 text-accent-700",
  Navigation: "bg-info-50 text-info-foreground",
  Data: "bg-neutral-100 text-text-primary",
  Feedback: "bg-warning-50 text-semantic-warning",
  Layout: "bg-success-50 text-semantic-success",
};

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-4 flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-50 text-primary-700">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-title font-semibold text-text-primary">{title}</h2>
        {subtitle && <p className="text-caption text-text-secondary">{subtitle}</p>}
      </div>
    </header>
  );
}

function TokenSwatch({ token }: { token: ResolvedToken }) {
  if (token.kind === "color" && !token.notFound) {
    // Extract first hex value from the display (handles "alias → primitive" too).
    const match = token.display.match(/#([0-9a-fA-F]{3,8})/);
    const hex = match ? `#${match[1]}` : token.value;
    return (
      <span
        className="inline-block h-4 w-4 shrink-0 rounded-sm border border-border-default"
        style={{ backgroundColor: hex }}
        aria-hidden
      />
    );
  }
  if (token.kind === "shadow") {
    return (
      <span
        className="inline-block h-4 w-4 shrink-0 rounded-sm border border-border-default bg-surface-card"
        style={{ boxShadow: token.value }}
        aria-hidden
      />
    );
  }
  return (
    <span
      className="inline-block h-4 w-4 shrink-0 rounded-sm border border-border-default bg-neutral-100"
      aria-hidden
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function ComponentDetailPage({ params }: PageProps) {
  const { name } = await params;
  const component = getComponentByName(name);

  if (!component) {
    notFound();
  }

  const resolvedTokens = resolveTokensWithSemantic(component.tokens);

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[var(--grid-max-width)] space-y-8">
        {/* Back link */}
        <Link
          href="/dev/components"
          className="inline-flex items-center gap-1.5 text-body font-medium text-text-secondary transition-colors hover:text-primary-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to /dev/components
        </Link>

        {/* Header */}
        <header className="rounded-2xl border border-border-default bg-surface-card p-6 shadow-elevation-1 md:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h1 className="text-display font-bold text-text-primary">{component.displayName}</h1>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-semibold ${CATEGORY_BADGE[component.category] ?? "bg-neutral-100 text-text-primary"}`}
                >
                  {component.category}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-success-50 bg-success-50 px-2.5 py-0.5 text-caption font-semibold text-semantic-success">
                  <Check className="h-3 w-3" /> Documented
                </span>
              </div>
              <p className="max-w-2xl text-body text-text-secondary">
                {component.description}
              </p>
            </div>
            <code className="self-start rounded-md bg-neutral-100 px-3 py-1.5 font-mono text-caption text-text-secondary">
              &lt;{component.displayName.replace(/\s.*$/, "")} /&gt;
            </code>
          </div>

          {/* Quick stats */}
          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border-default pt-4 sm:grid-cols-4">
            <div>
              <dt className="text-caption uppercase tracking-wider text-text-muted">Variants</dt>
              <dd className="text-subtitle font-semibold text-text-primary">{component.variants.length}</dd>
            </div>
            <div>
              <dt className="text-caption uppercase tracking-wider text-text-muted">States</dt>
              <dd className="text-subtitle font-semibold text-text-primary">{component.states.length}</dd>
            </div>
            <div>
              <dt className="text-caption uppercase tracking-wider text-text-muted">Props</dt>
              <dd className="text-subtitle font-semibold text-text-primary">{component.props.length}</dd>
            </div>
            <div>
              <dt className="text-caption uppercase tracking-wider text-text-muted">Tokens</dt>
              <dd className="text-subtitle font-semibold text-text-primary">{component.tokens.length}</dd>
            </div>
          </dl>
        </header>

        {/* Live preview */}
        <section className="rounded-2xl border border-border-default bg-surface-card p-6 shadow-elevation-1 md:p-8">
          <SectionHeader
            icon={Eye}
            title="Live Preview"
            subtitle="All variants rendered with the actual component — fully interactive."
          />
          <ComponentLivePreview name={component.name} />
        </section>

        {/* States */}
        <section className="rounded-2xl border border-border-default bg-surface-card p-6 shadow-elevation-1 md:p-8">
          <SectionHeader
            icon={Shapes}
            title="States"
            subtitle={`${component.states.join(" · ")} — interact with each tile to see state transitions.`}
          />
          <div className="flex flex-wrap gap-2">
            {component.states.map((state) => (
              <span
                key={state}
                className="inline-flex items-center gap-1 rounded-full border border-border-default bg-neutral-50 px-3 py-1 text-caption font-medium text-text-secondary"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                {state}
              </span>
            ))}
          </div>
          <div className="mt-6">
            <StatePreview name={component.name} />
          </div>
        </section>

        {/* Props table */}
        <section className="rounded-2xl border border-border-default bg-surface-card p-6 shadow-elevation-1 md:p-8">
          <SectionHeader
            icon={ListChecks}
            title="Props"
            subtitle="Auto-generated from the registry. Types come straight from the TypeScript definitions."
          />
          {component.props.length === 0 ? (
            <p className="text-body text-text-muted">No documented props.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-body">
                <thead>
                  <tr className="border-b border-border-default text-caption uppercase tracking-wider text-text-muted">
                    <th className="py-2 pe-4 text-start font-medium">Name</th>
                    <th className="py-2 pe-4 text-start font-medium">Type</th>
                    <th className="py-2 pe-4 text-start font-medium">Default</th>
                    <th className="py-2 pe-4 text-start font-medium">Required</th>
                    <th className="py-2 text-start font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {component.props.map((prop) => (
                    <tr key={prop.name} className="border-b border-border-default align-top">
                      <td className="py-3 pe-4">
                        <code className="font-mono text-caption font-semibold text-primary-700">{prop.name}</code>
                      </td>
                      <td className="py-3 pe-4">
                        <code className="font-mono text-caption text-text-secondary">{prop.type}</code>
                      </td>
                      <td className="py-3 pe-4">
                        {prop.default && prop.default !== "—" ? (
                          <code className="font-mono text-caption text-text-secondary">{prop.default}</code>
                        ) : (
                          <span className="text-caption text-text-muted">—</span>
                        )}
                      </td>
                      <td className="py-3 pe-4">
                        {prop.required ? (
                          <span className="inline-flex items-center rounded-full bg-danger-50 px-2 py-0.5 text-caption font-semibold text-semantic-danger">required</span>
                        ) : (
                          <span className="text-caption text-text-muted">optional</span>
                        )}
                      </td>
                      <td className="py-3 text-body text-text-secondary">{prop.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* A11y contract */}
        <section className="rounded-2xl border border-border-default bg-surface-card p-6 shadow-elevation-1 md:p-8">
          <SectionHeader
            icon={Info}
            title="Accessibility Contract"
            subtitle="WCAG 2.1 AA. Audit this contract against your markup before shipping."
          />
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <h3 className="mb-2 text-subtitle font-semibold text-text-primary">Role</h3>
              <code className="inline-block rounded-md bg-neutral-100 px-2 py-1 font-mono text-caption text-text-primary">
                {component.a11y.role}
              </code>
            </div>
            <div>
              <h3 className="mb-2 text-subtitle font-semibold text-text-primary">ARIA Attributes</h3>
              <ul className="space-y-1">
                {component.a11y.ariaAttributes.map((attr) => (
                  <li key={attr} className="flex items-start gap-1.5 text-body text-text-secondary">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary-500" />
                    <code className="font-mono text-caption">{attr}</code>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-subtitle font-semibold text-text-primary">
                <Keyboard className="h-4 w-4" /> Keyboard
              </h3>
              <ul className="space-y-1">
                {component.a11y.keyboardInteractions.map((kb) => (
                  <li key={kb} className="flex items-start gap-1.5 text-body text-text-secondary">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary-500" />
                    <span>{kb}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Token references */}
        <section className="rounded-2xl border border-border-default bg-surface-card p-6 shadow-elevation-1 md:p-8">
          <SectionHeader
            icon={Palette}
            title="Token References"
            subtitle="FROZEN tokens (v1.0.0) consumed by this component. Zero raw hex/px in component code."
          />
          {resolvedTokens.length === 0 ? (
            <p className="text-body text-text-muted">No token references documented.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-body">
                <thead>
                  <tr className="border-b border-border-default text-caption uppercase tracking-wider text-text-muted">
                    <th className="py-2 pe-4 text-start font-medium">Token</th>
                    <th className="py-2 pe-4 text-start font-medium">Kind</th>
                    <th className="py-2 pe-4 text-start font-medium">Value</th>
                    <th className="py-2 text-start font-medium">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {resolvedTokens.map((token) => (
                    <tr key={token.path} className="border-b border-border-default">
                      <td className="py-3 pe-4">
                        <code className="font-mono text-caption font-semibold text-primary-700">{token.path}</code>
                      </td>
                      <td className="py-3 pe-4">
                        <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-caption font-medium text-text-secondary">
                          {token.kind}
                        </span>
                      </td>
                      <td className="py-3 pe-4">
                        {token.notFound ? (
                          <span className="text-caption text-semantic-danger">{token.display}</span>
                        ) : (
                          <code className="font-mono text-caption text-text-secondary">{token.display}</code>
                        )}
                      </td>
                      <td className="py-3">
                        <TokenSwatch token={token} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Code snippet */}
        <section className="rounded-2xl border border-border-default bg-surface-card p-6 shadow-elevation-1 md:p-8">
          <SectionHeader
            icon={Code2}
            title="Code Snippet"
            subtitle="Copy/paste-able usage example."
          />
          <div className="relative">
            <div className="absolute end-3 top-3">
              <CopyButton value={component.codeSnippet} />
            </div>
            <pre className="overflow-x-auto rounded-lg bg-neutral-900 p-4 pt-12 text-caption leading-relaxed text-neutral-50">
              <code className="font-mono">{component.codeSnippet}</code>
            </pre>
          </div>
        </section>

        {/* Footer nav */}
        <footer className="border-t border-border-default pt-6">
          <p className="text-center text-caption text-text-secondary">
            {component.displayName} · {component.category} · {component.variants.length} variants · {component.props.length} props · {component.tokens.length} tokens · WCAG 2.1 AA · Tokens v1.0.0 (FROZEN)
          </p>
        </footer>
      </div>
    </div>
  );
}
