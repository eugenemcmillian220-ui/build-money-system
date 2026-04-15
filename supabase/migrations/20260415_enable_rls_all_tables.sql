-- Migration: Enable Row Level Security on all unprotected tables
-- Run this in Supabase SQL Editor or via supabase db push
-- Date: 2026-04-15

-- ============================================================
-- 1. ORGANIZATIONS & MEMBERSHIP (Critical - financial data)
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their organizations"
  ON organizations FOR SELECT
  USING (id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "Owners can update their organizations"
  ON organizations FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());

ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org membership"
  ON org_members FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members AS om WHERE om.user_id = auth.uid())
  );

CREATE POLICY "Owners can manage org members"
  ON org_members FOR ALL
  USING (
    org_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert themselves"
  ON org_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 2. FINANCIAL TABLES (Critical - billing & credits)
-- ============================================================

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org credit transactions"
  ON credit_transactions FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

ALTER TABLE agent_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org agent ledger"
  ON agent_ledger FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

ALTER TABLE billing_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org subscriptions"
  ON billing_subscriptions FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

ALTER TABLE revenue_share_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org revenue payouts"
  ON revenue_share_payouts FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

-- ============================================================
-- 3. AGENT & AI TABLES
-- ============================================================

ALTER TABLE agent_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org agent performance"
  ON agent_performance FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

ALTER TABLE agent_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org agent skills"
  ON agent_skills FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

ALTER TABLE generation_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org generation memory"
  ON generation_memory FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

ALTER TABLE pending_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org pending actions"
  ON pending_actions FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

-- ============================================================
-- 4. GOVERNANCE & LEGAL
-- ============================================================

ALTER TABLE governance_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org governance proposals"
  ON governance_proposals FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can create governance proposals"
  ON governance_proposals FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org compliance reports"
  ON compliance_reports FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

ALTER TABLE legal_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org legal entities"
  ON legal_entities FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

ALTER TABLE legal_vault ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org legal vault"
  ON legal_vault FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

ALTER TABLE ip_vault ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org IP vault"
  ON ip_vault FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

-- ============================================================
-- 5. MARKETING & COMMUNITY
-- ============================================================

ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org ad campaigns"
  ON ad_campaigns FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

ALTER TABLE marketing_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org marketing posts"
  ON marketing_posts FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

ALTER TABLE marketing_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org marketing videos"
  ON marketing_videos FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

ALTER TABLE seo_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org SEO articles"
  ON seo_articles FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

ALTER TABLE viral_launches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org viral launches"
  ON viral_launches FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

ALTER TABLE community_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org community channels"
  ON community_channels FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

ALTER TABLE community_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org community interactions"
  ON community_interactions FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

-- ============================================================
-- 6. PROJECTS & CODE
-- ============================================================

ALTER TABLE consolidated_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org consolidated projects"
  ON consolidated_projects FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

ALTER TABLE project_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org project performance"
  ON project_performance FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

ALTER TABLE code_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org code chunks"
  ON code_chunks FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

-- ============================================================
-- 7. R&D & BUSINESS
-- ============================================================

ALTER TABLE rd_test_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org R&D projects"
  ON rd_test_projects FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

ALTER TABLE research_trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org research trends"
  ON research_trends FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

ALTER TABLE trend_scouting ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org trend scouting"
  ON trend_scouting FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

ALTER TABLE investment_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org investment deals"
  ON investment_deals FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

ALTER TABLE investment_stakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org investment stakes"
  ON investment_stakes FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

ALTER TABLE merger_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org merger proposals"
  ON merger_proposals FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

ALTER TABLE negotiation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org negotiation logs"
  ON negotiation_logs FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

-- ============================================================
-- 8. VENDOR & WHITE LABEL
-- ============================================================

ALTER TABLE vendor_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org vendor relations"
  ON vendor_relations FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

ALTER TABLE white_label_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org white label config"
  ON white_label_config FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

ALTER TABLE regional_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org regional configs"
  ON regional_configs FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

-- ============================================================
-- 9. HIVE (collaborative)
-- ============================================================

ALTER TABLE hive_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org hive contributions"
  ON hive_contributions FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

ALTER TABLE hive_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org hive knowledge"
  ON hive_knowledge_base FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );
