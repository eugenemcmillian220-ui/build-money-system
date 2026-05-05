import { supabaseAdmin } from "./supabase/db";
import { callLLM, cleanJson } from "./llm";

export interface TechTrend {
  name: string;
  category: "framework" | "llm" | "library" | "protocol";
  source: "github" | "arxiv" | "huggingface";
  velocity: number;
  summary: string;
}

/**
 * R&D Agent: Autonomously scouts and tests emerging technologies
 */
export class RDAgent {
  /**
   * Scouts for emerging tech trends using AI-driven analysis of data feeds
   */
  async scoutTrends(): Promise<TechTrend[]> {
    // 1. Mock ingestion of 2026 data feeds (GitHub OSSInsight, arXiv API)
    const systemPrompt = `You are a Senior Technology Scout and Research Lead. 
    Analyze the current 2026 tech landscape and identify 3 high-velocity emerging technologies.
    
    Look for:
    - High star velocity on GitHub (>500 stars/week).
    - Breakthrough AI research on arXiv (e.g., 'Agentic RAG', 'Token-free LLMs').
    - New standard protocols (e.g., 'MCP', 'Agent Gateway Protocol').
    
    Return ONLY a JSON array of TechTrend objects:
    [
      { "name": "string", "category": "framework", "source": "github", "velocity": 1200, "summary": "string" }
    ]`;

    try {
      const response = await callLLM([{ role: "system", content: systemPrompt }, { role: "user", content: "Scout now:" }], { temperature: 0.4 });
      return JSON.parse(cleanJson(response));
    } catch (e) {
      console.error("[RDAgent] Scouting failed:", e);
      return [];
    }
  }

  /**
   * Persists trends and triggers autonomous verification projects
   */
  async processTrends(trends: TechTrend[]): Promise<void> {
    if (!supabaseAdmin) return;

    for (const trend of trends) {
      // 1. Insert trend into database
      const { data: newTrend } = await supabaseAdmin
        .from("research_trends")
        .upsert({
          tech_name: trend.name,
          category: trend.category,
          star_velocity: trend.velocity,
          discovery_source: trend.source,
          analysis_summary: trend.summary,
          adoption_status: "monitoring"
        }, { onConflict: "tech_name" })
        .select("id")
        .single();

      if (newTrend && trend.velocity > 1000) {
        // 2. Trigger Autonomous Verification (Mock Project Creation)
        console.log(`[R&D] High velocity detected for ${trend.name}. Triggering test project...`);
        
        await supabaseAdmin.from("rd_test_projects").insert({
          trend_id: newTrend.id,
          test_objective: `Verify integration of ${trend.name} into Next.js 15 architecture.`,
          verification_status: "pending"
        });
      }
    }
  }
}

export const rdAgent = new RDAgent();
