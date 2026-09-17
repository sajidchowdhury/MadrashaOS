/**
 * MadrashaOS — /api/dev/qa-audit (Phase C7.2 · Task 7-b · Part 5)
 *
 * Server-side route that executes `scripts/design-qa.ts` via the Bun
 * runtime (or Node via `bunx`) and returns the captured stdout / stderr
 * + exit code as JSON. The /dev/qa dashboard fetches this to render the
 * "Run QA Audit" results inline.
 *
 * Response shape:
 *   {
 *     "ok": true,                  // whether the script ran (not the pass/fail)
 *     "exitCode": 0 | 1 | 2,       // 0 = pass, 1 = violations, 2 = crash
 *     "stdout": string,
 *     "stderr": string,
 *     "durationMs": number,
 *     "ranAt": string              // ISO timestamp
 *   }
 *
 * The endpoint is a POST (not a GET) so browser prefetch / crawlers
 * don't accidentally trigger the audit. There is no auth gate because
 * the dev routes are sandbox-only (C8 route-group separation already
 * keeps them out of the public site).
 */

import { NextResponse } from "next/server";
import { spawn } from "node:child_process";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_DURATION_MS = 60_000; // 60s ceiling; audit scans ~150 files.

export async function POST() {
  const ranAt = new Date().toISOString();
  const startedAt = Date.now();

  const result = await new Promise<{
    exitCode: number | null;
    stdout: string;
    stderr: string;
    timedOut: boolean;
  }>((resolve) => {
    const child = spawn("bun", ["run", "scripts/design-qa.ts"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        // Force CI mode (suppress interactive bits, if any).
        CI: "true",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill("SIGKILL");
      } catch {
        // ignore
      }
    }, MAX_DURATION_MS);

    child.on("close", (code) => {
      clearTimeout(timer);
      stdout = Buffer.concat(stdoutChunks).toString("utf8");
      stderr = Buffer.concat(stderrChunks).toString("utf8");
      resolve({ exitCode: code, stdout, stderr, timedOut });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      stderr += `\n[spawn error] ${err.message}`;
      resolve({ exitCode: 2, stdout, stderr, timedOut });
    });
  });

  const durationMs = Date.now() - startedAt;

  return NextResponse.json({
    ok: !result.timedOut && result.exitCode !== null,
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
    durationMs,
    ranAt,
    timedOut: result.timedOut,
  });
}

export async function GET() {
  // Help text for accidental GETs.
  return NextResponse.json(
    {
      ok: false,
      message:
        "POST to this endpoint to run the design QA audit. Response: { ok, exitCode, stdout, stderr, durationMs, ranAt }.",
    },
    { status: 405 },
  );
}
