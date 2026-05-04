---
name: testing-ai-pipeline
description: Test the multi-provider AI pipeline (OpenCode Zen, GitHub Models, Hugging Face) end-to-end. Use when verifying AI generation, provider rotation, or credential validity.
---

# Testing the AI Pipeline

## Architecture Overview

The app uses three AI providers with smart rotation:
- **OpenCode Zen** — endpoint: `https://opencode.ai/zen/go/v1/chat/completions`
- **GitHub Models** — endpoint: `https://models.github.ai/inference/chat/completions`
- **Hugging Face** — endpoint: `https://router.huggingface.co/v1/chat/completions`

Core rotation logic is in `src/lib/ai.ts` (`aiComplete` function). It scores providers by latency, penalizes recent failures for 2 min, and tries up to 6 attempts across providers/models.

## Devin Secrets Needed

- `GITHUB_TOKEN` — GitHub PAT with `models:read` scope
- `HF_TOKEN` — Hugging Face access token
- `OPENCODE_ZEN_API_KEY` — OpenCode Zen API key

## Key API Endpoints

| Endpoint | Auth Required | Returns Provider Info | Best For |
|----------|--------------|----------------------|----------|
| `GET /api/health` | No | Provider count only | Verify providers are configured |
| `POST /api/generate` | No (skip `orgId` to bypass credits) | No | Test integrated pipeline |
| `POST /api/ai` | Yes (Supabase session) | Yes (`provider` field) | Test with specific provider observability |
| `POST /api/generate-advanced` | No | No | Test advanced agent pipeline |

## Testing Procedure

### Phase 1: Shell Tests (No Auth)

#### Step 1: Health Check
```bash
curl -s https://<PRODUCTION_URL>/api/health | python3 -m json.tool
```
Expect: `"ai_providers": {"ok": true, "message": "3 provider(s) active"}`

#### Step 2: Direct Provider Tests (verify each credential works)

**GitHub Models:**
```bash
curl -s -X POST "https://models.github.ai/inference/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -d '{"model":"openai/gpt-4.1-nano","messages":[{"role":"user","content":"Say hello"}],"max_tokens":50}'
```

**Hugging Face:**
```bash
curl -s -X POST "https://router.huggingface.co/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${HF_TOKEN}" \
  -d '{"model":"Qwen/Qwen2.5-72B-Instruct","messages":[{"role":"user","content":"Say hello"}],"max_tokens":50}'
```

**OpenCode Zen:**
```bash
curl -s -X POST "https://opencode.ai/zen/go/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${OPENCODE_ZEN_API_KEY}" \
  -d '{"model":"deepseek-v4-flash","messages":[{"role":"user","content":"Say hello"}],"max_tokens":50}'
```

#### Step 3: Integrated Pipeline Test
```bash
curl -s -X POST "https://<PRODUCTION_URL>/api/generate" \
  -H "Content-Type: application/json" \
  -H "Origin: https://<PRODUCTION_URL>" \
  -d '{"prompt":"A simple button component","multiFile":false,"stream":false}'
```
Expect: `{"code": "...real React component..."}` (NOT `{"fallback": true}`)

### Phase 2: Browser UI Smoke Test
1. Navigate to production URL — landing page should render with "Sovereign Forge" branding
2. Navigate to `/login` — login form with Password/Email Code toggle
3. Navigate to `/dashboard` — should redirect to `/login?redirectTo=%2Fdashboard`

### Phase 3: Auth-Gated Dashboard Tests (Admin Login Required)

#### Admin Login
- Admin emails are in `src/lib/admin-emails.ts` (e.g., `eugenemcmillian9@gmail.com`)
- Admin accounts are **forced to use Email Code (OTP)** — password login is disabled
- The login page auto-detects admin emails and switches to OTP mode
- After entering the admin email, click "SEND CODE" — a 6-digit OTP is emailed
- You will need the user to provide the OTP code from their inbox

#### Test /api/ai with Provider Observability
Once logged in, open the browser DevTools Console (F12 → Console) and run:
```javascript
fetch('/api/ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Say hello in 5 words' }],
    maxTokens: 50,
    temperature: 0.3
  })
}).then(r => r.json()).then(d => console.log('RESULT:', JSON.stringify(d)));
```
Expect response with `provider` field (e.g., `"provider": "github"`).

#### Test Neural Terminal (Manifest Command)
Navigate to `/dashboard/terminal` and run:
```
manifest Build a simple landing page with a hero section
```
The pipeline will progress through multiple AI-powered stages:
1. Classifying intent
2. Scouting strategy & market analysis
3. Designing architecture
4. Planning outline
5. Detailing components
6. Drafting architecture
7. Generating code

Each stage makes AI calls through the multi-provider rotation.

## Known Issues & Workarounds

- **HF model availability:** Some HF models (e.g., `google/gemma-2-2b-it`) may return "model not supported". The failover logic handles this, but for direct testing use `Qwen/Qwen2.5-72B-Instruct` or `meta-llama/Llama-3.1-8B-Instruct` which are more reliably available.
- **Admin OTP-only login:** Admin accounts cannot use password login — the page forces OTP mode. You must ask the user for the 6-digit code from their email. Non-admin accounts can use password login.
- **CSRF on API calls:** POST requests to production API endpoints need an `Origin` header matching the production URL, OR an `Authorization` header, to pass CSRF middleware.
- **Env vars in shell:** The `.env.local` file credentials are NOT auto-loaded into the shell. Run `set -a && source .env.local && set +a` before curl testing.
- **Provider field visibility:** Only `/api/ai` returns which provider handled a request. `/api/generate` just returns the generated code without provider info.
- **Latency-based rotation:** The smart rotation selects the fastest provider, so consecutive calls may use the same provider. This is expected behavior, not a rotation failure.
- **Manifest pipeline timeout:** Complex manifest generations (especially the "DRAFTING ARCHITECTURE" stage) may stall due to the 60s per-call timeout. The pipeline retries via failover, but very large generations may exceed all retry attempts. This is a pre-existing pipeline behavior.
- **Incorrect admin email:** The email `eugenemcmillia9@gmail.com` (missing 'n') is NOT a valid account. The correct admin email is `eugenemcmillian9@gmail.com`.
