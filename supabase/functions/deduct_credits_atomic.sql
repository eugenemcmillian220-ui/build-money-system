-- Atomic credit deduction RPC (called via supabase.rpc)
CREATE OR REPLACE FUNCTION deduct_credits_atomic(
  p_user_id UUID,
  p_amount  INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE user_credits
  SET
    balance       = balance - p_amount,
    lifetime_used = lifetime_used + p_amount,
    updated_at    = NOW()
  WHERE user_id = p_user_id
    AND balance >= p_amount
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient credits for user %', p_user_id;
  END IF;

  RETURN v_new_balance;
END;
$$;

CREATE OR REPLACE FUNCTION add_credits_atomic(
  p_user_id UUID,
  p_amount  INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  INSERT INTO user_credits (user_id, balance, lifetime_used)
  VALUES (p_user_id, p_amount, 0)
  ON CONFLICT (user_id) DO UPDATE
  SET balance    = user_credits.balance + p_amount,
      updated_at = NOW()
  RETURNING balance INTO v_new_balance;

  RETURN v_new_balance;
END;
$$;

-- Also support the old increment_credits RPC name for backward compat
CREATE OR REPLACE FUNCTION increment_credits(
  p_user_id UUID,
  p_amount  INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM add_credits_atomic(p_user_id, p_amount);
END;
$$;
