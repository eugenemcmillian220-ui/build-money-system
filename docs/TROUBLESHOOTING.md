# Troubleshooting Guide

## 1. Supabase Connection Refused
**Symptom:** `Error: Missing Supabase service role configuration`
**Cause:** `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` not set.
**Fix:** Copy `.env.example` to `.env.local` and fill in your Supabase project URL and service role key from the Supabase Dashboard > Settings > API.
**Prevention:** Run `pnpm typecheck` — the env validator will catch missing vars at startup.

## 2. Stripe Webhook Signature Mismatch
**Symptom:** Webhook returns 400 `Invalid signature`
**Cause:** `STRIPE_WEBHOOK_SECRET` doesn't match the secret in Stripe Dashboard.
**Fix:** Go to Stripe Dashboard > Webhooks > your endpoint > Signing secret. Copy the `whsec_...` value to your env.
**Prevention:** Use `stripe listen --forward-to localhost:3000/api/webhooks/stripe` for local dev.

## 3. Railway Pipeline Timeout
**Symptom:** Pipeline job status stuck at `running` > 2 minutes
**Cause:** Railway service not responding or `RAILWAY_PIPELINE_URL` misconfigured.
**Fix:** Check Railway dashboard for service health. Verify `RAILWAY_PIPELINE_URL` points to the correct Railway service URL.
**Prevention:** The health endpoint `/api/v1/health` checks DB connectivity on every request.

## 4. Environment Variable Missing
**Symptom:** Build fails with `Invalid server environment variables`
**Cause:** A required env var is missing from your deployment.
**Fix:** Compare your deployment env vars against `.env.example`. Add any missing variables.
**Prevention:** The `scripts/check-env-parity.ts` script diffs `.env.example` against Vercel/Railway.

## 5. RLS Policy Blocking Query
**Symptom:** Supabase returns `{}` or empty arrays unexpectedly
**Cause:** Row Level Security policy is filtering out rows for the current user.
**Fix:** Verify the user is authenticated (`supabase.auth.getUser()`). Use the service role client for admin operations.
**Prevention:** Run `supabase/tests/rls.sql` pgTAP tests to verify policies.

## 6. Migration Conflict
**Symptom:** `supabase db push` fails with constraint or duplicate errors
**Cause:** Migration files were applied out of order or partially.
**Fix:** Check `supabase migration list` to see which migrations applied. Use `supabase db reset` in dev to start fresh.
**Prevention:** Never edit existing migration files. Always create new ones.

## 7. Credit Deduction Race Condition
**Symptom:** User's balance goes negative or two jobs start simultaneously
**Cause:** Concurrent requests hitting the credit deduction before the DB updates.
**Fix:** The `deduct_credits_atomic` RPC uses PostgreSQL row-level locking. Ensure you're calling it, not a raw UPDATE.
**Prevention:** All credit operations go through `src/lib/credits.ts` which uses the atomic RPC.

## 8. PostHog Not Tracking Events
**Symptom:** Events don't appear in PostHog dashboard
**Cause:** `NEXT_PUBLIC_POSTHOG_KEY` not set, or ad blocker blocking requests.
**Fix:** Verify `NEXT_PUBLIC_POSTHOG_KEY` is set and starts with `phc_`. Check browser console for PostHog errors.
**Prevention:** PostHog is initialized in `src/components/providers/ph-provider.tsx` — check it's included in the root layout.

## 9. Sentry Not Capturing Errors
**Symptom:** Errors not appearing in Sentry dashboard
**Cause:** `NEXT_PUBLIC_SENTRY_DSN` not set or Sentry not initialized.
**Fix:** Add `NEXT_PUBLIC_SENTRY_DSN` to your env vars. Verify `src/instrumentation.ts` is present.
**Prevention:** Test with `throw new Error('test')` in a route and check Sentry dashboard.

## 10. Build Failing on Type Errors
**Symptom:** `pnpm build` fails with TypeScript errors
**Cause:** Type errors in source files.
**Fix:** Run `SKIP_ENV_VALIDATION=true pnpm typecheck` to see all errors. Fix each one.
**Prevention:** Run `pnpm typecheck` in CI before build (see `.github/workflows/ci.yml`).
