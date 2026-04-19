import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Security headers applied to every response */
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  // FIX: Reduced HSTS max-age from 2 years to 6 months for launch period.
  // Once stable in production for 3+ months, increase to 63072000 and add preload.
  "Strict-Transport-Security": "max-age=15768000; includeSubDomains",
  "Content-Security-Policy":
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https://*.supabase.co https://*.sentry.io https://api.stripe.com https://*.openrouter.ai https://api.openai.com https://generativelanguage.googleapis.com https://api.groq.com; " +
    "frame-src 'self' https://js.stripe.com; " +
    "object-src 'none'; " +
    "base-uri 'self';",
};

function applySecurityHeaders(response: NextResponse): void {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
}

/** Origins allowed for CSRF validation on mutation requests */
function getAllowedOrigins(): string[] {
  const origins: string[] = [];
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    try { origins.push(new URL(process.env.NEXT_PUBLIC_SITE_URL).origin); } catch {}
  }
  if (process.env.VERCEL_URL) origins.push(`https://${process.env.VERCEL_URL}`);
  if (process.env.VERCEL_BRANCH_URL) origins.push(`https://${process.env.VERCEL_BRANCH_URL}`);
  if (process.env.NODE_ENV === "development") origins.push("http://localhost:3000");
  return origins;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function validateCsrf(request: NextRequest): NextResponse | null {
  // Only check mutations
  if (SAFE_METHODS.has(request.method)) return null;

  // Skip CSRF for webhook routes (authenticated via signature)
  if (request.nextUrl.pathname.startsWith("/api/webhooks/") ||
      request.nextUrl.pathname.startsWith("/api/billing/webhook")) {
    return null;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const allowed = getAllowedOrigins();

  if (origin && allowed.includes(origin)) return null;
  if (referer) {
    try {
      if (allowed.includes(new URL(referer).origin)) return null;
    } catch {}
  }

  // If no origin/referer and it's an API route with auth header, allow
  // (server-to-server calls with API keys)
  if (!origin && !referer) {
    const authHeader = request.headers.get("authorization");
    if (authHeader) return null;
  }

  console.warn(`[CSRF] Blocked ${request.method} ${request.nextUrl.pathname} origin=${origin} referer=${referer}`);
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function middleware(request: NextRequest) {
  // CSRF check first (before any DB calls)
  const csrfBlock = validateCsrf(request);
  if (csrfBlock) {
    applySecurityHeaders(csrfBlock);
    return csrfBlock;
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase is not configured, allow all traffic through
  if (!supabaseUrl || !supabaseAnonKey) {
    applySecurityHeaders(supabaseResponse);
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Protected routes: /app and /dashboard
  const isProtected =
    pathname.startsWith("/app") || pathname.startsWith("/dashboard");

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    const redirectResponse = NextResponse.redirect(url);
    applySecurityHeaders(redirectResponse);
    return redirectResponse;
  }

  // Redirect logged-in users away from auth pages
  if ((pathname === "/login" || pathname === "/signup") && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    const redirectResponse = NextResponse.redirect(url);
    applySecurityHeaders(redirectResponse);
    return redirectResponse;
  }

  applySecurityHeaders(supabaseResponse);
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
