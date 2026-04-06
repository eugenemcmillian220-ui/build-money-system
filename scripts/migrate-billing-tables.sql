-- Build Money System - Billing Tables Migration
-- Run this after setting up Stripe products

-- Lifetime Licenses Table
CREATE TABLE IF NOT EXISTS lifetime_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  license_id TEXT NOT NULL,
  license_name TEXT NOT NULL,
  purchase_date TIMESTAMPTZ DEFAULT NOW(),
  stripe_session_id TEXT,
  monthly_credits INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, license_id)
);

-- Affiliates Table
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  affiliate_code TEXT UNIQUE NOT NULL,
  total_earnings INTEGER DEFAULT 0,
  pending_payout INTEGER DEFAULT 0,
  payout_threshold INTEGER DEFAULT 5000, -- $50 in cents
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Affiliate Commissions Table
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  referred_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL, -- 'subscription', 'lifetime_license', 'topup'
  transaction_amount INTEGER NOT NULL, -- in cents
  commission_amount INTEGER NOT NULL, -- in cents
  commission_rate DECIMAL(5,4) DEFAULT 0.20,
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketplace Transactions Table
CREATE TABLE IF NOT EXISTS marketplace_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  seller_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL,
  gross_amount INTEGER NOT NULL, -- in cents
  commission_amount INTEGER NOT NULL, -- 25% platform fee
  commission_rate DECIMAL(5,4) DEFAULT 0.25,
  seller_amount INTEGER NOT NULL, -- gross - commission
  description TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add lifetime license columns to organizations if not exist
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS has_lifetime_license BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS lifetime_license_type TEXT;

-- Function to increment affiliate earnings
CREATE OR REPLACE FUNCTION increment_affiliate_earnings(p_affiliate_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE affiliates 
  SET 
    total_earnings = total_earnings + p_amount,
    pending_payout = pending_payout + p_amount,
    updated_at = NOW()
  WHERE id = p_affiliate_id;
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lifetime_licenses_org ON lifetime_licenses(org_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate ON affiliate_commissions(affiliate_org_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_referred ON affiliate_commissions(referred_org_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_buyer ON marketplace_transactions(buyer_org_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_seller ON marketplace_transactions(seller_org_id);

-- RLS Policies
ALTER TABLE lifetime_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for lifetime_licenses
CREATE POLICY "Users can view their org licenses" ON lifetime_licenses
  FOR SELECT USING (org_id IN (
    SELECT org_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- Policies for affiliates
CREATE POLICY "Users can view their org affiliate data" ON affiliates
  FOR SELECT USING (org_id IN (
    SELECT org_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- Policies for affiliate_commissions
CREATE POLICY "Affiliates can view their commissions" ON affiliate_commissions
  FOR SELECT USING (affiliate_org_id IN (
    SELECT org_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- Policies for marketplace_transactions
CREATE POLICY "Users can view their marketplace transactions" ON marketplace_transactions
  FOR SELECT USING (
    buyer_org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
    OR seller_org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
  );
