import { supabaseAdmin } from "./supabase/db";
import { callLLM, cleanJson } from "./llm";

export interface KnowledgePattern {
  type: "bug_fix" | "architecture" | "ui_pattern";
  problem: string;
  solution: Record<string, unknown>;
  tags: string[];
}

/**
 * Hive Mind Engine: Collective learning across organizations
 */
export class HiveMind {
  /**
   * Extracts an anonymized pattern from a successful fix or build
   */
  async extractPattern(problem: string, solution: Record<string, unknown>, type: "bug_fix" | "architecture"): Promise<KnowledgePattern | null> {
    const systemPrompt = `You are a Knowledge Synthesis Agent. 
    Your goal is to extract an ANONYMIZED pattern from this ${type}.
    
    1. Strip all PII, proprietary project names, and private strings.
    2. Convert the solution into a generic "AST Delta" or reusable snippet.
    3. Categorize with relevant technical tags (e.g., 'nextjs-15', 'supabase-auth', 'react-hooks').
    
    Problem: ${problem}
    Solution: ${JSON.stringify(solution).slice(0, 2000)}
    
    Return ONLY a JSON object:
    {
      "type": "${type}",
      "problem": "Anonymized problem description",
      "solution": { "delta": "..." },
      "tags": ["tag1", "tag2"]
    }`;

    try {
      const response = await callLLM([{ role: "system", content: systemPrompt }, { role: "user", content: "Synthesize pattern:" }], { temperature: 0.1 });
      return JSON.parse(cleanJson(response));
    } catch (e) {
      console.error("[HiveMind] Failed to extract pattern:", e);
      return null;
    }
  }

  /**
   * Submits an anonymized pattern to the global knowledge base
   */
  async contribute(pattern: KnowledgePattern, orgId?: string): Promise<void> {
    if (!supabaseAdmin) return;

    // 1. Check if similar pattern exists (Simplified vector check mock)
    const { data: existing } = await supabaseAdmin
      .from("hive_knowledge_base")
      .select("id, confidence_score, usage_count")
      .eq("pattern_type", pattern.type)
      .textSearch("problem_description", pattern.problem.split(' ').join(' | '))
      .limit(1)
      .single();

    if (existing) {
      // 2. Increment confidence if pattern is rediscovered
      await supabaseAdmin
        .from("hive_knowledge_base")
        .update({ 
          confidence_score: (existing.confidence_score || 0) + 0.1,
          usage_count: (existing.usage_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id);
    } else {
      // 3. Insert new knowledge asset
      const { data: newAsset } = await supabaseAdmin
        .from("hive_knowledge_base")
        .insert({
          pattern_type: pattern.type,
          problem_description: pattern.problem,
          solution_delta: pattern.solution,
          tags: pattern.tags,
          confidence_score: 0.5,
          usage_count: 1
        })
        .select("id")
        .single();

      if (newAsset && orgId) {
        await supabaseAdmin.from("hive_contributions").insert({
          org_id: orgId,
          knowledge_id: newAsset.id,
          contribution_type: "submission"
        });
      }
    }
  }

  /**
   * Recalls relevant knowledge for a given problem
   */
  async recall(problem: string, tags: string[]): Promise<KnowledgePattern[]> {
    if (!supabaseAdmin) return [];

    const { data } = await supabaseAdmin
      .from("hive_knowledge_base")
      .select("*")
      .overlaps("tags", tags)
      .order("confidence_score", { ascending: false })
      .limit(3);

    return (data || []).map(d => ({
      type: d.pattern_type,
      problem: d.problem_description,
      solution: d.solution_delta,
      tags: d.tags
    }));
  }
}

export const hiveMind = new HiveMind();
