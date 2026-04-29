# Testing the Manifest Pipeline

## Test User Setup
- Test user: `devin-test@example.com` / `TestPassword123!`
- Org ID: `d86eaf2f-8dc0-4607-9fbd-267cb511ff74` (billing_tier: none)
- Credits must be granted before testing manifestation (the intent stage checks credit balance)
- Grant credits via Supabase REST API:
  ```bash
  curl -X PATCH "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/organizations?id=eq.<org_id>" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d '{"credit_balance": 10000}'
  ```
- Admin accounts (`billing_tier: admin_free`) bypass credit checks entirely

## Environment Variables for Local Testing
- `WORKER_SHARED_SECRET=dev-secret-key-12345` must be in `.env.local` for internal worker authentication
- Required secrets: `OPENCODE_ZEN_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

## CSRF Middleware
- Internal worker routes (`/api/manifest/worker`) are excluded from CSRF checks in `middleware.ts`
- These routes use `X-Worker-Secret` header authentication instead of Origin/Referer
- If you add new internal routes, add them to the CSRF exclusion list

## Manifest Stage Progression
Expected stages (in order): `queued` → `intent` → `generate-plan` → `generate-build` → `polish` → `persist` → `complete`

### Timing
- Intent stage: 2-5 min (classifier + scout + architect LLM calls)
- Generate-plan stage: 1-3 min (planSpec LLM call)
- Generate-build stage: 5-15 min (buildFromSpec, the heaviest LLM call — may retry up to 3 times)
- Total end-to-end: 10-25 min depending on LLM provider availability

### Common Failures
- LLM timeout at 120s per model → falls back to next model in chain
- After 3 retries, `buildFromSpec` fails with truncated JSON or timeout error
- Credits are refunded on failure

## Turbopack Compatibility
- Prism.js does NOT work with Turbopack (module evaluation order breaks language extensions)
- Use highlight.js instead — explicit `registerLanguage()` calls have no ordering dependencies
- Always import highlight.js languages individually: `import typescript from 'highlight.js/lib/languages/typescript'`

## Polling / Status API
- Status endpoint: `GET /api/manifest/status?id=<manifestation_id>`
- Frontend polls every 1500ms, max 600 attempts (~15 min ceiling)
- Returns `current_stage`, `logs`, `files`, and project metadata
