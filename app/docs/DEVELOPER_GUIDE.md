# MadrashaOS — Developer Guide

> Guide for developers extending or maintaining MadrashaOS.

## Architecture Overview

```
MadrashaOS
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (app)/             # Authenticated routes (dashboard, students, fees, etc.)
│   │   ├── (public)/          # Public website (no auth required)
│   │   ├── api/v1/            # REST API (200+ endpoints)
│   │   ├── dev/               # Dev tools (component preview, flows, QA)
│   │   ├── layout.tsx         # Root layout (force-dynamic, providers)
│   │   └── login/             # Login page
│   ├── components/
│   │   ├── ui/                 # shadcn/ui primitives (60+ components)
│   │   ├── shell/              # AppShell, SideNav, TopBar, Footer
│   │   ├── academic/           # Attendance, exams, marks components
│   │   ├── finance/            # CollectPaymentDialog, LedgerEntryForm, etc.
│   │   ├── people/             # StudentAvatar, StudentStatusBadge, etc.
│   │   ├── auth/               # IfPermission wrapper
│   │   └── states/             # LoadingState, ErrorState, EmptyState
│   ├── lib/
│   │   ├── api/                # API client (fetch wrapper + toCamel transformer)
│   │   ├── auth/               # NextAuth config, withPermission, with-tenant, MFA
│   │   ├── db.ts               # Prisma client singleton
│   │   ├── i18n/               # Internationalization (bn/en/ar)
│   │   ├── nav/                # Module tree (nav items + permissions)
│   │   ├── notifications/      # NotificationService (console/SMTP/Resend)
│   │   ├── payments/           # PaymentGateway (manual/bKash/SSL Commerz)
│   │   ├── pdf/                # PDF templates (@react-pdf/renderer)
│   │   ├── query/              # TanStack Query hooks + QueryClient
│   │   └── validation/         # Zod schemas for API request bodies
│   ├── stores/                 # Zustand stores (session, CMS)
│   ├── hooks/                  # use-mobile, use-toast
│   ├── middleware.ts           # NextAuth + public route bypass
│   └── generated/prisma/      # Prisma Client (generated, not committed)
├── prisma/
│   ├── schema.prisma           # 53 models (52 + IdempotencyRecord)
│   ├── seed.ts                 # 1011-line seed script
│   └── migrations/             # SQL migrations
├── scripts/                    # e2e-verify, load-test, backup, healthcheck
├── docs/                       # Documentation (ERD, data dictionary, etc.)
├── public/                     # Static assets (icons, illustrations, brand)
└── docker-compose.yml          # PostgreSQL 16 container
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| Database | PostgreSQL 16 + Prisma ORM 6 |
| Auth | NextAuth.js v4 (JWT + MFA/TOTP) |
| State | Zustand (client) + TanStack Query (server) |
| PDF | @react-pdf/renderer |
| Charts | Recharts |
| i18n | next-intl (bn/en/ar with RTL) |
| Icons | Lucide React |

## Adding a New API Route

```typescript
// src/app/api/v1/my-module/route.ts
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/auth/with-tenant";
import { withPermission } from "@/lib/auth/with-permission";
import { jsonResponse, errorResponse } from "@/lib/api/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1).max(255),
});

export const GET = withPermission("my-module.view", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const items = await db.myModel.findMany({
    where: { organization_id: ctx.organization_id, deleted_at: null },
  });

  return jsonResponse({ data: items });
});

export const POST = withPermission("my-module.create", async (req) => {
  const ctx = await getTenantContext();
  if (!ctx) return errorResponse("Unauthorized", 401);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return errorResponse("Validation failed", 400, parsed.error.flatten());

  const item = await db.myModel.create({
    data: { ...parsed.data, organization_id: ctx.organization_id, created_by: ctx.user_id },
  });

  return jsonResponse({ data: item }, 201);
});
```

**Key patterns:**
- `withPermission(code, handler)` — enforces RBAC before the handler runs
- `getTenantContext()` — returns `{ organization_id, branch_id, user_id, permissions }`
- All queries are tenant-scoped via `organization_id` + `branch_id`
- Use `z.string().regex(/^[0-9a-f]{8}-.../i)` for UUID validation (NOT `.uuid()` — Zod v4 rejects seed UUIDs)

## Adding a New Page

```tsx
// src/app/(app)/my-module/page.tsx
"use client";
import { IfPermission } from "@/components/auth/IfPermission";
import { PermissionDenied, LoadingState, ErrorState } from "@/components/states";
import { useMyData } from "@/lib/query/client";

export default function MyPage() {
  const { data, isLoading, isError, refetch } = useMyData();

  return (
    <IfPermission code="my-module.view" fallback={<PermissionDenied />}>
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-[var(--grid-max-width)] space-y-6">
          <h1 className="text-display font-bold text-text-primary">My Module</h1>
          {isLoading && <LoadingState pattern="table" />}
          {isError && <ErrorState onRetry={() => refetch()} />}
          {/* ... render data ... */}
        </div>
      </div>
    </IfPermission>
  );
}
```

## Adding a Notification Template

1. Add a new template to `src/lib/notifications/templates.ts`:
```typescript
"my-template": (vars) => ({
  subject: `Subject — ${vars.myVar}`,
  html: `<p>Hello ${vars.name},</p><p>...</p>`,
  text: `Hello ${vars.name}, ...`,
}),
```

2. Call it from an API route:
```typescript
import { notifyEntity } from "@/lib/notifications";

notifyEntity("email", {
  to: user.email,
  subject: "My Subject",
  templateId: "my-template",
  templateVars: { name: user.name, myVar: "value" },
  metadata: { organization_id: ctx.organization_id, entity_type: "my_module", entity_id: item.id },
}).catch(() => {}); // fire-and-forget — never crashes the route
```

## Testing

```bash
bun run e2e:verify    # 8 persona flows (login + permission checks)
bun run load:test     # 200 concurrent requests, 10 users
bun run lint          # ESLint
bunx tsc --noEmit     # TypeScript check
```

## Debugging

- **Dev log:** `tail -f dev.log`
- **Prisma Studio:** `bun run db:studio` (opens at localhost:5555)
- **API docs:** `http://localhost:3000/api/docs` (Swagger UI)
- **Dev toolbar:** floating button in bottom-right (role switcher, theme, language)

## Key Design Decisions

1. **toCamel transformer** — the API returns snake_case; the client auto-converts to camelCase so frontend components use `student.nameBn` not `student.name_bn`
2. **DB-backed idempotency** — `IdempotencyRecord` table replaces in-memory Map (survives restarts, serverless-safe)
3. **notifyEntity() wrapper** — notification failures never crash the API route
4. **force-dynamic** — all pages are DB-driven, none are statically prerendered
5. **Session store sync** — the app layout syncs the client-side Zustand store with the real server session on mount

## Known Limitations (v1)

- CMS (`/website/content`) persists to localStorage (not DB) — v2
- Payment gateway (bKash/SSL Commerz) is scaffolded but not wired — v2
- Events page uses sample data — v2
- SMS notifications are console-only — v2
