import { callLLMJson } from "../llm";
import { Project, economyResultSchema } from "../types";

export type EconomyResult = {
  agentRoi: number;
  stakingAvailable: boolean;
  suggestedStake: number;
  estimatedMonthlyRevenue: number;
  tokenomicsModel?: string;
  exitStrategy?: string;
} & Record<string, unknown>;

/**
 * Phase 10 & 13: The Auditor of Economy - Agent ROI & Staking Engine
 * This agent analyzes the manifestation's niche to calculate profitability and investment potential.
 */
export async function runEconomyAgent(project: Project): Promise<EconomyResult> {
  const systemPrompt = `You are "The Auditor of Economy", the Financial & Tokenomics Lead for Sovereign Forge OS (2026).
    Your goal is to conduct a detailed economic analysis and monetization strategy for: ${project.name || "Untitled Empire"}.
    
    Project Description: ${project.description}
    
    Analyze and produce:
    1. Agent ROI: Estimated return on investment as a multiplier of the total manifestation cost.
    2. Staking Potential: Determine if the project qualifies for the Phase 13 Sovereign Staking Pool.
    3. Suggested Stake: Recommended initial credit injection to bootstrap liquidity and growth.
    4. Revenue Projection: Estimated monthly revenue in USD, accounting for current 2026 market benchmarks and growth velocity.
    5. Tokenomics Model: Suggestions for internal credit usage, loyalty rewards, or governance tokens.
    6. Exit Strategy: Potential M&A targets or IPO path for the manifestation.
    
    Return JSON ONLY:
    {
      "agentRoi": number (e.g., 4.5),
      "stakingAvailable": boolean,
      "suggestedStake": number (in Neural Credits),
      "estimatedMonthlyRevenue": number (in USD),
      "tokenomicsModel": "Detailed description of the suggested tokenomics",
      "exitStrategy": "Description of potential exit paths"
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
