-- PHASE 23: SOVEREIGN PULSE (OBSERVABILITY & TELEMETRY)
-- Provides PostHog/Sentry-style observability for the platform and child apps.

-- 1. ERROR CLUSTERS: Group similar errors for semantic analysis
CREATE TABLE IF NOT EXISTS public.error_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    error_type TEXT, -- 'TypeError', 'ReferenceError', etc.
    severity TEXT DEFAULT 'high', -- 'low', 'medium', 'high', 'critical'
    impact_score FLOAT DEFAULT 0.0, -- Calculated neural impact
    occurrence_count INTEGER DEFAULT 1,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    last_occurrence_at TIMESTAMPTZ DEFAULT now(),
    first_occurrence_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(project_id, error_message, error_type)
);

-- 2. EVENT LOGS: Raw telemetry data
CREATE TABLE IF NOT EXISTS public.event_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL, -- 'page_view', 'click', 'api_call', 'error'
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT,
    url TEXT,
    path TEXT,
    properties JSONB DEFAULT '{}'::jsonb, -- Custom properties (browser, OS, etc.)
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- 3. FEATURE FLAGS: Dynamic system toggles
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    flag_key TEXT NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT FALSE,
    rollout_percentage INTEGER DEFAULT 100, -- For canary releases
    rules JSONB DEFAULT '[]'::jsonb, -- Targeting rules
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(project_id, flag_key)
);

-- 4. RLS POLICIES
ALTER TABLE public.error_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view error clusters for their projects"
    ON public.error_clusters FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.projects p
        JOIN public.org_members om ON p.org_id = om.org_id
        WHERE p.id = error_clusters.project_id AND om.user_id = auth.uid()
    ));

CREATE POLICY "Users can view event logs for their projects"
    ON public.event_logs FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.projects p
        JOIN public.org_members om ON p.org_id = om.org_id
        WHERE p.id = event_logs.project_id AND om.user_id = auth.uid()
    ));

-- RPC for event ingestion (bypasses direct write for performance)
CREATE OR REPLACE FUNCTION public.ingest_pulse_event(
    p_project_id UUID,
    p_event_name TEXT,
    p_properties JSONB DEFAULT '{}'::jsonb,
    p_url TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.event_logs (project_id, event_name, properties, url, session_id, user_id)
    VALUES (p_project_id, p_event_name, p_properties, p_url, p_session_id, auth.uid());

    -- If it's an error, upsert into error_clusters
    IF p_event_name = 'error' THEN
        INSERT INTO public.error_clusters (
            project_id,
            error_message,
            error_type,
            error_stack,
            metadata
        )
        VALUES (
            p_project_id,
            COALESCE(p_properties->>'message', 'Unknown Error'),
            COALESCE(p_properties->>'type', 'Error'),
            COALESCE(p_properties->>'stack', ''),
            p_properties
        )
        ON CONFLICT (project_id, error_message, error_type) DO UPDATE SET
            occurrence_count = error_clusters.occurrence_count + 1,
            last_occurrence_at = now(),
            metadata = error_clusters.metadata || EXCLUDED.metadata;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
