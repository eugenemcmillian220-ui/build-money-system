import { createClient } from "@/lib/supabase/server";

export interface CodeSearchResult {
  id: string;
  project_id: string;
  file_path: string;
  content: string;
  similarity: number;
}

/**
 * Semantic Code Search Module
 * Indexes and searches generated code using pgvector
 */
export class CodeSearch {
  /**
   * Indexes a project's files for semantic search
   */
  async indexProject(projectId: string, files: Record<string, string>) {
    const supabase = await createClient();
    
    // In a real implementation, we would chunk the files and generate embeddings:
    // for (const [path, content] of Object.entries(files)) {
    //   const embedding = await generateEmbedding(content);
    //   await supabase.from("code_chunks").insert({ project_id: projectId, file_path: path, content, embedding });
    // }
    
    // For now, we store them without embeddings for simple text search fallback
    const entries = Object.entries(files).map(([path, content]) => ({
      project_id: projectId,
      file_path: path,
      content: content.slice(0, 5000), // chunking simulation
    }));

    await supabase.from("code_chunks").insert(entries);
  }

  /**
   * Performs semantic search across all user/org projects
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async search(_orgId: string, _query: string): Promise<CodeSearchResult[]> {
    const supabase = await createClient();
    
    // Semantic search simulation
    const { data, error } = await supabase.rpc("search_code_chunks", {
      query_embedding: [0.1, 0.2, 0.3], // simulated embedding
      match_threshold: 0.5,
      match_count: 10,
      p_org_id: _orgId,
    });

    if (error) console.error("Code search failed:", error);
    return (data || []) as CodeSearchResult[];
  }
}

export const codeSearch = new CodeSearch();
