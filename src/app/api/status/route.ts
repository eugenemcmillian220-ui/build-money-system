import { NextResponse } from "next/server";
import { isDatabaseAvailable } from "@/lib/supabase/db";
import { isVercelAvailable } from "@/lib/deploy";
import { isGitHubAvailable } from "@/lib/github";

export const runtime = "nodejs";

/**
 * GET /api/status
 * Get the status of all integrations
 */
export async function GET(): Promise<Response> {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
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
