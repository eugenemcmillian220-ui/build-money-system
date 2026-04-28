# Testing build-money-system Locally

## Devin Secrets Needed
- `OPENCODE_ZEN_API_KEY` — OpenCode Zen API key for LLM calls
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key

## Local Dev Setup

1. Create `.env.local` in repo root with all 4 secrets above
2. Run `npm run dev` — starts Next.js with Turbopack on port 3000
3. The Supabase admin client returns `null` gracefully in dev mode if credentials are missing (see `src/lib/supabase/admin.ts`), so the server starts even without Supabase keys — but generation features that touch the DB will be limited.

## CSRF Middleware

The middleware at `src/middleware.ts` blocks POST requests that don't match allowed origins.

- In dev mode, `http://localhost:3000` is allowed (hardcoded at line 40)
- For curl testing, use `-H "Origin: http://localhost:3000"` to pass CSRF
- Alternatively, requests without `Origin`/`Referer` headers but WITH an `Authorization` header are allowed (line 67-72)
- If the dev server starts on a different port (e.g., 3001), either kill the process on 3000 first or update curl origin accordingly

## Testing Generation Flows

### Single-file generation
```bash
curl -s -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"prompt":"Create a counter button","multiFile":false}'
```
- Expects HTTP 200 with `{"code": "..."}` containing a React component
- Typically completes in 5-20s
- Does NOT require Supabase credentials or orgId

### Multi-file generation
```bash
curl -s -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"prompt":"Build a todo list app with add and delete","multiFile":true}'
```
- Expects HTTP 200 with `{"files": {...}, "description": "...", "integrations": [...]}` 
- Pipeline: `planSpec` → `buildFromSpec` → `fixFiles`/`fixBrokenFiles`
- Can take 2-10+ minutes depending on model availability
- Omitting `orgId` from the request skips the Supabase credit check entirely
- The first model (`deepseek-v4-flash`) might fail; the system retries with fallback models
- JSON parse errors from truncated LLM output are a known issue — not a timeout problem

### Key files for LLM timeout configuration
- `src/lib/ai.ts` — `aiComplete()` wires `options.timeout` to AbortController (default 120s)
- `src/lib/llm.ts` — `planSpec`, `buildFromSpec`, `fixFiles`, `fixBrokenFiles` (all set to 180s)
- `src/lib/product-manager.ts` — A/B test variant generation (180s)
- `src/lib/seo-loop.ts` — SEO article generation (180s)
- `src/app/api/sculpt/route.ts` — UI sculpting refinement (180s)
- `src/lib/infra-generator.ts` — Infrastructure code generation (180s)

## Vercel Preview

Vercel preview deployments require Vercel SSO login. If you can't access the preview, test locally instead using the approach above.

## Common Issues

- **Port 3000 already in use**: Kill the existing process with `fuser -k 3000/tcp` before starting
- **502 from multi-file generation**: Check server logs — if the error is JSON parse related (not timeout), it's an LLM output quality issue. Try a simpler prompt.
- **`deepseek-v4-flash` failures**: This model might be intermittently unavailable. The system automatically falls back to other models in the pool.
- **Long generation times**: Multi-file generation can take 5-10 minutes due to multiple LLM calls with retry logic. The timeout per call is 180s, but the total pipeline time is cumulative.
