-- Migration: 20260524000003_ai_and_system_tables.sql
-- AI cost tracking, notifications, circuit breaker, spec validations, personas, pipeline cache

-- ─── AI Usage Log ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  job_id        UUID REFERENCES pipeline_jobs(id) ON DELETE SET NULL,
  model         TEXT NOT NULL,
  feature_name  TEXT NOT NULL,
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd      NUMERIC(10,6) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON ai_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature ON ai_usage_log(feature_name);

ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

-- ─── Notifications ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  action_url  TEXT,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ─── Circuit Breaker State ────────────────────────────────────
CREATE TABLE IF NOT EXISTS circuit_breaker_state (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider         TEXT NOT NULL UNIQUE,
  state            TEXT NOT NULL DEFAULT 'CLOSED' CHECK (state IN ('CLOSED','OPEN','HALF_OPEN')),
  failure_count    INTEGER NOT NULL DEFAULT 0,
  last_failure_at  TIMESTAMPTZ,
  open_until       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE circuit_breaker_state ENABLE ROW LEVEL SECURITY;

-- ─── Spec Validations ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spec_validations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      UUID NOT NULL REFERENCES pipeline_jobs(id) ON DELETE CASCADE UNIQUE,
  confidence  INTEGER NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  blockers    JSONB NOT NULL DEFAULT '[]',
  assumptions JSONB NOT NULL DEFAULT '[]',
  overrides   JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE spec_validations ENABLE ROW LEVEL SECURITY;

-- ─── User Personas ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_personas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID NOT NULL REFERENCES pipeline_jobs(id) ON DELETE CASCADE,
  persona_data JSONB NOT NULL DEFAULT '{}',
  jtbd_data    JSONB NOT NULL DEFAULT '{}',
  wtp_data     JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_personas_job_id ON user_personas(job_id);

ALTER TABLE user_personas ENABLE ROW LEVEL SECURITY;

-- ─── Pipeline Cache ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipeline_cache (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      UUID NOT NULL REFERENCES pipeline_jobs(id) ON DELETE CASCADE,
  phase_index INTEGER NOT NULL,
  agent_index INTEGER NOT NULL,
  output_hash TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_id, phase_index, agent_index)
);

CREATE INDEX IF NOT EXISTS idx_pipeline_cache_job ON pipeline_cache(job_id);

ALTER TABLE pipeline_cache ENABLE ROW LEVEL SECURITY;

-- ─── Pending AI Jobs (fallback queue) ────────────────────────
CREATE TABLE IF NOT EXISTS pending_ai_jobs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  payload      JSONB NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 0,
  last_error   TEXT,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','complete','failed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_ai_jobs_status ON pending_ai_jobs(status);

ALTER TABLE pending_ai_jobs ENABLE ROW LEVEL SECURITY;

-- ─── Request Logs ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS request_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  method      TEXT NOT NULL,
  path        TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  request_id  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_request_logs_user_id ON request_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_logs_path ON request_logs(path);

ALTER TABLE request_logs ENABLE ROW LEVEL SECURITY;

-- ─── Deployments ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deployments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version     TEXT NOT NULL,
  deployed_by TEXT,
  status      TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success','failed')),
  duration_ms INTEGER,
  deploy_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;

-- ─── Prompt A/B Results ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS prompt_ab_results (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_name TEXT NOT NULL,
  version     TEXT NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  converted   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prompt_ab_prompt ON prompt_ab_results(prompt_name, version);

ALTER TABLE prompt_ab_results ENABLE ROW LEVEL SECURITY;
