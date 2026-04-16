-- Phase 22: Swarm Mesh — Autonomous Multi-Empire Federation

-- Federation Empire Registry
CREATE TABLE IF NOT EXISTS public.federation_empires (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    empire_name text NOT NULL,
    empire_url text,
    description text,
    capabilities text[] DEFAULT '{}',
    agents_available text[] DEFAULT '{}',
    trust_score numeric DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),
    total_trades integer DEFAULT 0,
    total_intelligence_shared integer DEFAULT 0,
    is_active boolean DEFAULT true,
    public_key text,
    metadata jsonb DEFAULT '{}',
    registered_at timestamptz DEFAULT now(),
    last_heartbeat_at timestamptz DEFAULT now(),
    UNIQUE(org_id)
);

-- Mesh Connections (empire-to-empire links)
CREATE TABLE IF NOT EXISTS public.mesh_connections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_empire_id uuid REFERENCES public.federation_empires(id) ON DELETE CASCADE,
    target_empire_id uuid REFERENCES public.federation_empires(id) ON DELETE CASCADE,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked', 'expired')),
    trust_level text DEFAULT 'basic' CHECK (trust_level IN ('basic', 'trusted', 'allied', 'sovereign')),
    initiated_by uuid,
    approved_at timestamptz,
    expires_at timestamptz,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    UNIQUE(source_empire_id, target_empire_id)
);

-- Federation Trades (inter-empire resource exchange)
CREATE TABLE IF NOT EXISTS public.federation_trades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_empire_id uuid REFERENCES public.federation_empires(id) ON DELETE SET NULL,
    buyer_empire_id uuid REFERENCES public.federation_empires(id) ON DELETE SET NULL,
    trade_type text NOT NULL CHECK (trade_type IN ('agent_lending', 'knowledge', 'compute', 'template')),
    resource_name text NOT NULL,
    resource_description text,
    price_agt numeric DEFAULT 0,
    price_ugt numeric DEFAULT 0,
    status text DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'active', 'completed', 'disputed', 'cancelled')),
    duration_hours integer,
    started_at timestamptz,
    completed_at timestamptz,
    rating integer CHECK (rating >= 1 AND rating <= 5),
    review text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

-- Mesh Intelligence Feed (anonymized shared intelligence)
CREATE TABLE IF NOT EXISTS public.mesh_intelligence (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_empire_id uuid REFERENCES public.federation_empires(id) ON DELETE SET NULL,
    intel_type text NOT NULL CHECK (intel_type IN ('trend', 'security', 'performance', 'market', 'threat')),
    title text NOT NULL,
    summary text NOT NULL,
    data jsonb DEFAULT '{}',
    confidence numeric DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    relevance_score numeric DEFAULT 0 CHECK (relevance_score >= 0 AND relevance_score <= 100),
    is_verified boolean DEFAULT false,
    verified_by uuid[],
    upvotes integer DEFAULT 0,
    downvotes integer DEFAULT 0,
    expires_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_federation_empires_active ON public.federation_empires(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_federation_empires_trust ON public.federation_empires(trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_mesh_connections_status ON public.mesh_connections(status);
CREATE INDEX IF NOT EXISTS idx_federation_trades_status ON public.federation_trades(status);
CREATE INDEX IF NOT EXISTS idx_federation_trades_type ON public.federation_trades(trade_type);
CREATE INDEX IF NOT EXISTS idx_mesh_intelligence_type ON public.mesh_intelligence(intel_type);
CREATE INDEX IF NOT EXISTS idx_mesh_intelligence_created ON public.mesh_intelligence(created_at DESC);

-- RLS Policies
ALTER TABLE public.federation_empires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mesh_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.federation_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mesh_intelligence ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "service_role_federation_empires" ON public.federation_empires FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_mesh_connections" ON public.mesh_connections FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_federation_trades" ON public.federation_trades FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_mesh_intelligence" ON public.mesh_intelligence FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users can read active federation data
CREATE POLICY "read_active_empires" ON public.federation_empires FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "read_connections" ON public.mesh_connections FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_trades" ON public.federation_trades FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_intelligence" ON public.mesh_intelligence FOR SELECT TO authenticated USING (true);

-- RPC: Register empire in the federation
CREATE OR REPLACE FUNCTION public.register_federation_empire(
    p_org_id uuid,
    p_empire_name text,
    p_description text DEFAULT NULL,
    p_empire_url text DEFAULT NULL,
    p_capabilities text[] DEFAULT '{}',
    p_agents_available text[] DEFAULT '{}'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    empire_id uuid;
BEGIN
    INSERT INTO public.federation_empires (org_id, empire_name, description, empire_url, capabilities, agents_available)
    VALUES (p_org_id, p_empire_name, p_description, p_empire_url, p_capabilities, p_agents_available)
    ON CONFLICT (org_id) DO UPDATE SET
        empire_name = EXCLUDED.empire_name,
        description = EXCLUDED.description,
        empire_url = EXCLUDED.empire_url,
        capabilities = EXCLUDED.capabilities,
        agents_available = EXCLUDED.agents_available,
        last_heartbeat_at = now()
    RETURNING id INTO empire_id;
    
    RETURN empire_id;
END;
$$;

-- RPC: Update trust score after trade completion
CREATE OR REPLACE FUNCTION public.update_empire_trust(
    p_empire_id uuid,
    p_rating integer
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.federation_empires
    SET 
        trust_score = LEAST(100, GREATEST(0, trust_score + (p_rating - 3) * 2)),
        total_trades = total_trades + 1,
        last_heartbeat_at = now()
    WHERE id = p_empire_id;
END;
$$;

-- RPC: Complete a trade and update trust scores
CREATE OR REPLACE FUNCTION public.complete_federation_trade(
    p_trade_id uuid,
    p_rating integer,
    p_review text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    trade federation_trades;
    result jsonb;
BEGIN
    SELECT * INTO trade FROM public.federation_trades WHERE id = p_trade_id;
    
    IF trade IS NULL THEN
        RAISE EXCEPTION 'Trade not found: %', p_trade_id;
    END IF;
    
    IF trade.status != 'active' THEN
        RAISE EXCEPTION 'Trade status is %, not active', trade.status;
    END IF;
    
    UPDATE public.federation_trades
    SET status = 'completed', completed_at = now(), rating = p_rating, review = p_review
    WHERE id = p_trade_id
    RETURNING to_jsonb(federation_trades.*) INTO result;
    
    -- Update seller trust score
    PERFORM public.update_empire_trust(trade.seller_empire_id, p_rating);
    
    -- Distribute AGT to seller
    PERFORM public.upsert_token_balance(
        p_owner_id := trade.seller_empire_id::text,
        p_token_type := 'AGT',
        p_amount := trade.price_agt
    );
    
    RETURN result;
END;
$$;

-- RPC: Get federation stats
CREATE OR REPLACE FUNCTION public.get_federation_stats()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'total_empires', (SELECT count(*) FROM public.federation_empires WHERE is_active = true),
        'total_connections', (SELECT count(*) FROM public.mesh_connections WHERE status = 'active'),
        'total_trades', (SELECT count(*) FROM public.federation_trades),
        'active_trades', (SELECT count(*) FROM public.federation_trades WHERE status = 'active'),
        'completed_trades', (SELECT count(*) FROM public.federation_trades WHERE status = 'completed'),
        'intelligence_shared', (SELECT count(*) FROM public.mesh_intelligence),
        'avg_trust_score', (SELECT COALESCE(avg(trust_score), 50) FROM public.federation_empires WHERE is_active = true)
    ) INTO result;
    
    RETURN result;
END;
$$;
