import { Project, brokerResultSchema } from "../types";
import { runStandardAgent } from "./agent-wrapper";

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
2. Negotiation Strategy: Define a strategy to negotiate volume discounts with API vendors (OpenCode Zen, Stripe, Supabase) for this project's scale.

Return JSON ONLY:
{
  "mergerPotential": [
    { "targetProjectId": "UUID", "compatibility": number, "strategy": "..." }
  ],
  "negotiationStrategy": "Define the diplomacy approach."
}`;

  return runStandardAgent<{ project: Project; existingProjects: Project[] }, BrokerResult>(
    {
      config: {
        name: "Broker",
        role: "B2B Diplomat & M&A Specialist",
        temperature: 0.4,
      },
      schema: brokerResultSchema,
      buildMessages: () => [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Identify M&A and vendor negotiation opportunities." }
      ],
      fallback: {
        mergerPotential: [],
        negotiationStrategy: "Manual vendor audit required."
      },
    },
    { project, existingProjects }
  );
}
