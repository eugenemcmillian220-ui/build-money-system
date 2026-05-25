-- supabase/seed.sql
-- Realistic seed data for development and CI
-- Run after migrations: psql $DATABASE_URL -f supabase/seed.sql
-- NOTE: auth.users must be created via Supabase Auth API in tests.
-- These UUIDs match test fixtures in the test suite.

-- ─── Organizations ────────────────────────────────────────────
INSERT INTO organizations (id, name, slug, owner_id, plan_tier)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Acme Corp', 'acme-corp', '00000000-0000-0000-0000-000000000001', 'pro'),
  ('a0000000-0000-0000-0000-000000000002', 'Beta Labs', 'beta-labs', '00000000-0000-0000-0000-000000000002', 'starter')
ON CONFLICT (id) DO NOTHING;

-- ─── User Credits ─────────────────────────────────────────────
INSERT INTO user_credits (user_id, balance, lifetime_used)
VALUES
  ('00000000-0000-0000-0000-000000000001', 100, 50),
  ('00000000-0000-0000-0000-000000000002', 25, 10),
  ('00000000-0000-0000-0000-000000000003', 0, 0)
ON CONFLICT (user_id) DO NOTHING;

-- ─── Subscriptions ────────────────────────────────────────────
INSERT INTO subscriptions (user_id, stripe_customer_id, plan_tier, status, current_period_end)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'cus_test001', 'pro', 'active', NOW() + INTERVAL '30 days'),
  ('00000000-0000-0000-0000-000000000002', 'cus_test002', 'starter', 'active', NOW() + INTERVAL '15 days'),
  ('00000000-0000-0000-0000-000000000003', 'cus_test003', 'free', 'active', NULL)
ON CONFLICT DO NOTHING;

-- ─── Projects ─────────────────────────────────────────────────
INSERT INTO projects (id, user_id, name, description, spec, status)
VALUES
  (
    'b0000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'TaskFlow AI',
    'AI-powered task management SaaS for remote teams',
    '{"name":"TaskFlow AI","targetUser":"remote team leads","revenueModel":"subscription"}',
    'complete'
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'InvoiceBot Pro',
    'Automated invoicing and payment collection for freelancers',
    '{"name":"InvoiceBot Pro","targetUser":"freelancers","revenueModel":"credits"}',
    'building'
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000002',
    'ContentForge',
    'AI content generation platform for marketing agencies',
    '{"name":"ContentForge","targetUser":"marketing agencies","revenueModel":"hybrid"}',
    'draft'
  )
ON CONFLICT (id) DO NOTHING;

-- ─── Pipeline Jobs ────────────────────────────────────────────
INSERT INTO pipeline_jobs (id, user_id, project_id, spec, status, current_phase, completed_phases)
VALUES
  (
    'c0000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    '{"name":"TaskFlow AI","targetUser":"remote team leads","revenueModel":"subscription"}',
    'complete',
    24,
    ARRAY[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    '{"name":"InvoiceBot Pro","targetUser":"freelancers","revenueModel":"credits"}',
    'running',
    7,
    ARRAY[0,1,2,3,4,5,6]
  )
ON CONFLICT (id) DO NOTHING;

-- ─── Credit Transactions ──────────────────────────────────────
INSERT INTO credit_transactions (user_id, amount, balance_after, description, job_id)
VALUES
  ('00000000-0000-0000-0000-000000000001', 100, 100, 'Initial credit purchase', NULL),
  ('00000000-0000-0000-0000-000000000001', -10, 90, 'Pipeline run: TaskFlow AI', 'c0000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000001', 50, 140, 'Credit top-up', NULL),
  ('00000000-0000-0000-0000-000000000001', -10, 130, 'Pipeline run: InvoiceBot Pro', 'c0000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

-- ─── Notifications ────────────────────────────────────────────
INSERT INTO notifications (user_id, type, title, body, action_url)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'pipeline_complete', 'TaskFlow AI is ready', 'Your 25-phase pipeline completed successfully. Download your deliverables.', '/dashboard/projects/b0000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000001', 'credits_low', 'Credits running low', 'You have 130 credits remaining. Top up to keep building.', '/dashboard/billing')
ON CONFLICT DO NOTHING;
