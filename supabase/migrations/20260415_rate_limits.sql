-- Persistent rate limiting table + RPC function
-- Used by src/lib/rate-limit.ts for serverless-safe rate limiting

CREATE TABLE IF NOT EXISTS rate_limits (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM now()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key_created
  ON rate_limits (key, created_at);

-- Atomic check-and-increment function
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_limit INT,
  p_window_ms BIGINT
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  window_start BIGINT;
  current_count INT;
  allowed BOOLEAN;
BEGIN
  window_start := (EXTRACT(EPOCH FROM now()) * 1000)::BIGINT - p_window_ms;

  -- Prune expired entries for this key
  DELETE FROM rate_limits WHERE key = p_key AND created_at < window_start;

  -- Count current window hits
  SELECT COUNT(*) INTO current_count
    FROM rate_limits
   WHERE key = p_key AND created_at >= window_start;

  allowed := current_count < p_limit;

  IF allowed THEN
    INSERT INTO rate_limits (key) VALUES (p_key);
    current_count := current_count + 1;
  END IF;

  RETURN json_build_object('allowed', allowed, 'current_count', current_count);
END;
$$;

-- Periodic cleanup: remove entries older than 24 hours
-- Run via pg_cron or a Supabase scheduled function
-- SELECT cron.schedule('cleanup-rate-limits', '0 * * * *',
--   $$DELETE FROM rate_limits WHERE created_at < (EXTRACT(EPOCH FROM now()) * 1000)::BIGINT - 86400000$$
-- );
