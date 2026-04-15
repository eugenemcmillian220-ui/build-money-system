-- =============================================================================
-- Migration: Add Organization Balance Management Functions
-- Supports Phase 10: Multi-Agent Economy
-- =============================================================================

-- Function to decrement organization credit balance (for usage/manifestation)
CREATE OR REPLACE FUNCTION decrement_org_balance(org_id UUID, amount NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE organizations
  SET credit_balance = credit_balance - amount
  WHERE id = org_id;
  
  -- Prevent negative balances
  IF (SELECT credit_balance FROM organizations WHERE id = org_id) < 0 THEN
    RAISE EXCEPTION 'Insufficient credit balance for this operation.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment organization credit balance (for top-ups/grants)
CREATE OR REPLACE FUNCTION increment_org_balance(org_id UUID, amount NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE organizations
  SET credit_balance = credit_balance + amount
  WHERE id = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle agent-to-agent hiring payments
CREATE OR REPLACE FUNCTION execute_agent_payment(
  p_org_id UUID,
  p_project_id UUID,
  p_from_agent VARCHAR,
  p_to_agent VARCHAR,
  p_amount NUMERIC,
  p_description TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  current_bal NUMERIC;
BEGIN
  -- 1. Check current balance
  SELECT credit_balance INTO current_bal FROM organizations WHERE id = p_org_id;
  
  IF current_bal < p_amount THEN
    RETURN FALSE;
  END IF;
  
  -- 2. Deduct from org
  UPDATE organizations SET credit_balance = credit_balance - p_amount WHERE id = p_org_id;
  
  -- 3. Record in ledger
  INSERT INTO agent_ledger (
    org_id, 
    project_id, 
    from_agent, 
    to_agent, 
    amount, 
    transaction_type, 
    description
  ) VALUES (
    p_org_id,
    p_project_id,
    p_from_agent,
    p_to_agent,
    p_amount,
    'hiring',
    p_description
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
