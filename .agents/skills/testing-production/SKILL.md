---
name: testing-production
description: Test the Sovereign Forge OS production deployment end-to-end. Use when verifying build fixes, timeout changes, provider naming, or OOM resolutions.
---

# Testing Production Deployment

## Production URL

- **Production:** `https://build-money-system-omd8.vercel.app`
- **NOT** `build-money-system.vercel.app` (returns 404)

## Unauthenticated API Endpoints (testable without login)

| Endpoint | Method | What it checks |
|----------|--------|----------------|
| `/api/health` | GET | Overall health: env, supabase, stripe, ai_providers. Returns `healthy`/`degraded`/`unhealthy`. |
| `/api/health/check` | GET | Detailed checks: environment, database, LLM providers, deployment, integrations. Verifies provider naming (`opencode-zen` not `opencodezen`). |
| `/api/env-check` | GET | Environment variable config status. Verifies `aiProviders["opencode-zen"]` key naming. Never exposes actual key values. |
| `/api/manifest/worker` | POST only | Worker route. GET returns 405. Check response headers — should NOT have `x-edge-runtime` (confirms Node.js serverless). |

## Endpoints Requiring Auth or Disabled in Production

- `/api/status` — requires `requireAuth()` session. Returns 401 without login.
- `/api/e2e-test` — **disabled in production** (`NODE_ENV === 'production'` returns 404). Only works in dev.
- `/api/debug` — **disabled in production**.
- `/api/debug/sentry` — for Sentry error testing.

## Key Pages to Verify

1. `/` — Landing page with hero ("From Idea / To Revenue"), 25-phase ribbon, stats row
2. `/login` — Sign in form (Supabase auth)
3. `/signup` — Create account form
4. `/pricing` — Pricing tiers (Elite Starter $99/mo, Elite Pro $249/mo)
5. `/dashboard` — Requires login

## Provider Naming Verification

The correct provider key is `"opencode-zen"` (with hyphen). The legacy incorrect key was `"opencodezen"` (no hyphen). Check these endpoints to verify:
- `/api/health/check` → `checks.llm.details.providers` should have `"opencode-zen"` key
- `/api/env-check` → `aiProviders` should have `"opencode-zen"` key

## Vercel Build / OOM Notes

- Vercel Hobby plan: 8GB build machine, 60s max for Node.js serverless functions
- `@sentry/nextjs` pulls in `@sentry/node` which bundles OpenTelemetry instrumentations (prisma, redis, mysql2, mongoose, knex, lru-memoizer) — these balloon webpack memory
- `@sentry/nextjs` and `@opentelemetry/api` auto-add to `transpilePackages` and CANNOT be listed in `serverExternalPackages` (causes conflict error)
- Current mitigations: 4096MB Node heap, webpack cache disabled, ESLint/TypeScript skipped during build (run in CI), `@sentry/node`+`@opentelemetry/instrumentation`+`@vercel/otel` externalized
- If build OOMs again, check if new dependencies were added that increase webpack bundle size

## Timeout Architecture

- All LLM timeouts must be >= 55,000ms (55 seconds)
- Key files: `src/lib/llm.ts`, `src/lib/agents/developer.ts`, `src/lib/manifest/stages.ts`, `src/lib/pipeline-timeout.ts`, `src/lib/types.ts`
- Worker route: `src/app/api/manifest/worker/route.ts` — must use `maxDuration = 55` (NOT edge runtime)
- Vercel Hobby Node.js serverless cap: 60s. Budget is 55s with 5s headroom.

## Devin Secrets Needed

- `VERCEL_TOKEN` — for checking deployment status via Vercel API
- No auth secrets needed for the unauthenticated API endpoint tests listed above
- For authenticated endpoint testing, would need a valid Supabase user session
