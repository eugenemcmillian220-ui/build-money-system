// Lazy-load Sentry at runtime to avoid build-time memory overhead
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      debug: false,
      replaysOnErrorSampleRate: 1.0,
      replaysSessionSampleRate: 0.05,
    });
  });
}
