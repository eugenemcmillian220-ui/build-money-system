import { supabaseAdmin } from "./supabase/admin";
import { callLLMJson } from "./llm";
import { z } from "zod";

export const patchSchema = z.object({
  component: z.string(),
  issue: z.string(),
  solution: z.string(),
  impactScore: z.number(),
});

export type HivePatch = z.infer<typeof patchSchema>;

/**
 * Phase 15: Hive Intelligence Manager
 * Handles collective intelligence synthesis and cross-empire patching.
 */
export class HiveManager {
  /**
   * Search the Hive for a solution to a technical challenge
   */
  async queryHive(challenge: string): Promise<string | null> {
    if (!supabaseAdmin) return null;

    // Simulate semantic search via pgvector (if active) or simple keyword match
    const { data: patches } = await supabaseAdmin
      .from("learning_store")
      .select("content")
      .textSearch("content", challenge)
      .limit(1);

    return patches?.[0]?.content || null;
  }

  /**
   * Contribute a fix or optimization to the Hive Mind
   */
  async contributePatch(patch: HivePatch): Promise<void> {
    if (!supabaseAdmin) return;

    await supabaseAdmin.from("learning_store").insert({
      content: `[Patch] Component: ${patch.component} | Issue: ${patch.issue} | Solution: ${patch.solution}`,
      metadata: { impact: patch.impactScore, type: "patch" }
    });
  }

  /**
   * Synthesize a 'Collective Strategy' from top-performing empires
   */
  async getCollectiveStrategy(): Promise<string> {
    const prompt = `You are the Hive Mind Synthesis Engine. 
Review the current 2026 tech trends and synthesize a 'Golden Strategy' for new manifestations.
Return a short, high-impact markdown summary.`;

    const result = await callLLMJson(
      [{ role: "user", content: prompt }],
      z.object({ strategy: z.string() }),
      { temperature: 0.7 }
    );

    return result.strategy;
  }
}

export const hiveManager = new HiveManager();
