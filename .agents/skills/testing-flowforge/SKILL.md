---
name: testing-flowforge
description: Test the FlowForge AI Workflow Automation Hub end-to-end. Use when verifying FlowForge UI pages, API routes, or mode-specific features.
---

# Testing FlowForge — AI Workflow Automation Hub

## Overview

FlowForge is a SaaS feature under `/flowforge/*` with 7 pages and 7 API routes under `/api/flowforge/*`. It exercises 3 modes: Elite (governance, audit, RBAC), Universal (dashboard, workflows, billing), and Nano (mobile triggers).

## Local Dev Setup

1. `cd` to the repo root and run `npm run dev`
2. The dev server uses Turbopack. Note: port 3000 may be in use — check the output for the actual port (e.g., 3001).
3. No `.env` file is needed for FlowForge pages — they are self-contained with mock data in API routes.
4. First page load triggers compilation (~10s). Subsequent loads are fast.

## CSRF Middleware

The app has CSRF protection in `src/middleware.ts`. Key behavior:
- **Browser requests** from the same origin work fine.
- **curl POST requests** will get `403 Forbidden` unless you pass an `Authorization: Bearer <any-value>` header (without an `Origin` header). The middleware allows server-to-server calls with auth headers when no origin/referer is present.
- The middleware only allows `http://localhost:3000` as a dev origin. If the server runs on another port (e.g., 3001), browser requests still work (same-origin), but curl with `Origin: http://localhost:3001` will be blocked.

## Page Navigation

| Page | URL | Key Elements |
|---|---|---|
| Landing | `/flowforge` | 25 phase badges, 3 mode cards (Elite/Universal/Nano), CTAs to dashboard and nano |
| Dashboard | `/flowforge/dashboard` | 4 tabs (overview/workflows/analytics/templates), stats from `/api/flowforge/analytics` |
| Workflow Builder | `/flowforge/workflows` | 8 node types in left palette, canvas area, properties panel, mode dropdown, execute/save buttons |
| Nano Triggers | `/flowforge/nano` | 4 trigger buttons in 2x2 grid, tap count per trigger, feedback bar |
| Governance | `/flowforge/governance` | 3 tabs (proposals/audit/members), vote buttons, audit log table, CSV export |
| API Hub | `/flowforge/api-hub` | Static API documentation page |
| Settings | `/flowforge/settings` | 5 tabs (general/billing/api-keys/notifications/security) |

Note: `/flowforge/analytics` does NOT exist as a page (returns 404). The "Analytics" nav link on the dashboard is a stub link.

## Key API Routes for Testing

| Route | Method | Expected Response |
|---|---|---|
| `/api/flowforge/analytics` | GET | `{analytics: {total_workflows: 5, ...}, workflows: [...]}` |
| `/api/flowforge/workflows` | POST | `{workflow: {id: <uuid>, ...}, success: true}` (requires `name` in body) |
| `/api/flowforge/execute` | POST | `{execution: {status: "completed", credits_used: N, ...}}` |
| `/api/flowforge/nano-trigger` | POST | `{success: true, execution_id: <uuid>, ...}` (requires `triggerId` and `workflowId`) |
| `/api/flowforge/governance` | POST | Create proposal or vote (requires `action` field) |
| `/api/flowforge/audit` | GET | Audit log entries with optional filters |
| `/api/flowforge/billing` | GET/POST | Plan info or upgrade/purchase credits |

## Testing FlowForge Engine (Real vs Stub Behavior)

The FlowForge engine at `src/lib/flowforge/engine.ts` has action processors for `http_request`, `webhook`, and `ai-agent` node types. These were previously stubs that returned hardcoded mock data. To verify real implementations:

### http_request node (via `/api/flowforge/execute`)
Send a workflow with an `http_request` action node pointing to `https://httpbin.org/post`:
```bash
curl -s -X POST http://localhost:3000/api/flowforge/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"workflow": {"name": "http-test", "nodes": [{"id": "n1", "type": "action", "label": "HTTP", "config": {"actionType": "http_request", "url": "https://httpbin.org/post", "method": "POST"}, "position": {"x": 0, "y": 0}, "connections": []}]}, "input": {"test": "data"}}'
```
- **Real implementation**: `output.body` contains actual httpbin.org response with `"origin"`, `"headers"`, `"url": "https://httpbin.org/post"`
- **Old stub behavior**: `output.body` would echo back the input data unchanged

