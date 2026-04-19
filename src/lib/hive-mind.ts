import { supabaseAdmin } from "./supabase/db";
import { callLLM, cleanJson, generateEmbedding } from "./llm";


// DA-010 FIX: Input sanitization for LLM calls
function sanitizeForLLM(input: string): string {
  // Strip common injection patterns
  const patterns = [
    /ignore (?:all )?(?:previous |above )?instructions/gi,
    /you are now/gi,
    /system:\s/gi,
    /\[INST\]/gi,
    /<<SYS>>/gi,
    /<\|(?:im_start|im_end|system|user|assistant)\|>/gi,
  ];
  let cleaned = input;
  for (const p of patterns) {
    cleaned = cleaned.replace(p, '[FILTERED]');
  }
  // Truncate to prevent context window abuse
  return cleaned.slice(0, 10000);
}

// DA-010 FIX: Strip PII before sending to LLM
function stripPII(text: string): string {
  return text
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
    .replace(/\b(?:\d{4}[- ]?){3}\d{4}\b/g, '[CARD]');
}


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

    const embedding = await generateEmbedding(`${pattern.problem} ${pattern.tags.join(" ")}`);

    // 1. Check if similar pattern exists (Semantic vector check)
    const { data: existing } = await supabaseAdmin.rpc("search_hive_knowledge", {
      query_embedding: embedding,
      match_threshold: 0.9,
      match_count: 1
    });

    const existingMatch = existing?.[0];

    if (existingMatch) {
      // 2. Increment confidence if pattern is rediscovered
      await supabaseAdmin
        .from("hive_knowledge_base")
        .update({
          confidence_score: (existingMatch.confidence_score || 0) + 0.1,
          usage_count: (existingMatch.usage_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingMatch.id);
    } else {
      // 3. Insert new knowledge asset
      const { data: newAsset } = await supabaseAdmin
        .from("hive_knowledge_base")
        .insert({
          pattern_type: pattern.type,
          problem_description: pattern.problem,
          solution_delta: pattern.solution,
          tags: pattern.tags,
          embedding: embedding,
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
   * Recalls relevant knowledge for a given problem using semantic search
   */
  async recall(problem: string, tags: string[]): Promise<KnowledgePattern[]> {
    if (!supabaseAdmin) return [];

    const embedding = await generateEmbedding(`${problem} ${tags.join(" ")}`);

    const { data, error } = await supabaseAdmin.rpc("search_hive_knowledge", {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 3
    });

    if (error) {
      console.warn("[HiveMind] Semantic recall failed, falling back to tag search:", error);
      const { data: fallbackData } = await supabaseAdmin
        .from("hive_knowledge_base")
        .select("*")
        .overlaps("tags", tags)
        .order("confidence_score", { ascending: false })
        .limit(3);
      return (fallbackData || []).map(d => this.mapToPattern(d));
    }

    return (data || []).map((d: any) => this.mapToPattern(d));
  }

  private mapToPattern(d: any): KnowledgePattern {
    return {
      type: d.pattern_type,
      problem: d.problem_description,
      solution: d.solution_delta,
      tags: d.tags
    };
  }
}

export const hiveMind = new HiveMind();
