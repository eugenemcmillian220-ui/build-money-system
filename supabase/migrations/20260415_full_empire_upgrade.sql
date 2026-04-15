-- =============================================================================
-- Migration: Add Organization Balance Management & Semantic Search Functions
-- Supports Phase 10: Multi-Agent Economy & Phase 15: Hive Mind
-- =============================================================================

-- ── ECONOMY FUNCTIONS ──

-- Function to decrement organization credit balance
CREATE OR REPLACE FUNCTION decrement_org_balance(org_id UUID, amount NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE organizations
  SET credit_balance = credit_balance - amount
  WHERE id = org_id;
  
  IF (SELECT credit_balance FROM organizations WHERE id = org_id) < 0 THEN
    RAISE EXCEPTION 'Insufficient credit balance for this operation.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment organization credit balance
CREATE OR REPLACE FUNCTION increment_org_balance(org_id UUID, amount NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE organizations
  SET credit_balance = credit_balance + amount
  WHERE id = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── SEMANTIC SEARCH FUNCTIONS ──

-- Function: Search code chunks semantically (Existing fix/verification)
CREATE OR REPLACE FUNCTION search_code_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_org_id UUID
)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  file_path TEXT,
  content TEXT,
  similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.id,
    cc.project_id,
    cc.file_path,
    cc.content,
    1 - (cc.embedding <=> query_embedding) AS similarity
  FROM code_chunks cc
  JOIN projects p ON cc.project_id = p.id
  WHERE p.org_id = p_org_id
    AND 1 - (cc.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Function: Search Hive Knowledge Base semantically
CREATE OR REPLACE FUNCTION search_hive_knowledge(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id UUID,
  pattern_type VARCHAR,
  problem_description TEXT,
  solution_delta JSONB,
  tags TEXT[],
  confidence_score FLOAT,
  usage_count INTEGER,
  similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    hkb.id,
    hkb.pattern_type,
    hkb.problem_description,
    hkb.solution_delta,
    hkb.tags,
    hkb.confidence_score,
    hkb.usage_count,
    1 - (hkb.embedding <=> query_embedding) AS similarity
  FROM hive_knowledge_base hkb
  WHERE 1 - (hkb.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
