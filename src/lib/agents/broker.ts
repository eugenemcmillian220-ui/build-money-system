import { callLLMJson } from "../llm";
import { Project, brokerResultSchema } from "../types";

export type BrokerResult = {
  mergerPotential: Array<{
    targetProjectId: string;
    compatibility: number;
    strategy: string;
  }>;
  negotiationStrategy: string;
} & Record<string, unknown>;

/**
 * Phase 14 & 16: The Empire Broker - B2B Diplomacy & M&A Engine
 * This agent identifies strategic mergers and vendor negotiation opportunities.
 */
export async function runBrokerAgent(project: Project, existingProjects: Project[]): Promise<BrokerResult> {
  const existingProjectList = existingProjects
    .filter(p => p.id !== project.id)
    .map(p => `ID: ${p.id} | Name: ${p.name || "Untitled"} | Desc: ${p.description}`)
    .join("\n");

  const systemPrompt = `You are 'The Empire Broker', an elite B2B Diplomat and M&A Specialist.
Your mission is to identify strategic consolidation and negotiation opportunities.

Current Project: ${project.name || "Untitled Empire"}
Description: ${project.description}

Existing Organization Projects:
${existingProjectList || "None identified."}

Identify:
1. Merger Potential: Find projects in the list that would be more profitable if merged with the current one.
   - Compatibility: 0-100.
   - Strategy: How to combine the codebases and markets.
2. Negotiation Strategy: Define a strategy to negotiate volume discounts with API vendors (OpenAI, Stripe, Supabase) for this project's scale.

Return JSON ONLY:
{
  "mergerPotential": [
    { "targetProjectId": "UUID", "compatibility": number, "strategy": "..." }
  ],
  "negotiationStrategy": "Define the diplomacy approach."
}`;

  try {
    return await callLLMJson(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Identify M&A and vendor negotiation opportunities." }
      ],
      brokerResultSchema,
      { temperature: 0.4 }
    );
  } catch (err) {
    console.error("Broker Agent failed:", err);
    return {
      mergerPotential: [],
      negotiationStrategy: "Manual vendor audit required."
    };
  }
}
