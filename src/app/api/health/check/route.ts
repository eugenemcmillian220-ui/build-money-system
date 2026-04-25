export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { keyManager } from "@/lib/key-manager";

export const runtime = "nodejs";

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: "checking",
    checks: {
      environment: checkEnvironment(),
      database: checkDatabase(),
      llm: checkLLM(),
      deployment: checkDeployment(),
      integrations: checkIntegrations(),
    },
  };

  const allPassed = Object.values(checks.checks).every((c) => c.pass);
  checks.status = allPassed ? "ready" : "issues_found";

  return NextResponse.json(checks);
}

function checkEnvironment() {
  const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];

  const missing = required.filter((key) => !process.env[key]);
  const configured = required.filter((key) => !!process.env[key]);

  return {
    name: "Environment Variables",
    pass: missing.length === 0,
    message:
      missing.length === 0
        ? "All required environment variables configured"
        : `Missing: ${missing.join(", ")}`,
    details: { required: { configured, missing } },
  };
}

function checkDatabase() {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  return {
    name: "Database (Supabase)",
    pass: hasUrl && hasAnonKey && hasServiceKey,
    message:
      hasUrl && hasAnonKey
        ? "Supabase configured" + (hasServiceKey ? " with service role" : " (no service role)")
        : "Supabase not configured",
    details: { url: hasUrl, anonKey: hasAnonKey, serviceKey: hasServiceKey },
  };
}

function checkLLM() {
  const providers = (
    ["opencodezen"] as const
  ).reduce(
    (acc, p) => {
      acc[p] = keyManager.isConfigured(p);
      return acc;
    },
    {} as Record<string, boolean>,
  );

  const available = Object.entries(providers).filter(([, v]) => v);
  const configured = available.length > 0;

  return {
    name: "LLM Providers",
    pass: configured,
    message: configured
      ? `${available.length} provider(s) configured: ${available.map(([p]) => p).join(", ")}`
      : "No LLM providers configured. Add at least one API key.",
    details: {
      providers,
      count: available.length,
      multiKeyRotation: true,
    },
  };
}

function checkDeployment() {
  const hasVercel = !!process.env.VERCEL_TOKEN;
  const hasGitHub = !!process.env.GITHUB_TOKEN;

  return {
    name: "Deployment & Export",
    pass: hasVercel || hasGitHub,
    message: [
      hasVercel ? "Vercel deployment configured" : "Vercel not configured",
      hasGitHub ? "GitHub export configured" : "GitHub not configured",
    ].join(", "),
    details: { vercel: hasVercel, github: hasGitHub },
  };
}

function checkIntegrations() {
  const integrations = {
    stripe: !!process.env.STRIPE_SECRET_KEY,
    e2b: !!process.env.E2B_API_KEY,
    discord: !!process.env.DISCORD_TOKEN,
    slack: !!process.env.SLACK_TOKEN,
  };

  const count = Object.values(integrations).filter(Boolean).length;

  return {
    name: "Integrations",
    pass: true,
    message: count > 0 ? `${count} integration(s) configured` : "No integrations configured (optional)",
    details: integrations,
  };
}
