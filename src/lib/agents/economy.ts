import { callLLMJson } from "../llm";
import { Project, economyResultSchema } from "../types";

export type EconomyResult = {
  agentRoi: number;
  stakingAvailable: boolean;
  suggestedStake: number;
  estimatedMonthlyRevenue: number;
} & Record<string, unknown>;

/**
 * Phase 10 & 13: The Auditor of Economy - Agent ROI & Staking Engine
 * This agent analyzes the manifestation's niche to calculate profitability and investment potential.
 */
export async function runEconomyAgent(project: Project): Promise<EconomyResult> {
  const systemPrompt = `You are 'The Auditor of Economy', a principal-level investment and ROI agent.
Your mission is to analyze the manifestation's niche, market trends (2026), and potential profitability.

Project: ${project.name || "Untitled Empire"}
Description: ${project.description}

Analyze the monetization potential:
1. Estimate ROI (Return on Investment) - a multiplier of build cost (e.g., 5.5 for 550%).
2. Determine if the project is 'Staking Ready' (Phase 13).
3. Suggest a 'Suggested Stake' in Neural Credits (e.g., 500-5000).
4. Estimate Monthly Revenue (in USD) based on similar 2026 SaaS benchmarks.

Return JSON ONLY:
{
  "agentRoi": number (multiplier),
  "stakingAvailable": boolean,
  "suggestedStake": number (Neural Credits),
  "estimatedMonthlyRevenue": number (USD)
}`;

  try {
    return await callLLMJson(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Analyze monetization and investment potential." }
      ],
      economyResultSchema,
      { temperature: 0.3 }
    );
  } catch (err) {
    console.error("Economy Agent failed:", err);
    return {
      agentRoi: 1.0,
      stakingAvailable: false,
      suggestedStake: 0,
      estimatedMonthlyRevenue: 0
    };
  }
}
