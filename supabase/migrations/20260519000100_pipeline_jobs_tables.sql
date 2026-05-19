CREATE TABLE IF NOT EXISTS pipeline_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','complete','failed')),
  spec JSONB NOT NULL,
  current_phase INTEGER DEFAULT 0,
  current_phase_name TEXT,
  completed_phases INTEGER[] DEFAULT '{}',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_user_status ON pipeline_jobs (user_id, status);
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_created_desc ON pipeline_jobs (created_at DESC);

CREATE TABLE IF NOT EXISTS pipeline_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES pipeline_jobs(id) ON DELETE CASCADE,
  phase_index INTEGER NOT NULL,
  phase_name TEXT NOT NULL,
  agent_index INTEGER NOT NULL,
  output TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pipeline_phases_job_phase ON pipeline_phases (job_id, phase_index);

CREATE TABLE IF NOT EXISTS job_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES pipeline_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_job_results_user_created ON job_results (user_id, created_at DESC);

ALTER TABLE pipeline_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_own_jobs ON pipeline_jobs;
CREATE POLICY users_own_jobs ON pipeline_jobs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS service_role_all_pipeline_jobs ON pipeline_jobs;
CREATE POLICY service_role_all_pipeline_jobs ON pipeline_jobs FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS service_role_all_pipeline_phases ON pipeline_phases;
CREATE POLICY service_role_all_pipeline_phases ON pipeline_phases FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS service_role_all_job_results ON job_results;
CREATE POLICY service_role_all_job_results ON job_results FOR ALL USING (auth.role() = 'service_role');
