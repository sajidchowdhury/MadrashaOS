/**
 * MadrashaOS — Permission Middleware
 *
 * Task B2.2 — Permission Middleware
 *
 * Wraps Next.js App Router route handlers with a permission check against
 * the authenticated session's `permissions[]` array (injected into the
 * JWT by the NextAuth `jwt` callback — see `src/lib/auth/config.ts`).
 *
 * Three exported helpers:
 *   withPermission(code, handler)      — requires the single given code
 *   withPermissions(codes, handler)    — requires ALL codes (AND)
 *   withAnyPermission(codes, handler)  — requires ANY one code (OR)
 *
 * Response shape on failure:
 *   401 — no session (unauthenticated)
 *     { "error": "Unauthorized" }
 *   403 — session exists but lacks the required permission
 *     { "error": "Forbidden", "required": "<permission_code>" }
 *
 * Usage:
 *   export const POST = withPermission("students.create", async (req, ctx) => {
 *     // ... create student ...
 *     return Response.json({ ok: true });
 *   });
 *
 * Type contract:
 *   RequestHandler = (req: Request, ctx: { params: Record<string, string> }) => Promise<Response>
 *
 * The handler signature intentionally matches Next.js App Router's
 * `handler(req: Request, { params })` shape so route files can pass
 * `params` through to handlers unchanged. In Next.js 16 the `params`
 * is async (a Promise), so we accept the union form here — handlers
 * that need params should `await ctx.params` themselves.
 */

import { getServerSession } from "next-auth";

import { authConfig } from "@/lib/auth/config";

/** Params shape returned by Next.js App Router. */
export type RouteParams = Promise<Record<string, string>> | Record<string, string>;

/** Context object passed to the inner handler. */
export interface RouteContext {
  params: RouteParams;
}

/** Standard request-handler signature this module wraps. */
export type RequestHandler = (
  req: Request,
  ctx: RouteContext,
) => Promise<Response> | Response;

/** Returns 401 JSON response — unauthenticated. */
function unauthenticated(): Response {
  return Response.json(
    { error: "Unauthorized", message: "Authentication required." },
    { status: 401 },
  );
}

/** Returns 403 JSON response — authenticated but missing permission. */
function forbidden(required: string | string[]): Response {
  return Response.json(
    {
      error: "Forbidden",
      message: "Your role does not grant the required permission(s).",
      required,
    },
    { status: 403 },
  );
}

/**
 * Higher-order function — wraps a route handler so it only runs if the
 * authenticated session's permissions include the given `code`.
 *
 * Example:
 *   export const POST = withPermission("students.create", async (req, ctx) => {
 *     const body = await req.json();
 *     ...
 *   });
 */
export function withPermission(code: string, handler: RequestHandler): RequestHandler {
  return async (req, ctx) => {
    const session = await getServerSession(authConfig);
    if (!session?.user) return unauthenticated();
    if (session.user.mfa_pending) {
      return Response.json(
        {
          error: "MFA_REQUIRED",
          message: "Complete multi-factor authentication first.",
        },
        { status: 403 },
      );
    }
    const perms = session.user.permissions ?? [];
    if (!perms.includes(code)) return forbidden(code);
    return handler(req, ctx);
  };
}

/**
 * Higher-order function — requires ALL given codes (AND semantics).
 * Useful when a handler needs, e.g., both `fees.view` AND `fees.payment.create`.
 */
export function withPermissions(
  codes: string[],
  handler: RequestHandler,
): RequestHandler {
  return async (req, ctx) => {
    const session = await getServerSession(authConfig);
    if (!session?.user) return unauthenticated();
    if (session.user.mfa_pending) {
      return Response.json(
        {
          error: "MFA_REQUIRED",
          message: "Complete multi-factor authentication first.",
        },
        { status: 403 },
      );
    }
    const perms = session.user.permissions ?? [];
    const missing = codes.filter((c) => !perms.includes(c));
    if (missing.length > 0) return forbidden(codes);
    return handler(req, ctx);
  };
}

/**
 * Higher-order function — requires ANY one of the given codes (OR semantics).
 * Useful when a handler is reachable from multiple routes (e.g. dashboard
 * viewable by authority OR administrator OR accountant).
 */
export function withAnyPermission(
  codes: string[],
  handler: RequestHandler,
): RequestHandler {
  return async (req, ctx) => {
    const session = await getServerSession(authConfig);
    if (!session?.user) return unauthenticated();
    if (session.user.mfa_pending) {
      return Response.json(
        {
          error: "MFA_REQUIRED",
          message: "Complete multi-factor authentication first.",
        },
        { status: 403 },
      );
    }
    const perms = session.user.permissions ?? [];
    const hasAny = codes.some((c) => perms.includes(c));
    if (!hasAny) return forbidden(codes);
    return handler(req, ctx);
  };
}

/**
 * Convenience: fetch the current session inside a route handler.
 * Returns `null` if unauthenticated.
 */
export async function getCurrentSession() {
  return getServerSession(authConfig);
}
