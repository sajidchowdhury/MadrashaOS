/**
 * MadrashaOS — Structured Logger (Phase 6)
 *
 * Production-grade structured logging with:
 *   - Tenant context (organization_id, branch_id) on every log line
 *   - Request context (request_id, user_id, method, path)
 *   - JSON output in production (parseable by Datadog, Grafana Loki, AWS CloudWatch)
 *   - Human-readable output in development (colored, pretty-printed)
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *
 *   const log = logger.child({ organization_id: ctx.organization_id, branch_id: ctx.branch_id });
 *   log.info("Student created", { student_id, name });
 *   log.warn("Fee payment delayed", { student_id, days_overdue: 15 });
 *   log.error("Provisioning failed", { signup_request_id, error: errMsg });
 *
 * In development: logs to console with colors.
 * In production: logs JSON to stdout (one object per line).
 */

type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = {
  organization_id?: string;
  branch_id?: string | null;
  user_id?: string;
  request_id?: string;
  module?: string;
  [key: string]: unknown;
};

// ANSI color codes for dev mode
const COLORS: Record<LogLevel, string> = {
  debug: "\x1b[90m",   // gray
  info: "\x1b[36m",    // cyan
  warn: "\x1b[33m",    // yellow
  error: "\x1b[31m",   // red
};
const RESET = "\x1b[0m";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

// Minimum level to log (from env or default)
const MIN_LOG_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ?? (process.env.NODE_ENV === "production" ? "info" : "debug");

class Logger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  /** Create a child logger with additional context (merged with parent) */
  child(extra: LogContext): Logger {
    return new Logger({ ...this.context, ...extra });
  }

  debug(message: string, data?: Record<string, unknown>) {
    this.log("debug", message, data);
  }

  info(message: string, data?: Record<string, unknown>) {
    this.log("info", message, data);
  }

  warn(message: string, data?: Record<string, unknown>) {
    this.log("warn", message, data);
  }

  error(message: string, data?: Record<string, unknown>) {
    this.log("error", message, data);
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>) {
    // Skip if below minimum level
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[MIN_LOG_LEVEL]) return;

    const timestamp = new Date().toISOString();
    const mergedContext = { ...this.context, ...data };

    if (process.env.NODE_ENV === "production") {
      // Production: JSON to stdout (one line per log)
      const payload = JSON.stringify({
        level,
        message,
        timestamp,
        ...mergedContext,
      });
      // Write to the correct stream (stderr for errors, stdout otherwise)
      if (level === "error") {
        process.stderr.write(payload + "\n");
      } else {
        process.stdout.write(payload + "\n");
      }
    } else {
      // Development: human-readable with colors
      const color = COLORS[level];
      const levelTag = `${color}[${level.toUpperCase()}]${RESET}`;
      const tenantTag = mergedContext.organization_id
        ? ` ${color}(${mergedContext.organization_id.slice(0, 8)})${RESET}`
        : "";
      const dataStr = data && Object.keys(data).length > 0
        ? ` ${JSON.stringify(data)}`
        : "";
      const line = `${timestamp} ${levelTag}${tenantTag} ${message}${dataStr}`;
      if (level === "error") {
        process.stderr.write(line + "\n");
      } else {
        process.stdout.write(line + "\n");
      }
    }
  }
}

/** The root logger (no tenant context — use .child() to add it) */
export const logger = new Logger();

/**
 * Create a logger with tenant context from a TenantContext-like object.
 * Usage:
 *   const log = createTenantLogger(ctx);
 *   log.info("Student created", { student_id });
 */
export function createTenantLogger(ctx: {
  organization_id: string;
  branch_id?: string | null;
  user_id?: string;
  role?: string;
  [key: string]: unknown;
}): Logger {
  return logger.child({
    organization_id: ctx.organization_id,
    branch_id: ctx.branch_id ?? null,
    user_id: ctx.user_id,
    role: ctx.role,
  });
}
