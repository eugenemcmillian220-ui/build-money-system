import { createClient } from "@/lib/supabase/server";
import { generateEmbedding } from "./llm";

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
   * Indexes a project's files for semantic search in parallel
   */
  async indexProject(projectId: string, files: Record<string, string>) {
    const supabase = await createClient();

    // Parallelize embedding generation and insertion
    await Promise.all(
      Object.entries(files).map(async ([path, content]) => {
        try {
          const embedding = await generateEmbedding(content);
          const { error } = await supabase.from("code_chunks").insert({
            project_id: projectId,
            file_path: path,
            content: content.slice(0, 5000), // Simple chunking
            embedding: embedding
          });
          if (error) throw error;
        } catch (err) {
          console.error(`Failed to index file ${path}:`, err);
        }
      })
    );
  }

  /**
   * Performs semantic search across all user/org projects
   */
  async search(orgId: string, query: string): Promise<CodeSearchResult[]> {
    const supabase = await createClient();
    const embedding = await generateEmbedding(query);

    const { data, error } = await supabase.rpc("search_code_chunks", {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: 10,
      p_org_id: orgId,
    });

    if (error) {
      console.error("Code search failed, falling back to text search:", error);
      // Fallback text search if RPC fails
      const { data: textData } = await supabase
        .from("code_chunks")
        .select("*, projects!inner(org_id)")
        .eq("projects.org_id", orgId)
        .textSearch("content", query.split(" ").join(" | "))
        .limit(10);
      
      return (textData || []).map(d => ({
        id: d.id,
        project_id: d.project_id,
        file_path: d.file_path,
        content: d.content,
        similarity: 0.5 // Default similarity for text search
      }));
    }
    return (data || []) as CodeSearchResult[];
  }
}

export const codeSearch = new CodeSearch();
