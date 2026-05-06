-- =============================================================================
-- FlowForge — AI Workflow Automation Hub
-- Database schema for workflows, executions, audit logs, governance.
-- Exercises Phases 2 (SQL Forge), 8 (Multi-Tenancy), 12 (Governance).
-- =============================================================================

-- Workflow status
CREATE TYPE IF NOT EXISTS workflow_status AS ENUM (
  'draft', 'active', 'paused', 'archived', 'error'
);

-- Execution status
CREATE TYPE IF NOT EXISTS execution_status AS ENUM (
  'queued', 'running', 'completed', 'failed', 'cancelled', 'timeout'
);

-- Permission levels
CREATE TYPE IF NOT EXISTS permission_level AS ENUM (
  'viewer', 'editor', 'admin', 'owner'
);

-- Governance proposal status
CREATE TYPE IF NOT EXISTS proposal_status AS ENUM (
  'active', 'passed', 'rejected', 'executed'
);

-- =============================================================================
-- FLOWFORGE WORKFLOWS
-- =============================================================================
CREATE TABLE IF NOT EXISTS flowforge_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status workflow_status NOT NULL DEFAULT 'draft',
  nodes JSONB NOT NULL DEFAULT '[]',
  trigger_type VARCHAR(50) NOT NULL DEFAULT 'manual',
  trigger_config JSONB DEFAULT '{}',
  mode VARCHAR(20) NOT NULL DEFAULT 'universal',
  version INTEGER NOT NULL DEFAULT 1,
  is_monetized BOOLEAN NOT NULL DEFAULT false,
  price_credits INTEGER NOT NULL DEFAULT 0,
  execution_count INTEGER NOT NULL DEFAULT 0,
  avg_execution_ms FLOAT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- FLOWFORGE EXECUTIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS flowforge_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES flowforge_workflows(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status execution_status NOT NULL DEFAULT 'queued',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  input JSONB DEFAULT '{}',
  output JSONB,
  error TEXT,
  node_results JSONB DEFAULT '[]',
  credits_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- FLOWFORGE AUDIT LOGS (Phase 12 — Governance & Compliance)
-- =============================================================================
CREATE TABLE IF NOT EXISTS flowforge_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- FLOWFORGE GOVERNANCE PROPOSALS (Phase 19 — Sovereign DAO)
-- =============================================================================
CREATE TABLE IF NOT EXISTS flowforge_governance_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  proposed_by UUID NOT NULL REFERENCES auth.users(id),
  status proposal_status NOT NULL DEFAULT 'active',
  votes_for INTEGER NOT NULL DEFAULT 0,
  votes_against INTEGER NOT NULL DEFAULT 0,
  quorum_required INTEGER NOT NULL DEFAULT 10,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- FLOWFORGE NANO TRIGGERS (Nano Mode)
-- =============================================================================
CREATE TABLE IF NOT EXISTS flowforge_nano_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES flowforge_workflows(id) ON DELETE CASCADE,
  label VARCHAR(100) NOT NULL,
  icon VARCHAR(50) DEFAULT 'zap',
  color VARCHAR(7) DEFAULT '#f59e0b',
  tap_count INTEGER NOT NULL DEFAULT 0,
  last_triggered TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- ROW-LEVEL SECURITY (Phase 8 — Multi-Tenant Isolation)
-- =============================================================================

ALTER TABLE flowforge_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowforge_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowforge_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowforge_governance_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowforge_nano_triggers ENABLE ROW LEVEL SECURITY;

-- Org-scoped access policies
CREATE POLICY "Org members can view their workflows"
  ON flowforge_workflows FOR SELECT
  USING (org_id IN (
    SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "Org editors can insert workflows"
  ON flowforge_workflows FOR INSERT
  WITH CHECK (org_id IN (
    SELECT om.org_id FROM org_members om
    WHERE om.user_id = auth.uid() AND om.permission IN ('editor', 'admin', 'owner')
  ));

CREATE POLICY "Org members can view executions"
  ON flowforge_executions FOR SELECT
  USING (org_id IN (
    SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "Org admins can view audit logs"
  ON flowforge_audit_logs FOR SELECT
  USING (org_id IN (
    SELECT om.org_id FROM org_members om
    WHERE om.user_id = auth.uid() AND om.permission IN ('admin', 'owner')
  ));

CREATE POLICY "Org members can view governance proposals"
  ON flowforge_governance_proposals FOR SELECT
  USING (org_id IN (
    SELECT om.org_id FROM org_members om WHERE om.user_id = auth.uid()
  ));

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_ff_workflows_org ON flowforge_workflows(org_id);
CREATE INDEX IF NOT EXISTS idx_ff_workflows_status ON flowforge_workflows(status);
CREATE INDEX IF NOT EXISTS idx_ff_executions_workflow ON flowforge_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_ff_executions_org ON flowforge_executions(org_id);
CREATE INDEX IF NOT EXISTS idx_ff_audit_org ON flowforge_audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_ff_audit_action ON flowforge_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_ff_audit_created ON flowforge_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ff_proposals_org ON flowforge_governance_proposals(org_id);
CREATE INDEX IF NOT EXISTS idx_ff_nano_workflow ON flowforge_nano_triggers(workflow_id);
