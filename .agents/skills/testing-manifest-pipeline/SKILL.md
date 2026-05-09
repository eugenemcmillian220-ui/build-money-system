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

### Non-Admin Test Users
For non-admin testing with password login, create/reset a test user password:
```bash
curl -s -X PUT "https://<SUPABASE_URL>/auth/v1/admin/users/<USER_ID>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"password": "TestPassword123!"}'
```

### Admin Test Users (OTP Required)
Emails listed in `src/lib/admin-emails.ts` are forced into OTP-only login mode — password login is disabled. When you enter an admin email on the login page, it auto-switches to "EMAIL CODE" mode with the message: "Admin account detected — every sign-in requires a fresh 6-digit verification code emailed to you."

**To test with an admin account:**
1. Enter the admin email on the login page
2. Click "SEND VERIFICATION CODE"
3. Ask the user for the 6-digit OTP code from their email
4. Enter the code and click "VERIFY & SIGN IN"

**Admin-specific behaviors to verify:**
- Dashboard shows "ADMIN · FREE" badge and "SOVEREIGN TIER: ADMIN (FREE, UNLIMITED)"
- Neural Credits shows ∞ (unlimited)
- During manifest pipeline, terminal shows: "Admin account — credit reservation skipped."

### Finding Existing Users
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
- Non-admin accounts: use password mode
- Admin accounts (in `src/lib/admin-emails.ts`): forced to OTP mode, need user to provide code
- After login, you'll be redirected to `/dashboard`

### 2. Dashboard Verification
- Dashboard shows: Neural Credits count (or ∞ for admin), Active Projects, Org Members, Phases Active
- The "Neural Manifestation" section contains the AiTerminal with a prompt input
- System Sovereignty panel shows health status (Neural Link, Sovereign DB, etc.)
- CEO Strategic Briefing appears with empire health analysis

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
- **Timeout errors**: Messages like "timed out after Xms" indicate timeout config values
  - `AGENT_CALL_TIMEOUT_MS` can be verified from scout agent timeout messages (e.g., "runScoutAgent timed out after 55000ms")
  - The scout agent may time out on LLM calls; this is expected and the pipeline uses a fallback strategy
- **Stage progression**: Pipeline goes through: classifier → scout → architect → outline → detail → generate → fix passes → build → polish → persist
- **Credits**: Non-admin shows "Reserved N credits for manifestation"; admin shows "Admin account — credit reservation skipped"
- **500 errors**: Check dev server console for stack traces
- **Full pipeline completion**: Terminal shows "Manifestation complete. Empire initialized in database." and a project card appears

## Verifying Timeout Configuration

To confirm timeout changes are active:
1. Submit a prompt and watch for the scout agent timeout message
2. The timeout value in the message should match `AGENT_CALL_TIMEOUT_MS` in `src/lib/manifest/stages.ts`
3. Example: "Scout agent failed (runScoutAgent timed out after 55000ms)" confirms `AGENT_CALL_TIMEOUT_MS = 55_000`
4. The pipeline should recover gracefully using a fallback strategy

## Key Files

| File | Purpose |
|------|--------|
| `src/app/api/manifest/start/route.ts` | Entry point for manifest pipeline |
| `src/app/api/manifest/route.ts` | Main manifest route (maxDuration=280) |
| `src/lib/manifest/stages.ts` | Stage budgets (STAGE_BUDGET_MS, AGENT_CALL_TIMEOUT_MS) |
| `src/lib/pipeline-timeout.ts` | Default pipeline budget (DEFAULT_BUDGET_MS) |
| `src/lib/jobs.ts` | Job tracking service (manifest_jobs table) |
| `src/lib/with-timeout.ts` | Timeout utility with TimeoutError |
| `src/lib/admin-emails.ts` | Admin email list (forces OTP login) |
| `src/hooks/use-manifestation.ts` | Frontend hook that calls /api/manifest/start and polls status |
| `src/components/dashboard/AiTerminal.tsx` | Terminal UI component |
| `src/components/dashboard/ManifestWorkspace.tsx` | Workspace with code panel |

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
- To log out, click the LOGOUT link at the bottom of the left sidebar
- When switching accounts, log out first then navigate to `/login`
- The pipeline typically completes in 1-2 minutes locally for simple prompts
- Admin accounts have unlimited credits and skip credit reservation
