# Testing Skill — Admin OTP + 25-Phase UI

This skill covers how to test the admin sign-in flow, 25-phase sidebar, and dashboard for this app.

## App at a glance
- Next.js (app router) + Supabase.
- Dev server: `npm run dev` inside `/home/ubuntu/repos/build-money-system` → binds to `http://localhost:3000`.
- Real Supabase project is used even in local dev (project ref `rgvjijiafpimfqbbyqtt`).
- Vercel preview deployments are SSO-protected. Local dev against the real Supabase is the reliable testing surface.

## Admin account rules
- `src/lib/admin-emails.ts` centralises `ADMIN_EMAILS` (currently `eugenemcmillian9@gmail.com`), `ADMIN_FREE_TIER = "admin_free"`, `ADMIN_CREDIT_BALANCE = 9_999_999`.
- Admin email is **forced** through email OTP (6-digit code) on both signup and every login. Password auth is refused.
- `ensurePersonalOrg` in `src/lib/auth-actions.ts` provisions/re-asserts `admin_free` + 9,999,999 credits on every successful admin login.

## Primary end-to-end flow to re-test on future PRs
1. Visit `/login`.
2. Type admin email → UI auto-hides the Password toggle and shows "Admin account detected — every sign-in requires a fresh 6-digit verification code."
3. Click **Send Verification Code** → green banner + 6-digit code entry screen.
4. Ask the user to relay the 6 digits (they monitor the admin inbox). Enter them and submit.
5. URL should become `http://localhost:3000/dashboard`.
6. Sidebar hydrates first — verify `Admin · Free` pill under the logo + admin email above Settings/Logout. The sidebar's `25 Phases — ALL LIVE` section must have exactly 6 collapsible groups: Foundation / Operations / Economy & Hype / Capital & Expansion / Sovereignty / Federation. Click a group (e.g., Foundation) — chevron should rotate and phase-link rows should render below.
7. Wait (see slow-paint note below). Main content should eventually render `Command Center` with: `25 Phases Live` + `Admin · Free` pills, `∞` Neural Credits, `Admin (Free, Unlimited)` Sovereign Tier card, KPI grid showing `25 / 25` Phases Active.

## Known issue / workaround
- `/dashboard`'s client loader (`fetchDashboardData` in `src/app/dashboard/page.tsx`) can take 30–60s on first mount before the main content replaces the "Synchronizing Neural Link…" spinner. Don't declare failure until you've waited ~60s. If the spinner persists past that, scroll the main area — content may have rendered below the fold before the scroll position caught up.
- `/dashboard/billing` is a good alternative to confirm auth without the slow loader. It renders within ~5s.

## Verify admin tier in the database (definitive proof)
Supabase Management API token (request from user if not already in env as `SUPABASE_MGMT`): use with `POST /v1/projects/{ref}/database/query`.

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $SUPABASE_MGMT" \
  -H "Content-Type: application/json" \
  -d '{"query":"select o.billing_tier, o.credit_balance, u.email from public.organizations o join auth.users u on u.id=o.owner_id where u.email=''eugenemcmillian9@gmail.com'';"}' \
  "https://api.supabase.com/v1/projects/rgvjijiafpimfqbbyqtt/database/query"
```

Expect `billing_tier = "admin_free"`, `credit_balance = "9999999.0000"`.

## Supabase auth config (the 6-digit code trap)
This caught us once already: the project defaulted to `mailer_otp_length=8` and a magic-link-only email template. Fix via Management API:

```bash
curl -sS -X PATCH \
  -H "Authorization: Bearer $SUPABASE_MGMT" \
  -H "Content-Type: application/json" \
  -d '{"mailer_otp_length":6,"mailer_otp_exp":3600}' \
  "https://api.supabase.com/v1/projects/rgvjijiafpimfqbbyqtt/config/auth"
```

Also patch `mailer_templates_magic_link_content` to render `{{ .Token }}` prominently (the 6-digit code) in addition to any fallback `{{ .ConfirmationURL }}` link.

Then verify:
```bash
curl -sS -H "Authorization: Bearer $SUPABASE_MGMT" \
  "https://api.supabase.com/v1/projects/rgvjijiafpimfqbbyqtt/config/auth" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["mailer_otp_length"], "{{ .Token }}" in d["mailer_templates_magic_link_content"])'
```

## Useful secondary routes to sanity-check
- `/dashboard/billing` — pricing tiers; loads fast; confirms authenticated session.
- `/dashboard/phases/1..25` — individual phase detail pages.
- `/api/rd/scout` — quick health check (GET, no body needed).

## Things NOT to do
- Do NOT try Vercel preview URLs for auth testing — they are SSO-walled. Use local dev.
- Do NOT test via curl after logging in through the UI — auth cookies are HttpOnly and hard to export. Drive the UI or use the Supabase Management API for data-layer checks.
- Do NOT assume the magic-link email works — the 6-digit code is the supported path. If the email you receive is link-only, the Supabase template config regressed.

## Devin Secrets Needed
- `SUPABASE_MGMT` — Supabase Management API token (`sbp_…`) for Auth config + SQL queries.
- `VERCEL_TOKEN` — only if pulling `.env` from Vercel (`vercel env pull`). Optional if a local `.env` is already present.
- User must be able to watch the `eugenemcmillian9@gmail.com` inbox in real time and paste the 6-digit code back to the agent.
