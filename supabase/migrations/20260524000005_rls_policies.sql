-- Migration: 20260524000005_rls_policies.sql
-- Row Level Security policies for all tables
-- Service role bypasses all RLS automatically in Supabase.

-- ─── organizations ────────────────────────────────────────────
DROP POLICY IF EXISTS "org_select_member" ON organizations;
CREATE POLICY "org_select_member" ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
    OR owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "org_insert_owner" ON organizations;
CREATE POLICY "org_insert_owner" ON organizations
  FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "org_update_owner" ON organizations;
CREATE POLICY "org_update_owner" ON organizations
  FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "org_delete_owner" ON organizations;
CREATE POLICY "org_delete_owner" ON organizations
  FOR DELETE USING (owner_id = auth.uid());

-- ─── organization_members ─────────────────────────────────────
DROP POLICY IF EXISTS "orgmem_select_member" ON organization_members;
CREATE POLICY "orgmem_select_member" ON organization_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "orgmem_insert_admin" ON organization_members;
CREATE POLICY "orgmem_insert_admin" ON organization_members
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
      UNION
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner','admin')
    )
  );

DROP POLICY IF EXISTS "orgmem_delete_admin" ON organization_members;
CREATE POLICY "orgmem_delete_admin" ON organization_members
  FOR DELETE USING (
    organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
  );

-- ─── projects ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "projects_select_owner" ON projects;
CREATE POLICY "projects_select_owner" ON projects
  FOR SELECT USING (user_id = auth.uid() AND deleted_at IS NULL);

DROP POLICY IF EXISTS "projects_insert_owner" ON projects;
CREATE POLICY "projects_insert_owner" ON projects
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "projects_update_owner" ON projects;
CREATE POLICY "projects_update_owner" ON projects
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "projects_delete_owner" ON projects;
CREATE POLICY "projects_delete_owner" ON projects
  FOR DELETE USING (user_id = auth.uid());

-- ─── pipeline_jobs ────────────────────────────────────────────
DROP POLICY IF EXISTS "jobs_select_owner" ON pipeline_jobs;
CREATE POLICY "jobs_select_owner" ON pipeline_jobs
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "jobs_insert_owner" ON pipeline_jobs;
CREATE POLICY "jobs_insert_owner" ON pipeline_jobs
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "jobs_update_owner" ON pipeline_jobs;
CREATE POLICY "jobs_update_owner" ON pipeline_jobs
  FOR UPDATE USING (user_id = auth.uid());

-- ─── pipeline_phases ──────────────────────────────────────────
DROP POLICY IF EXISTS "phases_select_job_owner" ON pipeline_phases;
CREATE POLICY "phases_select_job_owner" ON pipeline_phases
  FOR SELECT USING (
    job_id IN (SELECT id FROM pipeline_jobs WHERE user_id = auth.uid())
  );

-- ─── job_results ──────────────────────────────────────────────
DROP POLICY IF EXISTS "results_select_owner" ON job_results;
CREATE POLICY "results_select_owner" ON job_results
  FOR SELECT USING (user_id = auth.uid());

-- ─── user_credits ─────────────────────────────────────────────
DROP POLICY IF EXISTS "credits_select_owner" ON user_credits;
CREATE POLICY "credits_select_owner" ON user_credits
  FOR SELECT USING (user_id = auth.uid());

-- ─── subscriptions ────────────────────────────────────────────
DROP POLICY IF EXISTS "subs_select_owner" ON subscriptions;
CREATE POLICY "subs_select_owner" ON subscriptions
  FOR SELECT USING (user_id = auth.uid() AND deleted_at IS NULL);

-- ─── credit_transactions ──────────────────────────────────────
DROP POLICY IF EXISTS "credit_tx_select_owner" ON credit_transactions;
CREATE POLICY "credit_tx_select_owner" ON credit_transactions
  FOR SELECT USING (user_id = auth.uid());

-- ─── notifications ────────────────────────────────────────────
DROP POLICY IF EXISTS "notif_select_owner" ON notifications;
CREATE POLICY "notif_select_owner" ON notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notif_update_owner" ON notifications;
CREATE POLICY "notif_update_owner" ON notifications
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ─── ai_usage_log ─────────────────────────────────────────────
DROP POLICY IF EXISTS "ai_usage_select_owner" ON ai_usage_log;
CREATE POLICY "ai_usage_select_owner" ON ai_usage_log
  FOR SELECT USING (user_id = auth.uid());

-- ─── spec_validations ─────────────────────────────────────────
DROP POLICY IF EXISTS "spec_val_select_job_owner" ON spec_validations;
CREATE POLICY "spec_val_select_job_owner" ON spec_validations
  FOR SELECT USING (
    job_id IN (SELECT id FROM pipeline_jobs WHERE user_id = auth.uid())
  );

-- ─── user_personas ────────────────────────────────────────────
DROP POLICY IF EXISTS "personas_select_job_owner" ON user_personas;
CREATE POLICY "personas_select_job_owner" ON user_personas
  FOR SELECT USING (
    job_id IN (SELECT id FROM pipeline_jobs WHERE user_id = auth.uid())
  );

-- ─── audit_log — admin read only (service role only) ─────────
DROP POLICY IF EXISTS "audit_no_user_access" ON audit_log;
CREATE POLICY "audit_no_user_access" ON audit_log
  FOR ALL USING (FALSE);

-- ─── stripe_events — service role only ───────────────────────
DROP POLICY IF EXISTS "stripe_events_no_user_access" ON stripe_events;
CREATE POLICY "stripe_events_no_user_access" ON stripe_events
  FOR ALL USING (FALSE);

-- ─── circuit_breaker_state — service role only ───────────────
DROP POLICY IF EXISTS "cb_no_user_access" ON circuit_breaker_state;
CREATE POLICY "cb_no_user_access" ON circuit_breaker_state
  FOR ALL USING (FALSE);

-- ─── request_logs — service role only ────────────────────────
DROP POLICY IF EXISTS "req_logs_no_user_access" ON request_logs;
CREATE POLICY "req_logs_no_user_access" ON request_logs
  FOR ALL USING (FALSE);

-- ─── disputes — service role only ────────────────────────────
DROP POLICY IF EXISTS "disputes_no_user_access" ON disputes;
CREATE POLICY "disputes_no_user_access" ON disputes
  FOR ALL USING (FALSE);

-- ─── deployments — service role only ─────────────────────────
DROP POLICY IF EXISTS "deployments_no_user_access" ON deployments;
CREATE POLICY "deployments_no_user_access" ON deployments
  FOR ALL USING (FALSE);

-- ─── pending_ai_jobs ──────────────────────────────────────────
DROP POLICY IF EXISTS "pending_ai_jobs_select_owner" ON pending_ai_jobs;
CREATE POLICY "pending_ai_jobs_select_owner" ON pending_ai_jobs
  FOR SELECT USING (user_id = auth.uid());
