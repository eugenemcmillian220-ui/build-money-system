
-- Phase 19: Sovereign DAO & Tokenomics
CREATE TABLE IF NOT EXISTS dao_proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK (type IN ('investment', 'tech_adoption', 'governance', 'treasury')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'passed', 'rejected', 'executed')),
    proposer_id UUID REFERENCES auth.users(id),
    votes_for INTEGER DEFAULT 0,
    votes_against INTEGER DEFAULT 0,
    threshold INTEGER DEFAULT 100,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days')
);

CREATE TABLE IF NOT EXISTS token_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL, -- Can be User ID or Agent ID
    token_type TEXT CHECK (token_type IN ('AGT', 'UGT')), -- Agent vs User Governance Tokens
    balance DECIMAL(18, 6) DEFAULT 0.00,
    metadata JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(org_id, owner_id, token_type)
);

CREATE TABLE IF NOT EXISTS dao_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID REFERENCES dao_proposals(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL,
    vote_type TEXT CHECK (vote_type IN ('for', 'against')),
    weight INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(proposal_id, voter_id)
);

-- DAO Treasury Tracking
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS dao_treasury_balance DECIMAL(18, 2) DEFAULT 0.00;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS dao_enabled BOOLEAN DEFAULT false;
