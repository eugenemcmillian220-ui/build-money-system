# Testing Sovereign Forge OS

## Overview
Sovereign Forge OS is a Next.js 15 + React 19 + TypeScript app with Supabase auth, Stripe billing, and a multi-agent AI pipeline. Testing requires working around auth and missing credentials.

## Dev Server Setup

1. Install dependencies: `npm install`
2. Start dev server: `npm run dev` (uses Turbopack)
3. Server runs on `http://localhost:3000`
4. First page load may take 30-40s to compile with Turbopack

## Production Build

**Important**: The build requires extra memory allocation or it will OOM:
```bash
NODE_OPTIONS='--max-old-space-size=4096' npm run build
```

Static analysis commands:
- TypeScript: `npx tsc --noEmit`
- Lint: `npx next lint`

## Auth Bypass for Testing

Dashboard routes (`/app/*`, `/dashboard/*`) are protected by middleware auth in `src/middleware.ts`. Without real Supabase credentials, you need to temporarily bypass auth:

1. In `src/middleware.ts`, find the `isProtected && !user` block (around line 126)
2. Comment out the redirect block temporarily
3. **Always revert this change after testing** — do not commit it
4. Restart the dev server after modifying middleware (hot reload may not pick up middleware changes reliably)

## Key Dashboard Pages to Test

| Route | What to verify |
|-------|---------------|
| `/` | Landing page renders with branding, feature grid, CTA buttons |
| `/dashboard` | Main dashboard with AiTerminal at bottom |
| `/dashboard/guide` | Icons: Zap, ShieldCheck, Users, TrendingUp, Book |
| `/dashboard/blueprints` | Icons: Box, ChevronRight on cards |
| `/dashboard/billing` | Stripe integration UI |
| `/dashboard/settings` | User settings |
| `/dashboard/terminal` | Full terminal page |
| `/dashboard/pulse` | System telemetry |
| `/dashboard/governance` | Governance controls |

## AiTerminal Testing

The AiTerminal component (`src/components/dashboard/AiTerminal.tsx`) has a `sanitizeCommand()` function that enforces a command allowlist.

### Valid Commands (must all be in ALLOWED_COMMANDS set)
`help`, `status`, `balance`, `generate`, `deploy`, `agents`, `ls`, `clear`, `deals`, `negotiate`, `scout`, `manifest`, `test`, `restart`

### Testing Procedure
1. Navigate to `/dashboard` (or `/dashboard/terminal`)
2. Find the terminal input at the bottom of the page
3. Test valid commands — they should reach their handlers (may show auth errors without Supabase, which is expected)
4. Test dangerous commands (`rm -rf /`, `curl http://evil.com`) — should be blocked and default to `help` output
5. **Gotcha**: If adding new terminal commands in `handleCommand`, you must also add them to the `ALLOWED_COMMANDS` set at the top of the file, or `sanitizeCommand()` will silently convert them to `help`

## Common Gotchas

- **Middleware changes need server restart**: After editing `src/middleware.ts`, restart `npm run dev` completely. Turbopack hot reload may not pick up middleware changes.
- **ALLOWED_COMMANDS sync**: When adding new commands to AiTerminal's `handleCommand` switch, always update the `ALLOWED_COMMANDS` set too. Forgetting this causes commands to silently fail.
- **No real API responses**: Without Supabase/Stripe credentials, API routes return auth errors. Dashboard components handle these gracefully and still render UI.
- **Icon import cleanup risk**: When removing unused icon imports from lucide-react, double-check that the icon isn't used in JSX further down the file. Search for the icon name in the entire file before removing.
- **ESLint underscore convention**: Unused function parameters should be prefixed with `_` (e.g., `_baseUrl`) per the `.eslintrc.json` config.

## Devin Secrets Needed

No secrets are strictly required for basic UI testing. For full integration testing, these would be needed:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key
- `STRIPE_SECRET_KEY` — Stripe API key for billing tests
