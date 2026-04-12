-- Migration: Add missing core tables
-- Creates organizations, org_members, white_label_config, billing_subscriptions, and credit_transactions

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color VARCHAR(20),
  plan_id VARCHAR(50) DEFAULT 'none',
  billing_customer_id TEXT,
  stripe_customer_id TEXT,
  billing_tier VARCHAR(20) DEFAULT 'none',
  has_lifetime_license BOOLEAN DEFAULT false,
  lifetime_license_type VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer_id ON organizations(stripe_customer_id);

-- Org Members table (RBAC)
CREATE TABLE IF NOT EXISTS org_members (
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member', -- owner, admin, member, viewer
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON org_members(user_id);

-- Add org_id to projects table if not already present
ALTER TABLE projects ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON projects(org_id);

-- White-label Configuration
CREATE TABLE IF NOT EXISTS white_label_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  custom_domain TEXT UNIQUE,
  brand_name TEXT,
  theme_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_white_label_config_org_id ON white_label_config(org_id);
CREATE INDEX IF NOT EXISTS idx_white_label_config_custom_domain ON white_label_config(custom_domain);

-- Billing Subscriptions table
CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  status VARCHAR(20), -- 'active', 'past_due', 'canceled'
  tier VARCHAR(50) DEFAULT 'none', -- 'free', 'basic_mini', 'elite_pro', 'elite_enterprise', etc.
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_org_id ON billing_subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_stripe_subscription_id ON billing_subscriptions(stripe_subscription_id);

-- Credit Transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- positive for top-ups/grants, negative for usage
  type VARCHAR(50) NOT NULL, -- 'subscription_grant', 'topup', 'usage', 'lifetime_grant', 'payment_failed', 'marketplace_sale'
  description TEXT,
  stripe_session_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_org_id ON credit_transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);

-- Lifetime Licenses table
CREATE TABLE IF NOT EXISTS lifetime_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  license_id VARCHAR(50) NOT NULL, -- 'lifetime_starter', 'lifetime_pro', 'onprem_perpetual'
  license_name VARCHAR(255) NOT NULL,
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stripe_session_id TEXT,
  monthly_credits INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'revoked'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, license_id)
);

CREATE INDEX IF NOT EXISTS idx_lifetime_licenses_org_id ON lifetime_licenses(org_id);
CREATE INDEX IF NOT EXISTS idx_lifetime_licenses_status ON lifetime_licenses(status);

-- Affiliates table
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  affiliate_code VARCHAR(50) UNIQUE NOT NULL,
  total_earnings INTEGER DEFAULT 0, -- in cents
  pending_payout INTEGER DEFAULT 0, -- in cents
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'suspended', 'inactive'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliates_org_id ON affiliates(org_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_affiliate_code ON affiliates(affiliate_code);

-- Affiliate Commissions table
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  referred_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL, -- 'subscription', 'lifetime_license', 'topup'
  transaction_amount INTEGER NOT NULL, -- in cents
  commission_amount INTEGER NOT NULL, -- in cents
  commission_rate FLOAT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'failed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate_org_id ON affiliate_commissions(affiliate_org_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_referred_org_id ON affiliate_commissions(referred_org_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_status ON affiliate_commissions(status);

-- Marketplace Transactions table
CREATE TABLE IF NOT EXISTS marketplace_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  seller_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  transaction_id TEXT UNIQUE,
  gross_amount INTEGER NOT NULL, -- in cents
  commission_amount INTEGER NOT NULL, -- in cents
  commission_rate FLOAT NOT NULL,
  seller_amount INTEGER NOT NULL, -- in cents
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_buyer_org_id ON marketplace_transactions(buyer_org_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_seller_org_id ON marketplace_transactions(seller_org_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_status ON marketplace_transactions(status);

-- Function to increment affiliate earnings
CREATE OR REPLACE FUNCTION increment_affiliate_earnings(p_affiliate_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE affiliates 
  SET pending_payout = pending_payout + p_amount
  WHERE id = p_affiliate_id;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on all new tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE white_label_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lifetime_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
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

CREATE POLICY "Users can view their org" ON organizations
  FOR SELECT USING (check_is_org_member(id));

CREATE POLICY "Org owners can update org" ON organizations
  FOR UPDATE USING (check_is_org_owner(id));

-- RLS Policies for org_members
CREATE POLICY "Users can view org members" ON org_members
  FOR SELECT USING (check_is_org_member(org_id));

-- RLS Policies for white_label_config
CREATE POLICY "Users can view white label config" ON white_label_config
  FOR SELECT USING (check_is_org_member(org_id));

-- RLS Policies for billing subscriptions
CREATE POLICY "Users can view their billing" ON billing_subscriptions
  FOR SELECT USING (check_is_org_member(org_id));

-- RLS Policies for credit transactions
CREATE POLICY "Users can view their credits" ON credit_transactions
  FOR SELECT USING (check_is_org_member(org_id));
