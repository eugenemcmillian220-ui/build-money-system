import { registerOTel } from "@vercel/otel";
import * as Sentry from "@sentry/nextjs";

export function register() {
  registerOTel({
    serviceName: "build-money-system-sovereign",
  });

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 1.0,
      debug: false,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 1.0,
      debug: false,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
