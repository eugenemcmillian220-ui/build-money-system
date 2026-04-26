# Testing Sovereign Forge OS

## Overview
Sovereign Forge OS is a Next.js 15 autonomous SaaS-building platform that uses OpenCode Zen as its exclusive AI provider. Testing involves verifying AI provider configuration, UI rendering, and build integrity.

## Devin Secrets Needed
- `OPENCODE_ZEN_API_KEY` — Required for end-to-end AI generation testing. Without it, you can still verify configuration plumbing but cannot test actual LLM calls.
- Vercel deployment protection bypass token (optional) — needed if testing the Vercel preview deployment directly.

## Local Dev Server Setup

```bash
cd /home/ubuntu/repos/build-money-system
npm install
SKIP_ENV_VALIDATION=true OPENCODE_ZEN_API_KEY=$OPENCODE_ZEN_API_KEY npx next dev -p 3001
```

- `SKIP_ENV_VALIDATION=true` is required when Supabase credentials are not available
- The server takes ~15 seconds to start due to OpenTelemetry/Sentry instrumentation compilation warnings (these are normal)
- If port is in use, kill existing processes: `ps aux | grep next | grep -v grep | awk '{print $2}' | xargs -r kill -9`
- Use `lsof` alternative if not available: `fuser -k PORT/tcp`

## Key Test Endpoints

### Health Check
```bash
curl -s http://localhost:3001/api/health/check | python3 -m json.tool
```
**Expected with key:** `"providers":{"opencodezen":true}`, `"count":1`, `"multiKeyRotation":true`
**Expected without key:** `"providers":{"opencodezen":false}`, message says "Set OPENCODE_ZEN_API_KEY"

### Environment Check
```bash
curl -s http://localhost:3001/api/env-check | python3 -m json.tool
```
**Expected with key:** `"configured":true`, `"keyCount":1`, `"ready":true`
**Expected with multi-keys (OPENCODE_ZEN_API_KEYS=k1,k2,k3):** `"keyCount":3`

### Status Endpoint
```bash
curl -s http://localhost:3001/api/status
```
May require Supabase auth — expect 401 without credentials.

## UI Pages (No Auth Required)
- `/` — Landing page ("Sovereign Forge OS", "From Idea To Revenue")
- `/pricing` — Pricing page with 3 tiers (Elite Starter $99, Elite Pro $249, Elite Enterprise $999)
- `/login` — Login page
- `/signup` — Signup page

## UI Pages (Auth Required)
- `/dashboard/*` — All dashboard routes require Supabase auth
- `/app` — App builder interface

## Build & Type Checks
```bash
SKIP_ENV_VALIDATION=true npx tsc --noEmit    # TypeScript check
npx next lint                                 # ESLint check
```

## AI Provider Configuration
- **Provider:** OpenCode Zen (exclusive)
- **API endpoint:** `https://api.opencodezen.com/v1/chat/completions`
- **Embedding endpoint:** `https://api.opencodezen.com/v1/embeddings`
- **Free-tier models (6):** deepseek-v4-flash, glm-5, mimo-v2.5, qwen3.5-plus, kimi-k2.5, minimax-m2.5
- **Paid-tier models (8):** kimi-k2.6, glm-5.1, mimo-v2-pro, mimo-v2-omni, mimo-v2.5-pro, minimax-m2.7, qwen3.6-plus, deepseek-v4-pro
- **Default model:** `deepseek-v4-flash`
- **Vision model:** `mimo-v2-omni`
- Model names are in `src/lib/ai.ts` (ZEN_FREE_MODELS and ZEN_PAID_MODELS arrays)

## Verifying No Old Provider References
After any provider changes, grep for old patterns to ensure clean removal:
```bash
for pattern in openrouter GROQ_API GEMINI_API DEEPSEEK_API gpt-5-nano gpt-5-mini gpt-4o-zen gpt-5-ultra; do
  echo "$pattern: $(grep -r \"$pattern\" src/ --include='*.ts' --include='*.tsx' | wc -l)"
done
```
All should return 0.

## Key Files
- `src/lib/ai.ts` — Core AI completion engine, model arrays, API calls
- `src/lib/key-manager.ts` — Multi-key rotation with error tracking and cooldown
- `src/lib/llm-router.ts` — Model failover routing
- `src/lib/env.ts` — Environment variable validation (Zod schema)
- `src/lib/stripe-config.ts` — Stripe pricing configuration
- `src/app/api/health/check/route.ts` — Health check endpoint
- `src/app/api/env-check/route.ts` — Environment configuration endpoint

## Known Issues
- Vercel preview deployments might be auth-protected (returns 401). Use local dev server for testing.
- `lsof` command may not be available on the VM — use `fuser` instead.
- First page load on dev server can be slow (~15-30s) due to compilation.
- The app uses client-side routing, so browser navigation between pages might show stale content briefly during dev mode compilation.
