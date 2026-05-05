-- PHASE 25: NEURAL LINK MIGRATION (VECTOR MEMORY)
-- Enables pgvector and adds semantic search to generation_memory.

-- 1. ENABLE EXTENSION
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. UPGRADE GENERATION MEMORY TABLE
ALTER TABLE public.generation_memory 
ADD COLUMN IF NOT EXISTS embedding vector(1536); -- Optimized for OpenAI text-embedding-3-small

-- 3. CREATE SEMANTIC SEARCH FUNCTION (RPC)
CREATE OR REPLACE FUNCTION public.match_memories (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  prompt TEXT,
  tech_stack TEXT[],
  metadata JSONB,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gm.id,
    gm.prompt,
    gm.tech_stack,
    gm.metadata,
    1 - (gm.embedding <=> query_embedding) AS similarity
  FROM public.generation_memory gm
  WHERE gm.user_id = p_user_id
    AND 1 - (gm.embedding <=> query_embedding) > match_threshold
  ORDER BY gm.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 4. CREATE INDEX FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS generation_memory_embedding_idx ON public.generation_memory 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 5. REGIONAL CONFIGS (For Edge Orchestrator)
CREATE TABLE IF NOT EXISTS public.regional_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    region TEXT NOT NULL,
    health_status TEXT DEFAULT 'pending',
    last_sync_at TIMESTAMPTZ DEFAULT now(),
    config JSONB DEFAULT '{}'::jsonb,
    UNIQUE(project_id, region)
);

ALTER TABLE public.regional_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view regional configs for their projects"
    ON public.regional_configs FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.projects p
        JOIN public.org_members om ON p.org_id = om.org_id
        WHERE p.id = regional_configs.project_id AND om.user_id = auth.uid()
    ));
