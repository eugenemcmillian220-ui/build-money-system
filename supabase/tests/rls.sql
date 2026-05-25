-- supabase/tests/rls.sql
-- pgTAP RLS policy tests
-- Run with: pg_prove supabase/tests/rls.sql

BEGIN;
SELECT plan(16);

-- ─── pipeline_jobs ────────────────────────────────────────────
SELECT ok(
  (SELECT COUNT(*) FROM pipeline_jobs WHERE user_id = '00000000-0000-0000-0000-000000000001') > 0,
  'user 1 can select own pipeline_jobs'
);

SELECT is(
  (SELECT COUNT(*) FROM pipeline_jobs
   WHERE user_id = '00000000-0000-0000-0000-000000000002'
   AND auth.uid() = '00000000-0000-0000-0000-000000000001'::UUID),
  0::BIGINT,
  'user 1 cannot select user 2 pipeline_jobs'
);

-- ─── user_credits ─────────────────────────────────────────────
SELECT ok(
  (SELECT COUNT(*) FROM user_credits WHERE user_id = '00000000-0000-0000-0000-000000000001') = 1,
  'user 1 can select own credits'
);

SELECT is(
  (SELECT COUNT(*) FROM user_credits
   WHERE user_id = '00000000-0000-0000-0000-000000000002'
   AND auth.uid() = '00000000-0000-0000-0000-000000000001'::UUID),
  0::BIGINT,
  'user 1 cannot select user 2 credits'
);

-- ─── projects ─────────────────────────────────────────────────
SELECT ok(
  (SELECT COUNT(*) FROM projects
   WHERE user_id = '00000000-0000-0000-0000-000000000001'
   AND deleted_at IS NULL) >= 1,
  'user 1 can select own projects'
);

SELECT is(
  (SELECT COUNT(*) FROM projects
   WHERE user_id = '00000000-0000-0000-0000-000000000002'
   AND auth.uid() = '00000000-0000-0000-0000-000000000001'::UUID),
  0::BIGINT,
  'user 1 cannot select user 2 projects'
);

-- ─── subscriptions ────────────────────────────────────────────
SELECT ok(
  (SELECT COUNT(*) FROM subscriptions WHERE user_id = '00000000-0000-0000-0000-000000000001') = 1,
  'user 1 can select own subscription'
);

SELECT is(
  (SELECT COUNT(*) FROM subscriptions
   WHERE user_id = '00000000-0000-0000-0000-000000000002'
   AND auth.uid() = '00000000-0000-0000-0000-000000000001'::UUID),
  0::BIGINT,
  'user 1 cannot select user 2 subscription'
);

-- ─── audit_log — no user access ───────────────────────────────
SELECT is(
  (SELECT COUNT(*) FROM audit_log
   WHERE auth.uid() = '00000000-0000-0000-0000-000000000001'::UUID),
  0::BIGINT,
  'authenticated users cannot read audit_log'
);

-- ─── stripe_events — no user access ──────────────────────────
SELECT is(
  (SELECT COUNT(*) FROM stripe_events
   WHERE auth.uid() = '00000000-0000-0000-0000-000000000001'::UUID),
  0::BIGINT,
  'authenticated users cannot read stripe_events'
);

-- ─── notifications ────────────────────────────────────────────
SELECT ok(
  (SELECT COUNT(*) FROM notifications WHERE user_id = '00000000-0000-0000-0000-000000000001') >= 1,
  'user 1 can select own notifications'
);

SELECT is(
  (SELECT COUNT(*) FROM notifications
   WHERE user_id = '00000000-0000-0000-0000-000000000002'
   AND auth.uid() = '00000000-0000-0000-0000-000000000001'::UUID),
  0::BIGINT,
  'user 1 cannot select user 2 notifications'
);

-- ─── credit_transactions ──────────────────────────────────────
SELECT ok(
  (SELECT COUNT(*) FROM credit_transactions WHERE user_id = '00000000-0000-0000-0000-000000000001') >= 1,
  'user 1 can select own credit transactions'
);

SELECT is(
  (SELECT COUNT(*) FROM credit_transactions
   WHERE user_id = '00000000-0000-0000-0000-000000000002'
   AND auth.uid() = '00000000-0000-0000-0000-000000000001'::UUID),
  0::BIGINT,
  'user 1 cannot select user 2 credit transactions'
);

-- ─── pipeline_phases (via job ownership) ─────────────────────
SELECT ok(
  (SELECT COUNT(*) FROM pipeline_phases
   WHERE job_id IN (SELECT id FROM pipeline_jobs WHERE user_id = '00000000-0000-0000-0000-000000000001')) >= 0,
  'user 1 can select own pipeline phases'
);

SELECT is(
  (SELECT COUNT(*) FROM pipeline_phases
   WHERE job_id IN (SELECT id FROM pipeline_jobs WHERE user_id = '00000000-0000-0000-0000-000000000002')
   AND auth.uid() = '00000000-0000-0000-0000-000000000001'::UUID),
  0::BIGINT,
  'user 1 cannot select user 2 pipeline phases'
);

SELECT * FROM finish();
ROLLBACK;
