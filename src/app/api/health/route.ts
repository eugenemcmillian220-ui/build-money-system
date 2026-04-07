import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    uptime: process.uptime(),
    services: {
      database: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      openrouter: !!process.env.OPENROUTER_API_KEY,
      vercel: !!process.env.VERCEL_TOKEN,
      github: !!process.env.GITHUB_TOKEN,
      stripe: !!process.env.STRIPE_SECRET_KEY,
    },
    phases: Array.from({ length: 18 }, (_, i) => `phase-${i + 1}`),
  };

  return NextResponse.json(health);
}
