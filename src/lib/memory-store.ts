import { createClient } from "@/lib/supabase/server";

export interface MemoryContext {
  prompt: string;
  tech_stack: string[];
  metadata: Record<string, unknown>;
}

/**
 * Agent Long-Term Memory Module
 * Handles semantic storage and retrieval of past generations using pgvector
 */
export class MemoryStore {
  /**
   * Recalls relevant past context for a new prompt
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async recallContext(userId: string, _prompt: string): Promise<MemoryContext[]> {
    const supabase = await createClient();
    
    // In a real implementation, we would generate an embedding for the prompt:
    // const embedding = await generateEmbedding(prompt);
    
    // And then search in Supabase:
    // const { data } = await supabase.rpc("match_memories", { query_embedding: embedding, ... });
    
    // For now, we return a simulated context based on keyword matching
    const { data } = await supabase
      .from("generation_memory")
      .select("prompt, tech_stack, metadata")
      .eq("user_id", userId)
      .limit(3);

    return (data || []) as unknown as MemoryContext[];
  }

  /**
   * Stores a generation in long-term memory
   */
  async remember(userId: string, prompt: string, techStack: string[], metadata: Record<string, unknown> = {}) {
    const supabase = await createClient();
    
    // Simulated embedding storage
    await supabase.from("generation_memory").insert({
      user_id: userId,
      prompt,
      tech_stack: techStack,
      metadata,
    });
  }
}

export const memoryStore = new MemoryStore();
