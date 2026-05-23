# 🧠 Sovereign Forge OS (v3.0.0)

> One prompt. 25 AI agents. A production SaaS, shipped autonomously.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=flat-square&logo=supabase)](https://supabase.com)
[![Railway](https://img.shields.io/badge/Pipeline-Railway-purple?style=flat-square)](https://railway.app)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com)
[![Stripe](https://img.shields.io/badge/Payments-Stripe-blue?style=flat-square&logo=stripe)](https://stripe.com)

Sovereign Forge OS transforms natural language prompts into autonomous, revenue-generating SaaS products using a swarm of specialized AI agents across a 25-phase pipeline — running on Railway with no timeout ceiling.

---

## Architecture

```text
Vercel (Next.js)              Railway (Node.js)
──────────────────            ──────────────────────────
Auth + credit gate    →  →   25-phase AI pipeline
POST /api/pipeline/start      No timeout ceiling
Returns 202 instantly         Updates Supabase per phase
~200ms response               Runs until complete

              ↕ shared state

        Supabase (PostgreSQL)
        ┌─────────────────────┐
        │ pipeline_jobs       │
        │ pipeline_phases     │
        │ job_results         │
        │ user_credits        │
        └─────────────────────┘
```

**Why Railway?**  
Vercel handles auth and the credit gate, then hands execution to Railway (`/pipeline/execute`). Railway runs the full pipeline asynchronously and updates job state in Supabase.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 App Router, React 19, TypeScript |
| Pipeline Backend | Express on Railway |
| Database | Supabase PostgreSQL |
| Auth | Supabase SSR Auth |
| Payments | Stripe |
| Monitoring | Sentry, PostHog |
| Deployment | Vercel (frontend) + Railway (pipeline backend) |

---

## LLM Provider Chain

Providers are tried in strict fallback order. No other providers are used.

| Priority | Provider | Format | Endpoint |
|---|---|---|---|
| 1 | OpenCode Go | Anthropic-compatible (MiniMax models) | `/zen/go/v1/messages` |
| 2 | OpenCode Zen | OpenAI-compatible | `/zen/v1/chat/completions` |
| 3 | GitHub Models | OpenAI-compatible | `/chat/completions` |
| 4 | Hugging Face | OpenAI-compatible | `/chat/completions` |

Retry logic: `withRetry(..., 2, 500)` per provider before moving to the next provider.

---

## The 25-Phase Sovereign Pipeline

1. spec-analysis
2. market-research
3. user-persona-definition
4. tech-stack-selection
5. database-schema-design
6. api-architecture
7. auth-flow-design
8. pricing-strategy
9. stripe-integration-plan
10. ui-component-plan
11. landing-page-copy
12. dashboard-layout-design
13. core-api-implementation
14. supabase-rls-policies
15. webhook-handler-implementation
16. ai-feature-design
17. prompt-engineering
18. test-plan
19. error-handling-strategy
20. environment-config
21. deployment-pipeline
22. readme-generation
23. codebase-map
24. launch-checklist
25. deliverable-compilation

---

## The Agent Swarm

<!-- TODO: verify from source -->

---

## Credit Economy

- No free tier — credits required before first pipeline run
- 1 pipeline run = 10 credits
- Credits purchased via Stripe checkout
- Balance visible in dashboard
- Atomic credit deduction via Supabase RPC (row-locked, race-condition safe)
- Auto-refund if job creation fails before Railway handoff
- Stripe webhook adds credits idempotently on successful payment

---

## Pipeline Flow

```text
1. User submits product spec on dashboard
2. POST /api/pipeline/start (Vercel)
   → Supabase auth check
   → Atomic credit deduction (Supabase RPC)
   → Job created: status = 'queued'
   → POST fired to Railway /pipeline/execute (fire and forget)
   → 202 + jobId returned

3. Railway receives job
   → status = 'running'
   → Runs all 25 phases sequentially
   → Each phase stores output
   → Updates current_phase in Supabase

4. Final phase writes final output
   → status = 'complete'
```

**Crash recovery:** Completed phases are tracked in job state and used to resume incomplete runs.

---

## Getting Started

### Prerequisites

- Node.js 20+
- Supabase project
- Railway account
- Vercel account
- Stripe account
- OpenCode Go API key

### 1. Clone and install

```bash
git clone https://github.com/eugenemcmillian220-ui/build-money-system.git
cd build-money-system
npm install
cd railway && npm install && cd ..
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

**Environment variables found in source (`process.env.*`):**

```env
ADMIN_API_KEYS
CRON_SECRET
DISCORD_TOKEN
E
GITHUB_ACCESS_TOKEN
GITHUB_MODELS_API_URL
GITHUB_MODELS_TOKENS
GITHUB_TOKEN
HF_API_KEY
HF_API_KEYS
HF_API_URL
HF_TOKEN
HUGGINGFACE_API_URL
HUGGINGFACE_TOKEN
LOG_LEVEL
NEXT_PHASE
NEXT_PUBLIC_SENTRY_DSN
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL
NODE_ENV
OPENCODE_GO_API_KEY
OPENCODE_GO_API_KEYS
OPENCODE_GO_API_URL
OPENCODE_ZEN_API_KEY
OPENCODE_ZEN_API_KEYS
OPENCODE_ZEN_API_URL
OPENCODE_ZEN_EMBED_URL
PORT
RAILWAY_BACKEND_URL
RAILWAY_INTERNAL_SECRET
RAILWAY_PUBLIC_DOMAIN
SKIP_ENV_VALIDATION
SLACK_TOKEN
STRIPE_ACCOUNT_ID
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL
VERCEL_ACCESS_TOKEN
VERCEL_APP_URL
VERCEL_BRANCH_URL
VERCEL_GIT_COMMIT_SHA
VERCEL_TOKEN
VERCEL_URL
WORKER_BASE_URL
WORKER_SHARED_SECRET
```

### 3. Database setup

```bash
npx supabase db push
```

Migrations:

- 001_add_core_tables.sql
- 20260414_phase19_dao.sql
- 20260415_enable_rls_all_tables.sql
- 20260415_full_empire_upgrade.sql
- 20260415_phase10_economy_rpcs.sql
- 20260415_phase19_dao_rpc.sql
- 20260415_rate_limits.sql
- 20260416_phase22_swarm_mesh.sql
- 20260418_security_fixes.sql
- 20260419_phase23_sovereign_pulse.sql
- 20260420_phase25_vector_memory.sql
- 20260422_manifestations_queue.sql
- 20260424000000_opencode_zen.sql
- 20260506_flowforge.sql
- 20260510_marketplace_analytics.sql
- 20260512_missing_rpcs.sql
- 20260519000100_pipeline_jobs_tables.sql
- 20260519000200_user_credits.sql
- 20260519000300_credit_helpers.sql

### 4. Run locally

```bash
npm run dev
cd railway && npm run build && npm start
```

### 5. Deploy

**Vercel**
```bash
vercel --prod
```

**Railway**  
Use `railway/railway.toml` with `buildCommand = "npm install && npm run build"` and `startCommand = "node dist/server.js"`.

---

## Database Schema

### pipeline_jobs
Tracks every pipeline run.

### pipeline_phases
One row per phase output.

### job_results
Final compiled deliverable.

### user_credits
Credit balances and deduction helpers.

---

## Project Structure

```text
src/app/
  api/*
  app/
  auth/
  dashboard/
  flowforge/
  login/
  pricing/
  signup/

src/lib/
  actions/
  agents/
  api/
  flowforge/
  manifest/
  prompts/
  supabase/

railway/
  lib/
  pipeline/
  server.ts
  railway.toml

supabase/migrations/
  *.sql

Root docs/config:
  README.md
  DEPLOYMENT.md
  CODEBASE.md
  package.json
  sentry.client.config.ts
  LICENSE
```

---

## Monitoring

- Sentry (`@sentry/nextjs`, client config stub points to `instrumentation-client.ts`)
- PostHog (`posthog-js` dependency)

---

## Security

- Railway pipeline endpoint checks `Authorization: Bearer ${RAILWAY_INTERNAL_SECRET}`.
- Railway CORS origin is restricted via `VERCEL_APP_URL`.
- Supabase service role key is used server-side.
- No banned providers are used in the runtime provider chain.

---

## License

MIT License.

---

**Sovereign Forge OS v3.0.0** · *From Idea To Revenue. Autonomously.*
