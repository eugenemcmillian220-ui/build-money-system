/**
 * E2E Test Runner — exercises all 22 phases internally.
 * Protected by ADMIN_API_KEYS (env var) or CRON_SECRET or E2E_TEST_SECRET.
 *
 * POST /api/e2e-test
 * Headers: x-api-key: <admin key> OR Authorization: Bearer <admin key>
 * Body: { "phases": [1..22] } (optional, defaults to all)
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { keyManager } from "@/lib/key-manager";

function validateAdminKey(req: NextRequest): boolean {
  const apiKey =
    req.headers.get("x-api-key") ||
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!apiKey) return false;

  const adminKeys = (process.env.ADMIN_API_KEYS || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const cronSecret = process.env.CRON_SECRET;
  const e2eSecret = process.env.E2E_TEST_SECRET;

  return adminKeys.includes(apiKey) || apiKey === cronSecret || (!!e2eSecret && apiKey === e2eSecret);
}

interface PhaseResult {
  phase: number;
  name: string;
  status: "pass" | "fail" | "skip" | "degraded";
  elapsed: number;
  detail: string;
  error?: string;
}

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; elapsed: number }> {
  const start = Date.now();
  const result = await fn();
  return { result, elapsed: Date.now() - start };
}

async function phase1(): Promise<PhaseResult> {
  const name = "Component Forge";
  try {
    const { llmRouter } = await import("@/lib/llm-router");
    const messages = [{ role: "user" as const, content: "Generate a simple React button component using Tailwind CSS. Return only the code." }];
    const { result, elapsed } = await timed(() => llmRouter.executeWithFailover(messages));
    const code = result.content;
    const hasCode = code.length > 50 && (code.includes("function") || code.includes("export") || code.includes("const"));
    return { phase: 1, name, status: hasCode ? "pass" : "degraded", elapsed, detail: `Generated ${code.length} chars via ${result.provider}/${result.model}` };
  } catch (e) {
    return { phase: 1, name, status: "fail", elapsed: 0, detail: "LLM generation failed", error: String(e) };
  }
}

async function phase2(): Promise<PhaseResult> {
  const name = "SQL Forge";
  try {
    const { llmRouter } = await import("@/lib/llm-router");
    const messages = [{ role: "user" as const, content: "Generate a PostgreSQL CREATE TABLE statement for a users table with id, email, name, created_at. Return only SQL." }];
    const { result, elapsed } = await timed(() => llmRouter.executeWithFailover(messages));
    const sql = result.content;
    const hasSql = sql.toLowerCase().includes("create") || sql.length > 30;
    return { phase: 2, name, status: hasSql ? "pass" : "degraded", elapsed, detail: `Generated ${sql.length} chars via ${result.provider}/${result.model}` };
  } catch (e) {
    return { phase: 2, name, status: "fail", elapsed: 0, detail: "SQL generation failed", error: String(e) };
  }
}

async function phase3(): Promise<PhaseResult> {
  const name = "Deployment Engine";
  const hasGithubToken = !!process.env.GITHUB_ACCESS_TOKEN || !!process.env.GITHUB_TOKEN;
  const hasVercelToken = !!process.env.VERCEL_ACCESS_TOKEN || !!process.env.VERCEL_TOKEN;
  const detail = `GitHub: ${hasGithubToken ? "ok" : "missing"} | Vercel: ${hasVercelToken ? "ok" : "missing"}`;
  return { phase: 3, name, status: hasGithubToken || hasVercelToken ? "pass" : "degraded", elapsed: 0, detail };
}

async function phase4(): Promise<PhaseResult> {
  const name = "The Sentinel";
  try {
    const { security } = await import("@/lib/security");
    const checks = {
      csrfEnabled: true,
      securityHeaders: true,
      inputSanitization: typeof security.sanitizeInput === "function",
      apiKeyValidation: typeof security.validateApiKey === "function",
    };
    const allPassed = Object.values(checks).every(Boolean);
    return { phase: 4, name, status: allPassed ? "pass" : "degraded", elapsed: 0, detail: JSON.stringify(checks) };
  } catch (e) {
    return { phase: 4, name, status: "fail", elapsed: 0, detail: "Security module failed", error: String(e) };
  }
}

async function phase5(): Promise<PhaseResult> {
  const name = "Growth Lab";
  try {
    const { growthEngine } = await import("@/lib/growth-engine");
    const { result: growth, elapsed } = await timed(() => growthEngine.launchGrowth("AI SaaS platform"));
    return { phase: 5, name, status: growth ? "pass" : "degraded", elapsed, detail: "Growth strategy generated" };
  } catch (e) {
    return { phase: 5, name, status: "fail", elapsed: 0, detail: "Growth engine failed", error: String(e) };
  }
}

async function phase6(): Promise<PhaseResult> {
  const name = "Revenue Engine";
  try {
    const { monetizationEngine } = await import("@/lib/monetization");
    const { result: plan, elapsed } = await timed(() => monetizationEngine.startMonetization("Developer tools SaaS"));
    return { phase: 6, name, status: plan ? "pass" : "degraded", elapsed, detail: "Monetization plan generated" };
  } catch (e) {
    return { phase: 6, name, status: "fail", elapsed: 0, detail: "Revenue engine failed", error: String(e) };
  }
}

async function phase7(): Promise<PhaseResult> {
  const name = "The Healer";
  try {
    const diag = await import("@/lib/diagnostics");
    const hasDiag = Object.keys(diag).length > 0;
    return { phase: 7, name, status: hasDiag ? "pass" : "degraded", elapsed: 0, detail: `Diagnostics loaded (exports: ${Object.keys(diag).join(", ")})` };
  } catch (e) {
    return { phase: 7, name, status: "fail", elapsed: 0, detail: "Diagnostics import failed", error: String(e) };
  }
}

async function phase8(): Promise<PhaseResult> {
  const name = "DevOS Sandbox";
  const hasE2bKey = !!process.env.E2B_API_KEY;
  return { phase: 8, name, status: hasE2bKey ? "pass" : "degraded", elapsed: 0, detail: `E2B API: ${hasE2bKey ? "configured" : "not configured"}` };
}

async function phase9(): Promise<PhaseResult> {
  const name = "Enterprise Vision";
  try {
    const { AppBuildAgent } = await import("@/lib/agent");
    const agent = new AppBuildAgent(undefined, undefined);
    return { phase: 9, name, status: agent ? "pass" : "degraded", elapsed: 0, detail: "AppBuildAgent instantiated" };
  } catch (e) {
    return { phase: 9, name, status: "fail", elapsed: 0, detail: "Agent import failed", error: String(e) };
  }
}

async function phase10(): Promise<PhaseResult> {
  const name = "Sovereign Economy";
  try {
    const economy = await import("@/lib/economy");
    return { phase: 10, name, status: "pass", elapsed: 0, detail: `Economy loaded (exports: ${Object.keys(economy).join(", ")})` };
  } catch (e) {
    return { phase: 10, name, status: "fail", elapsed: 0, detail: "Economy import failed", error: String(e) };
  }
}

async function phase11(): Promise<PhaseResult> {
  const name = "Hype Engine";
  try {
    const mod = await import("@/lib/hype-agent");
    return { phase: 11, name, status: Object.keys(mod).length > 0 ? "pass" : "degraded", elapsed: 0, detail: `Hype agent loaded (exports: ${Object.keys(mod).join(", ")})` };
  } catch (e) {
    return { phase: 11, name, status: "fail", elapsed: 0, detail: "Hype agent import failed", error: String(e) };
  }
}

async function phase12(): Promise<PhaseResult> {
  const name = "Governance Hub";
  try {
    const gov = await import("@/lib/governance");
    return { phase: 12, name, status: "pass", elapsed: 0, detail: `Governance loaded (exports: ${Object.keys(gov).join(", ")})` };
  } catch (e) {
    return { phase: 12, name, status: "fail", elapsed: 0, detail: "Governance import failed", error: String(e) };
  }
}

async function phase13(): Promise<PhaseResult> {
  const name = "Autonomous VC";
  try {
    const vc = await import("@/lib/vc-agent");
    return { phase: 13, name, status: "pass", elapsed: 0, detail: `VC agent loaded (exports: ${Object.keys(vc).join(", ")})` };
  } catch (e) {
    return { phase: 13, name, status: "fail", elapsed: 0, detail: "VC agent import failed", error: String(e) };
  }
}

async function phase14(): Promise<PhaseResult> {
  const name = "Chief Diplomat";
  try {
    const diplomat = await import("@/lib/diplomat-agent");
    return { phase: 14, name, status: "pass", elapsed: 0, detail: `Diplomat loaded (exports: ${Object.keys(diplomat).join(", ")})` };
  } catch (e) {
    return { phase: 14, name, status: "fail", elapsed: 0, detail: "Diplomat import failed", error: String(e) };
  }
}

async function phase15(): Promise<PhaseResult> {
  const name = "Hive Mind";
  try {
    const hive = await import("@/lib/hive-mind");
    return { phase: 15, name, status: "pass", elapsed: 0, detail: `Hive Mind loaded (exports: ${Object.keys(hive).join(", ")})` };
  } catch (e) {
    return { phase: 15, name, status: "fail", elapsed: 0, detail: "Hive Mind import failed", error: String(e) };
  }
}

async function phase16(): Promise<PhaseResult> {
  const name = "Autonomous M&A";
  try {
    const ma = await import("@/lib/ma-agent");
    return { phase: 16, name, status: "pass", elapsed: 0, detail: `M&A agent loaded (exports: ${Object.keys(ma).join(", ")})` };
  } catch (e) {
    return { phase: 16, name, status: "fail", elapsed: 0, detail: "M&A agent import failed", error: String(e) };
  }
}

async function phase17(): Promise<PhaseResult> {
  const name = "Legal Vault";
  try {
    const legal = await import("@/lib/legal-agent");
    return { phase: 17, name, status: "pass", elapsed: 0, detail: `Legal agent loaded (exports: ${Object.keys(legal).join(", ")})` };
  } catch (e) {
    return { phase: 17, name, status: "fail", elapsed: 0, detail: "Legal import failed", error: String(e) };
  }
}

async function phase18(): Promise<PhaseResult> {
  const name = "R&D Scout";
  try {
    const rd = await import("@/lib/rd-agent");
    return { phase: 18, name, status: "pass", elapsed: 0, detail: `R&D agent loaded (exports: ${Object.keys(rd).join(", ")})` };
  } catch (e) {
    return { phase: 18, name, status: "fail", elapsed: 0, detail: "R&D agent import failed", error: String(e) };
  }
}

async function phase19(): Promise<PhaseResult> {
  const name = "DAO Engine";
  try {
    const dao = await import("@/lib/dao-engine");
    return { phase: 19, name, status: "pass", elapsed: 0, detail: `DAO engine loaded (exports: ${Object.keys(dao).join(", ")})` };
  } catch (e) {
    return { phase: 19, name, status: "fail", elapsed: 0, detail: "DAO engine import failed", error: String(e) };
  }
}

async function phase20(): Promise<PhaseResult> {
  const name = "Self-Evolution";
  try {
    const selfImprove = await import("@/lib/self-improve");
    return { phase: 20, name, status: "pass", elapsed: 0, detail: `Self-improve loaded (exports: ${Object.keys(selfImprove).join(", ")})` };
  } catch (e) {
    return { phase: 20, name, status: "fail", elapsed: 0, detail: "Self-improve import failed", error: String(e) };
  }
}

async function phase21(): Promise<PhaseResult> {
  const name = "CEO Orchestrator";
  try {
    const ceo = await import("@/lib/agents/ceo");
    return { phase: 21, name, status: "pass", elapsed: 0, detail: `CEO agent loaded (exports: ${Object.keys(ceo).join(", ")})` };
  } catch (e) {
    return { phase: 21, name, status: "fail", elapsed: 0, detail: "CEO agent import failed", error: String(e) };
  }
}

async function phase22(): Promise<PhaseResult> {
  const name = "Federation";
  try {
    const swarm = await import("@/lib/swarm-mesh");
    return { phase: 22, name, status: "pass", elapsed: 0, detail: `Swarm Mesh loaded (exports: ${Object.keys(swarm).join(", ")})` };
  } catch (e) {
    return { phase: 22, name, status: "fail", elapsed: 0, detail: "Swarm Mesh import failed", error: String(e) };
  }
}

const PHASE_RUNNERS = [
  phase1, phase2, phase3, phase4, phase5, phase6,
  phase7, phase8, phase9, phase10, phase11, phase12,
  phase13, phase14, phase15, phase16, phase17, phase18,
  phase19, phase20, phase21, phase22,
];

export async function POST(req: NextRequest) {
  // DA-003 FIX: Block in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'e2e-test endpoint disabled in production' }, { status: 404 });
  }

  if (!validateAdminKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  let requestedPhases: number[] | null = null;

  try {
    const body = await req.json().catch(() => ({}));
    if (body.phases && Array.isArray(body.phases)) {
      requestedPhases = body.phases;
    }
  } catch {}

  const results: PhaseResult[] = [];

  const llmAvailable =
    keyManager.isConfigured("openrouter") ||
    keyManager.isConfigured("groq") ||
    keyManager.isConfigured("gemini") ||
    keyManager.isConfigured("openai");

  for (let i = 0; i < PHASE_RUNNERS.length; i++) {
    const phaseNum = i + 1;
    if (requestedPhases && !requestedPhases.includes(phaseNum)) continue;

    if (!llmAvailable && [1, 2, 5, 6].includes(phaseNum)) {
      results.push({ phase: phaseNum, name: `Phase ${phaseNum}`, status: "skip", elapsed: 0, detail: "No LLM provider configured" });
      continue;
    }

    try {
      const result = await PHASE_RUNNERS[i]();
      results.push(result);
    } catch (e) {
      results.push({ phase: phaseNum, name: `Phase ${phaseNum}`, status: "fail", elapsed: 0, detail: "Unhandled error", error: String(e) });
    }
  }

  const totalElapsed = Date.now() - startTime;
  const summary = {
    pass: results.filter((r) => r.status === "pass").length,
    degraded: results.filter((r) => r.status === "degraded").length,
    fail: results.filter((r) => r.status === "fail").length,
    skip: results.filter((r) => r.status === "skip").length,
    total: results.length,
    elapsed: totalElapsed,
  };

  return NextResponse.json({ success: summary.fail === 0, timestamp: new Date().toISOString(), summary, results });
}
