CREATE TABLE IF NOT EXISTS user_credits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance     INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_credits_user ON user_credits (user_id);

-- RLS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- Users can read their own balance
CREATE POLICY "users_read_own_credits" ON user_credits
  FOR SELECT USING (auth.uid() = user_id);

-- Service role manages all credit operations
DROP POLICY IF EXISTS "service_role_all_credits" ON user_credits;
CREATE POLICY "service_role_all_credits" ON user_credits
  FOR ALL USING (auth.role() = 'service_role');

-- Atomic credit deduction function
-- Returns new balance, raises exception if insufficient
CREATE OR REPLACE FUNCTION deduct_credits(p_user_id UUID, p_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT balance INTO v_balance
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE; -- row lock prevents race conditions

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'No credit account found for user';
  END IF;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits: has %, needs %', v_balance, p_amount;
  END IF;

  UPDATE user_credits
  SET balance = balance - p_amount, updated_at = now()
  WHERE user_id = p_user_id;

  RETURN v_balance - p_amount;
END;
$$;
