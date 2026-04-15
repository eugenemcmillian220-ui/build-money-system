/**
 * CSRF Protection for API mutation routes.
 *
 * Strategy: Origin/Referer header validation (stateless, no tokens needed).
 * Works perfectly for Next.js API routes behind Vercel.
 *
 * - GET/HEAD/OPTIONS are safe methods → skip check
 * - POST/PUT/PATCH/DELETE must have a matching Origin or Referer header
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
 * Usage in API routes:
 *   const csrfError = await validateCsrf(request);
 *   if (csrfError) return csrfError;
 */
export async function validateCsrf(request: Request): Promise<NextResponse | null> {
  if (SAFE_METHODS.has(request.method.toUpperCase())) {
    return null; // Safe methods don't need CSRF protection
  }

  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const referer = headerStore.get("referer");

  // Stripe webhooks and other server-to-server calls won't have Origin/Referer
  // They should be authenticated via signature verification instead
  const stripeSignature = headerStore.get("stripe-signature");
  if (stripeSignature) {
    return null; // Webhook requests are verified by signature, not CSRF
  }

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
