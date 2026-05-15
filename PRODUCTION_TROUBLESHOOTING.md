# Sovereign Forge OS - AI Manifest Pipeline Production Troubleshooting Guide

This document outlines common issues and troubleshooting steps for the AI Manifest Pipeline in a Vercel production environment.

## 1. Overview of the Manifest Pipeline

The AI Manifest Pipeline is a multi-stage process designed to generate applications based on user prompts. It leverages Vercel's serverless functions and Supabase for job management and persistence. Each stage runs as an independent serverless invocation to avoid hitting Vercel's `maxDuration` limits.

**Key Components:**
- `manifestation-handler.ts`: Entry point for manifest requests, handles authentication, rate limiting, and initiates the first stage.
- `chain.ts`: Manages the chaining of stages, using `after()` for fire-and-forget invocations in production.
- `worker/route.ts`: The serverless function that executes individual stages.
- `stages.ts`: Contains the implementation logic for each pipeline stage (e.g., `intent-classify`, `generate-build-code`).
- `store.ts`: Handles Supabase interactions for `manifestations` table (creating, loading, updating job state and logs).
- `env.ts`: Defines and validates environment variables.

## 2. Common Failure Points & Troubleshooting

### 2.1 Missing Environment Variables

**Issue:** The pipeline fails silently or with cryptic errors due to missing or misconfigured environment variables.

**Diagnosis:**
- Check Vercel project environment variables. Ensure all necessary variables are set for the production environment.
- Refer to `src/lib/env.ts` for the authoritative list of expected environment variables and their validation rules.
- Specifically, `WORKER_SHARED_SECRET` is critical for inter-stage communication in production. If missing, `triggerStage` calls will fail.
- AI provider keys (e.g., `OPENCODE_GO_API_KEY`, `OPENCODE_ZEN_API_KEY`, `GITHUB_MODELS_TOKEN`, `HUGGINGFACE_API_KEY`) are required for LLM interactions.

**Resolution:**
- Verify all required environment variables are present in your Vercel project settings.
- Ensure `WORKER_SHARED_SECRET` is set and consistent across all deployments.
- Confirm at least one AI provider key is configured.

### 2.2 `maxDuration` and Runtime Issues

**Issue:** Stages time out on Vercel Hobby/Pro plans (hard cap of 300 seconds, effective budget ~280 seconds).

**Diagnosis:**
- The `src/app/api/manifest/worker/route.ts` is configured with `maxDuration = 9` seconds per stage to align with Vercel Hobby's 10-second soft limit for individual serverless functions.
- The `runDeveloperAgent` (code generation) stage in `src/lib/manifest/stages.ts` and `buildFromSpec` in `src/lib/llm.ts` are the most compute-intensive parts. These now use streaming and increased timeouts where possible.
- Check logs for `StageTimeoutError` or messages indicating function timeouts.

**Resolution:**
- Monitor stage execution times. If a stage consistently exceeds its budget, consider further optimizing its logic or breaking it down into smaller sub-stages.
- Ensure `runtime = "edge"` is used where possible for faster cold starts and potentially higher concurrency, especially for LLM-heavy operations. (Note: `worker/route.ts` is now `edge` runtime).

### 2.3 `triggerStage` Reliability

**Issue:** The chaining of stages fails, leading to incomplete manifestations.

**Diagnosis:**
- `triggerStage` in `src/lib/manifest/chain.ts` uses Next.js `after()` to ensure the outbound fetch to the next worker stage is not prematurely terminated by Vercel's runtime.
- Inter-stage calls are authenticated using `X-Worker-Secret` header, which must match `WORKER_SHARED_SECRET` environment variable.
- The `triggerStage` now includes retry logic with exponential backoff to handle transient network issues or temporary worker unavailability.

**Resolution:**
- Confirm `WORKER_SHARED_SECRET` is correctly set in production.
- Review logs for warnings from `[manifest/chain]` regarding `triggerStage` failures or HTTP errors.

### 2.4 Error Handling and Observability

**Issue:** Errors are not properly logged, reported, or surfaced, making debugging difficult.

**Diagnosis:**
- Enhanced logging has been added to key functions and stages, including `jobId` and stage names.
- A new debug endpoint `/api/manifest/debug?jobId=xxx` provides a comprehensive view of a manifestation's state, logs, and errors.
- Sentry integration has been added to `src/lib/logger.ts` and `src/app/api/manifest/worker/route.ts` to capture exceptions.

**Resolution:**
- Use the `/api/manifest/debug?jobId=<job_id>` endpoint to inspect the full state of a manifestation.
- Monitor Sentry for error reports and warnings related to the manifest pipeline.
- Ensure `NEXT_PUBLIC_SENTRY_DSN` is configured in your Vercel project for Sentry to function.

### 2.5 Database Schema vs. Code

**Issue:** Mismatches between the application code's understanding of the `manifestations` table and the actual Supabase schema.

**Diagnosis:**
- The active schema for `manifestations` is defined in `supabase/migrations/20260422_manifestations_queue.sql`.
- The `src/lib/manifest/store.ts` file interacts with this schema.
- Pay attention to `state JSONB` and `logs JSONB` columns, which store intermediate pipeline state and execution logs.

**Resolution:**
- If schema changes are made, ensure corresponding updates are applied to the Supabase database and the application's type definitions.
- Verify RLS policies on `public.manifestations` allow the correct read/write access for users and organizations.

## 3. Neural Terminal Commands

The Neural Terminal is primarily a frontend component (`src/app/dashboard/terminal/page.tsx`). While explicit backend "status" and "debug" commands were not found, the newly created `/api/manifest/debug?jobId=xxx` endpoint can serve as a powerful backend debugging tool.

**Improvement Suggestions:**
- **Frontend Integration:** Enhance the Neural Terminal UI to integrate with the `/api/manifest/debug` endpoint, allowing users to input a `jobId` and view the detailed state, logs, and errors of a manifestation directly within the terminal.
- **Status Command:** Implement a frontend "status" command that calls `/api/manifest/debug` and presents a user-friendly summary of the manifestation progress.
- **Debug Command:** Implement a frontend "debug" command that displays the full JSON output from `/api/manifest/debug` for advanced troubleshooting.

## 4. Test Plan (Nano Mode)

To verify the fixes, run a full short manifestation (Nano mode) and ensure it succeeds and saves to the database.

**Steps:**
1. Run locally with `npm run dev`.
2. Simulate production environment conditions (e.g., by setting `NODE_ENV=production` and ensuring `WORKER_SHARED_SECRET` is configured).
3. Trigger a Nano mode manifestation via the UI or a direct API call.
4. Monitor logs for errors and verify stage progression.
5. Use the `/api/manifest/debug?jobId=xxx` endpoint to inspect the final state, logs, and `project_id` in the database.
6. Confirm that the manifestation completes with `status: "complete"` and a `project_id` is associated.

---

**Author:** Manus AI
**Date:** May 15, 2026
