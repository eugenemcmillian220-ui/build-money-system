---
name: testing-deployment-health
description: Test deployment health, API endpoint correctness, and infrastructure readiness. Use when verifying build fixes, provider migrations, Supabase RPC availability, or Vercel env vars.
---

# Testing Deployment Health & Infrastructure

## Overview

This skill covers verifying that the app builds, deploys, and returns correct responses from health/status endpoints. Useful after fixing build errors, migrating provider names, adding SQL functions, or updating environment variables.

## Key Endpoints (No Auth Required)

| Endpoint | What It Proves |
|---|---|
| `/api/health/check` | Environment vars configured, DB connected, LLM providers listed by name, integrations status |
| `/api/env-check` | AI provider key format and count, Supabase config, deployment config, public env vars |

`/api/status` requires authentication (calls `requireAuth()`).

## Production URL

The production domain is: `https://build-money-system-omd8.vercel.app`

Vercel preview deployments return **401** via curl (password-protected). Test against production or local dev server instead.

## Testing Provider Name Changes

The app uses a `ProviderName` type defined in `src/lib/key-manager.ts`. When provider names change, multiple files reference them:
- `src/app/api/health/check/route.ts` — provider array in `checkLLM()`
- `src/app/api/env-check/route.ts` — `aiProviders` object keys
- `src/app/api/status/route.ts` — `keyManager.isConfigured()` calls
- `src/app/api/e2e-test/route.ts` — provider checks
- `demo-key-rotation.ts` — demo script references

**How to verify**: Compare the `/api/health/check` response's `checks.llm.details.providers` keys against the `ProviderName` type. Old names in the response mean old code is still deployed.

## Verifying Supabase RPC Functions

Query via Management API:
```bash
curl -s -X POST "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF/database/query" \
  -H "Authorization: Bearer $SUPABASE_MANAGEMENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT routine_name FROM information_schema.routines WHERE routine_schema = '\''public'\'' AND routine_name IN ('\''function1'\'',...) ORDER BY routine_name;"}'
```

The Supabase project ref is `rgvjijiafpimfqbbyqtt`.

## Verifying Vercel Deployment Status

```bash
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v6/deployments?projectId=$VERCEL_PROJECT_ID&limit=1" | python3 -m json.tool
```

Check `state` field: `READY` = success, `ERROR` = build failure, `BUILDING` = in progress.

## Build Verification

- `npm run typecheck` (`tsc --noEmit`) is the lightweight way to verify TypeScript compilation.
- `npm run build` (`next build`) may OOM on memory-constrained VMs during the bundling phase. If typecheck passes and Vercel deployment succeeds, the build is valid.
- `npm run lint` checks ESLint rules.

## Devin Secrets Needed

- `VERCEL_TOKEN` — Vercel API token for deployment status checks
- `VERCEL_PROJECT_ID` — Vercel project ID (currently `prj_cUqg5mDxpRUHAMnAnQQ5ktBYSqwE`)
- `SUPABASE_MANAGEMENT_TOKEN` — Supabase Management API token for RPC verification
