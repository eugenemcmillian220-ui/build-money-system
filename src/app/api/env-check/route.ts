export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { keyManager } from "@/lib/key-manager";

export const runtime = "nodejs";

/**
 * GET /api/env-check
 * Check environment variable configuration (safe exposure only - no key values)
 */
export async function GET(): Promise<Response> {
  const countKeys = (single: string | undefined, multi: string | undefined): number => {
    const combined = [single, multi]
      .filter(Boolean)
      .join(",");
    return combined
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
      openrouter: {
        configured: keyManager.isConfigured("openrouter"),
        keyCount: countKeys(process.env.OPENROUTER_API_KEY, process.env.OPENROUTER_API_KEYS),
        model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free",
      },
      groq: {
        configured: keyManager.isConfigured("groq"),
        keyCount: countKeys(process.env.GROQ_API_KEY, process.env.GROQ_API_KEYS),
      },
      gemini: {
        configured: keyManager.isConfigured("gemini"),
        keyCount: countKeys(process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEYS),
      },
      openai: {
        configured: keyManager.isConfigured("openai"),
        keyCount: countKeys(process.env.OPENAI_API_KEY, process.env.OPENAI_API_KEYS),
      },
      deepseek: {
        configured: keyManager.isConfigured("deepseek"),
        keyCount: countKeys(process.env.DEEPSEEK_API_KEY, process.env.DEEPSEEK_API_KEYS),
      },
      cerebras: {
        configured: keyManager.isConfigured("cerebras"),
        keyCount: countKeys(process.env.CEREBRAS_API_KEY, process.env.CEREBRAS_API_KEYS),
      },
      cloudflare: {
        configured: keyManager.isConfigured("cloudflare"),
        keyCount: countKeys(process.env.CLOUDFLARE_API_KEY, process.env.CLOUDFLARE_API_KEYS),
        accountId: { configured: !!process.env.CLOUDFLARE_ACCOUNT_ID },
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

  const anyAiConfigured = Object.values(envStatus.aiProviders).some((p) => p.configured);

  return NextResponse.json({
    ...envStatus,
    ready: anyAiConfigured,
    message: anyAiConfigured
      ? "At least one AI provider is configured."
      : "No AI provider configured. Add at least one of: OPENROUTER_API_KEY, GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY.",
    note: "Only configuration status is exposed. Actual key values are never returned.",
  });
}
