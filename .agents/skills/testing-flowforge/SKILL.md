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

## Key Assertions

### Dashboard (proves API integration works)
- Stats should show: 5 Total Workflows, 3 Active, 1247 Executions, 96.8% Success Rate
- If API is broken, these fall back to all zeros — this is the critical distinguishing test
- Recent Workflows section shows 5 entries: AI Lead Scoring Pipeline (456 runs, active), Content Generation & Distribution (312 runs, active), AI Customer Support Bot (189 runs, active), Data ETL Pipeline (167 runs, paused), Instant Alert Trigger (123 runs, active)

### Workflow Builder
- Node palette must show exactly 8 types: Trigger, Action, Condition, Transform, AI Agent, Webhook, Delay, Loop
- Adding a node should show it in the canvas with a UUID in the properties panel
- The Execute button fires POST to `/api/flowforge/execute` but does **not** show visible feedback in the UI — verify via curl or network tab instead
- Execute API response format: `{execution: {id, status: "completed", duration_ms, credits_used: 5, output, node_results: [{node_id, status, error}]}}`
- Save button fires POST to `/api/flowforge/workflows`

### Nano Triggers
- 4 buttons initially at "0 taps": Send Alert, Quick Email, Security Scan, System Pulse
- Tapping increments the specific trigger's count; others must remain unchanged (isolation test)
- Feedback bar shows "Triggering <name>..." then "<name> executed!" — clears after ~2 seconds
- Footer shows "Total taps: N" and "4 triggers active"
- The tapped button gets a green border + checkmark icon while active, then returns to normal icon

### Governance
- Proposals tab: 2 sample proposals:
  - "Increase default workflow execution timeout to 120s" with 12 for / 3 against, status "active", Quorum: 10
  - "Enable cross-org workflow sharing via Hive Mind" with 18 for / 2 against, status "passed", Quorum: 10
- Audit tab: 4 entries with actions: workflow.created, workflow.executed, member.invited, governance.vote
- CSV Export button downloads `flowforge-audit-log.csv` (~573 bytes) via browser blob download

## Testing Tips

- FlowForge pages load independently from the main Sovereign dashboard — no login required
- The workflow builder's Execute button sends the request silently; to verify execution, either use curl with `Authorization: Bearer <any-value>` header or check the browser network tab
- Nano trigger buttons are disabled briefly (~2s) after tapping to prevent double-taps
- The governance CSV export uses `URL.createObjectURL` + programmatic anchor click — Chrome shows the download in the bottom bar
- All FlowForge data is mock/hardcoded in the API routes under `src/app/api/flowforge/` — no database writes occur

## Vercel Preview Access

Vercel preview deployments for this repo may require password authentication (returns 401). If so, test against local dev server instead. The Vercel production URL pattern might differ from the preview URL — check the Vercel dashboard or CI output for the correct domain.

## Devin Secrets Needed

No secrets are needed to test FlowForge pages — they use mock data and don't require Supabase or Stripe configuration. The existing environment config handles `npm install` via the maintenance section.
