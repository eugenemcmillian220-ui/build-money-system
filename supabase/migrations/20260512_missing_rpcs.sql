-- Migration: Add missing RPC functions and schema patches for production readiness
-- Fixes: search_hive_knowledge, match_memories, ingest_pulse_event,
--         increment_skill_usage, deduct_credits, increment_field

-- ═══════════════════════════════════════════════════════════════
-- Schema patches: add missing columns needed by vector search RPCs
-- ═══════════════════════════════════════════════════════════════

-- hive_knowledge_base needs an embedding column for vector search
ALTER TABLE hive_knowledge_base ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE hive_knowledge_base ADD COLUMN IF NOT EXISTS problem TEXT;
ALTER TABLE hive_knowledge_base ADD COLUMN IF NOT EXISTS solution TEXT;
ALTER TABLE hive_knowledge_base ADD COLUMN IF NOT EXISTS frequency INT DEFAULT 0;

-- generation_memory needs a result column for match_memories return
ALTER TABLE generation_memory ADD COLUMN IF NOT EXISTS result TEXT;

-- ═══════════════════════════════════════════════════════════════
-- 1. search_hive_knowledge — vector similarity search on hive_knowledge_base
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION search_hive_knowledge(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 3
)
RETURNS TABLE(
  id UUID,
  problem TEXT,
  solution TEXT,
  tags TEXT[],
  frequency INT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    hkb.id,
    COALESCE(hkb.problem, hkb.problem_description) AS problem,
    COALESCE(hkb.solution, hkb.solution_delta::TEXT) AS solution,
    hkb.tags,
    COALESCE(hkb.frequency, hkb.usage_count) AS frequency,
    (1 - (hkb.embedding <=> query_embedding))::FLOAT AS similarity
  FROM hive_knowledge_base hkb
  WHERE hkb.embedding IS NOT NULL
    AND 1 - (hkb.embedding <=> query_embedding) > match_threshold
  ORDER BY hkb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 2. match_memories — vector similarity search on generation_memory
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.75,
  match_count INT DEFAULT 5,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  prompt TEXT,
  result TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gm.id,
    gm.prompt,
    COALESCE(gm.result, '') AS result,
    (1 - (gm.embedding <=> query_embedding))::FLOAT AS similarity
  FROM generation_memory gm
  WHERE gm.embedding IS NOT NULL
    AND 1 - (gm.embedding <=> query_embedding) > match_threshold
    AND (p_user_id IS NULL OR gm.user_id = p_user_id)
  ORDER BY gm.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 3. ingest_pulse_event — insert analytics/pulse events
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION ingest_pulse_event(
  p_project_id UUID,
  p_event_name TEXT,
  p_properties JSONB DEFAULT '{}',
  p_url TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO analytics_metrics (name, value, category, metadata, user_id)
  VALUES (
    p_event_name,
    1,
    'pulse',
    jsonb_build_object(
      'project_id', p_project_id,
      'properties', p_properties,
      'url', p_url,
      'session_id', p_session_id
    ),
    NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 4. increment_skill_usage — atomically increment agent_skills usage count
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION increment_skill_usage(skill_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE agent_skills
  SET usage_count = COALESCE(usage_count, 0) + 1,
      updated_at = NOW()
  WHERE id = skill_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 5. deduct_credits — atomically deduct credits from an org by user
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id UUID,
  p_amount INT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_org_id UUID;
  v_balance NUMERIC;
BEGIN
  SELECT org_id INTO v_org_id
  FROM org_members
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT credit_balance INTO v_balance
  FROM organizations
  WHERE id = v_org_id
  FOR UPDATE;

  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN FALSE;
  END IF;

  UPDATE organizations
  SET credit_balance = credit_balance - p_amount,
      updated_at = NOW()
  WHERE id = v_org_id;

  INSERT INTO credit_transactions (org_id, amount, type, description)
  VALUES (v_org_id, -p_amount, 'deduction', 'AI usage charge');

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- 6. increment_field — generic atomic increment for any table/field
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION increment_field(
  p_table TEXT,
  p_id TEXT,
  p_field TEXT,
  p_amount INT DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET %I = COALESCE(%I, 0) + $1 WHERE id = $2',
    p_table, p_field, p_field
  ) USING p_amount, p_id::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
