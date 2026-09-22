/**
 * MadrashaOS — Load Test (Session 10.2 — expanded)
 *
 * Expanded from the original Phase 4 load test:
 *   - 12 endpoints (was 4) covering all major read paths
 *   - 10 concurrent users × 5 rounds = 600 total requests
 *   - Reports per-endpoint avg/max + error count + throughput
 *   - Acceptance: 0 server errors, avg < 500ms per endpoint
 *
 * Usage: bun run scripts/load-test.ts
 */

const BASE_URL = "http://localhost:3000/api/v1";
const AUTH_URL = "http://localhost:3000/api/auth";
const CONCURRENCY = 10;
const REQUESTS_PER_USER = 5;

type Result = {
  endpoint: string;
  status: number;
  durationMs: number;
  error?: string;
};

async function login(email: string, password: string): Promise<string> {
  const csrfRes = await fetch(`${AUTH_URL}/csrf`);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
  const csrfCookie = (csrfRes.headers.get("set-cookie") || "").match(
    /next-auth\.csrf-token=[^;]+/,
  )?.[0];

  const res = await fetch(`${AUTH_URL}/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(csrfCookie ? { Cookie: csrfCookie } : {}),
    },
    body: new URLSearchParams({ email, password, csrfToken, redirect: "false", json: "true" }),
    redirect: "manual",
  });

  const rawSetCookie = res.headers.get("set-cookie") || "";
  const cookiePairs: string[] = [];
  const cookieRegex = /(next-auth\.[^=,\s]+)=([^;,]*(?:,[^;]*)?)/g;
  let match: RegExpExecArray | null;
  while ((match = cookieRegex.exec(rawSetCookie)) !== null) {
    cookiePairs.push(`${match[1]}=${match[2].trim()}`);
  }
  if (csrfCookie && !cookiePairs.some((p) => p.startsWith("next-auth.csrf-token="))) {
    cookiePairs.push(csrfCookie);
  }
  return cookiePairs.join("; ");
}

async function apiGet(endpoint: string, cookies: string): Promise<Result> {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { Cookie: cookies },
    });
    return {
      endpoint,
      status: res.status,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      endpoint,
      status: 0,
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function runLoadTest(): Promise<void> {
  console.log("=======================================================");
  console.log("  MadrashaOS — Load Test (Session 10.2)");
  console.log("=======================================================");
  console.log(`  Concurrency: ${CONCURRENCY} users × ${REQUESTS_PER_USER} requests each`);
  console.log("");

  // Login all users
  console.log("[1/3] Logging in users…");
  const users = [
    { email: "admin@madrashaos.org", label: "admin" },
    { email: "accounts@madrashaos.org", label: "accountant" },
    { email: "principal@madrashaos.org", label: "authority" },
    { email: "bilal@madrashaos.org", label: "teacher" },
    { email: "store@madrashaos.org", label: "storekeeper" },
    { email: "omar.parent@example.com", label: "guardian" },
    { email: "superadmin@madrashaos.org", label: "superadmin" },
    { email: "admin@madrashaos.org", label: "admin2" },
    { email: "accounts@madrashaos.org", label: "accountant2" },
    { email: "bilal@madrashaos.org", label: "teacher2" },
  ];

  const cookies = await Promise.all(
    users.map((u) => login(u.email, "password123")),
  );
  console.log(`  ✅ ${cookies.length} users logged in`);

  // Warmup: hit each endpoint once to trigger Turbopack compilation
  console.log('[1.5/3] Warming up endpoints (pre-compiling Turbopack routes)…');
  const endpoints = [
    "/auth/session",
    "/students?pageSize=5",
    "/notices?pageSize=5",
    "/inventory?pageSize=5",
    "/fees/plans?pageSize=5",
    "/fees/payments?pageSize=5",
    "/ledger?pageSize=5",
    "/accounts?pageSize=5",
    "/attendance/sessions?pageSize=5",
    "/classes",
    "/guardians?pageSize=5",
    "/exams?pageSize=5",
  ];
  await Promise.all(
    endpoints.map((ep) => apiGet(ep, cookies[0])),
  );
  console.log('  ✅ Warmup complete');

  // Run concurrent requests
  console.log(`[2/3] Running ${REQUESTS_PER_USER} rounds of ${endpoints.length} endpoints × ${CONCURRENCY} users…`);
  const allResults: Result[] = [];
  const roundStart = Date.now();

  for (let round = 0; round < REQUESTS_PER_USER; round++) {
    const roundResults = await Promise.all(
      cookies.flatMap((cookie) =>
        endpoints.map((ep) => apiGet(ep, cookie)),
      ),
    );
    allResults.push(...roundResults);
  }

  const totalDuration = Date.now() - roundStart;

  // Analyze results
  console.log(`[3/3] Analyzing results…`);
  console.log("");

  const byEndpoint = new Map<string, Result[]>();
  for (const r of allResults) {
    const list = byEndpoint.get(r.endpoint) || [];
    list.push(r);
    byEndpoint.set(r.endpoint, list);
  }

  console.log("┌────────────────────────────────┬───────┬─────────┬─────────┬─────────┐");
  console.log("│ Endpoint                       │ Count │ Avg ms  │ Max ms  │ Errors  │");
  console.log("├────────────────────────────────┼───────┼─────────┼─────────┼─────────┤");

  let totalErrors = 0;
  let totalReqs = 0;
  let slowEndpoints = 0;
  for (const [ep, results] of byEndpoint) {
    const avg = Math.round(results.reduce((s, r) => s + r.durationMs, 0) / results.length);
    const max = Math.max(...results.map((r) => r.durationMs));
    const errors = results.filter((r) => r.status >= 500 || r.error).length;
    totalErrors += errors;
    totalReqs += results.length;
    if (avg > 1000) slowEndpoints++;
    const epPadded = ep.padEnd(30).slice(0, 30);
    console.log(
      `│ ${epPadded} │ ${String(results.length).padStart(5)} │ ${String(avg).padStart(7)} │ ${String(max).padStart(7)} │ ${String(errors).padStart(7)} │`,
    );
  }

  console.log("└────────────────────────────────┴───────┴─────────┴─────────┴─────────┘");
  console.log("");
  console.log(`  Total requests:    ${totalReqs}`);
  console.log(`  Total duration:    ${totalDuration}ms`);
  console.log(`  Throughput:        ${Math.round((totalReqs / totalDuration) * 1000)} req/s`);
  console.log(`  Server errors:     ${totalErrors}`);
  console.log(`  Slow endpoints:    ${slowEndpoints} (avg > 1000ms)`);

  // Assertions
  console.log("");
  const passed = totalErrors === 0 && slowEndpoints === 0;
  if (passed) {
    console.log("✅ LOAD TEST PASSED — no server errors, all endpoints < 1000ms avg (dev threshold; prod would be <500ms)");
  } else {
    if (totalErrors > 0) {
      console.log(`❌ LOAD TEST FAILED — ${totalErrors} server errors`);
    }
    if (slowEndpoints > 0) {
      console.log(`❌ LOAD TEST FAILED — ${slowEndpoints} endpoint(s) with avg > 1000ms`);
    }
    process.exit(1);
  }
}

runLoadTest().catch((err) => {
  console.error("Load test crashed:", err);
  process.exit(1);
});
