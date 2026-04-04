import { supabaseAdmin } from "./supabase/db";
import { callLLM, cleanJson } from "./llm";

export interface InvestmentProposal {
  projectId: string;
  orgId: string;
  score: number;
  reasoning: string;
  suggestedCredits: number;
  equityShare: number;
}

/**
 * Autonomous VC Agent: Analyzes projects and makes investment decisions
 */
export class VCAgent {
  /**
   * Evaluates all projects in an organization for investment potential
   */
  async evaluateOrganization(orgId: string): Promise<InvestmentProposal[]> {
    if (!supabaseAdmin) throw new Error("Supabase admin not configured");

    // 1. Fetch performance data for all projects in the org
    const { data: metrics } = await supabaseAdmin
      .from("project_performance")
      .select("*, projects(name, description, org_id)")
      .eq("projects.org_id", orgId);

    if (!metrics || metrics.length === 0) return [];

    const proposals: InvestmentProposal[] = [];

    for (const metric of metrics) {
      const project = metric.projects as { name: string; description: string; org_id: string };
      
      // 2. AI Scoring Logic
      const systemPrompt = `You are a Principal at an Autonomous Venture Capital fund. 
      Analyze the following project metrics and decide if the platform should invest.
      
      Project: ${project.name}
      Users: ${metric.user_count}
      Revenue: $${metric.revenue_total}
      Growth Velocity: ${metric.growth_velocity}x
      Retention: ${metric.retention_rate}%
      
      If the project has high potential, suggest an investment in 'Platform Credits' (value $1 per 100 credits) 
      in exchange for a revenue share (typically 2-10%).
      
      Return ONLY a JSON object:
      {
        "shouldInvest": boolean,
        "score": number (0-100),
        "reasoning": "string",
        "suggestedCredits": number,
        "equityShare": number (decimal, e.g. 0.05 for 5%)
      }`;

      const response = await callLLM([{ role: "system", content: systemPrompt }, { role: "user", content: "Evaluate project now:" }], { temperature: 0.2 });
      const analysis = JSON.parse(cleanJson(response));

      if (analysis.shouldInvest) {
        proposals.push({
          projectId: metric.project_id,
          orgId,
          score: analysis.score,
          reasoning: analysis.reasoning,
          suggestedCredits: analysis.suggestedCredits,
          equityShare: analysis.equityShare
        });
      }
    }

    return proposals;
  }

  /**
   * Persists a formal investment offer to the database
   */
  async issueOffer(proposal: InvestmentProposal): Promise<string> {
    if (!supabaseAdmin) throw new Error("Supabase admin not configured");

    const { data, error } = await supabaseAdmin
      .from("investment_deals")
      .insert({
        org_id: proposal.orgId,
        project_id: proposal.projectId,
        amount_credits: proposal.suggestedCredits,
        equity_share: proposal.equityShare,
        terms: proposal.reasoning,
        status: "proposed"
      })
      .select("id")
      .single();

    if (error) throw new Error(`Offer issuance failed: ${error.message}`);
    return data.id;
  }
}

export const vcAgent = new VCAgent();
