export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { isDatabaseAvailable } from "@/lib/supabase/db";
import { isVercelAvailable } from "@/lib/deploy";
import { isGitHubAvailable } from "@/lib/github";
import { keyManager } from "@/lib/key-manager";

export const runtime = "nodejs";

/**
 * GET /api/status
 * Returns the operational status of all integrations and OpenCode Zen AI.
 */
import { requireAuth, isAuthError } from "@/lib/api-auth";

export async function GET(): Promise<Response> {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  const aiAvailable = keyManager.isConfigured("opencodezen");

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    ai: {
      available: aiAvailable,
      provider: "opencodezen",
      message: aiAvailable
        ? "OpenCode Zen AI is available"
        : "OpenCode Zen not configured. Set OPENCODE_ZEN_API_KEY.",
    },
    integrations: {
      database: {
        available: isDatabaseAvailable(),
        message: isDatabaseAvailable()
          ? "Database persistence is available"
          : "Database not configured. Set SUPABASE_SERVICE_ROLE_KEY.",
      },
      vercel: {
        available: isVercelAvailable(),
        message: isVercelAvailable()
          ? "Vercel deployment is available"
          : "Vercel not configured. Set VERCEL_TOKEN.",
      },
      github: {
        available: isGitHubAvailable(),
        message: isGitHubAvailable()
          ? "GitHub export is available"
          : "GitHub not configured. Set GITHUB_TOKEN.",
      },
    },
  });
}
