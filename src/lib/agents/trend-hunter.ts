import { callLLMJson } from "../llm";
import { z } from "zod";

export const trendResultSchema = z.object({
  trends: z.array(z.object({
    name: z.string(),
    category: z.enum(["framework", "library", "api", "market"]),
    velocity: z.number(),
    relevance: z.number(),
    source: z.string(),
  })),
});

export type TrendResult = z.infer<typeof trendResultSchema>;

/**
 * Phase 18: The Trend Hunter - Autonomous Tech Scouting & R&D Agent
 */
export async function runTrendScout(): Promise<TrendResult> {
  const systemPrompt = `You are 'The Trend Hunter', an autonomous R&D agent.
Your mission is to identify emerging technology trends for the year 2026.

Focus on:
1. High-velocity GitHub libraries.
2. New AI models and API capabilities.
3. Market shifts in SaaS and Web3.

Return JSON ONLY:
{
  "trends": [
    { "name": "...", "category": "...", "velocity": 0-100, "relevance": 0-100, "source": "..." }
  ]
}`;

  try {
    return await callLLMJson(
      [{ role: "system", content: systemPrompt }],
      trendResultSchema,
      { temperature: 0.6 }
    );
  } catch (err) {
    console.error("Trend Scout failed:", err);
    return { trends: [] };
  }
}