### Webhook node — invalid URL distinguishes real from stub
```bash
curl -s -X POST http://localhost:3000/api/flowforge/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"workflow": {"name": "bad-wh", "nodes": [{"id": "n1", "type": "webhook", "label": "WH", "config": {"url": "https://thisdomaindoesnotexist.invalid/hook"}, "position": {"x": 0, "y": 0}, "connections": []}]}, "input": {}}'
```
- **Real implementation**: `execution.status: "failed"` with error `"fetch failed"`
- **Old stub behavior**: Would return `status: "completed"` with fake `response_code: 200`

### AI Agent node
Requires LLM provider keys (`OPENCODE_ZEN_API_KEY`, `GITHUB_TOKEN`, etc.) to work. Without keys, it will fail with an LLM error. This is expected — the test proves it's making real LLM calls instead of returning hardcoded `{confidence: 0.95}`.

## Key Assertions

### Dashboard (proves API integration works)
- Stats should show: 5 Total Workflows, 3 Active, 1247 Executions, 96.8% Success Rate
- If API is broken, these fall back to all zeros — this is the critical distinguishing test

### Workflow Builder
- Node palette must show exactly 8 types: Trigger, Action, Condition, Transform, AI Agent, Webhook, Delay, Loop
- Adding a node should show it in the canvas with a UUID in the properties panel
- Execute should fire POST to `/api/flowforge/execute` and return `status: "completed"`
- Note: The UI execute button fires-and-forgets — response is not displayed in the UI. Use browser devtools Network tab or curl to see the response.

### Nano Triggers
- 4 buttons initially at "0 taps"
- Tapping increments the specific trigger's count; others must remain at 0 (isolation)
- Feedback bar shows "Triggering <name>..." then "<name> executed!"

### Governance
- Proposals tab: 2 sample proposals with specific vote counts (12/3 and 18/2)
- Audit tab: 4 entries with actions like workflow.created, workflow.executed, member.invited, governance.vote
- CSV Export button downloads `flowforge-audit-log.csv`

## Testing Economy API Auth

The `/api/economy` POST route requires Supabase authentication via `requireAuth()`. To verify auth enforcement:
```bash
# Should return 401 "Authentication failed"
curl -s -w "\nHTTP_STATUS: %{http_code}" -X POST http://localhost:3000/api/economy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fake-token" \
  -d '{"action": "buy", "agentId": "00000000-0000-0000-0000-000000000001", "orgId": "00000000-0000-0000-0000-000000000002"}'

# Should return 403 "Forbidden" (CSRF block, no valid auth)
curl -s -w "\nHTTP_STATUS: %{http_code}" -X POST http://localhost:3000/api/economy \
  -H "Content-Type: application/json" \
  -d '{"action": "buy"}'
```

Note: Economy POST Zod validation cannot be tested via curl because `requireAuth()` blocks before Zod runs. Testing Zod validation requires valid Supabase authentication.

## Worker Route Testing

The manifest worker route at `/api/manifest/worker` requires `WORKER_SHARED_SECRET` env var. Without it, all calls return `503 "Worker misconfigured"`. To test the 500-on-failure status code fix, you need this secret set in `.env.local`.

## Vercel Preview Access

Vercel preview deployments for this repo may require password authentication (returns 401). If so, test against local dev server instead. The Vercel production URL is `build-money-system-omd8.vercel.app`.

## Devin Secrets Needed

No secrets are needed to test FlowForge pages — they use mock data and don't require Supabase or Stripe configuration.

For testing economy/marketplace DB operations: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
For testing worker route: `WORKER_SHARED_SECRET`.
For testing AI Agent node: at least one LLM provider key (e.g., `OPENCODE_ZEN_API_KEY`).