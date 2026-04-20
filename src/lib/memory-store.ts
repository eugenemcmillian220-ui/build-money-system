import "server-only";
import { createClient } from "@/lib/supabase/server";
import { generateEmbedding } from "./openrouter";

export interface MemoryContext {
  prompt: string;
  tech_stack: string[];
  metadata: Record<string, unknown>;
  similarity?: number;
}

/**
 * Agent Long-Term Memory Module
 * Handles semantic storage and retrieval of past generations using pgvector
 */
export class MemoryStore {
  /**
   * Recalls relevant past context for a new prompt using semantic similarity
   */
  async recallContext(userId: string, prompt: string): Promise<MemoryContext[]> {
    const supabase = await createClient();

    try {
      // 1. Generate semantic embedding for the new prompt
      const embedding = await generateEmbedding(prompt);

      // 2. Perform vector search in Supabase
      const { data, error } = await supabase.rpc("match_memories", {
        query_embedding: embedding,
        match_threshold: 0.75, // Only return relevant context
        match_count: 5,
        p_user_id: userId,
      });

      if (error) {
        console.warn("[MEMORY] Vector search failed, falling back to keyword:", error.message);
        // Fallback to simple lookup if vector extension is not yet enabled
        const { data: fallback } = await supabase
          .from("generation_memory")
          .select("prompt, tech_stack, metadata")
          .eq("user_id", userId)
          .limit(3);
        
        return (fallback || []) as unknown as MemoryContext[];
      }

      return (data || []).map((row: { prompt: string; tech_stack: string[]; metadata: Record<string, unknown>; similarity: number }) => ({
        prompt: row.prompt,
        tech_stack: row.tech_stack,
        metadata: row.metadata,
        similarity: row.similarity,
      }));
    } catch (err) {
      console.error("[MEMORY] Recall failed:", err);
      return [];
    }
  }

  /**
   * Stores a generation in long-term memory with its vector representation
   */
  async remember(userId: string, prompt: string, techStack: string[], metadata: Record<string, unknown> = {}) {
    const supabase = await createClient();

    try {
      // Generate embedding for storage
      const embedding = await generateEmbedding(prompt);

      await supabase.from("generation_memory").insert({
        user_id: userId,
        prompt,
        tech_stack: techStack,
        metadata,
        embedding, // Store vector for future semantic search
      });
      
      console.log(`[MEMORY] Generation remembered for user ${userId}`);
    } catch (err) {
      console.error("[MEMORY] Failed to store memory:", err);
    }
  }
}

export const memoryStore = new MemoryStore();
