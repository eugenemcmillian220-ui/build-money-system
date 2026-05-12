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

## Production URL

The production domain is: `https://build-money-system-omd8.vercel.app`

FlowForge pages are accessible without authentication on production:
- `https://build-money-system-omd8.vercel.app/flowforge/dashboard`
- `https://build-money-system-omd8.vercel.app/flowforge/nano`
- etc.

Vercel preview deployments return **401** (password-protected). Use production or local dev server.

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

### Workflow Builder
- Node palette must show exactly 8 types: Trigger, Action, Condition, Transform, AI Agent, Webhook, Delay, Loop
- Adding a node should show it in the canvas with a UUID in the properties panel
- Execute should fire POST to `/api/flowforge/execute` and return `status: "completed"`

### Nano Triggers
- 4 buttons initially at "0 taps"
- Tapping increments the specific trigger's count; others must remain at 0 (isolation)
- Feedback bar shows "Triggering <name>..." then "<name> executed!"

### Governance
- Proposals tab: 2 sample proposals with specific vote counts (12/3 and 18/2)
- Audit tab: 4 entries with actions like workflow.created, workflow.executed, member.invited, governance.vote
- CSV Export button downloads `flowforge-audit-log.csv`

## Vercel Preview Access

Vercel preview deployments for this repo return 401 (password-protected). Test against the production URL (`https://build-money-system-omd8.vercel.app`) or local dev server instead.

## Devin Secrets Needed

No secrets are needed to test FlowForge pages — they use mock data and don't require Supabase or Stripe configuration. The existing environment config handles `npm install` via the maintenance section.
