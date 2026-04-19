
-- DA-001 FIX: Secure admin check via dedicated admin_users table (not JWT metadata)
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
-- Only service_role can manage admin_users
CREATE POLICY "service_role_only" ON public.admin_users
  FOR ALL USING (auth.role() = 'service_role');

-- Secure admin check function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  );
$$;

-- =============================================================================
-- FIX: RECURSION IN RLS POLICIES (PHASE 20 SOVEREIGN ENGINE)
-- =============================================================================

-- 1. Drop problematic policies
DROP POLICY IF EXISTS "Users can view their org" ON organizations;
DROP POLICY IF EXISTS "Org owners can update org" ON organizations;
DROP POLICY IF EXISTS "Users can view org members" ON org_members;
DROP POLICY IF EXISTS "Users can view org projects" ON projects;
DROP POLICY IF EXISTS "Users can view white label config" ON white_label_config;
DROP POLICY IF EXISTS "Users can view their billing" ON billing_subscriptions;
DROP POLICY IF EXISTS "Users can view their credits" ON credit_transactions;

-- 2. Create Security Definer functions to break recursion
-- These functions run with the privileges of the creator (postgres)
-- and bypass RLS when checking membership.

CREATE OR REPLACE FUNCTION public.check_is_org_member(org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = org_uuid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_is_org_owner(org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = org_uuid AND user_id = auth.uid() AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Apply non-recursive policies using the helper functions

-- Organizations
CREATE POLICY "Users can view their org" ON organizations
  FOR SELECT USING (check_is_org_member(id));

CREATE POLICY "Org owners can update org" ON organizations
  FOR UPDATE USING (check_is_org_owner(id));

-- Org Members
CREATE POLICY "Users can view org members" ON org_members
  FOR SELECT USING (check_is_org_member(org_id));

-- Projects
CREATE POLICY "Users can view org projects" ON projects
  FOR SELECT USING (
    is_public = true OR
    (org_id IS NOT NULL AND check_is_org_member(org_id)) OR
    (org_id IS NULL AND user_id = auth.uid())
  );

-- White Label
CREATE POLICY "Users can view white label config" ON white_label_config
  FOR SELECT USING (check_is_org_member(org_id));

-- Billing
CREATE POLICY "Users can view their billing" ON billing_subscriptions
  FOR SELECT USING (check_is_org_member(org_id));

-- Credits
CREATE POLICY "Users can view their credits" ON credit_transactions
  FOR SELECT USING (check_is_org_member(org_id));

-- =============================================================================
-- FRESH RESTART: CLEANUP (Optional)
-- Run these only if you want to wipe data for a fresh start
-- =============================================================================
/*
TRUNCATE TABLE projects CASCADE;
TRUNCATE TABLE organizations CASCADE;
TRUNCATE TABLE deployments CASCADE;
TRUNCATE TABLE agent_ledger CASCADE;
TRUNCATE TABLE credit_transactions CASCADE;
*/
