---
name: testing-build-verification
description: Verify Sovereign Forge production deployment after build/lint fixes. Use when confirming Vercel builds succeed and the app serves pages correctly.
---

# Testing Build & Deployment Verification

## Overview

Use this skill when verifying that a build fix (lint errors, type errors, compilation issues) has been successfully deployed to production. The key proof is that the Vercel build passes and the app serves pages normally.

## Production URL

- **Production**: `https://build-money-system-omd8.vercel.app/`
- **Preview deployments**: Check PR comments from `vercel[bot]` for the preview URL pattern: `build-money-system-o-git-<hash>-mcmillaneugene06-2928s-projects.vercel.app`

## Smoke Test Pages

These pages can be tested without authentication:

| Page | URL | What to Verify |
|---|---|---|
| Landing | `/` | Sovereign Forge branding, "From Idea To Revenue" heading, stats (25 phases, 22 agents, etc.) |
| Login | `/login` | Form renders with email input, password field, SIGN IN button, PASSWORD/EMAIL CODE tabs |
| FlowForge | `/flowforge` | AI Workflow Automation Hub heading, 25 phase badges, Elite/Universal/Nano mode cards |
| FlowForge Dashboard | `/flowforge/dashboard` | 4 tabs, stats showing 5 Total Workflows (from mock data) |

## Auth-Protected Pages

| Page | URL | Expected Behavior (Unauthenticated) |
|---|---|---|
| Dashboard | `/dashboard` | Redirects to `/login?redirectTo=%2Fdashboard` |

## Console Error Checking

Open DevTools Console on each page. Expected:
- A `favicon.ico` 404 is preexisting and harmless
- No JavaScript errors should appear related to the app code
- Watch for errors mentioning `agent-wrapper`, `stages`, `llm`, or `manifest` modules

## Login Constraints

- **Admin emails** (listed in `src/lib/admin-emails.ts`): Forced to OTP-only login. Password login is disabled. You need the user to provide a 6-digit email code.
- **Non-admin emails**: Can use password login.
- The `SOVEREIGN_FORGE_EMAIL` secret corresponds to an admin email — it requires OTP, not the `SOVEREIGN_FORGE_PASSWORD`.

## Lint & Type Checking

To verify lint/type fixes locally before deploying:
```bash
cd /home/ubuntu/repos/build-money-system
npm run lint    # Runs next lint — errors block Vercel build
npm run build   # Full production build — catches both lint and type errors
```

Common lint rules that block builds:
- `@typescript-eslint/no-explicit-any` — replace `any` with proper types
- `@typescript-eslint/no-unused-vars` — prefix unused vars with `_` (warnings only, don't block)

## Devin Secrets Needed

- `SOVEREIGN_FORGE_EMAIL` — Admin email (OTP-only login)
- `SOVEREIGN_FORGE_PASSWORD` — Available but not usable for admin accounts (OTP required)
- For full manifest pipeline testing, also need Supabase and LLM keys (see `testing-manifest-pipeline` skill)
