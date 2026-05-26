import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

/** Security headers applied to every response */
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=15768000; includeSubDomains",
  "Content-Security-Policy":
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://app.posthog.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://api.stripe.com https://app.posthog.com https://*.up.railway.app https://*.vercel.app; " +
    "frame-src 'self' https://js.stripe.com; " +
    "object-src 'none'; " +
    "base-uri 'self';",
};

function applySecurityHeaders(response: NextResponse): void {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
}

/**
 * Origins allowed for CSRF validation on mutation requests.
 * FIX: Normalise VERCEL_URL — it may or may not include the https:// prefix.
 * Always strip any existing scheme before adding ours to prevent double-https.
 */
function getAllowedOrigins(): string[] {
  const origins: string[] = [];

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    try {
      origins.push(new URL(process.env.NEXT_PUBLIC_SITE_URL).origin);
    } catch {}
  }

  // FIX: VERCEL_URL is a bare hostname (e.g. "my-app.vercel.app"), not a full URL.
  // Strip any accidental scheme prefix before constructing the origin.
  if (process.env.VERCEL_URL) {
    const bare = process.env.VERCEL_URL.replace(/^https?:\/\//, "");
    origins.push(`https://${bare}`);
  }

  if (process.env.VERCEL_BRANCH_URL) {
    const bare = process.env.VERCEL_BRANCH_URL.replace(/^https?:\/\//, "");
    origins.push(`https://${bare}`);
  }

  if (process.env.NODE_ENV === "development") {
    origins.push("http://localhost:3000");
  }

  return origins;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function validateCsrf(request: NextRequest): NextResponse | null {
  if (SAFE_METHODS.has(request.method)) return null;

  // Skip CSRF for routes authenticated via other means
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/api/webhooks/") ||
    pathname.startsWith("/api/billing/webhook") ||
    pathname.startsWith("/api/manifest/worker")
  ) {
    return null;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const allowedOrigins = getAllowedOrigins();

  const sourceOrigin = origin ?? (referer ? new URL(referer).origin : null);

  if (!sourceOrigin || !allowedOrigins.includes(sourceOrigin)) {
    console.warn("[middleware] CSRF blocked — origin:", sourceOrigin, "allowed:", allowedOrigins);
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
  }

  return null;
}

const PUBLIC_PATHS = ["/login", "/signup", "/auth/callback", "/auth/confirm", "/api/webhooks", "/api/billing/webhook"];
const STATIC_PREFIXES = ["/_next/", "/favicon", "/robots.txt", "/sitemap"];

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    STATIC_PREFIXES.some((p) => pathname.startsWith(p))
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CSRF check first (before auth, so unauthenticated mutation attempts are blocked)
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  // Static assets and public API routes — skip auth
  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    const response = NextResponse.next();
    applySecurityHeaders(response);
    return response;
  }

  // Supabase session refresh
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Partial<ResponseCookie> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users away from protected routes
  if (!user && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    applySecurityHeaders(redirectResponse);
    return redirectResponse;
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const dashboardUrl = new URL("/dashboard", request.url);
    const redirectResponse = NextResponse.redirect(dashboardUrl);
    applySecurityHeaders(redirectResponse);
    return redirectResponse;
  }

  applySecurityHeaders(response);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
