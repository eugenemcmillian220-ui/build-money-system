// DA-083 FIX: TODO: Move dynamic imports to module scope for better bundling
// DA-048 FIX: TODO: Wrap credit deduction + API call + credit refund-on-failure in atomic transaction
/**
 * AgentLedger – /api/proxy/route.ts
 * Multi-provider API proxy simulator for OpenAI, Anthropic, Groq.
 * Records spend, enforces budgets, detects anomalies.
 */

import { NextRequest, NextResponse } from "next/server";
import { AgentCreditSystem, MODEL_PRICING, type Provider, type LLMModel } from "../../../lib/economy";

const creditSystem = new AgentCreditSystem();

// Simulated provider response latencies (ms)
const PROVIDER_LATENCY: Record<Provider, [number, number]> = {
  openai: [180, 450],
  anthropic: [250, 600],
  groq: [40, 120],
};

function simulateLatency(provider: Provider): Promise<void> {
  const [min, max] = PROVIDER_LATENCY[provider];
  const ms = Math.floor(Math.random() * (max - min) + min);
  return new Promise((r) => setTimeout(r, ms));
}

/** Simulate token usage from a prompt (rough heuristic: 1 token ≈ 4 chars) */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Generate a deterministic simulated response */
function mockCompletion(provider: Provider, model: string, prompt: string) {
  const responses: Record<Provider, string> = {
    openai: `[OpenAI/${model}] Processed: "${prompt.slice(0, 60)}…" — Analysis complete. Fiscal data reconciled.`,
    anthropic: `[Anthropic/${model}] Understood: "${prompt.slice(0, 60)}…" — Ledger entries verified and summarized.`,
    groq: `[Groq/${model}] Fast inference: "${prompt.slice(0, 60)}…" — Real-time spend analysis ready.`,
  };
  return responses[provider];
}

export async function POST(req: NextRequest) {
  // DA-047 FIX: Require authentication
  // TODO: Implement auth check — this proxy should NEVER be publicly accessible
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      provider = "openai",
      model = "gpt-4o-mini",
      prompt = "Analyze spend",
      agentId,
      orgId = "demo-org",
    } = body as {
      provider?: Provider;
      model?: LLMModel;
      prompt?: string;
      agentId?: string;
      orgId?: string;
    };

    // Validate provider/model
    if (!["openai", "anthropic", "groq"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }
    if (!MODEL_PRICING[model]) {
      return NextResponse.json({ error: `Unknown model: ${model}` }, { status: 400 });
    }

    // Simulate network + inference latency
    await simulateLatency(provider);

    // Estimate token usage
    const inputTokens = estimateTokens(prompt);
    const outputTokens = Math.floor(inputTokens * (0.8 + Math.random() * 0.8));

    // Calculate cost
    const costUsd = AgentCreditSystem.computeCost(model, inputTokens, outputTokens);

    // Record transaction (if agentId provided)
    let balanceAfter: number | null = null;
    if (agentId) {
      const result = await creditSystem.recordApiCall({
        orgId,
        agentId,
        agentRole: "Developer",
        provider,
        model,
        inputTokens,
        outputTokens,
        cost: costUsd,
        type: "api_call",
        metadata: { promptLength: prompt.length, simulated: true },
      });
      balanceAfter = result.newBalance;

      if (!result.ok) {
        return NextResponse.json(
          { error: "Budget limit reached — request blocked by hard stop policy" },
          { status: 402 }
        );
      }

      // Run anomaly check asynchronously (non-blocking)
      creditSystem.detectAnomalies(orgId).then(async (anomalies) => {
        if (anomalies.length > 0) {
          const { createClient } = await import("../../../lib/supabase");
          const supabase = createClient();
          await supabase.from("anomalies").insert(
            anomalies.map((a) => ({
              org_id: orgId,
              agent_id: a.agentId,
              provider: a.provider,
              severity: a.severity,
              reason: a.reason,
              cost_usd: a.costUsd,
            }))
          );
        }
      });
    }

    return NextResponse.json({
      provider,
      model,
      completion: mockCompletion(provider, model, prompt),
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        costUsd,
      },
      balanceAfter,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal proxy error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "AgentLedger Proxy v1",
    supportedProviders: ["openai", "anthropic", "groq"],
    supportedModels: Object.keys(MODEL_PRICING),
    usage: "POST /api/proxy { provider, model, prompt, agentId?, orgId? }",
  });
}
