---
name: testing-manifest-pipeline
description: Test the Sovereign Forge manifest pipeline end-to-end. Use when verifying manifest API, timeout config, or pipeline stage changes.
---

# Testing the Manifest Pipeline

## Prerequisites

### Environment Variables
The app requires these in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project credentials
- `SUPABASE_SERVICE_ROLE_KEY` — for admin operations (jobs.ts uses `supabaseAdmin`)
- At least one AI provider key: `OPENCODE_ZEN_API_KEY`, `GITHUB_TOKEN`, or `HF_TOKEN`

You can retrieve Supabase credentials via the Management API:
```bash
curl -s "https://api.supabase.com/v1/projects/<PROJECT_REF>/api-keys" \
  -H "Authorization: Bearer $SUPABASE_MANAGEMENT_TOKEN"
```

### Devin Secrets Needed
- `SUPABASE_MANAGEMENT_TOKEN` — Supabase Management API token (for querying/creating tables)
- At least one of: `OPENCODE_ZEN_API_KEY`, `GITHUB_TOKEN`, `HF_TOKEN`

## Test User Setup

The app requires authentication. To create/reset a test user password:
```bash
curl -s -X PUT "https://<SUPABASE_URL>/auth/v1/admin/users/<USER_ID>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"password": "TestPassword123!"}'
```

Existing test users can be found via:
```bash
curl -s -X POST "https://api.supabase.com/v1/projects/<PROJECT_REF>/database/query" \
  -H "Authorization: Bearer $SUPABASE_MANAGEMENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT id, email FROM auth.users LIMIT 10;"}'
```

The test user must have an organization. Check with:
```sql
SELECT id, owner_id, billing_tier FROM organizations WHERE owner_id = '<USER_ID>';
```
If no org exists, the dashboard has self-healing that creates one on first load.

## Running the Dev Server

```bash
cd /home/ubuntu/repos/build-money-system
npm install
npm run dev
```

First page load may take 20-30 seconds to compile.

## Testing Flow

### 1. Login
- Navigate to `http://localhost:3000/login`
- The middleware redirects `/dashboard` to `/login` if unauthenticated
- Use password mode (not email code) for test accounts
- After login, you'll be redirected to `/dashboard`

### 2. Dashboard Verification
- Dashboard shows: Neural Credits count, Active Projects, Org Members, Phases Active
- The "Neural Manifestation" section contains the AiTerminal with a prompt input
- System Sovereignty panel shows health status (Neural Link, Sovereign DB, etc.)

### 3. Submitting a Manifest Prompt
- Type a prompt in the AiTerminal input field ("Describe your vision in plain English...")
- Press Enter to submit
- The terminal will show:
  - `Initiating Manifestation: UNIVERSAL | Sovereign-Forge-v1`
  - `Decoding plain English intent...`
  - `Initiating manifestation pipeline...`
  - `Job started: <id>. Awaiting synchronization...`
  - Stage-by-stage progress logs
- On success: Active Projects count increments, project card appears in "Manifested Empires"

### 4. What to Watch For
- **Timeout errors**: Messages like "timed out after Xms" indicate timeout config issues
- **Stage progression**: Pipeline should go through classifier → scout → developer → sentinel stages
- **Credits**: Should show "Reserved N credits for manifestation"
- **500 errors**: Check dev server console for stack traces

## Key Files

| File | Purpose |
|------|--------|
| `src/app/api/manifest/start/route.ts` | Entry point for manifest pipeline |
| `src/app/api/manifest/route.ts` | Main manifest route (maxDuration=280) |
| `src/lib/manifest/stages.ts` | Stage budgets (STAGE_BUDGET_MS, AGENT_CALL_TIMEOUT_MS) |
| `src/lib/pipeline-timeout.ts` | Default pipeline budget (DEFAULT_BUDGET_MS) |
| `src/lib/jobs.ts` | Job tracking service (manifest_jobs table) |
| `src/lib/with-timeout.ts` | Timeout utility with TimeoutError |
| `src/hooks/use-manifestation.ts` | Frontend hook that calls /api/manifest/start and polls status |
| `src/components/dashboard/AiTerminal.tsx` | Terminal UI component |

## Verifying Supabase Schema

```bash
curl -s -X POST "https://api.supabase.com/v1/projects/<PROJECT_REF>/database/query" \
  -H "Authorization: Bearer $SUPABASE_MANAGEMENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '\''manifest_jobs'\'' ORDER BY ordinal_position;"}'
```

Expected: 11 columns (id, user_id, prompt, current_stage, progress, status, state_snapshot, resume_token, error_message, created_at, updated_at).

## TypeScript Verification

```bash
npx tsc --noEmit  # Should exit 0 with no errors
```

## Tips

- The app's first compile after `npm run dev` can take 20-30s per page — be patient
- OpenTelemetry warnings during compilation are expected and harmless
- The Codeac CI check might fail due to their service issues — not a code problem
- Admin emails get force-switched to email code login mode; use non-admin test emails for password login
