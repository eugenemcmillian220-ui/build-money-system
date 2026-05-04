---
name: testing-sovereign-forge-dashboard
description: Test the Sovereign Forge dashboard end-to-end — CEO briefing, terminal, Pulse telemetry. Use when verifying dashboard UI or API changes.
---

# Testing Sovereign Forge Dashboard

## Devin Secrets Needed

- `SOVEREIGN_FORGE_EMAIL` — Admin email for login
- `SOVEREIGN_FORGE_PASSWORD` — May not work for admin emails (see Auth below)

## Vercel Deployment Protection

The Vercel deployments (both production and preview) have Deployment Protection enabled. To access them:

1. Install Playwright locally: `mkdir -p /tmp/pw && cd /tmp/pw && npm init -y && npm install playwright`
2. Use Playwright CDP to set bypass cookie:
```js
const { chromium } = require('playwright');
const browser = await chromium.connectOverCDP('http://localhost:29229');
const context = browser.contexts()[0];
await context.addCookies([{
  name: '_vercel_jwt',
  value: '<VERCEL_BYPASS_TOKEN>',
  domain: '<deployment-domain>.vercel.app',
  path: '/',
  secure: true,
}]);
```
3. The bypass token might be provided by the user — look for a `vcp_` prefixed string.

## Authentication

**Important**: Admin emails (defined in `src/lib/admin-emails.ts`) are forced into OTP (email verification code) login. Password login is disabled **both client-side and server-side** for admin emails.

- The client-side `isAdminEmail()` check auto-switches to code mode when an admin email is typed
- The server-side `login()` action in `src/lib/auth-actions.ts` returns an error for admin emails
- You **cannot** bypass this with DOM manipulation or direct form submission
- You **must** request an OTP code from the user

To authenticate:
1. Navigate to `/login` on the deployed URL
2. Type the admin email — UI auto-switches to OTP mode
3. Click "Send Verification Code"
4. Ask the user for the 6-digit code from their email
5. Enter the code and click "VERIFY & SIGN IN"
6. Should redirect to `/dashboard`

## Key Test Pages

| Page | URL | What to test |
|------|-----|--------------|
| Dashboard | `/dashboard` | CEO Strategic Briefing, terminal, stats cards |
| AI Terminal | `/dashboard/terminal` | Full terminal with code view |
| Sovereign Pulse | `/dashboard/pulse` | Telemetry metrics, error clusters |
| Blueprints | `/dashboard/blueprints` | Pre-built templates |

## Common Test Scenarios

### CEO Strategic Briefing
- Located on `/dashboard` — scroll down past stats cards
- Shows empire health percentage and strategic summary
- When LLM is unavailable, falls back to offline report
- Offline report health formula: `min(70 + projectCount * 5, 95)`
- With 0 projects: 75% health, "Your forge is ready" message

### Terminal
- Located in "Neural Manifestation" section on `/dashboard`
- Also has dedicated page at `/dashboard/terminal`
- Accepts both commands (`help`, `status`, `clear`, `manifest`, `deals`, `negotiate`, `scout`) and plain English
- Plain English input routes to manifestation pipeline
- History persists via `sessionStorage` (key: `sovereign_terminal_history`)
- `clear` command resets to welcome message

### Console Error Checks
- Open DevTools (F12) → Console tab before navigating
- Check for "Failed to load Pulse data" errors (should be fixed with graceful fallbacks)
- Pre-existing: login resource 500 error and Next.js preload warnings are normal

## Tips

- The `computer` tool's `console` action may report "Chrome is not in the foreground" — use F12 to open DevTools visually and read console from the screenshot instead
- When scrolling the page scrolls the outer page, not the terminal. Click inside the terminal area first if you need to scroll terminal content
- The first `clear` command attempt may fail to focus the terminal input if you click in the wrong area — click directly on the input field placeholder text
- After navigating between pages, the terminal on `/dashboard` restores history from sessionStorage automatically
