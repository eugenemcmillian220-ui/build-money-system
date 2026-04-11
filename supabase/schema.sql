-- =============================================================================
-- Supabase SQL Schema for AI App Builder
-- Supports Phases 3-5: Projects, Deployments, Feedback, Learning Store
-- =============================================================================

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

-- Deployment status enum
CREATE TYPE deployment_status AS ENUM (
  'pending',
  'building',
  'ready',
  'error',
  'cancelled'
);

-- Agent phase enum
CREATE TYPE agent_phase AS ENUM (
  'planning',
  'building',
  'testing',
  'fixing',
  'complete'
);

-- Feedback category enum
CREATE TYPE feedback_category AS ENUM (
  'accuracy',
  'performance',
  'style',
  'completeness',
  'other'
);

-- Learning data source enum
CREATE TYPE learning_source AS ENUM (
  'feedback',
  'debugger',
  'swarm'
);

-- Learning data type enum
CREATE TYPE learning_type AS ENUM (
  'pattern',
  'optimization',
  'preference',
  'error-fix'
);

-- Impact level enum
CREATE TYPE impact_level AS ENUM (
  'low',
  'medium',
  'high'
);

-- =============================================================================
-- PROJECTS TABLE
-- Stores generated app projects with files, description, schema, and integrations
-- =============================================================================

CREATE TABLE projects (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core project data
  name VARCHAR(255) NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  
  -- Files stored as JSONB for flexibility
  files JSONB NOT NULL DEFAULT '{}',
  
  -- SQL Schema if generated
  schema TEXT,
  
  -- Integrations array (e.g., ['stripe', 'supabase'])
  integrations TEXT[] DEFAULT '{}',
  
  -- Agent execution status
  status_phase agent_phase DEFAULT 'planning',
  status_current_pass INTEGER DEFAULT 0,
  status_total_passes INTEGER DEFAULT 3,
  status_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- GitHub integration
  github_repo VARCHAR(500),
  github_url TEXT,
  
  -- User ownership (optional, can be null for anonymous projects)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Metadata
  is_public BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  monetization JSONB DEFAULT '{"affiliateCut": 0.20, "revenueShareActive": true, "surgePricing": false, "surgeMultiplier": 1.0}',
  manifest JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}'
);

