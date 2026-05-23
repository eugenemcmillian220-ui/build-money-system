-- Ensure admin account has highest-access tier and near-unlimited spendable credits.
DO $$
DECLARE
  v_admin_email TEXT := 'eugenemcmillian9@gmail.com';
  v_admin_user_id UUID;
BEGIN
  SELECT id INTO v_admin_user_id
  FROM auth.users
  WHERE lower(email) = lower(v_admin_email)
  LIMIT 1;

  IF v_admin_user_id IS NULL THEN
    RAISE NOTICE 'Admin user % not found; skipping backfill', v_admin_email;
    RETURN;
  END IF;

  UPDATE organizations
  SET billing_tier = 'admin_free',
      credit_balance = 99999999,
      updated_at = now()
  WHERE owner_id = v_admin_user_id;

  INSERT INTO user_credits (user_id, balance, updated_at)
  VALUES (v_admin_user_id, 99999999, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    balance = EXCLUDED.balance,
    updated_at = now();
END $$;
