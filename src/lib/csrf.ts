/**
 * CSRF Protection for API mutation routes.
 *
 * Strategy: Origin/Referer header validation (stateless, no tokens needed).
 * Works perfectly for Next.js API routes behind Vercel.
 *
 * - GET/HEAD/OPTIONS are safe methods → skip check
 * - POST/PUT/PATCH/DELETE must have a matching Origin or Referer header
 *
 * NOTE: Webhook routes (e.g., /api/webhooks/*, /api/billing/webhook)
 * should be excluded from CSRF at the middleware/route level, NOT here.
 * Each webhook route is responsible for its own signature verification.
 */

import { headers } from "next/headers";
import { NextResponse } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function getAllowedOrigins(): string[] {
  const origins: string[] = [];

  // Primary site URL
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    origins.push(new URL(process.env.NEXT_PUBLIC_SITE_URL).origin);
  }

  // Vercel auto-generated URLs
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }
  if (process.env.VERCEL_BRANCH_URL) {
    origins.push(`https://${process.env.VERCEL_BRANCH_URL}`);
  }

  // Local development
  if (process.env.NODE_ENV === "development") {
    origins.push("http://localhost:3000");
  }

  return origins;
}

/**
 * Validates CSRF for mutation requests.
 * Returns null if valid, or a NextResponse error if invalid.
 *
 * SECURITY FIX: Removed the stripe-signature bypass. Attackers could add a
 * fake stripe-signature header to any request to bypass CSRF entirely.
 * Webhook routes should be excluded from CSRF at the middleware level instead.
 */
export async function validateCsrf(request: Request): Promise<NextResponse | null> {
  if (SAFE_METHODS.has(request.method.toUpperCase())) {
    return null; // Safe methods don't need CSRF protection
  }

  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const referer = headerStore.get("referer");
  const allowedOrigins = getAllowedOrigins();

  // Check Origin header first (most reliable)
  if (origin) {
    if (allowedOrigins.includes(origin)) {
      return null;
    }
    console.warn(`[CSRF] Blocked request with origin: ${origin}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fall back to Referer header
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (allowedOrigins.includes(refererOrigin)) {
        return null;
      }
    } catch {
      // Invalid referer URL
    }
    console.warn(`[CSRF] Blocked request with referer: ${referer}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // No Origin or Referer — block by default for browser requests
  // Server-to-server calls should use API keys or signatures instead
  console.warn("[CSRF] Blocked request with no origin/referer");
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