-- Indexes for projects
CREATE INDEX idx_projects_user_id ON projects(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_projects_status_phase ON projects(status_phase);
CREATE INDEX idx_projects_is_public ON projects(is_public) WHERE is_public = true;

-- Row Level Security for projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own projects
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

-- Policy: Users can insert their own projects
CREATE POLICY "Users can create own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL); -- Require authentication to prevent spam

-- Policy: Users can update their own projects
CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own projects
CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Policy: Public projects are readable by everyone
CREATE POLICY "Public projects are viewable by everyone" ON projects
  FOR SELECT USING (is_public = true);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_timestamp
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_project_timestamp();

-- =============================================================================
-- DEPLOYMENTS TABLE
-- Tracks deployment status for generated projects (Phase 4)
-- =============================================================================

CREATE TABLE deployments (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to project
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Deployment details
  name VARCHAR(255) NOT NULL,
  url TEXT,
  status deployment_status NOT NULL DEFAULT 'pending',
  
  -- Vercel-specific fields
  vercel_deployment_id VARCHAR(255),
  vercel_team_id VARCHAR(255),
  
  -- Build information
  build_logs TEXT,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deployed_at TIMESTAMPTZ,
  
  -- Environment info
  environment VARCHAR(50) DEFAULT 'production',
  framework VARCHAR(50) DEFAULT 'nextjs',
  
  -- User ownership
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for deployments
CREATE INDEX idx_deployments_project_id ON deployments(project_id);
CREATE INDEX idx_deployments_user_id ON deployments(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_deployments_status ON deployments(status);
CREATE INDEX idx_deployments_created_at ON deployments(created_at DESC);

-- Row Level Security for deployments
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view own project deployments
CREATE POLICY "Users can view own deployments" ON deployments
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can create deployments for own projects
CREATE POLICY "Users can create own deployments" ON deployments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update own deployments
CREATE POLICY "Users can update own deployments" ON deployments
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete own deployments
CREATE POLICY "Users can delete own deployments" ON deployments
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_deployment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_deployments_timestamp
  BEFORE UPDATE ON deployments
  FOR EACH ROW
  EXECUTE FUNCTION update_deployment_timestamp();

-- =============================================================================
-- FEEDBACK TABLE
-- User feedback for self-improvement system (Phase 5)
-- =============================================================================

CREATE TABLE feedback (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to project
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  -- Feedback content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  category feedback_category NOT NULL DEFAULT 'other',
  
  -- Analysis status
  is_analyzed BOOLEAN DEFAULT false,
  analysis_notes TEXT,
  
  -- Source information
  source VARCHAR(50) DEFAULT 'user', -- 'user', 'automated', 'review'
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- User ownership
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for feedback
CREATE INDEX idx_feedback_project_id ON feedback(project_id);
CREATE INDEX idx_feedback_user_id ON feedback(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX idx_feedback_rating ON feedback(rating);
CREATE INDEX idx_feedback_category ON feedback(category);
CREATE INDEX idx_feedback_is_analyzed ON feedback(is_analyzed) WHERE is_analyzed = false;

-- Row Level Security for feedback
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can submit feedback (anonymous)
CREATE POLICY "Anyone can submit feedback" ON feedback
  FOR INSERT WITH CHECK (true);

-- Policy: Users can view own feedback
CREATE POLICY "Users can view own feedback" ON feedback
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Users can update own feedback
CREATE POLICY "Users can update own feedback" ON feedback
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete own feedback
CREATE POLICY "Users can delete own feedback" ON feedback
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_feedback_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_feedback_timestamp
  BEFORE UPDATE ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_timestamp();

-- =============================================================================
-- LEARNING STORE TABLE
-- Learning data for the system to improve over time (Phase 5)
-- =============================================================================

CREATE TABLE learning_store (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Learning data content
  source learning_source NOT NULL,
  type learning_type NOT NULL,
  content TEXT NOT NULL,
  impact impact_level NOT NULL DEFAULT 'medium',
  
  -- Related entities
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  feedback_id UUID REFERENCES feedback(id) ON DELETE SET NULL,
  
  -- Application status
  is_applied BOOLEAN DEFAULT false,
  applied_at TIMESTAMPTZ,
  application_notes TEXT,
  
  -- Validation
  validation_score DECIMAL(3,2),
  is_validated BOOLEAN DEFAULT false,
  validated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- User who contributed this learning
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for learning_store
CREATE INDEX idx_learning_store_source ON learning_store(source);
CREATE INDEX idx_learning_store_type ON learning_store(type);
CREATE INDEX idx_learning_store_impact ON learning_store(impact);
CREATE INDEX idx_learning_store_project_id ON learning_store(project_id);
CREATE INDEX idx_learning_store_feedback_id ON learning_store(feedback_id);
CREATE INDEX idx_learning_store_is_applied ON learning_store(is_applied);
CREATE INDEX idx_learning_store_created_at ON learning_store(created_at DESC);

-- Row Level Security for learning_store
ALTER TABLE learning_store ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view learning data
CREATE POLICY "Authenticated users can view learning data" ON learning_store
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Policy: Only Admins can insert/update learning data to prevent poisoning
CREATE POLICY "Admins can insert learning data" ON learning_store
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "System can update learning data" ON learning_store
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Policy: Only admins can delete learning data
CREATE POLICY "Only admins can delete learning data" ON learning_store
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_learning_store_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_learning_store_timestamp
  BEFORE UPDATE ON learning_store
  FOR EACH ROW
  EXECUTE FUNCTION update_learning_store_timestamp();

-- =============================================================================
-- HELPER VIEWS
-- =============================================================================

-- View: Project with latest deployment
CREATE OR REPLACE VIEW projects_with_deployments 
WITH (security_invoker = true) AS
SELECT 
  p.*,
  d.id AS latest_deployment_id,
  d.url AS latest_deployment_url,
  d.status AS latest_deployment_status,
  d.created_at AS latest_deployment_created_at
FROM projects p
LEFT JOIN LATERAL (
SELECT id, url, status, created_at
  FROM deployments
  WHERE project_id = p.id
  ORDER BY created_at DESC
  LIMIT 1
) d ON true;

-- View: Project with feedback summary
CREATE OR REPLACE VIEW projects_with_feedback_summary 
WITH (security_invoker = true) AS
SELECT 
  p.id,
  p.name,
  p.description,
  p.created_at,
  p.user_id,
  COUNT(f.id) AS feedback_count,
  COALESCE(AVG(f.rating), 0)::DECIMAL(3,2) AS average_rating,
  COUNT(CASE WHEN f.is_analyzed THEN 1 END) AS analyzed_count
FROM projects p
LEFT JOIN feedback f ON f.project_id = p.id
GROUP BY p.id, p.name, p.description, p.created_at, p.user_id;

-- View: Learning data ready for application
CREATE OR REPLACE VIEW pending_learning_data 
WITH (security_invoker = true) AS
SELECT 
  id,
  source,
  type,
  content,
  impact,
  project_id,
  created_at,
  tags
FROM learning_store
WHERE is_applied = false
ORDER BY 
  CASE impact 
    WHEN 'high' THEN 1 
    WHEN 'medium' THEN 2 
    WHEN 'low' THEN 3 
  END,
  created_at DESC;

-- View: Feedback trends analysis
CREATE OR REPLACE VIEW feedback_trends 
WITH (security_invoker = true) AS
SELECT 
  category,
  COUNT(*) AS total_count,
  COUNT(CASE WHEN rating >= 4 THEN 1 END) AS positive_count,
  COUNT(CASE WHEN rating <= 3 THEN 1 END) AS negative_count,
  AVG(rating)::DECIMAL(3,2) AS average_rating,
  COUNT(CASE WHEN is_analyzed THEN 1 END) AS analyzed_count
FROM feedback
GROUP BY category;

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function: Get user's project count
CREATE OR REPLACE FUNCTION get_user_project_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  count_val INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_val
  FROM projects
  WHERE user_id = user_uuid;
  RETURN count_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get average rating for a project
CREATE OR REPLACE FUNCTION get_project_average_rating(project_uuid UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  avg_rating DECIMAL(3,2);
BEGIN
  SELECT COALESCE(AVG(rating), 0)::DECIMAL(3,2) INTO avg_rating
  FROM feedback
  WHERE project_id = project_uuid;
  RETURN avg_rating;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Apply learning data (mark as applied)
CREATE OR REPLACE FUNCTION apply_learning_data(learning_uuid UUID, notes TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE learning_store
  SET 
    is_applied = true,
    applied_at = NOW(),
    application_notes = notes
  WHERE id = learning_uuid;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Mark feedback as analyzed
CREATE OR REPLACE FUNCTION mark_feedback_analyzed(feedback_uuid UUID, notes TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE feedback
  SET 
    is_analyzed = true,
    analysis_notes = notes
  WHERE id = feedback_uuid;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Create learning data from feedback
CREATE OR REPLACE FUNCTION create_learning_from_feedback(feedback_uuid UUID)
RETURNS UUID AS $$
DECLARE
  new_learning_id UUID;
  fb RECORD;
BEGIN
  -- Get the feedback record
  SELECT * INTO fb FROM feedback WHERE id = feedback_uuid;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Create learning entry
  INSERT INTO learning_store (
    source,
    type,
    content,
    impact,
    project_id,
    feedback_id,
    tags,
    metadata
  ) VALUES (
    'feedback',
    CASE 
      WHEN fb.category = 'accuracy' THEN 'error-fix'
      WHEN fb.category = 'performance' THEN 'optimization'
      WHEN fb.category = 'style' THEN 'preference'
      ELSE 'pattern'
    END,
    COALESCE(fb.comment, 'No comment provided'),
    CASE 
      WHEN fb.rating >= 4 THEN 'high'
      WHEN fb.rating = 3 THEN 'medium'
      ELSE 'low'
    END,
    fb.project_id,
    fb.id,
    ARRAY[fb.category::text],
    jsonb_build_object('rating', fb.rating)
  )
  RETURNING id INTO new_learning_id;
  
  -- Mark feedback as analyzed
  UPDATE feedback SET is_analyzed = true WHERE id = feedback_uuid;
  
  RETURN new_learning_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- REAL-TIME SUBSCRIPTIONS
-- Enable real-time for deployments table
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE deployments;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE feedback;

-- =============================================================================
-- STORAGE (for project file storage if needed)
-- =============================================================================

-- Create storage bucket for project assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-assets',
  'project-assets',
  true,
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'application/json', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Anyone can view project assets
CREATE POLICY "Public access to project assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'project-assets');

-- Storage policy: Authenticated users can upload project assets
CREATE POLICY "Users can upload project assets" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'project-assets' AND auth.role() = 'authenticated');

-- Storage policy: Users can delete own project assets
CREATE POLICY "Users can delete own project assets" ON storage.objects
  FOR DELETE USING (bucket_id = 'project-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================================================
-- SEED DATA (optional - for testing)
-- =============================================================================

-- Insert sample learning data for testing
INSERT INTO learning_store (source, type, content, impact, tags, metadata)
VALUES 
  ('debugger', 'pattern', 'Always include React import in component files', 'medium', ARRAY['react', 'components'], '{"language": "typescript"}'),
  ('feedback', 'optimization', 'Users prefer faster build times over additional features', 'high', ARRAY['performance', 'ux'], '{}'),
  ('swarm', 'error-fix', 'Handle null values in API responses to prevent crashes', 'high', ARRAY['error-handling', 'api'], '{"fixed_in": "v2.0"}')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- PHASE 3 UPGRADE: Full-Text Search, Project Versioning, Size Guard
-- =============================================================================

-- Full-text search vector on projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(name, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(prompt, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_projects_search ON projects USING GIN(search_vector);

-- Project versioning: snapshot every generation
CREATE TABLE IF NOT EXISTS project_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  files JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_project_versions_project_id ON project_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_versions_created_at ON project_versions(created_at DESC);

-- RLS for project_versions
ALTER TABLE project_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project versions" ON project_versions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND (auth.uid() = user_id OR is_public = true))
  );

CREATE POLICY "Users can create project versions" ON project_versions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND auth.uid() = user_id)
  );

-- Function: save a version snapshot when a project is updated
CREATE OR REPLACE FUNCTION snapshot_project_version()
RETURNS TRIGGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM project_versions
  WHERE project_id = NEW.id;

  INSERT INTO project_versions (project_id, version_number, files, description)
  VALUES (NEW.id, next_version, NEW.files, NEW.description);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_version_snapshot
  AFTER UPDATE OF files ON projects
  FOR EACH ROW
  WHEN (OLD.files IS DISTINCT FROM NEW.files)
  EXECUTE FUNCTION snapshot_project_version();

-- Search function for projects
CREATE OR REPLACE FUNCTION search_projects(query TEXT, limit_val INTEGER DEFAULT 20)
RETURNS SETOF projects AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM projects
  WHERE search_vector @@ plainto_tsquery('english', query)
     OR name ILIKE '%' || query || '%'
  ORDER BY ts_rank(search_vector, plainto_tsquery('english', query)) DESC
  LIMIT limit_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- =============================================================================
-- PHASE 8 UPGRADE: Multi-Tenancy, Memory, Semantic Search
-- =============================================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  logo_url TEXT,
  primary_color VARCHAR(20),
  plan_id VARCHAR(50) DEFAULT 'none',
  billing_customer_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);

-- Org Members table (RBAC)
CREATE TABLE IF NOT EXISTS org_members (
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member', -- owner, admin, member, viewer
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (org_id, user_id)
);

-- Add org_id to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON projects(org_id);

-- Update project policies for multi-tenancy
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
CREATE POLICY "Users can view org projects" ON projects
  FOR SELECT USING (
    is_public = true OR 
    (org_id IS NOT NULL AND EXISTS (SELECT 1 FROM org_members WHERE org_id = projects.org_id AND user_id = auth.uid())) OR
    (org_id IS NULL AND user_id = auth.uid())
  );

-- Generation Memory (pgvector)
CREATE TABLE IF NOT EXISTS generation_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  org_id UUID REFERENCES organizations(id),
  prompt TEXT NOT NULL,
  embedding vector(1536), -- OpenAI standard
  tech_stack TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_embedding ON generation_memory USING ivfflat (embedding vector_cosine_ops);

-- Code Chunks for Semantic Search
CREATE TABLE IF NOT EXISTS code_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_code_chunks_embedding ON code_chunks USING ivfflat (embedding vector_cosine_ops);

-- White-label Configuration
CREATE TABLE IF NOT EXISTS white_label_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  custom_domain TEXT UNIQUE,
  brand_name TEXT,
  theme_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Function: Search code chunks semantically
CREATE OR REPLACE FUNCTION search_code_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_org_id UUID
)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  file_path TEXT,
  content TEXT,
  similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.id,
    cc.project_id,
    cc.file_path,
    cc.content,
    1 - (cc.embedding <=> query_embedding) AS similarity
  FROM code_chunks cc
  JOIN projects p ON cc.project_id = p.id
  WHERE p.org_id = p_org_id
    AND 1 - (cc.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- END OF SCHEMA
-- =============================================================================

-- PHASE 9: Autonomous Enterprise Layer
CREATE TABLE IF NOT EXISTS compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  pii_detected BOOLEAN DEFAULT false,
  soc2_passed BOOLEAN DEFAULT false,
  gdpr_passed BOOLEAN DEFAULT false,
  report_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PHASE 10: Multi-Agent Economy & Marketplace
-- Tracks credit balances for organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS credit_balance DECIMAL(12, 4) DEFAULT 0.00;

-- Ledger for agent-to-agent transactions and resource costs
CREATE TABLE IF NOT EXISTS agent_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  from_agent VARCHAR(50) NOT NULL, -- e.g., 'Architect', 'Developer'
  to_agent VARCHAR(50),           -- e.g., 'SecurityAuditor'
  amount DECIMAL(12, 4) NOT NULL,
  currency VARCHAR(10) DEFAULT 'CREDIT',
  transaction_type VARCHAR(20) NOT NULL, -- 'hiring', 'resource_cost', 'top_up'
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Marketplace for specialized agent skills/prompts
CREATE TABLE IF NOT EXISTS agent_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  category VARCHAR(50), -- 'ui', 'logic', 'security', 'data'
  price DECIMAL(12, 4) DEFAULT 0.00,
  prompt_template TEXT NOT NULL,
  required_tools TEXT[],
  version VARCHAR(20) DEFAULT '1.0.0',
  rating DECIMAL(3, 2) DEFAULT 0.00,
  usage_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_ledger_org_id ON agent_ledger(org_id);
CREATE INDEX IF NOT EXISTS idx_agent_skills_category ON agent_skills(category);

-- PHASE 11: Autonomous Growth Lab
-- Tracks social media posts and campaigns
CREATE TABLE IF NOT EXISTS marketing_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- 'x', 'linkedin', 'reddit'
  content TEXT NOT NULL,
  media_urls TEXT[],
  status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'posted', 'failed'
  external_id TEXT, -- ID from the social platform
  engagement_metrics JSONB DEFAULT '{}', -- likes, shares, etc.
  scheduled_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tracks automated SEO articles and landing pages
CREATE TABLE IF NOT EXISTS seo_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL,
  keywords TEXT[],
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'published'
  view_count INTEGER DEFAULT 0,
  last_revalidated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_posts_project_id ON marketing_posts(project_id);
CREATE INDEX IF NOT EXISTS idx_seo_articles_project_id ON seo_articles(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_seo_articles_slug ON seo_articles(slug);

-- STRIPE BILLING & CREDIT ECONOMY
-- Tracks organization subscription status
CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  status VARCHAR(20), -- 'active', 'past_due', 'canceled'
  tier VARCHAR(20) DEFAULT 'free', -- 'free', 'pro', 'enterprise'
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Detailed credit transaction history (Top-ups, Subscriptions, Usage)
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- positive for top-ups, negative for usage
  type VARCHAR(30) NOT NULL, -- 'subscription_grant', 'topup', 'usage', 'referral'
  description TEXT,
  stripe_session_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sync organizations table with Stripe customer ID
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_tier VARCHAR(20) DEFAULT 'none';

CREATE INDEX IF NOT EXISTS idx_billing_subs_org_id ON billing_subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_credit_trans_org_id ON credit_transactions(org_id);

-- PHASE 12: Autonomous Governance & Edge Scale
-- Tracks agent actions requiring human approval
CREATE TABLE IF NOT EXISTS pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL, -- e.g. 'architect', 'sre'
  action_type TEXT NOT NULL, -- e.g. 'hire_agent', 'deploy_infra', 'expensive_generation'
  payload JSONB NOT NULL, -- Full data for the action
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reason TEXT, -- Optional reason for rejection or context for approval
  risk_score FLOAT DEFAULT 0.0, -- AI-calculated risk
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tracks regional deployment configurations
CREATE TABLE IF NOT EXISTS regional_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  region TEXT NOT NULL, -- e.g. 'us-east-1', 'eu-west-1'
  endpoint_url TEXT,
  health_status TEXT DEFAULT 'healthy',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_actions_org_id ON pending_actions(org_id);
CREATE INDEX IF NOT EXISTS idx_pending_actions_status ON pending_actions(status);
CREATE INDEX IF NOT EXISTS idx_regional_configs_project_id ON regional_configs(project_id);

-- PHASE 13: Autonomous VC Layer
-- Tracks investments made by the platform into projects
CREATE TABLE IF NOT EXISTS investment_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  amount_credits INTEGER NOT NULL, -- Investment in platform credits
  equity_share FLOAT NOT NULL, -- Revenue share percentage (e.g. 0.05 for 5%)
  status VARCHAR(20) DEFAULT 'proposed', -- 'proposed', 'accepted', 'rejected', 'active'
  terms TEXT,
  investment_type VARCHAR(30) DEFAULT 'credit_injection', -- 'credit_injection', 'growth_boost'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Real-time performance metrics for project scoring
CREATE TABLE IF NOT EXISTS project_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_count INTEGER DEFAULT 0,
  revenue_total DECIMAL(12, 2) DEFAULT 0.00,
  growth_velocity FLOAT DEFAULT 0.0, -- Weekly growth rate
  retention_rate FLOAT DEFAULT 0.0,
  last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tracks revenue share settlements back to the platform
CREATE TABLE IF NOT EXISTS revenue_share_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES investment_deals(id) ON DELETE CASCADE,
  amount_usd DECIMAL(12, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'settled',
  payout_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investment_deals_org_id ON investment_deals(org_id);
CREATE INDEX IF NOT EXISTS idx_project_performance_project_id ON project_performance(project_id);

-- PHASE 14: Agentic Diplomacy & B2B Negotiation
CREATE TABLE IF NOT EXISTS vendor_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL,
  vendor_type TEXT NOT NULL, -- 'llm', 'payment', 'storage', 'deployment'
  api_endpoint TEXT,
  current_price_per_unit DECIMAL(10,6) DEFAULT 0.0,
  negotiated_price DECIMAL(10,6),
  status TEXT DEFAULT 'active', -- 'active', 'negotiating', 'at_risk', 'downgraded'
  health_score FLOAT DEFAULT 1.0, -- 0.0 to 1.0
  last_incident_at TIMESTAMPTZ,
  contract_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS negotiation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendor_relations(id) ON DELETE CASCADE,
  trigger TEXT NOT NULL, -- 'price_hike', 'downtime', 'rate_limit', 'manual'
  agent_message TEXT NOT NULL,
  vendor_response TEXT,
  outcome TEXT, -- 'resolved', 'pending', 'escalated', 'failed'
  savings_usd DECIMAL(10,2) DEFAULT 0.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_relations_status ON vendor_relations(status);
CREATE INDEX IF NOT EXISTS idx_negotiation_logs_vendor_id ON negotiation_logs(vendor_id);

-- PHASE 15: The Hive Mind Global Intelligence Loop
-- Stores anonymized build patterns and knowledge assets
CREATE TABLE IF NOT EXISTS hive_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type VARCHAR(50) NOT NULL, -- 'bug_fix', 'architecture', 'ui_pattern'
  problem_description TEXT NOT NULL,
  solution_delta JSONB NOT NULL, -- Anonymized AST Delta or CSS/Logic snippet
  tags TEXT[],
  confidence_score FLOAT DEFAULT 0.0, -- Aggregated trust score
  usage_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tracks contributions from organizations (anonymized)
CREATE TABLE IF NOT EXISTS hive_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL, -- Null for absolute anonymity if needed
  knowledge_id UUID REFERENCES hive_knowledge_base(id) ON DELETE CASCADE,
  contribution_type VARCHAR(30), -- 'submission', 'validation', 'recall'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Search index for the global knowledge base
CREATE INDEX IF NOT EXISTS idx_hive_kb_pattern_type ON hive_knowledge_base(pattern_type);
CREATE INDEX IF NOT EXISTS idx_hive_kb_tags ON hive_knowledge_base USING GIN(tags);

-- PHASE 16: Autonomous M&A (Mergers & Acquisitions)
-- Tracks proposals for merging two or more projects
CREATE TABLE IF NOT EXISTS merger_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  target_project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  synergy_score FLOAT DEFAULT 0.0, -- 0.0 to 1.0
  synergy_reasoning TEXT,
  proposed_equity_split JSONB, -- e.g. {"source": 0.6, "target": 0.4}
  status VARCHAR(20) DEFAULT 'proposed', -- 'proposed', 'under_review', 'accepted', 'executed'
  technical_due_diligence JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tracks consolidated project histories
CREATE TABLE IF NOT EXISTS consolidated_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merger_id UUID REFERENCES merger_proposals(id) ON DELETE CASCADE,
  new_project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  integration_strategy TEXT, -- 'semantic_rebase', 'module_wrap'
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merger_source ON merger_proposals(source_project_id);
CREATE INDEX IF NOT EXISTS idx_merger_target ON merger_proposals(target_project_id);

-- PHASE 11 EXPANSION: Option A - Media Agent
CREATE TABLE IF NOT EXISTS marketing_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- 'tiktok', 'reels', 'shorts'
  script TEXT NOT NULL,
  asset_urls TEXT[], -- Screenshots or video clips selected by Vision
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'generating', 'ready'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PHASE 11 EXPANSION: Option B - Ad Agent
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- 'meta', 'google', 'x'
  ad_copy TEXT NOT NULL,
  budget_credits INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'completed'
  metrics JSONB DEFAULT '{}', -- clicks, impressions, conversions
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PHASE 11 EXPANSION: Option C - Launch Agent
CREATE TABLE IF NOT EXISTS viral_launches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- 'product_hunt', 'hacker_news', 'indie_hackers'
  pitch_title TEXT NOT NULL,
  pitch_body TEXT NOT NULL,
  launch_date TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'live', 'completed'
  engagement_score FLOAT DEFAULT 0.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PHASE 11 EXPANSION: Option D - Community Agent
CREATE TABLE IF NOT EXISTS community_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- 'discord', 'slack'
  channel_id TEXT NOT NULL,
  auto_welcome BOOLEAN DEFAULT TRUE,
  auto_support BOOLEAN DEFAULT TRUE,
  active_members INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES community_channels(id) ON DELETE CASCADE,
  user_query TEXT,
  agent_response TEXT,
  sentiment_score FLOAT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PHASE 17: Autonomous Legal & Corporate Suite
-- Tracks legal entities (LLCs, DAOs) formed for projects
CREATE TABLE IF NOT EXISTS legal_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  entity_name TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'llc', 'corporation', 'dao'
  jurisdiction TEXT NOT NULL, -- e.g. 'Delaware', 'Wyoming', 'On-chain'
  registration_id TEXT, -- Government or protocol ID
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'pending', 'active', 'dissolved'
  governance_docs JSONB, -- AI-generated Operating Agreements, TOS, Privacy Policy
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tracks IP, Patents, and Trademark filings
CREATE TABLE IF NOT EXISTS ip_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL, -- 'trademark', 'patent', 'copyright'
  asset_description TEXT,
  filing_status TEXT DEFAULT 'pending',
  filing_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_entities_project_id ON legal_entities(project_id);
CREATE INDEX IF NOT EXISTS idx_ip_vault_project_id ON ip_vault(project_id);

-- PHASE 18: Autonomous R&D & Tech Scouting
-- Tracks emerging technology trends from GitHub/arXiv
CREATE TABLE IF NOT EXISTS research_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tech_name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'framework', 'llm', 'library', 'protocol'
  star_velocity FLOAT DEFAULT 0.0,
  discovery_source TEXT, -- 'github', 'arxiv', 'huggingface'
  analysis_summary TEXT,
  adoption_status VARCHAR(20) DEFAULT 'monitoring', -- 'monitoring', 'testing', 'integrated', 'obsolete'
  confidence_score FLOAT DEFAULT 0.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tracks autonomous R&D test projects
CREATE TABLE IF NOT EXISTS rd_test_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_id UUID REFERENCES research_trends(id) ON DELETE CASCADE,
  test_project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  test_objective TEXT,
  verification_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'verified', 'failed'
  findings TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_trends_category ON research_trends(category);
CREATE INDEX IF NOT EXISTS idx_research_trends_status ON research_trends(adoption_status);

-- ── Phase 10: Agent Economy RPCs ──

-- Function to increment organization credit balance (for top-ups/grants)
CREATE OR REPLACE FUNCTION increment_org_balance(org_id UUID, amount NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE organizations
  SET credit_balance = COALESCE(credit_balance, 0) + amount
  WHERE id = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement organization credit balance (for usage)
CREATE OR REPLACE FUNCTION decrement_org_balance(org_id UUID, amount NUMERIC)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance NUMERIC;
BEGIN
  SELECT credit_balance INTO current_balance FROM organizations WHERE id = org_id;
  
  IF current_balance >= amount THEN
    UPDATE organizations
    SET credit_balance = credit_balance - amount
    WHERE id = org_id;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- ELITE EMPIRE UPGRADES (PHASES 1-20)
-- =============================================================================

-- Phase 10: Agent Performance & ROI Tracking
CREATE TABLE IF NOT EXISTS agent_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(100) NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  token_usage INTEGER DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  quality_score INTEGER DEFAULT 0,
  roi_score DECIMAL(5, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 12: Sovereign Governance (Multi-sig/DAO)
CREATE TABLE IF NOT EXISTS governance_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  proposer_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  manifestation_diff JSONB,
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, executed
  votes_required INTEGER DEFAULT 1,
  votes_current INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 13: Staking & Revenue Share
CREATE TABLE IF NOT EXISTS investment_stakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- Investor
  target_project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  stake_amount DECIMAL(12, 4) NOT NULL,
  equity_share DECIMAL(5, 4) NOT NULL, -- Percentage of future revenue
  status VARCHAR(20) DEFAULT 'active', -- active, closed, liquidated
  total_payouts DECIMAL(12, 4) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 14: Vendor Diplomacy & Negotiations
CREATE TABLE IF NOT EXISTS vendor_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_name VARCHAR(100) NOT NULL,
  api_endpoint TEXT,
  current_plan TEXT,
  usage_stats JSONB DEFAULT '{}',
  last_negotiated_at TIMESTAMPTZ,
  next_audit_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  status VARCHAR(20) DEFAULT 'optimized' -- optimized, at_risk, negotiating
);

-- Phase 16: M&A Brokerage
CREATE TABLE IF NOT EXISTS merger_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  target_project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  compatibility_score INTEGER,
  merger_strategy TEXT,
  estimated_valuation_surge DECIMAL(5, 2),
  status VARCHAR(20) DEFAULT 'proposed', -- proposed, analyzing, executing, completed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 17: Legal IP Vault
CREATE TABLE IF NOT EXISTS legal_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL, -- patent, tos, privacy, license
  document_content TEXT NOT NULL,
  legal_hash TEXT, -- SHA-256 for integrity
  status VARCHAR(20) DEFAULT 'filed', -- drafted, filed, verified
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 18: Trend Scouting & R&D
CREATE TABLE IF NOT EXISTS trend_scouting (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_name VARCHAR(255) NOT NULL,
  category VARCHAR(50), -- framework, library, api, market
  velocity_score INTEGER, -- stars/growth rate
  relevance_to_empire INTEGER, -- 0-100
  last_scouted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Elite Upgrades
CREATE INDEX IF NOT EXISTS idx_agent_perf_org_id ON agent_performance(org_id);
CREATE INDEX IF NOT EXISTS idx_investment_stakes_target ON investment_stakes(target_project_id);
CREATE INDEX IF NOT EXISTS idx_merger_proposals_status ON merger_proposals(status);
CREATE INDEX IF NOT EXISTS idx_legal_vault_project ON legal_vault(project_id);

-- Lifetime licenses tracking
CREATE TABLE IF NOT EXISTS lifetime_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  license_id VARCHAR(50) NOT NULL,
  license_name VARCHAR(255) NOT NULL,
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stripe_session_id TEXT,
  monthly_credits INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, license_id)
);

-- Affiliate program
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  affiliate_code VARCHAR(50) UNIQUE NOT NULL,
  total_earnings DECIMAL(12, 2) DEFAULT 0.00,
  pending_payout DECIMAL(12, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Affiliate commissions
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  referred_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL,
  transaction_amount INTEGER NOT NULL,
  commission_amount INTEGER NOT NULL,
  commission_rate DECIMAL(5, 4) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Marketplace transactions
CREATE TABLE IF NOT EXISTS marketplace_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  seller_org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  transaction_id VARCHAR(255) NOT NULL,
  gross_amount INTEGER NOT NULL,
  commission_amount INTEGER NOT NULL,
  commission_rate DECIMAL(5, 4) NOT NULL,
  seller_amount INTEGER NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RPC function to increment affiliate earnings
CREATE OR REPLACE FUNCTION increment_affiliate_earnings(
  p_affiliate_id UUID,
  p_amount DECIMAL
)
RETURNS VOID AS $
BEGIN
  UPDATE affiliates
  SET 
    total_earnings = total_earnings + p_amount,
    pending_payout = pending_payout + p_amount
  WHERE id = p_affiliate_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to increment org balance (for economy)
CREATE OR REPLACE FUNCTION increment_org_balance(
  org_id UUID,
  amount DECIMAL
)
RETURNS VOID AS $
BEGIN
  UPDATE organizations
  SET credit_balance = credit_balance + amount
  WHERE id = org_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies for billing tables
ALTER TABLE lifetime_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_transactions ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see their own org's data
CREATE POLICY "Users can view own lifetime licenses" ON lifetime_licenses
  FOR SELECT USING (EXISTS (SELECT 1 FROM org_members WHERE org_id = lifetime_licenses.org_id AND user_id = auth.uid()));

CREATE POLICY "Users can view own affiliate data" ON affiliates
  FOR SELECT USING (EXISTS (SELECT 1 FROM org_members WHERE org_id = affiliates.org_id AND user_id = auth.uid()));

CREATE POLICY "Users can view own commissions" ON affiliate_commissions
  FOR SELECT USING (EXISTS (SELECT 1 FROM org_members WHERE org_id = affiliate_commissions.affiliate_org_id AND user_id = auth.uid()));

CREATE POLICY "Users can view own marketplace transactions" ON marketplace_transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM org_members WHERE org_id = marketplace_transactions.buyer_org_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM org_members WHERE org_id = marketplace_transactions.seller_org_id AND user_id = auth.uid())
  );
