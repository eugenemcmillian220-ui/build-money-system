export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { isDatabaseAvailable } from "@/lib/supabase/db";
import { isVercelAvailable } from "@/lib/deploy";
import { isGitHubAvailable } from "@/lib/github";
import { keyManager } from "@/lib/key-manager";

export const runtime = "nodejs";

/**
 * GET /api/status
 * Returns the operational status of all integrations and AI providers.
 */
export async function GET(): Promise<Response> {
  const providers = (["openrouter", "groq", "gemini", "openai", "deepseek", "cerebras", "cloudflare"] as const).reduce(
    (acc, p) => {
      acc[p] = { available: keyManager.isConfigured(p) };
      return acc;
    },
    {} as Record<string, { available: boolean }>,
  );

  const anyAiAvailable = Object.values(providers).some((p) => p.available);

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    ai: {
      available: anyAiAvailable,
      providers,
      message: anyAiAvailable
        ? "AI generation is available"
        : "No AI provider configured. Add at least one API key.",
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
