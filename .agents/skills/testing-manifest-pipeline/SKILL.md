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
Note: Port 3000 may be in use — check the dev server output for the actual port (e.g., 3001).

## Provider Architecture

The AI provider system uses three OpenCode Zen tiers:
- `opencodezen` — free tier, uses `/chat/completions` (openai format)
- `opencodezen_go_openai` — Go tier, uses `/chat/completions` (openai format) for most models (GLM-5, Kimi K2.5/K2.6, DeepSeek V4, MiMo V2.5, Qwen3.5+, etc.)
- `opencodezen_go_anthropic` — Go tier, uses `/messages` (anthropic format) for MiniMax M2.5 and M2.7 ONLY

All three tiers share the same `OPENCODE_ZEN_API_KEY`. The provider config lives in `src/lib/providers.ts` (single source of truth) and is consumed by `src/lib/ai.ts` and `src/lib/llm-router.ts`.

API model IDs are bare (e.g., `kimi-k2.5`, not `opencode-go/kimi-k2.5`). The `opencode-go/` prefix is TUI config only.

### Verifying Provider Registry

The `/api/health/check` endpoint reports all configured providers under `checks.llm.details.providers`. Use this to verify provider changes without needing AI keys:
```bash
curl -s http://localhost:3001/api/health/check | python3 -m json.tool
```

Expected output should show all three Zen provider entries:
```json
"providers": {
    "opencodezen": false,
    "opencodezen_go_openai": false,
    "opencodezen_go_anthropic": false
}
```

If any old provider names appear (e.g., `opencodezen_go` without suffix), the split was not applied correctly.

### Stage-to-Model Assignments

The `STAGE_MODEL_MAP` in `src/lib/providers.ts` assigns specific providers and models to pipeline stages:
- `detailing-components` / `planSpecDetails` → `opencodezen_go_openai` / `kimi-k2.5`
- `codegen` → `opencodezen_go_openai` / `deepseek-v4-pro`
- `quick` → `opencodezen_go_openai` / `deepseek-v4-flash`
- `outline` / `default` → `opencodezen` / `big-pickle` (free)

## Testing Flow

### 1. Login
- Navigate to `http://localhost:3000/login` (or actual port from dev server output)
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
2. Check the dev server console for `pipeline-timeout.ts` log lines
3. The timeout values are in `src/lib/pipeline-timeout.ts`

## Testing Without AI Keys

If no `OPENCODE_ZEN_API_KEY` is available, you can still verify:
1. **Provider registry**: Hit `/api/health/check` and confirm all expected provider entries exist
2. **App integrity**: Load FlowForge pages (no secrets needed — they use mock data)
3. **Code correctness**: Run `npx tsc --noEmit` and `npx next lint` to verify no type or lint errors
4. **Cost table**: Check `src/lib/economy.ts` has entries for all models in `src/lib/providers.ts`

For full end-to-end testing of LLM calls, you need `OPENCODE_ZEN_API_KEY` set in `.env.local`.
