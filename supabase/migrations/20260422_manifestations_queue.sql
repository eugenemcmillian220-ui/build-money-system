-- MANIFESTATIONS JOB QUEUE
-- Async job row backing the chained-invocation manifest pipeline.
-- Lets each stage (intent, generate, polish, persist) run in its own
-- serverless function invocation so no single function exceeds Vercel
-- Hobby's 300s maxDuration cap.

CREATE TABLE IF NOT EXISTS public.manifestations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    prompt TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending',    -- pending | running | complete | error
    current_stage TEXT NOT NULL DEFAULT 'queued',
    logs JSONB NOT NULL DEFAULT '[]'::jsonb,    -- array of { ts, level, text }
    state JSONB NOT NULL DEFAULT '{}'::jsonb,   -- intermediate payload carried between stages
    result JSONB,
    error TEXT,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manifestations_org
    ON public.manifestations (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_manifestations_status
    ON public.manifestations (status, updated_at DESC);

ALTER TABLE public.manifestations ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own manifestations"
    ON public.manifestations FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.org_members om
            WHERE om.org_id = manifestations.org_id AND om.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.organizations o
            WHERE o.id = manifestations.org_id AND o.owner_id = auth.uid()
        )
    );

-- Atomic refund RPC: flips creditsRefunded in a single UPDATE (guarded by
-- creditsReserved=true AND creditsRefunded IS NOT true), then increments
-- the org balance. Multiple concurrent callers can't double-refund because
-- only the first UPDATE matches the guard.
CREATE OR REPLACE FUNCTION refund_manifestation_credits(p_manifestation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
  v_amount NUMERIC;
  v_rows INTEGER;
BEGIN
  UPDATE public.manifestations
  SET state = jsonb_set(state, '{creditsRefunded}', 'true'::jsonb, true)
  WHERE id = p_manifestation_id
    AND org_id IS NOT NULL
    AND (state->>'creditsReserved')::boolean IS TRUE
    AND (state->>'creditsRefunded')::boolean IS DISTINCT FROM TRUE
    AND (state->>'dynamicCost') IS NOT NULL
  RETURNING org_id, (state->>'dynamicCost')::numeric
  INTO v_org_id, v_amount;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RETURN FALSE; END IF;

  UPDATE public.organizations
  SET credit_balance = COALESCE(credit_balance, 0) + v_amount,
      updated_at = NOW()
  WHERE id = v_org_id;

  RETURN TRUE;
END;
$$;
