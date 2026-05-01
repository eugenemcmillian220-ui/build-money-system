# E2E Testing — Sovereign Forge OS

## Overview
This skill covers end-to-end testing of the Sovereign Forge OS dashboard application (Next.js 15 + React 19 + Turbopack).

## Prerequisites
- Node.js installed, `npm install` completed
- Build requires `NODE_OPTIONS='--max-old-space-size=4096'` (4GB Node heap) for production builds
- Dev server: `npm run dev` uses Turbopack — first page load compiles in ~30-40s

## Devin Secrets Needed
- None required for local dev testing (placeholder .env.local is sufficient)
- For authenticated testing: Supabase credentials (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)

## Testing Without Auth (Dashboard Access)
The middleware at `src/middleware.ts` redirects unauthenticated users from `/dashboard/*` to `/login`. To test dashboard pages without Supabase credentials:

1. Temporarily comment out the auth redirect block (~lines 126-133):
   ```typescript
   // if (isProtected && !user) {
   //   const url = request.nextUrl.clone();
   //   url.pathname = "/login";
   //   ...
   //   return redirectResponse;
   // }
   ```
2. Restart the dev server (middleware changes may not hot-reload)
3. **CRITICAL: Revert this change after testing** — do not commit the bypass

## Key Test Areas

### AiTerminal Commands (`src/components/dashboard/AiTerminal.tsx`)
The terminal has a `sanitizeCommand()` function with an `ALLOWED_COMMANDS` set. Commands not in the set are silently converted to `help`. When testing:
- Verify valid commands (`help`, `deals`, `negotiate`, `scout`, `manifest`, `test`, `restart`, `status`, `balance`, `generate`, `deploy`, `agents`, `ls`, `clear`) reach their handlers
- Verify dangerous commands (`rm -rf /`, `curl`, etc.) are blocked and show help text
- `deals` without auth shows: "Error: Organization context required for VC scouting."
- `test` runs a 4-step QA simulation ending with "Platform Integrity: 100%"
- `clear` empties the terminal history

### Dashboard Pages to Verify
All pages should render without white screens or JS errors:
- `/` — Landing page with branding and 25-phase lifecycle grid
- `/dashboard` — Command Center with sidebar, stats cards, AiTerminal
- `/dashboard/guide` — Uses 5 lucide icons: Zap, ShieldCheck, Users, TrendingUp, Book
- `/dashboard/blueprints` — Uses Box and ChevronRight icons on blueprint cards
- `/dashboard/terminal` — Full terminal with live code view panel
- `/dashboard/projects` — Shows manifested empires (empty state expected)
- `/dashboard/qa` — Phase 21 Overseer QA Audit
- `/dashboard/governance` — Sovereign DAO with proposals and treasury
- `/dashboard/pulse` — Telemetry dashboard with conversion funnel
- `/dashboard/billing` — 3 pricing tiers ($99/$249/$999)
- `/dashboard/settings` — Empire Security and Danger Zone

### Sidebar Navigation
- 9 main nav items + Settings at bottom
- 6 phase groups (Foundation, Operations, Economy & Hype, Capital & Expansion, Sovereignty, Federation) that expand/collapse
- Foundation group shows: Component Forge (01), SQL Forge (02), Deployment (03), Sentinel (04)

## Common Issues
- **Build OOM**: Always use `NODE_OPTIONS='--max-old-space-size=4096'` for `npm run build`
- **Middleware hot reload**: Changes to `src/middleware.ts` may require full dev server restart
- **Turbopack first load**: Dashboard route takes ~30-40s to compile on first visit — be patient
- **Import cleanup regressions**: When removing unused imports, verify that icons and components referenced in JSX are not accidentally removed. Check both the import line AND the JSX usage.
- **sanitizeCommand ALLOWED_COMMANDS**: When adding new terminal commands, always add the command name to the `ALLOWED_COMMANDS` set at the top of `AiTerminal.tsx`, otherwise the command will silently fail to `help`.
