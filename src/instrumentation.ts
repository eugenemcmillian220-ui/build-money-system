import { registerOTel } from "@vercel/otel";

export function register() {
  registerOTel({
    serviceName: "build-money-system-sovereign",
  });

  // Lazy-load Sentry only at runtime, not during build
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    import("@sentry/nextjs").then((Sentry) => {
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        tracesSampleRate: 0.1,
        debug: false,
      });
    });
  }
}
