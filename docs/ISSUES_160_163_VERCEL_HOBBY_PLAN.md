# Issues #160, #161, #162, #163 — Vercel Hobby Deployment Investigation

_Date: 2026-05-17_

## What I could verify from this repository

I searched the local repository for references to issue numbers 160–163 and did **not** find any tracked issue content (titles, descriptions, stack traces, or links).

That means the exact root causes for #160–#163 are not present in this repo snapshot. Without the issue bodies, the best I can do is:

1. map the likely Hobby-plan blockers already documented in this codebase,
2. define a deterministic triage workflow for each issue,
3. provide concrete fix patterns that can be applied once each issue body is provided.

## Confirmed Hobby-plan constraints already documented here

The repository already documents key constraints:

- Vercel Hobby serverless execution budget is effectively ~10 seconds per function invocation for this app architecture.
- Long workflows should be split into resumable stages.
- API chaining and retries are required to survive transient failures.

See:

- `SOVEREIGN_FORGE_OS_VERCEL_HOBBY_BREAKDOWN.md`
- `PRODUCTION_TROUBLESHOOTING.md`
- `PRODUCTION_CHECKLIST.md`

## Issue-by-issue fix playbook

Use this for **each** of #160, #161, #162, #163 once issue text is available.

### 1) Classify issue type

Put each issue in one bucket:

- **A. Build-time failure** (TypeScript, missing package, Next build crash)
- **B. Runtime timeout** (function exceeds Hobby runtime budget)
- **C. Environment/config** (missing env vars, mismatched secrets)
- **D. Platform policy/permission** (Git author access, cron limits, project ownership)

### 2) Reproduce locally with production parity

Run, in order:

```bash
pnpm install
pnpm run build
pnpm run lint
pnpm run test
```

Then validate env completeness through the app’s env check route and scripts.

### 3) Apply the corresponding fix

#### If issue is A (build-time)

- Fix TS/ESLint errors blocking `next build`.
- Ensure `next.config.ts` and any monorepo paths do not pull unsupported files into serverless bundles.
- Remove optional runtime imports from server-only routes when they explode bundle size.

#### If issue is B (runtime timeout)

- Convert long API tasks into resumable queue/job stages.
- Keep each invocation short and chain follow-up work.
- Add retry with backoff around internal stage handoffs.
- Move token streaming style generation to edge/runtime patterns when appropriate.

#### If issue is C (env/config)

- Ensure required vars exist in Vercel Production scope.
- Validate Stripe/Supabase/OpenAI key names exactly match code references.
- Add guardrails so routes fail fast with actionable error messages when env is missing.

#### If issue is D (policy/permission)

- Confirm deploy actor has access under Hobby rules.
- If collaboration limits block Git-based auto-deploy, deploy via a single owner token in CI (`vercel build` + `vercel deploy --prebuilt`) as an operational workaround.
- Validate cron cadence against Hobby-supported schedules.

## Acceptance criteria per issue

Treat each issue as fixed only when all are true:

1. Repro steps from issue no longer fail.
2. `pnpm run build` succeeds.
3. A Vercel preview deployment succeeds.
4. Production deployment succeeds on Hobby with no function timeout for the affected flow.
5. Logs show no repeated retries for the same stage beyond threshold.

## What I need next to finish #160–#163 concretely

Please provide one of the following so I can implement exact code fixes:

- links to issue #160–#163, or
- pasted issue titles + error logs + affected routes/files.

Once supplied, I can produce targeted patches for each issue and verify end-to-end deployment readiness.
