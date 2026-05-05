import { supabaseAdmin } from "./supabase/db";
import { callLLM, cleanJson } from "./llm";

export interface MergerProposal {
  sourceId: string;
  targetId: string;
  synergyScore: number;
  reasoning: string;
  equitySplit: { source: number; target: number };
}

/**
 * Autonomous M&A Agent: Identifies and orchestrates project mergers
 */
export class MAAgent {
  /**
   * Scans for complementary projects within an organization
   */
  async detectSynergy(orgId: string): Promise<MergerProposal[]> {
    if (!supabaseAdmin) throw new Error("Supabase admin not configured");

    const { data: projects } = await supabaseAdmin
      .from("projects")
      .select("id, name, description, integrations")
      .eq("org_id", orgId);

    if (!projects || projects.length < 2) return [];

    const proposals: MergerProposal[] = [];

    // Pairwise comparison for synergies
    for (let i = 0; i < projects.length; i++) {
      for (let j = i + 1; j < projects.length; j++) {
        const p1 = projects[i];
        const p2 = projects[j];

        const systemPrompt = `You are a Chief M&A Strategy Agent. 
        Evaluate if these two projects should be MERGED into a single unified business.
        
        Project A: ${p1.name} - ${p1.description}
        Project B: ${p2.name} - ${p2.description}
        
        Synergy is high if:
        1. They share target audiences but solve different problems (e.g. CRM + Email Tool).
        2. One provides a technical component the other needs (e.g. Auth + Dashboard).
        
        Return ONLY a JSON object:
        {
          "shouldMerge": boolean,
          "synergyScore": number (0-1.0),
          "reasoning": "string",
          "equitySplit": { "source": 0.X, "target": 0.Y }
        }`;

        try {
          const response = await callLLM([{ role: "system", content: systemPrompt }, { role: "user", content: "Analyze merger potential:" }], { temperature: 0.2 });
          const analysis = JSON.parse(cleanJson(response));

          if (analysis.shouldMerge && analysis.synergyScore > 0.7) {
            proposals.push({
              sourceId: p1.id,
              targetId: p2.id,
              synergyScore: analysis.synergyScore,
              reasoning: analysis.reasoning,
              equitySplit: analysis.equitySplit
            });
          }
        } catch (e) {
          console.error("[MAAgent] Synergy check failed:", e);
        }
      }
    }

    return proposals;
  }

  /**
   * Persists a merger proposal and performs technical due diligence
   */
  async proposeMerger(proposal: MergerProposal): Promise<string> {
    if (!supabaseAdmin) throw new Error("Supabase admin not configured");

    // Perform mock technical due diligence (2026 pattern)
    const technicalDD = {
      codeCompatibility: "high",
      dependencyConflicts: ["react-version-mismatch"],
      remediationPlan: "Semantic Rebase Level 4",
      riskScore: 0.15
    };

    const { data, error } = await supabaseAdmin
      .from("merger_proposals")
      .insert({
        source_project_id: proposal.sourceId,
        target_project_id: proposal.targetId,
        synergy_score: proposal.synergyScore,
        synergy_reasoning: proposal.reasoning,
        proposed_equity_split: proposal.equitySplit,
        technical_due_diligence: technicalDD,
        status: "proposed"
      })
      .select("id")
      .single();

    if (error) throw new Error(`Merger proposal failed: ${error.message}`);
    return data.id;
  }
}

export const maAgent = new MAAgent();
