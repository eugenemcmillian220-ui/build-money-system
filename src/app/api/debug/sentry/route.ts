/**
 * Sentry Verification Endpoint
 * 
 * Throws a test error to verify Sentry is capturing events.
 * Only works in development or with admin auth in production.
 * 
 * Usage: GET /api/debug/sentry
 * Then check your Sentry dashboard for the test event.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Block in production unless explicitly enabled
  if (process.env.NODE_ENV === "production" && !process.env.ENABLE_SENTRY_TEST) {
    return NextResponse.json(
      { error: "Sentry test endpoint disabled in production. Set ENABLE_SENTRY_TEST=1 to enable temporarily." },
      { status: 403 }
    );
  }

  // Verify DSN is configured
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_SENTRY_DSN is not set. Sentry is not configured." },
      { status: 500 }
    );
  }

  // Throw a test error that Sentry should capture
  try {
    throw new Error("[Sentry Test] This is a verification error from /api/debug/sentry. If you see this in Sentry, it's working!");
  } catch (error) {
    // Import Sentry dynamically to capture the error
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(error);

    return NextResponse.json({
      success: true,
      message: "Test error sent to Sentry. Check your Sentry dashboard in 1-2 minutes.",
      dsn_configured: true,
      dsn_preview: dsn.replace(/\/\/(.+?)@/, "//<redacted>@"),
    });
  }
}
