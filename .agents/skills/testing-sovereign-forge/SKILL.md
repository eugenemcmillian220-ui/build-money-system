# Testing Sovereign Forge OS

## Overview
Sovereign Forge OS is a Next.js 15 app that generates full-stack applications using an AI agent swarm powered by OpenCode Zen API.

## Devin Secrets Needed
- `OPENCODE_ZEN_API_KEY` — OpenCode Zen Go plan API key (saved org-wide)

## Dev Server Setup
```bash
cd /home/ubuntu/repos/build-money-system
npm install
OPENCODE_ZEN_API_KEY="$OPENCODE_ZEN_API_KEY" npm run dev -- -p 3003
```
The server takes ~30s to compile (Turbopack). Wait for "Ready" before testing.

## Key Test Endpoints

### Health Check (no auth required)
```bash
curl -s http://localhost:3003/api/health/check | python3 -m json.tool
```
Expect: `checks.llm.pass === true`, `providers.opencodezen === true`

### Single Component Generation
```bash
curl -s -X POST http://localhost:3003/api/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"prompt": "Create a counter component", "mode": "web-component"}'
```
Expect: `{"code": "...React code with useState..."}` — NOT `{"fallback": true}`

### Multi-File Generation (Developer Agent)
```bash
curl -s -X POST http://localhost:3003/api/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"prompt": "Build a todo app", "multiFile": true}'
```
Expect: `{"id": "...", "files": {...}, "description": "..."}` with multiple .tsx files

## CSRF Bypass
The middleware blocks POST requests without an `Origin` header or `Authorization` header. For curl testing, add `-H "Authorization: Bearer test"` to bypass CSRF. The bearer value doesn't need to be a real token — the middleware just checks for the header's presence.

## Auth Limitations
- **Dashboard/Terminal pages** require Supabase auth (`/dashboard/*`, `/app/*`). Without `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, these pages redirect to `/login`.
- **API endpoints** (`/api/generate`, `/api/health/check`) work without Supabase — they only need the OpenCode Zen API key.
- **Landing page** (`/`) is fully public, no auth needed.
- **Pricing page** (`/pricing`) is also public.

## OpenCode Zen API Details
- **Correct endpoint:** `https://opencode.ai/zen/go/v1/chat/completions`
- **NOT** `api.opencodezen.com` (this domain does not exist — if you see it, it's a bug)
- Default model: `deepseek-v4-flash` (free tier)
- Vision model: `mimo-v2-omni` (paid tier)
- All 14 models use the same `/chat/completions` endpoint

## What to Test
1. **Health check** — confirms provider configuration
2. **Single component generation** — proves AI generates real code (not fallback)
3. **Multi-file generation** — exercises the Developer Agent pipeline with multiple LLM calls
4. **CSP headers** — verify `connect-src` includes `https://opencode.ai`
5. **Landing page** — renders without errors

## Common Issues
- Port 3003 might be in use from a previous session. Use `fuser -k 3003/tcp` to free it.
- First request after server start may be slow (~15s) due to route compilation.
- Multi-file generation can take 30-60s depending on API latency.
- Vercel preview deployments might require Vercel login — test locally instead.
- `wmctrl` may not be installed for maximizing browser window. Install with `sudo apt-get install -y wmctrl`.
