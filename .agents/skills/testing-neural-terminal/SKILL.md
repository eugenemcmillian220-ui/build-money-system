# Testing: Neural Terminal & Manifest Pipeline

## Overview
The Neural Terminal (`/dashboard/terminal`) is the main AI-powered code generation interface. It features a split-screen workspace with a terminal panel (left) and a live code panel (right) that shows generated files in real-time.

## Key Components
- `src/app/dashboard/terminal/page.tsx` — Page wrapper, fetches org
- `src/components/dashboard/ManifestWorkspace.tsx` — Orchestrates terminal + code panel, handles polling
- `src/components/dashboard/LiveCodePanel.tsx` — File tree + syntax-highlighted code viewer
- `src/components/dashboard/AiTerminal.tsx` — Terminal UI with prompt input

## Manifest Pipeline Stages
The manifestation progresses through these stages (visible in both terminal and code panel):
1. `queued` → "Queued"
2. `intent` → "Analyzing Intent" (Classifier + Scout + Architect LLM calls)
3. `generate-plan` → "Planning Architecture" (planSpec LLM call)
4. `generate-build` → "Generating Code" (buildFromSpec + fixFiles LLM calls)
5. `polish` → "Polishing & Auditing"
6. `persist` → "Saving Project"
7. `complete` → "Complete" (green dot)
8. `error` → "Error" (red dot + failure message)

## Testing Setup

### Prerequisites
- Test user account (check for credentials in Devin secrets)
- The test user's org needs sufficient neural credits (check via Supabase)
- For local testing: `OPENCODE_ZEN_API_KEY`, Supabase credentials, `WORKER_SHARED_SECRET`

### Devin Secrets Needed
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — For granting credits via API
- `OPENCODE_ZEN_API_KEY` — LLM provider key (for local testing)
- `VERCEL_ACCESS_TOKEN` — For checking deployment status

### Granting Credits to Test User
If the test user has insufficient credits, use the Supabase REST API:
```bash
curl -X PATCH "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/organizations?id=eq.<org_id>" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"credit_balance": 10000}'
```

## Test Flows

### 1. Split-Screen Layout
- Navigate to `/dashboard/terminal`
- Verify heading "Neural Terminal" with subtitle containing "with live code view"
- Verify two-panel layout: terminal left, code panel right
- Code panel shows "Live Code View" + "Waiting for manifestation to start..." + "IDLE" with pulsing dot

### 2. Toggle Button
- Click "Hide Code View" → code panel disappears, terminal expands, button says "Show Code View"
- Click "Show Code View" → code panel reappears, layout restored, button says "Hide Code View"

### 3. Manifestation Flow
- Type a prompt and submit
- Watch for stage transitions in code panel status indicator
- Terminal shows detailed logs; code panel shows stage labels
- On success: files appear in file tree with syntax highlighting
- On error: code panel shows "Manifestation failed. Check the terminal for details." with red dot

### 4. pollingRef Recovery
- After a failed manifestation, immediately submit a new prompt
- Verify new manifestation starts (code panel resets to "Queued")
- This tests the try/finally cleanup on pollingRef

## Common Issues

### LLM JSON Truncation
The LLM sometimes returns truncated JSON, causing parse failures like:
```
Failed to parse JSON even with robust extraction: Expected ',' or '}' after property value
```
This can affect both `planSpec` (generate-plan stage) and `buildFromSpec` (generate-build stage). The `buildFromSpec` path has retry logic (PR #80), but `planSpec` might also need it.

### Vercel Hobby Plan Timeouts
Vercel Hobby plan allows 300s per function invocation (as of June 2025). The manifest pipeline splits generation into sub-stages (`generate-plan` + `generate-build`) so each gets its own 300s budget. If the intent stage takes too long (multiple sequential LLM calls), it may still timeout.

### CSRF Blocking Internal Routes
The `/api/manifest/worker` route is an internal server-to-server call that uses `X-Worker-Secret` header authentication instead of Origin/Referer. It must be excluded from CSRF middleware checks in `middleware.ts`.

### highlight.js vs Prism.js
The code panel uses highlight.js (not Prism.js) for syntax highlighting. Prism.js was replaced because Turbopack doesn't guarantee side-effect import order, causing `prism-tsx` to crash when trying to extend a not-yet-loaded `prism-typescript`. highlight.js uses explicit `registerLanguage()` calls with no inter-module dependencies.

## Environment Notes
- Production URL pattern: `build-money-system-omd8.vercel.app`
- Dev server: `npm run dev` on port 3000
- Manifest poll interval: 1500ms, max 600 attempts (~15 min ceiling)
- Admin emails are configured in `src/lib/admin-emails.ts`
- WORKER_SHARED_SECRET must be set in `.env.local` for local testing
