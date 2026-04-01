import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";

export const runtime = "nodejs";

/**
 * GET /api/env-check
 * Check environment variable configuration (safe exposure only)
 */
export async function GET(): Promise<Response> {
  // Only expose whether env vars are set, not their values
  const envStatus = {
    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: {
      configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      source: "env",
    },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: {
      configured: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      source: "env",
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      configured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      source: "env",
    },
    // OpenRouter
    OPENROUTER_API_KEY: {
      configured: !!process.env.OPENROUTER_API_KEY,
      source: "env",
    },
    OPENROUTER_MODEL: {
      configured: !!process.env.OPENROUTER_MODEL,
      source: "env",
      value: process.env.OPENROUTER_MODEL || "default (openai/gpt-4o-mini)",
    },
    // Vercel
    VERCEL_TOKEN: {
      configured: !!process.env.VERCEL_TOKEN,
      source: "env",
    },
    VERCEL_TEAM_ID: {
      configured: !!process.env.VERCEL_TEAM_ID,
      source: "env",
    },
    // GitHub
    GITHUB_TOKEN: {
      configured: !!process.env.GITHUB_TOKEN,
      source: "env",
    },
    // Admin
    ADMIN_API_KEYS: {
      configured: !!process.env.ADMIN_API_KEYS,
      source: "env",
    },
    // Site
    NEXT_PUBLIC_SITE_URL: {
      configured: !!process.env.NEXT_PUBLIC_SITE_URL,
      source: "env",
    },
  };

  // Frontend accessible env vars
  const publicEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "***configured***" : null,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || null,
  };

  return NextResponse.json({
    env: envStatus,
    publicEnv,
    message: "Environment variable status check complete",
    note: "Only status (configured/not) is exposed. Actual values are hidden for security.",
  });
}
