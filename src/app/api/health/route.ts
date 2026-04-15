import { NextResponse } from "next/server";
import { validateCriticalEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: Record<string, { ok: boolean; message?: string }>;
}

export async function GET() {
  const startTime = Date.now();
  const checks: HealthStatus["checks"] = {};

  // 1. Environment variables
  const envResult = validateCriticalEnv();
  checks["env"] = {
    ok: envResult.valid,
    message: envResult.valid
      ? "All critical env vars present"
      : `Missing: ${envResult.missing.join(", ")}`,
  };

  // 2. Supabase connectivity
  try {
    const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("organizations").select("id").limit(1);
    checks["supabase"] = {
      ok: !error,
      message: error ? `DB error: ${error.message}` : "Connected",
    };
  } catch (err) {
    checks["supabase"] = {
      ok: false,
      message: `Not available: ${(err as Error).message}`,
    };
  }

  // 3. Stripe connectivity
  try {
    if (process.env.STRIPE_SECRET_KEY) {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2026-03-25.dahlia",
      });
      await stripe.balance.retrieve();
      checks["stripe"] = { ok: true, message: "Connected" };
    } else {
      checks["stripe"] = { ok: false, message: "STRIPE_SECRET_KEY not set" };
    }
  } catch (err) {
    checks["stripe"] = {
      ok: false,
      message: `Error: ${(err as Error).message}`,
    };
  }

  // Overall status
  const allOk = Object.values(checks).every((c) => c.ok);
  const someOk = Object.values(checks).some((c) => c.ok);
  const status: HealthStatus["status"] = allOk
    ? "healthy"
    : someOk
    ? "degraded"
    : "unhealthy";

  const health: HealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev",
    checks,
  };

  const httpStatus = status === "unhealthy" ? 503 : 200;

  return NextResponse.json(health, {
    status: httpStatus,
    headers: {
      "Cache-Control": "no-store",
      "X-Response-Time": `${Date.now() - startTime}ms`,
    },
  });
}
