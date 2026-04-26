export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { keyManager } from "@/lib/key-manager";

export const runtime = "nodejs";

/**
 * GET /api/env-check
 * Check environment variable configuration (safe exposure only - no key values)
 */
export async function GET(): Promise<Response> {
  const countKeys = (envVar: string | undefined): number => {
    if (!envVar) return 0;
    return envVar
      .split(/[\n,]+/)
      .map((k) => k.trim())
      .filter(Boolean).length;
  };

  const envStatus = {
    supabase: {
      url: { configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL },
      anonKey: { configured: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
      serviceRole: { configured: !!process.env.SUPABASE_SERVICE_ROLE_KEY },
    },
    aiProviders: {
      opencodezen: {
        configured: keyManager.isConfigured("opencodezen"),
        keyCount:
          countKeys(process.env.OPENCODE_ZEN_API_KEYS) ||
          countKeys(process.env.OPENCODE_ZEN_API_KEY),
      },
    },
    deployment: {
      vercel: { configured: !!process.env.VERCEL_TOKEN },
      github: { configured: !!process.env.GITHUB_TOKEN },
    },
    services: {
      stripe: { configured: !!process.env.STRIPE_SECRET_KEY },
      e2b: { configured: !!process.env.E2B_API_KEY },
      cron: { configured: !!process.env.CRON_SECRET },
      admin: { configured: !!process.env.ADMIN_API_KEYS },
    },
    publicEnv: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? "***configured***"
        : null,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || null,
    },
  };

  const aiConfigured = envStatus.aiProviders.opencodezen.configured;

  return NextResponse.json({
    ...envStatus,
    ready: aiConfigured,
    message: aiConfigured
      ? `OpenCode Zen configured with ${envStatus.aiProviders.opencodezen.keyCount} key(s).`
      : "OpenCode Zen not configured. Set OPENCODE_ZEN_API_KEY or OPENCODE_ZEN_API_KEYS.",
    note: "Only configuration status is exposed. Actual key values are never returned.",
  });
}
