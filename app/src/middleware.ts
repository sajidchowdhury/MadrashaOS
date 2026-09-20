/**
 * MadrashaOS — Edge Middleware (Route Protection)
 *
 * Task B2.1 — NextAuth.js Setup
 *
 * Guards API routes by checking the NextAuth session cookie. Runs on the
 * Edge runtime for sub-50ms response times — does NOT call Prisma or
 * other Node-only APIs.
 *
 * Route rules:
 *   1. `/api/auth/*`            → PUBLIC (NextAuth endpoints — must be
 *                                  reachable before a session exists)
 *   2. `/api/v1/donations` POST  → PUBLIC (per SRS §6.5 Risk R10 — public
 *                                  donation form needs no login)
 *   3. `/api/v1/*`               → SESSION REQUIRED (returns 401 JSON if
 *                                  no valid NextAuth session cookie)
 *   4. Everything else           → passed through (no auth check)
 *
 * Response shapes for unauthenticated requests:
 *   - JSON-API requests (Accept: application/json OR path starts with /api)
 *       → 401 JSON: { "error": "Unauthorized" }
 *   - Browser navigations (any other Accept)
 *       → 307 redirect to /login?callbackUrl=<original-path>
 *
 * Implementation note: we use `getToken()` from `next-auth/jwt` directly
 * (not `withAuth`) so we have full control over the response shape —
 * `withAuth` always returns a 307 redirect for unauthenticated requests,
 * which doesn't fit the JSON-API contract.
 *
 * `getToken()` runs on the edge runtime via the `jose` library — it
 * decrypts the NextAuth session cookie using NEXTAUTH_SECRET without
 * any DB round-trip.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Distinguishes a JSON-API request from a browser navigation.
 *
 * Heuristic:
 *   - Path starts with `/api`   → API request
 *   - Otherwise: check Accept header for "application/json"
 *                WITHOUT "text/html" (HTML is preferred by browsers
 *                even when they accept JSON)
 */
function isApiRequest(req: NextRequest): boolean {
  if (req.nextUrl.pathname.startsWith("/api")) return true;
  const accept = req.headers.get("accept") ?? "";
  return accept.includes("application/json") && !accept.includes("text/html");
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // 1) NextAuth endpoints — always public (must be reachable pre-session).
  if (path.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // 2) Public donation submission — no login required (R10).
  //    Only the POST method is exempt; GET /api/v1/donations still
  //    requires login (donations listing is staff-only).
  if (
    path === "/api/v1/donations" &&
    req.method.toUpperCase() === "POST"
  ) {
    return NextResponse.next();
  }

  // 2b) Public admission submission — no login required.
  //     Prospective parents/guardians submit applications from the public
  //     website without an account. Only POST is exempt; GET (list) still
  //     requires login + admission.view permission.
  if (
    path === "/api/v1/admissions" &&
    req.method.toUpperCase() === "POST"
  ) {
    return NextResponse.next();
  }

  // 2c) Public notices — no login required (Session 8.5).
  //     Public visitors can read sent+public notices from the website.
  //     Only GET is exempt; POST (compose) still requires login.
  if (
    path === "/api/v1/public/notices" &&
    req.method.toUpperCase() === "GET"
  ) {
    return NextResponse.next();
  }

  // 3) All other /api/v1/* routes require a session.
  if (path.startsWith("/api/v1/")) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      // For API requests, return a 401 JSON response (per the spec).
      if (isApiRequest(req)) {
        return NextResponse.json(
          {
            error: "Unauthorized",
            message: "Authentication required. Sign in at /login.",
          },
          { status: 401 },
        );
      }
      // For browser navigations, redirect to /login with a callback URL
      // so the user lands back on the original page after sign-in.
      const loginUrl = new URL("/login", req.nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Optional: surface the MFA-pending state via a response header so
    // the client can react. The actual gate is enforced in the API
    // route handlers (withPermission + /api/v1/auth/session).
    const res = NextResponse.next();
    if (token.mfa_pending) {
      res.headers.set("X-Mfa-Required", "1");
    }
    return res;
  }

  // 4) Non-/api routes are passed through unchanged.
  return NextResponse.next();
}

/**
 * Matcher — runs the middleware only on /api/* paths so static assets,
 * the public site, and the (app) route group stay fast (the (app)
 * layout has its own visual auth indicator; the SRS leaves page-level
 * auth enforcement to a future task).
 */
export const config = {
  matcher: ["/api/:path*"],
};
