# Testing Sovereign Forge OS

## Devin Secrets Needed
- `OPENCODE_ZEN_API_KEY` — OpenCode Zen API key (Go plan). Required for any AI generation testing.

## Local Dev Server
```bash
cd /home/ubuntu/repos/build-money-system
OPENCODE_ZEN_API_KEY="$OPENCODE_ZEN_API_KEY" npm run dev -- -p 3003
```
Server is ready when you see `Ready in Xs`. Health check: `GET /api/health/check` (200 OK).

## Lint & Typecheck
```bash
npx tsc --noEmit        # TypeScript
npx next lint           # ESLint (pre-existing warnings are expected)
```

## API Testing Patterns

All generation endpoints accept `Authorization: Bearer <token>` header. For local testing without Supabase auth, use `Authorization: Bearer test`.

### Single-component generation
```bash
curl -s -X POST http://localhost:3003/api/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"prompt":"a simple counter button"}'
```
Expect: `{"code": "..."}` with real React code. Typically completes in 5-15 seconds.

### Multi-file generation
```bash
curl -s -X POST http://localhost:3003/api/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"prompt":"build a hello world landing page","multiFile":true}'
```
Expect: `{"id": "...", "files": {...}, "description": "..."}` with 5-12 files. Takes 30-120+ seconds depending on API latency.

### Direct API verification
```bash
curl -s -X POST "https://opencode.ai/zen/go/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENCODE_ZEN_API_KEY" \
  -d '{"model":"deepseek-v4-flash","messages":[{"role":"user","content":"Say hello"}],"max_tokens":50}'
```

## OpenCode Zen API Characteristics
- **Chain-of-thought reasoning**: Models return a `reasoning_content` field with extensive internal reasoning before producing actual output. This significantly inflates response time for large-output requests.
- **Latency profile**: Simple prompts ~1-2s, moderate output (4096 tokens) ~45s, large output (8192+ tokens) may exceed 120s.
- **Model fallback**: `aiComplete()` tries models in order (free-tier first, paid-tier fallback). On timeout, retries up to `MAX_TIMEOUT_RETRIES = 2` models before failing.
- **Free-tier models**: deepseek-v4-flash, glm-5, mimo-v2.5, qwen3.5-plus, kimi-k2.5, minimax-m2.5
- **Paid-tier models**: kimi-k2.6, glm-5.1, mimo-v2-pro, mimo-v2-omni, mimo-v2.5-pro, minimax-m2.7, qwen3.6-plus, deepseek-v4-pro

## Testing Multi-file Timeout Behavior
Multi-file generation may time out if the API is slow. To verify the timeout retry logic is working correctly:
1. Check the error message — it should reference a model OTHER than `deepseek-v4-flash` (the 1st model), proving retry happened
2. Total request time should be ~2x the per-model timeout (2 retries), not 14x (all models)
3. Static grep verification of `MAX_TIMEOUT_RETRIES`, `timeoutCount`, cache key consistency

## Admin Credit Bypass
Admin accounts (`admin_free` billing tier) bypass all credit checks. To test credit-related features:
- The admin email is configured in `src/lib/admin-emails.ts`
- 5 credit check points: `/api/generate`, `/api/manifest`, `/lib/manifest/stages.ts`, `/api/ai`, `/api/marketplace/subscribe`
- All check for `ADMIN_FREE_TIER` or `isAdminEmail()` before running credit RPCs

## Common Issues
- **No Supabase configured**: Expected locally. Generation endpoints work without it (no org/user context). Dashboard UI may show errors.
- **Multi-file timeout**: Usually API latency, not a code bug. Verify with direct API call.
- **502 on generation**: Check server logs for the specific error. Common causes: API timeout, missing API key, model not available.
