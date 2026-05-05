-- DA-055 FIX: TODO: Replace RETURNS json with explicit composite types for type safety
-- Phase 19: Sovereign DAO - RPC Functions
-- These functions power the DAO governance engine

-- Add missing columns to dao_proposals
ALTER TABLE public.dao_proposals 
    ADD COLUMN IF NOT EXISTS org_id uuid,
    ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Unique constraint for token ledger upsert
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'token_ledger_user_type_unique') THEN
        ALTER TABLE public.token_ledger ADD CONSTRAINT token_ledger_user_type_unique UNIQUE (user_id, token_type);
    END IF;
END $$;

-- increment_proposal_vote: Atomically increment vote counts with auto-approval
CREATE OR REPLACE FUNCTION public.increment_proposal_vote(
    p_proposal_id uuid,
    vote_field text,
    amount integer DEFAULT 1
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
BEGIN
    IF vote_field = 'votes_for' THEN
        UPDATE public.dao_proposals 
        SET votes_for = votes_for + amount
        WHERE id = p_proposal_id
        RETURNING to_jsonb(dao_proposals.*) INTO result;
    ELSIF vote_field = 'votes_against' THEN
        UPDATE public.dao_proposals 
        SET votes_against = votes_against + amount
        WHERE id = p_proposal_id
        RETURNING to_jsonb(dao_proposals.*) INTO result;
    ELSE
        RAISE EXCEPTION 'Invalid vote_field: %', vote_field;
    END IF;
    
    -- Auto-execute if quorum reached
    UPDATE public.dao_proposals
    SET status = CASE 
        WHEN votes_for >= quorum_required THEN 'approved'
        WHEN votes_against >= quorum_required THEN 'rejected'
        ELSE status
    END,
    executed_at = CASE
        WHEN votes_for >= quorum_required OR votes_against >= quorum_required THEN now()
        ELSE executed_at
    END
    WHERE id = p_proposal_id AND status = 'open';
    
    SELECT to_jsonb(dao_proposals.*) INTO result 
    FROM public.dao_proposals WHERE id = p_proposal_id;
    
    RETURN result;
END;
$$;

-- upsert_token_balance: Distribute tokens (AGT/UGT) with upsert logic
CREATE OR REPLACE FUNCTION public.upsert_token_balance(
    p_org_id uuid DEFAULT NULL,
    p_owner_id text DEFAULT NULL,
    p_token_type text DEFAULT 'AGT',
    p_amount numeric DEFAULT 0
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.token_ledger (user_id, token_type, balance, total_earned, last_updated)
    VALUES (COALESCE(p_owner_id, p_org_id::text), p_token_type, p_amount, p_amount, now())
    ON CONFLICT (user_id, token_type) 
    DO UPDATE SET 
        balance = token_ledger.balance + p_amount,
        total_earned = token_ledger.total_earned + p_amount,
        last_updated = now();
END;
$$;

-- execute_proposal: Execute an approved proposal and reward proposer
CREATE OR REPLACE FUNCTION public.execute_proposal(
    p_proposal_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    proposal dao_proposals;
    result jsonb;
BEGIN
    SELECT * INTO proposal FROM public.dao_proposals WHERE id = p_proposal_id;
    
    IF proposal IS NULL THEN
        RAISE EXCEPTION 'Proposal not found: %', p_proposal_id;
    END IF;
    
    IF proposal.status != 'approved' THEN
        RAISE EXCEPTION 'Proposal status is %, not approved', proposal.status;
    END IF;
    
    UPDATE public.dao_proposals
    SET status = 'executed', executed_at = now()
    WHERE id = p_proposal_id
    RETURNING to_jsonb(dao_proposals.*) INTO result;
    
    -- Reward proposer with tokens
    PERFORM public.upsert_token_balance(
        p_owner_id := proposal.proposed_by,
        p_token_type := 'AGT',
        p_amount := 10
    );
    
    RETURN result;
END;
$$;

-- distribute_voting_rewards: Give UGT to all voters on a completed proposal
CREATE OR REPLACE FUNCTION public.distribute_voting_rewards(
    p_proposal_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    voter record;
BEGIN
    FOR voter IN 
        SELECT voter_id FROM public.voting_history WHERE proposal_id = p_proposal_id
    LOOP
        PERFORM public.upsert_token_balance(
            p_owner_id := voter.voter_id,
            p_token_type := 'UGT',
            p_amount := 1
        );
    END LOOP;
END;
$$;

-- get_dao_proposals: List proposals with optional filtering
CREATE OR REPLACE FUNCTION public.get_dao_proposals(
    p_status text DEFAULT NULL,
    p_limit integer DEFAULT 20,
    p_offset integer DEFAULT 0
) RETURNS SETOF dao_proposals
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.dao_proposals
    WHERE (p_status IS NULL OR status = p_status)
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- get_token_balances: Fetch balances for a user
CREATE OR REPLACE FUNCTION public.get_token_balances(
    p_user_id text
) RETURNS SETOF token_ledger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.token_ledger
    WHERE user_id = p_user_id
    ORDER BY token_type;
END;
$$;

-- get_voting_history: Fetch votes with optional filters
CREATE OR REPLACE FUNCTION public.get_voting_history(
    p_proposal_id uuid DEFAULT NULL,
    p_voter_id text DEFAULT NULL
) RETURNS SETOF voting_history
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.voting_history
    WHERE (p_proposal_id IS NULL OR proposal_id = p_proposal_id)
    AND (p_voter_id IS NULL OR voter_id = p_voter_id)
    ORDER BY voted_at DESC;
END;
$$;
