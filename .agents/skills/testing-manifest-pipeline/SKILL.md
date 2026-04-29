# Testing the Manifest Pipeline (E2E)

End-to-end testing of the manifestation pipeline — the multi-stage process that transforms a user prompt into a generated Next.js project.

## Devin Secrets Needed
- `OPENCODE_ZEN_API_KEY` — OpenCode Zen API key for LLM calls
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (for DB queries)

## Local Dev Setup

```bash
cd /home/ubuntu/repos/build-money-system
npm install
npm run dev  # Starts Turbopack dev server on http://localhost:3000
```

The `.env.local` file must contain all required env vars including `WORKER_SHARED_SECRET` (used for inter-stage authentication).

## Pipeline Stages

The manifestation pipeline runs through these stages in order:

```
queued → intent → plan-outline → plan-details → generate-build → polish → persist → complete
```

### Stage Labels in the UI (LiveCodePanel.tsx)
- `queued` → "Queued"
- `intent` → "Analyzing Intent"
- `plan-outline` → "Drafting Architecture"
- `plan-details` → "Detailing Components"
- `generate-build` → "Generating Code"
- `polish` → "Polishing & Auditing"
- `persist` → "Saving Project"

### Expected Terminal Logs
- Intent: "Classifier complete.", "Scout complete — strategy drafted.", "Intent stage complete → queued generate."
- Plan-outline: "Drafting architecture outline...", "Outline complete — X features, Y pages."
- Plan-details: "Detailing components & schema...", "Details complete — X components, Y files planned."
- Generate-build: "Building code from spec (Developer agent)..."

## Known Issue: triggerStage() on localhost

**Problem:** After a stage completes, `triggerStage()` in `chain.ts` uses `after()` + `fetch()` to call the worker route for the next stage. On localhost, this fetch may time out with `UND_ERR_HEADERS_TIMEOUT` because the worker route runs synchronously in the same process.

**Workaround:** Manually trigger the next stage via curl when the pipeline gets stuck:

```bash
source .env.local
curl -s -X POST "http://localhost:3000/api/manifest/worker?stage=plan-outline" \
  -H "Content-Type: application/json" \
  -H "X-Worker-Secret: $WORKER_SHARED_SECRET" \
  -d '{"jobId": "<MANIFEST_ID>"}' \
  --max-time 300 &
```

Replace `plan-outline` with the actual next stage, and `<MANIFEST_ID>` with the job ID from the terminal log.

**This does not affect production** — Vercel serverless handles `after()` correctly with separate invocations.

## Known Issue: Vercel Hobby 300s Timeout

The intent stage's Architect LLM call may take 3-5+ minutes, exceeding Vercel Hobby's 300s function timeout. This causes production manifestations to get stuck on the intent stage. Local testing avoids this issue.

## Checking Manifest State via Supabase

To check the current state of a manifest directly:

```bash
source .env.local
curl -s \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/manifestations?id=eq.<ID>&select=id,status,current_stage" \
  | python3 -m json.tool
```

## Test User

- Email: `devin-test@example.com` / Password: `TestPassword123!`
- Credits may need to be replenished between test runs
- To add credits, use the Supabase admin API to update the org's `credits_balance`

## Testing Checklist

1. Navigate to `/dashboard/terminal`
2. Verify split-screen layout (terminal left, code panel right with "IDLE" indicator)
3. Type a prompt and submit
4. Watch stage transitions in code panel: Queued → Analyzing Intent → Drafting Architecture → Detailing Components → Generating Code
5. Verify terminal logs show stage completion messages with counts
6. Verify feature count displays correctly in code panel ("X features planned", not "0")
7. If pipeline stalls after a stage, check server logs for `HeadersTimeoutError` and manually trigger the next stage

## Performance Notes

- Intent stage (Classifier + Scout + Architect): ~3-5 min locally
- Plan-outline (planSpecOutline): ~20-40s
- Plan-details (planSpecDetails): ~20-40s
- Generate-build (buildFromSpec): ~5-10 min
- Total pipeline: ~10-20 min for a simple app
