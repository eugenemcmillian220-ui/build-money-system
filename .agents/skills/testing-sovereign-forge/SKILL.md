# Testing Sovereign Forge OS

## Devin Secrets Needed
- `OPENCODE_ZEN_API_KEY` — Required for AI generation testing. Saved at org scope.

## Dev Server Setup
```bash
cd /home/ubuntu/repos/build-money-system
fuser -k 3003/tcp 2>/dev/null  # kill any leftover process
OPENCODE_ZEN_API_KEY="$OPENCODE_ZEN_API_KEY" npm run dev -- -p 3003
```

Health check:
```bash
curl -s http://localhost:3003/api/health/check | python3 -m json.tool
```
Expect `"llm": {"pass": true}` and `"opencodezen": true`.

## API Testing

### CSRF Bypass
The middleware blocks POST requests without proper origin headers. Add `Authorization: Bearer test` to bypass:
```bash
curl -s -X POST http://localhost:3003/api/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"prompt":"create a button component"}'
```

### Single Component Generation
```bash
curl -s -X POST http://localhost:3003/api/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"prompt":"create a counter button"}'
```
Expect: `{"code": "...real React code..."}` (HTTP 200)

### Multi-file Generation
```bash
curl -s -X POST http://localhost:3003/api/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"prompt":"build a todo app","multiFile":true}'
```
Expect: `{"files": [...], "description": "..."}` (HTTP 200)

**Note:** Multi-file generation may time out (502) with the free-tier LLM models. This is an LLM pipeline timeout, not a code issue. Use simpler prompts or retry.

### With orgId (requires Supabase)
Adding `"orgId": "<uuid>"` to the request triggers credit checks. Without Supabase configured locally, this will return HTTP 500 (supabaseAdmin is null in dev). This is expected behavior.

## Credit System Architecture

There are 5 credit check points in the codebase:
1. `/api/generate` — `reserve_credits` RPC + `decrement_org_balance`
2. `/api/manifest` — `credit_balance` DB check + `decrement_org_balance`
3. `/lib/manifest/stages.ts` — `reserve_credits` in async pipeline
4. `/api/ai` — `profiles.credits` check + `deduct_credits` RPC
5. `/api/marketplace/subscribe` — `agentEconomy.getBalance` + `recordTransaction`

Admin accounts (`admin_free` billing tier) bypass all credit checks. The bypass is detected via:
- Org-level: `billing_tier === ADMIN_FREE_TIER` from the `organizations` table
- User-level: `isAdminEmail(user.email)` from `admin-emails.ts`

## Admin Emails
Admin emails are defined in `src/lib/admin-emails.ts`. Admin accounts:
- Get `admin_free` billing tier
- Get 9,999,999 credit balance (fallback)
- Show "∞" credits in UI
- Bypass all credit checks/deductions
- Use OTP auth (no password)

## Testing Without Supabase
Locally without Supabase environment variables:
- `supabaseAdmin` is null (returns null gracefully in dev, crashes in production)
- Any API call with `orgId` will fail with 500
- API calls without `orgId` work fine for testing AI generation
- Dashboard pages require Supabase auth and won't work locally

## Common Issues
- **Port already in use**: Run `fuser -k 3003/tcp` before starting dev server
- **Empty response from API**: Usually means an uncaught exception — check server console logs
- **502 timeout on multi-file**: LLM pipeline timeout, not a credit issue. Use simpler prompts or retry
- **403 Forbidden on POST**: Missing `Authorization: Bearer test` header (CSRF protection)
- **Vercel preview needs login**: Preview deployments may be protected by Vercel authentication
