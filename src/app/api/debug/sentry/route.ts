export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function GET() {
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureMessage("Sentry test from /api/debug/sentry", "info");
    return NextResponse.json({ ok: true, message: "Sentry test event sent" });
  } catch {
    return NextResponse.json({ ok: false, message: "Sentry not configured" }, { status: 500 });
  }
}
