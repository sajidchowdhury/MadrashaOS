/**
 * MadrashaOS — Health Check Endpoint (Phase 6)
 *
 * GET /api/v1/health
 *
 * Public endpoint (no auth required) used by:
 *   - Uptime monitors (UptimeRobot, Vercel Cron, k6)
 *   - Container orchestrators (Docker healthcheck, Kubernetes liveness probe)
 *   - Load balancers (to route traffic away from unhealthy instances)
 *
 * Checks:
 *   1. Database connectivity (SELECT 1)
 *   2. App version (from package.json — injected at build time)
 *   3. Uptime (process.uptime())
 *
 * Response 200 (healthy):
 *   { status: "ok", uptime_seconds, version, timestamp, db: "connected" }
 *
 * Response 503 (unhealthy):
 *   { status: "degraded", error, timestamp, db: "disconnected" }
 *
 * Note: This endpoint does NOT require auth (whitelisted in middleware).
 * It only returns whether the DB is reachable — no tenant data is leaked.
 */

import { db } from "@/lib/db";
import { jsonResponse } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const START_TIME = Date.now();

// Read version from package.json at build time (Bun resolves this)
const VERSION = process.env.npm_package_version ?? "1.0.0";

export async function GET() {
  const timestamp = new Date().toISOString();
  const uptimeSeconds = Math.floor((Date.now() - START_TIME) / 1000);

  // Check DB connectivity
  let dbStatus: "connected" | "disconnected" = "disconnected";
  let dbError: string | null = null;

  try {
    // Simple SELECT 1 — if this fails, the DB is unreachable
    await db.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Unknown DB error";
  }

  const isHealthy = dbStatus === "connected";

  return jsonResponse(
    {
      status: isHealthy ? "ok" : "degraded",
      timestamp,
      uptime_seconds: uptimeSeconds,
      version: VERSION,
      environment: process.env.NODE_ENV ?? "development",
      db: dbStatus,
      ...(dbError ? { db_error: dbError } : {}),
    },
    isHealthy ? 200 : 503,
  );
}
