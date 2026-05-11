---
name: testing-sovereign-forge-ui
description: Test Sovereign Forge OS UI features end-to-end. Use when verifying launch readiness, date formatting, agent count alignment, QA audit page, or Job Diagnostics on Sovereign Pulse.
---

# Testing Sovereign Forge UI Features

## Overview

This skill covers testing the user-facing UI components of Sovereign Forge OS, including:
- Launch readiness tiered badges (Launch Ready / Review Required / Not Launch Ready)
- Date formatting (no "Invalid Date" anywhere)
- Agent count alignment across landing, guide, and blueprints pages
- QA Audit page contextual empty states
- Job Diagnostics table on Sovereign Pulse
- Legal tab placeholder warnings
- Repository button states

## Prerequisites

### Production URL
The production deployment is at `https://build-money-system-omd8.vercel.app`.

### Test User
Use a non-admin test user for password-based login. Admin emails (listed in `src/lib/admin-emails.ts`) are forced to OTP-only mode.

To create a non-admin test user, use the Supabase admin API:
```bash
curl -s -X POST "https://<SUPABASE_URL>/auth/v1/admin/users" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"email": "devin-tester@example.com", "password": "TestPassword123!", "email_confirm": true}'
```

If the user already exists, reset the password:
```bash
curl -s -X PUT "https://<SUPABASE_URL>/auth/v1/admin/users/<USER_ID>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"password": "TestPassword123!"}'
```

### Test Project Data
To test launch readiness badges and date formatting, you need a project with manifest data in the database. Insert a synthetic project via the Supabase Management API:
```bash
curl -s -X POST "https://api.supabase.com/v1/projects/<PROJECT_REF>/database/query" \
  -H "Authorization: Bearer $SUPABASE_MANAGEMENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "INSERT INTO projects (id, org_id, name, description, prompt, files, created_at, manifest) VALUES (gen_random_uuid(), \"<ORG_ID>\", \"Test Project\", \"Description\", \"test prompt\", \"{}\"::jsonb, now(), \"<MANIFEST_JSON>\"::jsonb) RETURNING id;"}'
```

Key manifest fields that control launch readiness:
- `security.score` — numeric, thresholds: <70 = not_launch_ready, 70-79 = review_required, >=80 = launch_ready
- `security.vulnerabilities` — array of `{severity: "critical"|"high"|"medium"|"low"}`
- `qa.status` — must be `"pass"` for launch_ready

**Remember to clean up test data after testing.**

### Devin Secrets Needed
- `SUPABASE_MANAGEMENT_TOKEN` — for database queries and user management

## Testing Flow

### 1. Public Pages (No Auth)
- **Landing page** (`/`): Check stats section for "25 Autonomous Phases" and "25 Specialised Agents"
- **How it Works**: Step 02 mentions "22+ specialists" (this is correct — it's 3 named agents + 22+ others)

### 2. Login
- Navigate to `/login`
- Non-admin: use PASSWORD mode with test credentials
- Login redirects to `/dashboard`

### 3. Projects Page (`/dashboard/projects`)
- Verify no "Invalid Date" text on project cards
- Date should show formatted date (e.g., "May 11, 2026") or "Date unavailable" fallback
- Each project card shows a tiered launch readiness badge

### 4. Project Detail (`/dashboard/projects/[id]`)
- Header shows colored badge: green (Launch Ready), amber (Review Required), red (Not Launch Ready)
- If not launch-ready: amber callout "WHY NOT LAUNCH-READY?" lists blocking reasons
- Reasons include clickable "View Security →" and "View QA →" links
- Repository button: clickable link if repo URL exists, or grayed-out "REPO PENDING" if not
- Legal tab: if patent draft contains `[PLACEHOLDER]`, shows amber warning banner

### 5. Guide Page (`/dashboard/guide`)
- Section 3: "THE 25-AGENT SWARM"
- Body text: "25 specialized AI agents collaborate"

### 6. Blueprints Page (`/dashboard/blueprints`)
- Step 03: "25 agents engineer, secure, and legalize"
- Sovereign Mode Outcomes / Elite Mode: "25-agent hardening"

### 7. QA Audit Page (`/dashboard/qa`)
- If projects exist with QA data: shows project rows with audit status
- If projects exist but no QA data: "N project(s) found, but no QA reports have been generated yet."
- If no projects: "No projects exist yet. Manifest a project to trigger The Overseer."

### 8. Sovereign Pulse (`/dashboard/pulse`)
- Scroll down past stats and error clusters
- "Job Diagnostics" section has a table with columns: Job ID, Mode, Blueprint, Phase Reached, Duration, Outcome, Created
- Outcome badges are color-coded: green=success, amber=fallback, orange=timeout, red=failed, blue=running

### 9. API Endpoints
- `GET /api/jobs/active` — returns JSON (job object or `null`), NOT 404
- `GET /api/jobs/<jobId>/status` — returns job status JSON if job exists

## Known Quirks

- **Date field mapping**: Supabase returns `created_at` (snake_case) but the frontend `Project` type may expect `createdAt` (camelCase). The `formatProjectDate` utility handles this gracefully by returning "Date unavailable" for undefined values instead of "Invalid Date".
- **Projects table schema**: The `prompt` column is NOT NULL — you must include it when inserting test data. The `id` column is UUID type — use `gen_random_uuid()` for auto-generation.
- **Dashboard self-healing**: When a user first visits `/dashboard`, the app auto-creates an organization if none exists. Check for the org before inserting test projects.
- **Codeac CI**: This is an optional code quality analysis tool that may fail. It does not block deployment.
