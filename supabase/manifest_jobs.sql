-- manifest_jobs.sql
-- Resumable job tracking for the Vercel Hobby 300s pipeline.
-- Run this in the Supabase SQL Editor to create the table.

CREATE TABLE IF NOT EXISTS manifest_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prompt TEXT NOT NULL,
  current_stage TEXT NOT NULL DEFAULT 'classifier',
  progress INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'timeout')),
  state_snapshot JSONB,
  resume_token TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE manifest_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their jobs" ON manifest_jobs
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_manifest_jobs_user_status ON manifest_jobs(user_id, status);
CREATE INDEX idx_manifest_jobs_created ON manifest_jobs(created_at);
