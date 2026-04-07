import { NextResponse } from "next/server";

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

  const allPassed = Object.values(checks.checks).every(c => c.pass);

  checks.status = allPassed ? "ready" : "issues_found";

  return NextResponse.json(checks);
}

function checkEnvironment() {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ];

  const optional = [
    "OPENROUTER_API_KEY",
    "STRIPE_SECRET_KEY",
    "VERCEL_TOKEN",
    "GITHUB_TOKEN",
  ];

  const missing = required.filter(key => !process.env[key]);
  const configured = required.filter(key => !!process.env[key]);

  return {
    name: "Environment Variables",
    pass: missing.length === 0,
    message: missing.length === 0
      ? "All required environment variables configured"
      : `Missing: ${missing.join(", ")}`,
    details: {
      required: { configured, missing },
      optional: optional.filter(key => !!process.env[key]),
    },
  };
}

function checkDatabase() {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  return {
    name: "Database (Supabase)",
    pass: hasUrl && hasAnonKey && hasServiceKey,
    message: hasUrl && hasAnonKey
      ? "Supabase configured" + (hasServiceKey ? " with service role" : " (no service role)")
      : "Supabase not configured",
    details: {
      url: hasUrl,
      anonKey: hasAnonKey,
      serviceKey: hasServiceKey,
    },
  };
}

function checkLLM() {
  const providers = {
    openrouter: !!process.env.OPENROUTER_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
    deepseek: !!process.env.DEEPSEEK_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
  };

  const availableProviders = Object.entries(providers).filter(([_, configured]) => configured);
  const configured = availableProviders.length > 0;

  return {
    name: "LLM Providers",
    pass: configured,
    message: configured
      ? `${availableProviders.length} provider(s) configured: ${availableProviders.map(([p]) => p).join(", ")}`
      : "No LLM providers configured",
    details: {
      primary: providers.openrouter ? "OpenRouter" : availableProviders[0]?.[0] || "none",
      available: Object.keys(providers).filter(p => providers[p as keyof typeof providers]),
      count: availableProviders.length,
    },
  };
}

function checkDeployment() {
  const hasVercel = !!process.env.VERCEL_TOKEN && !!process.env.VERCEL_PROJECT_ID;
  const hasGitHub = !!process.env.GITHUB_TOKEN;

  return {
    name: "Deployment & Export",
    pass: hasVercel || hasGitHub,
    message: [
      hasVercel ? "Vercel deployment configured" : "Vercel not configured",
      hasGitHub ? "GitHub export configured" : "GitHub not configured",
    ].join(", "),
    details: {
      vercel: hasVercel,
      github: hasGitHub,
    },
  };
}

function checkIntegrations() {
  const integrations = {
    stripe: !!process.env.STRIPE_SECRET_KEY,
    e2b: !!process.env.E2B_API_KEY,
    x: !!process.env.X_API_KEY,
    linkedin: !!process.env.LINKEDIN_CLIENT_ID,
    discord: !!process.env.DISCORD_TOKEN,
    slack: !!process.env.SLACK_TOKEN,
  };

  const configured = Object.entries(integrations).filter(([_, c]) => c).length;

  return {
    name: "Integrations",
    pass: true, // Integrations are optional
    message: configured > 0
      ? `${configured} integration(s) configured`
      : "No integrations configured (optional)",
    details: integrations,
  };
}
