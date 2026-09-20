/**
 * MadrashaOS — Health Check Script
 *
 * Verifies the system is healthy by checking:
 *   1. API server responds (GET /api/docs returns 200)
 *   2. Auth system is reachable (GET /api/auth/providers returns 200)
 *
 * Usage: bun run scripts/healthcheck.ts
 * Exit 0 = healthy, Exit 1 = unhealthy
 */

// Load .env manually (this script runs outside Next.js)
import { readFileSync } from "fs";
import { join } from "path";

try {
  const envPath = join(process.cwd(), ".env");
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([A-Z_]+)="(.*)"$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
} catch {
  // .env not found — use whatever is in the environment
}

const BASE_URL = process.env.NEXTAUTH_URL || process.env.API_URL || "http://localhost:3000";

type Check = {
  name: string;
  status: "pass" | "fail";
  detail?: string;
  durationMs: number;
};

async function checkUrl(name: string, path: string): Promise<Check> {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      signal: AbortSignal.timeout(5000),
    });
    return {
      name,
      status: res.ok ? "pass" : "fail",
      detail: `HTTP ${res.status}`,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      name,
      status: "fail",
      detail: err instanceof Error ? err.message : "Connection failed",
      durationMs: Date.now() - start,
    };
  }
}

async function main() {
  console.log("=======================================================");
  console.log("  MadrashaOS — Health Check");
  console.log("=======================================================");
  console.log(`  Target: ${BASE_URL}`);
  console.log("");

  const checks: Check[] = [];
  checks.push(await checkUrl("API Server (/api/docs)", "/api/docs"));
  checks.push(await checkUrl("Auth System (/api/auth/providers)", "/api/auth/providers"));

  let allPass = true;
  for (const check of checks) {
    const icon = check.status === "pass" ? "PASS" : "FAIL";
    console.log(`  [${icon}] ${check.name}: ${check.detail} (${check.durationMs}ms)`);
    if (check.status === "fail") allPass = false;
  }

  console.log("");
  if (allPass) {
    console.log("ALL CHECKS PASSED — system is healthy");
    process.exit(0);
  } else {
    console.log("SOME CHECKS FAILED — see above");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Health check crashed:", err);
  process.exit(1);
});
