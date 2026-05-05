/**
 * Structured Logger for Production
 * 
 * Outputs JSON logs in production (Vercel / structured log aggregation).
 * Outputs human-readable logs in development.
 * 
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info("User created", { userId: "abc", orgId: "xyz" });
 *   logger.error("Payment failed", { error: err, stripeSessionId: "sess_123" });
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL = process.env.LOG_LEVEL as LogLevel || (process.env.NODE_ENV === "production" ? "info" : "debug");

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack?.split("\n").slice(0, 5).join("\n"),
      ...(err.cause ? { cause: serializeError(err.cause) } : {}),
    };
  }
  return { raw: String(err) };
}

function formatContext(context?: Record<string, unknown>): Record<string, unknown> {
  if (!context) return {};
  const formatted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (value instanceof Error) {
      formatted[key] = serializeError(value);
    } else {
      formatted[key] = value;
    }
  }
  return formatted;
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;

  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    // Structured JSON output for log aggregation (Vercel, Datadog, etc.)
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...formatContext(context),
    };

    // Add service context
    entry.service = "sovereign-forge-os";
    if (process.env.VERCEL_GIT_COMMIT_SHA) {
      entry.version = process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
    }

    const output = JSON.stringify(entry);

    switch (level) {
      case "error":
        console.error(output);
        break;
      case "warn":
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  } else {
    // Human-readable output for development
    const prefix = `[${level.toUpperCase()}]`;
    const contextStr = context ? ` ${JSON.stringify(context, null, 2)}` : "";

    switch (level) {
      case "error":
        console.error(`${prefix} ${message}${contextStr}`);
        break;
      case "warn":
        console.warn(`${prefix} ${message}${contextStr}`);
        break;
      case "debug":
        console.debug(`${prefix} ${message}${contextStr}`);
        break;
      default:
        console.log(`${prefix} ${message}${contextStr}`);
    }
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => log("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) => log("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => log("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => log("error", message, context),

  /**
   * Create a child logger with default context fields.
   * Useful for request-scoped logging.
   *
   *   const reqLogger = logger.child({ requestId: "abc", route: "/api/billing" });
   *   reqLogger.info("Processing payment"); // includes requestId + route
   */
  child: (defaultContext: Record<string, unknown>) => ({
    debug: (message: string, context?: Record<string, unknown>) =>
      log("debug", message, { ...defaultContext, ...context }),
    info: (message: string, context?: Record<string, unknown>) =>
      log("info", message, { ...defaultContext, ...context }),
    warn: (message: string, context?: Record<string, unknown>) =>
      log("warn", message, { ...defaultContext, ...context }),
    error: (message: string, context?: Record<string, unknown>) =>
      log("error", message, { ...defaultContext, ...context }),
  }),
};
